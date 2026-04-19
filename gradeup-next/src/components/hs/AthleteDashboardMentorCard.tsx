/**
 * AthleteDashboardMentorCard — compact summary card for the athlete dashboard.
 *
 * Exported from /components/hs so a future dashboard-integration pass can drop
 * it into /hs/athlete/page.tsx. Another agent owns that page this phase.
 *
 * Two states:
 *   - activeSessions > 0 → show count + CTA to thread list
 *   - activeSessions === 0 → show "Find a mentor" CTA to /hs/alumni
 *
 * Works entirely from server-rendered props so it can sit inside an async
 * server component without any client-side data fetch.
 */

import Link from 'next/link';

export interface AthleteDashboardMentorCardProps {
  /** Count of accepted + pending sessions the athlete has open. */
  activeSessions: number;
  /** Count of pending requests awaiting a mentor response (subset of active). */
  pendingCount: number;
}

export function AthleteDashboardMentorCard({
  activeSessions,
  pendingCount,
}: AthleteDashboardMentorCardProps) {
  const hasActive = activeSessions > 0;
  const title = hasActive
    ? `You have ${activeSessions} mentor session${activeSessions === 1 ? '' : 's'} open.`
    : 'Talk to an alum who just walked your path.';
  const description = hasActive
    ? pendingCount > 0
      ? `${pendingCount} still waiting on a mentor response.`
      : 'Open the thread and keep the conversation moving.'
    : 'Verified college athletes who came through GradeUp are mentoring the next class.';
  const href = hasActive ? '/hs/athlete/mentor-sessions' : '/hs/alumni';
  const ctaLabel = hasActive ? 'Open your sessions' : 'Find a mentor';

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
        Alumni mentor network
      </p>
      <h3 className="mt-2 font-display text-lg text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/70">{description}</p>
      <Link
        href={href}
        className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

export default AthleteDashboardMentorCard;
