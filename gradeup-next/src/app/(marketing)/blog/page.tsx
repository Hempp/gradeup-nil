/**
 * /blog — unified index of the GradeUp editorial library.
 *
 * Merges:
 *   - The Phase 14 state-rules blog (51 pages) — surfaced as a single
 *     featured card that links into /blog/state-nil-rules.
 *   - The Phase 16 evergreen posts (20 pages) — grouped by audience.
 *
 * Statically rendered with hourly revalidation so newly-published posts
 * propagate without a redeploy.
 */
import Link from 'next/link';
import { Sparkles, ArrowRight, BookOpen } from 'lucide-react';
import {
  AUDIENCE_ORDER,
  audienceLabel,
  groupPostsByAudience,
  listPublishedPosts,
} from '@/lib/hs-nil/blog-content';
import { listAllStateBlogPosts } from '@/lib/hs-nil/state-blog-content';
import { BlogPostCard, SolutionSchema } from '@/components/marketing';
import { buildMarketingMetadata } from '@/lib/seo';

const PAGE_URL = '/blog';

export const revalidate = 3600;

export const metadata = {
  ...buildMarketingMetadata({
    title: 'GradeUp Blog — NIL guides for scholar-athletes, parents, and brands',
    description:
      "Plain-English NIL guides for scholar-athletes from middle school through college. Parent playbooks, athlete strategy, brand campaign tactics, taxes, and compliance — GradeUp verifies the GPA; StatStaq's team runs the deal.",
    path: PAGE_URL,
  }),
  robots: { index: true, follow: true },
  keywords: [
    'high school NIL blog',
    'NIL guide parents',
    'HS NIL athlete guide',
    'brand NIL campaign',
    'state NIL rules',
    'scholar athlete NIL',
  ],
};

export default function BlogIndexPage() {
  const allPosts = listPublishedPosts();
  const groupedByAudience = groupPostsByAudience();
  const stateCount = listAllStateBlogPosts().length;

  return (
    <>
      <SolutionSchema
        scriptId="blog-index-jsonld"
        pageUrl={PAGE_URL}
        name="GradeUp Blog"
        description="Evergreen and state-by-state editorial content for high-school NIL — for parents, athletes, brands, athletic directors, and state associations."
        audience="Parents, high-school athletes, brands, athletic directors"
      />

      <section
        aria-label="Blog hero"
        className="relative bg-[var(--cream)] pt-32 pb-14 overflow-hidden"
      >
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="eyebrow">Editorial library</span>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--cream-surface)] border border-[var(--hairline)] mt-4 mb-6">
              <Sparkles
                className="h-4 w-4 text-[var(--accent-primary)]"
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-[var(--ink)]">
                {allPosts.length + stateCount} published articles
              </span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--ink)] max-w-4xl">
              The GradeUp{' '}
              <span className="text-[var(--accent-primary)]">library.</span>
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-[var(--ink-muted)] max-w-3xl">
              Plain-English guides to high-school NIL — for the parent reading
              their first contract, the athlete landing a first deal, and the
              brand running their first local campaign.
            </p>
          </div>
          <div
            className="duotone relative aspect-[4/3] rounded-2xl overflow-hidden bg-cover bg-center"
            style={{ backgroundImage: `url(/editorial/photo-03.jpg)` }}
            role="img"
            aria-label="Scholar-athlete reviewing NIL playbook materials"
          />
        </div>
      </section>

      {/* Featured — state-rules hub */}
      <section
        aria-label="State rules hub"
        className="bg-[var(--marketing-gray-950)] pt-12"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/blog/state-nil-rules"
            className="group block rounded-2xl border border-[var(--hairline)] bg-gradient-to-br from-[var(--accent-primary)]/10 via-[var(--cream-section)] to-[var(--accent-gold)]/5 p-8 sm:p-10 hover:border-[var(--accent-primary)]/30 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none"
            aria-label={`State NIL rules — ${stateCount} states and DC`}
          >
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-[10px] uppercase tracking-widest font-semibold mb-4">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  Rules reference
                </div>
                <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--ink)] group-hover:text-[var(--accent-primary)] transition-colors">
                  HS NIL rules for every state
                </h2>
                <p className="mt-3 text-[var(--ink-muted)] max-w-2xl">
                  All 50 states plus DC, grouped by permission status. Every
                  page pulls live from our compliance engine — so the rules you
                  read are the rules we enforce on every deal.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[var(--accent-primary)] font-semibold">
                Browse {stateCount} states
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Evergreen posts grouped by audience */}
      <section
        aria-label="Evergreen posts"
        className="bg-[var(--marketing-gray-950)] py-16"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          {AUDIENCE_ORDER.map((audience) => {
            const posts = groupedByAudience[audience];
            if (posts.length === 0) return null;
            return (
              <div key={audience}>
                <div className="mb-6 flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--hairline)] bg-[var(--cream-surface)] text-[var(--ink-muted)] text-xs font-semibold uppercase tracking-widest">
                    {audienceLabel(audience)}
                  </span>
                  <span className="text-sm text-[var(--ink-meta)]">
                    {posts.length} article{posts.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {posts.map((post) => (
                    <BlogPostCard key={post.slug} post={post} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Final CTA */}
          <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--cream-surface)] p-8 text-center">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--ink)]">
              Ready to put this into practice?
            </h2>
            <p className="mt-3 text-[var(--ink-muted)] max-w-2xl mx-auto">
              GradeUp verifies your GPA — free, and part of StatStaq.
              Once you qualify, StatStaq&rsquo;s team produces your content,
              values your brand, sources your deals, and negotiates your
              contracts.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/hs?ref=blog-index"
                className="btn-marketing-primary inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-md font-semibold shadow-lg"
              >
                Join the waitlist
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href="/solutions/parents"
                className="btn-marketing-outline inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-md font-semibold"
              >
                See the parent experience
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
