/**
 * /hs/admin/valuation-analytics — Valuation-calculator analytics.
 *
 * Admin-gated read-only dashboard for the public /hs/valuation funnel:
 *   - Total requests over time (last 30d)
 *   - Distribution across sport / state / grade / follower / GPA tiers
 *   - Conversion rate to waitlist signup
 *   - Trending sport + state by volume
 *
 * ISR: 5-minute refresh. Cheap protection against admin-refresh storms
 * while keeping the dashboard reasonably fresh.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  SPORT_LABELS,
  FOLLOWER_LABELS,
  GPA_LABELS,
  GRAD_LABELS,
  formatValuationCents,
  type ValuationInput,
  type ValuationSport,
  type FollowerBucket,
  type GpaBucket,
  type GradLevel,
} from '@/lib/hs-nil/valuation';

export const metadata: Metadata = {
  title: 'Valuation Analytics — GradeUp HS admin',
  description:
    'Admin-only: distribution + conversion metrics for the public NIL valuation calculator.',
  robots: { index: false, follow: false },
};

export const revalidate = 300; // 5 minutes

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

interface ValuationRequestRow {
  id: string;
  inputs: ValuationInput;
  estimate_mid_cents: number;
  converted_to_waitlist: boolean;
  created_at: string;
}

function bucketCounts<T extends string>(
  rows: ValuationRequestRow[],
  extractor: (input: ValuationInput) => T
): Array<{ key: T; count: number; pct: number }> {
  const counts = new Map<T, number>();
  for (const r of rows) {
    const k = extractor(r.inputs);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const total = rows.length || 1;
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count, pct: (count / total) * 100 }))
    .sort((a, b) => b.count - a.count);
}

export default async function ValuationAnalyticsPage() {
  await requireAdminOr404();
  const supabase = await createClient();

  // 30-day window.
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: rowsRaw, error } = await supabase
    .from('valuation_requests')
    .select(
      'id, inputs, estimate_mid_cents, converted_to_waitlist, created_at'
    )
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(5000);

  const rows = (rowsRaw ?? []) as ValuationRequestRow[];
  const loadError = error?.message ?? null;

  const total = rows.length;
  const converted = rows.filter((r) => r.converted_to_waitlist).length;
  const conversionRate = total > 0 ? (converted / total) * 100 : 0;
  const avgMidCents =
    total > 0
      ? Math.round(
          rows.reduce((acc, r) => acc + (r.estimate_mid_cents ?? 0), 0) / total
        )
      : 0;

  const bySport = bucketCounts<ValuationSport>(rows, (i) => i.sport);
  const byState = bucketCounts<string>(rows, (i) => i.stateCode);
  const byGrad = bucketCounts<GradLevel>(rows, (i) => i.gradLevel);
  const byFollower = bucketCounts<FollowerBucket>(
    rows,
    (i) => i.followerCountBucket
  );
  const byGpa = bucketCounts<GpaBucket>(rows, (i) => i.gpaBucket);

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            HS-NIL · Admin · Valuation
          </p>
          <h1 className="mt-2 font-display text-3xl md:text-4xl">
            Valuation Calculator Analytics
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/60">
            Last 30 days of the public /hs/valuation funnel. Read-only.
            5-minute refresh.
          </p>
        </header>

        {loadError && (
          <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            Load error: {loadError}
          </div>
        )}

        {/* Headline metrics */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total requests"
            value={total.toLocaleString()}
            subtext="Last 30 days"
          />
          <MetricCard
            label="Waitlist conversion"
            value={`${conversionRate.toFixed(1)}%`}
            subtext={`${converted} / ${total}`}
          />
          <MetricCard
            label="Avg central estimate"
            value={formatValuationCents(avgMidCents)}
            subtext="Across all requests"
          />
          <MetricCard
            label="Top state"
            value={byState[0]?.key ?? '—'}
            subtext={byState[0] ? `${byState[0].count} requests` : 'No data'}
          />
        </div>

        {/* Distributions */}
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <DistributionCard
            title="By sport"
            rows={bySport.slice(0, 10).map((r) => ({
              label: SPORT_LABELS[r.key] ?? r.key,
              count: r.count,
              pct: r.pct,
            }))}
          />
          <DistributionCard
            title="By state"
            rows={byState.slice(0, 10).map((r) => ({
              label: r.key,
              count: r.count,
              pct: r.pct,
            }))}
          />
          <DistributionCard
            title="By grade level"
            rows={byGrad.map((r) => ({
              label: GRAD_LABELS[r.key] ?? r.key,
              count: r.count,
              pct: r.pct,
            }))}
          />
          <DistributionCard
            title="By follower bucket"
            rows={byFollower.map((r) => ({
              label: FOLLOWER_LABELS[r.key] ?? r.key,
              count: r.count,
              pct: r.pct,
            }))}
          />
          <DistributionCard
            title="By GPA bucket"
            rows={byGpa.map((r) => ({
              label: GPA_LABELS[r.key] ?? r.key,
              count: r.count,
              pct: r.pct,
            }))}
          />
        </div>

        {total === 0 && !loadError && (
          <p className="mt-10 text-sm text-white/50">
            No valuation requests in the last 30 days yet. Once the calculator
            goes live and traffic arrives, this dashboard fills in
            automatically.
          </p>
        )}
      </section>
    </main>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
}

function MetricCard({ label, value, subtext }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-white/50">
        {label}
      </div>
      <div className="mt-1.5 font-display text-2xl text-white">{value}</div>
      {subtext && (
        <div className="mt-1 text-xs text-white/50">{subtext}</div>
      )}
    </div>
  );
}

interface DistributionCardProps {
  title: string;
  rows: { label: string; count: number; pct: number }[];
}

function DistributionCard({ title, rows }: DistributionCardProps) {
  const maxPct = rows.reduce((acc, r) => Math.max(acc, r.pct), 0);
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h2 className="mb-3 text-sm font-semibold text-white">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-xs text-white/50">No data yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.label} className="text-xs text-white/70">
              <div className="flex items-center justify-between">
                <span className="truncate">{r.label}</span>
                <span className="ml-3 tabular-nums text-white/90">
                  {r.count} ({r.pct.toFixed(1)}%)
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-[var(--accent-primary)]"
                  style={{
                    width: `${maxPct > 0 ? (r.pct / maxPct) * 100 : 0}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
