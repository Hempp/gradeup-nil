/**
 * Numbered stat-card strip rendered on a case-study page.
 * Server Component.
 */
import type { CaseStudyMetric } from '@/lib/hs-nil/case-studies';

export function CaseStudyMetricPanel({ metrics }: { metrics: CaseStudyMetric[] }) {
  if (metrics.length === 0) return null;

  return (
    <section
      aria-label="Case study key metrics"
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
    >
      {metrics.map((m, idx) => (
        <div
          key={m.id}
          className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
        >
          <div className="text-xs uppercase tracking-widest text-[var(--marketing-gray-500)] font-semibold mb-2">
            {String(idx + 1).padStart(2, '0')}
          </div>
          <div className="text-3xl md:text-4xl font-bold text-[var(--accent-success)] tabular-nums">
            {m.metricValue}
          </div>
          <div className="text-sm text-white mt-2 font-semibold">
            {m.metricLabel}
          </div>
          {m.metricHint && (
            <div className="text-xs text-[var(--marketing-gray-400)] mt-2 leading-relaxed">
              {m.metricHint}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
