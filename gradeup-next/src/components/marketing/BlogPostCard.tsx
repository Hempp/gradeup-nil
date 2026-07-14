/**
 * BlogPostCard — card used on the /blog index and the related-posts rail.
 *
 * Pattern follows PersonaCard / CaseStudyCard: link-wrapped, keyboard-
 * accessible, with audience chip, title, description, and reading time.
 */
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import type { BlogPost } from '@/lib/hs-nil/blog-content';
import {
  blogPostPath,
  categoryLabel,
  readingMinutes,
} from '@/lib/hs-nil/blog-content';
import { BlogAudienceChip } from './BlogAudienceChip';

export interface BlogPostCardProps {
  post: BlogPost;
  /** Compact renders a tighter layout for sidebars. */
  compact?: boolean;
}

export function BlogPostCard({ post, compact = false }: BlogPostCardProps) {
  const minutes = readingMinutes(post);
  return (
    <Link
      href={blogPostPath(post.slug)}
      className={`card-marketing group flex flex-col gap-3 rounded-2xl p-5 hover-lift transition focus-visible:ring-2 focus-visible:ring-[var(--cobalt)] focus-visible:outline-none ${compact ? '' : 'sm:p-6'}`}
      aria-label={`${post.title} — ${minutes} minute read`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <BlogAudienceChip audience={post.audience} />
        <span className="text-[10px] uppercase tracking-widest text-[var(--ink-meta)] font-semibold">
          {categoryLabel(post.category)}
        </span>
      </div>

      <h3
        className={`font-display text-[var(--ink)] group-hover:text-[var(--cobalt)] transition-colors ${compact ? 'text-lg' : 'text-xl sm:text-2xl'}`}
      >
        {post.title}
      </h3>

      {!compact ? (
        <p className="text-[var(--ink-muted)] text-sm leading-relaxed line-clamp-3">
          {post.description}
        </p>
      ) : null}

      <div className="mt-auto flex items-center justify-between text-xs text-[var(--ink-meta)] pt-2">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {minutes} min read
        </span>
        <span className="inline-flex items-center gap-1 text-[var(--cobalt)] opacity-0 group-hover:opacity-100 transition-opacity">
          Read
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
