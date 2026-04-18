/**
 * POST /api/hs/brand/deals/[id]/review
 *
 * Brand-side approve / request-revision handler. Phase 7 BRAND-REVIEW.
 *
 * Request body:
 *   { decision: 'approve' | 'request_revision', notes?: string, submissionId?: string }
 *
 * Contract:
 *   - Feature-flag gated (FEATURE_HS_NIL). 404 when off.
 *   - Authenticated brand on this deal. 401 / 403 otherwise.
 *   - Rate-limited via the shared `mutation` bucket.
 *   - Deal must be in `in_review`. 409 {code:'invalid_state'} otherwise.
 *   - Revision notes are required and min 20 chars (zod enforced).
 *
 * Approve path:
 *   1. recordApproval() → deal_approvals row, submissions flipped to
 *      'accepted', deals.status → 'approved'.
 *   2. releasePayout(dealId) — wrapped in try/catch. On success, deals
 *      flips to 'paid'. On failure, deal stays at 'approved' and
 *      ops retries manually via /hs/admin/payouts — the brand is NOT
 *      penalized for a payout infra hiccup.
 *   3. Best-effort send sendDeliverableApproved to athlete + any
 *      verified linked parents.
 *
 * Request-revision path:
 *   1. requestRevision() → deal_approvals row, most-recent submitted
 *      submission flipped to 'rejected' with notes, deals.status →
 *      'in_delivery'.
 *   2. Best-effort send sendRevisionRequested to athlete.
 *
 * Response: { ok, approvalId, newDealStatus, payout?: {status, reason?} }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import {
  recordApproval,
  requestRevision,
} from '@/lib/hs-nil/approvals';
import { releasePayout } from '@/lib/hs-nil/payouts';
import {
  sendDeliverableApproved,
  sendRevisionRequested,
} from '@/lib/services/hs-nil/approval-emails';

const schema = z
  .discriminatedUnion('decision', [
    z.object({
      decision: z.literal('approve'),
      notes: z.string().trim().max(2000).optional(),
      submissionId: z.string().uuid().optional(),
    }),
    z.object({
      decision: z.literal('request_revision'),
      notes: z
        .string()
        .trim()
        .min(20, 'Please write at least 20 characters of feedback.')
        .max(2000),
      submissionId: z.string().uuid().optional(),
    }),
  ]);

interface DealLookup {
  id: string;
  status: string;
  title: string;
  compensation_amount: number;
  brand: { id: string; company_name: string; profile_id: string } | null;
  athlete: {
    id: string;
    profile_id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  'https://gradeupnil.com';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { id: dealId } = await params;

    const supabase = await createClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return rateLimited;

    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json(
        { error: 'Invalid JSON body', code: 'invalid_body' },
        { status: 400 },
      );
    }
    const parsed = schema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues.map((i) => i.message).join('; '),
          code: 'invalid_body',
        },
        { status: 400 },
      );
    }

    // Load deal + parties for auth + email context.
    const { data: deal, error: dealErr } = await supabase
      .from('deals')
      .select(
        `id, status, title, compensation_amount,
         brand:brands(id, company_name, profile_id),
         athlete:athletes(id, profile_id, first_name, last_name, email)`,
      )
      .eq('id', dealId)
      .maybeSingle<DealLookup>();

    if (dealErr || !deal) {
      return NextResponse.json(
        { error: 'Deal not found', code: 'not_found' },
        { status: 404 },
      );
    }

    // Authorization: only the brand on this deal.
    if (!deal.brand || deal.brand.profile_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to review this deal.', code: 'forbidden' },
        { status: 403 },
      );
    }

    // State gate.
    if (deal.status !== 'in_review') {
      return NextResponse.json(
        {
          error: `Deal is not awaiting review (current status: ${deal.status}).`,
          code: 'invalid_state',
        },
        { status: 409 },
      );
    }

    // ------------------------------------------------------------------
    // APPROVE
    // ------------------------------------------------------------------
    if (parsed.data.decision === 'approve') {
      const approvalResult = await recordApproval({
        dealId,
        reviewerUserId: user.id,
        submissionId: parsed.data.submissionId ?? null,
        notes: parsed.data.notes ?? null,
      });

      if (!approvalResult.ok) {
        return NextResponse.json(
          { error: approvalResult.reason ?? 'Could not record approval.' },
          { status: 500 },
        );
      }

      // Release payout — best-effort. Failure leaves the deal at 'approved'
      // for OPS-WRITER's /hs/admin/payouts retry path; we do NOT revert
      // the approval.
      let payoutStatus: 'releasing' | 'already_paid' | 'pending_retry' =
        'releasing';
      let finalDealStatus: 'approved' | 'paid' = 'approved';
      try {
        const payout = await releasePayout(dealId);
        if (payout.ok) {
          // Flip to 'paid'. We do this here (not in approvals.ts) so the
          // service doesn't need to know about payout provider.
          const { error: flipErr } = await supabase
            .from('deals')
            .update({
              status: 'paid',
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', dealId);
          if (flipErr) {
            // eslint-disable-next-line no-console
            console.warn('[brand-review] paid status flip failed', {
              dealId,
              error: flipErr.message,
            });
          } else {
            finalDealStatus = 'paid';
          }
          payoutStatus =
            payout.reason === 'already paid' ? 'already_paid' : 'releasing';
        } else {
          payoutStatus = 'pending_retry';
          // eslint-disable-next-line no-console
          console.warn('[brand-review] releasePayout did not succeed', {
            dealId,
            reason: payout.reason,
          });
        }
      } catch (err) {
        payoutStatus = 'pending_retry';
        // eslint-disable-next-line no-console
        console.warn('[brand-review] releasePayout threw', {
          dealId,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // Best-effort emails — athlete + verified linked parents.
      const athleteEmail = deal.athlete?.email ?? null;
      const athleteFirstName = deal.athlete?.first_name ?? 'there';
      const brandName = deal.brand.company_name;
      const celebrateUrl = `${APP_URL}/hs/deals/${dealId}/celebrate`;
      const earningsUrl = `${APP_URL}/hs/athlete/earnings`;

      if (athleteEmail) {
        void sendDeliverableApproved({
          recipientEmail: athleteEmail,
          athleteFirstName,
          brandName,
          dealTitle: deal.title,
          amount: deal.compensation_amount,
          payoutStatus,
          celebrateUrl,
          earningsUrl,
        }).catch((err) => {
          // eslint-disable-next-line no-console
          console.warn('[brand-review] approval email to athlete failed', err);
        });
      }

      // Resolve linked parent emails via verified parent-athlete links.
      if (deal.athlete?.profile_id) {
        try {
          const { data: parents } = await supabase
            .from('hs_parent_athlete_links')
            .select('parent_profile_id, hs_parent_profiles!inner(email)')
            .eq('athlete_user_id', deal.athlete.profile_id)
            .not('verified_at', 'is', null);

          const rows = (parents ?? []) as unknown as Array<{
            parent_profile_id: string;
            hs_parent_profiles: { email: string } | { email: string }[];
          }>;

          for (const row of rows) {
            const profile = Array.isArray(row.hs_parent_profiles)
              ? row.hs_parent_profiles[0]
              : row.hs_parent_profiles;
            const parentEmail = profile?.email;
            if (!parentEmail) continue;
            void sendDeliverableApproved({
              recipientEmail: parentEmail,
              athleteFirstName,
              brandName,
              dealTitle: deal.title,
              amount: deal.compensation_amount,
              payoutStatus,
              celebrateUrl,
              earningsUrl,
            }).catch((err) => {
              // eslint-disable-next-line no-console
              console.warn(
                '[brand-review] approval email to parent failed',
                err,
              );
            });
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[brand-review] parent email resolution failed', err);
        }
      }

      return NextResponse.json(
        {
          ok: true,
          approvalId: approvalResult.approvalId,
          newDealStatus: finalDealStatus,
          payout: { status: payoutStatus },
        },
        { status: 200 },
      );
    }

    // ------------------------------------------------------------------
    // REQUEST REVISION
    // ------------------------------------------------------------------
    const revisionResult = await requestRevision({
      dealId,
      reviewerUserId: user.id,
      submissionId: parsed.data.submissionId ?? null,
      notes: parsed.data.notes,
    });

    if (!revisionResult.ok) {
      return NextResponse.json(
        { error: revisionResult.reason ?? 'Could not request revision.' },
        { status: 500 },
      );
    }

    // Best-effort email to athlete.
    if (deal.athlete?.email) {
      void sendRevisionRequested({
        recipientEmail: deal.athlete.email,
        athleteFirstName: deal.athlete.first_name ?? 'there',
        brandName: deal.brand.company_name,
        dealTitle: deal.title,
        reviewNotes: parsed.data.notes,
        resubmitUrl: `${APP_URL}/hs/deals/${dealId}/deliver`,
      }).catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[brand-review] revision email failed', err);
      });
    }

    return NextResponse.json(
      {
        ok: true,
        approvalId: revisionResult.approvalId,
        newDealStatus: 'in_delivery',
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    // eslint-disable-next-line no-console
    console.error('[brand-review] unhandled', { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
