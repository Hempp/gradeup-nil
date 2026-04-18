/**
 * EarningsHeroCard — large total-earned surface for /hs/athlete/earnings.
 *
 * Server-safe presentational component (no client state). Displays the
 * aggregate total-earned number, deal count, first-deal date, and, when
 * positive, an "+$X this month" delta indicator.
 *
 * Tone is grounded, not gamified: this is an athlete's real money in a
 * custodial account. We avoid projections, estimates, or "you could earn
 * up to…" language — everything here is cash settled.
 */
import {
  formatCentsUSD,
  formatDateShort,
  type AthleteEarningsSummary,
} from '@/lib/hs-nil/earnings';

export interface EarningsHeroCardProps {
  summary: AthleteEarningsSummary;
}

export function EarningsHeroCard({ summary }: EarningsHeroCardProps) {
  const {
    totalEarnedCents,
    totalDeals,
    firstDealAt,
    deltaThisMonthCents,
    averageDealCents,
    highestDealCents,
  } = summary;

  const hasEarnings = totalEarnedCents > 0;
  const hasMonthDelta = deltaThisMonthCents > 0;

  return (
    <section
      aria-labelledby="earnings-hero-heading"
      className="rounded-2xl border border-white/10 bg-[var(--accent-primary)]/[0.04] p-6 md:p-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Total earned
          </p>
          <h2
            id="earnings-hero-heading"
            className="mt-2 font-display text-5xl text-white md:text-6xl"
          >
            {formatCentsUSD(totalEarnedCents)}
          </h2>
          <p className="mt-2 text-sm text-white/70">
            {hasEarnings
              ? `Across ${totalDeals} completed deal${totalDeals === 1 ? '' : 's'}.`
              : 'No completed deals yet. Your first one lands here.'}
          </p>
          {firstDealAt && (
            <p className="mt-1 text-xs text-white/50">
              First deal: {formatDateShort(firstDealAt)}
            </p>
          )}
        </div>

        {hasMonthDelta && (
          <div className="rounded-xl border border-[var(--accent-primary)]/40 bg-black/30 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
              This month
            </p>
            <p className="mt-1 font-display text-2xl text-white">
              +{formatCentsUSD(deltaThisMonthCents)}
            </p>
          </div>
        )}
      </div>

      {hasEarnings && (
        <dl className="mt-6 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-widest text-white/40">
              Average deal
            </dt>
            <dd className="mt-1 font-display text-xl text-white">
              {formatCentsUSD(averageDealCents)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-white/40">
              Biggest deal
            </dt>
            <dd className="mt-1 font-display text-xl text-white">
              {formatCentsUSD(highestDealCents)}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}

export default EarningsHeroCard;
