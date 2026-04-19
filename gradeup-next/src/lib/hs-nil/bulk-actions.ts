/**
 * HS-NIL Admin Bulk Actions (Phase 9)
 * ---------------------------------------------------------------------------
 * Fan-out wrappers around the single-row admin actions from admin-actions.ts.
 * A bulk run:
 *
 *   1. Inserts an admin_bulk_operations row with status='running'.
 *   2. For each target:
 *        a. Checks admin_retry_guards for a recent retry. If within
 *           cooldown, record status='skipped_retry_guard' and continue
 *           (do NOT call the single-row action — no side effects).
 *        b. Otherwise call the existing single-row action (retryDisclosure,
 *           resolvePayoutManually, forceVerifyLink, sendConsentRenewalNudge).
 *        c. Upsert admin_retry_guards so subsequent operators (or a
 *           re-run of this bulk op, or a parallel single-row action)
 *           see the fresh timestamp.
 *   3. Updates the admin_bulk_operations row with a per-item summary
 *      map and one of four terminal statuses:
 *        - completed         — every item succeeded.
 *        - partial_failure   — mix of ok / skipped_retry_guard / failed.
 *        - failed            — zero successes.
 *        - (running stays only on unhandled crash; caller sees 500.)
 *
 * The admin_retry_guards table is ALSO written by single-row actions
 * (see admin-actions.ts edit) so bulk ops see cooldowns from single-row
 * work and vice versa. That's the whole point.
 *
 * We intentionally DO NOT parallelize — the sequential loop keeps
 * Supabase connection usage low and preserves per-item error isolation.
 * Bulk sizes are expected to be 5-50 in the concierge era.
 */

import {
  createClient as createServiceClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import {
  retryDisclosure,
  resolvePayoutManually,
  forceVerifyLink,
  sendConsentRenewalNudge,
  type AdminActionResult,
  type ManualPayoutDecision,
} from './admin-actions';
import {
  checkRetryGuard,
  writeRetryGuard,
  listActiveRetryGuards,
  RETRY_GUARD_COOLDOWN_MINUTES,
  type BulkTargetKind,
  type ActiveRetryGuard,
} from './retry-guards';

export {
  checkRetryGuard,
  writeRetryGuard,
  listActiveRetryGuards,
  RETRY_GUARD_COOLDOWN_MINUTES,
};
export type { BulkTargetKind, ActiveRetryGuard };

// ---------------------------------------------------------------------------
// Cooldowns are defined in retry-guards.ts (shared with single-row flow).
//
// Rationale recap:
//   disclosures (10m): cron rescans every ~5min; 10m catches one full
//     retry before we'd fire again manually.
//   payouts (30m): wait for async Stripe state to settle; avoids
//     double-posting refund while dashboard is still reconciling.
//   links (5m): admin override is terminal; catches accidental
//     double-click only.
//   consent nudges (60m): parent inbox etiquette / deliverability.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BulkOperationType =
  | 'bulk_disclosure_retry'
  | 'bulk_payout_resolve'
  | 'bulk_link_force_verify'
  | 'bulk_consent_renewal_nudge';

export type BulkItemStatus = 'ok' | 'skipped_retry_guard' | 'failed';

export interface BulkItemResult {
  status: BulkItemStatus;
  auditLogId?: string | null;
  error?: string;
  code?: string;
  skippedUntil?: string;
  metadata?: Record<string, unknown>;
}

export interface BulkOperationSummary {
  items: Record<string, BulkItemResult>;
  counts: { ok: number; skipped: number; failed: number };
}

export interface BulkOperationResult {
  ok: boolean;
  bulkOperationId: string | null;
  status: 'completed' | 'partial_failure' | 'failed';
  summary: BulkOperationSummary;
}

// ---------------------------------------------------------------------------
// Service-role client (same pattern as admin-actions.ts)
// ---------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil bulk-actions] Supabase service role not configured ' +
        '(NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// admin_bulk_operations helpers
// ---------------------------------------------------------------------------

async function openBulkOperation(
  sb: SupabaseClient,
  input: {
    actorUserId: string;
    operationType: BulkOperationType;
    targetIds: string[];
    reason: string;
  }
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await sb
    .from('admin_bulk_operations')
    .insert({
      actor_user_id: input.actorUserId,
      operation_type: input.operationType,
      target_ids: input.targetIds,
      item_count: input.targetIds.length,
      reason: input.reason,
      status: 'running',
      summary: { items: {}, counts: { ok: 0, skipped: 0, failed: 0 } },
    })
    .select('id')
    .single();
  if (error || !data) {
    return { error: error?.message ?? 'bulk op insert failed' };
  }
  return { id: data.id as string };
}

async function closeBulkOperation(
  sb: SupabaseClient,
  id: string,
  summary: BulkOperationSummary,
  status: 'completed' | 'partial_failure' | 'failed'
): Promise<void> {
  const { error } = await sb
    .from('admin_bulk_operations')
    .update({
      summary,
      status,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[hs-nil bulk-actions] closing bulk op failed', {
      id,
      error: error.message,
    });
  }
}

