import Script from 'next/script';
import { siteUrl } from '@/lib/seo';

export interface BreadcrumbItem {
  /** Visible name, e.g. "State NIL rules" */
  name: string;
  /** Path only, e.g. "/blog/state-nil-rules" */
  path: string;
}

/**
 * BreadcrumbList JSON-LD. Mirror of the visual breadcrumb trail so pages
 * with breadcrumbs (state NIL pages, blog posts) earn breadcrumb rich
 * results. Server component — emits a single script tag.
 */
export function BreadcrumbListSchema({
  items,
  scriptId,
}: {
  items: BreadcrumbItem[];
  scriptId: string;
}) {
  const base = siteUrl();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${base}${item.path.startsWith('/') ? item.path : `/${item.path}`}`,
    })),
  };

  return (
    <Script id={scriptId} type="application/ld+json" strategy="beforeInteractive">
      {JSON.stringify(jsonLd)}
    </Script>
  );
}
