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

type Perspective = 'athlete' | 'brand';

interface BrandContextJsonb {
  vertical?: string;
  deliverableType?: string;
  athleteCount?: number;
  campaignNotes?: string | null;
  campaignTotalCents?: { low: number; mid: number; high: number };
  volumeDiscountApplied?: boolean;
}

interface ValuationRequestRow {
  id: string;
  inputs: ValuationInput;
  estimate_mid_cents: number;
  converted_to_waitlist: boolean;
  created_at: string;
  perspective: Perspective | null;
  brand_context: BrandContextJsonb | null;
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

/**
 * Like bucketCounts but operates directly on the row (needed for
 * brand_context fields that aren't in the athlete-side ValuationInput).
 */
function countBy<TKey extends string>(
  rows: ValuationRequestRow[],
  extractor: (row: ValuationRequestRow) => TKey
): Array<{ key: TKey; count: number; pct: number }> {
  const counts = new Map<TKey, number>();
  for (const r of rows) {
    const k = extractor(r);
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
      'id, inputs, estimate_mid_cents, converted_to_waitlist, created_at, perspective, brand_context'
    )
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(5000);

  const allRows = (rowsRaw ?? []) as ValuationRequestRow[];
  const loadError = error?.message ?? null;

  // Split the funnel: athlete-side and brand-side are different
  // customer journeys. Surface them side-by-side so the founder can
  // follow up on brand leads while still tracking athlete-side
  // waitlist conversion.
  const athleteRows = allRows.filter(
    (r) => (r.perspective ?? 'athlete') === 'athlete'
  );
  const brandRows = allRows.filter((r) => r.perspective === 'brand');

  // Athlete funnel metrics (unchanged semantics).
  const total = athleteRows.length;
  const converted = athleteRows.filter((r) => r.converted_to_waitlist).length;
  const conversionRate = total > 0 ? (converted / total) * 100 : 0;
  const avgMidCents =
    total > 0
      ? Math.round(
          athleteRows.reduce(
            (acc, r) => acc + (r.estimate_mid_cents ?? 0),
            0
          ) / total
        )
      : 0;

  const bySport = bucketCounts<ValuationSport>(athleteRows, (i) => i.sport);
  const byState = bucketCounts<string>(athleteRows, (i) => i.stateCode);
  const byGrad = bucketCounts<GradLevel>(athleteRows, (i) => i.gradLevel);
  const byFollower = bucketCounts<FollowerBucket>(
    athleteRows,
    (i) => i.followerCountBucket
  );
  const byGpa = bucketCounts<GpaBucket>(athleteRows, (i) => i.gpaBucket);

  // Brand funnel metrics. Brand rows have no waitlist conversion yet
  // (we capture intent, not email, unless they click "Talk to our
  // team" — that lands in a different system).
  const brandTotal = brandRows.length;
  const brandAvgPerDeliverableCents =
    brandTotal > 0
      ? Math.round(
          brandRows.reduce(
            (acc, r) => acc + (r.estimate_mid_cents ?? 0),
            0
          ) / brandTotal
        )
      : 0;
  const brandAvgCampaignTotalCents =
    brandTotal > 0
      ? Math.round(
          brandRows.reduce(
            (acc, r) =>
              acc + (r.brand_context?.campaignTotalCents?.mid ?? 0),
            0
          ) / brandTotal
        )
      : 0;
  const brandByVertical = countBy(
    brandRows,
    (r) => r.brand_context?.vertical ?? 'unknown'
  );
  const brandByDeliverable = countBy(
    brandRows,
    (r) => r.brand_context?.deliverableType ?? 'unknown'
  );
  const brandBySport = bucketCounts<ValuationSport>(
    brandRows,
    (i) => i.sport
  );
  const brandByState = bucketCounts<string>(brandRows, (i) => i.stateCode);

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
            Last 30 days across both valuation funnels: athlete-side
            (/hs/valuation) and brand-side FMV (/solutions/brands/fmv).
            Read-only. 5-minute refresh.
          </p>
        </header>

        {loadError && (
          <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            Load error: {loadError}
          </div>
        )}

        {/* Perspective split banner */}
        <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-white/60">
          Showing <strong className="text-white">{athleteRows.length}</strong>{' '}
          athlete-side requests &middot;{' '}
          <strong className="text-white">{brandRows.length}</strong>{' '}
          brand-side FMV leads (perspective=&lsquo;brand&rsquo;). Both
          pipelines live in the same{' '}
          <code className="rounded bg-black/30 px-1 py-0.5 text-[11px] text-white/70">
            valuation_requests
          </code>{' '}
          table.
        </div>

        <h2 className="mt-8 font-display text-xl text-white/90">
          Athlete funnel (/hs/valuation)
        </h2>

        {/* Headline metrics */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            No athlete-side valuation requests in the last 30 days yet.
            Once the calculator goes live and traffic arrives, this
            dashboard fills in automatically.
          </p>
        )}

        {/* ───────────────────────────────────────────────────────────
            Brand FMV funnel (/solutions/brands/fmv)
          ─────────────────────────────────────────────────────────── */}
        <h2 className="mt-16 font-display text-xl text-white/90">
          Brand FMV funnel (/solutions/brands/fmv)
        </h2>
        <p className="mt-1 text-xs text-white/50">
          Anonymous brand-intent leads. Follow up on high-value rows via
          the Talk-to-team pipeline.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Brand requests"
            value={brandTotal.toLocaleString()}
            subtext="Last 30 days"
          />
          <MetricCard
            label="Avg per-deliverable"
            value={formatValuationCents(brandAvgPerDeliverableCents)}
            subtext="Brand-side central"
          />
          <MetricCard
            label="Avg campaign total"
            value={formatValuationCents(brandAvgCampaignTotalCents)}
            subtext="Multi-athlete scaled"
          />
          <MetricCard
            label="Top brand vertical"
            value={brandByVertical[0]?.key ?? '—'}
            subtext={
              brandByVertical[0]
                ? `${brandByVertical[0].count} requests`
                : 'No data'
            }
          />
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <DistributionCard
            title="By brand vertical"
            rows={brandByVertical.map((r) => ({
              label: r.key,
              count: r.count,
              pct: r.pct,
            }))}
          />
          <DistributionCard
            title="By deliverable type"
            rows={brandByDeliverable.map((r) => ({
              label: r.key,
              count: r.count,
              pct: r.pct,
            }))}
          />
          <DistributionCard
            title="Brand requests by sport"
            rows={brandBySport.slice(0, 10).map((r) => ({
              label: SPORT_LABELS[r.key] ?? r.key,
              count: r.count,
              pct: r.pct,
            }))}
          />
          <DistributionCard
            title="Brand requests by state"
            rows={brandByState.slice(0, 10).map((r) => ({
              label: r.key,
              count: r.count,
              pct: r.pct,
            }))}
          />
        </div>

        {brandTotal === 0 && !loadError && (
          <p className="mt-6 text-sm text-white/50">
            No brand-side FMV requests in the last 30 days yet. The
            /solutions/brands/fmv tool feeds this section once live.
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
