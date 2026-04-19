/**
 * HS Brand — Suggested athletes — /hs/brand/suggested
 *
 * Server Component. Ranked list of HS athletes that match the
 * signed-in brand's configured state(s) + category targeting, above
 * a configurable GPA threshold. Default threshold is 3.0; brand
 * overrides via `?min_gpa=3.5`.
 *
 * Auth + role gates mirror /hs/brand. Non-HS brands bounce to the
 * college dashboard.
 *
 * No PII is ever returned. The underlying `match_hs_athletes_for_brand`
 * RPC is SECURITY DEFINER and projects only: first name, school,
 * sport, state, GPA + tier, graduation year, match score. Every
 * "Propose a deal" link carries an HMAC-signed ref so brands cannot
 * post deals against athletes that weren't actually suggested.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BrandDashboardShell from '@/components/hs/BrandDashboardShell';
import SuggestedAthleteCard from '@/components/hs/SuggestedAthleteCard';
import {
  getSuggestedAthletes,
  signAthleteRef,
} from '@/lib/hs-nil/matching';
import { getDismissedAthleteIds } from '@/lib/hs-nil/match-feedback';

export const metadata: Metadata = {
  title: 'Suggested athletes — GradeUp HS',
  description:
    'HS scholar-athletes that match your brand profile, ranked by fit.',
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
    min_gpa?: string;
    limit?: string;
    show_dismissed?: string;
  }>;
}

function parseMinGpa(raw: string | undefined): number {
  if (!raw) return 3.0;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return 3.0;
  return Math.max(0, Math.min(5, n));
}

function parseLimit(raw: string | undefined): number {
  if (!raw) return 25;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 25;
  return Math.max(1, Math.min(100, n));
}

export default async function HSBrandSuggestedPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const sp = await searchParams;
  const minGpa = parseMinGpa(sp.min_gpa);
  const limit = parseLimit(sp.limit);
  const showDismissed = sp.show_dismissed === '1';

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/hs/brand/suggested');
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
    console.warn('[hs-brand-suggested] brand lookup failed', err);
  }

  if (!brand) {
    redirect('/hs/signup/brand?notice=convert');
  }
  if (brand.is_hs_enabled !== true) {
    redirect('/brand/dashboard');
  }

  const operatingStates = brand.hs_target_states ?? [];
  const dealCategories = brand.hs_deal_categories ?? [];

  const rawMatches = await getSuggestedAthletes(supabase, brand.id, {
    minGpa,
    limit,
  });

  // Hide-dismissed filter (default ON; ?show_dismissed=1 to reveal).
  // We fetch dismissed ids via the service-role-backed helper because
  // the authenticated client's RLS policy on match_feedback_events
  // also returns the brand's own rows, but going through the helper
  // keeps the brand-resolution logic consistent with write paths.
  let dismissedIds: Set<string> = new Set();
  if (!showDismissed) {
    try {
      dismissedIds = await getDismissedAthleteIds(brand.id, 30);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[hs-brand-suggested] dismiss filter failed', err);
    }
  }
  const matches = rawMatches.filter((m) => !dismissedIds.has(m.athleteId));
  const hiddenCount = rawMatches.length - matches.length;

  // Which of these athletes has the brand already saved? Scoped by
  // RLS to this brand's rows only.
  const savedIds = new Set<string>();
  if (matches.length > 0) {
    try {
      const { data: saves } = await supabase
        .from('brand_athlete_shortlist')
        .select('athlete_user_id')
        .eq('brand_id', brand.id)
        .in(
          'athlete_user_id',
          matches.map((m) => m.athleteId)
        );
      for (const row of (saves ?? []) as Array<{ athlete_user_id: string }>) {
        savedIds.add(row.athlete_user_id);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[hs-brand-suggested] saved lookup failed', err);
    }
  }

  const firstNameMeta = (user.user_metadata as { first_name?: string } | null)
    ?.first_name;

  return (
    <BrandDashboardShell
      brandName={brand.company_name}
      firstName={firstNameMeta ?? brand.contact_name?.split(/\s+/)[0] ?? null}
      operatingStates={operatingStates}
      dealCategories={dealCategories}
    >
      <section aria-labelledby="suggested-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2
              id="suggested-heading"
              className="font-display text-2xl md:text-3xl"
            >
              Suggested athletes.
            </h2>
            <p className="mt-1 text-sm text-white/60">
              {matches.length > 0
                ? `${matches.length} match${matches.length === 1 ? '' : 'es'} at GPA ≥ ${minGpa.toFixed(1)}. Ranked by fit.`
                : 'No matches yet. Try broadening your filters.'}
              {!showDismissed && hiddenCount > 0 && (
                <>
                  {' '}
                  <Link
                    href={`/hs/brand/suggested?min_gpa=${minGpa}&limit=${limit}&show_dismissed=1`}
                    className="text-[var(--accent-primary)] hover:underline"
                  >
                    ({hiddenCount} hidden — show)
                  </Link>
                </>
              )}
              {showDismissed && (
                <>
                  {' '}
                  <Link
                    href={`/hs/brand/suggested?min_gpa=${minGpa}&limit=${limit}`}
                    className="text-[var(--accent-primary)] hover:underline"
                  >
                    (hide dismissed)
                  </Link>
                </>
              )}
            </p>
          </div>
          <Link
            href="/hs/brand"
            className="text-sm font-semibold text-white/60 hover:text-white"
          >
            ← Back to dashboard
          </Link>
        </div>

        {/* Filter bar. Uses GET form so the page stays server-rendered and
            shareable as a URL. */}
        <form
          method="get"
          action="/hs/brand/suggested"
          className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"
        >
          <label className="flex flex-col text-xs">
            <span className="mb-1 font-semibold uppercase tracking-wider text-white/50">
              Min GPA
            </span>
            <input
              name="min_gpa"
              type="number"
              min="0"
              max="5"
              step="0.1"
              defaultValue={minGpa}
              className="w-28 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--accent-primary)] focus:outline-none"
            />
          </label>
          <label className="flex flex-col text-xs">
            <span className="mb-1 font-semibold uppercase tracking-wider text-white/50">
              Limit
            </span>
            <input
              name="limit"
              type="number"
              min="1"
              max="100"
              step="1"
              defaultValue={limit}
              className="w-24 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--accent-primary)] focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-[var(--accent-primary)] bg-transparent px-4 py-2 text-sm font-semibold text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-primary)] hover:text-black"
          >
            Apply filters
          </button>
        </form>

        {matches.length === 0 ? (
          <EmptyState
            hasStates={operatingStates.length > 0}
            hasCategories={dealCategories.length > 0}
          />
        ) : (
          <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {matches.map((m) => (
              <li key={m.athleteId}>
                <SuggestedAthleteCard
                  firstName={m.firstName}
                  schoolName={m.schoolName}
                  sport={m.sport}
                  gpa={m.gpa}
                  gpaVerificationTier={m.gpaVerificationTier}
                  stateCode={m.stateCode}
                  graduationYear={m.graduationYear}
                  matchScore={m.matchScore}
                  athleteRef={signAthleteRef(m.athleteId)}
                  affinityScore={m.affinityScore}
                  initialSaved={savedIds.has(m.athleteId)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </BrandDashboardShell>
  );
}

function EmptyState({
  hasStates,
  hasCategories,
}: {
  hasStates: boolean;
  hasCategories: boolean;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
      <p className="text-sm font-semibold text-white">No matches yet.</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/60">
        <li>Consider broadening your deal categories.</li>
        <li>Lower your minimum GPA threshold.</li>
        {!hasStates && (
          <li>
            You don&rsquo;t have any operating states configured.{' '}
            <Link
              href="/hs/signup/brand"
              className="text-[var(--accent-primary)] hover:underline"
            >
              Update your profile
            </Link>
            .
          </li>
        )}
        {!hasCategories && (
          <li>
            You don&rsquo;t have any deal categories configured.{' '}
            <Link
              href="/hs/signup/brand"
              className="text-[var(--accent-primary)] hover:underline"
            >
              Update your profile
            </Link>
            .
          </li>
        )}
        <li>
          As more athletes sign up in your states, new matches will appear
          here.
        </li>
      </ul>
    </div>
  );
}
