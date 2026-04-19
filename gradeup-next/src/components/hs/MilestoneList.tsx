/**
 * MilestoneList — vertical timeline of athlete milestones.
 *
 * Derived milestones (not persisted as rows) — signed consent, first
 * user-submitted GPA, first deal, each additional deal, etc. Assembled
 * chronologically in the trajectory service.
 *
 * Pure server-safe render (no client state). Purely decorative icons
 * are tagged aria-hidden; the text carries the meaning.
 */

import type { TrajectoryMilestone } from '@/lib/hs-nil/trajectory';

export interface MilestoneListProps {
  milestones: TrajectoryMilestone[];
  emptyCopy?: string;
  className?: string;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function iconGlyph(hint: string): string {
  switch (hint) {
    case 'consent_signed':
      return '✓';
    case 'verified_gpa':
    case 'institution_verified':
      return '★';
    case 'first_deal':
      return '$';
    case 'deal_completed':
      return '$';
    case 'first_snapshot':
      return '•';
    default:
      return '•';
  }
}

export function MilestoneList({
  milestones,
  emptyCopy = 'Milestones will appear as you hit them.',
  className,
}: MilestoneListProps) {
  if (milestones.length === 0) {
    return (
      <div
        className={`rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/60 ${className ?? ''}`}
      >
        {emptyCopy}
      </div>
    );
  }

  return (
    <ol
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-6 ${className ?? ''}`}
    >
      {milestones.map((m, i) => (
        <li
          key={`${m.type}-${m.date}-${i}`}
          className="relative flex gap-4 pb-5 last:pb-0"
        >
          {i < milestones.length - 1 && (
            <span
              aria-hidden="true"
              className="absolute left-[11px] top-6 bottom-0 w-px bg-white/10"
            />
          )}
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[11px] font-semibold text-white/80"
          >
            {iconGlyph(m.iconHint)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <p className="text-sm font-semibold text-white">{m.title}</p>
              <p className="text-[11px] uppercase tracking-widest text-white/40">
                {fmtDate(m.date)}
              </p>
            </div>
            <p className="mt-0.5 text-sm text-white/70">{m.subtitle}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default MilestoneList;
