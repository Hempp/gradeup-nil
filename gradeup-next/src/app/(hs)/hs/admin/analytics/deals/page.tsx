/**
 * /hs/admin/analytics/deals — deal volume time series + state breakdown.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DateRangePicker from '@/components/hs/analytics/DateRangePicker';
import DealVolumeChart from '@/components/hs/analytics/DealVolumeChart';
import {
  getDealVolumeTimeSeries,
  getActivationByState,
  parseRangeParams,
  formatCents,
  formatPct,
  type DealVolumePoint,
  type StateActivation,
} from '@/lib/hs-nil/analytics';

export const metadata: Metadata = {
  title: 'Deals — HS-NIL analytics',
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

interface PageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    granularity?: 'day' | 'week' | 'month';
  }>;
}

export default async function DealsAnalyticsPage({ searchParams }: PageProps) {
  await requireAdminOr404();

  const sp = await searchParams;
  const range = parseRangeParams({ from: sp.from, to: sp.to }, 90);
  const granularity: 'day' | 'week' | 'month' =
    sp.granularity === 'week' || sp.granularity === 'month'
      ? sp.granularity
      : 'day';

  const supabase = await createClient();
  let series: DealVolumePoint[] = [];
  let states: StateActivation[] = [];
  try {
    [series, states] = await Promise.all([
      getDealVolumeTimeSeries(supabase, { ...range, granularity }),
      getActivationByState(supabase),
    ]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[analytics/deals] load failed', err);
  }

  const totalCount = series.reduce((a, p) => a + p.count, 0);
  const totalAmount = series.reduce((a, p) => a + p.amountCents, 0);

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            HS-NIL · Analytics
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Deal volume
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/60">
            Count of HS deals signed per bucket, plus total compensation.
            Default: last 90 days, daily buckets.
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <DateRangePicker defaultDays={90} />
            <form
              method="get"
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <label className="flex flex-col text-xs">
                <span className="mb-1 font-semibold uppercase tracking-wider text-white/50">
                  Bucket
                </span>
                <select
                  name="granularity"
                  defaultValue={granularity}
                  className="w-32 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </label>
            </form>
          </div>
        </header>

        <section
          className="mt-10 rounded-xl border border-white/10 bg-white/5 p-6"
          aria-labelledby="volume-chart"
        >
          <header className="flex flex-wrap items-baseline justify-between gap-4">
            <h2
              id="volume-chart"
              className="font-display text-xl text-white md:text-2xl"
            >
              Volume over time
            </h2>
            <p className="text-sm text-white/60">
              <span className="font-mono text-white/80">{totalCount}</span>{' '}
              deals ·{' '}
              <span className="font-mono text-white/80">
                {formatCents(totalAmount)}
              </span>{' '}
              total
            </p>
          </header>
          <div className="mt-4">
            <DealVolumeChart data={series} />
          </div>
        </section>

        <section
          className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6"
          aria-labelledby="state-breakdown"
        >
          <h2
            id="state-breakdown"
            className="font-display text-xl text-white md:text-2xl"
          >
            Active deals by state
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-white/50">
                  <th className="px-3 py-2">State</th>
                  <th className="px-3 py-2 text-right">Active</th>
                  <th className="px-3 py-2 text-right">Signups</th>
                  <th className="px-3 py-2 text-right">W→S conv.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {states.map((s) => (
                  <tr key={s.stateCode}>
                    <td className="px-3 py-2 font-mono text-white/90">
                      {s.stateCode}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--accent-primary)]">
                      {s.activeDealCount}
                    </td>
                    <td className="px-3 py-2 text-right text-white/80">
                      {s.signupCount}
                    </td>
                    <td className="px-3 py-2 text-right text-white/70">
                      {formatPct(s.waitlistToSignup)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-10 text-xs text-white/40">
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
