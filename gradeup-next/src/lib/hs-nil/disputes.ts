/**
 * HS-NIL Dispute Service (Phase 7)
 * ----------------------------------------------------------------------------
 * Service-role layer for the dispute resolution loop. All writes flow through
 * this module — the deal_disputes RLS lets only service-role inserts/updates,
 * so API routes call these helpers (never a user-authenticated client).
 *
 * Five operations:
 *   1. raiseDispute           — either party (athlete, parent, brand) opens a
 *                               dispute. Transitions deals.status -> 'disputed'.
 *   2. getDispute             — fetch one dispute with deal + party context.
 *   3. resolveDispute         — admin resolves with outcome + summary + action.
 *                               Transitions deal status according to outcome.
 *   4. listOpenDisputes       — admin queue (open + under_review), sorted by
 *                               priority desc then created_at asc.
 *   5. listDisputesForDeal    — full history for a single deal (admin detail).
 *
 * Audit log semantics: raiseDispute writes action='dispute_raised'.
 * resolveDispute writes one of 'dispute_resolved_in_favor_of_athlete',
 * 'dispute_resolved_in_favor_of_brand', 'dispute_split'. The 'withdrawn'
 * outcome writes 'dispute_resolved_in_favor_of_athlete' because in practice
 * withdrawal pairs with restoring the status quo — the rationale lives in
 * resolution_summary and the dispute status column.
 *
 * target_kind on admin_audit_log is 'deal' with target_id = deal id, and
 * metadata.disputeId carries the dispute row id so an auditor can re-hydrate.
 */

