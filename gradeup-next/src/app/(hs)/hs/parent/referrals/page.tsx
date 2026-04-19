/**
 * /hs/parent/referrals — Expanded referrals view for HS parents + athletes.
 *
 * Server Component. Composition:
 *   - ReferralCodeCard (client, hydrates via API) — the invite code + CTAs.
 *   - ReferralFunnelCard — Clicked → Signed up → Consent → First deal.
 *   - ReferralLeaderboard (masked) — top 10 referrers, caller highlighted.
 *
 * Role gate: hs_parent and hs_athlete only. Non-HS users redirect
 * back to /hs.
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  getFunnelStatsForUser,
  getLeaderboard,
} from '@/lib/hs-nil/referrals';
import { ReferralCodeCard } from '@/components/hs/ReferralCodeCard';
import { ReferralFunnelCard } from '@/components/hs/ReferralFunnelCard';
import { ReferralLeaderboard } from '@/components/hs/ReferralLeaderboard';

export const metadata: Metadata = {
  title: 'Your referrals — GradeUp HS',
  description:
    'See every parent you\u2019ve invited to GradeUp HS and where they are in the funnel.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HSParentReferralsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?redirectTo=/hs/parent/referrals');

  const meta = (user.user_metadata ?? {}) as { role?: string };
  if (meta.role !== 'hs_parent' && meta.role !== 'hs_athlete') {
    redirect('/hs');
  }

  // Fetch funnel + leaderboard concurrently. Both fail-closed to
  // empty-state fixtures so the page always renders.
  let stats = {
    clicks: 0,
    signupsCompleted: 0,
    consentsSigned: 0,
    firstDealsSigned: 0,
  };
  let leaderboard: Awaited<ReturnType<typeof getLeaderboard>> = [];
  try {
    const [s, lb] = await Promise.all([
      getFunnelStatsForUser(user.id),
      getLeaderboard(10),
    ]);
    stats = {
      clicks: s.clicks,
      signupsCompleted: s.signupsCompleted,
      consentsSigned: s.consentsSigned,
      firstDealsSigned: s.firstDealsSigned,
    };
    leaderboard = lb;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-parent-referrals] load failed', err);
  }

  // Caller's rank (if outside the top 10 we still show the row below).
  let callerRank: number | null = null;
  const inBoard = leaderboard.findIndex(
    (e) => e.referringUserId === user.id
  );
  if (inBoard >= 0) {
    callerRank = inBoard + 1;
  } else if (stats.signupsCompleted > 0) {
    try {
      const full = await getLeaderboard(500);
      const idx = full.findIndex((e) => e.referringUserId === user.id);
      callerRank = idx >= 0 ? idx + 1 : null;
    } catch {
      callerRank = null;
    }
  }

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <Link
          href="/hs/parent"
          className="inline-flex items-center gap-1 text-sm text-white/60 transition-colors hover:text-white"
        >
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
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          Back to dashboard
        </Link>

        <h1 className="mt-4 font-display text-4xl md:text-5xl">
          Your referrals.
        </h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Every family that joined GradeUp with your code, and where they are
          in the funnel. We&rsquo;ll email you as each milestone happens.
        </p>

        <div className="mt-10 space-y-8">
          <ReferralCodeCard
            signupsThisMonth={stats.signupsCompleted}
          />

          <ReferralFunnelCard stats={stats} />

          <ReferralLeaderboard
            entries={leaderboard}
            masked
            highlightUserId={user.id}
            callerRank={callerRank}
            callerSignups={stats.signupsCompleted}
          />
        </div>
      </div>
    </main>
  );
}
