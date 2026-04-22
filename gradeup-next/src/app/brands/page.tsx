import type { Metadata } from 'next';
import Script from 'next/script';
import Link from 'next/link';
import { listPublicBrands } from '@/lib/hs-nil/brand-directory';
import { createClient } from '@/lib/supabase/server';
import { BrandDirectoryCard } from '@/components/marketing/BrandDirectoryCard';
import { BrandDirectoryFilters } from '@/components/marketing/BrandDirectoryFilters';
import { OpportunitiesPanel } from '@/components/marketing/OpportunitiesPanel';
import { cn } from '@/lib/utils';

export const revalidate = 300;

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
    'https://gradeupnil.com'
  );
}

export const metadata: Metadata = {
  title: 'Brand Directory | GradeUp HS',
  description:
    'Meet the local brands running HS-NIL campaigns with verified scholar-athletes. Filter by state and deal category.',
  alternates: { canonical: `${appUrl()}/brands` },
  openGraph: {
    title: 'Brand Directory — GradeUp HS',
    description:
      'HS-enabled brands running NIL campaigns. Discover who to partner with.',
    url: `${appUrl()}/brands`,
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

type BrandsTab = 'directory' | 'opportunities';

function normalizeTab(raw: string | undefined): BrandsTab {
  return raw === 'opportunities' ? 'opportunities' : 'directory';
}

type SearchParams = Promise<{
  state?: string;
  category?: string;
  tab?: string;
}>;

export default async function BrandsDirectoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const activeTab = normalizeTab(sp.tab);

  // The Opportunities tab doesn't use brand listings, so we only pay the
  // Supabase round-trip when the Directory tab is active.
  const supabase = activeTab === 'directory' ? await createClient() : null;
  const brands =
    supabase
      ? await listPublicBrands(supabase, {
          stateCode: sp.state,
          dealCategory: sp.category,
          limit: 36,
        }).catch(() => [])
      : [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: brands.slice(0, 20).map((b, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `${appUrl()}/brands/${b.slug}`,
      name: b.companyName,
    })),
  };

  const tabs: { id: BrandsTab; label: string; href: string }[] = [
    { id: 'directory', label: 'Directory', href: '/brands' },
    {
      id: 'opportunities',
      label: 'Open opportunities',
      href: '/brands?tab=opportunities',
    },
  ];

  return (
    <>
      {activeTab === 'directory' ? (
        <Script id="brand-directory-jsonld" type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </Script>
      ) : null}
      <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
        <section className="mx-auto max-w-6xl px-6 pt-24 pb-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Brand Partners
          </p>
          <h1 className="mt-2 font-display text-5xl leading-tight md:text-6xl">
            The brands partnering with scholar-athletes.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/70">
            Local restaurants, training facilities, retail, fitness, tutoring.
            Every brand here runs HS-compliant campaigns — state rules
            validated at deal creation, parental consent required.
          </p>
        </section>

        {/* Tab bar — real anchor links so both views stay crawlable. */}
        <section className="mx-auto max-w-6xl px-6">
          <div
            role="tablist"
            aria-label="Brands sections"
            className="flex items-center gap-2 border-b border-white/10"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  role="tab"
                  aria-selected={isActive}
                  className={cn(
                    'relative -mb-px px-4 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded-t-md',
                    isActive
                      ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]'
                      : 'text-white/60 hover:text-white border-b-2 border-transparent',
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </section>

        {activeTab === 'opportunities' ? (
          <OpportunitiesPanel />
        ) : (
          <>
            <section className="mx-auto max-w-6xl px-6 pt-6 pb-6">
              <BrandDirectoryFilters />
            </section>

            <section className="mx-auto max-w-6xl px-6 pb-24">
              {brands.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-10 text-center text-white/70">
                  <p className="text-lg">No brands match those filters yet.</p>
                  <p className="mt-2 text-sm text-white/50">
                    Early pilot — brand partners are opting in weekly.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {brands.map((brand) => (
                    <BrandDirectoryCard key={brand.slug} brand={brand} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
