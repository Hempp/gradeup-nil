/**
 * /hs/admin/analytics/funnel — detailed signup funnel with filters.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DateRangePicker from '@/components/hs/analytics/DateRangePicker';
import StateFilter from '@/components/hs/analytics/StateFilter';
import FunnelChart from '@/components/hs/analytics/FunnelChart';
import {
  getSignupFunnel,
  parseRangeParams,
  formatPct,
  type SignupFunnel,
} from '@/lib/hs-nil/analytics';

export const metadata: Metadata = {
  title: 'Funnel — HS-NIL analytics',
};
export const revalidate = 60;

async function requireAdminOr404() {
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

async function loadStateOptions(): Promise<
  Array<{ code: string; label: string }>
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('state_nil_rules')
    .select('state_code, status')
    .order('state_code', { ascending: true });
  return (
    (data ?? []) as Array<{ state_code: string; status: string }>
  ).map((r) => ({
    code: r.state_code,
    label: r.state_code,
  }));
}

const EMPTY: SignupFunnel = {
  waitlistCount: 0,
  invitedCount: 0,
  signupCount: 0,
  consentCount: 0,
  dealCount: 0,
  dealPaidCount: 0,
  shareCount: 0,
  stepRates: [],
};

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string; state?: string }>;
}

export default async function FunnelAnalyticsPage({ searchParams }: PageProps) {
  await requireAdminOr404();

  const sp = await searchParams;
  const range = parseRangeParams({ from: sp.from, to: sp.to }, 90);
  const stateCode = sp.state && sp.state !== 'all' ? sp.state : null;

  const supabase = await createClient();
  const stateOptions = await loadStateOptions();
  let funnel: SignupFunnel = EMPTY;
  try {
    funnel = await getSignupFunnel(supabase, { ...range, stateCode });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[analytics/funnel] load failed', err);
  }

  const steps = [
    { label: 'Waitlist', count: funnel.waitlistCount },
    {
      label: 'Invited',
      count: funnel.invitedCount,
      rateFromPrev: funnel.stepRates.find((s) => s.to === 'invited')?.rate,
    },
    {
      label: 'Signup',
      count: funnel.signupCount,
      rateFromPrev: funnel.stepRates.find((s) => s.to === 'signup')?.rate,
    },
    {
      label: 'Consent',
      count: funnel.consentCount,
      rateFromPrev: funnel.stepRates.find((s) => s.to === 'consent')?.rate,
    },
    {
      label: 'Deal signed',
      count: funnel.dealCount,
      rateFromPrev: funnel.stepRates.find((s) => s.to === 'deal_signed')?.rate,
    },
    {
      label: 'Deal paid',
      count: funnel.dealPaidCount,
      rateFromPrev: funnel.stepRates.find((s) => s.to === 'deal_paid')?.rate,
    },
    {
      label: 'Shared',
      count: funnel.shareCount,
      rateFromPrev: funnel.stepRates.find((s) => s.to === 'share')?.rate,
    },
  ];

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            HS-NIL · Analytics
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Signup funnel
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/60">
            Waitlist → invited → signed up → consent → deal signed → paid →
            shared. Default window is 90 days; state filter is optional.
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <DateRangePicker defaultDays={90} />
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <StateFilter options={stateOptions} />
            </div>
          </div>
        </header>

        <section
          className="mt-10 rounded-xl border border-white/10 bg-white/5 p-6"
          aria-labelledby="funnel-chart"
        >
          <h2
            id="funnel-chart"
            className="font-display text-xl text-white md:text-2xl"
          >
            Funnel chart
          </h2>
          <div className="mt-4">
            <FunnelChart steps={steps} />
          </div>
        </section>

        <section
          className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6"
          aria-labelledby="funnel-table"
        >
          <h2
            id="funnel-table"
            className="font-display text-xl text-white md:text-2xl"
          >
            Step-by-step
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-white/50">
                  <th className="px-3 py-2">Step</th>
                  <th className="px-3 py-2 text-right">Count</th>
                  <th className="px-3 py-2 text-right">Conv. from prev</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {steps.map((s, i) => (
                  <tr key={s.label}>
                    <td className="px-3 py-2 text-white/90">{s.label}</td>
                    <td className="px-3 py-2 text-right font-mono text-white/80">
                      {s.count}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-white/70">
                      {i === 0 ? '—' : formatPct(s.rateFromPrev ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-10 text-xs text-white/40">
          Filters persist via URL params — copy the link to share a filtered
          view.{' '}
          <Link
            href="/hs/admin/analytics"
            className="underline decoration-white/30 underline-offset-2 hover:text-white/60"
          >
            ← Analytics home
          </Link>
        </p>
      </section>
    </main>
  );
}
