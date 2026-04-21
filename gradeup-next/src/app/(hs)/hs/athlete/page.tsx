/**
 * HS Athlete Dashboard — /hs/athlete
 *
 * The "home" surface for a signed-in HS athlete. Shows the work they've
 * already done (profile, consent, state rules) and a pre-flight checklist
 * for everything still open. Deals are deferred for the HS MVP — brand
 * partnerships are brokered by a concierge — so the dashboard must feel
 * worthwhile without a deals list.
 *
 * Data (all server-side via SSR Supabase client):
 *   - auth.user                     → identity, first_name metadata.
 *   - hs_athlete_profiles row       → GPA + tier, school, sport, grad year,
 *                                     state, DOB (drives minor detection).
 *   - parental_consents (active)    → latest unexpired, non-revoked row.
 *   - pending_consents              → non-consumed, non-expired count +
 *                                     most-recent parent name/email for
 *                                     "Waiting on ___" copy.
 *   - STATE_RULES[state_code]       → rules card.
 *
 * Redirects:
 *   - Unauthenticated → /login?next=/hs/athlete
 *   - Authenticated but no hs_athlete_profiles row → /hs/signup/athlete?notice=convert
 *     (they signed up on the college side and wandered over; convert them).
 *
 * Error handling: Supabase errors are logged server-side and degrade to
 * empty state rather than throwing — the skeleton reads as "no data yet"
 * which is at worst misleading for one reload, not a 500.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  OnboardingChecklist,
  type ChecklistItem,
} from '@/components/hs/OnboardingChecklist';
import { OnboardingCard } from '@/components/hs/OnboardingCard';
import { AthleteDashboardHeader } from '@/components/hs/AthleteDashboardHeader';
import {
  AthleteProfileCard,
  type GpaTier,
} from '@/components/hs/AthleteProfileCard';
import { ConsentStatusCard } from '@/components/hs/ConsentStatusCard';
import { StateRulesCard } from '@/components/hs/StateRulesCard';
import { HSDealCard, type DealCardStatus } from '@/components/hs/HSDealCard';
import type { StatusPill } from '@/components/hs/AthleteDashboardHeader';
import { AthleteDashboardEarningsCard } from '@/components/hs/AthleteDashboardEarningsCard';
import { AthleteDashboardTrajectoryCard } from '@/components/hs/AthleteDashboardTrajectoryCard';
import { AthleteDashboardCampaignsCard } from '@/components/hs/AthleteDashboardCampaignsCard';
import { getAthleteEarningsSummary } from '@/lib/hs-nil/earnings';
import { listOpenCampaignsForAthlete } from '@/lib/hs-nil/campaigns';
import type { GpaSnapshot, VerificationTier } from '@/lib/hs-nil/trajectory';

export const metadata: Metadata = {
  title: 'Your dashboard — GradeUp HS',
  description:
    'Your GradeUp HS athlete home — profile, consent status, state rules, and next steps.',
};

// The dashboard is highly user-specific; never cache across users.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STATE_NAMES: Record<string, string> = {
  CA: 'California',
  FL: 'Florida',
  GA: 'Georgia',
  TX: 'Texas',
};

interface HsProfileRow {
  state_code: string;
  sport: string;
  school_name: string;
  date_of_birth: string;
  graduation_year: number;
  gpa: number | null;
  gpa_verification_tier: string;
}

interface ActiveConsentRow {
  id: string;
  parent_full_name: string;
  scope: unknown;
  expires_at: string;
}

interface PendingConsentRow {
  parent_email: string;
  parent_full_name: string | null;
  created_at: string;
}

function calcAgeFromDob(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function isGpaTier(v: string): v is GpaTier {
  return (
    v === 'self_reported' ||
    v === 'user_submitted' ||
    v === 'institution_verified'
  );
}

/**
 * Scope jsonb is written in camelCase by the current consent provider but
 * legacy rows may be snake_case. Produce a short, human-readable summary
 * for the "Your parent approved X" line.
 */
