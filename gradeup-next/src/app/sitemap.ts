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
import { listPublicAthletes } from '@/lib/hs-nil/athlete-profile';
import { listPublicBrands } from '@/lib/hs-nil/brand-directory';
import { createClient as createServiceRoleSupabase } from '@supabase/supabase-js';

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

/**
 * Canonical English paths that have a Spanish translation.
 * Each gets an `alternates.languages` block in the sitemap entry
 * so Google sees the English/Spanish pair and serves the right
 * locale per user. Keep in sync with src/lib/i18n/config.ts
 * `TRANSLATED_PATHS` and the /es/* route tree.
 */
const TRANSLATED_ROUTES: Array<{ en: string; es: string }> = [
  { en: '/', es: '/es' },
  { en: '/hs', es: '/es/hs' },
  { en: '/hs/valuation', es: '/es/hs/valuation' },
  { en: '/solutions/parents', es: '/es/solutions/parents' },
  { en: '/business/case-studies', es: '/es/business/case-studies' },
  { en: '/pricing', es: '/es/pricing' },
];

function altsFor(enPath: string, origin: string): MetadataRoute.Sitemap[number]['alternates'] {
  const pair = TRANSLATED_ROUTES.find((r) => r.en === enPath);
  if (!pair) return undefined;
  return {
    languages: {
      en: `${origin}${pair.en}`,
      es: `${origin}${pair.es}`,
      'x-default': `${origin}${pair.en}`,
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const now = new Date().toISOString();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${origin}/`, lastModified: now, changeFrequency: 'daily', priority: 1, alternates: altsFor('/', origin) },
    { url: `${origin}/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.8, alternates: altsFor('/pricing', origin) },
    { url: `${origin}/compare`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${origin}/discover`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${origin}/opportunities`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${origin}/help`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${origin}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${origin}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${origin}/subscription-terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${origin}/solutions/parents`, lastModified: now, changeFrequency: 'weekly', priority: 0.8, alternates: altsFor('/solutions/parents', origin) },
    { url: `${origin}/solutions/athletes`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${origin}/solutions/brands`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${origin}/solutions/ads`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${origin}/solutions/state-ads`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${origin}/business/case-studies`, lastModified: now, changeFrequency: 'weekly', priority: 0.7, alternates: altsFor('/business/case-studies', origin) },
    { url: `${origin}/blog`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${origin}/blog/state-nil-rules`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${origin}/athletes`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${origin}/brands`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${origin}/hs`, lastModified: now, changeFrequency: 'weekly', priority: 0.8, alternates: altsFor('/hs', origin) },
    { url: `${origin}/hs/valuation`, lastModified: now, changeFrequency: 'weekly', priority: 0.7, alternates: altsFor('/hs/valuation', origin) },
    // Spanish companions — listed separately so Google sees them independently.
    // Each carries the same `languages` alternates pointing back to the English canonical.
    { url: `${origin}/es`, lastModified: now, changeFrequency: 'daily', priority: 0.9, alternates: altsFor('/', origin) },
    { url: `${origin}/es/hs`, lastModified: now, changeFrequency: 'weekly', priority: 0.7, alternates: altsFor('/hs', origin) },
    { url: `${origin}/es/hs/valuation`, lastModified: now, changeFrequency: 'weekly', priority: 0.6, alternates: altsFor('/hs/valuation', origin) },
    { url: `${origin}/es/solutions/parents`, lastModified: now, changeFrequency: 'weekly', priority: 0.7, alternates: altsFor('/solutions/parents', origin) },
    { url: `${origin}/es/business/case-studies`, lastModified: now, changeFrequency: 'weekly', priority: 0.6, alternates: altsFor('/business/case-studies', origin) },
    { url: `${origin}/es/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.7, alternates: altsFor('/pricing', origin) },
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

  // Per-profile public URLs. Capped at 5000 each per sitemap best-practice;
  // split into separate sitemap files if the catalogue grows past that.
  // All queries service-role and wrapped in try/catch so a DB hiccup at
  // build time degrades gracefully to static-only sitemap.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let athleteRoutes: MetadataRoute.Sitemap = [];
  let brandRoutes: MetadataRoute.Sitemap = [];

  if (supabaseUrl && supabaseServiceKey) {
    try {
      const sb = createServiceRoleSupabase(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      });

      const athletes = await listPublicAthletes({ limit: 5000 }).catch(
        () => [],
      );
      athleteRoutes = athletes.map((a) => ({
        url: `${origin}/athletes/${a.username}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.5,
      }));

      const brands = await listPublicBrands(sb, { limit: 5000 }).catch(
        () => [],
      );
      brandRoutes = brands.map((b) => ({
        url: `${origin}/brands/${b.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.5,
      }));
    } catch {
      // Sitemap build continues with static routes only.
    }
  }

  return [
    ...staticRoutes,
    ...stateRoutes,
    ...evergreenBlogRoutes,
    ...athleteRoutes,
    ...brandRoutes,
  ];
}
