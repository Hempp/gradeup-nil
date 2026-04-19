/**
 * /hs/admin/analytics — Founder analytics landing.
 *
 * One-pager that answers "is this thing working?": headline metrics
 * across the HS-NIL pilot with links to each detail page.
 *
 * Read-only. Admin-gated (404 for non-admins, mirrors /hs/admin).
 * ISR-cached at 60s so multiple admin eyes don't repeat the same aggregations.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MetricSummaryCard from '@/components/hs/analytics/MetricSummaryCard';
import {
  defaultRange,
  getSignupFunnel,
  getDealVolumeTimeSeries,
  getReferralGraphSummary,
  getMatchRankerQuality,
  getDisputeRate,
  getActivationByState,
  formatPct,
  formatCents,
  type SignupFunnel,
  type DealVolumePoint,
  type ReferralSummary,
  type MatchRankerQuality,
  type DisputeRate,
  type StateActivation,
} from '@/lib/hs-nil/analytics';

export const metadata: Metadata = {
  title: 'Analytics — GradeUp HS admin',
  description:
    'Founder-facing read-only analytics for the HS-NIL pilot: funnel, cohorts, deals, referrals, match quality.',
};

// 60-second ISR. Cheap protection against admin-refresh storms.
export const revalidate = 60;

async function requireAdminOr404(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (error || !profile || profile.role !== 'admin') notFound();
}

const EMPTY_FUNNEL: SignupFunnel = {
  waitlistCount: 0,
  invitedCount: 0,
  signupCount: 0,
  consentCount: 0,
  dealCount: 0,
  dealPaidCount: 0,
  shareCount: 0,
  stepRates: [],
};

const EMPTY_REFERRALS: ReferralSummary = {
  totalReferredClicks: 0,
  totalReferredSignups: 0,
  totalReferredConsents: 0,
  totalReferredFirstDeals: 0,
  clickToSignupRate: 0,
  signupToConsentRate: 0,
  topReferrers: [],
  referredSignupToConsent: 0,
  organicSignupToConsent: 0,
};

const EMPTY_RANKER: MatchRankerQuality = {
  suggestedCount: 0,
  proposedCount: 0,
  proposedRate: 0,
  completedCount: 0,
  completedRateAmongProposed: 0,
  avgDaysSuggestToPropose: null,
};

const EMPTY_DISPUTES: DisputeRate = {
  totalDeals: 0,
  totalDisputes: 0,
  disputesPer100Deals: 0,
  resolutionBreakdown: {},
};

export default async function HsAdminAnalyticsLanding() {
  await requireAdminOr404();

  const supabase = await createClient();
  const range = defaultRange(30);

  async function safe<T>(loader: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await loader();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[hs-admin/analytics] loader failed', err);
      return fallback;
    }
  }

  const [funnel, volume, referrals, ranker, disputes, states] =
    await Promise.all([
      safe(() => getSignupFunnel(supabase, range), EMPTY_FUNNEL),
      safe<DealVolumePoint[]>(
        () =>
          getDealVolumeTimeSeries(supabase, {
            ...range,
            granularity: 'day',
          }),
        []
      ),
      safe(() => getReferralGraphSummary(supabase, range), EMPTY_REFERRALS),
      safe(() => getMatchRankerQuality(supabase, range), EMPTY_RANKER),
      safe(() => getDisputeRate(supabase, range), EMPTY_DISPUTES),
      safe<StateActivation[]>(() => getActivationByState(supabase), []),
    ]);

  const dealCount7d = volume
    .slice(-7)
    .reduce((acc, p) => acc + p.count, 0);
  const amount30d = volume.reduce((acc, p) => acc + p.amountCents, 0);
  const sparkline = volume.slice(-14).map((p) => p.count);

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            HS-NIL · Analytics
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Is this thing working?
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/60">
            Last 30 days across the HS-NIL pilot. Read-only, 60-second
            refresh. Drill into a card for detail + filters.
          </p>
        </header>

        {/* Headline metrics */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricSummaryCard
            label="Waitlist → signup"
            value={formatPct(
              funnel.waitlistCount > 0
                ? funnel.signupCount / funnel.waitlistCount
                : 0
            )}
            subtext={`${funnel.signupCount} / ${funnel.waitlistCount} in 30d`}
            href="/hs/admin/analytics/funnel"
          />
          <MetricSummaryCard
            label="Deals signed (7d)"
            value={String(dealCount7d)}
            subtext={`${formatCents(amount30d)} · 30d total`}
            sparkline={sparkline.length > 1 ? sparkline : null}
            href="/hs/admin/analytics/deals"
          />
          <MetricSummaryCard
            label="Ranker accept rate"
            value={formatPct(ranker.proposedRate)}
            subtext={`${ranker.proposedCount} proposed of ${ranker.suggestedCount} suggested`}
            href="/hs/admin/analytics/match-quality"
          />
          <MetricSummaryCard
            label="Disputes / 100 deals"
            value={`${disputes.disputesPer100Deals.toFixed(1)}`}
            subtext={`${disputes.totalDisputes} disputes · ${disputes.totalDeals} deals`}
            positiveIsGood={false}
          />
        </div>

        {/* Secondary metrics row */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricSummaryCard
            label="Referred signups"
            value={String(referrals.totalReferredSignups)}
            subtext={`${formatPct(referrals.clickToSignupRate)} click→signup`}
            href="/hs/admin/analytics/referrals"
          />
          <MetricSummaryCard
            label="Consents signed"
            value={String(funnel.consentCount)}
            subtext={`${formatPct(funnel.stepRates.find((s) => s.to === 'consent')?.rate ?? 0)} of signups`}
          />
          <MetricSummaryCard
            label="Share events"
            value={String(funnel.shareCount)}
            subtext={`${funnel.dealPaidCount} paid deals`}
          />
        </div>

        {/* State activation */}
        <section
          className="mt-12 rounded-xl border border-white/10 bg-white/5 p-6"
          aria-labelledby="state-activation"
        >
          <header>
            <h2
              id="state-activation"
              className="font-display text-xl text-white md:text-2xl"
            >
              Activation by state
            </h2>
            <p className="mt-1 text-sm text-white/60">
              Cumulative. Shows where the pilot has critical mass.
            </p>
          </header>

          {states.length === 0 ? (
            <p className="mt-4 text-sm text-white/50">
              Failed to load state activation. Check logs.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-white/50">
                    <th className="px-3 py-2">State</th>
                    <th className="px-3 py-2 text-right">Waitlist</th>
                    <th className="px-3 py-2 text-right">Signups</th>
                    <th className="px-3 py-2 text-right">Conv.</th>
                    <th className="px-3 py-2 text-right">Active deals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {states.slice(0, 12).map((s) => (
                    <tr key={s.stateCode}>
                      <td className="px-3 py-2 font-mono font-semibold text-white/90">
                        {s.stateCode}
                      </td>
                      <td className="px-3 py-2 text-right text-white/80">
                        {s.waitlistCount}
                      </td>
                      <td className="px-3 py-2 text-right text-white/80">
                        {s.signupCount}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-white/80">
                        {formatPct(s.waitlistToSignup)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[var(--accent-primary)]">
                        {s.activeDealCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Nav to detail pages */}
        <section className="mt-12">
          <h2 className="font-display text-xl text-white">Go deeper</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ['Funnel', '/hs/admin/analytics/funnel', 'Waitlist → paid, with filters'],
              ['Cohorts', '/hs/admin/analytics/cohorts', 'Weekly retention heatmap'],
              ['Deals', '/hs/admin/analytics/deals', 'Volume + amount over time'],
              ['Referrals', '/hs/admin/analytics/referrals', 'Graph + top referrers'],
              ['Match quality', '/hs/admin/analytics/match-quality', 'Ranker performance deep-dive'],
            ].map(([label, href, subtext]) => (
              <li key={href}>
                <Link
                  href={href}
                  className="block rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/[0.08]"
                >
                  <p className="font-semibold text-white">{label}</p>
                  <p className="mt-0.5 text-xs text-white/60">{subtext}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-10 text-xs text-white/40">
          Read-only. Admin-gated via <code>profiles.role = &apos;admin&apos;</code>.
          Cached for 60s.{' '}
          <Link
            href="/hs/admin"
            className="underline decoration-white/30 underline-offset-2 hover:text-white/60"
          >
            ← Back to ops dashboard
          </Link>
        </p>
      </section>
    </main>
  );
}
