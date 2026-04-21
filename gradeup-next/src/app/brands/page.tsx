import type { Metadata } from 'next';
import Script from 'next/script';
import { listPublicBrands } from '@/lib/hs-nil/brand-directory';
import { createClient } from '@/lib/supabase/server';
import { BrandDirectoryCard } from '@/components/marketing/BrandDirectoryCard';
import { BrandDirectoryFilters } from '@/components/marketing/BrandDirectoryFilters';

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

type SearchParams = Promise<{
  state?: string;
  category?: string;
}>;

export default async function BrandsDirectoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const brands = await listPublicBrands(supabase, {
    stateCode: sp.state,
    dealCategory: sp.category,
    limit: 36,
  }).catch(() => []);

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

  return (
    <>
      <Script id="brand-directory-jsonld" type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </Script>
      <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
        <section className="mx-auto max-w-6xl px-6 pt-24 pb-10">
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

        <section className="mx-auto max-w-6xl px-6 pb-6">
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
      </main>
    </>
  );
}