import {
  createClient as createServiceClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import {
  sendDisputeRaisedToCounterparty,
  sendDisputeRaisedToAdmin,
  sendDisputeResolvedToAthlete,
  sendDisputeResolvedToBrand,
  type DisputeReasonCategory,
  type DisputeOutcome,
} from '@/lib/services/hs-nil/dispute-emails';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type DisputeRaisedByRole = 'athlete' | 'parent' | 'brand';
export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'resolved_athlete'
  | 'resolved_brand'
  | 'resolved_split'
  | 'withdrawn';
export type DisputePriority = 'low' | 'standard' | 'high' | 'urgent';

export type DisputeResolutionOutcome = 'athlete' | 'brand' | 'split' | 'withdraw';

export type { DisputeReasonCategory, DisputeOutcome };

export interface DisputeRow {
  id: string;
  deal_id: string;
  raised_by_user_id: string;
  raised_by_role: DisputeRaisedByRole;
  reason_category: DisputeReasonCategory;
  description: string;
  evidence_urls: string[];
  status: DisputeStatus;
  priority: DisputePriority;
  deal_status_before_dispute: string | null;
  resolved_by_user_id: string | null;
  resolved_at: string | null;
  resolution_summary: string | null;
  resolution_action: Record<string, unknown> | null;
  created_at: string;
}

export interface DisputeOk {
  ok: true;
  disputeId: string;
  auditLogId?: string;
  metadata?: Record<string, unknown>;
}

export interface DisputeErr {
  ok: false;
  error: string;
  code:
    | 'not_found'
    | 'forbidden'
    | 'invalid_state'
    | 'db_error'
    | 'conflict'
    | 'internal';
}

export type DisputeResult = DisputeOk | DisputeErr;

// ----------------------------------------------------------------------------
// Service-role client
// ----------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil disputes] Supabase service role not configured ' +
        '(NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ----------------------------------------------------------------------------
// Role resolver — given a user id and a deal id, work out whether this user
// is the athlete-on-deal, a parent linked to that athlete, the brand on the
// deal, or unrelated. Returns null if unrelated.
// ----------------------------------------------------------------------------

interface DealParties {
  dealId: string;
  dealTitle: string;
  dealStatus: string;
  targetBracket: string | null;
  athleteUserId: string | null;
  athleteFirstName: string | null;
  athleteLastName: string | null;
  athleteEmail: string | null;
  brandId: string | null;
  brandProfileId: string | null;
  brandCompanyName: string | null;
  brandContactName: string | null;
  brandEmail: string | null;
}

async function loadDealParties(
  sb: SupabaseClient,
  dealId: string
): Promise<DealParties | null> {
  const { data, error } = await sb
    .from('deals')
    .select(
      `id, title, status, target_bracket,
       athlete:athletes(profile_id, first_name, last_name, email),
       brand:brands(id, profile_id, company_name, contact_name, email)`
    )
    .eq('id', dealId)
    .maybeSingle();

  if (error || !data) return null;

  // Supabase returns embedded relations as an array when typed generically.
  // Both athletes and brands are one-to-one relations on deals, so we take
  // the first row (or null).
  const athleteRaw = data.athlete as unknown;
  const brandRaw = data.brand as unknown;
  const athlete =
    Array.isArray(athleteRaw)
      ? ((athleteRaw[0] ?? null) as {
          profile_id: string | null;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
        } | null)
      : (athleteRaw as {
          profile_id: string | null;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
        } | null);
  const brand =
    Array.isArray(brandRaw)
      ? ((brandRaw[0] ?? null) as {
          id: string | null;
          profile_id: string | null;
          company_name: string | null;
          contact_name: string | null;
          email: string | null;
        } | null)
      : (brandRaw as {
          id: string | null;
          profile_id: string | null;
          company_name: string | null;
          contact_name: string | null;
          email: string | null;
        } | null);

  return {
    dealId: data.id as string,
    dealTitle: (data.title as string) ?? 'your deal',
    dealStatus: (data.status as string) ?? 'unknown',
    targetBracket: (data.target_bracket as string | null) ?? null,
    athleteUserId: athlete?.profile_id ?? null,
    athleteFirstName: athlete?.first_name ?? null,
    athleteLastName: athlete?.last_name ?? null,
    athleteEmail: athlete?.email ?? null,
    brandId: brand?.id ?? null,
    brandProfileId: brand?.profile_id ?? null,
    brandCompanyName: brand?.company_name ?? null,
    brandContactName: brand?.contact_name ?? null,
    brandEmail: brand?.email ?? null,
  };
}

/**
 * Resolve the raising role for a user against a deal. Returns:
 *   - 'athlete' — user.id === athletes.profile_id
 *   - 'parent'  — user has a verified hs_parent_athlete_links row to the
 *                 athlete on this deal
 *   - 'brand'   — user.id === brands.profile_id
 *   - null      — user is not a party and cannot raise a dispute here
 */
async function resolveRaisingRole(
  sb: SupabaseClient,
  userId: string,
  parties: DealParties
): Promise<DisputeRaisedByRole | null> {
  if (parties.athleteUserId && parties.athleteUserId === userId) {
    return 'athlete';
  }
  if (parties.brandProfileId && parties.brandProfileId === userId) {
    return 'brand';
  }
  if (parties.athleteUserId) {
    const { data, error } = await sb
      .from('hs_parent_athlete_links')
      .select('id, verified_at, parent_profile_id')
      .eq('athlete_user_id', parties.athleteUserId)
      .not('verified_at', 'is', null);

    if (!error && data && data.length > 0) {
      for (const row of data) {
        const { data: pp } = await sb
          .from('hs_parent_profiles')
          .select('user_id')
          .eq('id', row.parent_profile_id)
          .maybeSingle();
        if (pp && (pp.user_id as string) === userId) {
          return 'parent';
        }
      }
    }
  }
  return null;
}

// ----------------------------------------------------------------------------
// Auto-priority heuristic
// ----------------------------------------------------------------------------

async function autoPriority(
  sb: SupabaseClient,
  args: {
    raisedByRole: DisputeRaisedByRole;
    reasonCategory: DisputeReasonCategory;
    dealId: string;
  }
): Promise<DisputePriority> {
  const { raisedByRole, reasonCategory, dealId } = args;

  // Brand raising misconduct → high (safety / reputational lever).
  if (raisedByRole === 'brand' && reasonCategory === 'misconduct') {
    return 'high';
  }

  // Athlete raising timing on a deal older than 14 days → high (brand is
  // presumably sitting on a deliverable or review).
  if (raisedByRole === 'athlete' && reasonCategory === 'timing') {
    try {
      const { data } = await sb
        .from('deals')
        .select('created_at')
        .eq('id', dealId)
        .maybeSingle();
      if (data?.created_at) {
        const ageDays =
          (Date.now() - new Date(data.created_at as string).getTime()) /
          (1000 * 60 * 60 * 24);
        if (ageDays > 14) return 'high';
      }
    } catch {
      // non-fatal — fall through to default
    }
  }

  return 'standard';
}

// ----------------------------------------------------------------------------
// Audit log writer (local copy — dispute kinds)
// ----------------------------------------------------------------------------

type DisputeAuditAction =
  | 'dispute_raised'
  | 'dispute_resolved_in_favor_of_athlete'
  | 'dispute_resolved_in_favor_of_brand'
  | 'dispute_split';

async function writeDisputeAudit(
  sb: SupabaseClient,
  input: {
    actorUserId: string;
    action: DisputeAuditAction;
    dealId: string;
    disputeId: string;
    reason: string;
    metadata?: Record<string, unknown>;
  }
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await sb
    .from('admin_audit_log')
    .insert({
      actor_user_id: input.actorUserId,
      action: input.action,
      target_kind: 'deal',
      target_id: input.dealId,
      reason: input.reason,
      metadata: {
        disputeId: input.disputeId,
        ...(input.metadata ?? {}),
      },
    })
    .select('id')
    .single();

  if (error || !data) {
    // eslint-disable-next-line no-console
    console.error('[hs-nil disputes] audit write failed', {
      action: input.action,
      dealId: input.dealId,
      disputeId: input.disputeId,
      error: error?.message,
    });
    return { error: error?.message ?? 'audit insert failed' };
  }
  return { id: data.id as string };
}

// ----------------------------------------------------------------------------
// 1. raiseDispute
// ----------------------------------------------------------------------------

export interface RaiseDisputeInput {
  dealId: string;
  userId: string;
  reasonCategory: DisputeReasonCategory;
  description: string;
  evidenceUrls?: string[];
}

export async function raiseDispute(
  input: RaiseDisputeInput
): Promise<DisputeResult> {
  const { dealId, userId, reasonCategory, description, evidenceUrls } = input;

  if (!description || description.trim().length < 30) {
    return {
      ok: false,
      error: 'Description must be at least 30 characters.',
      code: 'invalid_state',
    };
  }

  const sb = getServiceRoleClient();

  const parties = await loadDealParties(sb, dealId);
  if (!parties) {
    return { ok: false, error: 'Deal not found.', code: 'not_found' };
  }

  if (parties.dealStatus === 'disputed') {
    return {
      ok: false,
      error: 'This deal already has an open dispute.',
      code: 'conflict',
    };
  }

  const role = await resolveRaisingRole(sb, userId, parties);
  if (!role) {
    return {
      ok: false,
      error: 'You are not a party to this deal.',
      code: 'forbidden',
    };
  }

  const priority = await autoPriority(sb, {
    raisedByRole: role,
    reasonCategory,
    dealId,
  });

  const cleanEvidence = (evidenceUrls ?? [])
    .map((u) => u.trim())
    .filter((u) => u.length > 0 && u.length < 2048)
    .slice(0, 10);

  const { data: inserted, error: insertErr } = await sb
    .from('deal_disputes')
    .insert({
      deal_id: dealId,
      raised_by_user_id: userId,
      raised_by_role: role,
      reason_category: reasonCategory,
      description: description.trim(),
      evidence_urls: cleanEvidence,
      status: 'open',
      priority,
      deal_status_before_dispute: parties.dealStatus,
    })
    .select('id')
    .single();

  if (insertErr || !inserted) {
    return {
      ok: false,
      error: insertErr?.message ?? 'Failed to create dispute.',
      code: 'db_error',
    };
  }

  const disputeId = inserted.id as string;

  // Transition the deal to 'disputed' so the rest of the app pauses on it.
  const { error: statusErr } = await sb
    .from('deals')
    .update({ status: 'disputed' })
    .eq('id', dealId);

  if (statusErr) {
    // Surface to caller — the dispute row is written so an admin can still
    // mediate; ops should hand-reconcile the deal status.
    // eslint-disable-next-line no-console
    console.error('[hs-nil disputes] deal status transition failed', {
      dealId,
      disputeId,
      error: statusErr.message,
    });
  }

  // Audit log (service-role insert — bypasses RLS).
  const audit = await writeDisputeAudit(sb, {
    actorUserId: userId,
    action: 'dispute_raised',
    dealId,
    disputeId,
    reason: `Dispute raised: ${reasonCategory} — ${description.trim().slice(0, 160)}`,
    metadata: {
      raisedByRole: role,
      reasonCategory,
      priority,
      evidenceCount: cleanEvidence.length,
      dealStatusBeforeDispute: parties.dealStatus,
    },
  });

  // Best-effort emails.
  const athleteFullName =
    [parties.athleteFirstName, parties.athleteLastName]
      .filter((s): s is string => Boolean(s && s.trim()))
      .join(' ')
      .trim() || 'the athlete';
  const raisedByLabel =
    role === 'athlete'
      ? `the athlete (${athleteFullName})`
      : role === 'parent'
        ? `a parent / guardian of ${athleteFullName}`
        : `the brand (${parties.brandCompanyName ?? 'the brand'})`;

  try {
    // Counterparty = the opposite side. Parent-raised disputes alert the brand.
    if (role === 'brand') {
      if (parties.athleteEmail) {
        await sendDisputeRaisedToCounterparty({
          recipientEmail: parties.athleteEmail,
          recipientName: athleteFullName,
          dealTitle: parties.dealTitle,
          dealId,
          reasonCategory,
          raisedByLabel,
          counterpartyRole: 'athlete',
        });
      }
    } else {
      if (parties.brandEmail) {
        await sendDisputeRaisedToCounterparty({
          recipientEmail: parties.brandEmail,
          recipientName: parties.brandContactName,
          dealTitle: parties.dealTitle,
          dealId,
          reasonCategory,
          raisedByLabel,
          counterpartyRole: 'brand',
        });
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil disputes] counterparty email failed', err);
  }

  try {
    await sendDisputeRaisedToAdmin({
      disputeId,
      dealId,
      dealTitle: parties.dealTitle,
      reasonCategory,
      priority,
      raisedByRole: role,
      descriptionExcerpt: description.trim(),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil disputes] admin email failed', err);
  }

  return {
    ok: true,
    disputeId,
    auditLogId: 'error' in audit ? undefined : audit.id,
    metadata: {
      priority,
      raisedByRole: role,
      dealStatusBeforeDispute: parties.dealStatus,
    },
  };
}

// ----------------------------------------------------------------------------
// 2. getDispute
// ----------------------------------------------------------------------------

export async function getDispute(
  disputeId: string
): Promise<{ dispute: DisputeRow | null; parties: DealParties | null }> {
  const sb = getServiceRoleClient();

  const { data, error } = await sb
    .from('deal_disputes')
    .select('*')
    .eq('id', disputeId)
    .maybeSingle();

  if (error || !data) {
    return { dispute: null, parties: null };
  }

  const row = data as DisputeRow;
  const parties = await loadDealParties(sb, row.deal_id);
  return { dispute: row, parties };
}

// ----------------------------------------------------------------------------
// 3. resolveDispute
// ----------------------------------------------------------------------------

export interface ResolveDisputeInput {
  disputeId: string;
  adminUserId: string;
  outcome: DisputeResolutionOutcome;
  summary: string;
  action: Record<string, unknown>;
}

export async function resolveDispute(
  input: ResolveDisputeInput
): Promise<DisputeResult> {
  const { disputeId, adminUserId, outcome, summary, action } = input;

  if (!summary || summary.trim().length < 30) {
    return {
      ok: false,
      error: 'Summary must be at least 30 characters.',
      code: 'invalid_state',
    };
  }

  const sb = getServiceRoleClient();

  const { data: current, error: fetchErr } = await sb
    .from('deal_disputes')
    .select('*')
    .eq('id', disputeId)
    .maybeSingle();

  if (fetchErr) {
    return { ok: false, error: fetchErr.message, code: 'db_error' };
  }
  if (!current) {
    return { ok: false, error: 'Dispute not found.', code: 'not_found' };
  }

  const row = current as DisputeRow;
  if (row.status !== 'open' && row.status !== 'under_review') {
    return {
      ok: false,
      error: `Dispute is already ${row.status}.`,
      code: 'invalid_state',
    };
  }

  const now = new Date().toISOString();

  // Compute the new dispute.status + new deals.status + audit action.
  let newDisputeStatus: DisputeStatus;
  let newDealStatus: string | null; // null means leave as-is
  let auditAction: DisputeAuditAction;

  switch (outcome) {
    case 'athlete':
      newDisputeStatus = 'resolved_athlete';
      // Kick back to in_review so the brand re-reviews the deliverable.
      newDealStatus = 'in_review';
      auditAction = 'dispute_resolved_in_favor_of_athlete';
      break;
    case 'brand':
      newDisputeStatus = 'resolved_brand';
      // Brand gets relief — cancel the deal. 'cancelled' exists in baseline enum.
      newDealStatus = 'cancelled';
      auditAction = 'dispute_resolved_in_favor_of_brand';
      break;
    case 'split':
      newDisputeStatus = 'resolved_split';
      // Leave deal status as-is; admin will manually release partial payout
      // or refund via OPS-WRITER endpoints.
      newDealStatus = null;
      auditAction = 'dispute_split';
      break;
    case 'withdraw':
      newDisputeStatus = 'withdrawn';
      // Restore the status the deal was in before the dispute.
      newDealStatus = row.deal_status_before_dispute || null;
      // Keep under the 'in favor of athlete' bucket as a catch-all —
      // the resolution_summary captures the real meaning.
      auditAction = 'dispute_resolved_in_favor_of_athlete';
      break;
    default:
      return {
        ok: false,
        error: `Unknown outcome: ${String(outcome)}`,
        code: 'invalid_state',
      };
  }

  const { error: updateErr } = await sb
    .from('deal_disputes')
    .update({
      status: newDisputeStatus,
      resolved_by_user_id: adminUserId,
      resolved_at: now,
      resolution_summary: summary.trim(),
      resolution_action: action ?? {},
    })
    .eq('id', disputeId);

  if (updateErr) {
    return { ok: false, error: updateErr.message, code: 'db_error' };
  }

  if (newDealStatus) {
    // Only transition if the deal is still 'disputed' (defensive — the admin
    // may have already acted out-of-band).
    const { error: dealErr } = await sb
      .from('deals')
      .update({ status: newDealStatus })
      .eq('id', row.deal_id)
      .eq('status', 'disputed');
    if (dealErr) {
      // eslint-disable-next-line no-console
      console.error('[hs-nil disputes] deal restore failed', {
        dealId: row.deal_id,
        disputeId,
        targetStatus: newDealStatus,
        error: dealErr.message,
      });
    }
  }

  const audit = await writeDisputeAudit(sb, {
    actorUserId: adminUserId,
    action: auditAction,
    dealId: row.deal_id,
    disputeId,
    reason: `Dispute resolved: ${outcome} — ${summary.trim().slice(0, 160)}`,
    metadata: {
      outcome,
      newDisputeStatus,
      newDealStatus,
      priorDealStatus: row.deal_status_before_dispute,
      resolutionAction: action ?? {},
    },
  });

  if ('error' in audit) {
    return {
      ok: false,
      error: `Dispute updated but audit log write failed: ${audit.error}`,
      code: 'db_error',
    };
  }

  // Best-effort resolution emails.
  const parties = await loadDealParties(sb, row.deal_id);
  if (parties) {
    const athleteFullName =
      [parties.athleteFirstName, parties.athleteLastName]
        .filter((s): s is string => Boolean(s && s.trim()))
        .join(' ')
        .trim() || null;

    if (parties.athleteEmail) {
      try {
        await sendDisputeResolvedToAthlete({
          athleteEmail: parties.athleteEmail,
          athleteName: athleteFullName,
          dealTitle: parties.dealTitle,
          dealId: row.deal_id,
          outcome: newDisputeStatus as DisputeOutcome,
          summary: summary.trim(),
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[hs-nil disputes] athlete resolution email failed', err);
      }
    }

    if (parties.brandEmail) {
      try {
        await sendDisputeResolvedToBrand({
          brandEmail: parties.brandEmail,
          brandContactName: parties.brandContactName,
          dealTitle: parties.dealTitle,
          dealId: row.deal_id,
          outcome: newDisputeStatus as DisputeOutcome,
          summary: summary.trim(),
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[hs-nil disputes] brand resolution email failed', err);
      }
    }
  }

  return {
    ok: true,
    disputeId,
    auditLogId: audit.id,
    metadata: { outcome, newDisputeStatus, newDealStatus },
  };
}

// ----------------------------------------------------------------------------
// 4. listOpenDisputes
// ----------------------------------------------------------------------------

const PRIORITY_RANK: Record<DisputePriority, number> = {
  urgent: 0,
  high: 1,
  standard: 2,
  low: 3,
};

export interface OpenDisputeSummary {
  id: string;
  deal_id: string;
  deal_title: string;
  athlete_name: string | null;
  brand_name: string | null;
  raised_by_role: DisputeRaisedByRole;
  reason_category: DisputeReasonCategory;
  status: DisputeStatus;
  priority: DisputePriority;
  created_at: string;
}

export async function listOpenDisputes(): Promise<OpenDisputeSummary[]> {
  const sb = getServiceRoleClient();

  const { data, error } = await sb
    .from('deal_disputes')
    .select(
      `id, deal_id, raised_by_role, reason_category, status, priority, created_at,
       deal:deals(
         title,
         athlete:athletes(first_name, last_name),
         brand:brands(company_name)
       )`
    )
    .in('status', ['open', 'under_review'])
    .order('created_at', { ascending: true })
    .limit(200);

  if (error || !data) return [];

  const rows = data.map((r) => {
    const dealRaw = r.deal as unknown;
    const dealRow =
      Array.isArray(dealRaw)
        ? ((dealRaw[0] ?? null) as unknown)
        : (dealRaw as unknown);
    const deal = (dealRow ?? null) as {
      title: string | null;
      athlete:
        | { first_name: string | null; last_name: string | null }
        | Array<{ first_name: string | null; last_name: string | null }>
        | null;
      brand:
        | { company_name: string | null }
        | Array<{ company_name: string | null }>
        | null;
    } | null;
    const athleteRaw = deal?.athlete ?? null;
    const athleteRow = Array.isArray(athleteRaw)
      ? athleteRaw[0] ?? null
      : athleteRaw;
    const brandRaw = deal?.brand ?? null;
    const brandRow = Array.isArray(brandRaw) ? brandRaw[0] ?? null : brandRaw;
    const athleteName =
      athleteRow
        ? [athleteRow.first_name, athleteRow.last_name]
            .filter((s): s is string => Boolean(s && s.trim()))
            .join(' ')
            .trim() || null
        : null;
    return {
      id: r.id as string,
      deal_id: r.deal_id as string,
      deal_title: (deal?.title as string | null) ?? 'Untitled deal',
      athlete_name: athleteName,
      brand_name: (brandRow?.company_name as string | null) ?? null,
      raised_by_role: r.raised_by_role as DisputeRaisedByRole,
      reason_category: r.reason_category as DisputeReasonCategory,
      status: r.status as DisputeStatus,
      priority: r.priority as DisputePriority,
      created_at: r.created_at as string,
    };
  });

  rows.sort((a, b) => {
    const pa = PRIORITY_RANK[a.priority];
    const pb = PRIORITY_RANK[b.priority];
    if (pa !== pb) return pa - pb;
    return a.created_at < b.created_at ? -1 : 1;
  });

  return rows;
}

// ----------------------------------------------------------------------------
// 5. listDisputesForDeal
// ----------------------------------------------------------------------------

export async function listDisputesForDeal(
  dealId: string
): Promise<DisputeRow[]> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('deal_disputes')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as DisputeRow[];
}

// ----------------------------------------------------------------------------
// Public helper: open dispute count (for admin landing card).
// ----------------------------------------------------------------------------

export async function countOpenDisputes(): Promise<number> {
  const sb = getServiceRoleClient();
  const { count, error } = await sb
    .from('deal_disputes')
    .select('id', { count: 'exact', head: true })
    .in('status', ['open', 'under_review']);
  if (error) return 0;
  return count ?? 0;
}
