/**
 * BlogPostArticle — renders a single blog post's hero + body.
 *
 * Consumes the BlogPost model from lib/hs-nil/blog-content. Server Component.
 * Emits a semantic <article> wrapper with proper H1 -> H2 -> H3 hierarchy
 * for accessibility and SEO. Sections are rendered in the order declared.
 */
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Calendar } from 'lucide-react';
import type { BlogPost } from '@/lib/hs-nil/blog-content';
import {
  categoryLabel,
  readingMinutes,
} from '@/lib/hs-nil/blog-content';
import { BlogAudienceChip } from './BlogAudienceChip';

export interface BlogPostArticleProps {
  post: BlogPost;
}

function formatDate(iso: string): string {
  // Keep deterministic — no locale-dependent formatting.
  const [y, m, d] = iso.split('-').map(Number);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  if (!y || !m || !d) return iso;
  return `${months[m - 1]} ${d}, ${y}`;
}

export function BlogPostArticle({ post }: BlogPostArticleProps) {
  const minutes = readingMinutes(post);

  return (
    <article aria-labelledby="blog-post-title">
      {/* Hero */}
      <section
        aria-label="Article header"
        className="relative bg-[var(--cream)] pt-28 pb-14 overflow-hidden border-b border-[var(--hairline)]"
      >
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1.3fr_1fr] gap-10 items-start">
          <div>
            <nav aria-label="Breadcrumb" className="mb-5 text-sm text-[var(--ink-meta)]">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link href="/" className="hover:text-[var(--cobalt)]">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href="/blog" className="hover:text-[var(--cobalt)]">
                    Blog
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li className="text-[var(--ink-muted)] truncate max-w-[18rem]">
                  {post.title}
                </li>
              </ol>
            </nav>

            <div className="flex items-center gap-2 flex-wrap mb-5">
              <BlogAudienceChip audience={post.audience} />
              <span className="inline-block px-2.5 py-1 rounded-full border border-[var(--hairline)] bg-[var(--cream-surface)] text-[var(--ink-meta)] text-[10px] uppercase tracking-widest font-semibold">
                {categoryLabel(post.category)}
              </span>
              <span className="inline-block px-2.5 py-1 rounded-full border border-[var(--hairline)] bg-[var(--cream-surface)] text-[var(--cobalt)] text-[10px] uppercase tracking-widest font-semibold">
                {post.heroEyebrow}
              </span>
            </div>

            <h1
              id="blog-post-title"
              className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight text-[var(--ink)]"
            >
              {post.title}
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-[var(--ink-muted)] max-w-3xl">
              {post.description}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-5 text-sm text-[var(--ink-meta)]">
              <span className="inline-flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--cobalt)]/10 border border-[var(--cobalt)]/30 text-[var(--cobalt)] text-[10px] font-bold">
                  GU
                </span>
                GradeUp Editorial
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                Published {formatDate(post.publishedAt)}
              </span>
              {post.updatedAt && post.updatedAt !== post.publishedAt ? (
                <span className="inline-flex items-center gap-1.5">
                  Updated {formatDate(post.updatedAt)}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" aria-hidden="true" />
                {minutes} min read
              </span>
            </div>
          </div>

          <div className="duotone relative rounded-2xl overflow-hidden aspect-[4/5] hidden lg:block">
            <Image
              src="/editorial/photo-05.jpg"
              alt="GradeUp editorial — scholar-athlete NIL coverage"
              fill
              sizes="(min-width: 1024px) 35vw, 100vw"
              className="object-cover"
              priority
            />
          </div>
        </div>
      </section>

      {/* Body */}
      <section aria-label="Article body" className="bg-[var(--cream-section)] py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {post.body.map((section, idx) => (
              <section
                key={idx}
                aria-labelledby={`section-${idx}`}
                className="space-y-4"
              >
                <h2
                  id={`section-${idx}`}
                  className="font-display text-2xl sm:text-3xl text-[var(--ink)] tracking-tight"
                >
                  {section.heading}
                </h2>

                {section.paragraphs?.map((p, pIdx) => (
                  <p
                    key={pIdx}
                    className="text-[var(--ink-muted)] text-base sm:text-lg leading-[1.75]"
                  >
                    {p}
                  </p>
                ))}

                {section.bulletList ? (
                  <ul className="space-y-2 pt-1">
                    {section.bulletList.map((b, bIdx) => (
                      <li
                        key={bIdx}
                        className="flex items-start gap-3 text-[var(--ink-muted)] leading-relaxed"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-2.5 flex-shrink-0 h-1.5 w-1.5 rounded-full bg-[var(--cobalt)]"
                        />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {section.pullQuote ? (
                  <blockquote className="mt-6 pl-5 border-l-2 border-[var(--cobalt)]/60 text-[var(--ink)] text-lg sm:text-xl italic leading-relaxed">
                    {section.pullQuote}
                  </blockquote>
                ) : null}
              </section>
            ))}
          </div>
        </div>
      </section>
    </article>
  );
}
