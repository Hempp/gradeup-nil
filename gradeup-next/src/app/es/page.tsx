/**
 * Spanish home page — /es.
 *
 * Mirrors the English marketing landing in content arc (hero → partners →
 * valuation CTA → steps → proven results → final CTA) but rendered as a
 * Server Component reading strings from the Spanish dictionary. We keep
 * the animated stats counter and blob background as-is on English; the
 * Spanish version uses a simpler, static variant for lower payload and
 * to avoid re-translating client-state strings.
 *
 * SEO: canonical to /es, hreflang alternate back to /.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  Shield,
  Zap,
  DollarSign,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDictionary } from '@/lib/i18n/get-dictionary';

export const revalidate = 300;

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://gradeupnil.com';

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary('es');
  return {
    title: dict.home.metadata.title,
    description: dict.home.metadata.description,
    alternates: {
      canonical: `${BASE_URL}/es`,
      languages: {
        en: `${BASE_URL}/`,
        es: `${BASE_URL}/es`,
        'x-default': `${BASE_URL}/`,
      },
    },
    openGraph: {
      title: dict.home.metadata.title,
      description: dict.home.metadata.description,
      url: `${BASE_URL}/es`,
      locale: 'es_US',
      alternateLocale: ['en_US'],
      type: 'website',
    },
    robots: { index: true, follow: true },
  };
}

export default async function SpanishHomePage() {
  const dict = await getDictionary('es');
  const h = dict.home;

  return (
    <>
      <section
        className="relative bg-[var(--cream)] overflow-hidden"
        aria-label={h.hero.subtitle}
      >
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <div className="eyebrow mb-6 justify-center lg:justify-start flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--cobalt)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--cobalt)]" />
                </span>
                {h.hero.badge}
              </div>

              <h1 className="font-display text-[clamp(40px,7vw,88px)] text-[var(--ink)] mb-6">
                <span className="block">{h.hero.titleLine1}</span>
                <span className="block text-[var(--cobalt)]">{h.hero.titleLine2}</span>
                <span className="block text-[var(--cobalt)]">{h.hero.titleLine3}</span>
              </h1>

              <p className="text-lg sm:text-xl text-[var(--ink-muted)] max-w-xl mx-auto lg:mx-0 mb-4">
                {h.hero.subtitle}
              </p>
              <p className="text-sm text-[var(--ink-meta)] max-w-xl mx-auto lg:mx-0 mb-8">
                {h.hero.dualAudience}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/signup/athlete">
                  <Button size="lg" className="w-full sm:w-auto btn-marketing-primary gap-2 shadow-lg">
                    {h.hero.ctaAthlete}
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </Link>
                <Link href="/signup/brand">
                  <Button size="lg" className="w-full sm:w-auto btn-marketing-outline">
                    {h.hero.ctaBrand}
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 mt-6 text-sm text-[var(--ink-meta)]">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-[var(--cobalt)]" aria-hidden="true" />
                  <span>{h.hero.trustNcaa}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[var(--cobalt)]" aria-hidden="true" />
                  <span>{h.hero.trustNoCard}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-[var(--cobalt)]" aria-hidden="true" />
                  <span>{h.hero.trustSignup}</span>
                </div>
              </div>

              <div className="stat-strip inline-flex flex-wrap items-center gap-x-4 gap-y-1 mt-10">
                <span><b>{h.hero.statsVerified}</b></span>
                <span className="opacity-30">·</span>
                <span><b>{h.hero.statsPaid}</b></span>
                <span className="opacity-30">·</span>
                <span><b>{h.hero.statsAvgGpa}</b></span>
              </div>
            </div>

            {/* Hero visual — golden-hour stadium shot in an editorial frame */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-md">
                <div className="relative aspect-[4/5] rounded-[28px] overflow-hidden border border-[var(--hairline)] shadow-[0_40px_90px_-40px_rgba(22,24,43,0.45)]">
                  <Image
                    src="/editorial/photo-02.jpg"
                    alt="Estadio universitario iluminado por la luz dorada del atardecer"
                    fill
                    sizes="(max-width: 1024px) 90vw, 40vw"
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--cobalt)]/25 via-transparent to-transparent" />
                </div>
                <div className="arrow-pill absolute -top-4 -left-4 hidden sm:flex">
                  <span className="circle">
                    <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partner note */}
      <section
        className="py-16 bg-[var(--cream-section)] border-y border-[var(--hairline)]"
        aria-label={h.partners.schoolsTrusted}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="eyebrow inline-block">
            {h.partners.schoolsTrusted}
          </p>
        </div>
      </section>

      {/* Valuation CTA */}
      <section aria-label={h.valuationCta.heading} className="bg-[var(--cream)] py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--cream-surface)] p-6 sm:p-10">
            <div className="relative grid gap-6 md:grid-cols-[2fr_1fr] md:items-center">
              <div>
                <span className="eyebrow inline-flex items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--cream)] px-3 py-1">
                  {h.valuationCta.eyebrow}
                </span>
                <h2 className="mt-4 font-display text-3xl text-[var(--ink)] sm:text-4xl">
                  {h.valuationCta.heading}
                </h2>
                <p className="mt-3 max-w-xl text-[var(--ink-muted)]">{h.valuationCta.body}</p>
              </div>
              <div className="flex md:justify-end">
                <Link href="/es/hs/valuation" className="w-full md:w-auto">
                  <Button size="lg" className="btn-marketing-primary w-full gap-2 sm:w-auto">
                    {h.valuationCta.cta}
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works steps */}
      <section className="section-spacing-lg bg-[var(--cream-section)]" aria-label={h.howItWorks.sideHeading}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="eyebrow inline-block mb-4">
              {h.howItWorks.eyebrow}
            </span>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-[var(--ink)] mb-4">
              {h.howItWorks.titlePrefix}{' '}
              <span className="text-[var(--cobalt)]">{h.howItWorks.titleMid}</span>{' '}
              {h.howItWorks.titleTo}{' '}
              <span className="text-[var(--cobalt)]">{h.howItWorks.titleAccent}</span>
            </h2>
            <p className="text-[var(--ink-muted)] max-w-2xl mx-auto text-lg">
              {h.howItWorks.subtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: User, title: h.howItWorks.step1Title, desc: h.howItWorks.step1Desc, stat: h.howItWorks.step1Stat },
              { icon: Shield, title: h.howItWorks.step2Title, desc: h.howItWorks.step2Desc, stat: h.howItWorks.step2Stat },
              { icon: DollarSign, title: h.howItWorks.step3Title, desc: h.howItWorks.step3Desc, stat: h.howItWorks.step3Stat },
            ].map((s, i) => (
              <div key={i} className="card-marketing p-6 border-l-4 border-[var(--cobalt)]/30">
                <s.icon className="h-6 w-6 mb-4 text-[var(--cobalt)]" />
                <h3 className="text-lg font-bold text-[var(--ink)] mb-2">{s.title}</h3>
                <p className="text-sm text-[var(--ink-muted)] mb-3">{s.desc}</p>
                <span className="stat-strip inline-block px-2 py-0.5">
                  {s.stat}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/signup/athlete">
              <Button size="lg" className="btn-marketing-primary gap-2">
                {h.howItWorks.finalCta}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <p className="mt-3 text-xs text-[var(--ink-meta)]">{h.howItWorks.finalNote}</p>
          </div>
        </div>
      </section>

      {/* Proven results */}
      <section className="bg-[var(--cream)] py-20 border-y border-[var(--hairline)]" aria-label={h.provenResults.heading}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--cream-surface)] p-8 md:p-12">
            <div className="relative grid gap-6 md:grid-cols-[2fr_1fr] md:items-center">
              <div>
                <span className="eyebrow inline-flex items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--cream)] px-3 py-1">
                  {h.provenResults.eyebrow}
                </span>
                <h2 className="mt-4 font-display text-3xl text-[var(--ink)] sm:text-4xl">
                  {h.provenResults.heading}
                </h2>
                <p className="mt-3 max-w-xl text-[var(--ink-muted)]">{h.provenResults.body}</p>
              </div>
              <div className="flex md:justify-end">
                <Link href="/es/business/case-studies" className="w-full md:w-auto">
                  <Button size="lg" className="btn-marketing-outline w-full gap-2 sm:w-auto">
                    {h.provenResults.cta}
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section-spacing-lg aurora-bg relative overflow-hidden" aria-label={h.finalCta.title2}>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[var(--cream-surface)] border border-[var(--hairline)] mb-8">
            <BadgeCheck className="h-4 w-4 text-[var(--cobalt)]" />
            <span className="text-sm text-[var(--ink-muted)] font-medium">{h.finalCta.socialProof}</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-[var(--ink)] mb-6">
            {h.finalCta.title1}
            <span className="block">{h.finalCta.title2}</span>
          </h2>
          <p className="text-xl text-[var(--ink-muted)] mb-10 max-w-2xl mx-auto">{h.finalCta.body}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup/athlete">
              <Button size="lg" className="w-full sm:w-auto btn-marketing-primary gap-2">
                {h.finalCta.ctaAthlete}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/signup/brand">
              <Button size="lg" className="w-full sm:w-auto btn-marketing-outline">
                {h.finalCta.ctaBrand}
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-[var(--ink-meta)]">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[var(--cobalt)]" />{h.finalCta.statPaid}</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[var(--cobalt)]" />{h.finalCta.statDeals}</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[var(--cobalt)]" />{h.finalCta.statGpa}</span>
          </div>
        </div>
      </section>
    </>
  );
}
