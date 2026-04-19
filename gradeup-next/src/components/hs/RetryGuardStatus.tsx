/**
 * RetryGuardStatus — server-friendly list of active retry guards.
 *
 * Shows what targets are currently cooling down (and how much longer).
 * Useful to the operator before firing a bulk action so they know which
 * rows will be skipped.
 */

import type { ActiveRetryGuard } from '@/lib/hs-nil/retry-guards';
import { RETRY_GUARD_COOLDOWN_MINUTES } from '@/lib/hs-nil/retry-guards';

export function RetryGuardStatus({
  guards,
}: {
  guards: ActiveRetryGuard[];
}) {
  if (guards.length === 0) {
    return (
      <p className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
        No active retry guards — every target is eligible for immediate
        retry.
      </p>
    );
  }

  const now = Date.now();

  return (
    <ul className="space-y-2">
      {guards.slice(0, 25).map((g) => {
        const cooldown = RETRY_GUARD_COOLDOWN_MINUTES[g.target_kind];
        const unblockMs =
          new Date(g.last_retry_at).getTime() + cooldown * 60 * 1000;
        const remaining = Math.max(0, Math.ceil((unblockMs - now) / 1000));
        const blocked = remaining > 0;
        return (
          <li
            key={`${g.target_kind}-${g.target_id}`}
            className="flex flex-wrap items-center gap-3 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs"
          >
            <span className="rounded bg-white/10 px-2 py-0.5 font-semibold uppercase tracking-widest text-white/80">
              {g.target_kind}
            </span>
            <span className="font-mono text-white/80">
              {g.target_id.slice(0, 8)}
            </span>
            <span className="text-white/50">{g.last_action ?? '—'}</span>
            <span
              className={
                blocked ? 'text-amber-200' : 'text-emerald-200'
              }
            >
              {blocked
                ? `cools in ${formatSeconds(remaining)}`
                : 'eligible'}
            </span>
          </li>
        );
      })}
      {guards.length > 25 ? (
        <li className="text-xs text-white/40">
          … and {guards.length - 25} more.
        </li>
      ) : null}
    </ul>
  );
}

function formatSeconds(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return rs ? `${m}m ${rs}s` : `${m}m`;
}

export default RetryGuardStatus;
