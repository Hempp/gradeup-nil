/**
 * Public sitemap.xml for GradeUp.
 *
 * Built by Next's metadata-route sitemap API. Includes:
 *   - Marketing landing + primary solution routes
 *   - Pricing + compare + legal pages
 *   - /business/case-studies
 *   - /blog/state-nil-rules index
 *   - All 51 /blog/state-nil-rules/[stateSlug] pages (50 + DC)
 *
 * Dashboard, auth, and admin routes are deliberately excluded — they're
 * behind login and should never appear in search indices.
 *
 * `lastModified` for each state page uses that state's rules-engine
 * lastReviewed timestamp, so search engines see real freshness signals.
 */
import type { MetadataRoute } from 'next';
import {
  listAllStateBlogPosts,
} from '@/lib/hs-nil/state-blog-content';
import {
  listPublishedPosts,
  blogPostPath,
} from '@/lib/hs-nil/blog-content';

/**
 * Absolute origin used when Next needs it. Falls back to env, then to a
 * relative placeholder — sitemap entries still render as absolute URLs
 * because Next resolves them against NEXT_PUBLIC_SITE_URL at build time.
 */
function siteOrigin(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_BASE_URL;
  if (env && env.startsWith('http')) return env.replace(/\/$/, '');
  return 'https://gradeupnil.com';
}

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  const now = new Date().toISOString();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${origin}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${origin}/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${origin}/compare`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${origin}/discover`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${origin}/opportunities`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${origin}/help`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${origin}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${origin}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${origin}/subscription-terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${origin}/solutions/parents`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${origin}/solutions/athletes`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${origin}/solutions/brands`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${origin}/solutions/ads`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${origin}/solutions/state-ads`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${origin}/business/case-studies`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${origin}/blog`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${origin}/blog/state-nil-rules`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${origin}/hs`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${origin}/hs/valuation`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
  ];

  const stateRoutes: MetadataRoute.Sitemap = listAllStateBlogPosts().map(
    (p) => ({
      url: `${origin}${p.canonicalPath}`,
      lastModified: p.lastReviewed,
      changeFrequency: 'weekly',
      priority: 0.6,
    }),
  );

  const evergreenBlogRoutes: MetadataRoute.Sitemap = listPublishedPosts().map(
    (p) => ({
      url: `${origin}${blogPostPath(p.slug)}`,
      lastModified: p.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.7,
    }),
  );

  return [...staticRoutes, ...stateRoutes, ...evergreenBlogRoutes];
}
