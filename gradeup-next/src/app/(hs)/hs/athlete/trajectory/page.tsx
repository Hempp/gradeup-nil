/**
 * HS Athlete Trajectory — /hs/athlete/trajectory (auth'd)
 *
 * Server Component. Auth-gated + HS-athlete-gated. The full trajectory
 * view (chart, milestones, completed deals, share management) for the
 * signed-in athlete. Uses PublicTrajectoryView for the narrative
 * renderer and layers the ShareCard on top.
 *
 * Auth + role gating mirrors /hs/athlete/earnings.
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  getTrajectoryForAthlete,
  listTrajectorySharesForAthlete,
} from '@/lib/hs-nil/trajectory';
import { PublicTrajectoryView } from '@/components/hs/PublicTrajectoryView';
import { TrajectoryShareCard } from '@/components/hs/TrajectoryShareCard';

export const metadata: Metadata = {
  title: 'Your trajectory — GradeUp HS',
  description:
    'Your academic-athletic trajectory — GPA over time, milestones, completed deals. Shareable with recruiters.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HSAthleteTrajectoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/hs/athlete/trajectory');
  }

  const { data: profile } = await supabase
    .from('hs_athlete_profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) {
    redirect('/hs/signup/athlete?notice=convert');
  }

  const [trajectory, shares] = await Promise.all([
    getTrajectoryForAthlete(supabase, user.id),
    listTrajectorySharesForAthlete(supabase, user.id),
  ]);

  if (!trajectory) {
    redirect('/hs/athlete');
  }

  return (
    <>
      <PublicTrajectoryView
        trajectory={trajectory}
        showBranding={false}
        backHref="/hs/athlete"
      />
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <TrajectoryShareCard initialShares={shares} />
      </section>
    </>
  );
}
