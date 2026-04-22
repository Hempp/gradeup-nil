import type { Metadata } from 'next';
import Script from 'next/script';
import { listPublicAthletes } from '@/lib/hs-nil/athlete-profile';
import { AthleteDirectoryCard } from '@/components/marketing/AthleteDirectoryCard';
import { AthleteDirectoryFilters } from '@/components/marketing/AthleteDirectoryFilters';
import { PILOT_STATES, STATE_RULES } from '@/lib/hs-nil/state-rules';
import type { USPSStateCode } from '@/lib/hs-nil/state-rules';

export const revalidate = 300;

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
    'https://gradeupnil.com'
  );
}

export const metadata: Metadata = {
  title: 'Scholar-Athlete Directory | GradeUp HS',
  description:
    'Discover verified high-school scholar-athletes. Public profiles with verified GPA, trajectory, and completed deals.',
  alternates: { canonical: `${appUrl()}/athletes` },
  openGraph: {
    title: 'Scholar-Athlete Directory — GradeUp HS',
    description:
      'Verified high-school scholar-athletes with public profiles, trajectories, and deal histories.',
    url: `${appUrl()}/athletes`,
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

type SearchParams = Promise<{
  state?: string;
  sport?: string;
  grad?: string;
  school?: string;
}>;

export default async function AthletesDirectoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const stateFilter = sp.state && PILOT_STATES.includes(sp.state as USPSStateCode)
    ? sp.state
    : null;
  const sportFilter = sp.sport ?? null;
  const gradFilter = sp.grad ? parseInt(sp.grad, 10) : null;
  const schoolFilter = sp.school ? sp.school.trim().slice(0, 100) : null;

  const athletes = await listPublicAthletes({
    stateCode: stateFilter,
    sport: sportFilter,
    graduationYear: Number.isFinite(gradFilter) ? gradFilter : null,
    school: schoolFilter,
    limit: 60,
  }).catch(() => []);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: athletes.slice(0, 20).map((a, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `${appUrl()}/athletes/${a.username}`,
      name: `${a.firstName} ${a.lastInitial}.`,
    })),
  };

  return (
    <>
      <Script id="athlete-directory-jsonld" type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </Script>
      <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
        <section className="mx-auto max-w-6xl px-6 pt-24 pb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Scholar-Athletes
          </p>
          <h1 className="mt-2 font-display text-5xl leading-tight md:text-6xl">
            Verified by GPA. Grounded by deals.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/70">
            Every athlete here has opted in to a public profile. Filter by
            state, sport, or graduation year. PII is minimized by design.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-6">
          <AthleteDirectoryFilters />
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          {schoolFilter && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              <span className="text-white/60">Filtering by school:</span>
              <span className="font-semibold text-white">{schoolFilter}</span>
              <a
                href={`/athletes${[
                  stateFilter ? `state=${stateFilter}` : null,
                  sportFilter ? `sport=${sportFilter}` : null,
                  gradFilter ? `grad=${gradFilter}` : null,
                ].filter(Boolean).join('&') ? '?' + [
                  stateFilter ? `state=${stateFilter}` : null,
                  sportFilter ? `sport=${sportFilter}` : null,
                  gradFilter ? `grad=${gradFilter}` : null,
                ].filter(Boolean).join('&') : ''}`}
                className="ml-auto text-xs text-white/60 underline underline-offset-2 hover:text-white"
              >
                Clear
              </a>
            </div>
          )}
          {athletes.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-10 text-center text-white/70">
              <p className="text-lg">No athletes match those filters yet.</p>
              <p className="mt-2 text-sm text-white/50">
                {schoolFilter
                  ? `No public athletes matched "${schoolFilter}". The HS-NIL pilot is active in CA, FL, GA, IL, NJ, NY, and TX — athletes from other schools can claim profiles as states expand.`
                  : stateFilter
                    ? `${STATE_RULES[stateFilter as USPSStateCode]?.state ?? stateFilter} pilot is active — check back as athletes claim profiles.`
                    : 'Pilot states are CA, FL, GA, IL, NJ, NY, and TX.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {athletes.map((athlete) => (
                <AthleteDirectoryCard
                  key={athlete.username}
                  athlete={athlete}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
