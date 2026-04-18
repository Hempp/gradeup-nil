/**
 * HS Athlete — Post-Signup Next Steps
 *
 * First page a brand-new HS athlete sees after creating their account.
 * Three jobs:
 *   1. Acknowledge the work they just did (welcome + checkmark).
 *   2. Show the remaining path (consent, GPA verification, payouts).
 *   3. Keep them oriented while parts of the product are still TODO
 *      (verify-gpa + payouts pages don't exist yet — they render as
 *      disabled "Coming soon" items so the list tells the truth).
 *
 * Data sources:
 *   - supabase.auth.getUser() → identity, first-name metadata,
 *     `requires_parental_consent` flag set at signup.
 *   - hs_athlete_profiles row → state_code, sport, school_name, dob,
 *     gpa_verification_tier. Drives per-state copy + minor logic.
 *
 * Defensive redirect: if a stale session makes `getUser()` return null,
 * we bounce to /login?next=<this page> rather than render an empty shell.
 *
 * Flag gating: inherits `(hs)` layout — if FEATURE_HS_NIL is off, the
 * layout 404s before this component ever renders.
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import {
  OnboardingChecklist,
  type ChecklistItem,
} from '@/components/hs/OnboardingChecklist';
import { OnboardingCard } from '@/components/hs/OnboardingCard';
import { Button } from '@/components/ui/button';
import {
  STATE_RULES,
  type USPSStateCode,
} from '@/lib/hs-nil/state-rules';

export const metadata: Metadata = {
  title: 'Next steps — GradeUp HS',
  description: 'Finish setting up your GradeUp HS athlete account.',
};

// Keep this colocated — the signup page uses the same mapping, and for
// three states it's not worth an abstraction.
const STATE_NAMES: Record<USPSStateCode, string> = {
  CA: 'California',
  FL: 'Florida',
  GA: 'Georgia',
} as Record<USPSStateCode, string>;

interface AthleteProfileRow {
  state_code: string;
  sport: string;
  school_name: string;
  date_of_birth: string;
  gpa_verification_tier: string;
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

export default async function HSAthleteNextStepsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/hs/onboarding/next-steps');
  }

  // Pull the athlete profile we just inserted at signup. We do NOT
  // require it to be present — a partial-signup edge case (auth created,
  // profile insert failed) should still land on a usable page.
  const { data: profileRow } = await supabase
    .from('hs_athlete_profiles')
    .select('state_code, sport, school_name, date_of_birth, gpa_verification_tier')
    .eq('user_id', user.id)
    .maybeSingle<AthleteProfileRow>();

  const meta = (user.user_metadata ?? {}) as {
    first_name?: string;
    requires_parental_consent?: boolean;
  };
  const firstName = (meta.first_name?.trim() || 'there').split(/\s+/)[0];

  // Source of truth for "is this user a minor":
  //   1. user_metadata.requires_parental_consent (set at signup from DOB),
  //   2. DOB on profile row (authoritative if present).
  // Prefer the profile-row derivation; fall back to metadata.
  const ageFromProfile = profileRow?.date_of_birth
    ? calcAgeFromDob(profileRow.date_of_birth)
    : null;
  const isMinor =
    ageFromProfile !== null
      ? ageFromProfile < 18
      : Boolean(meta.requires_parental_consent);

  const stateCode = (profileRow?.state_code ?? '') as USPSStateCode | '';
  const stateRules = stateCode ? STATE_RULES[stateCode] : undefined;
  const stateName = stateCode ? (STATE_NAMES[stateCode] ?? stateCode) : null;

  // Build checklist based on profile state. Items 3 and 4 are intentionally
  // disabled — their target pages do not exist yet. Rather than hiding them
  // we surface them so the user knows the full journey.
  const items: ChecklistItem[] = [
    {
      label: 'Create your athlete profile',
      hint: profileRow
        ? `${profileRow.sport} • ${profileRow.school_name}`
        : 'Basics are in. We can refine them anytime.',
      completed: true,
    },
    isMinor
      ? {
          label: 'Request parental consent',
          hint: 'A parent or guardian has to co-sign before any deal can go live. Takes about 5 minutes on their end.',
          href: '/hs/consent/request',
          status: 'Required',
        }
      : {
          label: 'Confirm contact + payout details',
          hint: "You're 18+, so you sign your own deals. Finish payouts next.",
          href: '/hs/onboarding/payouts',
          status: 'Required',
          // payouts is TODO; flip to disabled once link is confirmed broken
          disabled: true,
        },
    {
      label: 'Verify your GPA',
      hint:
        profileRow?.gpa_verification_tier === 'institution_verified'
          ? 'Institution-verified — nothing more to do here.'
          : profileRow?.gpa_verification_tier === 'user_submitted'
            ? 'Verified from your uploaded transcript. Upload again if it changes.'
            : profileRow?.gpa_verification_tier === 'self_reported'
              ? 'Self-reported today. Upload a transcript to earn a verified badge.'
              : 'Upload a transcript to earn a verified badge.',
      href: '/hs/onboarding/verify-gpa',
      status:
        profileRow?.gpa_verification_tier === 'user_submitted' ||
        profileRow?.gpa_verification_tier === 'institution_verified'
          ? 'Complete'
          : 'Optional',
      completed:
        profileRow?.gpa_verification_tier === 'user_submitted' ||
        profileRow?.gpa_verification_tier === 'institution_verified',
    },
    {
      label: 'Set up payouts',
      hint: isMinor
        ? 'Your parent or guardian will set this up as custodian after consent is signed.'
        : 'Connect a Stripe account so deals can pay out.',
      href: '/hs/onboarding/payouts',
      status: 'Coming soon',
      disabled: true,
    },
  ];

  const primaryCta = isMinor
    ? {
        label: 'Request parental consent',
        href: '/hs/consent/request',
      }
    : {
        label: 'Set up payouts',
        // Until the payouts page exists we park the CTA on the dashboard
        // landing so the user has somewhere to go.
        href: '/hs/onboarding/payouts',
      };

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          Account created
        </p>
        <h1 className="mt-3 font-display text-4xl leading-tight md:text-6xl">
          Welcome, {firstName}. Here&rsquo;s what comes next.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-white/70">
          You just took the first step. A few more and your profile is ready
          to earn — verified GPA, compliant deals, parents in the loop.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-10">
        <OnboardingChecklist items={items} />
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-10">
        <Link href={primaryCta.href} className="inline-block">
          <Button size="lg" variant="primary">
            {primaryCta.label}
          </Button>
        </Link>
      </section>

      {stateRules && stateName && (
        <section className="mx-auto max-w-3xl px-6 pb-24">
          <OnboardingCard
            eyebrow={`While you wait — ${stateName} rules`}
            title={`How NIL works in ${stateName}`}
            description="Every state writes its own rulebook. Here's the short version of yours."
          >
            <dl className="grid gap-4 text-sm md:grid-cols-2">
              <Fact
                label="Disclosure window"
                value={
                  stateRules.disclosureWindowHours
                    ? `${Math.round(stateRules.disclosureWindowHours / 24)} days after signing`
                    : 'No formal window'
                }
              />
              <Fact
                label="Discloses to"
                value={
                  stateRules.disclosureRecipient === 'state_athletic_association'
                    ? 'State athletic association'
                    : stateRules.disclosureRecipient === 'school'
                      ? 'Your school'
                      : stateRules.disclosureRecipient === 'both'
                        ? 'School + state association'
                        : 'N/A'
                }
              />
              <Fact
                label="Parental consent"
                value={stateRules.requiresParentalConsent ? 'Required for minors' : 'Not required'}
              />
              <Fact
                label="Minimum age"
                value={stateRules.minimumAge ? `${stateRules.minimumAge}+` : 'No minimum'}
              />
            </dl>
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
                Never allowed
              </p>
              <p className="mt-1 text-sm text-white/70">
                {stateRules.bannedCategories.join(' • ')}
              </p>
              <p className="mt-3 text-xs text-white/50">
                Plus a universal rule everywhere: no school logos, mascots, or uniforms
                — and nothing tied to on-field performance.
              </p>
            </div>
          </OnboardingCard>
        </section>
      )}

      {!stateRules && (
        // Should be unreachable — signup gates on PILOT_STATES — but fail
        // gracefully rather than 500 if a profile row is missing.
        <section className="mx-auto max-w-3xl px-6 pb-24">
          <OnboardingCard
            eyebrow="Heads up"
            title="We couldn't find your athlete profile."
            description="Your account is live, but the profile row is missing. Contact support and we'll get you unstuck."
          />
        </section>
      )}
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <dt className="text-xs font-semibold uppercase tracking-widest text-white/50">
        {label}
      </dt>
      <dd className="mt-1 text-base text-white">{value}</dd>
    </div>
  );
}
