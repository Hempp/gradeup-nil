/**
 * /hs/admin/analytics/cohorts — weekly cohort retention heatmap.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CohortHeatmap from '@/components/hs/analytics/CohortHeatmap';
import {
  getWeeklyCohortRetention,
  type CohortMatrix,
} from '@/lib/hs-nil/analytics';

export const metadata: Metadata = {
  title: 'Cohorts — HS-NIL analytics',
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
  searchParams: Promise<{ weeks?: string }>;
}

const EMPTY: CohortMatrix = { maxWeeks: 12, rows: [] };

export default async function CohortsAnalyticsPage({ searchParams }: PageProps) {
  await requireAdminOr404();

  const sp = await searchParams;
  const parsed = Number.parseInt(sp.weeks ?? '', 10);
  const weeks = Number.isFinite(parsed)
    ? Math.max(1, Math.min(26, parsed))
    : 12;

  const supabase = await createClient();
  let matrix: CohortMatrix = EMPTY;
  try {
    matrix = await getWeeklyCohortRetention(supabase, { cohortWeeks: weeks });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[analytics/cohorts] load failed', err);
  }

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            HS-NIL · Analytics
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Cohort retention
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/60">
            Cohort = calendar week an HS athlete signed up. Retained in week
            N = they fired ≥1 share, ≥1 consent signed, OR ≥1 deal status
            change that week.
          </p>

          <form
            method="get"
            className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"
          >
            <label className="flex flex-col text-xs">
              <span className="mb-1 font-semibold uppercase tracking-wider text-white/50">
                Weeks back
              </span>
              <input
                name="weeks"
                type="number"
                min="1"
                max="26"
                defaultValue={weeks}
                className="w-28 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--accent-primary)] focus:outline-none"
              />
            </label>
            <button
              type="submit"
              className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-[var(--accent-primary)] bg-transparent px-4 py-2 text-sm font-semibold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-black"
            >
              Apply
            </button>
          </form>
        </header>

        <section
          className="mt-10 rounded-xl border border-white/10 bg-white/5 p-6"
          aria-labelledby="heatmap"
        >
          <h2
            id="heatmap"
            className="font-display text-xl text-white md:text-2xl"
          >
            Retention heatmap
          </h2>
          <p className="mt-1 text-xs text-white/50">
            Rows are signup-week cohorts. Columns are weeks since signup. Cell
            shows % of the cohort that retained.
          </p>
          <div className="mt-4">
            <CohortHeatmap matrix={matrix} />
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
