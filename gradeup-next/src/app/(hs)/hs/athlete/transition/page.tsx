/**
 * /hs/athlete/transition — HS-to-college bridge landing.
 *
 * One of three shapes at render time:
 *   (a) initiate form       — no transition in flight
 *   (b) status card         — transition pending or verified
 *   (c) status card + init  — transition denied / cancelled (terminal),
 *                             re-offer the form below the history card
 *
 * Access control: auth-gated + must have hs_athlete_profiles row. Users
 * landing here without one are bounced to the HS signup conversion flow,
 * same pattern as /hs/athlete.
 *
 * Below the transition card we always render NCAARecruitingNoticeCard —
 * the "coming soon" scaffold for recruiting-office integration. It lives
 * here, not on /hs/athlete, per scope (TRAJECTORY-FORGE owns that page).
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  getTransitionForAthlete,
  type TransitionRow,
} from '@/lib/hs-nil/transitions';
import TransitionInitiateForm from '@/components/hs/TransitionInitiateForm';
import TransitionProofUpload from '@/components/hs/TransitionProofUpload';
import TransitionStatusCard from '@/components/hs/TransitionStatusCard';
import NCAARecruitingNoticeCard from '@/components/hs/NCAARecruitingNoticeCard';

export const metadata: Metadata = {
  title: 'Your college transition — GradeUp HS',
  description:
    'Move your GradeUp account from the high-school bracket to the college bracket without losing your academic narrative.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HSAthleteTransitionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/hs/athlete/transition');
  }

  // Must have an HS profile to see this page.
  const { data: profile } = await supabase
    .from('hs_athlete_profiles')
    .select('graduation_year, school_name, sport')
    .eq('user_id', user.id)
    .maybeSingle<{
      graduation_year: number;
      school_name: string;
      sport: string;
    }>();

  if (!profile) {
    redirect('/hs/signup/athlete?notice=convert');
  }

  const transition: TransitionRow | null = await getTransitionForAthlete(
    user.id
  );

  const showInitiateForm =
    !transition ||
    transition.status === 'denied' ||
    transition.status === 'cancelled';

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          HS → College bridge
        </p>
        <h1 className="mt-2 font-display text-3xl text-white md:text-5xl">
          Your college transition
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/70 md:text-base">
          Moving to college? Lock in the switch here. Every other NIL
          platform starts you from scratch the day you commit — GradeUp
          carries your verified high-school narrative forward so you arrive
          at college with your story already on file.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-10">
        {transition ? (
          <>
            <TransitionStatusCard
              transitionId={transition.id}
              status={transition.status}
              collegeName={transition.college_name}
              collegeState={transition.college_state}
              ncaaDivision={transition.ncaa_division}
              matriculationDate={transition.matriculation_date}
              sportContinued={transition.sport_continued}
              proofOnFile={Boolean(transition.enrollment_proof_storage_path)}
              denialReason={transition.denial_reason}
              requestedAt={transition.requested_at}
              confirmedAt={transition.confirmed_at}
            />

            {transition.status === 'pending' ? (
              <div className="mt-6">
                <TransitionProofUpload
                  transitionId={transition.id}
                  alreadyUploaded={Boolean(
                    transition.enrollment_proof_storage_path
                  )}
                />
              </div>
            ) : null}
          </>
        ) : null}

        {showInitiateForm ? (
          <div className={transition ? 'mt-10' : ''}>
            {transition ? (
              <p className="mb-4 text-sm text-white/70">
                Start a new transition request below.
              </p>
            ) : null}
            <TransitionInitiateForm
              defaultMatriculationYear={profile.graduation_year}
            />
          </div>
        ) : null}
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24">
        <NCAARecruitingNoticeCard />
      </section>
    </main>
  );
}
