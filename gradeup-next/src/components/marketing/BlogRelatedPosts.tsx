/**
 * BlogRelatedPosts — 3-card rail shown at the bottom of an article.
 *
 * Drives internal linking between the 20 evergreen posts. Server Component.
 */
import type { BlogPost } from '@/lib/hs-nil/blog-content';
import { BlogPostCard } from './BlogPostCard';

export interface BlogRelatedPostsProps {
  posts: BlogPost[];
  heading?: string;
}

export function BlogRelatedPosts({
  posts,
  heading = 'Related reading',
}: BlogRelatedPostsProps) {
  if (posts.length === 0) return null;
  return (
    <section
      aria-label="Related posts"
      className="bg-black py-16 border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
          {heading}
        </h2>
        <p className="mt-2 text-white/60 text-sm">
          More from the GradeUp editorial library.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <BlogPostCard key={post.slug} post={post} compact />
          ))}
        </div>
      </div>
    </section>
  );
}