function deriveStatus(
  counts: BulkOperationSummary['counts']
): 'completed' | 'partial_failure' | 'failed' {
  const actedOn = counts.ok + counts.failed;
  if (counts.ok === 0 && actedOn > 0) return 'failed';
  if (counts.failed > 0 || counts.skipped > 0) return 'partial_failure';
  return 'completed';
}

// ---------------------------------------------------------------------------
// Per-kind normalization of AdminActionResult → BulkItemResult
// ---------------------------------------------------------------------------

function toItemResult(res: AdminActionResult): BulkItemResult {
  if (res.ok) {
    return {
      status: 'ok',
      auditLogId: res.auditLogId,
      metadata: res.metadata,
    };
  }
  return {
    status: 'failed',
    error: res.error,
    code: res.code,
  };
}

// ---------------------------------------------------------------------------
// 1. bulkRetryDisclosures
// ---------------------------------------------------------------------------

/**
 * @param dealIds  — array of deal_ids to retry (retryDisclosure resolves
 *                   to the most-recent failed disclosure for each deal).
 */
export async function bulkRetryDisclosures(
  dealIds: string[],
  actorId: string,
  reason: string
): Promise<BulkOperationResult> {
  return runBulk({
    operationType: 'bulk_disclosure_retry',
    targetKind: 'disclosure',
    actorId,
    reason,
    targets: dealIds,
    actionName: 'disclosure_retry',
    runOne: async (dealId) => retryDisclosure(dealId, actorId, reason),
  });
}

// ---------------------------------------------------------------------------
// 2. bulkResolvePayouts
// ---------------------------------------------------------------------------

export interface BulkPayoutResolveItem {
  payoutId: string;
  decision: ManualPayoutDecision;
  reference: string;
  reason: string;
}

export async function bulkResolvePayouts(
  items: BulkPayoutResolveItem[],
  actorId: string,
  groupReason: string
): Promise<BulkOperationResult> {
  // Every item carries its own reason (decisions can vary across rows);
  // the bulk row's reason is the operator's overall note.
  const targetIds = items.map((i) => i.payoutId);
  return runBulk({
    operationType: 'bulk_payout_resolve',
    targetKind: 'payout',
    actorId,
    reason: groupReason,
    targets: targetIds,
    actionName: 'payout_resolve',
    runOne: async (payoutId) => {
      const item = items.find((i) => i.payoutId === payoutId);
      if (!item) {
        return {
          ok: false,
          error: 'Item missing from payload.',
          code: 'invalid_state',
        };
      }
      return resolvePayoutManually(
        item.payoutId,
        actorId,
        item.decision,
        item.reference,
        item.reason
      );
    },
  });
}

// ---------------------------------------------------------------------------
// 3. bulkForceVerifyLinks
// ---------------------------------------------------------------------------

export async function bulkForceVerifyLinks(
  linkIds: string[],
  actorId: string,
  reason: string
): Promise<BulkOperationResult> {
  return runBulk({
    operationType: 'bulk_link_force_verify',
    targetKind: 'link',
    actorId,
    reason,
    targets: linkIds,
    actionName: 'link_force_verify',
    runOne: async (linkId) => forceVerifyLink(linkId, actorId, reason),
  });
}

