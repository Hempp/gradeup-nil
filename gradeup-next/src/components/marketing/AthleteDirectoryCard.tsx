import Link from 'next/link';
import type { DirectoryAthleteSummary } from '@/lib/hs-nil/athlete-profile';
import { tierLabel, formatGpa } from '@/lib/hs-nil/trajectory';

const TIER_TONE: Record<string, string> = {
  self_reported: 'border-white/10 bg-white/5 text-white/70',
  user_submitted: 'border-blue-400/40 bg-blue-400/10 text-blue-200',
  institution_verified:
    'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
};

export function AthleteDirectoryCard({
  athlete,
}: {
  athlete: DirectoryAthleteSummary;
}) {
  const tier = athlete.currentTier ?? 'self_reported';
  const toneCls = TIER_TONE[tier] ?? TIER_TONE.self_reported;

  return (
    <Link
      href={`/athletes/${athlete.username}`}
      className="group block rounded-2xl border border-white/10 bg-black/30 p-5 transition hover:border-white/25 hover:bg-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-2xl leading-none text-white">
          {athlete.firstName} {athlete.lastInitial}.
        </h3>
        {athlete.currentGpa !== null && (
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs uppercase tracking-wide ${toneCls}`}
            aria-label={`GPA ${formatGpa(athlete.currentGpa)} ${tierLabel(tier)}`}
          >
            {formatGpa(athlete.currentGpa)}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-white/60">
        {[athlete.sport, athlete.school, athlete.stateName ?? athlete.stateCode]
          .filter(Boolean)
          .join(' · ')}
      </p>
      {athlete.graduationYear && (
        <p className="mt-2 text-xs uppercase tracking-widest text-white/40">
          Class of {athlete.graduationYear}
        </p>
      )}
    </Link>
  );
}
