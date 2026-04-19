/**
 * HS-NIL Brand Approval Service
 * ----------------------------------------------------------------------------
 * Records brand-side review decisions for an HS deal and transitions the
 * deal state accordingly.
 *
 * Two write entrypoints:
 *
 *   recordApproval({ dealId, reviewerUserId, submissionId?, notes? })
 *     Brand accepts the submission:
 *       1. INSERT deal_approvals row (decision='approved').
 *       2. UPDATE any submitted deal_deliverable_submissions → 'accepted'.
 *       3. UPDATE deals.status → 'approved'.
 *     Returns the new approval id. Payout release is NOT called here —
 *     that's the caller's job (the /review route wraps releasePayout() in
 *     its own try/catch so an infra hiccup doesn't penalize the brand).
 *
 *   requestRevision({ dealId, reviewerUserId, submissionId?, notes })
 *     Brand sends it back:
 *       1. INSERT deal_approvals row (decision='revision_requested').
 *       2. UPDATE the most recent submitted submission (or the specific
 *          submissionId if provided) → 'rejected' + review_notes=notes.
 *       3. UPDATE deals.status → 'in_delivery' so the athlete can resubmit.
 *
 * One read entrypoint:
 *
 *   listPendingReviewsForBrand(supabase, brandId, limit?)
 *     Returns deals in 'in_review' for the dashboard section. Uses the
 *     caller's Supabase client (RLS-bound) so it only surfaces deals the
 *     brand is actually a party to.
 *
 * Writes use the service-role client because we need to bypass the
 * append-only RLS on deal_approvals for the state-coupled updates (the
 * RLS lets a brand INSERT, but UPDATE of submissions/deals is server
 * business — the API route is the gatekeeper).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sendPushToUser } from '@/lib/push/sender';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type ApprovalDecision = 'approved' | 'revision_requested';

export interface ApprovalRow {
  id: string;
  deal_id: string;
  submission_id: string | null;
  reviewer_user_id: string;
  decision: ApprovalDecision;
  notes: string | null;
  created_at: string;
}

export interface RecordApprovalInput {
  dealId: string;
  reviewerUserId: string;
  /** Specific submission this approval responds to (optional). */
  submissionId?: string | null;
  notes?: string | null;
}

export interface RecordApprovalResult {
  ok: boolean;
  approvalId?: string;
  newDealStatus?: string;
  reason?: string;
}

export interface RequestRevisionInput {
  dealId: string;
  reviewerUserId: string;
  submissionId?: string | null;
  notes: string;
}

// ----------------------------------------------------------------------------
// Service-role client
// ----------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil approvals] Supabase service role not configured ' +
        '(NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ----------------------------------------------------------------------------
// recordApproval
// ----------------------------------------------------------------------------

/**
 * Brand approves the submission. Writes the audit row, flips any
 * 'submitted' deliverable-submissions to 'accepted', and transitions
 * deals.status to 'approved'. Caller is responsible for invoking
 * releasePayout() separately — this keeps the Stripe call outside any
 * DB-failure rollback window.
 *
 * Idempotency: callers should already gate on deals.status='in_review'
 * at the API layer (409 otherwise). We do NOT re-check here because the
 * service is also used by admin/mediation flows that may accept deals
 * outside the normal status path.
 */
