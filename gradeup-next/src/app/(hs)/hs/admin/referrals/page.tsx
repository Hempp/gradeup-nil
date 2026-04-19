/**
 * /hs/admin/referrals — Admin leaderboard + funnel view.
 *
 * Server Component. Admin-only: non-admins 404.
 *
 * Surfaces:
 *   - Top referrers (full names, unmasked).
 *   - Aggregate funnel totals across ALL referrers.
 *   - Recent click/signup activity table (last 20).
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getLeaderboard } from '@/lib/hs-nil/referrals';
import { getTopTierByUser } from '@/lib/hs-nil/referral-rewards';
import { ReferralLeaderboard } from '@/components/hs/ReferralLeaderboard';

export const metadata: Metadata = {
  title: 'Referral ops — GradeUp HS',
  description: 'Admin view of referral activity, top referrers, and funnel.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface AggregateStats {
  clicks: number;
  signupsCompleted: number;
  consentsSigned: number;
  firstDealsSigned: number;
}

interface RecentRow {
  id: string;
  referring_user_id: string;
  referred_user_id: string | null;
  referred_email: string | null;
  role_signed_up_as: string | null;
  converted_at: string | null;
  created_at: string;
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

export default async function HSAdminReferralsPage() {
  await requireAdmin();
  const supabase = await createClient();

  // Aggregates — the admin view runs under the admin's session; RLS
  // on our tables allows service-role bypass, but admin SELECTs go
  // through the anon key. We rely on the `admin` role having
  // read-all privileges through the standard admin-bypass policies
  // already present elsewhere in the codebase, OR we fail-soft.
  let aggregates: AggregateStats = {
    clicks: 0,
    signupsCompleted: 0,
    consentsSigned: 0,
    firstDealsSigned: 0,
  };
  let recent: RecentRow[] = [];
  let leaderboard: Awaited<ReturnType<typeof getLeaderboard>> = [];

  try {
    const [attrCount, convertedCount, consentCount, dealCount, recentRes, lb] =
      await Promise.all([
        supabase
          .from('referral_attributions')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('referral_attributions')
          .select('id', { count: 'exact', head: true })
          .not('referred_user_id', 'is', null),
        supabase
          .from('referral_conversion_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'first_consent_signed'),
        supabase
          .from('referral_conversion_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'first_deal_signed'),
        supabase
          .from('referral_attributions')
          .select(
            'id, referring_user_id, referred_user_id, referred_email, role_signed_up_as, converted_at, created_at'
          )
          .order('created_at', { ascending: false })
          .limit(20),
        getLeaderboard(20),
      ]);

    aggregates = {
      clicks: attrCount.count ?? 0,
      signupsCompleted: convertedCount.count ?? 0,
      consentsSigned: consentCount.count ?? 0,
      firstDealsSigned: dealCount.count ?? 0,
    };
    recent = (recentRes.data as RecentRow[] | null) ?? [];
    leaderboard = lb;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-admin-referrals] load failed', err);
  }

  let tierByUserId: Awaited<ReturnType<typeof getTopTierByUser>> = new Map();
  if (leaderboard.length > 0) {
    try {
      tierByUserId = await getTopTierByUser(
        leaderboard.map((e) => e.referringUserId)
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[hs-admin-referrals] tier lookup failed', err);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Link
          href="/hs/admin"
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
          Back to admin
        </Link>

        <h1 className="mt-4 font-display text-4xl md:text-5xl">
          Referral ops.
        </h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Top referrers, aggregate funnel, and recent attribution activity.
          Measures the &ldquo;5 unprompted parent-to-parent referrals in 30
          days&rdquo; success criterion.
        </p>

        {/* Aggregate funnel */}
        <section className="mt-10 grid gap-3 md:grid-cols-4">
          {[
            ['Clicks', aggregates.clicks],
            ['Signed up', aggregates.signupsCompleted],
            ['Consent', aggregates.consentsSigned],
            ['First deal', aggregates.firstDealsSigned],
          ].map(([label, n]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
                {label}
              </p>
              <p className="mt-2 font-display text-4xl text-white">{n}</p>
            </div>
          ))}
        </section>

        {/* Leaderboard — full names (admin view) */}
        <section className="mt-10">
          <ReferralLeaderboard
            entries={leaderboard}
            masked={false}
            title="Top referrers (unmasked)"
            description="Admin-only view. Full names for ops follow-up."
            tierByUserId={tierByUserId}
          />
        </section>

        {/* Recent activity */}
        <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-display text-2xl text-white">Recent activity</h2>
          <p className="mt-2 text-sm text-white/60">
            Last 20 attributions, newest first.
          </p>

          {recent.length === 0 ? (
            <p className="mt-6 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/50">
              No referral activity yet.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-widest text-white/50">
                    <th className="px-3 py-2 font-semibold">When</th>
                    <th className="px-3 py-2 font-semibold">Referrer</th>
                    <th className="px-3 py-2 font-semibold">Referred</th>
                    <th className="px-3 py-2 font-semibold">Role</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recent.map((r) => (
                    <tr key={r.id} className="text-white/80">
                      <td className="px-3 py-2 text-white/60">
                        {fmtDateTime(r.created_at)}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {r.referring_user_id.slice(0, 8)}
                      </td>
                      <td className="px-3 py-2">
                        {r.referred_email ??
                          (r.referred_user_id
                            ? `user ${r.referred_user_id.slice(0, 8)}`
                            : '(pending)')}
                      </td>
                      <td className="px-3 py-2 text-white/60">
                        {r.role_signed_up_as ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        {r.converted_at ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-200">
                            Converted
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/60">
                            Clicked
                          </span>
                        )}
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
