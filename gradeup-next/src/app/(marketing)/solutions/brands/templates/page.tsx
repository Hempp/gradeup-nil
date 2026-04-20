/**
 * /solutions/brands/templates — Public marketing browse.
 *
 * Same data as /hs/brand/campaigns/templates but anonymous-facing and
 * marketing-framed. Cards link to /hs/signup/brand?template=SLUG so an
 * unauthenticated visitor lands in brand signup with the template slug
 * pre-carried; after signup the HS-brand flow routes them to
 * /hs/brand/campaigns/new?template=SLUG and the clone is logged.
 *
 * SEO targets "NIL campaign templates" + "scholar athlete campaign
 * examples". JSON-LD ItemList emitted so each template card is parsed
 * as a distinct item.
 *
 * ISR 5 min. Published templates are admin-managed so we want new rows
 * to surface within ~5 minutes of publish.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import CampaignTemplateCard from '@/components/hs/CampaignTemplateCard';
import { listTemplates } from '@/lib/hs-nil/campaign-templates';

const PAGE_URL = '/solutions/brands/templates';

export const revalidate = 300;

export const metadata: Metadata = {
  title:
    'NIL Campaign Templates — Scholar-Athlete Campaign Examples | GradeUp',
  description:
    'Eight pre-built NIL campaign templates for local brands. Grand opening, back-to-school, summer camp, product launch, athlete spotlight. Clone, customize in two minutes, post.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: 'NIL Campaign Templates — GradeUp for Brands',
    description:
      'Start with a proven NIL template. Customize in two minutes. Compliance, consent, and disclosure built in.',
    type: 'website',
    url: PAGE_URL,
  },
  robots: { index: true, follow: true },
  keywords: [
    'NIL campaign templates',
    'scholar athlete campaign examples',
    'HS NIL brand templates',
    'local business NIL campaign',
    'grand opening NIL',
    'back-to-school NIL',
    'summer camp NIL campaign',
    'product launch NIL',
    'athlete spotlight NIL',
  ],
};

export default async function PublicCampaignTemplatesPage() {
  const templates = await listTemplates({ limit: 50 });

  const baseUrl = 'https://gradeup.com';
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'NIL Campaign Templates',
    description:
      'Pre-built NIL campaign templates for brands working with scholar-athletes.',
    itemListElement: templates.map((t, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: t.title,
      description: t.description,
      url: `${baseUrl}/solutions/brands/templates#${t.slug}`,
    })),
  };

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <Script
        id="campaign-templates-itemlist"
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {JSON.stringify(itemListLd)}
      </Script>
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          For brands
        </p>
        <h1 className="mt-3 font-display text-4xl md:text-6xl">
          Start with a proven template.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-white/70">
          Customize in two minutes. Eight battle-tested NIL briefs for local
          brands — grand openings, back-to-school, summer camps, product
          launches, athlete spotlights, recurring series. Compliance, parental
          consent, and disclosures are built in.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/hs/signup/brand"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent-primary)] px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            Sign up to post a campaign
          </Link>
          <Link
            href="/solutions/brands"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 hover:border-white/40"
          >
            How GradeUp works
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        {templates.length === 0 ? (
          <p className="text-sm text-white/60">
            Templates are being updated. Check back soon.
          </p>
        ) : (
          <ul
            role="list"
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {templates.map((t) => (
              <li key={t.id} id={t.slug} className="h-full scroll-mt-24">
                <CampaignTemplateCard
                  template={t}
                  ctaHref={`/hs/signup/brand?template=${encodeURIComponent(t.slug)}`}
                  ctaLabel="Use this template"
                />
              </li>
            ))}
          </ul>
        )}

        <div className="mt-16 rounded-2xl border border-white/10 bg-white/5 p-8 text-center md:p-12">
          <h2 className="font-display text-3xl md:text-4xl">
            A template is a starting point, not a contract.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-white/70">
            Every template pre-fills title, description, compensation,
            timeline, and deliverables. You edit anything before posting.
            Compensation shown is a national baseline — CA, NY, and TX
            markets typically run 20-30% higher.
          </p>
          <div className="mt-6">
            <Link
              href="/hs/signup/brand"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent-primary)] px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              Create a brand account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
