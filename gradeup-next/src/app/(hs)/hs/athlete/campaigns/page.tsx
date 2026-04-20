/**
 * /hs/athlete/campaigns — browse open HS campaigns
 *
 * Server Component. Shows the campaigns that match the athlete's
 * state plus any campaigns they've been explicitly invited to,
 * annotated with consent-coverage status per card.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import HSCampaignCard from '@/components/hs/HSCampaignCard';
import { listOpenCampaignsForAthlete } from '@/lib/hs-nil/campaigns';

export const metadata: Metadata = {
  title: 'Campaigns — GradeUp HS',
  description: 'Open HS NIL campaigns for you.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HSAthleteCampaignsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/hs/athlete/campaigns');
  }

  const { data: profile } = await supabase
    .from('hs_athlete_profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile) {
    redirect('/hs/signup/athlete?notice=convert');
  }

  const rows = await listOpenCampaignsForAthlete(user.id).catch(() => []);

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-24">
        <Link
          href="/hs/athlete"
          className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
        >
          ← Back to dashboard
        </Link>

        <h1 className="mt-6 font-display text-4xl md:text-5xl">
          Open campaigns.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/70">
          Campaigns let one brand work with many athletes at once. Each
          accepted application becomes a normal deal on your dashboard.
        </p>

        {rows.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-8">
            <p className="font-semibold text-white">No campaigns open.</p>
            <p className="mt-1 text-sm text-white/60">
              We&rsquo;ll notify you as soon as a campaign in your state
              opens.
            </p>
          </div>
        ) : (
          <ul className="mt-8 grid gap-3 md:grid-cols-2">
            {rows.map((r) => (
              <li key={r.id}>
                <HSCampaignCard
                  id={r.id}
                  title={r.title}
                  dealCategory={r.dealCategory}
                  baseCompensationCents={r.baseCompensationCents}
                  invited={r.invited}
                  consentCovered={r.consentCovered}
                  athleteSelection={r.athleteSelection}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
