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
import { Sparkles, ArrowRight } from 'lucide-react';
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
        className="relative bg-black pt-32 pb-16 overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse at 20% 20%, rgba(0, 240, 255, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(255, 200, 0, 0.1) 0%, transparent 50%)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-6">
            <Sparkles className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
            <span className="text-sm font-medium text-white/90">{cs.hero.badge}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white max-w-3xl">
            {cs.hero.titlePrefix}{' '}
            <span className="text-[var(--accent-primary)]">{cs.hero.titleAccent}</span>
          </h1>
          <p className="mt-4 text-lg text-[var(--marketing-gray-400)] max-w-2xl">
            {cs.hero.subtitle}
          </p>
        </div>
      </section>

      <section aria-label="Directorio" className="bg-[var(--marketing-gray-950)] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 mb-10">
            <Link
              href="/es/business/case-studies"
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                activeTagSet.size === 0
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                  : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
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
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>

          {studies.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
              <h2 className="text-xl font-semibold text-white">{cs.empty.heading}</h2>
              <p className="mt-2 text-[var(--marketing-gray-400)]">{cs.empty.body}</p>
              <Link
                href="/es/business/case-studies"
                className="inline-flex items-center gap-2 mt-6 text-[var(--accent-primary)] font-semibold"
              >
                {cs.empty.cta}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
