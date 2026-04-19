/**
 * HS-NIL Deferred Payout Service (Phase 11)
 * ----------------------------------------------------------------------------
 * Texas UIL requires athlete NIL compensation to be held in a custodial trust
 * until the athlete's 18th birthday. The architecture here is intentionally
 * state-agnostic — the `hs_deferred_payouts` table and the release cron don't
 * know about TX. Only `shouldDefer()` branches on state_code; every other
 * piece of the flow keys off rules that could one day apply elsewhere.
 *
 * Lifecycle:
 *   1. Deal created / approved while athlete is under 18 in a
 *      paymentDeferredUntilAge18 state
 *        → shouldDefer() returns { defer: true, releaseEligibleAt,
 *                                  reason: 'minor_under_18_state_rule' }
 *   2. escrow.ts::releaseEscrowToParent intercepts the approval-time
 *      release call.
 *        → createDeferral() writes hs_deferred_payouts + flips the
 *          linked hs_deal_parent_payouts row to status='deferred'
 *          with deferred_payout_id set. The brand's inbound
 *          PaymentIntent remains 'succeeded' (funds have settled
 *          into the platform balance and are parked in the trust
 *          account identified by trust_account_identifier).
 *   3. Daily cron (/api/cron/hs-deferred-releases) sweeps
 *      status='holding' rows where release_eligible_at <= now().
 *        → releaseDeferred(id) flips the payout row back to 'pending'
 *          and delegates to the normal releasePayout() path, which
 *          fires the outbound Stripe Connect transfer.
 *   4. Admin-only escape hatches:
 *        - forfeitDeferred(): sets status='forfeited' for misconduct
 *          or custodial disputes. Writes admin_audit_log.
 *        - (force-release via the admin action route which calls
 *          releaseDeferred directly after recording the forced action.)
 *
 * Fail-closed: every write uses the service-role client. RLS on
 * hs_deferred_payouts explicitly blocks browser writes.
 *
 * Idempotency: deal_id is UNIQUE on hs_deferred_payouts. createDeferral()
 * short-circuits if a row already exists. releaseDeferred() short-circuits
 * if status is already 'released'.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { STATE_RULES, type USPSStateCode } from './state-rules';
import { releasePayout } from './payouts';
import {
  sendDeferralCreatedToAthlete,
  sendDeferralCreatedToParent,
  sendDeferredReleased,
} from '@/lib/services/hs-nil/deferred-emails';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type DeferralReason =
  | 'minor_under_18_state_rule'
  | 'court_order'
  | 'custodial_dispute';

export type DeferredPayoutStatus =
  | 'holding'
  | 'released'
  | 'forfeited'
  | 'refunded_to_brand';

export interface DeferredPayoutRow {
  id: string;
  deal_id: string;
  athlete_user_id: string;
  parent_profile_id: string;
  brand_charge_id: string | null;
  amount_cents: number;
  state_code: string;
  deferral_reason: DeferralReason;
  release_eligible_at: string;
  status: DeferredPayoutStatus;
  released_at: string | null;
  released_transfer_id: string | null;
  forfeiture_reason: string | null;
  trust_account_identifier: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShouldDeferInput {
  dealId: string;
  athleteUserId: string;
  stateCode: USPSStateCode | string | null | undefined;
}

export type ShouldDeferResult =
  | {
      defer: true;
      reason: DeferralReason;
      releaseEligibleAt: Date;
      athleteAgeYears: number;
    }
  | { defer: false; reason?: string };

// ----------------------------------------------------------------------------
// Infra
// ----------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil deferred-payouts] Supabase service role not configured ' +
        '(NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function logEvent(
  level: 'info' | 'warn' | 'error',
  message: string,
  metadata?: Record<string, unknown>,
): void {
  const line = {
    timestamp: new Date().toISOString(),
    service: 'hs-nil-deferred-payouts',
    message,
    ...metadata,
  };
  const json = JSON.stringify(line);
  switch (level) {
    case 'error':
      // eslint-disable-next-line no-console
      console.error(json);
      break;
    case 'warn':
      // eslint-disable-next-line no-console
      console.warn(json);
      break;
    default:
      // eslint-disable-next-line no-console
      console.log(json);
  }
}

// ----------------------------------------------------------------------------
// Age / birthday helpers
// ----------------------------------------------------------------------------

/**
 * Full years between DOB and `asOf`, counting a birthday only after the
 * month-and-day has landed. Matches deal-validation.ts::yearsOldFromDob so
 * both creation-time and release-time checks agree on age.
 */
