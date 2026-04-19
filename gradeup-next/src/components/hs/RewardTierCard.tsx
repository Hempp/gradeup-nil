/**
 * RewardTierCard — top-of-dashboard surface for the referral-
 * rewards program.
 *
 * Shows the caller's current tier, progress toward the next tier,
 * and the ladder visualization. Render on /hs/parent/rewards and
 * (compact variant) above the funnel on /hs/parent/referrals.
 *
 * Presentational. Caller supplies data from server-side fetch.
 */

import Link from 'next/link';
import type {
  RewardTier,
  RewardTierId,
} from '@/lib/hs-nil/referral-rewards';
import { TierProgressBar } from './TierProgressBar';

interface RewardTierCardProps {
  currentTier: RewardTier | null;
  nextTier: RewardTier | null;
  conversionCount: number;
  ladder: readonly RewardTier[];
  /** When true, hides the ladder progress bar for a denser summary. */
  compact?: boolean;
  /** Hide the "see full rewards" link when the card already lives on /rewards. */
  hideDeepLink?: boolean;
}

function tierColor(id: RewardTierId | null): string {
  switch (id) {
    case 'platinum':
      return 'var(--accent-primary)';
    case 'gold':
      return '#FFD166';
    case 'silver':
      return '#B4B8BD';
    case 'bronze':
      return '#C68755';
    default:
      return 'rgba(255,255,255,0.3)';
  }
}

export function RewardTierCard({
  currentTier,
  nextTier,
  conversionCount,
  ladder,
  compact = false,
  hideDeepLink = false,
}: RewardTierCardProps) {
  const color = tierColor(currentTier?.id ?? null);
  const nextNeeded = nextTier
    ? Math.max(0, nextTier.minConversions - conversionCount)
    : null;

  return (
    <section
      aria-labelledby="reward-tier-heading"
      className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Referral rewards
          </p>
          <h2
            id="reward-tier-heading"
            className="mt-1 flex items-center gap-3 font-display text-3xl text-white"
          >
            {currentTier ? (
              <>
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                {currentTier.tierName}
              </>
            ) : (
              'No tier yet'
            )}
          </h2>
          {currentTier ? (
            <p className="mt-2 max-w-xl text-sm text-white/70">
              {currentTier.description}
            </p>
          ) : (
            <p className="mt-2 max-w-xl text-sm text-white/70">
              Invite three families who sign up with your code to unlock
              <span className="font-semibold text-white"> Bronze Referrer</span> and
              start earning perks.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Verified referrals
          </p>
          <p className="mt-1 font-display text-3xl text-white">
            {conversionCount}
          </p>
        </div>
      </div>

      {nextTier && nextNeeded !== null ? (
        <p className="mt-5 text-sm text-white/70">
          {nextNeeded === 0 ? (
            <>You just unlocked <strong className="text-white">{nextTier.tierName}</strong> — refresh to claim.</>
          ) : (
            <>
              <strong className="text-white">{nextNeeded}</strong> more to{' '}
              <strong className="text-white">{nextTier.tierName}</strong>
              {' '}({nextTier.minConversions} total).
            </>
          )}
        </p>
      ) : null}

      {!compact ? (
        <div className="mt-5">
          <TierProgressBar
            conversionCount={conversionCount}
            ladder={ladder.map((t) => ({
              id: t.id,
              tierName: t.tierName,
              minConversions: t.minConversions,
            }))}
          />
        </div>
      ) : null}

      {!hideDeepLink ? (
        <div className="mt-5">
          <Link
            href="/hs/parent/rewards"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent-primary)] hover:text-white"
          >
            See all rewards
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
      ) : null}
    </section>
  );
}

export default RewardTierCard;
