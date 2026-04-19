/**
 * HS Parent Dashboard — /hs/parent
 *
 * The signed-in parent's home surface. Parents in HS-NIL are the decision
 * makers for consent, payouts, and oversight — and they're the viral
 * amplifiers. This page needs to feel like THEIR page: protective, empowering,
 * and clear, even at zero state.
 *
 * Data (all server-side via SSR Supabase client):
 *   - auth.user                        → identity, first_name metadata.
 *                                        role='hs_parent' gate.
 *   - hs_parent_profiles               → durable profile row. May not exist
 *                                        yet if the migration hasn't been
 *                                        applied or signup flow was aborted;
 *                                        in that case we fall back to
 *                                        user_metadata for the header and
 *                                        skip the links query.
 *   - hs_parent_athlete_links          → linked athletes (verified + pending).
 *   - hs_athlete_profiles (per link)   → athlete details for each linked
 *                                        athlete. RLS may hide these from
 *                                        the parent until the athlete side
 *                                        backfills a sharing policy — we
 *                                        degrade gracefully to null fields.
 *   - parental_consents (per athlete)  → most-recent active consent.
 *   - pending_consents (per athlete)   → count of not-consumed, not-expired
 *                                        pending rows; surfaces the
 *                                        "Waiting on your signature" badge.
 *   - STATE_RULES[state]               → per-athlete rules pill + the
 *                                        protections card's disclosure line.
 *
 * Redirects:
 *   - Unauthenticated → /login?redirectTo=/hs/parent
 *   - Role is not hs_parent → /hs (they belong on the athlete side or public)
 *
 * Graceful degradation contract:
 *   Any Supabase error is logged server-side and the surface degrades to
 *   its empty variant. The worst case is a parent seeing "no athletes
 *   linked yet" on a hiccup, which surfaces the link form — still useful.
 *
 * This page is intentionally a thin composition layer. All copy lives in
 * the component files so product/legal can review them without opening
 * routing code.
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ParentDashboardHeader from '@/components/hs/ParentDashboardHeader';
import LinkedAthleteCard, {
  type ConsentBadgeState,
} from '@/components/hs/LinkedAthleteCard';
import LinkAthleteForm from '@/components/hs/LinkAthleteForm';
import ParentProtectionsCard from '@/components/hs/ParentProtectionsCard';
import { OnboardingCard } from '@/components/hs/OnboardingCard';
import { ReferralCodeCard } from '@/components/hs/ReferralCodeCard';
import {
  STATE_RULES,
  type StateNILRules,
  type USPSStateCode,
} from '@/lib/hs-nil/state-rules';
import { listDeferralsForParent } from '@/lib/hs-nil/deferred-payouts';

export const metadata: Metadata = {
  title: 'Parent dashboard — GradeUp HS',
  description:
    'Manage consent, oversight, and linked athletes on GradeUp HS.',
};

// Parent dashboard is highly user-specific — never cache across users.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ---------------------------------------------------------------------------
// DB row shapes — stable enough to pin inline rather than imported.
// ---------------------------------------------------------------------------

interface ParentProfileRow {
  id: string;
  full_name: string;
  relationship: 'parent' | 'legal_guardian';
}

interface LinkRow {
  id: string;
  athlete_user_id: string;
  relationship: 'parent' | 'legal_guardian';
  verified_at: string | null;
  created_at: string;
}

interface AthleteProfileRow {
  user_id: string;
  state_code: string;
  sport: string;
  school_name: string;
  date_of_birth: string;
  gpa: number | null;
  gpa_verification_tier: string;
}

interface ActiveConsentRow {
  id: string;
  athlete_user_id: string;
  expires_at: string;
  revoked_at: string | null;
  signed_at: string;
}

interface PendingConsentRow {
  id: string;
  athlete_user_id: string;
  parent_email: string;
  expires_at: string;
  consumed_at: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateAge(dob: string): number | null {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  const ms = target - Date.now();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function coerceGpaTier(
  raw: string | null | undefined
): 'self_reported' | 'user_submitted' | 'institution_verified' | null {
  if (
    raw === 'self_reported' ||
    raw === 'user_submitted' ||
    raw === 'institution_verified'
  ) {
    return raw;
  }
  return null;
}

function rulesForState(code: string | null): StateNILRules | null {
  if (!code) return null;
  return STATE_RULES[code as USPSStateCode] ?? null;
}

/**
 * Choose the most restrictive state for the ParentProtectionsCard's
 * disclosure sentence. "Most restrictive" = shortest disclosure window;
 * unknown states are treated as neutral. Returns null if no athletes are
 * linked (the card falls back to generic copy).
 */
