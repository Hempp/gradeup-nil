/**
 * AthleteDashboardTrajectoryCard — compact trajectory summary for the
 * athlete dashboard grid. Shows the current GPA + tier pill, a small
 * recent-history sparkline when the athlete has ≥2 snapshots in the
 * last 6 months, and a link to the full trajectory page.
 *
 * When fewer than 2 snapshots exist in the recent window, we render a
 * text nudge instead of a trivial sparkline — the line "your first dot"
 * is the starting point of the narrative.
 */

import Link from 'next/link';
import type {
  GpaSnapshot,
  VerificationTier,
} from '@/lib/hs-nil/trajectory';
import { formatGpa, tierLabel } from '@/lib/hs-nil/trajectory';

export interface AthleteDashboardTrajectoryCardProps {
  currentGpa: number | null;
  currentTier: VerificationTier | null;
  snapshots: GpaSnapshot[];
}

const TIER_TONE: Record<VerificationTier, string> = {
  self_reported: 'border-white/15 bg-white/5 text-white/70',
  user_submitted: 'border-blue-400/40 bg-blue-400/10 text-blue-200',
  institution_verified:
    'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
};

function buildSparkPath(points: number[], width: number, height: number): string {
  if (points.length === 0) return '';
  const min = Math.min(...points, 0);
  const max = Math.max(...points, 5);
  const span = max - min || 1;
  const step = points.length > 1 ? width / (points.length - 1) : width;
  return points
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / span) * height;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

export function AthleteDashboardTrajectoryCard({
  currentGpa,
  currentTier,
  snapshots,
}: AthleteDashboardTrajectoryCardProps) {
  const tier: VerificationTier = currentTier ?? 'self_reported';
  const tierCls = TIER_TONE[tier];

  // Recent-window filter — last 6 months
  const sixMonthsAgo = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000;
  const recent = snapshots
    .filter((s) => new Date(s.reportedAt).getTime() >= sixMonthsAgo)
    .sort(
      (a, b) =>
        new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime()
    );

  const width = 120;
  const height = 36;
  const canDrawSpark = recent.length >= 2;
  const path = canDrawSpark
    ? buildSparkPath(recent.map((s) => s.gpa), width, height)
    : '';

  return (
    <section
      aria-labelledby="athlete-trajectory-card-heading"
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
        Trajectory
      </p>
      <h3
        id="athlete-trajectory-card-heading"
        className="mt-2 font-display text-3xl text-white md:text-4xl"
      >
        {formatGpa(currentGpa)}
      </h3>
      <div className="mt-2 flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tierCls}`}
        >
          {tierLabel(tier)}
        </span>
      </div>

      <div className="mt-4 h-[40px]">
        {canDrawSpark ? (
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            aria-hidden="true"
          >
            <path
              d={path}
              fill="none"
              stroke="var(--accent-primary)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <p className="text-xs text-white/50">
            Add more verified GPAs to build your trajectory.
          </p>
        )}
      </div>

      <Link
        href="/hs/athlete/trajectory"
        className="mt-4 inline-flex min-h-[44px] items-center text-sm font-semibold text-[var(--accent-primary)] hover:underline"
      >
        View full trajectory →
      </Link>
    </section>
  );
}

export default AthleteDashboardTrajectoryCard;
