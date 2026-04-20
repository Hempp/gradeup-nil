/**
 * CaseStudyTagStrip — pulls published case studies filtered by tag and
 * renders them in a horizontal 3-column grid. Used as a "proof" section
 * on persona landing pages.
 *
 * Server Component. Uses the anon Supabase client via createClient() and
 * relies on RLS (published=true) to scope rows. When no matching studies
 * exist, renders a fallback CTA linking to /business/case-studies instead
 * of an empty grid — persona landings must never feel hollow.
 */
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { listPublishedCaseStudies } from '@/lib/hs-nil/case-studies';
import { CaseStudyCard } from '@/components/hs/CaseStudyCard';

export interface CaseStudyTagStripProps {
  /** Tags to filter by — at least one will match (OR semantics). */
  tags: string[];
  /** Heading above the strip. */
  heading: string;
  /** Optional short lead paragraph. */
  subheading?: string;
  /** Max studies to show. Default 3. */
  limit?: number;
  /** Link target for the fallback / "see all" CTA. */
  seeAllHref?: string;
}

export async function CaseStudyTagStrip({
  tags,
  heading,
  subheading,
  limit = 3,
  seeAllHref = '/business/case-studies',
}: CaseStudyTagStripProps) {
  const supabase = await createClient();
  const studies = await listPublishedCaseStudies(supabase, {
    limit,
    tags: tags.length > 0 ? tags : undefined,
  });

  // Build a tag query string to hand off to the listing page so the "see
  // all" CTA preserves the filter context.
  const tagQs =
    tags.length > 0 ? `?tag=${tags.join(',')}` : '';
  const seeAll = seeAllHref.includes('?') ? seeAllHref : `${seeAllHref}${tagQs}`;

  return (
    <section aria-label="Related case studies" className="bg-black py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest border border-white/10 bg-white/5 text-[var(--accent-primary)]">
              Proof
            </span>
            <h2 className="font-display mt-3 text-3xl sm:text-4xl font-bold text-white">
              {heading}
            </h2>
            {subheading ? (
              <p className="mt-2 text-white/70 max-w-2xl">{subheading}</p>
            ) : null}
          </div>
          <Link
            href={seeAll}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-primary)] hover:underline"
            aria-label="Browse all case studies"
          >
            See all case studies
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {studies.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
            <p className="text-white/80 text-lg font-semibold">
              We&rsquo;re publishing new case studies as deals close.
            </p>
            <p className="mt-2 text-white/60 text-sm max-w-xl mx-auto">
              Every study is tied to a verified deal, on-platform shares, and a
              real scholar-athlete. Check back soon, or browse what&rsquo;s live.
            </p>
            <Link
              href="/business/case-studies"
              className="inline-flex items-center gap-1.5 mt-5 text-sm font-semibold text-[var(--accent-primary)]"
            >
              Browse case studies
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {studies.map((s) => (
              <CaseStudyCard key={s.id} study={s} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
