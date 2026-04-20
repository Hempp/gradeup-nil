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
    <div className="relative min-h-screen bg-black text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full opacity-30 blur-3xl"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(0, 240, 255, 0.3) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute -right-40 top-40 h-[600px] w-[600px] rounded-full opacity-20 blur-3xl"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(255, 215, 0, 0.25) 0%, transparent 70%)',
          }}
        />
      </div>

      <main className="relative">
        <section
          aria-label={v.hero.titlePrefix}
          className="mx-auto max-w-5xl px-4 pt-24 pb-10 sm:px-6 sm:pt-32 lg:px-8"
        >
          <div className="text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">
              <Sparkles className="h-3.5 w-3.5 text-[var(--accent-primary)]" aria-hidden="true" />
              <span className="text-white/80">{v.hero.badge}</span>
            </div>

            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              {v.hero.titlePrefix}{' '}
              <span className="bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-gold)] bg-clip-text text-transparent">
                {v.hero.titleAccent}
              </span>
              {v.hero.titleSuffix ? ` ${v.hero.titleSuffix}` : ''}
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
              {v.hero.subtitle}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/50">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-[var(--accent-primary)]" aria-hidden="true" />
                {v.hero.trustStateRules}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
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
          className="mx-auto max-w-4xl px-4 pb-16 sm:px-6 lg:px-8"
        >
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-10">
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">
              {v.howItWorks.heading}
            </h2>
            <p className="mt-3 text-white/70">{v.howItWorks.body}</p>

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
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="text-sm font-semibold text-[var(--accent-primary)]">
                    {f.title}
                  </div>
                  <p className="mt-1 text-sm text-white/70">{f.body}</p>
                </div>
              ))}
            </div>

            <p className="mt-6 text-sm text-white/60">
              <strong className="text-white">{v.howItWorks.notModeledHeading}</strong>{' '}
              {v.howItWorks.notModeledBody}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/es/business/case-studies"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:border-white/40 hover:text-white"
              >
                {v.howItWorks.seeCaseStudies}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <Link
                href="/es/hs"
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-black transition-transform hover:scale-[1.02]"
              >
                {v.howItWorks.joinWaitlist}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section
          aria-label="Disclaimer"
          className="mx-auto max-w-3xl px-4 pb-24 sm:px-6 lg:px-8"
        >
          <div className="text-center text-sm text-white/50">
            <p>{v.trustFooter}</p>
          </div>
        </section>
      </main>
    </div>
  );
}
