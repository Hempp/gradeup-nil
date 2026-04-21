import type { GpaSnapshot } from '@/lib/hs-nil/trajectory';
import { formatGpa } from '@/lib/hs-nil/trajectory';

/**
 * AthletePublicTrajectoryStrip — mini trajectory renderer for the public
 * athlete profile page. Pure SVG sparkline; no external chart lib. Keeps
 * the render footprint tiny for OG-scroll scenarios (shared on social
 * → many first-paint loads).
 */

export function AthletePublicTrajectoryStrip({
  snapshots,
}: {
  snapshots: GpaSnapshot[];
}) {
  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-center text-sm text-white/50">
        No trajectory yet. Add verified GPAs to build one.
      </div>
    );
  }

  const sorted = [...snapshots].sort(
    (a, b) =>
      new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime(),
  );

  const points = sorted.map((s) => s.gpa);
  const min = Math.max(0, Math.min(...points) - 0.2);
  const max = Math.min(5, Math.max(...points) + 0.2);
  const range = Math.max(0.2, max - min);
  const width = 600;
  const height = 140;
  const stepX = sorted.length > 1 ? width / (sorted.length - 1) : 0;

  const d = sorted
    .map((snap, idx) => {
      const x = idx * stepX;
      const y = height - ((snap.gpa - min) / range) * height;
      return `${idx === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="font-display text-lg text-white">GPA trajectory</h3>
        <span className="text-xs text-white/50">
          {sorted.length} snapshot{sorted.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="relative h-[140px] w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          aria-label="GPA trajectory sparkline"
        >
          <path
            d={d}
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {sorted.map((snap, idx) => {
            const x = idx * stepX;
            const y = height - ((snap.gpa - min) / range) * height;
            const fill =
              snap.tier === 'institution_verified'
                ? '#10b981'
                : snap.tier === 'user_submitted'
                  ? '#3b82f6'
                  : '#9ca3af';
            return (
              <circle
                key={`${snap.reportedAt}-${idx}`}
                cx={x}
                cy={y}
                r={4}
                fill={fill}
              />
            );
          })}
        </svg>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-white/50">
        <span>{formatGpa(sorted[0]?.gpa ?? null)} start</span>
        <span>{formatGpa(sorted[sorted.length - 1]?.gpa ?? null)} now</span>
      </div>
    </div>
  );
}
