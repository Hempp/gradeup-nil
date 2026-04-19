/**
 * ReferralLeaderboard — Top referrers list (dark theme).
 *
 * Stateless server-safe component. Caller decides privacy by passing
 * `masked: true` (first-name + last-initial) or full names.
 *
 * Highlights the caller's row when `highlightUserId` matches.
 */

import type { LeaderboardEntry } from '@/lib/hs-nil/referrals';
import { maskLastName } from '@/lib/hs-nil/referrals';

interface ReferralLeaderboardProps {
  entries: LeaderboardEntry[];
  masked: boolean;
  highlightUserId?: string | null;
  /** Caller's own rank in the overall leaderboard, if outside the top N. */
  callerRank?: number | null;
  callerSignups?: number;
  title?: string;
  description?: string;
}

export function ReferralLeaderboard({
  entries,
  masked,
  highlightUserId,
  callerRank,
  callerSignups,
  title = 'Top referrers',
  description = 'Parents and athletes bringing the most families onto GradeUp.',
}: ReferralLeaderboardProps) {
  return (
    <section
      aria-labelledby="referral-leaderboard-heading"
      className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
    >
      <h2
        id="referral-leaderboard-heading"
        className="font-display text-2xl text-white"
      >
        {title}
      </h2>
      <p className="mt-2 text-sm text-white/60">{description}</p>

      {entries.length === 0 ? (
        <p className="mt-6 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/50">
          No referrals yet. Be the first on the board.
        </p>
      ) : (
        <ol className="mt-6 divide-y divide-white/5 rounded-xl border border-white/10 bg-black/30">
          {entries.map((entry, i) => {
            const isCaller = highlightUserId === entry.referringUserId;
            const display = masked
              ? maskLastName(entry.firstName, entry.lastName)
              : [entry.firstName, entry.lastName].filter(Boolean).join(' ').trim() ||
                'Unknown';
            return (
              <li
                key={entry.referringUserId}
                className={`flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors ${
                  isCaller
                    ? 'bg-[var(--accent-primary)]/10'
                    : 'hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs ${
                      isCaller
                        ? 'bg-[var(--accent-primary)] text-black'
                        : 'bg-white/10 text-white/70'
                    }`}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`font-semibold ${
                      isCaller ? 'text-white' : 'text-white/90'
                    }`}
                  >
                    {display}
                    {isCaller && (
                      <span className="ml-2 text-xs font-normal uppercase tracking-widest text-[var(--accent-primary)]">
                        You
                      </span>
                    )}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-display text-lg text-white">
                    {entry.signupsCompleted}
                  </div>
                  <div className="text-xs text-white/50">
                    {entry.signupsCompleted === 1 ? 'signup' : 'signups'}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {typeof callerRank === 'number' &&
        callerRank > entries.length &&
        typeof callerSignups === 'number' && (
          <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
            You&rsquo;re ranked <strong className="text-white">#{callerRank}</strong>{' '}
            with <strong className="text-white">{callerSignups}</strong>{' '}
            signup{callerSignups === 1 ? '' : 's'}. Keep sharing to climb the
            board.
          </p>
        )}
    </section>
  );
}

export default ReferralLeaderboard;
