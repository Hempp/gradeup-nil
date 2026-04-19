/**
 * /hs/brand/shortlist — brand's saved athletes.
 *
 * Server Component. Lists every athlete this brand has saved via the
 * save button on /hs/brand/suggested, joined with profile + affinity.
 * Supports state and sport filters via GET query params so the page
 * stays URL-shareable (same pattern as /hs/brand/suggested).
 *
 * Privacy: scoped strictly to the current brand by RLS on
 * brand_athlete_shortlist (SELECT policy resolves brand_id → profile_id
 * → auth.uid()).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BrandDashboardShell from '@/components/hs/BrandDashboardShell';
import ShortlistedAthleteCard from '@/components/hs/ShortlistedAthleteCard';
import {
  getShortlistForBrand,
  type ShortlistedAthleteDetail,
} from '@/lib/hs-nil/match-feedback';
import { signAthleteRef, type GpaTier } from '@/lib/hs-nil/matching';

export const metadata: Metadata = {
  title: 'Saved athletes — GradeUp HS',
  description: 'Your brand\u2019s saved HS scholar-athletes.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface BrandRow {
  id: string;
  company_name: string;
  contact_name: string;
  is_hs_enabled: boolean | null;
  hs_target_states: string[] | null;
  hs_deal_categories: string[] | null;
}

interface PageProps {
  searchParams: Promise<{
    state?: string;
    sport?: string;
  }>;
}

function narrowTier(value: string): GpaTier {
  return value === 'institution_verified' ||
    value === 'user_submitted' ||
    value === 'self_reported'
    ? value
    : 'self_reported';
}

export default async function HSBrandShortlistPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const sp = await searchParams;
  const stateFilter = (sp.state ?? '').trim().toUpperCase();
  const sportFilter = (sp.sport ?? '').trim().toLowerCase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/hs/brand/shortlist');
  }

  let brand: BrandRow | null = null;
  try {
    const { data } = await supabase
      .from('brands')
      .select(
        'id, company_name, contact_name, is_hs_enabled, hs_target_states, hs_deal_categories'
      )
      .eq('profile_id', user.id)
      .maybeSingle();
    brand = (data as BrandRow | null) ?? null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-brand-shortlist] brand lookup failed', err);
  }

  if (!brand) {
    redirect('/hs/signup/brand?notice=convert');
  }
  if (brand.is_hs_enabled !== true) {
    redirect('/brand/dashboard');
  }

  let rows: ShortlistedAthleteDetail[] = [];
  try {
    rows = await getShortlistForBrand(brand.id);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-brand-shortlist] shortlist fetch failed', err);
  }

  const filtered = rows.filter((r) => {
    if (stateFilter && (r.stateCode ?? '').toUpperCase() !== stateFilter) {
      return false;
    }
    if (sportFilter && (r.sport ?? '').toLowerCase() !== sportFilter) {
      return false;
    }
    return true;
  });

  // Build filter options from the full list (so filtering never hides
  // the dimension you might want to switch back to).
  const stateOptions = Array.from(
    new Set(rows.map((r) => r.stateCode).filter((s): s is string => Boolean(s)))
  ).sort();
  const sportOptions = Array.from(
    new Set(rows.map((r) => r.sport).filter((s): s is string => Boolean(s)))
  ).sort();

  const firstNameMeta = (user.user_metadata as { first_name?: string } | null)
    ?.first_name;

  return (
    <BrandDashboardShell
      brandName={brand.company_name}
      firstName={firstNameMeta ?? brand.contact_name?.split(/\s+/)[0] ?? null}
      operatingStates={brand.hs_target_states ?? []}
      dealCategories={brand.hs_deal_categories ?? []}
    >
      <section aria-labelledby="shortlist-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2
              id="shortlist-heading"
              className="font-display text-2xl md:text-3xl"
            >
              Saved athletes.
            </h2>
            <p className="mt-1 text-sm text-white/60">
              {filtered.length > 0
                ? `${filtered.length} saved${rows.length !== filtered.length ? ` of ${rows.length}` : ''}.`
                : rows.length === 0
                  ? 'You haven\u2019t saved any athletes yet.'
                  : 'No matches for your filters.'}
            </p>
          </div>
          <div className="flex gap-3 text-sm font-semibold">
            <Link
              href="/hs/brand/suggested"
              className="text-[var(--accent-primary)] hover:underline"
            >
              Suggested →
            </Link>
            <Link
              href="/hs/brand"
              className="text-white/60 hover:text-white"
            >
              ← Dashboard
            </Link>
          </div>
        </div>

        {(stateOptions.length > 0 || sportOptions.length > 0) && (
          <form
            method="get"
            action="/hs/brand/shortlist"
            className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"
          >
            {stateOptions.length > 0 && (
              <label className="flex flex-col text-xs">
                <span className="mb-1 font-semibold uppercase tracking-wider text-white/50">
                  State
                </span>
                <select
                  name="state"
                  defaultValue={stateFilter}
                  className="min-h-[40px] w-36 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--accent-primary)] focus:outline-none"
                >
                  <option value="">All states</option>
                  {stateOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {sportOptions.length > 0 && (
              <label className="flex flex-col text-xs">
                <span className="mb-1 font-semibold uppercase tracking-wider text-white/50">
                  Sport
                </span>
                <select
                  name="sport"
                  defaultValue={sportFilter}
                  className="min-h-[40px] w-48 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--accent-primary)] focus:outline-none"
                >
                  <option value="">All sports</option>
                  {sportOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="submit"
              className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-[var(--accent-primary)] bg-transparent px-4 py-2 text-sm font-semibold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-black"
            >
              Apply filters
            </button>
            {(stateFilter || sportFilter) && (
              <Link
                href="/hs/brand/shortlist"
                className="self-center text-xs font-semibold text-white/60 hover:text-white"
              >
                Clear
              </Link>
            )}
          </form>
        )}

        {filtered.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <p className="text-sm font-semibold text-white">
              {rows.length === 0
                ? 'Your shortlist is empty.'
                : 'No athletes match these filters.'}
            </p>
            <p className="mt-1 text-sm text-white/60">
              {rows.length === 0
                ? 'Save athletes from the suggested list to build a long-term target roster.'
                : 'Clear the filters or adjust your state/sport selection.'}
            </p>
            <Link
              href="/hs/brand/suggested"
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent-primary)] px-5 py-3 text-sm font-semibold text-black hover:opacity-90"
            >
              Browse suggested
            </Link>
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <li key={r.id}>
                <ShortlistedAthleteCard
                  athleteRef={signAthleteRef(r.athleteUserId)}
                  firstName={r.firstName}
                  schoolName={r.schoolName}
                  sport={r.sport}
                  gpa={r.gpa}
                  gpaVerificationTier={narrowTier(r.gpaVerificationTier)}
                  stateCode={r.stateCode}
                  graduationYear={r.graduationYear}
                  affinityScore={r.affinityScore}
                  signalCount={r.signalCount}
                  notes={r.notes}
                  savedAt={r.createdAt}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </BrandDashboardShell>
  );
}
