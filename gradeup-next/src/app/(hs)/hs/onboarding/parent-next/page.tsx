/**
 * Parent / Guardian — Post-Signup Next Steps
 *
 * First page a new HS parent sees after signup. Parents are the decision-
 * makers on consent, payouts, and oversight, so this page leads with trust
 * and control rather than "sign up your athlete."
 *
 * Data model reality check (April 2026):
 *   The `hs_parent_profiles` and `hs_parent_athlete_links` tables do NOT
 *   exist yet (see signup/parent/page.tsx header comment — migration is
 *   deferred to Phase 2, task #22). In the meantime the parent signup
 *   writes everything we need to `auth.users.user_metadata`:
 *     - first_name, last_name, role='hs_parent', relationship
 *     - pending_athlete_name, pending_athlete_email
 *   This page reads from metadata with a graceful fallback note so the
 *   UX works today and will upgrade cleanly when the migration lands.
 *
 * Pending-consent count is also deferred — we cannot query a parent→athlete
 * linkage without the link table. The checklist shows it as "Coming soon"
 * until linking is real.
 */

import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import {
  OnboardingChecklist,
  type ChecklistItem,
} from '@/components/hs/OnboardingChecklist';
import { OnboardingCard } from '@/components/hs/OnboardingCard';

export const metadata: Metadata = {
  title: 'Welcome — GradeUp HS for parents',
  description: 'Next steps for parents and guardians of HS scholar-athletes.',
};

export default async function HSParentNextStepsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/hs/onboarding/parent-next');
  }

  const meta = (user.user_metadata ?? {}) as {
    first_name?: string;
    pending_athlete_name?: string;
    pending_athlete_email?: string;
    relationship?: string;
  };

  const firstName = (meta.first_name?.trim() || 'there').split(/\s+/)[0];
  const athleteName = meta.pending_athlete_name?.trim() || null;

  // `hs_parent_profiles` does not exist yet; intentionally do not attempt
  // to query it. When the Phase 2 migration lands (task #22), replace the
  // metadata read above with a real `hs_parent_profiles` + `hs_parent_athlete_links`
  // query and drop the TODO block below.
  const linkingDeferred = true;

  const items: ChecklistItem[] = [
    {
      label: 'Create your parent account',
      hint: 'You can manage consent, payouts, and approvals from here.',
      completed: true,
    },
    {
      label: athleteName ? `Link to ${athleteName}` : 'Link to your athlete',
      hint: linkingDeferred
        ? 'Athlete linking goes live in the next release. For now, have your athlete create their account with the same email you provided.'
        : 'Confirm the link so you can approve their deals.',
      status: linkingDeferred ? 'Coming soon' : 'Pending',
      disabled: linkingDeferred,
    },
    {
      label: 'Review state rules',
      hint: 'Three minutes. So you know what questions to ask when a deal shows up.',
      href: '/hs',
      status: 'Recommended',
    },
    {
      label: 'Review pending consent requests',
      hint: linkingDeferred
        ? 'Once your athlete is linked, consent requests will appear here.'
        : 'Consent requests from your linked athlete will appear here.',
      href: '/hs/consent/manage',
      status: linkingDeferred ? 'Coming soon' : 'Required',
      disabled: linkingDeferred,
    },
  ];

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          Account created
        </p>
        <h1 className="mt-3 font-display text-4xl leading-tight md:text-6xl">
          Thank you, {firstName}.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-white/70">
          You&rsquo;re here to protect and empower your scholar-athlete. Everything
          on GradeUp HS is built to keep you in the loop — no deal goes live
          without your signature.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-10">
        <OnboardingChecklist items={items} />
      </section>

      {linkingDeferred && (
        <section className="mx-auto max-w-3xl px-6 pb-10">
          <OnboardingCard
            accent
            eyebrow="Heads up"
            title="Athlete linking is shipping soon."
            description={
              athleteName
                ? `We saved the athlete you named (${athleteName}) and will link accounts automatically in the next release. You can still sign in and explore.`
                : 'We saved your pending athlete info and will link accounts automatically in the next release. You can still sign in and explore.'
            }
          />
        </section>
      )}

      <section className="mx-auto max-w-3xl px-6 pb-24">
        <h2 className="font-display text-3xl text-white md:text-4xl">
          What NIL means for your athlete
        </h2>
        <p className="mt-3 max-w-2xl text-white/70">
          GradeUp HS is the first NIL platform built from day one for parents.
          Three things to know.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <OnboardingCard
            eyebrow="The wedge"
            title="Grades on the jersey."
            description="Every GradeUp athlete shows a verified GPA alongside their sport. A 3.9 freshman is a story brands want to sponsor — and the kind of NIL deal you'll actually want to share."
          />
          <OnboardingCard
            eyebrow="The guardrails"
            title="No pay-for-play. No school marks."
            description="Compensation can't be tied to performance, and logos, mascots, and uniforms are off-limits. Banned categories (gambling, alcohol, tobacco, cannabis, adult, weapons) never clear our review."
          />
          <OnboardingCard
            eyebrow="Your control"
            title="Consent-scoped."
            description="You sign a consent that spells out the categories, the max deal amount, and how long it lasts. Revoke it anytime. For minors, payouts route through a parent-custodial account — never direct to your athlete."
          />
        </div>
      </section>
    </main>
  );
}
