/**
 * Spanish case studies index — /es/business/case-studies.
 *
 * Reads the same published-studies data as the English listing (via
 * listPublishedCaseStudies). Studies themselves are not translated in v1
 * (each card shows the brand name, athlete initials, numbers); only the
 * framing UI around the grid is localized.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, ArrowUpRight, FileSearch } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { listPublishedCaseStudies } from '@/lib/hs-nil/case-studies';
import { CaseStudyCard } from '@/components/hs/CaseStudyCard';
import { getDictionary } from '@/lib/i18n/get-dictionary';

export const revalidate = 300;

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://gradeupnil.com';

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary('es');
  return {
    title: dict.caseStudies.metadata.title,
    description: dict.caseStudies.metadata.description,
    alternates: {
      canonical: `${BASE_URL}/es/business/case-studies`,
      languages: {
        en: `${BASE_URL}/business/case-studies`,
        es: `${BASE_URL}/es/business/case-studies`,
        'x-default': `${BASE_URL}/business/case-studies`,
      },
    },
    openGraph: {
      title: dict.caseStudies.metadata.title,
      description: dict.caseStudies.metadata.description,
      url: `${BASE_URL}/es/business/case-studies`,
      locale: 'es_US',
      type: 'website',
    },
    robots: { index: true, follow: true },
  };
}

interface PageProps {
  searchParams: Promise<{ tag?: string | string[] }>;
}

function parseTags(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .flatMap((v) => v.split(','))
    .map((v) => v.trim().toLowerCase())
    .filter((v) => /^[a-z0-9_]+$/.test(v))
    .slice(0, 10);
}

export default async function SpanishCaseStudiesPage({ searchParams }: PageProps) {
  const dict = await getDictionary('es');
  const cs = dict.caseStudies;
  const params = await searchParams;
  const tags = parseTags(params.tag);
  const supabase = await createClient();
  const studies = await listPublishedCaseStudies(supabase, {
    limit: 24,
    tags: tags.length > 0 ? tags : undefined,
  });

  const activeTagSet = new Set(tags);

  // Slugs stay English (internal identifiers); only labels translate.
  const KNOWN_TAGS: Array<{ slug: string; label: string }> = [
    { slug: 'food_beverage', label: cs.filters.foodBeverage },
    { slug: 'multi_athlete', label: cs.filters.multiAthlete },
    { slug: 'tier_b_verified', label: cs.filters.tierBVerified },
    { slug: 'viral_share', label: cs.filters.viralShare },
    { slug: 'parent_quote', label: cs.filters.parentQuote },
    { slug: 'california', label: cs.filters.california },
  ];

  return (
    <>
      <section
        aria-label={cs.hero.titlePrefix}
        className="relative bg-[var(--cream)] pt-32 pb-16 overflow-hidden"
      >
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-[1fr_260px] items-center">
          <div>
            <span className="eyebrow inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--cobalt)]" aria-hidden="true" />
              {cs.hero.badge}
            </span>
            <h1 className="font-display mt-4 text-4xl sm:text-5xl lg:text-6xl text-[var(--ink)] max-w-3xl">
              {cs.hero.titlePrefix}{' '}
              <span className="text-[var(--cobalt)]">{cs.hero.titleAccent}</span>
            </h1>
            <p className="mt-4 text-lg text-[var(--ink-muted)] max-w-2xl">
              {cs.hero.subtitle}
            </p>
          </div>
          <div className="duotone hidden lg:block rounded-lg overflow-hidden w-[260px]">
            <Image
              src="/editorial/photo-06.jpg"
              alt="Atleta de preparatoria firmando un acuerdo NIL verificado"
              width={260}
              height={320}
              sizes="260px"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section aria-label="Directorio" className="bg-[var(--marketing-gray-950)] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 mb-10">
            <Link
              href="/es/business/case-studies"
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                activeTagSet.size === 0
                  ? 'border-[var(--cobalt)] bg-[var(--cobalt)]/10 text-[var(--cobalt)]'
                  : 'border-[var(--hairline)] bg-[var(--cream-surface)] text-[var(--ink-muted)] hover:bg-[var(--cream-section)]'
              }`}
            >
              {cs.filters.all}
            </Link>
            {KNOWN_TAGS.map((t) => {
              const active = activeTagSet.has(t.slug);
              const next = active
                ? Array.from(activeTagSet).filter((v) => v !== t.slug)
                : [...activeTagSet, t.slug];
              const href =
                next.length === 0
                  ? '/es/business/case-studies'
                  : `/es/business/case-studies?tag=${next.join(',')}`;
              return (
                <Link
                  key={t.slug}
                  href={href}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    active
                      ? 'border-[var(--cobalt)] bg-[var(--cobalt)]/10 text-[var(--cobalt)]'
                      : 'border-[var(--hairline)] bg-[var(--cream-surface)] text-[var(--ink-muted)] hover:bg-[var(--cream-section)]'
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>

          {studies.length === 0 ? (
            <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--cream-surface)] p-10 sm:p-12 text-center">
              <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full border border-[var(--hairline)] bg-[var(--cream)] text-[var(--cobalt)]">
                <FileSearch className="h-7 w-7" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--ink)]">{cs.empty.heading}</h2>
              <p className="mt-2 text-[var(--ink-muted)]">{cs.empty.body}</p>
              <Link
                href="/es/business/case-studies"
                className="arrow-pill mt-6 text-[var(--cobalt)] font-semibold"
              >
                {cs.empty.cta}
                <span className="circle">
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {studies.map((s) => (
                <CaseStudyCard key={s.id} study={s} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
