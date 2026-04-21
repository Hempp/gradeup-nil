import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getSettingsForAthlete } from '@/lib/hs-nil/athlete-profile';
import { AthletePublicProfileSettings } from '@/components/hs/AthletePublicProfileSettings';

export const metadata: Metadata = {
  title: 'Public profile | GradeUp HS',
  robots: { index: false, follow: false },
};

export default async function AthletePublicProfileSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/hs/athlete/public-profile');
  }

  const settings = await getSettingsForAthlete(supabase, user.id);

  if (!settings) {
    // Athlete hasn't set up HS profile yet.
    redirect('/hs/signup/athlete?notice=public-profile');
  }

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <div className="mx-auto max-w-3xl px-6 pt-16 pb-20">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Athlete Settings
          </p>
          <h1 className="mt-2 font-display text-4xl leading-tight">
            Your public profile
          </h1>
          <p className="mt-2 text-white/60">
            Your verified GPA and deal history are your narrative. Choose how
            the world sees them.
          </p>
        </header>

        <AthletePublicProfileSettings
          initial={{
            username: settings.username,
            bio: settings.publicBio,
            visibility: settings.publicVisibility,
          }}
        />
      </div>
    </main>
  );
}
