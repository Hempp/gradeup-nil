import Link from 'next/link';
import type { DirectoryAthleteSummary } from '@/lib/hs-nil/athlete-profile';
import { tierLabel, formatGpa } from '@/lib/hs-nil/trajectory';

const TIER_TONE: Record<string, string> = {
  self_reported: 'border-[var(--hairline)] bg-[var(--cream-section)] text-[var(--ink-meta)]',
  user_submitted: 'border-[var(--cobalt)]/40 bg-[var(--cobalt)]/10 text-[var(--cobalt)]',
  institution_verified:
    'border-emerald-600/40 bg-emerald-600/10 text-emerald-700',
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
      className="marketing-dark card-marketing group block rounded-2xl p-5 hover-lift transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt)]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-2xl leading-none text-[var(--ink)]">
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
      <p className="mt-1 text-sm text-[var(--ink-muted)]">
        {[athlete.sport, athlete.school, athlete.stateName ?? athlete.stateCode]
          .filter(Boolean)
          .join(' · ')}
      </p>
      {athlete.graduationYear && (
        <p className="eyebrow mt-2">
          Class of {athlete.graduationYear}
        </p>
      )}
    </Link>
  );
}
