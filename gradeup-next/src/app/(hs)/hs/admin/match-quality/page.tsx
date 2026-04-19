/**
 * /hs/admin/match-quality — admin-only match quality dashboard.
 *
 * Read-only view of the Phase 8 match-feedback flywheel aggregates:
 * suggestion volume, proposed-deal rate, completion rate, average
 * affinity, and top athletes by positive signal.
 *
 * Admin gating mirrors /hs/admin — 404 for non-admins so we don't
 * leak route existence. Feature-gated at the (hs) layout.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MatchQualityMetricsCard from '@/components/hs/MatchQualityMetricsCard';
import {
  getMatchQualityMetrics,
  type MatchQualityMetrics,
} from '@/lib/hs-nil/match-feedback';

export const metadata: Metadata = {
  title: 'Match quality — GradeUp HS admin',
  description:
    'Admin-only read-only view of brand→athlete match feedback metrics.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

function parseWindow(raw: string | undefined): number {
  if (!raw) return 30;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 30;
  return Math.max(1, Math.min(180, n));
}

interface PageProps {
  searchParams: Promise<{ window?: string }>;
}

const EMPTY_METRICS: MatchQualityMetrics = {
  windowDays: 30,
  suggestionsServed: 0,
  proposedDeals: 0,
  proposedRate: 0,
  completedDeals: 0,
  completionRate: 0,
  averageAffinity: 0,
  topAthletes: [],
};

export default async function HSAdminMatchQualityPage({ searchParams }: PageProps) {
  await requireAdminOr404();

  const sp = await searchParams;
  const windowDays = parseWindow(sp.window);

  let metrics: MatchQualityMetrics = { ...EMPTY_METRICS, windowDays };
  try {
    metrics = await getMatchQualityMetrics(windowDays);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-admin/match-quality] metrics load failed', err);
  }

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            HS-NIL · Admin
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Match quality
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/60">
            Read-only. Feedback aggregates from the brand→athlete match
            flywheel: volume, funnel rates, affinity, and top performers.
          </p>

          <form
            method="get"
            action="/hs/admin/match-quality"
            className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"
          >
            <label className="flex flex-col text-xs">
              <span className="mb-1 font-semibold uppercase tracking-wider text-white/50">
                Window (days)
              </span>
              <input
                name="window"
                type="number"
                min="1"
                max="180"
                defaultValue={windowDays}
                className="w-28 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--accent-primary)] focus:outline-none"
              />
            </label>
            <button
              type="submit"
              className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-[var(--accent-primary)] bg-transparent px-4 py-2 text-sm font-semibold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-black"
            >
              Apply
            </button>
            <Link
              href="/hs/admin"
              className="self-center text-xs font-semibold text-white/60 hover:text-white"
            >
              ← Back to admin
            </Link>
          </form>
        </header>

        <div className="mt-10">
          <MatchQualityMetricsCard metrics={metrics} />
        </div>

        <p className="mt-10 text-xs text-white/40">
          Admin surface gated by <code>profiles.role = &apos;admin&apos;</code>.
          Data is computed from <code>match_feedback_events</code> (see
          migration <code>20260419_004_match_feedback.sql</code>).
        </p>
      </section>
    </main>
  );
}
