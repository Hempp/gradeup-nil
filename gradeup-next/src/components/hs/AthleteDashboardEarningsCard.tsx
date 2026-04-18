/**
 * AthleteDashboardEarningsCard — compact earnings summary for /hs/athlete.
 *
 * Fits into the existing 2-col dashboard grid next to the consent / state
 * rules cards. Shows total earned + deal count with a link out to the full
 * earnings dashboard. Quiet by design — if there are no completed deals
 * yet, the copy anchors on "your first deal lands here" rather than a
 * zero-dollar figure.
 */
import Link from 'next/link';
import {
  formatCentsUSD,
  type AthleteEarningsSummary,
} from '@/lib/hs-nil/earnings';

export interface AthleteDashboardEarningsCardProps {
  summary: AthleteEarningsSummary;
}

export function AthleteDashboardEarningsCard({
  summary,
}: AthleteDashboardEarningsCardProps) {
  const { totalEarnedCents, totalDeals } = summary;
  const hasEarnings = totalEarnedCents > 0;

  return (
    <section
      aria-labelledby="athlete-earnings-card-heading"
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
        Earnings
      </p>
      <h3
        id="athlete-earnings-card-heading"
        className="mt-2 font-display text-3xl text-white md:text-4xl"
      >
        {hasEarnings ? formatCentsUSD(totalEarnedCents) : '—'}
      </h3>
      <p className="mt-1 text-sm text-white/70">
        {hasEarnings
          ? `Across ${totalDeals} completed deal${totalDeals === 1 ? '' : 's'}.`
          : 'Your first payout lands here.'}
      </p>
      <Link
        href="/hs/athlete/earnings"
        className="mt-4 inline-flex min-h-[44px] items-center text-sm font-semibold text-[var(--accent-primary)] hover:underline"
      >
        View earnings →
      </Link>
    </section>
  );
}

export default AthleteDashboardEarningsCard;
