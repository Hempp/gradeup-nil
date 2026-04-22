/**
 * Marketing metadata helper — produces complete Next.js Metadata objects
 * with defaults already applied.
 *
 * Why this exists: Next.js replaces (not merges) `openGraph` when a child
 * page defines its own. Pages that set `openGraph: { title, description }`
 * without `images` end up with NO og:image, even though the root layout
 * sets one. Same pattern for `alternates.canonical`. This helper fills in
 * the blanks so every marketing page ships with a proper social card and
 * canonical link without each author having to remember the boilerplate.
 */

import type { Metadata } from 'next';

export interface MarketingMetaInput {
  title: string;
  description: string;
  /** Path only, e.g. "/pricing" or "/solutions/brands/fitness" */
  path: string;
  /** Override the default social image (rare — most pages don't need this) */
  image?: string;
  /** Override OpenGraph type (default "website") */
  ogType?: 'website' | 'article';
}

// Default social card. Unsplash URL is kept pending a branded asset in
// /public/og-default.png. Same URL is used by the root layout, so child
// pages inherit a consistent card even without overriding `image`.
export const DEFAULT_OG_IMAGE =
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&h=630&fit=crop';

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
    'https://gradeup-next.vercel.app'
  );
}

export function buildMarketingMetadata(input: MarketingMetaInput): Metadata {
  const { title, description, path, image = DEFAULT_OG_IMAGE, ogType = 'website' } = input;
  const url = `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: ogType,
      url,
      title,
      description,
      siteName: 'GradeUp NIL',
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}
