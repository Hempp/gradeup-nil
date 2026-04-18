/**
 * BrandROISummary — top-of-page stat block for /hs/brand/performance.
 *
 * Displays the five numbers that matter to a brand at the end of the loop:
 * total spend, total completed deals, average completion days, total share
 * events, and avg shares per deal.
 *
 * Intentionally does NOT surface revenue or conversion numbers — we don't
 * collect either in the HS pilot, and framing ROI as "dollars of lift" on
 * a high-school pilot would be dishonest. What we do have is spend +
 * organic amplification, and that's what ships.
 */
import {
  formatCentsUSD,
  type BrandPerformanceSummary,
} from '@/lib/hs-nil/earnings';

export interface BrandROISummaryProps {
  summary: BrandPerformanceSummary;
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl text-white md:text-4xl">
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-white/50">{hint}</p>}
    </div>
  );
}

export function BrandROISummary({ summary }: BrandROISummaryProps) {
  const {
    totalSpendCents,
    totalDeals,
    averageCompletionDays,
    totalShareEvents,
    avgSharesPerDeal,
  } = summary;

  const avgSpendCents =
    totalDeals > 0 ? Math.round(totalSpendCents / totalDeals) : 0;

  return (
    <section aria-labelledby="brand-roi-heading">
      <h2
        id="brand-roi-heading"
        className="font-display text-2xl text-white md:text-3xl"
      >
        Your partnership scoreboard.
      </h2>
      <p className="mt-1 text-sm text-white/60">
        Every number here is a completed deal — paid, settled, and logged.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Stat
          label="Total spend"
          value={formatCentsUSD(totalSpendCents)}
          hint={
            totalDeals > 0
              ? `Average ${formatCentsUSD(avgSpendCents)} per partnership.`
              : 'No completed deals yet.'
          }
        />
        <Stat
          label="Completed deals"
          value={totalDeals.toLocaleString()}
          hint="Paid + settled."
        />
        <Stat
          label="Avg completion"
          value={
            averageCompletionDays === null
              ? '—'
              : `${averageCompletionDays} day${averageCompletionDays === 1 ? '' : 's'}`
          }
          hint="Created → paid."
        />
        <Stat
          label="Total share events"
          value={totalShareEvents.toLocaleString()}
          hint="Clicks the athlete or parent registered on the celebration page."
        />
        <Stat
          label="Avg shares / deal"
          value={avgSharesPerDeal.toString()}
          hint="Organic amplification per partnership."
        />
      </div>
    </section>
  );
}

export default BrandROISummary;