// ---------------------------------------------------------------------------
// 4. bulkSendConsentRenewalNudges
// ---------------------------------------------------------------------------

export async function bulkSendConsentRenewalNudges(
  consentIds: string[],
  actorId: string,
  reason: string
): Promise<BulkOperationResult> {
  return runBulk({
    operationType: 'bulk_consent_renewal_nudge',
    targetKind: 'consent',
    actorId,
    reason,
    targets: consentIds,
    actionName: 'consent_renewal_nudge',
    runOne: async (consentId) => sendConsentRenewalNudge(consentId, actorId),
  });
}

// ---------------------------------------------------------------------------
// runBulk — the shared loop.
// ---------------------------------------------------------------------------

async function runBulk(args: {
  operationType: BulkOperationType;
  targetKind: BulkTargetKind;
  actorId: string;
  reason: string;
  targets: string[];
  actionName: string;
  runOne: (targetId: string) => Promise<AdminActionResult>;
}): Promise<BulkOperationResult> {
  const sb = getServiceRoleClient();
  const cooldown = RETRY_GUARD_COOLDOWN_MINUTES[args.targetKind];

  // Deduplicate caller-supplied ids so the audit record matches reality.
  const deduped = Array.from(new Set(args.targets));

  if (args.reason.trim().length < 10) {
    return {
      ok: false,
      bulkOperationId: null,
      status: 'failed',
      summary: {
        items: {},
        counts: { ok: 0, skipped: 0, failed: 0 },
      },
    };
  }

  if (deduped.length === 0) {
    return {
      ok: false,
      bulkOperationId: null,
      status: 'failed',
      summary: {
        items: {},
        counts: { ok: 0, skipped: 0, failed: 0 },
      },
    };
  }

  const opened = await openBulkOperation(sb, {
    actorUserId: args.actorId,
    operationType: args.operationType,
    targetIds: deduped,
    reason: args.reason.trim(),
  });
  if ('error' in opened) {
    // eslint-disable-next-line no-console
    console.error('[hs-nil bulk-actions] open failed', {
      op: args.operationType,
      error: opened.error,
    });
    return {
      ok: false,
      bulkOperationId: null,
      status: 'failed',
      summary: { items: {}, counts: { ok: 0, skipped: 0, failed: 0 } },
    };
  }

  const summary: BulkOperationSummary = {
    items: {},
    counts: { ok: 0, skipped: 0, failed: 0 },
  };

  for (const targetId of deduped) {
    const guard = await checkRetryGuard(args.targetKind, targetId, cooldown);
    if (guard.blocked) {
      summary.items[targetId] = {
        status: 'skipped_retry_guard',
        skippedUntil: guard.unblockAt,
      };
      summary.counts.skipped += 1;
      continue;
    }

    try {
      const res = await args.runOne(targetId);
      const item = toItemResult(res);
      summary.items[targetId] = item;
      if (item.status === 'ok') {
        summary.counts.ok += 1;
        await writeRetryGuard(
          args.targetKind,
          targetId,
          args.actorId,
          args.actionName
        );
      } else {
        summary.counts.failed += 1;
      }
    } catch (err) {
      summary.items[targetId] = {
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
        code: 'internal',
      };
      summary.counts.failed += 1;
    }
  }

  const status = deriveStatus(summary.counts);
  await closeBulkOperation(sb, opened.id, summary, status);

  return {
    ok: status !== 'failed',
    bulkOperationId: opened.id,
    status,
    summary,
  };
}

// ---------------------------------------------------------------------------
// Concierge-cohort helpers
// ---------------------------------------------------------------------------

/**
 * Flip hs_waitlist.is_concierge for a single waitlist row. Reason is NOT
 * required here (the cohort flag is a bookkeeping toggle, not a
 * consequential write) but we still drop a note in admin_audit_log for
 * the audit trail via the bulk-operations table as a single-item run.
 *
 * Kept as a thin helper rather than wiring through admin-actions.ts
 * because toggling a boolean doesn't belong in the domain-action layer.
 */
