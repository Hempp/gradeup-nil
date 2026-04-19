/**
 * TierProgressBar — 4-segment visual progression across the
 * bronze → silver → gold → platinum ladder. Each segment fills
 * proportionally to the user's progress toward that tier's
 * minimum conversion threshold.
 *
 * Pure / presentational. No data fetching.
 */

import type { RewardTierId } from '@/lib/hs-nil/referral-rewards';

interface TierProgressBarProps {
  /** Caller's actual verified-conversion count. */
  conversionCount: number;
  /** Ladder thresholds keyed by tier id. */
  ladder: Array<{
    id: RewardTierId;
    tierName: string;
    minConversions: number;
  }>;
}

export function TierProgressBar({
  conversionCount,
  ladder,
}: TierProgressBarProps) {
  const sorted = [...ladder].sort(
    (a, b) => a.minConversions - b.minConversions
  );

  return (
    <div className="w-full" role="group" aria-label="Tier progress">
      <div className="flex items-center gap-2">
        {sorted.map((tier, i) => {
          const prevMin = i === 0 ? 0 : sorted[i - 1].minConversions;
          const span = Math.max(1, tier.minConversions - prevMin);
          const filled = Math.max(
            0,
            Math.min(1, (conversionCount - prevMin) / span)
          );
          const achieved = conversionCount >= tier.minConversions;
          const tierColor =
            tier.id === 'platinum'
              ? 'var(--accent-primary)'
              : tier.id === 'gold'
                ? '#FFD166'
                : tier.id === 'silver'
                  ? '#B4B8BD'
                  : '#C68755';

          return (
            <div
              key={tier.id}
              className="flex-1"
              aria-label={`${tier.tierName} — ${tier.minConversions} conversions`}
            >
              <div className="h-2 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${filled * 100}%`,
                    backgroundColor: achieved ? tierColor : tierColor + '80',
                  }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span
                  className={
                    achieved
                      ? 'font-semibold text-white'
                      : 'text-white/60'
                  }
                >
                  {tier.tierName.replace(' Referrer', '')}
                </span>
                <span className="font-mono text-white/50">
                  {tier.minConversions}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TierProgressBar;
