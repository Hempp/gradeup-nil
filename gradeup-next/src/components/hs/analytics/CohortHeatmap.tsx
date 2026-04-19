/**
 * CohortHeatmap — server-renderable cohort × week-since heatmap.
 *
 * Recharts has no heatmap primitive, so this is a hand-rolled CSS grid.
 * Each cell's background is rgba(accent, intensity) where intensity is
 * the retention rate; null cells (future weeks) render transparent.
 */

import type { CohortMatrix } from '@/lib/hs-nil/analytics';

function fmtCohortLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function cellColor(rate: number | null): string {
  if (rate === null) return 'transparent';
  // Clamp + bias so even a few percent is visible.
  const intensity = Math.max(0.04, Math.min(1, rate));
  return `rgba(34, 211, 238, ${intensity.toFixed(2)})`;
}

function fmtRate(rate: number | null): string {
  if (rate === null) return '';
  return `${Math.round(rate * 100)}%`;
}

export default function CohortHeatmap({ matrix }: { matrix: CohortMatrix }) {
  if (matrix.rows.length === 0) {
    return (
      <p className="text-sm text-white/50">
        No cohorts in window. Once HS athletes sign up, their weekly
        retention will render here.
      </p>
    );
  }

  const cols = matrix.maxWeeks;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-1 text-xs text-white/80">
        <thead>
          <tr>
            <th className="sticky left-0 bg-transparent px-2 py-1 text-left text-white/50">
              Cohort
            </th>
            <th className="px-2 py-1 text-right text-white/50">Size</th>
            {Array.from({ length: cols }, (_, w) => (
              <th key={w} className="px-2 py-1 text-center text-white/40">
                W{w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row) => (
            <tr key={row.cohortWeekStart}>
              <th
                scope="row"
                className="sticky left-0 bg-transparent px-2 py-1 text-left font-semibold text-white/80"
              >
                {fmtCohortLabel(row.cohortWeekStart)}
              </th>
              <td className="px-2 py-1 text-right text-white/60">
                {row.cohortSize}
              </td>
              {row.weeksSinceSignup.map((rate, i) => (
                <td
                  key={i}
                  className="h-8 w-10 rounded-sm text-center font-mono"
                  style={{
                    backgroundColor: cellColor(rate),
                    color:
                      rate !== null && rate > 0.55
                        ? 'rgb(7,17,27)'
                        : 'rgba(255,255,255,0.85)',
                  }}
                  title={
                    rate === null
                      ? `${fmtCohortLabel(row.cohortWeekStart)} — week ${i}: pending`
                      : `${fmtCohortLabel(row.cohortWeekStart)} — week ${i}: ${fmtRate(rate)}`
                  }
                >
                  {fmtRate(rate)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