export async function markAsConciergeCohort(
  waitlistId: string,
  actorId: string,
  isConcierge: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getServiceRoleClient();
  const { error } = await sb
    .from('hs_waitlist')
    .update({ is_concierge: isConcierge })
    .eq('id', waitlistId);
  if (error) return { ok: false, error: error.message };
  // eslint-disable-next-line no-console
  console.info('[hs-nil bulk-actions] concierge flag set', {
    waitlistId,
    isConcierge,
    actorId,
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Concierge cohort read-side aggregator
// ---------------------------------------------------------------------------

export type ConciergeFunnelPosition =
  | 'not_signed_up'
  | 'signed_up'
  | 'consent_signed'
  | 'deal_signed'
  | 'deal_paid'
  | 'share_observed';

export interface ConciergeCohortRow {
  waitlistId: string;
  email: string;
  role: string;
  stateCode: string;
  schoolName: string | null;
  invitedAt: string;
  daysSinceInvite: number;
  funnelPosition: ConciergeFunnelPosition;
  latestActivityAt: string | null;
  parentUserId: string | null;
  parentName: string | null;
}

/**
 * Assemble one row per concierge-marked waitlist entry with its funnel
 * position derived from joins to auth.users / parental_consents / deals /
 * deal_share_events. All reads are service-role.
 *
 * Join on email (lower(email) = lower(auth.users.email)) because we don't
 * yet have a hard FK from waitlist to auth user (signup happens later and
 * email is our stable identifier at invite time).
 */
export async function loadConciergeCohort(): Promise<ConciergeCohortRow[]> {
  const sb = getServiceRoleClient();

  const { data: waitlistRows, error } = await sb
    .from('hs_waitlist')
    .select('id, email, role, state_code, school_name, created_at')
    .eq('is_concierge', true)
    .order('created_at', { ascending: true });

  if (error || !waitlistRows) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil bulk-actions] concierge cohort load failed', error);
    return [];
  }

  const emails = Array.from(
    new Set(waitlistRows.map((r) => r.email.toLowerCase()))
  );
  if (emails.length === 0) return [];

  // Resolve auth.users → profiles (id / first_name / last_name).
  // Service role can read auth.users; we only need the id / email match.
  const { data: authUsers } = await sb
    .schema('auth')
    .from('users')
    .select('id, email')
    .in('email', emails);

  const userByEmail = new Map<string, string>();
  for (const u of authUsers ?? []) {
    if (u.email) userByEmail.set(u.email.toLowerCase(), u.id as string);
  }

  const userIds = Array.from(new Set(userByEmail.values()));

  // profiles
  const { data: profiles } = userIds.length
    ? await sb
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds)
    : { data: [] };
  const profileById = new Map<
    string,
    { first_name: string | null; last_name: string | null }
  >();
  for (const p of profiles ?? []) {
    profileById.set(p.id as string, {
      first_name: (p.first_name as string | null) ?? null,
      last_name: (p.last_name as string | null) ?? null,
    });
  }

  // parental_consents
  const { data: consents } = userIds.length
    ? await sb
        .from('parental_consents')
        .select('athlete_user_id, signed_at, revoked_at')
        .in('athlete_user_id', userIds)
        .is('revoked_at', null)
        .order('signed_at', { ascending: false })
    : { data: [] };
  const consentByUser = new Map<string, string>();
  for (const c of consents ?? []) {
    const uid = c.athlete_user_id as string;
    if (!consentByUser.has(uid)) {
      consentByUser.set(uid, c.signed_at as string);
    }
  }

  // deals (HS bracket, any status)
  const { data: deals } = userIds.length
    ? await sb
        .from('deals')
        .select('id, athlete_user_id, status, updated_at, created_at')
        .in('athlete_user_id', userIds)
        .eq('target_bracket', 'high_school')
    : { data: [] };

  const signedDealByUser = new Map<string, string>();
  const paidDealByUser = new Map<string, string>();
  const dealIds: string[] = [];
  for (const d of deals ?? []) {
    const uid = d.athlete_user_id as string;
    const status = d.status as string;
    dealIds.push(d.id as string);
    if (
      status === 'accepted' ||
      status === 'in_progress' ||
      status === 'completed' ||
      status === 'paid'
    ) {
      const ts =
        (d.updated_at as string | null) ?? (d.created_at as string | null);
      if (ts && !signedDealByUser.has(uid)) signedDealByUser.set(uid, ts);
    }
    if (status === 'completed' || status === 'paid') {
      const ts =
        (d.updated_at as string | null) ?? (d.created_at as string | null);
      if (ts && !paidDealByUser.has(uid)) paidDealByUser.set(uid, ts);
    }
  }

  // deal_share_events
  const { data: shares } = dealIds.length
    ? await sb
        .from('deal_share_events')
        .select('deal_id, created_at')
        .in('deal_id', dealIds)
        .order('created_at', { ascending: false })
    : { data: [] };
  const shareByDeal = new Map<string, string>();
  for (const s of shares ?? []) {
    const did = s.deal_id as string;
    if (!shareByDeal.has(did)) shareByDeal.set(did, s.created_at as string);
  }
  // fold share-observed state back onto user
  const shareByUser = new Map<string, string>();
  for (const d of deals ?? []) {
    const ts = shareByDeal.get(d.id as string);
    if (ts) {
      const uid = d.athlete_user_id as string;
      const existing = shareByUser.get(uid);
      if (!existing || existing < ts) shareByUser.set(uid, ts);
    }
  }

  const now = Date.now();
  const out: ConciergeCohortRow[] = [];
  for (const row of waitlistRows) {
    const emailKey = row.email.toLowerCase();
    const userId = userByEmail.get(emailKey) ?? null;
    const profile = userId ? profileById.get(userId) : null;
    const parentName = profile
      ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`
          .trim() || null
      : null;

    let position: ConciergeFunnelPosition = 'not_signed_up';
    let latest: string | null = null;
    if (userId) {
      position = 'signed_up';
      if (consentByUser.has(userId)) position = 'consent_signed';
      if (signedDealByUser.has(userId)) position = 'deal_signed';
      if (paidDealByUser.has(userId)) position = 'deal_paid';
      if (shareByUser.has(userId)) position = 'share_observed';
      latest =
        shareByUser.get(userId) ??
        paidDealByUser.get(userId) ??
        signedDealByUser.get(userId) ??
        consentByUser.get(userId) ??
        null;
    }

    const invitedAt = row.created_at as string;
    const daysSinceInvite = Math.floor(
      (now - new Date(invitedAt).getTime()) / (24 * 60 * 60 * 1000)
    );

    out.push({
      waitlistId: row.id as string,
      email: row.email as string,
      role: row.role as string,
      stateCode: row.state_code as string,
      schoolName: (row.school_name as string | null) ?? null,
      invitedAt,
      daysSinceInvite,
      funnelPosition: position,
      latestActivityAt: latest,
      parentUserId: userId,
      parentName,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Bulk operation history read
// ---------------------------------------------------------------------------

export interface BulkOperationRecord {
  id: string;
  actor_user_id: string;
  operation_type: BulkOperationType;
  target_ids: string[];
  item_count: number;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'partial_failure' | 'failed';
  summary: BulkOperationSummary;
  reason: string;
  created_at: string;
}

export async function listBulkOperations(
  limit: number = 50,
  offset: number = 0
): Promise<BulkOperationRecord[]> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('admin_bulk_operations')
    .select(
      'id, actor_user_id, operation_type, target_ids, item_count, started_at, completed_at, status, summary, reason, created_at'
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error || !data) return [];
  return data as unknown as BulkOperationRecord[];
}

export async function countBulkOperationsByStatus(): Promise<{
  running: number;
  partial_failure: number;
}> {
  const sb = getServiceRoleClient();
  const [running, partial] = await Promise.all([
    sb
      .from('admin_bulk_operations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'running'),
    sb
      .from('admin_bulk_operations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'partial_failure'),
  ]);
  return {
    running: running.count ?? 0,
    partial_failure: partial.count ?? 0,
  };
}
