import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Script from 'next/script';
import {
  getPublicProfileByUsername,
  logProfileView,
} from '@/lib/hs-nil/athlete-profile';
import { AthletePublicHero } from '@/components/marketing/AthletePublicHero';
import { AthletePublicTrajectoryStrip } from '@/components/marketing/AthletePublicTrajectoryStrip';
import { SupportAthleteButton } from '@/components/hs/SupportAthleteButton';
import { headers } from 'next/headers';

export const revalidate = 3600;

type Params = Promise<{ username: string }>;

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
    'https://gradeupnil.com'
  );
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfileByUsername(username);
  if (!profile) {
    return {
      title: 'Athlete profile | GradeUp HS',
      robots: { index: false, follow: false },
    };
  }

  const title = `${profile.firstName} ${profile.lastInitial}. — ${
    profile.sport ?? 'HS Athlete'
  } — GradeUp HS`;
  const description = profile.publicBio
    ? profile.publicBio
    : `${profile.firstName} ${profile.lastInitial}., ${
        profile.graduationYear ? `Class of ${profile.graduationYear}, ` : ''
      }${profile.school ?? 'HS athlete'}${
        profile.sport ? ` · ${profile.sport}` : ''
      }. Verified scholar-athlete on GradeUp HS.`;

  const canonical = `${appUrl()}/athletes/${profile.username}`;
  const ogImage = `${appUrl()}/api/og/athlete-profile/${profile.username}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'profile',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function AthletePublicProfilePage({
  params,
}: {
  params: Params;
}) {
  const { username } = await params;
  const profile = await getPublicProfileByUsername(username);
  if (!profile) notFound();

  // Fire-and-forget view log.
  const hdrs = await headers();
  void logProfileView({
    athleteUserId: profile.athleteUserId,
    req: { headers: hdrs },
  }).catch(() => {});

  const publicUrl = `${appUrl()}/athletes/${profile.username}`;
  const brandSignupHref = `/hs/signup/brand?athlete_ref=${encodeURIComponent(
    profile.username,
  )}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: `${profile.firstName} ${profile.lastInitial}.`,
      jobTitle: 'Student-Athlete',
      affiliation: profile.school ?? undefined,
      alumniOf: profile.school ?? undefined,
      ...(profile.sport ? { knowsAbout: profile.sport } : {}),
    },
    url: publicUrl,
  };

  return (
    <>
      <Script
        id={`athlete-jsonld-${profile.username}`}
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {JSON.stringify(jsonLd)}
      </Script>
      <main className="marketing-dark min-h-screen bg-[var(--marketing-gray-900)] text-[var(--ink)]">
        <div className="mx-auto max-w-5xl px-6 pt-24 pb-20">
          <AthletePublicHero
            profile={profile}
            brandSignupHref={brandSignupHref}
            publicUrl={publicUrl}
          />

          {profile.publicBio && (
            <section className="mt-10 rounded-2xl border border-[var(--hairline)] bg-[var(--cream-surface)] p-6">
              <h2 className="font-display text-xl text-[var(--ink)]">About</h2>
              <p className="mt-2 whitespace-pre-line text-[var(--ink-muted)]">
                {profile.publicBio}
              </p>
            </section>
          )}

          <section className="mt-10">
            <AthletePublicTrajectoryStrip snapshots={profile.snapshots} />
          </section>

          {profile.completedDealsCount > 0 && (
            <section className="mt-10 rounded-2xl border border-[var(--hairline)] bg-[var(--cream-surface)] p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-xl text-[var(--ink)]">Deal history</h2>
                <span className="text-sm text-[var(--ink-meta)]">
                  {profile.completedDealsCount} completed
                </span>
              </div>
              {profile.completedDealBrands.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {profile.completedDealBrands.map((b) => (
                    <span
                      key={b.brandName}
                      className="rounded-full border border-[var(--hairline)] bg-[var(--cream)] px-3 py-1 text-sm text-[var(--ink-muted)]"
                    >
                      {b.brandName}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-4 text-xs uppercase tracking-widest text-[var(--ink-meta)]">
                Amounts are not publicly displayed.
              </p>
            </section>
          )}

          <section className="mt-10 rounded-2xl border border-[var(--hairline)] bg-[var(--cream-section)] p-6 text-center">
            <p className="text-lg text-[var(--ink)]">
              Want to partner with {profile.firstName}?
            </p>
            <a
              href={brandSignupHref}
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-md bg-[var(--accent-primary)] px-6 py-2 text-sm font-semibold text-[#FBF9F2] hover:opacity-90"
            >
              Start a campaign
            </a>
          </section>

          {/* Supporter payment CTA — fan-to-athlete NIL. See migration
              20260422_002 and /api/athletes/[username]/support/checkout.
              Legally distinct from a donation: taxable NIL income to the
              athlete, not deductible to the supporter. */}
          <section className="mt-6 rounded-2xl border border-[var(--hairline)] bg-[var(--cream-surface)] p-6 text-center">
            <p className="text-lg text-[var(--ink)]">
              Just a fan? Send {profile.firstName} a shoutout payment.
            </p>
            <p className="mt-2 text-sm text-[var(--ink-meta)]">
              Small NIL payment in exchange for a personalized shoutout or
              thank-you message. Not a donation — not tax-deductible.
            </p>
            <div className="mt-4 flex justify-center">
              <SupportAthleteButton
                username={profile.username}
                athleteDisplayName={profile.firstName}
              />
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
