/**
 * HS Brand Performance — /hs/brand/performance
 *
 * Server Component. Auth-gated + HS-brand-gated (is_hs_enabled=true). Shows
 * full ROI scoreboard across completed deals (status IN 'paid' | 'completed')
 * plus a recent-history table and a couple of earned-insight callouts.
 *
 * Gating mirrors /hs/brand exactly.
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  getBrandPerformanceSummary,
  getBrandCompletedDeals,
  formatCentsUSD,
} from '@/lib/hs-nil/earnings';
import { BrandROISummary } from '@/components/hs/BrandROISummary';
import { CompletedDealsTable } from '@/components/hs/CompletedDealsTable';

export const metadata: Metadata = {
  title: 'Performance — GradeUp HS Brand',
  description:
    'Your completed-deal scoreboard: spend, shares, and scholar-athlete partnerships.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HSBrandPerformancePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/hs/brand/performance');
  }

  const { data: brandRow } = await supabase
    .from('brands')
    .select('id, company_name, is_hs_enabled')
    .eq('profile_id', user.id)
    .maybeSingle();

  const brand = brandRow as
    | { id: string; company_name: string; is_hs_enabled: boolean | null }
    | null;

  if (!brand) {
    redirect('/hs/signup/brand?notice=convert');
  }
  if (brand.is_hs_enabled !== true) {
    redirect('/brand/dashboard');
  }

  const [summary, deals] = await Promise.all([
    getBrandPerformanceSummary(supabase, brand.id),
    getBrandCompletedDeals(supabase, brand.id, { limit: 50 }),
  ]);

  // Earned-insight callouts.
  const mostSharedDeal = deals.reduce<(typeof deals)[number] | null>(
    (best, d) => (best === null || d.shareCount > best.shareCount ? d : best),
    null,
  );
  const avgSpendCents =
    summary.totalDeals > 0
      ? Math.round(summary.totalSpendCents / summary.totalDeals)
      : 0;

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-10">
        <div className="mb-8">
          <Link
            href="/hs/brand"
            className="text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-3 font-display text-4xl text-white md:text-5xl">
            Performance
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">
            {brand.company_name} &middot; completed-deal metrics only.
          </p>
        </div>

        <BrandROISummary summary={summary} />

        {(mostSharedDeal || summary.totalDeals > 0) && (
          <section
            aria-labelledby="brand-insights-heading"
            className="mt-10 rounded-2xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 p-6"
          >
            <h2
              id="brand-insights-heading"
              className="font-display text-xl text-white"
            >
              Insight
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              {mostSharedDeal && mostSharedDeal.shareCount > 0 && (
                <li>
                  Your most-shared deal was{' '}
                  <strong>{mostSharedDeal.athleteFirstName}</strong> ×{' '}
                  <strong>{mostSharedDeal.brandName}</strong> with{' '}
                  <strong>{mostSharedDeal.shareCount}</strong> share
                  {mostSharedDeal.shareCount === 1 ? '' : 's'}.
                </li>
              )}
              {summary.totalDeals > 0 && (
                <li>
                  You spent an average of{' '}
                  <strong>{formatCentsUSD(avgSpendCents)}</strong> per
                  scholar-athlete partnership.
                </li>
              )}
            </ul>
          </section>
        )}
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl text-white md:text-3xl">
            Completed deals
          </h2>
          <p className="text-xs uppercase tracking-widest text-white/40">
            Most recent first
          </p>
        </div>
        <div className="mt-4">
          <CompletedDealsTable
            role="brand"
            deals={deals}
            emptyCopy="No completed deals yet. Post a deal to get the loop going."
          />
        </div>
      </section>
    </main>
  );
}
