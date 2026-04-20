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
import {
  ArrowRight,
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
        className="relative min-h-[calc(100vh-64px)] sm:min-h-screen flex items-center overflow-hidden bg-black"
        aria-label={h.hero.subtitle}
      >
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background:
                'radial-gradient(ellipse at 20% 20%, rgba(0, 240, 255, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(255, 0, 200, 0.1) 0%, transparent 50%)',
            }}
          />
          <div className="absolute inset-0 hero-grid opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
          <div className="text-center lg:text-left max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-success)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-success)]" />
              </span>
              <span className="text-sm font-medium text-white/90">
                {h.hero.badge}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-white mb-6">
              <span className="block">{h.hero.titleLine1}</span>
              <span className="block gradient-text-cyan">{h.hero.titleLine2}</span>
              <span className="block bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-success)] bg-clip-text text-transparent">
                {h.hero.titleLine3}
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-[var(--marketing-gray-400)] max-w-xl mb-6">
              {h.hero.subtitle}
            </p>
            <p className="text-sm text-[var(--marketing-gray-500)] max-w-xl mb-8">
              {h.hero.dualAudience}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
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

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-6 text-sm text-[var(--marketing-gray-500)]">
              <div className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
                <span>{h.hero.trustNcaa}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
                <span>{h.hero.trustNoCard}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-[var(--accent-success)]" aria-hidden="true" />
                <span>{h.hero.trustSignup}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-8 mt-12 pt-8 border-t border-white/10">
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-[var(--accent-success)]">$127,450</div>
                <div className="text-sm text-[var(--marketing-gray-500)] mt-1">{h.hero.statsPaid}</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-white">847</div>
                <div className="text-sm text-[var(--marketing-gray-500)] mt-1">{h.hero.statsVerified}</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-[var(--accent-gold)]">3.72</div>
                <div className="text-sm text-[var(--marketing-gray-500)] mt-1">{h.hero.statsAvgGpa}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partner note */}
      <section
        className="py-16 bg-[var(--marketing-gray-950)] border-y border-[var(--marketing-gray-800)]"
        aria-label={h.partners.schoolsTrusted}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-medium text-[var(--marketing-gray-500)]">
            {h.partners.schoolsTrusted}
          </p>
        </div>
      </section>

      {/* Valuation CTA */}
      <section aria-label={h.valuationCta.heading} className="bg-black py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--accent-primary)]/30 bg-gradient-to-br from-[var(--accent-primary)]/10 via-black to-[var(--accent-gold)]/10 p-6 sm:p-10">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[var(--accent-primary)]/15 blur-3xl" />
            <div className="relative grid gap-6 md:grid-cols-[2fr_1fr] md:items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
                  {h.valuationCta.eyebrow}
                </span>
                <h2 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
                  {h.valuationCta.heading}
                </h2>
                <p className="mt-3 max-w-xl text-white/70">{h.valuationCta.body}</p>
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
      <section className="section-spacing-lg bg-black" aria-label={h.howItWorks.sideHeading}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block px-3 py-1 rounded-full bg-[var(--accent-tertiary)]/10 text-[var(--accent-tertiary)] text-sm font-medium mb-4 border border-[var(--accent-tertiary)]/20">
              {h.howItWorks.eyebrow}
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              {h.howItWorks.titlePrefix}{' '}
              <span className="text-[var(--accent-primary)]">{h.howItWorks.titleMid}</span>{' '}
              {h.howItWorks.titleTo}{' '}
              <span className="text-[var(--accent-gold)]">{h.howItWorks.titleAccent}</span>
            </h2>
            <p className="text-[var(--marketing-gray-400)] max-w-2xl mx-auto text-lg">
              {h.howItWorks.subtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: User, title: h.howItWorks.step1Title, desc: h.howItWorks.step1Desc, stat: h.howItWorks.step1Stat, color: 'cyan' as const },
              { icon: Shield, title: h.howItWorks.step2Title, desc: h.howItWorks.step2Desc, stat: h.howItWorks.step2Stat, color: 'lime' as const },
              { icon: DollarSign, title: h.howItWorks.step3Title, desc: h.howItWorks.step3Desc, stat: h.howItWorks.step3Stat, color: 'gold' as const },
            ].map((s, i) => {
              const colorMap = {
                cyan: 'border-[var(--accent-primary)]/30 text-[var(--accent-primary)]',
                lime: 'border-[var(--accent-success)]/30 text-[var(--accent-success)]',
                gold: 'border-[var(--accent-gold)]/30 text-[var(--accent-gold)]',
              };
              return (
                <div key={i} className={`card-marketing p-6 border-l-4 ${colorMap[s.color]}`}>
                  <s.icon className="h-6 w-6 mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-[var(--marketing-gray-400)] mb-3">{s.desc}</p>
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-white/5 text-white/70">
                    {s.stat}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <Link href="/signup/athlete">
              <Button size="lg" className="btn-marketing-primary gap-2">
                {h.howItWorks.finalCta}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <p className="mt-3 text-xs text-[var(--marketing-gray-500)]">{h.howItWorks.finalNote}</p>
          </div>
        </div>
      </section>

      {/* Proven results */}
      <section className="bg-black py-20 border-y border-white/10" aria-label={h.provenResults.heading}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[var(--marketing-gray-950)] p-8 md:p-12">
            <div className="relative grid gap-6 md:grid-cols-[2fr_1fr] md:items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
                  {h.provenResults.eyebrow}
                </span>
                <h2 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
                  {h.provenResults.heading}
                </h2>
                <p className="mt-3 max-w-xl text-white/70">{h.provenResults.body}</p>
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
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.3)_0%,transparent_60%)]" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-black/20 backdrop-blur-sm mb-8">
            <BadgeCheck className="h-4 w-4" />
            <span className="text-sm text-black/80 font-medium">{h.finalCta.socialProof}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-6">
            {h.finalCta.title1}
            <span className="block">{h.finalCta.title2}</span>
          </h2>
          <p className="text-xl text-black/70 mb-10 max-w-2xl mx-auto">{h.finalCta.body}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup/athlete">
              <Button size="lg" className="w-full sm:w-auto bg-black hover:bg-[var(--marketing-gray-900)] text-white font-semibold gap-2">
                {h.finalCta.ctaAthlete}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/signup/brand">
              <Button size="lg" className="w-full sm:w-auto bg-white/20 hover:bg-white/30 text-black font-semibold border-2 border-black/20">
                {h.finalCta.ctaBrand}
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-black/60">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" />{h.finalCta.statPaid}</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" />{h.finalCta.statDeals}</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" />{h.finalCta.statGpa}</span>
          </div>
        </div>
      </section>
    </>
  );
}
