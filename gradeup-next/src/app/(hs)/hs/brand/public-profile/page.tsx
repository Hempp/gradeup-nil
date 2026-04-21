import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { BrandPublicProfileSettings } from '@/components/hs/BrandPublicProfileSettings';
import { PILOT_STATES, STATE_RULES } from '@/lib/hs-nil/state-rules';

export const metadata: Metadata = {
  title: 'Public brand profile | GradeUp HS',
  robots: { index: false, follow: false },
};

export default async function BrandPublicProfileSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/hs/brand/public-profile');
  }

  const { data: brand } = await supabase
    .from('brands')
    .select(
      'id, profile_id, public_slug, public_visibility, public_bio, public_website, public_avatar_url, public_location_city, public_location_region',
    )
    .eq('profile_id', user.id)
    .maybeSingle<{
      id: string;
      profile_id: string;
      public_slug: string | null;
      public_visibility: boolean | null;
      public_bio: string | null;
      public_website: string | null;
      public_avatar_url: string | null;
      public_location_city: string | null;
      public_location_region: string | null;
    }>();

  if (!brand) {
    redirect('/hs/signup/brand?notice=public-profile');
  }

  const pilotStates = PILOT_STATES.map((code) => ({
    code,
    name: STATE_RULES[code]?.state ?? code,
  }));

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <div className="mx-auto max-w-3xl px-6 pt-16 pb-20">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Brand Settings
          </p>
          <h1 className="mt-2 font-display text-4xl leading-tight">
            Your public brand profile
          </h1>
          <p className="mt-2 text-white/60">
            Claim a slug, write a short bio, and turn on visibility to appear
            in the brand directory.
          </p>
        </header>

        <BrandPublicProfileSettings
          brandId={brand.id}
          initial={{
            slug: brand.public_slug,
            visibility: brand.public_visibility === true,
            bio: brand.public_bio,
            website: brand.public_website,
            avatarUrl: brand.public_avatar_url,
            city: brand.public_location_city,
            region: brand.public_location_region,
          }}
          pilotStates={pilotStates}
        />
      </div>
    </main>
  );
}
