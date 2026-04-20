/**
 * Marketing home — / (English).
 *
 * Server Component wrapper around HomePageClient (the actual React tree
 * with hero/animations/etc lives in HomePageClient.tsx). Splitting the
 * file lets us emit SEO metadata — canonical + hreflang alternates for
 * the Spanish variant — without making the whole home tree server-only.
 */
import type { Metadata } from 'next';
import HomePageClient from './HomePageClient';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://gradeupnil.com';

export const metadata: Metadata = {
  alternates: {
    canonical: `${BASE_URL}/`,
    languages: {
      en: `${BASE_URL}/`,
      es: `${BASE_URL}/es`,
      'x-default': `${BASE_URL}/`,
    },
  },
  openGraph: {
    locale: 'en_US',
    alternateLocale: ['es_US'],
  },
};

export default function HomePage() {
  return <HomePageClient />;
}
