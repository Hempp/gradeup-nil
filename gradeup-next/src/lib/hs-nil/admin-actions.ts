/**
 * HS-NIL Admin Write Actions (Phase 6)
 * ----------------------------------------------------------------------------
 * Single service layer for the four ops-admin write actions exposed on the
 * /hs/admin/* queue pages:
 *
 *   1. retryDisclosure          — re-queue a failed hs_deal_disclosures row
 *   2. resolvePayoutManually    — manually set an hs_deal_parent_payouts row
 *                                 to 'paid' (out-of-band ACH) or 'refunded'
 *   3. forceVerifyLink          — admin overrides athlete-confirms flow
 *                                 and stamps verified_at + method='manual_support'
 *   4. sendConsentRenewalNudge  — email parent with a renewal link; does NOT
 *                                 mutate the consent record (parents must act)
 *
 * Every call writes an `admin_audit_log` row for compliance traceability.
 * The audit insert AND the domain write both use the service-role client,
 * so a single Supabase session covers both writes. We do the domain write
 * first (source of truth) and the audit insert second — if the audit
 * insert fails we surface that as a 500 but log loudly so ops can
 * hand-reconcile. This is strictly preferable to writing the log first
 * and potentially leaving a "ghost" audit entry with no domain change.
 *
 * Transaction semantics: Supabase's PostgREST does not expose BEGIN/COMMIT
 * across multiple HTTP calls. Where atomicity matters we prefer a single
 * UPDATE + RETURNING rather than split reads+writes. Cross-table sequences
 * (disclosure retry = insert new row + audit log; payout resolve = update
 * payout + audit log) are executed sequentially and any partial-failure
 * state is reported back to the caller.
 */

