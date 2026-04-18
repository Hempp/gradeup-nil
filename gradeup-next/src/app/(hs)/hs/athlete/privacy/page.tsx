/**
 * HS Athlete — Privacy — /hs/athlete/privacy
 *
 * Server Component. Shows the athlete's current discoverability flag
 * and explains exactly what brands see vs. don't see. The toggle
 * itself lives in DiscoverabilityToggleCard (Client) because it
 * needs to POST to /api/hs/athlete/discoverability and manage
 * optimistic UI.
 *
 * Opt-out semantics, not opt-in: existing athletes are discoverable
 * by default. See migration 20260418_014_athlete_visibility.sql for
 * the full rationale.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DiscoverabilityToggleCard from '@/components/hs/DiscoverabilityToggleCard';

export const metadata: Metadata = {
  title: 'Privacy — GradeUp HS',
  description:
    'Control whether brands can find you. Opt-out any time — existing deals are unaffected.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface AthleteProfileRow {
  state_code: string;
  is_discoverable: boolean | null;
  discoverability_updated_at: string | null;
}

export default async function HSAthletePrivacyPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/hs/athlete/privacy');
  }

  const { data, error } = await supabase
    .from('hs_athlete_profiles')
    .select('state_code, is_discoverable, discoverability_updated_at')
    .eq('user_id', user.id)
    .maybeSingle<AthleteProfileRow>();

  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[hs-athlete-privacy] profile fetch failed', error.message);
  }

  if (!data) {
    redirect('/hs/signup/athlete?notice=convert');
  }

  const isDiscoverable = data.is_discoverable !== false; // default true

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-24">
        <Link
          href="/hs/athlete"
          className="inline-flex items-center gap-1 text-sm text-white/60 transition-colors hover:text-white"
        >
          ← Back to dashboard
        </Link>

        <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          Privacy controls
        </p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl">
          Who can see you.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/70 md:text-base">
          GradeUp matches you with brands whose deal categories fit your
          interests and whose operating states include yours. This page lets
          you control whether you show up in those matches at all.
        </p>

        <div className="mt-10">
          <DiscoverabilityToggleCard
            initialIsDiscoverable={isDiscoverable}
            initialUpdatedAt={data.discoverability_updated_at}
            stateCode={data.state_code}
          />
        </div>

        <aside className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/60">
          <p className="font-semibold text-white/80">What stays the same.</p>
          <p className="mt-1">
            Opting out hides you from the brand suggested-athletes list. It
            does <strong>not</strong> cancel existing deals, revoke parental
            consent, or affect your athlete profile anywhere else on GradeUp.
            You can opt back in at any time.
          </p>
        </aside>
      </section>
    </main>
  );
}