function summarizeScope(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return 'your deals';
  const s = raw as {
    dealCategories?: unknown;
    deal_categories?: unknown;
    maxDealAmount?: unknown;
    max_deal_amount?: unknown;
  };
  const cats = (s.dealCategories ?? s.deal_categories) as unknown;
  const max = (s.maxDealAmount ?? s.max_deal_amount) as unknown;
  const catList =
    Array.isArray(cats) && cats.length > 0
      ? cats.filter((c): c is string => typeof c === 'string')
      : [];
  const maxNum = typeof max === 'number' && max > 0 ? max : null;

  if (catList.length && maxNum) {
    return `${catList.join(', ')} deals up to $${maxNum.toLocaleString()}`;
  }
  if (catList.length) return `${catList.join(', ')} deals`;
  if (maxNum) return `deals up to $${maxNum.toLocaleString()}`;
  return 'your deals';
}

export default async function HSAthleteDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/hs/athlete');
  }

  // Fetch the HS profile first — its absence determines whether we redirect.
  const { data: profile, error: profileError } = await supabase
    .from('hs_athlete_profiles')
    .select(
      'state_code, sport, school_name, date_of_birth, graduation_year, gpa, gpa_verification_tier',
    )
    .eq('user_id', user.id)
    .maybeSingle<HsProfileRow>();

  if (profileError) {
    // Don't crash — log and let the page render a graceful empty shell.
    console.error('[hs/athlete] profile fetch failed', profileError);
  }

  // Non-HS user hitting /hs/athlete: push them to sign up on the HS side.
  // `notice=convert` lets the signup page show a friendly "finish creating
  // your HS athlete profile" callout without inventing a new route.
  if (!profile) {
    redirect('/hs/signup/athlete?notice=convert');
  }

  const nowIso = new Date().toISOString();

  const [activeRes, pendingRes] = await Promise.all([
    supabase
      .from('parental_consents')
      .select('id, parent_full_name, scope, expires_at')
      .eq('athlete_user_id', user.id)
      .is('revoked_at', null)
      .gt('expires_at', nowIso)
      .order('signed_at', { ascending: false })
      .limit(1)
      .maybeSingle<ActiveConsentRow>(),

    supabase
      .from('pending_consents')
      .select('parent_email, parent_full_name, created_at')
      .eq('athlete_user_id', user.id)
      .is('consumed_at', null)
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false }),
  ]);

  if (activeRes.error) {
    console.error('[hs/athlete] active consent fetch failed', activeRes.error);
  }
  if (pendingRes.error) {
    console.error(
      '[hs/athlete] pending consents fetch failed',
      pendingRes.error,
    );
  }

  const activeConsent = activeRes.data ?? null;
  const pendingConsents: PendingConsentRow[] = pendingRes.data ?? [];

  // Trajectory sparkline — last ~6 months of GPA snapshots. We only read
  // what AthleteDashboardTrajectoryCard needs here; the full trajectory
  // assembly lives on /hs/athlete/trajectory.
  let trajectorySnapshots: GpaSnapshot[] = [];
  try {
    const sixMonthsAgoIso = new Date(
      Date.now() - 6 * 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: snapshotRows } = await supabase
      .from('hs_athlete_gpa_snapshots')
      .select(
        'id, athlete_user_id, gpa, verification_tier, source, source_reference_id, reported_at, recorded_at, notes',
      )
      .eq('athlete_user_id', user.id)
      .gte('reported_at', sixMonthsAgoIso)
      .order('reported_at', { ascending: true });
    trajectorySnapshots = (snapshotRows ?? []).map((r) => {
      const row = r as {
        id: string;
        athlete_user_id: string;
        gpa: number | string;
        verification_tier: VerificationTier;
        source:
          | 'initial_signup'
          | 'transcript_approval'
          | 'manual_admin'
          | 'trajectory_import';
        source_reference_id: string | null;
        reported_at: string;
        recorded_at: string;
        notes: string | null;
      };
      const gpa =
        typeof row.gpa === 'string' ? Number(row.gpa) : row.gpa;
      return {
        id: row.id,
        athleteUserId: row.athlete_user_id,
        gpa: Number.isFinite(gpa) ? gpa : 0,
        tier: row.verification_tier,
        source: row.source,
        sourceReferenceId: row.source_reference_id,
        reportedAt: row.reported_at,
        recordedAt: row.recorded_at,
        notes: row.notes,
      };
    });
  } catch (err) {
    console.error('[hs/athlete] trajectory sparkline fetch failed', err);
  }

  // Campaigns — lightweight count for the dashboard card. Best-effort.
  let openCampaignCount = 0;
  let invitedCampaignCount = 0;
  try {
    const campaigns = await listOpenCampaignsForAthlete(user.id, {
      restrictByState: true,
      limit: 50,
    });
    openCampaignCount = campaigns.length;
    invitedCampaignCount = campaigns.filter((c) => c.invited).length;
  } catch (err) {
    console.error('[hs/athlete] campaigns fetch failed', err);
  }

  // Earnings summary — best-effort. Falls back to zeros if anything errors,
  // so the card still renders its "your first payout lands here" state.
  const earningsSummary = await getAthleteEarningsSummary(
    supabase,
    user.id,
  ).catch((err) => {
    console.error('[hs/athlete] earnings summary failed', err);
    return {
      totalEarnedCents: 0,
      totalDeals: 0,
      averageDealCents: 0,
      highestDealCents: 0,
      firstDealAt: null,
      mostRecentDealAt: null,
      deltaThisMonthCents: 0,
    };
  });

  // Deals preview — keep it best-effort. We want to surface the newest three
  // HS-facing deals to the dashboard; if anything in the chain fails (no
  // athletes row yet, target_bracket column not migrated on a dev DB) we
  // simply render the zero-deals card rather than blowing up the page.
  interface PreviewDeal {
    id: string;
    title: string;
    compensationAmount: number;
    brandName: string;
    brandLogoUrl: string | null;
    eyebrow: string;
    cardStatus: DealCardStatus;
  }
  let previewDeals: PreviewDeal[] = [];
  let totalOpenDeals = 0;
  try {
    const { data: athleteRow } = await supabase
      .from('athletes')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle<{ id: string }>();
    if (athleteRow?.id) {
      const { data: dealRows } = await supabase
        .from('deals')
        .select(
          `id, title, status, deal_type, compensation_amount, parental_consent_id,
           brand:brands(company_name, logo_url)`,
        )
        .eq('athlete_id', athleteRow.id)
        .in('target_bracket', ['high_school', 'both'])
        .in('status', [
          'pending',
          'negotiating',
          'accepted',
          'active',
          'completed',
        ])
        .order('created_at', { ascending: false })
        .limit(10);
      const rows = (dealRows ?? []) as unknown as Array<{
        id: string;
        title: string;
        status: string;
        deal_type: string;
        compensation_amount: number;
        parental_consent_id: string | null;
        brand: { company_name: string; logo_url: string | null } | null;
      }>;
      previewDeals = rows.slice(0, 3).map((d) => {
        const pending = d.status === 'pending' || d.status === 'negotiating';
        const cardStatus: DealCardStatus = pending
          ? 'awaiting_you'
          : d.status === 'completed'
            ? 'completed'
            : 'in_progress';
        return {
          id: d.id,
          title: d.title,
          compensationAmount: d.compensation_amount,
          brandName: d.brand?.company_name ?? 'Unknown brand',
          brandLogoUrl: d.brand?.logo_url ?? null,
          eyebrow: d.deal_type.replace(/_/g, ' '),
          cardStatus,
        };
      });
      totalOpenDeals = rows.filter(
        (r) => r.status === 'pending' || r.status === 'negotiating',
      ).length;
    }
  } catch (dealsErr) {
    console.error('[hs/athlete] deals preview fetch failed', dealsErr);
  }

  // Identity
  const meta = (user.user_metadata ?? {}) as { first_name?: string };
  const firstName = (meta.first_name?.trim() || 'Athlete').split(/\s+/)[0];

  // Derived state
  const age = calcAgeFromDob(profile.date_of_birth);
  const isMinor = age !== null ? age < 18 : true; // default to "minor" if DOB missing

  const tier: GpaTier = isGpaTier(profile.gpa_verification_tier)
    ? profile.gpa_verification_tier
    : 'self_reported';

  const stateCode = profile.state_code;
  const stateName = STATE_NAMES[stateCode] ?? stateCode;

  // Status pills
  const pills: StatusPill[] = [];

  if (tier === 'institution_verified' || tier === 'user_submitted') {
    pills.push({
      label: 'Verified',
      tone: 'success',
      srLabel: 'GPA has been verified with documentation',
    });
  } else {
    pills.push({
      label: 'Self-reported GPA',
      tone: 'warning',
      srLabel: 'GPA is self-reported and has not been verified',
    });
  }

  if (isMinor) {
    if (activeConsent) {
      pills.push({
        label: 'Consent active',
        tone: 'success',
        srLabel: 'Parental consent is active',
      });
    } else {
      pills.push({
        label: 'Consent needed',
        tone: 'warning',
        srLabel: 'Parental consent still needed before deals can be signed',
      });
    }
  }

  if (stateCode) {
    pills.push({
      label: `Active in ${stateName}`,
      tone: 'neutral',
      srLabel: `Account registered in ${stateName}`,
    });
  }

  // Consent variant
  const consentVariant: 'active' | 'pending' | 'none' = activeConsent
    ? 'active'
    : pendingConsents.length > 0
      ? 'pending'
      : 'none';

  // Pre-flight checklist — mirrors /hs/onboarding/next-steps but reshaped
  // for "returning" context. Items that are done show as completed; items
  // pointing at unbuilt pages (verify-gpa, payouts) stay disabled.
  const checklistItems: ChecklistItem[] = [
    {
      label: 'Athlete profile',
      hint: `${profile.sport} • ${profile.school_name}`,
      completed: true,
    },
    isMinor
      ? activeConsent
        ? {
            label: 'Parental consent',
            hint: `${activeConsent.parent_full_name} signed.`,
            completed: true,
          }
        : pendingConsents.length > 0
          ? {
              label: 'Parental consent',
              hint: `Waiting on ${pendingConsents[0].parent_full_name ?? pendingConsents[0].parent_email}.`,
              href: '/hs/consent/manage',
              status: `${pendingConsents.length} pending`,
            }
          : {
              label: 'Parental consent',
              hint: 'A parent or guardian has to co-sign before any deal can go live.',
              href: '/hs/consent/request',
              status: 'Required',
            }
      : {
          label: 'Confirm contact + payout details',
          hint: "You're 18+. Set up payouts so deals can flow directly to you.",
          href: '/hs/onboarding/payouts',
          status: 'Coming soon',
          disabled: true,
        },
    {
      label: 'Verify your GPA',
      hint:
        tier === 'self_reported'
          ? 'Upload a transcript to earn a verified badge.'
          : tier === 'user_submitted'
            ? 'Transcript uploaded. Waiting on review.'
            : 'Institution-verified.',
      completed: tier === 'institution_verified',
      href: tier === 'self_reported' ? '/hs/onboarding/verify-gpa' : undefined,
      status: tier === 'self_reported' ? 'Coming soon' : 'In review',
      disabled: tier !== 'institution_verified',
    },
    {
      label: 'Set up payouts',
      hint: isMinor
        ? 'Your parent will set this up as custodian after consent is signed.'
        : 'Connect a Stripe account so deals can pay out.',
      href: '/hs/onboarding/payouts',
      status: 'Coming soon',
      disabled: true,
    },
  ];

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-10">
        <AthleteDashboardHeader
          firstName={firstName}
          school={profile.school_name}
          sport={profile.sport}
          pills={pills}
        />
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-10">
        {previewDeals.length > 0 ? (
          <div className="mb-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl text-white md:text-3xl">
                  Your deals
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  Your three most recent offers. Full history on the deals
                  page.
                </p>
              </div>
              <Link
                href="/hs/deals"
                className="inline-flex min-h-[44px] items-center text-sm font-semibold text-[var(--accent-primary)] hover:underline"
              >
                See all deals →
              </Link>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {previewDeals.map((d) => (
                <HSDealCard
                  key={d.id}
                  id={d.id}
                  brandName={d.brandName}
                  brandLogoUrl={d.brandLogoUrl}
                  title={d.title}
                  compensationAmount={d.compensationAmount}
                  status={d.cardStatus}
                  eyebrow={d.eyebrow}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-10">
            <OnboardingCard
              eyebrow="Your deals"
              title={
                totalOpenDeals > 0
                  ? `You have ${totalOpenDeals} deal${totalOpenDeals === 1 ? '' : 's'} waiting on you.`
                  : 'No deals yet.'
              }
              description={
                totalOpenDeals > 0
                  ? 'Review and decide on your pending offers.'
                  : "When a brand partnership is ready, it'll show up here."
              }
            >
              <Link
                href="/hs/deals"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Go to your deals
              </Link>
            </OnboardingCard>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <AthleteProfileCard
            gpa={profile.gpa ?? null}
            tier={tier}
            graduationYear={profile.graduation_year}
            sport={profile.sport}
            school={profile.school_name}
          />

          {isMinor ? (
            consentVariant === 'active' && activeConsent ? (
              <ConsentStatusCard
                variant="active"
                parentName={activeConsent.parent_full_name}
                scopeSummary={summarizeScope(activeConsent.scope)}
              />
            ) : consentVariant === 'pending' ? (
              <ConsentStatusCard
                variant="pending"
                parentName={pendingConsents[0]?.parent_full_name ?? null}
                parentEmail={pendingConsents[0]?.parent_email ?? ''}
                pendingCount={pendingConsents.length}
              />
            ) : (
              <ConsentStatusCard variant="none" />
            )
          ) : (
            <OnboardingCard
              eyebrow="You're 18+"
              title="You sign your own deals."
              description="No parental consent required. Finish payouts so deals can pay out directly."
            />
          )}

          <StateRulesCard stateCode={stateCode} />

          <AthleteDashboardEarningsCard summary={earningsSummary} />

          <AthleteDashboardCampaignsCard
            openCount={openCampaignCount}
            invitedCount={invitedCampaignCount}
          />

          <AthleteDashboardTrajectoryCard
            currentGpa={profile.gpa ?? null}
            currentTier={tier}
            snapshots={trajectorySnapshots}
          />

          <OnboardingCard
            eyebrow="Your first deal"
            title="When a brand partnership is ready, it'll show up here."
            description="Until then, here's your pre-flight checklist. GradeUp is brokering deals manually during our concierge MVP — the closer you are to fully verified, the faster we can move."
          />

          <OnboardingCard
            eyebrow="Public profile"
            title="Claim your bio-linkable URL."
            description="Verified scholar-athletes can opt into a public /athletes/[username] page showing GPA, trajectory, and deal history. Visibility is off until you turn it on."
          >
            <a
              href="/hs/athlete/public-profile"
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-md bg-[var(--accent-primary)] px-5 py-2 text-sm font-semibold text-black hover:opacity-90"
            >
              Set up public profile
            </a>
          </OnboardingCard>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <h2 className="font-display text-2xl text-white md:text-3xl">
          Pre-flight checklist
        </h2>
        <p className="mt-2 text-sm text-white/60">
          The closer this list gets to done, the faster we can put you in front
          of brands.
        </p>
        <div className="mt-6">
          <OnboardingChecklist items={checklistItems} />
        </div>
      </section>
    </main>
  );
}
