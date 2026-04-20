/**
 * /business/case-studies — Public, SEO-indexed case-studies listing.
 *
 * Server Component. Uses the anon Supabase client + RLS (published=true)
 * so rows are public without authentication. Tag filter is driven by the
 * ?tag= query param — filters are additive (OR across values).
 *
 * Revalidate every 5 min to keep freshness while amortizing DB load.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { listPublishedCaseStudies } from '@/lib/hs-nil/case-studies';
import { CaseStudyCard } from '@/components/hs/CaseStudyCard';

export const metadata: Metadata = {
  title: 'Case Studies — GradeUp HS',
  description:
    'How real scholar-athlete partnerships performed. Verified earnings, share counts, and brand ROI from the GradeUp HS concierge era.',
  alternates: { canonical: '/business/case-studies' },
  openGraph: {
    title: 'GradeUp HS — Case Studies',
    description:
      'Real deals. Verified results. How scholar-athlete NIL partnerships drive brand ROI.',
    type: 'website',
    url: '/business/case-studies',
  },
  robots: { index: true, follow: true },
};

export const revalidate = 300;

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

const KNOWN_TAGS: Array<{ slug: string; label: string }> = [
  { slug: 'food_beverage', label: 'Food & beverage' },
  { slug: 'multi_athlete', label: 'Multi-athlete' },
  { slug: 'tier_b_verified', label: 'Verified GPA' },
  { slug: 'viral_share', label: 'Viral share' },
  { slug: 'parent_quote', label: 'Parent voice' },
  { slug: 'california', label: 'California' },
];

export default async function CaseStudiesListingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tags = parseTags(params.tag);
  const supabase = await createClient();
  const studies = await listPublishedCaseStudies(supabase, {
    limit: 24,
    tags: tags.length > 0 ? tags : undefined,
  });

  const activeTagSet = new Set(tags);

  return (
    <>
      <section
        aria-label="Case studies hero"
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
            <span className="text-sm font-medium text-white/90">
              Proven results from the concierge era
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white max-w-3xl">
            Case studies.{' '}
            <span className="text-[var(--accent-primary)]">Verified earnings.</span>
          </h1>
          <p className="mt-4 text-lg text-[var(--marketing-gray-400)] max-w-2xl">
            Every number you see here is tied to a completed deal, an on-platform
            share event, and a real scholar-athlete. Names are abbreviated for
            privacy; brand attribution is always shown.
          </p>
        </div>
      </section>

      <section
        aria-label="Case studies directory"
        className="bg-[var(--marketing-gray-950)] py-16"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tag chips */}
          <div className="flex flex-wrap gap-2 mb-10">
            <Link
              href="/business/case-studies"
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                activeTagSet.size === 0
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                  : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              All
            </Link>
            {KNOWN_TAGS.map((t) => {
              const active = activeTagSet.has(t.slug);
              const next = active
                ? Array.from(activeTagSet).filter((v) => v !== t.slug)
                : [...activeTagSet, t.slug];
              const href =
                next.length === 0
                  ? '/business/case-studies'
                  : `/business/case-studies?tag=${next.join(',')}`;
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
              <h2 className="text-xl font-semibold text-white">
                No case studies yet for this filter
              </h2>
              <p className="mt-2 text-[var(--marketing-gray-400)]">
                Try clearing the filter or check back soon — we publish new
                studies as deals close.
              </p>
              <Link
                href="/business/case-studies"
                className="inline-flex items-center gap-2 mt-6 text-[var(--accent-primary)] font-semibold"
              >
                Show all case studies
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
