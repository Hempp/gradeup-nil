/**
 * HS Deal Deliverable Submit — /hs/deals/[id]/deliver
 *
 * Server Component. Post-signing athlete surface.
 *
 * Preconditions:
 *   - FEATURE_HS_NIL on (404 otherwise).
 *   - Authed Supabase session (redirect to /login otherwise).
 *   - Caller is the athlete on this deal (notFound otherwise — we
 *     don't leak deal existence to non-parties).
 *   - Deal status is one of fully_signed / in_delivery / in_review.
 *     Anything else renders a "not at this stage" message with a
 *     link back to the deal detail page.
 */

import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import {
  ALLOWED_SUBMIT_DEAL_STATES,
  getSignedDeliverableUrl,
  listSubmissionsForDeal,
} from '@/lib/hs-nil/deliverables';
import { DeliverableSubmitForm } from '@/components/hs/DeliverableSubmitForm';
import { DeliverableItemCard } from '@/components/hs/DeliverableItemCard';

export const metadata: Metadata = {
  title: 'Submit deliverables — GradeUp HS',
  description: 'Submit proof of completed NIL deliverables for brand review.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface DealRow {
  id: string;
  status: string;
  title: string;
  athlete: { id: string; profile_id: string } | null;
  brand: { id: string; company_name: string } | null;
}

export default async function HSDealDeliverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isFeatureEnabled('HS_NIL')) {
    notFound();
  }

  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/hs/deals/${id}/deliver`);
  }

  const { data: deal } = await supabase
    .from('deals')
    .select(
      `id, status, title,
       athlete:athletes!inner(id, profile_id),
       brand:brands(id, company_name)`
    )
    .eq('id', id)
    .maybeSingle<DealRow>();

  if (!deal || !deal.athlete || deal.athlete.profile_id !== user.id) {
    notFound();
  }

  const allowed = (ALLOWED_SUBMIT_DEAL_STATES as readonly string[]).includes(
    deal.status
  );

  const rows = allowed ? await listSubmissionsForDeal(deal.id) : [];
  const enriched = await Promise.all(
    rows.map(async (row) => {
      let signedUrl: string | null = null;
      if (row.storage_path) {
        signedUrl = await getSignedDeliverableUrl(row.storage_path, 300);
      }
      return { ...row, signedUrl };
    })
  );

  const brandName = deal.brand?.company_name ?? 'Your brand';

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-6">
        <Link
          href={`/hs/deals/${deal.id}`}
          className="inline-flex min-h-[44px] items-center text-sm text-white/70 hover:text-white"
        >
          ← Back to deal
        </Link>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          Post-signing delivery
        </p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl">{deal.title}</h1>
        <p className="mt-3 text-sm text-white/70 md:text-base">
          For <span className="font-semibold text-white">{brandName}</span>
        </p>
      </section>

      {!allowed ? (
        <section className="mx-auto max-w-4xl px-6 pb-24">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8">
            <h2 className="font-display text-2xl text-white">
              Not ready for delivery yet
            </h2>
            <p className="mt-2 text-sm text-white/70">
              Deliverables can only be submitted after the deal is fully
              signed. You will see a big green "Submit deliverables" button
              on your deal detail page the moment the signing wraps up.
            </p>
            <div className="mt-6">
              <Link
                href={`/hs/deals/${deal.id}`}
                className="inline-flex min-h-[44px] items-center rounded-lg border border-white/20 bg-white/5 px-5 text-sm font-medium text-white hover:bg-white/10"
              >
                Back to deal
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="mx-auto max-w-4xl px-6 pb-10">
            <DeliverableSubmitForm dealId={deal.id} />
          </section>

          <section className="mx-auto max-w-4xl px-6 pb-24">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-white/50">
              Prior submissions
            </h2>
            {enriched.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60 backdrop-blur-sm">
                No submissions yet. Your first submission moves the deal into
                review.
              </div>
            ) : (
              <div className="space-y-4">
                {enriched.map((row) => (
                  <DeliverableItemCard key={row.id} submission={row} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