function pickProtectionsState(
  athletes: AthleteProfileRow[]
): StateNILRules | null {
  let best: StateNILRules | null = null;
  for (const a of athletes) {
    const r = rulesForState(a.state_code);
    if (!r) continue;
    if (!best) {
      best = r;
      continue;
    }
    const bw = best.disclosureWindowHours ?? Number.POSITIVE_INFINITY;
    const rw = r.disclosureWindowHours ?? Number.POSITIVE_INFINITY;
    if (rw < bw) best = r;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function HSParentDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirectTo=/hs/parent');
  }

  const meta = (user.user_metadata ?? {}) as {
    first_name?: string;
    role?: string;
    relationship?: 'parent' | 'legal_guardian';
  };

  // Role gate. If a non-parent lands here, send them back to the public
  // surface rather than 403'ing — most likely they're an athlete who
  // mistyped the URL.
  if (meta.role !== 'hs_parent') {
    redirect('/hs');
  }

  const firstName = (meta.first_name?.trim() || 'there').split(/\s+/)[0];

  // --- Parent profile (graceful if unapplied migration) ------------------
  // When the migration hasn't shipped, this query either returns no rows
  // or errors. We swallow both and continue with a null profile — the
  // dashboard still works (degrades to the "no links" empty state).
  let parentProfile: ParentProfileRow | null = null;
  try {
    const { data } = await supabase
      .from('hs_parent_profiles')
      .select('id, full_name, relationship')
      .eq('user_id', user.id)
      .maybeSingle();
    parentProfile = (data as ParentProfileRow | null) ?? null;
  } catch (err) {
    // Table missing is the most common cause; fall through.
    // eslint-disable-next-line no-console
    console.warn('[hs-parent-dashboard] parent profile lookup failed', err);
  }

  // --- Linked athletes ---------------------------------------------------
  let links: LinkRow[] = [];
  if (parentProfile?.id) {
    try {
      const { data } = await supabase
        .from('hs_parent_athlete_links')
        .select('id, athlete_user_id, relationship, verified_at, created_at')
        .eq('parent_profile_id', parentProfile.id);
      links = (data as LinkRow[] | null) ?? [];
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[hs-parent-dashboard] link lookup failed', err);
    }
  }

  const athleteIds = links.map((l) => l.athlete_user_id);

  // --- Athlete profiles (best-effort; RLS may hide rows) ----------------
  let athleteProfiles: AthleteProfileRow[] = [];
  if (athleteIds.length > 0) {
    try {
      const { data } = await supabase
        .from('hs_athlete_profiles')
        .select(
          'user_id, state_code, sport, school_name, date_of_birth, gpa, gpa_verification_tier'
        )
        .in('user_id', athleteIds);
      athleteProfiles = (data as AthleteProfileRow[] | null) ?? [];
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[hs-parent-dashboard] athlete profile lookup failed', err);
    }
  }

  const profileByAthlete = new Map(
    athleteProfiles.map((p) => [p.user_id, p] as const)
  );

  // --- Consents (active + pending) --------------------------------------
  const nowIso = new Date().toISOString();

  const [activeConsentsRes, pendingConsentsRes] =
    athleteIds.length > 0
      ? await Promise.all([
          supabase
            .from('parental_consents')
            .select('id, athlete_user_id, expires_at, revoked_at, signed_at')
            .in('athlete_user_id', athleteIds)
            .is('revoked_at', null)
            .gt('expires_at', nowIso)
            .order('signed_at', { ascending: false }),
          supabase
            .from('pending_consents')
            .select('id, athlete_user_id, parent_email, expires_at, consumed_at')
            .in('athlete_user_id', athleteIds)
            .is('consumed_at', null)
            .gt('expires_at', nowIso),
        ])
      : [{ data: [] }, { data: [] }];

  const activeConsents =
    (activeConsentsRes.data as ActiveConsentRow[] | null) ?? [];
  const pendingConsents =
    (pendingConsentsRes.data as PendingConsentRow[] | null) ?? [];

  // Most-recent active consent per athlete.
  const latestActiveByAthlete = new Map<string, ActiveConsentRow>();
  for (const c of activeConsents) {
    if (!latestActiveByAthlete.has(c.athlete_user_id)) {
      latestActiveByAthlete.set(c.athlete_user_id, c);
    }
  }

  const pendingCountByAthlete = new Map<string, PendingConsentRow>();
  for (const p of pendingConsents) {
    if (!pendingCountByAthlete.has(p.athlete_user_id)) {
      pendingCountByAthlete.set(p.athlete_user_id, p);
    }
  }

  // --- Derive consent state per athlete ---------------------------------
  function consentStateFor(athleteUserId: string): ConsentBadgeState {
    const pending = pendingCountByAthlete.get(athleteUserId);
    if (pending) {
      return {
        kind: 'pending',
        id: pending.id,
        parentEmail: pending.parent_email,
      };
    }
    const active = latestActiveByAthlete.get(athleteUserId);
    if (active) {
      const dl = daysUntil(active.expires_at);
      if (dl <= 14) {
        return {
          kind: 'expiring',
          expiresAt: active.expires_at,
          id: active.id,
          daysLeft: Math.max(0, dl),
        };
      }
      return { kind: 'active', expiresAt: active.expires_at, id: active.id };
    }
    return { kind: 'none' };
  }

  // --- Renewal banner (any athlete <=14 days to expiry, no pending) -----
  const renewalTargets = links
    .map((l) => ({ link: l, state: consentStateFor(l.athlete_user_id) }))
    .filter((t) => t.state.kind === 'expiring');

  // --- Pill counts ------------------------------------------------------
  const activeConsentCount = links.reduce((n, l) => {
    const s = consentStateFor(l.athlete_user_id);
    return s.kind === 'active' || s.kind === 'expiring' ? n + 1 : n;
  }, 0);
  const pendingRequestCount = pendingCountByAthlete.size;

  // Protections-card state picks the most-restrictive among linked
  // athletes. Falls back to null, which renders generic copy.
  const protectionsState = pickProtectionsState(athleteProfiles);

  // --- Deferred payouts (TX escrow-until-18) ---------------------------
  // Fetch held deferrals for the parent's linked athletes. RLS on
  // hs_deferred_payouts already enforces parent_profile_id scope, so
  // passing parentProfile.id is safe + sufficient. Empty when TX isn't
  // involved or athletes have all aged out.
  interface DeferralBannerRow {
    id: string;
    athlete_user_id: string;
    amount_cents: number;
    release_eligible_at: string;
    status: string;
  }
  let heldDeferrals: DeferralBannerRow[] = [];
  if (parentProfile?.id) {
    try {
      const deferrals = await listDeferralsForParent(
        parentProfile.id,
        supabase,
      );
      heldDeferrals = deferrals
        .filter((d) => d.status === 'holding')
        .map((d) => ({
          id: d.id,
          athlete_user_id: d.athlete_user_id,
          amount_cents: d.amount_cents,
          release_eligible_at: d.release_eligible_at,
          status: d.status,
        }));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[hs-parent-dashboard] deferrals lookup failed', err);
    }
  }

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <ParentDashboardHeader
          firstName={firstName}
          linkedCount={links.length}
          activeConsentCount={activeConsentCount}
          pendingRequestCount={pendingRequestCount}
        />

        {/* Deferred earnings banner — TX escrow-until-18. */}
        {heldDeferrals.length > 0 && (
          <section className="mt-8">
            {(() => {
              // Pick the earliest release for the most-actionable message.
              const sorted = [...heldDeferrals].sort(
                (a, b) =>
                  new Date(a.release_eligible_at).getTime() -
                  new Date(b.release_eligible_at).getTime(),
              );
              const next = sorted[0];
              const totalCents = heldDeferrals.reduce(
                (sum, d) => sum + d.amount_cents,
                0,
              );
              const nextProfile = profileByAthlete.get(next.athlete_user_id);
              const athleteLabel = nextProfile?.school_name
                ? `athlete at ${nextProfile.school_name}`
                : 'your athlete';
              const amountStr = `$${Math.round(totalCents / 100).toLocaleString()}`;
              const dateStr = new Date(
                next.release_eligible_at,
              ).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'UTC',
              });
              return (
                <div
                  role="status"
                  className="rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 px-5 py-4 text-sm text-white/80"
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
                    Held in trust
                  </p>
                  <p className="mt-2">
                    {amountStr} in deferred earnings for {athleteLabel} —
                    releases on <strong className="text-white">{dateStr}</strong>{' '}
                    when they turn 18.
                  </p>
                </div>
              );
            })()}
          </section>
        )}

        {/* Renewal banner — only when something is expiring. */}
        {renewalTargets.length > 0 && (
          <section className="mt-8 space-y-3">
            {renewalTargets.map(({ link, state }) => {
              if (state.kind !== 'expiring') return null;
              const profile = profileByAthlete.get(link.athlete_user_id);
              const name = profile?.school_name
                ? `your athlete at ${profile.school_name}`
                : 'your athlete';
              return (
                <div
                  key={link.id}
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
                >
                  <p>
                    Consent for {name} expires in{' '}
                    <strong>
                      {state.daysLeft} day{state.daysLeft === 1 ? '' : 's'}
                    </strong>
                    .
                  </p>
                  <Link
                    href="/hs/consent/request"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
                  >
                    Renew now
                  </Link>
                </div>
              );
            })}
          </section>
        )}

        {/* Section 1: Linked athletes */}
        <section aria-labelledby="athletes-heading" className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 id="athletes-heading" className="font-display text-3xl md:text-4xl">
              Your athletes.
            </h2>
            {links.length > 0 && (
              <span className="text-xs text-white/50">
                {links.length} linked
              </span>
            )}
          </div>

          {links.length === 0 ? (
            <div className="mt-6 space-y-6">
              <OnboardingCard
                accent
                eyebrow="Before we connect you"
                title="Here&rsquo;s what happens next."
                description="Linking is two-sided so it can&rsquo;t be faked. When you enter your athlete&rsquo;s email, we send them a one-click confirmation. Once they accept, you see their page — and they see yours."
              >
                <ol className="mt-4 space-y-2 text-sm text-white/70">
                  <li>1. Enter your athlete&rsquo;s email below.</li>
                  <li>
                    2. They get a confirmation email and click to accept the
                    link.
                  </li>
                  <li>
                    3. Their profile, consent status, and state rules appear
                    here for you to manage.
                  </li>
                </ol>
              </OnboardingCard>

              <LinkAthleteForm
                initiallyExpanded
                relationship={
                  parentProfile?.relationship ?? meta.relationship
                }
              />
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {links.map((link) => {
                  const profile = profileByAthlete.get(link.athlete_user_id);
                  const age = profile?.date_of_birth
                    ? calculateAge(profile.date_of_birth)
                    : null;
                  return (
                    <LinkedAthleteCard
                      key={link.id}
                      athleteUserId={link.athlete_user_id}
                      firstName={null}
                      fallbackLabel={profile?.school_name ?? 'Linked athlete'}
                      schoolName={profile?.school_name ?? null}
                      sport={profile?.sport ?? null}
                      stateCode={profile?.state_code ?? null}
                      age={age}
                      gpa={profile?.gpa ?? null}
                      gpaTier={coerceGpaTier(profile?.gpa_verification_tier)}
                      linkVerified={Boolean(link.verified_at)}
                      stateRules={rulesForState(profile?.state_code ?? null)}
                      consent={consentStateFor(link.athlete_user_id)}
                    />
                  );
                })}
              </div>

              <div className="mt-6">
                <LinkAthleteForm
                  initiallyExpanded={false}
                  relationship={
                    parentProfile?.relationship ?? meta.relationship
                  }
                />
              </div>
            </>
          )}
        </section>

        {/* Section: Invite code — the viral amplifier that lets a parent
            refer another parent in one click. Measures the "5 unprompted
            parent-to-parent referrals in 30 days" concierge MVP goal. */}
        <section aria-labelledby="referrals-heading" className="mt-12">
          <h2 id="referrals-heading" className="sr-only">
            Invite other parents
          </h2>
          <ReferralCodeCard />
        </section>

        {/* Section 3: Protections (static copy) */}
        <section className="mt-12">
          <ParentProtectionsCard stateRules={protectionsState} />
        </section>

        {/* Help & resources */}
        <section
          aria-labelledby="help-heading"
          className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8"
        >
          <h2 id="help-heading" className="font-display text-2xl text-white/80">
            Help & resources
          </h2>
          <p className="mt-2 text-sm text-white/60">
            Plain-English answers to the questions every new parent asks. More
            coming with the Phase 1 release.
          </p>
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            <ResourceLink
              title={`Understanding NIL${protectionsState ? ` in ${protectionsState.state}` : ''}`}
              hint="What your state allows and where the lines are."
              href="/hs"
            />
            <ResourceLink
              title="How consent works"
              hint="Categories, dollar limits, duration, and revocation."
              href="/hs/consent/manage"
            />
            <ResourceLink
              title="Contact support"
              hint="Talk to a real person. Response within one business day."
              href="mailto:support@gradeupnil.com"
            />
            <ResourceLink
              title="Onboarding recap"
              hint="Go back through the welcome flow any time."
              href="/hs/onboarding/parent-next"
            />
          </ul>
        </section>

        {/* Unapplied-migration escape hatch. Silent for end users; shows
            up only when we couldn't load the parent profile AND their
            session says they're a parent — very likely the migration
            hasn't shipped in this env yet. */}
        {!parentProfile && (
          <p className="mt-10 text-xs text-white/40">
            Note: account sync is still rolling out. Some dashboard features
            may light up shortly.
          </p>
        )}
      </div>
    </main>
  );
}

function ResourceLink({
  title,
  hint,
  href,
}: {
  title: string;
  hint: string;
  href: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="block rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/5"
      >
        <p className="font-semibold text-white">{title}</p>
        <p className="mt-1 text-xs text-white/50">{hint}</p>
      </Link>
    </li>
  );
}
