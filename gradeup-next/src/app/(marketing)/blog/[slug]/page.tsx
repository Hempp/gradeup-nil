/**
 * /blog/[slug] — dynamic route for evergreen blog posts.
 *
 * All 20 posts in BLOG_POSTS render through this one component. Each post
 * gets its own title/description, JSON-LD Article schema, FAQ schema,
 * related-posts rail, and audience-tailored final CTA.
 *
 * generateStaticParams statically pre-renders every published post. ISR
 * revalidates hourly so content updates ship without a redeploy.
 */
import type { Metadata } from 'next';
import Script from 'next/script';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import {
  BLOG_POSTS,
  blogPostPath,
  audienceSolutionPath,
  audienceCta,
  getPostBySlug,
  getRelatedPosts,
  readingMinutes,
  type BlogPost,
} from '@/lib/hs-nil/blog-content';
import { slugifyStateCode, unslugifyToCode } from '@/lib/hs-nil/state-blog-content';
import {
  BlogPostArticle,
  BlogRelatedPosts,
  SolutionCtaBand,
  SolutionFaq,
  type FaqItem,
} from '@/components/marketing';

export async function generateStaticParams() {
  return BLOG_POSTS.filter((p) => p.published).map((p) => ({ slug: p.slug }));
}

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return { title: 'Not found | GradeUp' };
  }
  const canonical = blogPostPath(post.slug);
  return {
    title: `${post.title} | GradeUp`,
    description: post.description,
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      url: canonical,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
    robots: { index: true, follow: true },
    keywords: post.keywords,
    authors: [{ name: 'GradeUp Editorial' }],
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    notFound();
  }

  const related = getRelatedPosts(post);
  const canonical = blogPostPath(post.slug);
  const cta = audienceCta(post);

  const faqItems: FaqItem[] = post.faqs.map((f) => ({
    question: f.q,
    answer: f.a,
  }));

  // Resolve a safe state-rules slug for the in-line "further reading" link.
  const stateSlug = resolveStateSlug(post.stateRulesSlug);
  const solutionPath = audienceSolutionPath(post.audience);

  return (
    <>
      <ArticleJsonLd post={post} canonical={canonical} />

      <BlogPostArticle post={post} />

      <FurtherReading
        post={post}
        stateSlug={stateSlug}
        solutionPath={solutionPath}
      />

      <SolutionFaq
        scriptId={`blog-faq-${post.slug}-jsonld`}
        pageUrl={canonical}
        heading="Frequently asked"
        items={faqItems}
      />

      <BlogRelatedPosts posts={related} />

      <SolutionCtaBand
        heading={cta.heading}
        subheading={cta.subheading}
        primaryLabel={cta.primaryLabel}
        primaryHref={cta.primaryHref}
        secondaryLabel={cta.secondaryLabel}
        secondaryHref={cta.secondaryHref}
        trustNote={cta.trustNote}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// In-article "further reading" block
// Hosts internal links to (a) state-rules, (b) the relevant persona page,
// (c) the 3 related posts — for SEO and internal link equity.
// ---------------------------------------------------------------------------

function FurtherReading({
  post,
  stateSlug,
  solutionPath,
}: {
  post: BlogPost;
  stateSlug: string;
  solutionPath: string;
}) {
  return (
    <section
      aria-label="Further reading"
      className="bg-black py-14 border-b border-white/10"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-bold text-white">
          Keep reading
        </h2>
        <ul className="mt-5 space-y-3">
          <li>
            <Link
              href={`/blog/state-nil-rules/${stateSlug}`}
              className="group flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none"
            >
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--accent-primary)] font-semibold">
                  State rules
                </div>
                <div className="mt-1 text-white font-semibold group-hover:text-[var(--accent-primary)] transition-colors">
                  See your state&rsquo;s HS NIL rules in detail
                </div>
              </div>
              <ArrowRight
                className="h-5 w-5 text-white/50 group-hover:text-[var(--accent-primary)] group-hover:translate-x-1 transition-all"
                aria-hidden="true"
              />
            </Link>
          </li>
          <li>
            <Link
              href={solutionPath}
              className="group flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none"
            >
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--accent-gold)] font-semibold">
                  Persona walkthrough
                </div>
                <div className="mt-1 text-white font-semibold group-hover:text-[var(--accent-primary)] transition-colors">
                  How GradeUp works for this audience
                </div>
              </div>
              <ArrowRight
                className="h-5 w-5 text-white/50 group-hover:text-[var(--accent-primary)] group-hover:translate-x-1 transition-all"
                aria-hidden="true"
              />
            </Link>
          </li>
          {post.related.slice(0, 3).map((relatedSlug) => {
            const related = getPostBySlug(relatedSlug);
            if (!related) return null;
            return (
              <li key={relatedSlug}>
                <Link
                  href={blogPostPath(related.slug)}
                  className="group flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none"
                >
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-white/50 font-semibold">
                      Related article &middot; {readingMinutes(related)} min
                    </div>
                    <div className="mt-1 text-white font-semibold group-hover:text-[var(--accent-primary)] transition-colors">
                      {related.title}
                    </div>
                  </div>
                  <ArrowRight
                    className="h-5 w-5 text-white/50 group-hover:text-[var(--accent-primary)] group-hover:translate-x-1 transition-all"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Article JSON-LD
// ---------------------------------------------------------------------------

function ArticleJsonLd({
  post,
  canonical,
}: {
  post: BlogPost;
  canonical: string;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${canonical}#article`,
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: canonical,
    url: canonical,
    inLanguage: 'en-US',
    author: {
      '@type': 'Organization',
      name: 'GradeUp Editorial',
      url: '/',
    },
    publisher: {
      '@type': 'Organization',
      name: 'GradeUp NIL',
      url: '/',
    },
    about: {
      '@type': 'Thing',
      name: 'High-school Name, Image, and Likeness (NIL)',
    },
    keywords: post.keywords.join(', '),
  };
  return (
    <Script
      id={`blog-article-${post.slug}-jsonld`}
      type="application/ld+json"
      strategy="afterInteractive"
    >
      {JSON.stringify(jsonLd)}
    </Script>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveStateSlug(maybe: string | undefined): string {
  // Default to California if a post didn't declare a state.
  const candidate = (maybe ?? 'california').toLowerCase();
  // Validate against the state-blog-content slug map — fall back to california
  // if someone typed a bad value.
  if (unslugifyToCode(candidate)) return candidate;
  return slugifyStateCode('CA');
}
