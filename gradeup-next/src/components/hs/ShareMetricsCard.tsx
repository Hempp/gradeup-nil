/**
 * ShareMetricsCard — brand-side deal detail read-only amplification view.
 *
 * Server-safe (no client state). Receives a `ShareCounts` payload from the
 * surrounding server component and renders totals, per-platform counts,
 * and the first/most-recent share timestamps. RLS on `deal_share_events`
 * enforces that only the brand that owns the deal can read these rows,
 * so the caller just passes what `getShareCountsForDeal` returned.
 *
 * No chart dependency — we keep Recharts out of this path to avoid a
 * 280KB hit on the brand dashboard. A table + simple proportion bars is
 * plenty at 20 parents of scale.
 */

import type { ShareCounts, EventPlatform } from '@/lib/hs-nil/share';

export interface ShareMetricsCardProps {
  counts: ShareCounts;
}

const PLATFORM_LABEL: Record<EventPlatform, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  x: 'X',
  tiktok: 'TikTok',
  copy_link: 'Copy link',
};

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ShareMetricsCard({ counts }: ShareMetricsCardProps) {
  const ordered: EventPlatform[] = [
    'instagram',
    'linkedin',
    'x',
    'tiktok',
    'copy_link',
  ];
  const max = Math.max(1, ...ordered.map((p) => counts.byPlatform[p]));

  return (
    <section
      aria-labelledby="share-metrics-heading"
      className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8"
    >
      <div className="flex items-center justify-between gap-3">
        <h3
          id="share-metrics-heading"
          className="font-display text-xl text-white"
        >
          Amplification
        </h3>
        <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
          {counts.total} {counts.total === 1 ? 'share' : 'shares'}
        </span>
      </div>

      <p className="mt-1 text-xs text-white/50">
        Clicks the athlete or parent registered on the celebration page.
      </p>

      {counts.total === 0 ? (
        <p className="mt-5 rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/60">
          No shares yet. The celebration page goes live as soon as the deal is
          fully signed.
        </p>
      ) : (
        <>
          <ul className="mt-5 space-y-3">
            {ordered.map((p) => {
              const count = counts.byPlatform[p];
              const pct = Math.round((count / max) * 100);
              return (
                <li key={p} className="text-sm text-white/80">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{PLATFORM_LABEL[p]}</span>
                    <span className="tabular-nums text-white/70">{count}</span>
                  </div>
                  <div
                    className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/5"
                    role="img"
                    aria-label={`${PLATFORM_LABEL[p]}: ${count} shares`}
                  >
                    <div
                      className="h-full rounded-full bg-[var(--accent-primary)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          <dl className="mt-6 grid gap-3 border-t border-white/10 pt-4 text-sm text-white/70 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-widest text-white/40">
                First share
              </dt>
              <dd className="mt-1 font-medium text-white/90">
                {formatTimestamp(counts.firstShareAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-white/40">
                Most recent
              </dt>
              <dd className="mt-1 font-medium text-white/90">
                {formatTimestamp(counts.lastShareAt)}
              </dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}

export default ShareMetricsCard;
