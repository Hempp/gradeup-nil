/**
 * AthleteDashboardCampaignsCard — compact athlete-dashboard widget
 * that surfaces the number of open campaigns in the athlete's state
 * (plus an "invited" badge if applicable). Server-side data is
 * passed in; the card itself is a link out to /hs/athlete/campaigns.
 */

import Link from 'next/link';

export interface AthleteDashboardCampaignsCardProps {
  openCount: number;
  invitedCount: number;
}

export function AthleteDashboardCampaignsCard(
  props: AthleteDashboardCampaignsCardProps,
) {
  const { openCount, invitedCount } = props;

  return (
    <Link
      href="/hs/athlete/campaigns"
      className="group block rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/25 hover:bg-white/[0.05]"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
        Campaigns
      </p>
      <p className="mt-2 font-display text-2xl text-white">
        {openCount === 0
          ? 'Nothing open right now.'
          : `${openCount} open ${openCount === 1 ? 'campaign' : 'campaigns'} for you.`}
      </p>
      <p className="mt-1 text-sm text-white/60">
        {invitedCount > 0
          ? `${invitedCount} include${invitedCount === 1 ? 's' : ''} a direct invite.`
          : 'Apply to any that fit your profile.'}
      </p>
      <p className="mt-3 text-xs font-semibold text-[var(--accent-primary)] group-hover:underline">
        Browse campaigns →
      </p>
    </Link>
  );
}
