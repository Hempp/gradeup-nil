/**
 * /hs/parent/rewards — Full referral-rewards dashboard.
 *
 * Server Component. Composition:
 *   - RewardTierCard (current tier + progress bar)
 *   - Active perks panel (inline pills, expiry annotated)
 *   - Grant history table
 *
 * Role gate: hs_parent and hs_athlete only. Non-HS users redirect.
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  getUserRewardSummary,
  getRewardTierLadder,
  type RewardTier,
} from '@/lib/hs-nil/referral-rewards';
import { RewardTierCard } from '@/components/hs/RewardTierCard';
import { RewardPerkBadge } from '@/components/hs/RewardPerkBadge';

export const metadata: Metadata = {
  title: 'Referral rewards — GradeUp HS',
  description:
    'Your tier, perks, and grant history for parent-to-parent referrals on GradeUp HS.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function HSParentRewardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirectTo=/hs/parent/rewards');

  const meta = (user.user_metadata ?? {}) as { role?: string };
  if (meta.role !== 'hs_parent' && meta.role !== 'hs_athlete') {
    redirect('/hs');
  }

  const ladder = getRewardTierLadder();
  let summary: Awaited<ReturnType<typeof getUserRewardSummary>> = {
    currentTier: null,
    nextTier: null,
    conversionCount: 0,
    grants: [],
    activePerks: [],
  };
  try {
    summary = await getUserRewardSummary(user.id);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-parent-rewards] summary load failed', err);
  }

  const tierLookup = new Map<string, RewardTier>(
    ladder.map((t) => [t.id, t])
  );

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <Link
          href="/hs/parent/referrals"
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
          Back to referrals
        </Link>

        <h1 className="mt-4 font-display text-4xl md:text-5xl">
          Your rewards.
        </h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Every family who signs up with your code pushes you toward the
          next tier. Perks apply automatically to your account and your
          linked athletes.
        </p>

        <div className="mt-10 space-y-8">
          <RewardTierCard
            currentTier={summary.currentTier}
            nextTier={summary.nextTier}
            conversionCount={summary.conversionCount}
            ladder={ladder}
            hideDeepLink
          />

          <section
            aria-labelledby="active-perks-heading"
            className="rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <h2
              id="active-perks-heading"
              className="font-display text-2xl text-white"
            >
              Active perks
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Perks currently attached to your account. Expiring perks show
              the date they lapse.
            </p>

            {summary.activePerks.length === 0 ? (
              <p className="mt-6 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/50">
                No active perks yet. Reach Bronze (3 verified referrals) to
                unlock your first.
              </p>
            ) : (
              <div className="mt-6 flex flex-wrap gap-3">
                {summary.activePerks.map((p) => (
                  <RewardPerkBadge
                    key={p.id}
                    perkName={p.perkName}
                    expiresAt={p.expiresAt}
                  />
                ))}
              </div>
            )}
          </section>

          <section
            aria-labelledby="grant-history-heading"
            className="rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <h2
              id="grant-history-heading"
              className="font-display text-2xl text-white"
            >
              Grant history
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Every tier you&rsquo;ve unlocked, newest first. Each grant is
              a permanent milestone.
            </p>

            {summary.grants.length === 0 ? (
              <p className="mt-6 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/50">
                No grants yet.
              </p>
            ) : (
              <ol className="mt-6 divide-y divide-white/5 rounded-xl border border-white/10 bg-black/30">
                {summary.grants.map((g) => {
                  const tier = tierLookup.get(g.tierId);
                  return (
                    <li
                      key={g.id}
                      className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                    >
                      <div>
                        <div className="font-semibold text-white">
                          {tier?.tierName ?? g.tierId}
                        </div>
                        <div className="mt-0.5 text-xs text-white/50">
                          Awarded at {g.conversionCountAtAward} verified signups
                          {g.awardedBy !== 'system' ? ' (ops grant)' : ''}
                        </div>
                      </div>
                      <div className="text-right text-xs text-white/60">
                        {fmtDateTime(g.awardedAt)}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
