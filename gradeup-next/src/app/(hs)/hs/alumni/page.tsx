/**
 * /hs/alumni — mentor browse surface.
 *
 * Auth-gated but open to any HS user. Default filters come from the athlete's
 * hs_athlete_profiles row (sport + state); URL search params override. If
 * zero results land we show a "widen" affordance that clears the defaults.
 *
 * This is rendered entirely server-side; filtering is URL-driven so it
 * stays shareable / back-button-friendly and the page stays a Server
 * Component with no client state. A future iteration can add client-side
 * progressive filtering.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listMentorsForAthlete } from '@/lib/hs-nil/mentors';
import MentorProfileCard from '@/components/hs/MentorProfileCard';

export const metadata: Metadata = {
  title: 'Alumni mentors — GradeUp HS',
  description:
    'Browse verified college-athlete mentors who came through GradeUp HS. Find someone who just walked your path.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface SearchParams {
  sport?: string;
  state?: string;
  specialties?: string;
  page?: string;
  widen?: string;
}

export default async function AlumniMentorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/hs/alumni');
  }

  const params = await searchParams;

  // An explicit sport=<blank> comes in as "" per URLSearchParams — use that
  // as the "clear this filter" signal. `widen=1` clears both sport + state.
  const widen = params.widen === '1';
  const rawSport = params.sport;
  const rawState = params.state;
  const rawSpecialties = params.specialties;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);

  const sportFilter = widen
    ? null
    : rawSport === undefined
      ? undefined
      : rawSport.length === 0
        ? null
        : rawSport;
  const stateFilter = widen
    ? null
    : rawState === undefined
      ? undefined
      : rawState.length === 0
        ? null
        : rawState.toUpperCase();
  const specialties = rawSpecialties
    ? rawSpecialties
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .slice(0, 8)
    : null;

  const result = await listMentorsForAthlete({
    athleteUserId: user.id,
    filters: {
      sport: sportFilter,
      state: stateFilter,
      specialties,
    },
    page,
    pageSize: 12,
  });

  const appliedDefaults = result.defaultsApplied;
  const filterSummary = [
    appliedDefaults.sport
      ? `sport: ${appliedDefaults.sport}`
      : sportFilter
        ? `sport: ${sportFilter}`
        : null,
    appliedDefaults.state
      ? `state: ${appliedDefaults.state}`
      : stateFilter
        ? `state: ${stateFilter}`
        : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const hasDefaultsNarrowing =
    (appliedDefaults.sport || appliedDefaults.state) && result.total === 0;

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          Alumni mentor network
        </p>
        <h1 className="mt-2 font-display text-3xl text-white md:text-5xl">
          Talk to someone who just walked your path
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/70 md:text-base">
          Verified college-athlete mentors who came through GradeUp HS.
          They know the academic-athletic balance, the recruiting calendar,
          and the NIL deal-flow reality because they just lived it.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-white/70">
            <strong className="text-white">{result.total}</strong> mentor
            {result.total === 1 ? '' : 's'} match
            {filterSummary ? (
              <span className="ml-1">({filterSummary})</span>
            ) : null}
          </div>
          {(appliedDefaults.sport ||
            appliedDefaults.state ||
            sportFilter ||
            stateFilter ||
            specialties) && (
            <Link
              href="/hs/alumni?widen=1"
              className="text-sm font-semibold text-[var(--accent-primary)] hover:underline"
            >
              Widen filters
            </Link>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        {result.mentors.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
            <h2 className="font-display text-2xl text-white">
              {hasDefaultsNarrowing
                ? 'No mentors match your sport and state yet.'
                : 'No mentors match those filters.'}
            </h2>
            <p className="mt-2 text-sm text-white/70">
              {hasDefaultsNarrowing
                ? "Widen to see mentors from any state or sport — the network is growing weekly."
                : 'Try removing a filter or widening your search.'}
            </p>
            <Link
              href="/hs/alumni?widen=1"
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--accent-primary)] px-6 py-2 text-sm font-semibold text-black hover:opacity-90"
            >
              Widen filters
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {result.mentors.map((m) => (
              <MentorProfileCard key={m.id} mentor={m} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
