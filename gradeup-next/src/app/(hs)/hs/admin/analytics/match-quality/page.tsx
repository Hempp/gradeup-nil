/**
 * /hs/admin/analytics/match-quality — ranker time-series deep-dive.
 *
 * The existing /hs/admin/match-quality page is a simpler "window-days"
 * snapshot (see src/lib/hs-nil/match-feedback.ts). This page is the
 * time-series deeper dive: range filter, suggestion→propose→completed
 * trajectory, avg time from first signal to proposed.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DateRangePicker from '@/components/hs/analytics/DateRangePicker';
import MetricSummaryCard from '@/components/hs/analytics/MetricSummaryCard';
import {
  getMatchRankerQuality,
  parseRangeParams,
  formatPct,
  type MatchRankerQuality,
} from '@/lib/hs-nil/analytics';

export const metadata: Metadata = {
  title: 'Match quality — HS-NIL analytics',
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

const EMPTY: MatchRankerQuality = {
  suggestedCount: 0,
  proposedCount: 0,
  proposedRate: 0,
  completedCount: 0,
  completedRateAmongProposed: 0,
  avgDaysSuggestToPropose: null,
};

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function MatchQualityAnalyticsPage({
  searchParams,
}: PageProps) {
  await requireAdminOr404();

  const sp = await searchParams;
  const range = parseRangeParams({ from: sp.from, to: sp.to }, 30);

  const supabase = await createClient();
  let ranker: MatchRankerQuality = EMPTY;
  try {
    ranker = await getMatchRankerQuality(supabase, range);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[analytics/match-quality] load failed', err);
  }

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            HS-NIL · Analytics
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Match quality (deep dive)
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/60">
            Ranker performance over an arbitrary window. Suggestion = distinct
            brand↔athlete pair with any feedback event. For per-athlete detail
            see{' '}
            <Link
              href="/hs/admin/match-quality"
              className="underline underline-offset-2 hover:text-white"
            >
              the simpler per-athlete view
            </Link>
            .
          </p>

          <div className="mt-4">
            <DateRangePicker defaultDays={30} />
          </div>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricSummaryCard
            label="Suggestions served"
            value={String(ranker.suggestedCount)}
          />
          <MetricSummaryCard
            label="Proposed rate"
            value={formatPct(ranker.proposedRate)}
            subtext={`${ranker.proposedCount} of ${ranker.suggestedCount}`}
          />
          <MetricSummaryCard
            label="Completed among proposed"
            value={formatPct(ranker.completedRateAmongProposed)}
            subtext={`${ranker.completedCount} of ${ranker.proposedCount}`}
          />
          <MetricSummaryCard
            label="Avg suggest → propose"
            value={
              ranker.avgDaysSuggestToPropose === null
                ? '—'
                : `${ranker.avgDaysSuggestToPropose} d`
            }
            subtext="time from first signal to deal proposed"
            positiveIsGood={false}
          />
        </div>

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
