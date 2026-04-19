/**
 * HS Athlete Earnings — /hs/athlete/earnings
 *
 * Server Component. Auth-gated + HS-athlete-gated. Shows the full real-money
 * picture for a scholar-athlete across all completed deals (status IN
 * 'paid' | 'completed'). No estimates, no projections — every dollar here
 * has settled.
 *
 * Auth + role gating (mirrors /hs/athlete):
 *   - Unauthenticated → /login?next=/hs/athlete/earnings
 *   - Authenticated but no hs_athlete_profiles row → /hs/signup/athlete?notice=convert
 *
 * Data:
 *   - getAthleteEarningsSummary(userId) → aggregates
 *   - getAthleteCompletedDeals(userId, { limit: 50 }) → recent history
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  getAthleteEarningsSummary,
  getAthleteCompletedDeals,
} from '@/lib/hs-nil/earnings';
import { listDeferralsForAthlete } from '@/lib/hs-nil/deferred-payouts';
import { EarningsHeroCard } from '@/components/hs/EarningsHeroCard';
import { CompletedDealsTable } from '@/components/hs/CompletedDealsTable';

export const metadata: Metadata = {
  title: 'Your earnings — GradeUp HS',
  description:
    'Every dollar you have earned on GradeUp NIL, verified and accounted for.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HSAthleteEarningsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/hs/athlete/earnings');
  }

  const { data: profile } = await supabase
    .from('hs_athlete_profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) {
    redirect('/hs/signup/athlete?notice=convert');
  }

  const [summary, deals, deferrals] = await Promise.all([
    getAthleteEarningsSummary(supabase, user.id),
    getAthleteCompletedDeals(supabase, user.id, { limit: 50 }),
    listDeferralsForAthlete(user.id, supabase),
  ]);

  const heldDeferrals = deferrals.filter((d) => d.status === 'holding');
  const heldTotalCents = heldDeferrals.reduce(
    (sum, d) => sum + d.amount_cents,
    0,
  );

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-10">
        <div className="mb-6">
          <Link
            href="/hs/athlete"
            className="text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-3 font-display text-4xl text-white md:text-5xl">
            Your earnings
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">
            Every deal here is verified. Every dollar goes to your parent&rsquo;s
            custodian account. You earned this.
          </p>
        </div>

        {heldDeferrals.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/5 p-5 text-sm text-white/80">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-200">
              Earnings held in trust
            </p>
            <p className="mt-2">
              You have{' '}
              <strong className="text-white">
                ${Math.round(heldTotalCents / 100).toLocaleString()}
              </strong>{' '}
              in earnings held in trust until your 18th birthday under state
              athletic-association rules. Every penny is tracked and released
              automatically when eligible.{' '}
              <Link
                href="/hs/athlete/deferred-earnings"
                className="font-semibold text-[var(--accent-primary)] hover:underline"
              >
                See held earnings →
              </Link>
            </p>
          </div>
        )}

        <EarningsHeroCard summary={summary} />
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl text-white md:text-3xl">
            History
          </h2>
          <p className="text-xs uppercase tracking-widest text-white/40">
            Most recent first
          </p>
        </div>
        <div className="mt-4">
          <CompletedDealsTable
            role="athlete"
            deals={deals}
            emptyCopy="Your first completed deal will show up here."
          />
        </div>
      </section>
    </main>
  );
}
