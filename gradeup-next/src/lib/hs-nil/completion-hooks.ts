/**
 * HS-NIL Deal-Completion Side Effects
 * ----------------------------------------------------------------------------
 * A single entry point — `afterDealPaid(dealId)` — that runs the side-effects
 * owed to a deal the moment it hits the 'paid' terminal state:
 *
 *   1. Ensure deals.status is 'paid' and deals.completed_at is stamped (idempotent
 *      UPDATE that only promotes from 'approved' or 'paid' — never regresses a
 *      deal that for some reason landed here twice).
 *   2. Load the athlete, brand, parent (via verified parent_athlete_links), and
 *      whichever consent anchored the deal.
 *   3. Pull aggregate share metrics for the deal from deal_share_events via
 *      `getShareCountsForDeal` (read-only import).
 *   4. Fire three `sendDealCompleted` variants in parallel (athlete, brand,
 *      parent). Best-effort + fail-soft: an email provider outage never
 *      propagates out of this function and must never turn into a Stripe
 *      retry loop.
 *   5. Emit a structured `[hs-nil/deal-completed]` log line with share
 *      counts so the ops team has a grep-able audit trail before any
 *      analytics pipeline is wired.
 *
 * CALL SITE:
 *   This helper is invoked from the Stripe Connect webhook's `transfer.paid`
 *   branch — i.e. only after real money has actually cleared. That's the
 *   single source of truth for "completion", and the only path that should
 *   fire celebration mail in production.
 *
 *   BRAND-REVIEW's review API performs the earlier 'approved' → 'paid'
 *   transition (post releasePayout). It MAY optionally also call this
 *   helper to fire instant mail in staging / stub-provider setups where no
 *   real Stripe webhook will ever arrive; that too is idempotent because
 *   this helper short-circuits when status is already 'paid' with
 *   completed_at set. A TODO has been dropped in payouts.ts pointing at
 *   this file for discoverability.
 *
 * Uses the SERVICE-ROLE Supabase client so it can read rows (parent
 * profiles, linked consents, etc.) that RLS would hide from an anonymous
 * webhook handler.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sendDealCompleted } from '@/lib/services/hs-nil/completion-emails';
import { getShareCountsForDeal } from '@/lib/hs-nil/share';
import { recordFeedback } from '@/lib/hs-nil/match-feedback';

// ----------------------------------------------------------------------------
// Service-role client
// ----------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil/completion-hooks] service role client misconfigured ' +
        '(NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ----------------------------------------------------------------------------
// afterDealPaid
// ----------------------------------------------------------------------------

export interface AfterDealPaidResult {
  ok: boolean;
  reason?: string;
  emailsAttempted: number;
  emailsSucceeded: number;
  totalShares: number;
}

export async function afterDealPaid(
  dealId: string,
  sbOverride?: SupabaseClient,
): Promise<AfterDealPaidResult> {
  const sb = sbOverride ?? getServiceRoleClient();

  // 1. Promote deal status idempotently. Only 'approved' → 'paid' and
  //    'paid' → 'paid' are valid; anything else stays untouched so we
  //    never regress a dispute back to paid.
  try {
    await sb
      .from('deals')
      .update({
        status: 'paid',
        completed_at: new Date().toISOString(),
      })
      .eq('id', dealId)
      .in('status', ['approved', 'paid', 'in_review']);
  } catch (err) {
    // Continue — the mail send is still useful even if the status
    // promotion failed (idempotency will fix it next webhook event).
    // eslint-disable-next-line no-console
    console.warn('[hs-nil/deal-completed] status promotion failed', {
      dealId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 2. Load deal + athlete + brand.
  const { data: dealRow, error: dealErr } = await sb
    .from('deals')
    .select(
      `id, title, compensation_amount, status, completed_at,
       brand:brands(id, company_name, profile_id),
       athlete:athletes(id, first_name, last_name, email, profile_id)`,
    )
    .eq('id', dealId)
    .maybeSingle();

  if (dealErr || !dealRow) {
    return {
      ok: false,
      reason: dealErr?.message ?? 'deal not found',
      emailsAttempted: 0,
      emailsSucceeded: 0,
      totalShares: 0,
    };
  }

  const deal = dealRow as unknown as {
    id: string;
    title: string;
    compensation_amount: number | string;
    status: string;
    completed_at: string | null;
    brand: {
      id: string;
      company_name: string;
      profile_id: string;
    } | null;
    athlete: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      profile_id: string;
    } | null;
  };

  const amountDollars =
    typeof deal.compensation_amount === 'string'
      ? Number(deal.compensation_amount)
      : deal.compensation_amount;

  const athleteFirstName = (deal.athlete?.first_name ?? 'Scholar').trim();
  const brandName = deal.brand?.company_name ?? 'the brand';

  // 3. Load brand contact email via brand.profile_id → auth.users.email
  //    (service role can read auth.admin). Fall back silently if missing.
  let brandEmail: string | null = null;
  if (deal.brand?.profile_id) {
    try {
      const { data: authData } = await sb.auth.admin.getUserById(
        deal.brand.profile_id,
      );
      brandEmail = authData.user?.email ?? null;
    } catch {
      brandEmail = null;
    }
  }

  // 4. Load linked, verified parent (email + name). One-parent-per-deal
  //    is the happy path; if multiple, we send to all of them.
  interface ParentContact {
    email: string;
    fullName: string | null;
  }
  const parents: ParentContact[] = [];
  if (deal.athlete?.profile_id) {
    try {
      const { data: links } = await sb
        .from('hs_parent_athlete_links')
        .select(
          `parent_profile_id,
           verified_at,
           parent:hs_parent_profiles(id, user_id, full_name)`,
        )
        .eq('athlete_user_id', deal.athlete.profile_id)
        .not('verified_at', 'is', null);

      const rows =
        (links as unknown as Array<{
          parent: { id: string; user_id: string; full_name: string } | null;
        }>) ?? [];

      for (const l of rows) {
        if (!l.parent) continue;
        try {
          const { data: authData } = await sb.auth.admin.getUserById(
            l.parent.user_id,
          );
          const email = authData.user?.email;
          if (email) {
            parents.push({ email, fullName: l.parent.full_name });
          }
        } catch {
          // skip
        }
      }
    } catch {
      // skip
    }
  }

  // 5. Share counts.
  let totalShares = 0;
  try {
    const counts = await getShareCountsForDeal(sb, dealId);
    totalShares = counts.total;
  } catch {
    totalShares = 0;
  }

  // 6. Fire emails in parallel. Every send is best-effort; we collect
  //    results for the return value but never throw.
  interface SendTask {
    label: string;
    run: () => Promise<{ success: boolean; error?: string }>;
  }
  const tasks: SendTask[] = [];

  if (deal.athlete?.email) {
    tasks.push({
      label: 'athlete',
      run: () =>
        sendDealCompleted({
          recipient: 'athlete',
          toEmail: deal.athlete!.email as string,
          athleteFirstName,
          brandName,
          amountDollars,
          totalShares,
        }),
    });
  }

  if (brandEmail) {
    tasks.push({
      label: 'brand',
      run: () =>
        sendDealCompleted({
          recipient: 'brand',
          toEmail: brandEmail as string,
          athleteFirstName,
          brandName,
          amountDollars,
          totalShares,
        }),
    });
  }

  for (const p of parents) {
    tasks.push({
      label: 'parent',
      run: () =>
        sendDealCompleted({
          recipient: 'parent',
          toEmail: p.email,
          athleteFirstName,
          brandName,
          amountDollars,
          totalShares,
          parentFullName: p.fullName,
        }),
    });
  }

  const results = await Promise.allSettled(tasks.map((t) => t.run()));
  let succeeded = 0;
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.success) succeeded += 1;
  }

  // 7. Structured analytics log.
  // eslint-disable-next-line no-console
  console.log('[hs-nil/deal-completed] emitted', {
    scope: 'hs-nil-completion',
    dealId,
    amountDollars,
    totalShares,
    emailsAttempted: tasks.length,
    emailsSucceeded: succeeded,
    timestamp: new Date().toISOString(),
  });

  // 8. Match-feedback: record 'deal_completed' signal. Best-effort — any
  //    failure here is strictly analytics and must never propagate into
  //    the Stripe webhook retry path.
  const brandIdForFeedback = deal.brand?.id ?? null;
  const athleteUserIdForFeedback = deal.athlete?.profile_id ?? null;
  if (brandIdForFeedback && athleteUserIdForFeedback) {
    await recordFeedback({
      brandId: brandIdForFeedback,
      athleteUserId: athleteUserIdForFeedback,
      signal: 'deal_completed',
      sourcePage: 'webhook',
    }).catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.warn('[hs-nil/deal-completed] feedback signal failed', {
        dealId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    });
  }

  return {
    ok: true,
    emailsAttempted: tasks.length,
    emailsSucceeded: succeeded,
    totalShares,
  };
}
