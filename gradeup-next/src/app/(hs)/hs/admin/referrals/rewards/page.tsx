/**
 * /hs/admin/referrals/rewards — Admin reward-ops dashboard.
 *
 * Server Component. Admin-only: non-admins 404.
 *
 * Surfaces:
 *   - Tier distribution (how many users at each tier).
 *   - Recent grants (last 50, with actor + reason).
 *   - Count of active perks by type (health check).
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  createClient as createServiceClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import {
  getRewardTierLadder,
  type RewardTierId,
} from '@/lib/hs-nil/referral-rewards';

export const metadata: Metadata = {
  title: 'Referral rewards ops — GradeUp HS',
  description:
    'Admin view of referral-reward grants, tier distribution, and active perk counts.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface GrantRow {
  id: string;
  user_id: string;
  tier_id: string;
  awarded_at: string;
  awarded_by: string;
  conversion_count_at_award: number;
  metadata: Record<string, unknown> | null;
}

interface PerkCountRow {
  perk_name: string;
}

function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase service role not configured.');
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || profile.role !== 'admin') notFound();
  return user.id;
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function HSAdminRewardsPage() {
  await requireAdmin();

  const ladder = getRewardTierLadder();
  const sb = getServiceClient();

  // Tier distribution. Count users at their highest tier only — if
  // someone has bronze + silver, they should appear in silver. We
  // compute this client-side from the full grant set since there
  // are <1000 grants expected in the pilot.
  let grants: GrantRow[] = [];
  let perkCounts = new Map<string, number>();
  let recentGrants: GrantRow[] = [];

  try {
    const nowIso = new Date().toISOString();
    const [allGrantsRes, recentGrantsRes, perkRes] = await Promise.all([
      sb
        .from('referral_reward_grants')
        .select(
          'id, user_id, tier_id, awarded_at, awarded_by, conversion_count_at_award, metadata'
        ),
      sb
        .from('referral_reward_grants')
        .select(
          'id, user_id, tier_id, awarded_at, awarded_by, conversion_count_at_award, metadata'
        )
        .order('awarded_at', { ascending: false })
        .limit(50),
      sb
        .from('referral_perk_activations')
        .select('perk_name')
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
    ]);

    grants = (allGrantsRes.data as GrantRow[] | null) ?? [];
    recentGrants = (recentGrantsRes.data as GrantRow[] | null) ?? [];

    perkCounts = new Map<string, number>();
    for (const p of (perkRes.data as PerkCountRow[] | null) ?? []) {
      perkCounts.set(p.perk_name, (perkCounts.get(p.perk_name) ?? 0) + 1);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-admin-rewards] load failed', err);
  }

  // Highest tier per user.
  const priority: Record<RewardTierId, number> = {
    bronze: 1,
    silver: 2,
    gold: 3,
    platinum: 4,
  };
  const topTierByUser = new Map<string, RewardTierId>();
  for (const g of grants) {
    const tid = g.tier_id as RewardTierId;
    if (!priority[tid]) continue;
    const existing = topTierByUser.get(g.user_id);
    if (!existing || priority[tid] > priority[existing]) {
      topTierByUser.set(g.user_id, tid);
    }
  }

  const tierCounts = new Map<RewardTierId, number>();
  for (const tier of Array.from(topTierByUser.values())) {
    tierCounts.set(tier, (tierCounts.get(tier) ?? 0) + 1);
  }

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Link
          href="/hs/admin/referrals"
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
          Back to referral ops
        </Link>

        <h1 className="mt-4 font-display text-4xl md:text-5xl">
          Reward ops.
        </h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Tier distribution, recent grants, and active-perk counts across the
          pilot.
        </p>

        {/* Tier distribution */}
        <section className="mt-10 grid gap-3 md:grid-cols-4">
          {ladder.map((tier) => {
            const count = tierCounts.get(tier.id) ?? 0;
            return (
              <div
                key={tier.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
                  {tier.tierName}
                </p>
                <p className="mt-2 font-display text-4xl text-white">{count}</p>
                <p className="mt-2 text-xs text-white/50">
                  ≥ {tier.minConversions} verified signups
                </p>
              </div>
            );
          })}
        </section>

        {/* Active perk counts */}
        <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-display text-2xl text-white">Active perks</h2>
          <p className="mt-2 text-sm text-white/60">
            Non-expired perk activations, grouped by type.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {Array.from(perkCounts.entries()).length === 0 ? (
              <p className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/50">
                No active perks yet.
              </p>
            ) : (
              Array.from(perkCounts.entries()).map(([perk, count]) => (
                <div
                  key={perk}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3"
                >
                  <div className="text-xs font-mono text-white/50">{perk}</div>
                  <div className="mt-1 font-display text-2xl text-white">
                    {count}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Recent grants */}
        <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-display text-2xl text-white">Recent grants</h2>
          <p className="mt-2 text-sm text-white/60">
            Last 50 grants, newest first. Ops-granted rows show the actor
            user id.
          </p>

          {recentGrants.length === 0 ? (
            <p className="mt-6 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/50">
              No grants yet.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-widest text-white/50">
                    <th className="px-3 py-2 font-semibold">When</th>
                    <th className="px-3 py-2 font-semibold">User</th>
                    <th className="px-3 py-2 font-semibold">Tier</th>
                    <th className="px-3 py-2 font-semibold">Convs</th>
                    <th className="px-3 py-2 font-semibold">Awarded by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentGrants.map((g) => (
                    <tr key={g.id} className="text-white/80">
                      <td className="px-3 py-2 text-white/60">
                        {fmtDateTime(g.awarded_at)}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {g.user_id.slice(0, 8)}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/80">
                          {g.tier_id}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-white/60">
                        {g.conversion_count_at_award}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-white/60">
                        {g.awarded_by === 'system'
                          ? 'system'
                          : g.awarded_by.slice(0, 8)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
