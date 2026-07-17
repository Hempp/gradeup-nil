/**
 * Spanish valuation calculator page — /es/hs/valuation.
 *
 * The calculator widget itself (ValuationCalculatorClient) stays English
 * for v1. Form labels + slider copy are the next i18n pass. Page shell —
 * hero, factors, trust footer — is fully translated.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Shield, Sparkles, TrendingUp } from 'lucide-react';
import { ValuationCalculatorClient } from '@/components/hs/ValuationCalculatorClient';
import { getDictionary } from '@/lib/i18n/get-dictionary';

export const revalidate = 3600;

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://gradeupnil.com';

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary('es');
  return {
    title: dict.valuation.metadata.title,
    description: dict.valuation.metadata.description,
    alternates: {
      canonical: `${BASE_URL}/es/hs/valuation`,
      languages: {
        en: `${BASE_URL}/hs/valuation`,
        es: `${BASE_URL}/es/hs/valuation`,
        'x-default': `${BASE_URL}/hs/valuation`,
      },
    },
    openGraph: {
      title: dict.valuation.metadata.title,
      description: dict.valuation.metadata.description,
      url: `${BASE_URL}/es/hs/valuation`,
      locale: 'es_US',
      type: 'website',
    },
    robots: { index: true, follow: true },
  };
}

export default async function SpanishValuationPage() {
  const dict = await getDictionary('es');
  const v = dict.valuation;

  return (
    <div className="relative min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <main className="relative">
        <section
          aria-label={v.hero.titlePrefix}
          className="mx-auto max-w-5xl px-4 pt-24 pb-10 sm:px-6 sm:pt-32 lg:px-8"
        >
          <div className="text-center">
            <div className="eyebrow mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--cream-surface)] px-4 py-2">
              <Sparkles className="h-3.5 w-3.5 text-[var(--cobalt)]" aria-hidden="true" />
              <span>{v.hero.badge}</span>
            </div>

            <h1 className="font-display text-4xl leading-tight tracking-tight text-[var(--ink)] sm:text-5xl lg:text-6xl">
              {v.hero.titlePrefix}{' '}
              <span className="text-[var(--cobalt)]">{v.hero.titleAccent}</span>
              {v.hero.titleSuffix ? ` ${v.hero.titleSuffix}` : ''}
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[var(--ink-muted)] sm:text-lg">
              {v.hero.subtitle}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[var(--ink-meta)]">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-[var(--cobalt)]" aria-hidden="true" />
                {v.hero.trustStateRules}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-[var(--cobalt)]" aria-hidden="true" />
                {v.hero.trustMarketData}
              </span>
              <span>{v.hero.trustNoSignup}</span>
            </div>
          </div>
        </section>

        <section aria-label="Calculator" className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
          <ValuationCalculatorClient />
        </section>

        <section
          aria-label={v.howItWorks.heading}
          className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8"
        >
          <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--cream-surface)] p-6 sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:items-start">
              <div>
                <h2 className="font-display text-2xl font-semibold text-[var(--ink)] sm:text-3xl">
                  {v.howItWorks.heading}
                </h2>
                <p className="mt-3 text-[var(--ink-muted)]">{v.howItWorks.body}</p>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  {[
                    { title: v.howItWorks.factor1Title, body: v.howItWorks.factor1Body },
                    { title: v.howItWorks.factor2Title, body: v.howItWorks.factor2Body },
                    { title: v.howItWorks.factor3Title, body: v.howItWorks.factor3Body },
                    { title: v.howItWorks.factor4Title, body: v.howItWorks.factor4Body },
                    { title: v.howItWorks.factor5Title, body: v.howItWorks.factor5Body },
                  ].map((f) => (
                    <div
                      key={f.title}
                      className="rounded-xl border border-[var(--hairline)] bg-[var(--cream)] p-4"
                    >
                      <div className="text-sm font-semibold text-[var(--cobalt)]">
                        {f.title}
                      </div>
                      <p className="mt-1 text-sm text-[var(--ink-muted)]">{f.body}</p>
                    </div>
                  ))}
                </div>

                <p className="mt-6 text-sm text-[var(--ink-meta)]">
                  <strong className="text-[var(--ink)]">{v.howItWorks.notModeledHeading}</strong>{' '}
                  {v.howItWorks.notModeledBody}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/es/business/case-studies"
                    className="btn-marketing-outline inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
                  >
                    {v.howItWorks.seeCaseStudies}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/es/hs"
                    className="btn-marketing-primary inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
                  >
                    {v.howItWorks.joinWaitlist}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {/* Sticky duotone editorial image */}
              <div className="hidden lg:block lg:sticky lg:top-24">
                <div
                  className="duotone relative aspect-[4/5] rounded-2xl overflow-hidden border border-[var(--hairline)] bg-cover bg-center"
                  style={{ backgroundImage: `url(/editorial/photo-06.jpg)` }}
                  role="img"
                  aria-label="Una madre y su hijo atleta revisando juntos su valor NIL en casa"
                />
              </div>
            </div>
          </div>
        </section>

        <section
          aria-label="Disclaimer"
          className="mx-auto max-w-3xl px-4 pb-24 sm:px-6 lg:px-8"
        >
          <div className="text-center text-sm text-[var(--ink-meta)]">
            <p>{v.trustFooter}</p>
          </div>
        </section>
      </main>
    </div>
  );
}