export async function recordApproval(
  input: RecordApprovalInput,
): Promise<RecordApprovalResult> {
  const sb = getServiceRoleClient();

  // 1. Insert the audit row.
  const { data: approval, error: insertErr } = await sb
    .from('deal_approvals')
    .insert({
      deal_id: input.dealId,
      submission_id: input.submissionId ?? null,
      reviewer_user_id: input.reviewerUserId,
      decision: 'approved' as ApprovalDecision,
      notes: input.notes?.trim() || null,
    })
    .select('id')
    .single();

  if (insertErr || !approval) {
    return {
      ok: false,
      reason: insertErr?.message ?? 'insert failed',
    };
  }

  // 2. Flip any 'submitted' submissions to 'accepted'. Best-effort —
  //    we tolerate the submissions table not existing yet (parallel-agent
  //    race during Phase 7) and log-and-continue.
  try {
    await sb
      .from('deal_deliverable_submissions')
      .update({
        status: 'accepted',
        reviewed_at: new Date().toISOString(),
      })
      .eq('deal_id', input.dealId)
      .eq('status', 'submitted');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil approvals] submission update skipped', {
      dealId: input.dealId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 3. Flip the deal to 'approved'. The /review route will later flip it
  //    again to 'paid' after releasePayout() succeeds.
  const { error: dealErr } = await sb
    .from('deals')
    .update({
      status: 'approved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.dealId);

  if (dealErr) {
    return {
      ok: false,
      approvalId: approval.id as string,
      reason: `deal status update failed: ${dealErr.message}`,
    };
  }

  // 4. Fan out approval pushes to athlete + verified parents. Preference
  //    gating is handled inside sendPushToUser. Fail-soft — a push outage
  //    must never regress an already-committed approval.
  try {
    await fanOutApprovedPushes(sb, input.dealId);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil approvals] approved push fan-out failed', {
      dealId: input.dealId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return {
    ok: true,
    approvalId: approval.id as string,
    newDealStatus: 'approved',
  };
}

// ----------------------------------------------------------------------------
// Push fan-out helpers (internal)
// ----------------------------------------------------------------------------

interface DealPartiesForPush {
  dealId: string;
  brandName: string;
  athleteUserId: string | null;
  athleteFirstName: string;
  athleteFullName: string;
  parentUserIds: string[];
}

/**
 * Load just enough deal context to address push notifications to the
 * athlete and any verified parents. Uses the service-role client to
 * join across tables that RLS would otherwise hide.
 */
async function loadPushPartiesForDeal(
  sb: SupabaseClient,
  dealId: string,
): Promise<DealPartiesForPush | null> {
  const { data: dealRow } = await sb
    .from('deals')
    .select(
      `id,
       brand:brands(company_name),
       athlete:athletes(first_name, last_name, profile_id)`,
    )
    .eq('id', dealId)
    .maybeSingle();

  if (!dealRow) return null;

  const deal = dealRow as unknown as {
    id: string;
    brand: { company_name: string | null } | null;
    athlete: {
      first_name: string | null;
      last_name: string | null;
      profile_id: string | null;
    } | null;
  };

  const athleteFirstName = (deal.athlete?.first_name ?? 'Your athlete').trim();
  const athleteFullName =
    [deal.athlete?.first_name, deal.athlete?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim() || athleteFirstName;

  const parentUserIds: string[] = [];
  if (deal.athlete?.profile_id) {
    try {
      const { data: links } = await sb
        .from('hs_parent_athlete_links')
        .select(
          `parent:hs_parent_profiles(user_id)`,
        )
        .eq('athlete_user_id', deal.athlete.profile_id)
        .not('verified_at', 'is', null);

      const rows =
        (links as unknown as Array<{ parent: { user_id: string } | null }>) ?? [];
      for (const l of rows) {
        if (l.parent?.user_id) parentUserIds.push(l.parent.user_id);
      }
    } catch {
      // skip — push fan-out stays best-effort
    }
  }

  return {
    dealId,
    brandName: deal.brand?.company_name ?? 'the brand',
    athleteUserId: deal.athlete?.profile_id ?? null,
    athleteFirstName,
    athleteFullName,
    parentUserIds,
  };
}

async function fanOutApprovedPushes(
  sb: SupabaseClient,
  dealId: string,
): Promise<void> {
  const parties = await loadPushPartiesForDeal(sb, dealId);
  if (!parties) return;

  const url = `/hs/deals/${parties.dealId}/celebrate`;
  const tasks: Array<Promise<unknown>> = [];

  if (parties.athleteUserId) {
    tasks.push(
      sendPushToUser({
        userId: parties.athleteUserId,
        notificationType: 'deal_review_needed',
        title: `Your deal with ${parties.brandName} was approved`,
        body: `${parties.brandName} approved your deliverable. Payout coming next.`,
        url,
      }),
    );
  }

  for (const parentUserId of parties.parentUserIds) {
    tasks.push(
      sendPushToUser({
        userId: parentUserId,
        notificationType: 'deal_review_needed',
        title: `Your deal with ${parties.brandName} was approved`,
        body: `${parties.athleteFullName}'s deal with ${parties.brandName} was approved.`,
        url,
      }),
    );
  }

  await Promise.allSettled(tasks);
}

async function fanOutRevisionPushes(
  sb: SupabaseClient,
  dealId: string,
  notes: string,
): Promise<void> {
  const parties = await loadPushPartiesForDeal(sb, dealId);
  if (!parties || !parties.athleteUserId) return;

  const url = `/hs/deals/${parties.dealId}/deliver`;
  const trimmed = notes.trim().slice(0, 80);

  await sendPushToUser({
    userId: parties.athleteUserId,
    notificationType: 'deal_review_needed',
    title: `${parties.brandName} asked for a revision`,
    body: trimmed,
    url,
  });
}

// ----------------------------------------------------------------------------
// requestRevision
// ----------------------------------------------------------------------------

/**
 * Brand kicks the submission back. Writes the audit row, marks the
 * most-recent submitted submission as rejected with the brand's notes,
 * and transitions deals.status back to 'in_delivery' so the athlete
 * can resubmit. Notes are REQUIRED — the API-layer zod schema enforces
 * a 20-char minimum, but we re-check here so other callers can't bypass.
 */
export async function requestRevision(
  input: RequestRevisionInput,
): Promise<RecordApprovalResult> {
  const notes = input.notes.trim();
  if (notes.length < 20) {
    return {
      ok: false,
      reason: 'Revision notes must be at least 20 characters.',
    };
  }

  const sb = getServiceRoleClient();

  // 1. Insert the audit row.
  const { data: approval, error: insertErr } = await sb
    .from('deal_approvals')
    .insert({
      deal_id: input.dealId,
      submission_id: input.submissionId ?? null,
      reviewer_user_id: input.reviewerUserId,
      decision: 'revision_requested' as ApprovalDecision,
      notes,
    })
    .select('id')
    .single();

  if (insertErr || !approval) {
    return { ok: false, reason: insertErr?.message ?? 'insert failed' };
  }

  // 2. Mark the specific or most-recent submitted submission as rejected.
  try {
    if (input.submissionId) {
      await sb
        .from('deal_deliverable_submissions')
        .update({
          status: 'rejected',
          review_notes: notes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', input.submissionId);
    } else {
      const { data: latest } = await sb
        .from('deal_deliverable_submissions')
        .select('id')
        .eq('deal_id', input.dealId)
        .eq('status', 'submitted')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<{ id: string }>();

      if (latest?.id) {
        await sb
          .from('deal_deliverable_submissions')
          .update({
            status: 'rejected',
            review_notes: notes,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', latest.id);
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil approvals] submission rejection skipped', {
      dealId: input.dealId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 3. Transition the deal back to in_delivery.
  const { error: dealErr } = await sb
    .from('deals')
    .update({
      status: 'in_delivery',
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.dealId);

  if (dealErr) {
    return {
      ok: false,
      approvalId: approval.id as string,
      reason: `deal status update failed: ${dealErr.message}`,
    };
  }

  // Best-effort push to the athlete — fail-soft so a push outage never
  // regresses an already-committed revision decision.
  try {
    await fanOutRevisionPushes(sb, input.dealId, notes);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil approvals] revision push failed', {
      dealId: input.dealId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return {
    ok: true,
    approvalId: approval.id as string,
    newDealStatus: 'in_delivery',
  };
}

// ----------------------------------------------------------------------------
// listPendingReviewsForBrand
// ----------------------------------------------------------------------------

export interface PendingReviewRow {
  id: string;
  title: string;
  status: string;
  compensation_amount: number;
  created_at: string;
  athlete_first_name: string | null;
  athlete_last_name: string | null;
  athlete_id: string;
}

interface PendingReviewRawJoin {
  id: string;
  title: string;
  status: string;
  compensation_amount: number;
  created_at: string;
  athlete_id: string;
  athlete: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

/**
 * Deals this brand owns that are currently awaiting brand review.
 * Uses the caller's Supabase client so RLS on `deals` already scopes
 * the results to this brand's rows — we just filter by status.
 */
export async function listPendingReviewsForBrand(
  supabase: SupabaseClient,
  brandId: string,
  limit = 5,
): Promise<PendingReviewRow[]> {
  const { data, error } = await supabase
    .from('deals')
    .select(
      `id, title, status, compensation_amount, created_at, athlete_id,
       athlete:athletes(first_name, last_name)`,
    )
    .eq('brand_id', brandId)
    .eq('status', 'in_review')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil approvals] listPendingReviewsForBrand failed', error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as PendingReviewRawJoin[];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    compensation_amount: r.compensation_amount,
    created_at: r.created_at,
    athlete_id: r.athlete_id,
    athlete_first_name: r.athlete?.first_name ?? null,
    athlete_last_name: r.athlete?.last_name ?? null,
  }));
}
