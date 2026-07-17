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
import { SolutionSchema } from '@/components/marketing/SolutionSchema';
import { siteUrl } from '@/lib/seo';

const BASE_URL = siteUrl();

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
  return (
    <>
      <SolutionSchema
        scriptId="homepage-jsonld"
        pageUrl="/"
        name="GradeUp — Verified Scholar-Athlete NIL"
        description="GradeUp is the verified-GPA scholar-athlete layer of StatStaq, for athletes from middle school through college. GradeUp qualifies you; StatStaq's team runs the deal."
        audience="Scholar-athletes (middle school through college), parents, and brands"
      />
      <HomePageClient />
    </>
  );
}
