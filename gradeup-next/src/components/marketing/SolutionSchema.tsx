/**
 * SolutionSchema — injects a schema.org/WebPage JSON-LD block for a
 * /solutions/* page. FAQ schema is handled separately by SolutionFaq.
 */
import Script from 'next/script';

export interface SolutionSchemaProps {
  /** Absolute URL or absolute path (site canonical). */
  pageUrl: string;
  name: string;
  description: string;
  /** Audience string, e.g. "Parents of high-school athletes". */
  audience?: string;
  /** Unique id for the injected script tag — must be unique per page. */
  scriptId: string;
}

export function SolutionSchema({
  pageUrl,
  name,
  description,
  audience,
  scriptId,
}: SolutionSchemaProps) {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name,
    description,
    inLanguage: 'en-US',
    isPartOf: {
      '@type': 'WebSite',
      name: 'GradeUp NIL',
      url: '/',
    },
  };
  if (audience) {
    jsonLd.audience = {
      '@type': 'Audience',
      audienceType: audience,
    };
  }

  return (
    <Script
      id={scriptId}
      type="application/ld+json"
      strategy="afterInteractive"
    >
      {JSON.stringify(jsonLd)}
    </Script>
  );
}
