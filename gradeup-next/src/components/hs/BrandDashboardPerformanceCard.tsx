/**
 * BrandDashboardPerformanceCard — compact performance summary for /hs/brand.
 *
 * Drop-in card for the existing BrandDashboardShell. Shows total spend +
 * completed deal count with a link out to the full performance dashboard.
 */
import Link from 'next/link';
import {
  formatCentsUSD,
  type BrandPerformanceSummary,
} from '@/lib/hs-nil/earnings';

export interface BrandDashboardPerformanceCardProps {
  summary: BrandPerformanceSummary;
}

export function BrandDashboardPerformanceCard({
  summary,
}: BrandDashboardPerformanceCardProps) {
  const { totalSpendCents, totalDeals, totalShareEvents } = summary;
  const hasDeals = totalDeals > 0;

  return (
    <section
      aria-labelledby="brand-perf-card-heading"
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
        Performance
      </p>
      <h3
        id="brand-perf-card-heading"
        className="mt-2 font-display text-3xl text-white md:text-4xl"
      >
        {hasDeals ? formatCentsUSD(totalSpendCents) : '—'}
      </h3>
      <p className="mt-1 text-sm text-white/70">
        {hasDeals
          ? `Across ${totalDeals} completed deal${totalDeals === 1 ? '' : 's'} · ${totalShareEvents} share event${totalShareEvents === 1 ? '' : 's'}.`
          : 'ROI numbers light up after your first completed deal.'}
      </p>
      <Link
        href="/hs/brand/performance"
        className="mt-4 inline-flex min-h-[44px] items-center text-sm font-semibold text-[var(--accent-primary)] hover:underline"
      >
        View performance →
      </Link>
    </section>
  );
}

export default BrandDashboardPerformanceCard;