import {
  createClient as createServiceClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import type { USPSStateCode } from './state-rules';
import { getDisclosureRecipient } from './disclosure-recipients';
import { STATE_RULES } from './state-rules';
import { sendConsentRenewalNudge as sendConsentRenewalNudgeEmail } from '@/lib/services/hs-nil/emails';
import { writeRetryGuard, type BulkTargetKind } from './retry-guards';

/**
 * Shared guard-write. Called after every successful single-row action so
 * bulk flows see the cooldown. Non-fatal on failure.
 */
async function recordRetryGuard(
  targetKind: BulkTargetKind,
  targetId: string,
  actorId: string,
  action: string
): Promise<void> {
  try {
    await writeRetryGuard(targetKind, targetId, actorId, action);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil admin-actions] retry guard write failed', {
      targetKind,
      targetId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type AdminAuditAction =
  | 'disclosure_retry'
  | 'payout_resolve'
  | 'link_force_verify'
  | 'consent_renewal_nudge';

export type AdminAuditTargetKind =
  | 'disclosure'
  | 'payout'
  | 'link'
  | 'consent';

export interface AdminActionOk {
  ok: true;
  auditLogId: string;
  metadata?: Record<string, unknown>;
}

export interface AdminActionErr {
  ok: false;
  error: string;
  code:
    | 'not_found'
    | 'invalid_state'
    | 'db_error'
    | 'email_failed'
    | 'internal';
}

export type AdminActionResult = AdminActionOk | AdminActionErr;

// ----------------------------------------------------------------------------
// Service-role client
// ----------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil admin-actions] Supabase service role not configured ' +
        '(NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ----------------------------------------------------------------------------
// Audit log helper
// ----------------------------------------------------------------------------

async function writeAudit(
  sb: SupabaseClient,
  input: {
    actorUserId: string;
    action: AdminAuditAction;
    targetKind: AdminAuditTargetKind;
    targetId: string;
    reason: string;
    metadata?: Record<string, unknown>;
  }
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await sb
    .from('admin_audit_log')
    .insert({
      actor_user_id: input.actorUserId,
      action: input.action,
      target_kind: input.targetKind,
      target_id: input.targetId,
      reason: input.reason,
      metadata: input.metadata ?? {},
    })
    .select('id')
    .single();

  if (error || !data) {
    // eslint-disable-next-line no-console
    console.error('[hs-nil admin-actions] audit write failed', {
      action: input.action,
      targetKind: input.targetKind,
      targetId: input.targetId,
      error: error?.message,
    });
    return { error: error?.message ?? 'audit insert failed' };
  }
  return { id: data.id as string };
}

// ----------------------------------------------------------------------------
// 1. retryDisclosure
// ----------------------------------------------------------------------------

/**
 * Re-queue a failed disclosure. We load the most recent failed row for the
 * deal, then INSERT a fresh `pending` row scheduled 10 minutes from now,
 * reusing the recipient, state, and payload snapshot (refreshed from the
 * live deal / parent consent where cheap).
 *
 * The old failed row is left in place — it is history. Ops reading the
 * audit log can trace from the new row's metadata.original_disclosure_id
 * back to the failure reason.
 */
export async function retryDisclosure(
  dealId: string,
  actorId: string,
  reason: string
): Promise<AdminActionResult> {
  if (!reason || reason.trim().length < 10) {
    return {
      ok: false,
      error: 'Reason must be at least 10 characters.',
      code: 'invalid_state',
    };
  }

  const sb = getServiceRoleClient();

  const { data: failed, error: fetchErr } = await sb
    .from('hs_deal_disclosures')
    .select(
      'id, deal_id, athlete_user_id, state_code, recipient, payload, failure_reason'
    )
    .eq('deal_id', dealId)
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchErr) {
    return { ok: false, error: fetchErr.message, code: 'db_error' };
  }
  if (!failed) {
    return {
      ok: false,
      error: 'No failed disclosure found for this deal.',
      code: 'not_found',
    };
  }

  // Recipient / rules sanity check — if the recipient map has changed
  // since the row was written, use the current address.
  const state = failed.state_code as USPSStateCode;
  const recipient =
    getDisclosureRecipient(state)?.email ?? (failed.recipient as string);
  const rules = STATE_RULES[state];

  const scheduledFor = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { data: inserted, error: insertErr } = await sb
    .from('hs_deal_disclosures')
    .insert({
      deal_id: failed.deal_id,
      athlete_user_id: failed.athlete_user_id,
      state_code: failed.state_code,
      scheduled_for: scheduledFor,
      recipient,
      payload: failed.payload ?? {},
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertErr || !inserted) {
    return {
      ok: false,
      error: insertErr?.message ?? 'Failed to requeue disclosure.',
      code: 'db_error',
    };
  }

  const audit = await writeAudit(sb, {
    actorUserId: actorId,
    action: 'disclosure_retry',
    targetKind: 'disclosure',
    targetId: inserted.id as string,
    reason: reason.trim(),
    metadata: {
      originalDisclosureId: failed.id,
      dealId,
      stateCode: failed.state_code,
      originalFailureReason: failed.failure_reason ?? null,
      windowHours: rules?.disclosureWindowHours ?? null,
      scheduledFor,
    },
  });

  if ('error' in audit) {
    return {
      ok: false,
      error: `Disclosure re-queued (id=${inserted.id}) but audit log write failed: ${audit.error}`,
      code: 'db_error',
    };
  }

  // Dedupe guard uses the originating deal id — bulk flows key on dealId
  // for disclosures because retryDisclosure resolves deal → latest-failed.
  await recordRetryGuard('disclosure', dealId, actorId, 'disclosure_retry');

  return {
    ok: true,
    auditLogId: audit.id,
    metadata: { newDisclosureId: inserted.id, originalDisclosureId: failed.id },
  };
}

// ----------------------------------------------------------------------------
// 2. resolvePayoutManually
// ----------------------------------------------------------------------------

export type ManualPayoutDecision = 'paid' | 'refunded';

/**
 * Mark a stuck or failed payout as manually resolved. "paid" covers the
 * out-of-band ACH case (money moved outside Stripe); "refunded" covers
 * the platform-holds-the-money path. Either way the row transitions to
 * a terminal state and the audit log records the decision + a reference
 * ops can use to trace back (ACH confirmation number, Stripe refund id,
 * internal ticket id, etc.).
 */
export async function resolvePayoutManually(
  payoutId: string,
  actorId: string,
  decision: ManualPayoutDecision,
  reference: string,
  reason: string
): Promise<AdminActionResult> {
  if (!reason || reason.trim().length < 10) {
    return {
      ok: false,
      error: 'Reason must be at least 10 characters.',
      code: 'invalid_state',
    };
  }
  if (!reference || reference.trim().length === 0) {
    return {
      ok: false,
      error: 'Reference code is required.',
      code: 'invalid_state',
    };
  }
  if (decision !== 'paid' && decision !== 'refunded') {
    return {
      ok: false,
      error: 'Decision must be "paid" or "refunded".',
      code: 'invalid_state',
    };
  }

  const sb = getServiceRoleClient();

  const { data: row, error: fetchErr } = await sb
    .from('hs_deal_parent_payouts')
    .select('id, deal_id, status')
    .eq('id', payoutId)
    .maybeSingle();

  if (fetchErr) {
    return { ok: false, error: fetchErr.message, code: 'db_error' };
  }
  if (!row) {
    return { ok: false, error: 'Payout not found.', code: 'not_found' };
  }
  if (row.status === 'paid' && decision === 'paid') {
    return {
      ok: false,
      error: 'Payout is already marked paid.',
      code: 'invalid_state',
    };
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    status: decision,
    failed_reason: null,
    stripe_transfer_id: reference.trim(),
  };
  if (decision === 'paid') {
    update.paid_at = now;
  }

  const { error: updateErr } = await sb
    .from('hs_deal_parent_payouts')
    .update(update)
    .eq('id', payoutId);

  if (updateErr) {
    return { ok: false, error: updateErr.message, code: 'db_error' };
  }

  const audit = await writeAudit(sb, {
    actorUserId: actorId,
    action: 'payout_resolve',
    targetKind: 'payout',
    targetId: payoutId,
    reason: reason.trim(),
    metadata: {
      decision,
      reference: reference.trim(),
      previousStatus: row.status,
      dealId: row.deal_id,
    },
  });

  if ('error' in audit) {
    return {
      ok: false,
      error: `Payout updated but audit log write failed: ${audit.error}`,
      code: 'db_error',
    };
  }

  await recordRetryGuard('payout', payoutId, actorId, 'payout_resolve');

  return {
    ok: true,
    auditLogId: audit.id,
    metadata: { decision, previousStatus: row.status },
  };
}

// ----------------------------------------------------------------------------
// 3. forceVerifyLink
// ----------------------------------------------------------------------------

/**
 * Admin override for a stale pending hs_parent_athlete_links row. Sets
 * verified_at = now() and verification_method = 'manual_support'. Neither
 * party is emailed — this is an explicit ops override and the reason field
 * captures why (support call, documented guardianship proof, etc).
 */
export async function forceVerifyLink(
  linkId: string,
  actorId: string,
  reason: string
): Promise<AdminActionResult> {
  if (!reason || reason.trim().length < 10) {
    return {
      ok: false,
      error: 'Reason must be at least 10 characters.',
      code: 'invalid_state',
    };
  }

  const sb = getServiceRoleClient();
  const now = new Date().toISOString();

  const { data: updated, error: updateErr } = await sb
    .from('hs_parent_athlete_links')
    .update({
      verified_at: now,
      verification_method: 'manual_support',
    })
    .eq('id', linkId)
    .is('verified_at', null)
    .select('id, parent_profile_id, athlete_user_id')
    .maybeSingle();

  if (updateErr) {
    return { ok: false, error: updateErr.message, code: 'db_error' };
  }
  if (!updated) {
    return {
      ok: false,
      error: 'Link not found or already verified.',
      code: 'not_found',
    };
  }

  const audit = await writeAudit(sb, {
    actorUserId: actorId,
    action: 'link_force_verify',
    targetKind: 'link',
    targetId: linkId,
    reason: reason.trim(),
    metadata: {
      parentProfileId: updated.parent_profile_id,
      athleteUserId: updated.athlete_user_id,
      verificationMethod: 'manual_support',
      silent: true,
    },
  });

  if ('error' in audit) {
    return {
      ok: false,
      error: `Link verified but audit log write failed: ${audit.error}`,
      code: 'db_error',
    };
  }

  await recordRetryGuard('link', linkId, actorId, 'link_force_verify');

  return {
    ok: true,
    auditLogId: audit.id,
    metadata: { verifiedAt: now },
  };
}

// ----------------------------------------------------------------------------
// 4. sendConsentRenewalNudge
// ----------------------------------------------------------------------------

interface ConsentLookupRow {
  id: string;
  athlete_user_id: string;
  parent_email: string;
  parent_full_name: string;
  expires_at: string;
  scope: Record<string, unknown> | null;
}

function summarizeScope(scope: Record<string, unknown> | null): string {
  if (!scope || typeof scope !== 'object') return 'your current approved scope';
  const parts: string[] = [];
  const categories = Array.isArray(scope.deal_categories)
    ? (scope.deal_categories as string[])
    : [];
  if (categories.length) {
    parts.push(`categories: ${categories.join(', ')}`);
  }
  if (typeof scope.max_deal_amount === 'number') {
    parts.push(`max per deal: $${(scope.max_deal_amount as number).toLocaleString()}`);
  }
  if (typeof scope.duration_months === 'number') {
    parts.push(`duration: ${scope.duration_months} months`);
  }
  return parts.length ? parts.join(' · ') : 'your current approved scope';
}

/**
 * Send a best-effort renewal nudge to the parent on record. Does NOT modify
 * the consent row — renewal requires parental intent and flows through the
 * existing /hs/consent/request?renew=<id> surface.
 */
export async function sendConsentRenewalNudge(
  consentId: string,
  actorId: string
): Promise<AdminActionResult> {
  const sb = getServiceRoleClient();

  const { data: consent, error: fetchErr } = await sb
    .from('parental_consents')
    .select(
      'id, athlete_user_id, parent_email, parent_full_name, expires_at, scope'
    )
    .eq('id', consentId)
    .maybeSingle();

  if (fetchErr) {
    return { ok: false, error: fetchErr.message, code: 'db_error' };
  }
  if (!consent) {
    return { ok: false, error: 'Consent not found.', code: 'not_found' };
  }

  const row = consent as ConsentLookupRow;

  // Best-effort athlete name lookup (used in the email subject line).
  let athleteName = 'your athlete';
  try {
    const { data: profile } = await sb
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', row.athlete_user_id)
      .maybeSingle();
    const fn = (profile?.first_name as string | null) ?? '';
    const ln = (profile?.last_name as string | null) ?? '';
    const combined = `${fn} ${ln}`.trim();
    if (combined) athleteName = combined;
  } catch {
    // non-fatal
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    'https://gradeupnil.com';
  const renewUrl = `${appUrl}/hs/consent/request?renew=${encodeURIComponent(
    row.id
  )}`;

  let emailResult: { success: boolean; messageId: string | null; error: string | null } = {
    success: false,
    messageId: null,
    error: null,
  };
  try {
    const res = await sendConsentRenewalNudgeEmail({
      parentEmail: row.parent_email,
      parentFullName: row.parent_full_name,
      athleteName,
      scopeSummary: summarizeScope(row.scope),
      currentExpiresAt: new Date(row.expires_at),
      renewUrl,
    });
    emailResult = {
      success: res.success,
      messageId: res.data?.id ?? null,
      error: res.error ?? null,
    };
  } catch (err) {
    emailResult = {
      success: false,
      messageId: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Write the audit row regardless of email outcome. The audit is the
  // durable record that ops tried; delivery success is captured inside.
  const audit = await writeAudit(sb, {
    actorUserId: actorId,
    action: 'consent_renewal_nudge',
    targetKind: 'consent',
    targetId: row.id,
    reason: 'Expiring consent — send renewal reminder to parent.',
    metadata: {
      parentEmail: row.parent_email,
      athleteUserId: row.athlete_user_id,
      expiresAt: row.expires_at,
      renewUrl,
      delivery: emailResult,
    },
  });

  if ('error' in audit) {
    return {
      ok: false,
      error: `Email ${emailResult.success ? 'sent' : 'attempted'} but audit log write failed: ${audit.error}`,
      code: 'db_error',
    };
  }

  // If the email itself failed, surface that to the caller but the audit
  // row still exists so ops sees the attempt.
  if (!emailResult.success) {
    return {
      ok: false,
      error: emailResult.error ?? 'Email delivery failed.',
      code: 'email_failed',
    };
  }

  await recordRetryGuard(
    'consent',
    row.id,
    actorId,
    'consent_renewal_nudge'
  );

  return {
    ok: true,
    auditLogId: audit.id,
    metadata: { parentEmail: row.parent_email, renewUrl },
  };
}
