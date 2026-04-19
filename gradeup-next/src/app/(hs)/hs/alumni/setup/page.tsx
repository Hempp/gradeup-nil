/**
 * /hs/alumni/setup — mentor onboarding page.
 *
 * Eligibility-gated at the server layer: only users with a verified
 * athlete_bracket_transitions row see the form. Everyone else gets a
 * friendly explainer pointing at the transition flow.
 *
 * If the user already has a mentor profile we render the form in edit mode
 * with the existing values preloaded.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  isMentorEligible,
  getMentorProfileByUserId,
} from '@/lib/hs-nil/mentors';
import MentorOnboardingForm from '@/components/hs/MentorOnboardingForm';

export const metadata: Metadata = {
  title: 'Become a mentor — GradeUp HS',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MentorSetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/hs/alumni/setup');
  }

  const eligible = await isMentorEligible(user.id);
  const existing = eligible ? await getMentorProfileByUserId(user.id) : null;

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          Mentor onboarding
        </p>
        <h1 className="mt-2 font-display text-3xl text-white md:text-5xl">
          {existing ? 'Edit your mentor profile' : 'Pay it forward'}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/70">
          {existing
            ? 'Update what HS athletes see when they browse mentors.'
            : "Now that you've made the jump, the next class needs you. Share what you wish someone had told you — a few minutes of your time can save a 16-year-old from a whole semester of guessing."}
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24">
        {!eligible ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="font-display text-2xl text-white">
              Mentorship unlocks after your transition is verified
            </h2>
            <p className="mt-3 text-sm text-white/70">
              Only alumni whose HS-to-college transition is verified can
              create a mentor profile. This keeps the network credible — HS
              athletes are talking to someone who actually made it.
            </p>
            <Link
              href="/hs/athlete/transition"
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--accent-primary)] px-6 py-2 text-sm font-semibold text-black hover:opacity-90"
            >
              Go to transition page
            </Link>
          </div>
        ) : (
          <MentorOnboardingForm initialProfile={existing} />
        )}
      </section>
    </main>
  );
}