export function yearsOldFromDob(dob: string, asOf: Date = new Date()): number {
  const birth = new Date(dob);
  let age = asOf.getFullYear() - birth.getFullYear();
  const m = asOf.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

/**
 * The athlete's 18th birthday at UTC midnight. We use UTC deliberately so
 * the release cron (which runs at 10:00 UTC / 5am ET) can't miss a release
 * due to a timezone off-by-one.
 */
export function computeEighteenthBirthday(dob: string): Date {
  const birth = new Date(dob);
  return new Date(
    Date.UTC(
      birth.getUTCFullYear() + 18,
      birth.getUTCMonth(),
      birth.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
}

// ----------------------------------------------------------------------------
// shouldDefer
// ----------------------------------------------------------------------------

/**
 * Pure-enough decision: should this deal's outbound parent payout be held
 * in a custodial trust until a later date? Returns the computed
 * release_eligible_at when yes, so the caller can write it directly into
 * the hs_deferred_payouts row without re-deriving.
 *
 * State-agnostic: any state whose STATE_RULES entry has
 * paymentDeferredUntilAge18=true AND whose athlete is still under 18 at the
 * moment of call triggers a deferral. Today that's TX only; tomorrow it
 * could be others.
 */
export async function shouldDefer(
  input: ShouldDeferInput,
): Promise<ShouldDeferResult> {
  const { dealId, athleteUserId, stateCode } = input;

  if (!stateCode) {
    return { defer: false, reason: 'no state_code on deal' };
  }

  const rules = STATE_RULES[stateCode as USPSStateCode];
  if (!rules || !rules.paymentDeferredUntilAge18) {
    return { defer: false };
  }

  const sb = getServiceRoleClient();
  const { data: profile, error } = await sb
    .from('hs_athlete_profiles')
    .select('date_of_birth, state_code')
    .eq('user_id', athleteUserId)
    .maybeSingle();

  if (error || !profile) {
    logEvent('warn', 'shouldDefer: athlete profile not found', {
      dealId,
      athleteUserId,
      error: error?.message,
    });
    return { defer: false, reason: 'athlete profile not found' };
  }

  const dob = profile.date_of_birth as string;
  const age = yearsOldFromDob(dob);

  if (age >= 18) {
    return { defer: false, reason: 'athlete is already 18+' };
  }

  return {
    defer: true,
    reason: 'minor_under_18_state_rule',
    releaseEligibleAt: computeEighteenthBirthday(dob),
    athleteAgeYears: age,
  };
}

// ----------------------------------------------------------------------------
// createDeferral
// ----------------------------------------------------------------------------

export interface CreateDeferralInput {
  dealId: string;
  athleteUserId: string;
  parentProfileId: string;
  brandChargeId: string | null;
  /** Cents — matches the brand charge row amount for unambiguous reconciliation. */
  amountCents: number;
  stateCode: string;
  deferralReason: DeferralReason;
  releaseEligibleAt: Date;
  trustAccountIdentifier?: string | null;
}

export interface CreateDeferralResult {
  ok: boolean;
  deferredPayoutId?: string;
  reason?: string;
}

/**
 * Insert the hs_deferred_payouts row AND flip the linked
 * hs_deal_parent_payouts row to status='deferred' with the new FK
 * populated. Idempotent on UNIQUE(deal_id): re-calling after a success
 * returns ok=true with the existing id.
 */
export async function createDeferral(
  input: CreateDeferralInput,
): Promise<CreateDeferralResult> {
  const sb = getServiceRoleClient();

  // Idempotency: if a row exists for this deal, short-circuit.
  const { data: existing } = await sb
    .from('hs_deferred_payouts')
    .select('id, status')
    .eq('deal_id', input.dealId)
    .maybeSingle();

  if (existing) {
    return {
      ok: true,
      deferredPayoutId: existing.id as string,
      reason: `already exists (status=${existing.status})`,
    };
  }

  const { data: inserted, error: insertErr } = await sb
    .from('hs_deferred_payouts')
    .insert({
      deal_id: input.dealId,
      athlete_user_id: input.athleteUserId,
      parent_profile_id: input.parentProfileId,
      brand_charge_id: input.brandChargeId,
      amount_cents: input.amountCents,
      state_code: input.stateCode,
      deferral_reason: input.deferralReason,
      release_eligible_at: input.releaseEligibleAt.toISOString(),
      status: 'holding',
      trust_account_identifier:
        input.trustAccountIdentifier ??
        process.env.HS_NIL_TRUST_ACCOUNT_ID ??
        null,
    })
    .select('id')
    .single();

  if (insertErr || !inserted) {
    logEvent('error', 'createDeferral insert failed', {
      dealId: input.dealId,
      error: insertErr?.message,
    });
    return { ok: false, reason: insertErr?.message ?? 'insert failed' };
  }

  // Flip the linked parent payout row.
  const { error: payoutErr } = await sb
    .from('hs_deal_parent_payouts')
    .update({
      status: 'deferred',
      deferred_payout_id: inserted.id as string,
    })
    .eq('deal_id', input.dealId);

  if (payoutErr) {
    logEvent('warn', 'createDeferral: parent payout flip failed', {
      dealId: input.dealId,
      deferredPayoutId: inserted.id,
      error: payoutErr.message,
    });
    // Don't rollback — the deferral row is the source of truth, and
    // ops can reconcile from there. Returning ok=true is defensible:
    // the hold is in place.
  }

  // Fire-and-forget notifications. Never block the DB write on an
  // email outage — sendEmail is fail-closed and these helpers return
  // { success: false } rather than throwing.
  void dispatchDeferralCreatedEmails({
    dealId: input.dealId,
    athleteUserId: input.athleteUserId,
    parentProfileId: input.parentProfileId,
    amountCents: input.amountCents,
    stateCode: input.stateCode,
    releaseEligibleAt: input.releaseEligibleAt.toISOString(),
  });

  return { ok: true, deferredPayoutId: inserted.id as string };
}

// ----------------------------------------------------------------------------
// Email dispatch helpers (fire-and-forget)
// ----------------------------------------------------------------------------

interface DispatchDeferralCreatedInput {
  dealId: string;
  athleteUserId: string;
  parentProfileId: string;
  amountCents: number;
  stateCode: string;
  releaseEligibleAt: string;
}

async function dispatchDeferralCreatedEmails(
  input: DispatchDeferralCreatedInput,
): Promise<void> {
  try {
    const sb = getServiceRoleClient();

    const [athleteAuthRes, dealRes, parentRes] = await Promise.all([
      sb.auth.admin.getUserById(input.athleteUserId),
      sb
        .from('deals')
        .select(
          'title, brand:brands(company_name), athlete:athletes(first_name)',
        )
        .eq('id', input.dealId)
        .maybeSingle(),
      sb
        .from('hs_parent_profiles')
        .select('user_id, full_name')
        .eq('id', input.parentProfileId)
        .maybeSingle(),
    ]);

    const athleteEmail = athleteAuthRes.data?.user?.email ?? null;
    const dealRow = (dealRes.data as unknown) as
      | {
          title: string;
          brand: { company_name: string } | null;
          athlete: { first_name: string | null } | null;
        }
      | null;
    const parentProfile = parentRes.data as
      | { user_id: string; full_name: string }
      | null;

    const dealTitle = dealRow?.title ?? 'your NIL deal';
    const brandName = dealRow?.brand?.company_name ?? 'the brand';
    const athleteFirstName = dealRow?.athlete?.first_name ?? 'Scholar';

    if (athleteEmail) {
      void sendDeferralCreatedToAthlete({
        recipientEmail: athleteEmail,
        athleteFirstName,
        brandName,
        dealTitle,
        amountCents: input.amountCents,
        releaseEligibleAt: input.releaseEligibleAt,
        stateCode: input.stateCode,
      });
    }

    if (parentProfile?.user_id) {
      try {
        const parentAuth = await sb.auth.admin.getUserById(
          parentProfile.user_id,
        );
        const parentEmail = parentAuth.data?.user?.email ?? null;
        const parentFirstName =
          (parentProfile.full_name || '').trim().split(/\s+/)[0] || 'there';
        if (parentEmail) {
          void sendDeferralCreatedToParent({
            recipientEmail: parentEmail,
            parentFirstName,
            athleteFirstName,
            brandName,
            dealTitle,
            amountCents: input.amountCents,
            releaseEligibleAt: input.releaseEligibleAt,
            stateCode: input.stateCode,
          });
        }
      } catch (err) {
        logEvent('warn', 'dispatchDeferralCreated: parent email lookup failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  } catch (err) {
    logEvent('warn', 'dispatchDeferralCreated: failed', {
      dealId: input.dealId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function dispatchDeferredReleasedEmail(
  dealId: string,
  parentProfileId: string,
  amountCents: number,
): Promise<void> {
  try {
    const sb = getServiceRoleClient();
    const [parentRes, dealRes] = await Promise.all([
      sb
        .from('hs_parent_profiles')
        .select('user_id, full_name')
        .eq('id', parentProfileId)
        .maybeSingle(),
      sb
        .from('deals')
        .select('athlete:athletes(first_name)')
        .eq('id', dealId)
        .maybeSingle(),
    ]);

    const parentProfile = parentRes.data as
      | { user_id: string; full_name: string }
      | null;
    const dealRow = (dealRes.data as unknown) as
      | { athlete: { first_name: string | null } | null }
      | null;

    if (!parentProfile?.user_id) return;
    const parentAuth = await sb.auth.admin.getUserById(parentProfile.user_id);
    const parentEmail = parentAuth.data?.user?.email ?? null;
    if (!parentEmail) return;

    const parentFirstName =
      (parentProfile.full_name || '').trim().split(/\s+/)[0] || 'there';
    const athleteFirstName = dealRow?.athlete?.first_name ?? 'Scholar';

    void sendDeferredReleased({
      recipientEmail: parentEmail,
      parentFirstName,
      athleteFirstName,
      amountCents,
    });
  } catch (err) {
    logEvent('warn', 'dispatchDeferredReleased: failed', {
      dealId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ----------------------------------------------------------------------------
// releaseDeferred
// ----------------------------------------------------------------------------

export interface ReleaseDeferredResult {
  ok: boolean;
  transferId?: string;
  reason?: string;
  notEligibleYet?: boolean;
  alreadyReleased?: boolean;
}

/**
 * Called by the daily release cron (and by the admin force-release path
 * after it has written its audit row). Refuses to release if the row's
 * release_eligible_at is still in the future.
 *
 * Flow on success:
 *   1. Flip hs_deal_parent_payouts.status back to 'pending' so
 *      releasePayout() sees a releasable row.
 *   2. Invoke releasePayout(dealId) — this is the same code path the
 *      non-deferred flow uses.
 *   3. Stamp hs_deferred_payouts with status='released', released_at,
 *      released_transfer_id.
 */
export async function releaseDeferred(
  deferredId: string,
  opts: { bypassEligibilityCheck?: boolean } = {},
): Promise<ReleaseDeferredResult> {
  const sb = getServiceRoleClient();

  const { data: row, error: fetchErr } = await sb
    .from('hs_deferred_payouts')
    .select(
      'id, deal_id, status, release_eligible_at, amount_cents, state_code, parent_profile_id',
    )
    .eq('id', deferredId)
    .maybeSingle();

  if (fetchErr || !row) {
    return { ok: false, reason: 'deferred payout not found' };
  }

  if (row.status === 'released') {
    return { ok: true, alreadyReleased: true, reason: 'already released' };
  }

  if (row.status !== 'holding') {
    return {
      ok: false,
      reason: `deferred payout terminal (status=${row.status})`,
    };
  }

  const eligibleAt = new Date(row.release_eligible_at as string).getTime();
  if (!opts.bypassEligibilityCheck && eligibleAt > Date.now()) {
    return {
      ok: false,
      notEligibleYet: true,
      reason: `not eligible until ${new Date(eligibleAt).toISOString()}`,
    };
  }

  // Re-enter the normal payout flow: flip parent payout to 'pending'.
  const { error: flipErr } = await sb
    .from('hs_deal_parent_payouts')
    .update({
      status: 'pending',
      authorized_at: null,
      paid_at: null,
      failed_reason: null,
    })
    .eq('deal_id', row.deal_id as string)
    .eq('status', 'deferred');

  if (flipErr) {
    logEvent('error', 'releaseDeferred: parent payout flip failed', {
      deferredId,
      dealId: row.deal_id,
      error: flipErr.message,
    });
    return { ok: false, reason: flipErr.message };
  }

  const payoutResult = await releasePayout(row.deal_id as string);

  if (!payoutResult.ok) {
    logEvent('warn', 'releaseDeferred: releasePayout failed', {
      deferredId,
      dealId: row.deal_id,
      reason: payoutResult.reason,
    });
    // Leave the deferred row in 'holding' so the cron can retry. The
    // parent payout may now be in 'failed' — that's fine; releasePayout
    // is idempotent and will retry on the next cron firing.
    return {
      ok: false,
      reason: payoutResult.reason ?? 'releasePayout failed',
    };
  }

  // Stamp the deferred row as released.
  const nowIso = new Date().toISOString();
  const { error: stampErr } = await sb
    .from('hs_deferred_payouts')
    .update({
      status: 'released',
      released_at: nowIso,
      released_transfer_id: payoutResult.transferId ?? null,
    })
    .eq('id', deferredId);

  if (stampErr) {
    logEvent('warn', 'releaseDeferred: row stamp failed', {
      deferredId,
      error: stampErr.message,
    });
  }

  // Also flip hs_deal_brand_charges.status to 'released_to_parent' to
  // mirror what releaseEscrowToParent does on the non-deferred path.
  await sb
    .from('hs_deal_brand_charges')
    .update({
      status: 'released_to_parent',
      released_at: nowIso,
    })
    .eq('deal_id', row.deal_id as string)
    .eq('status', 'succeeded');

  // Fire-and-forget release notification (parent). No athlete email on
  // release — the money path is to the parent's custodian. The 18th-
  // birthday moment is celebrated separately by the standard
  // completion-hooks pipeline once the Connect webhook confirms 'paid'.
  void dispatchDeferredReleasedEmail(
    row.deal_id as string,
    row.parent_profile_id as string,
    row.amount_cents as number,
  );

  return { ok: true, transferId: payoutResult.transferId };
}

// ----------------------------------------------------------------------------
// forfeitDeferred — admin path for misconduct / custodial disputes
// ----------------------------------------------------------------------------

export interface ForfeitDeferredInput {
  deferredId: string;
  reason: string;
  actorUserId: string;
}

export interface ForfeitDeferredResult {
  ok: boolean;
  auditLogId?: string;
  reason?: string;
}

/**
 * Admin-only: mark a deferred payout as forfeited. The funds remain in
 * the platform's custodial trust — what happens next (refund-to-brand /
 * redirect-to-state-fund / etc.) is handled out-of-band by ops. Writes
 * admin_audit_log with action='deferred_release_forfeited'.
 *
 * Caller must have already verified admin role. The calling route owns
 * the auth check; this function is the service-layer primitive.
 */
export async function forfeitDeferred(
  input: ForfeitDeferredInput,
): Promise<ForfeitDeferredResult> {
  if (!input.reason || input.reason.trim().length < 10) {
    return { ok: false, reason: 'reason must be at least 10 characters' };
  }

  const sb = getServiceRoleClient();

  const { data: row, error: fetchErr } = await sb
    .from('hs_deferred_payouts')
    .select('id, deal_id, status')
    .eq('id', input.deferredId)
    .maybeSingle();

  if (fetchErr || !row) {
    return { ok: false, reason: 'deferred payout not found' };
  }

  if (row.status !== 'holding') {
    return {
      ok: false,
      reason: `cannot forfeit a deferral in status=${row.status}`,
    };
  }

  const { error: updateErr } = await sb
    .from('hs_deferred_payouts')
    .update({
      status: 'forfeited',
      forfeiture_reason: input.reason.trim().slice(0, 2000),
    })
    .eq('id', input.deferredId);

  if (updateErr) {
    return { ok: false, reason: updateErr.message };
  }

  // Flip the linked parent payout to 'refunded' (terminal; no outbound
  // transfer will ever fire).
  await sb
    .from('hs_deal_parent_payouts')
    .update({ status: 'refunded', failed_reason: 'deferred payout forfeited' })
    .eq('deal_id', row.deal_id as string);

  const { data: audit, error: auditErr } = await sb
    .from('admin_audit_log')
    .insert({
      actor_user_id: input.actorUserId,
      action: 'deferred_release_forfeited',
      target_kind: 'deferred_payout',
      target_id: input.deferredId,
      reason: input.reason.trim(),
      metadata: { dealId: row.deal_id, previousStatus: row.status },
    })
    .select('id')
    .single();

  if (auditErr || !audit) {
    return {
      ok: false,
      reason: `forfeit applied but audit write failed: ${auditErr?.message}`,
    };
  }

  return { ok: true, auditLogId: audit.id as string };
}

// ----------------------------------------------------------------------------
// listPendingReleases — admin view
// ----------------------------------------------------------------------------

/**
 * Return holding rows whose release date has arrived OR is within `withinDays`
 * days from now. Default window covers "this week" — sufficient for an ops
 * dashboard glance. Service-role callers only.
 */
export async function listPendingReleases(
  withinDays = 7,
): Promise<DeferredPayoutRow[]> {
  const sb = getServiceRoleClient();
  const cutoff = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);

  const { data, error } = await sb
    .from('hs_deferred_payouts')
    .select(
      'id, deal_id, athlete_user_id, parent_profile_id, brand_charge_id, amount_cents, state_code, deferral_reason, release_eligible_at, status, released_at, released_transfer_id, forfeiture_reason, trust_account_identifier, created_at, updated_at',
    )
    .eq('status', 'holding')
    .lte('release_eligible_at', cutoff.toISOString())
    .order('release_eligible_at', { ascending: true })
    .limit(200);

  if (error) {
    logEvent('warn', 'listPendingReleases query failed', {
      error: error.message,
    });
    return [];
  }
  return (data as unknown as DeferredPayoutRow[]) ?? [];
}

// ----------------------------------------------------------------------------
// getDeferralForDeal — brand / athlete / parent surface query
// ----------------------------------------------------------------------------

export async function getDeferralForDeal(
  dealId: string,
  client?: SupabaseClient,
): Promise<DeferredPayoutRow | null> {
  const sb = client ?? getServiceRoleClient();
  const { data } = await sb
    .from('hs_deferred_payouts')
    .select(
      'id, deal_id, athlete_user_id, parent_profile_id, brand_charge_id, amount_cents, state_code, deferral_reason, release_eligible_at, status, released_at, released_transfer_id, forfeiture_reason, trust_account_identifier, created_at, updated_at',
    )
    .eq('deal_id', dealId)
    .maybeSingle();

  return (data as unknown as DeferredPayoutRow | null) ?? null;
}

// ----------------------------------------------------------------------------
// listDeferralsForAthlete — athlete-facing surface
// ----------------------------------------------------------------------------

/**
 * All deferrals for a given athlete, in reverse release-date order. Used by
 * /hs/athlete/deferred-earnings to render the held + released amounts.
 * Passes through a caller-provided supabase client (usually the SSR one)
 * so RLS applies — athlete only sees their own rows.
 */
export async function listDeferralsForAthlete(
  athleteUserId: string,
  client: SupabaseClient,
): Promise<DeferredPayoutRow[]> {
  const { data, error } = await client
    .from('hs_deferred_payouts')
    .select(
      'id, deal_id, athlete_user_id, parent_profile_id, brand_charge_id, amount_cents, state_code, deferral_reason, release_eligible_at, status, released_at, released_transfer_id, forfeiture_reason, trust_account_identifier, created_at, updated_at',
    )
    .eq('athlete_user_id', athleteUserId)
    .order('release_eligible_at', { ascending: false });

  if (error) {
    logEvent('warn', 'listDeferralsForAthlete query failed', {
      athleteUserId,
      error: error.message,
    });
    return [];
  }
  return (data as unknown as DeferredPayoutRow[]) ?? [];
}

/**
 * All deferrals linked to the parent's profile id. Same shape as
 * listDeferralsForAthlete but keyed on parent_profile_id for the
 * /hs/parent surface. RLS applies via the caller's client.
 */
export async function listDeferralsForParent(
  parentProfileId: string,
  client: SupabaseClient,
): Promise<DeferredPayoutRow[]> {
  const { data, error } = await client
    .from('hs_deferred_payouts')
    .select(
      'id, deal_id, athlete_user_id, parent_profile_id, brand_charge_id, amount_cents, state_code, deferral_reason, release_eligible_at, status, released_at, released_transfer_id, forfeiture_reason, trust_account_identifier, created_at, updated_at',
    )
    .eq('parent_profile_id', parentProfileId)
    .order('release_eligible_at', { ascending: false });

  if (error) {
    logEvent('warn', 'listDeferralsForParent query failed', {
      parentProfileId,
      error: error.message,
    });
    return [];
  }
  return (data as unknown as DeferredPayoutRow[]) ?? [];
}
