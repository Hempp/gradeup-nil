import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Script from 'next/script';
import { headers } from 'next/headers';
import {
  getPublicBrandBySlug,
  logBrandView,
} from '@/lib/hs-nil/brand-directory';
import { listPublishedCaseStudies } from '@/lib/hs-nil/case-studies';
import { createClient } from '@/lib/supabase/server';
import { BrandPublicHero } from '@/components/marketing/BrandPublicHero';
import { BrandPublicDetail } from '@/components/marketing/BrandPublicDetail';
import { CaseStudyCard } from '@/components/hs/CaseStudyCard';

export const revalidate = 3600;

type Params = Promise<{ slug: string }>;

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
  const { slug } = await params;
  const brand = await getPublicBrandBySlug(slug);
  if (!brand) {
    return {
      title: 'Brand partner | GradeUp HS',
      robots: { index: false, follow: false },
    };
  }

  const title = `${brand.companyName} — GradeUp HS brand partner`;
  const description =
    brand.bio ??
    `${brand.companyName} runs HS-NIL campaigns with GradeUp${
      brand.region ? ` in ${brand.region}` : ''
    }.`;
  const canonical = `${appUrl()}/brands/${brand.slug}`;
  const ogImage = `${appUrl()}/api/og/brand-profile/${brand.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: brand.companyName }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function BrandPublicProfilePage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const brand = await getPublicBrandBySlug(slug);
  if (!brand) notFound();

  // Fire-and-forget view log.
  const hdrs = await headers();
  const fakeReq = { headers: hdrs } as unknown as Request;
  void logBrandView({ brandId: brand.id, req: fakeReq }).catch(() => {});

  // Related case studies (listing; detail page filters client-side if needed).
  const supabase = await createClient();
  const caseStudies = await listPublishedCaseStudies(supabase, {
    limit: 6,
  }).catch(() => []);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brand.companyName,
    description: brand.bio ?? undefined,
    url: brand.website ?? `${appUrl()}/brands/${brand.slug}`,
    logo: brand.avatarUrl ?? undefined,
    address:
      brand.city || brand.region
        ? {
            '@type': 'PostalAddress',
            addressLocality: brand.city ?? undefined,
            addressRegion: brand.region ?? undefined,
          }
        : undefined,
  };

  return (
    <>
      <Script
        id={`brand-jsonld-${brand.slug}`}
        type="application/ld+json"
      >
        {JSON.stringify(jsonLd)}
      </Script>
      <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
        <div className="mx-auto max-w-5xl px-6 pt-24 pb-20">
          <BrandPublicHero brand={brand} />

          <section className="mt-12">
            <BrandPublicDetail brand={brand} />
          </section>

          {caseStudies.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display text-2xl text-white">
                Related case studies
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {caseStudies.slice(0, 4).map((cs) => (
                  <CaseStudyCard key={cs.slug} study={cs} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
