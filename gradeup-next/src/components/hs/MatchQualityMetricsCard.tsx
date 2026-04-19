/**
 * MatchQualityMetricsCard — admin-only metrics tile.
 *
 * Read-only Server Component render. Shows:
 *   - Suggestions served (distinct brand-athlete pairs with any event).
 *   - Proposed-deal rate on those suggestions.
 *   - Completion rate among proposed.
 *   - Average affinity weight per pair.
 *   - Top 5 athletes by positive weight (masked handle + brand count).
 *
 * The caller is responsible for admin role-gating — this component is
 * dumb and just renders the passed metrics.
 */

import type { MatchQualityMetrics } from '@/lib/hs-nil/match-feedback';

export interface MatchQualityMetricsCardProps {
  metrics: MatchQualityMetrics;
}

function formatPct(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(n * 1000) / 10}%`;
}

function formatAffinity(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(3)}`;
}

export default function MatchQualityMetricsCard({
  metrics,
}: MatchQualityMetricsCardProps) {
  const {
    windowDays,
    suggestionsServed,
    proposedDeals,
    proposedRate,
    completedDeals,
    completionRate,
    averageAffinity,
    topAthletes,
  } = metrics;

  return (
    <section
      aria-labelledby="match-quality-heading"
      className="rounded-xl border border-white/10 bg-white/5 p-6"
    >
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <h2
            id="match-quality-heading"
            className="font-display text-xl text-white md:text-2xl"
          >
            Match quality
          </h2>
          <p className="mt-1 text-sm text-white/60">
            Last {windowDays} days. Read-only.
          </p>
        </div>
      </header>

      <dl className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat label="Suggestions served" value={suggestionsServed.toLocaleString()} />
        <Stat
          label="Proposed / served"
          value={formatPct(proposedRate)}
          hint={`${proposedDeals.toLocaleString()} proposed`}
        />
        <Stat
          label="Completed / proposed"
          value={formatPct(completionRate)}
          hint={`${completedDeals.toLocaleString()} completed`}
        />
        <Stat
          label="Avg affinity"
          value={formatAffinity(averageAffinity)}
          hint="per (brand, athlete) pair"
        />
        <Stat
          label="Top athlete brands"
          value={topAthletes[0]?.distinctBrands.toString() ?? '0'}
          hint="distinct brands on #1"
        />
      </dl>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
          Top athletes by positive signal
        </p>
        {topAthletes.length === 0 ? (
          <p className="mt-2 text-sm text-white/50">
            No positive-signal athletes in this window yet.
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {topAthletes.map((a, idx) => (
              <li
                key={a.athleteUserId}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-white/10 bg-black/30 px-3 py-2"
              >
                <p className="text-sm text-white/90">
                  <span className="mr-2 inline-block w-6 text-right text-xs font-semibold text-white/50">
                    #{idx + 1}
                  </span>
                  {a.maskedHandle}
                </p>
                <p className="text-xs text-white/70">
                  <span className="text-emerald-300">
                    {formatAffinity(a.positiveWeight)}
                  </span>
                  {' · '}
                  {a.distinctBrands} brand{a.distinctBrands === 1 ? '' : 's'}
                </p>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3 text-xs text-white/40">
          Handles are masked (first name + UUID prefix). Raw identifiers
          stay in the service-role query log only.
        </p>
      </div>
    </section>
  );
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
    <div className="rounded-lg border border-white/10 bg-black/30 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl text-white md:text-3xl">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-white/50">{hint}</p>}
    </div>
  );
}
