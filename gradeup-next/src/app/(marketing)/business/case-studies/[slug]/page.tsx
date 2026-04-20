/**
 * /business/case-studies/[slug] — Individual public case study.
 *
 * Server Component. Uses anon Supabase client + RLS. Missing / unpublished
 * rows 404 (standard Next.js notFound). Markdown body is rendered as React
 * elements via CaseStudyBody — no raw HTML string ever reaches the DOM.
 *
 * SEO: page-level Metadata exports title/description pulled from the study
 * record. OG image points at /api/og/case-study/[slug]. Canonical URL is
 * stable per slug.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCaseStudyBySlug } from '@/lib/hs-nil/case-studies';
import { CaseStudyMetricPanel } from '@/components/hs/CaseStudyMetricPanel';
import { CaseStudyQuoteCard } from '@/components/hs/CaseStudyQuoteCard';
import { CaseStudyBody } from '@/components/hs/CaseStudyBody';

export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const study = await getCaseStudyBySlug(supabase, slug);

  if (!study) {
    return {
      title: 'Case study not found — GradeUp HS',
      robots: { index: false, follow: false },
    };
  }

  const url = `/business/case-studies/${study.slug}`;
  const ogImage = `/api/og/case-study/${study.slug}`;
  const description =
    study.subtitle ??
    'A GradeUp HS scholar-athlete case study. Verified earnings, share counts, and brand ROI.';

  return {
    title: `${study.title} — GradeUp HS Case Study`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: study.title,
      description,
      url,
      type: 'article',
      images: [{ url: ogImage, width: 1200, height: 630, alt: study.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: study.title,
      description,
      images: [ogImage],
    },
    robots: { index: true, follow: true },
  };
}

export default async function CaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const study = await getCaseStudyBySlug(supabase, slug);
  if (!study) notFound();

  return (
    <article className="bg-black">
      <header className="relative pt-28 pb-16 overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse at 10% 10%, rgba(0, 240, 255, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 90% 90%, rgba(255, 200, 0, 0.08) 0%, transparent 55%)',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/business/case-studies"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/60 hover:text-white mb-6"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All case studies
          </Link>
          {study.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {study.tags.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-1 rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wider text-white/80"
                >
                  {t.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-4">
            {study.title}
          </h1>
          {study.subtitle && (
            <p className="text-lg md:text-xl text-[var(--marketing-gray-300)] max-w-3xl">
              {study.subtitle}
            </p>
          )}
          {study.publishedAt && (
            <p className="mt-6 text-sm text-[var(--marketing-gray-500)]">
              Published{' '}
              {new Date(study.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
        </div>
      </header>

      {study.heroImageUrl && (
        <div className="bg-[var(--marketing-gray-950)] py-8">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative aspect-[16/9] rounded-3xl overflow-hidden border border-white/10">
              <Image
                src={study.heroImageUrl}
                alt={study.title}
                fill
                sizes="(max-width: 1024px) 100vw, 960px"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      )}

      {study.metrics.length > 0 && (
        <section className="bg-[var(--marketing-gray-950)] py-12 md:py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)] mb-6">
              The numbers
            </h2>
            <CaseStudyMetricPanel metrics={study.metrics} />
          </div>
        </section>
      )}

      {study.bodyMarkdown.trim() && (
        <section className="bg-black py-12 md:py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <CaseStudyBody markdown={study.bodyMarkdown} />
          </div>
        </section>
      )}

      {study.quotes.length > 0 && (
        <section className="bg-[var(--marketing-gray-950)] py-12 md:py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            {study.quotes.map((q) => (
              <CaseStudyQuoteCard key={q.id} quote={q} />
            ))}
          </div>
        </section>
      )}

      <section className="bg-black py-16 border-t border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            Want your brand on the next case study?
          </h2>
          <p className="mt-3 text-[var(--marketing-gray-400)]">
            Every study starts with a single verified scholar-athlete partnership.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup/brand"
              className="btn-marketing-primary px-6 py-3 rounded-lg font-semibold"
            >
              Partner as a brand
            </Link>
            <Link
              href="/business/case-studies"
              className="btn-marketing-outline px-6 py-3 rounded-lg font-semibold"
            >
              More case studies
            </Link>
          </div>
        </div>
      </section>
    </article>
  );
}
