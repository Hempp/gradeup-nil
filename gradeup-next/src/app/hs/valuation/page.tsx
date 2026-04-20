/**
 * /hs/valuation — Public NIL Valuation Calculator
 *
 * PUBLIC / unauthenticated SEO surface. Sits OUTSIDE the (hs) feature-flag
 * gate: this is top-of-funnel content and must render whether
 * FEATURE_HS_NIL is on or off. The calculator itself runs client-side via
 * a deterministic TypeScript service (src/lib/hs-nil/valuation.ts). A
 * best-effort POST to /api/hs/valuation/estimate logs anonymous inputs
 * for future model tuning — the UI degrades gracefully if logging fails.
 *
 * SEO strategy
 * ────────────
 *   * Title + description keyword-targeted to "NIL valuation calculator",
 *     "high school NIL calculator", "scholar-athlete NIL worth".
 *   * JSON-LD schema (WebPage + WebApplication + FAQPage) via Next's
 *     next/script to rank as an interactive tool vs competitor blog.
 *   * Static shell + ISR revalidation (3600s). Dynamic data is not
 *     required; all inputs are user-provided.
 *   * Robots: indexable (unlike internal HS routes).
 *
 * Conversion funnel
 * ─────────────────
 *   form submit → estimate reveal → waitlist CTA pre-filled with inputs
 *   → waitlist API → valuation_requests.converted_to_waitlist flipped
 *   via /api/hs/valuation/estimate/convert (fire-and-forget).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { ArrowRight, Shield, Sparkles, TrendingUp } from 'lucide-react';
import { ValuationCalculatorClient } from '@/components/hs/ValuationCalculatorClient';

// ISR: page body is static copy. Revalidate hourly in case we tweak
// marketing language via a deploy.
export const revalidate = 3600;

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  'https://gradeupnil.com';

const CANONICAL_URL = `${BASE_URL}/hs/valuation`;

export const metadata: Metadata = {
  title: 'NIL Valuation Calculator — GradeUp HS',
  description:
    "Find out what your high-school scholar-athlete's NIL is worth. Free, instant estimate. Factors in sport, state, grade level, social following, and GPA.",
  alternates: {
    canonical: CANONICAL_URL,
    languages: {
      en: CANONICAL_URL,
      es: `${BASE_URL}/es/hs/valuation`,
      'x-default': CANONICAL_URL,
    },
  },
  openGraph: {
    title: 'NIL Valuation Calculator — GradeUp HS',
    description:
      'What is your scholar-athlete worth? Free, instant NIL estimate for high-school athletes in pilot states.',
    type: 'website',
    url: CANONICAL_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NIL Valuation Calculator — GradeUp HS',
    description:
      "Find out what your high-school scholar-athlete's NIL is worth. Free, instant estimate.",
  },
  keywords: [
    'NIL valuation calculator',
    'high school NIL calculator',
    'scholar-athlete NIL worth',
    'student-athlete NIL estimate',
    'NIL deal calculator',
    'HS athlete sponsorship value',
  ],
  robots: {
    index: true,
    follow: true,
  },
};

// Built as a plain object then stringified at render time. Content is
// 100% static — no user-supplied strings interpolated in, so it is not
// an XSS vector. Rendered via next/script with type="application/ld+json".
const JSON_LD_STRING = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${CANONICAL_URL}#webpage`,
      url: CANONICAL_URL,
      name: 'NIL Valuation Calculator — GradeUp HS',
      description:
        'Free instant NIL valuation estimate for high-school scholar-athletes. Factors in sport, state, grade level, follower count, and GPA.',
      inLanguage: 'en-US',
      isPartOf: {
        '@type': 'WebSite',
        name: 'GradeUp HS',
        url: BASE_URL,
      },
      about: {
        '@type': 'Thing',
        name: 'Name, Image, and Likeness (NIL) valuation',
      },
      subjectOf: {
        '@type': 'WebApplication',
        name: 'GradeUp HS NIL Valuation Calculator',
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How is my athlete\u2019s NIL value calculated?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'We combine sport demand, state brand density, grade level, social following, and GPA tier into a range calibrated against public HS NIL deal data. The output is a range, not a single point, because real market deals vary widely.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is high-school NIL legal in my state?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'HS NIL is permitted in most U.S. states under state-association rules. A handful still prohibit it. GradeUp HS operates in permitting pilot states today. The calculator flags the rules in your state automatically.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is GradeUp HS free to use?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. The calculator is free and unauthenticated. GradeUp HS helps parents verify credentials, match with brands, and close real deals when your state goes live.',
          },
        },
      ],
    },
  ],
});

export default function ValuationPage() {
  return (
    <>
      <Script
        id="valuation-jsonld"
        type="application/ld+json"
        strategy="beforeInteractive"
      >
        {JSON_LD_STRING}
      </Script>

      <div className="relative min-h-screen bg-black text-white">
        {/* Background effects */}
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
          {/* Hero */}
          <section
            aria-label="NIL Valuation Calculator hero"
            className="mx-auto max-w-5xl px-4 pt-24 pb-10 sm:px-6 sm:pt-32 lg:px-8"
          >
            <div className="text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">
                <Sparkles
                  className="h-3.5 w-3.5 text-[var(--accent-primary)]"
                  aria-hidden="true"
                />
                <span className="text-white/80">Free · 60-second estimate</span>
              </div>

              <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                What&rsquo;s your{' '}
                <span className="bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-gold)] bg-clip-text text-transparent">
                  scholar-athlete
                </span>{' '}
                worth?
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
                You know your kid is a scholar-athlete. We think these ranges
                make sense. Answer a few questions and we&rsquo;ll give you an
                honest NIL value range — no email required to see your number.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/50">
                <span className="inline-flex items-center gap-1.5">
                  <Shield
                    className="h-3.5 w-3.5 text-[var(--accent-primary)]"
                    aria-hidden="true"
                  />
                  State-rules aware
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <TrendingUp
                    className="h-3.5 w-3.5 text-[var(--accent-gold)]"
                    aria-hidden="true"
                  />
                  Public market data
                </span>
                <span>No signup to see estimate</span>
              </div>
            </div>
          </section>

          {/* Calculator */}
          <section
            aria-label="NIL valuation calculator form"
            className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8"
          >
            <ValuationCalculatorClient />
          </section>

          {/* How it works */}
          <section
            aria-label="How the calculator works"
            className="mx-auto max-w-4xl px-4 pb-16 sm:px-6 lg:px-8"
          >
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-10">
              <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                How this works
              </h2>
              <p className="mt-3 text-white/70">
                Our v1 model blends five public-market signals into a range
                calibrated against reported high-school NIL deal data from
                2024–2026.
              </p>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {FACTORS.map((f) => (
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
                <strong className="text-white">
                  What we don&rsquo;t model:
                </strong>{' '}
                specific deal offers you&rsquo;ve received, regional rivalries,
                local-brand affinity, your kid&rsquo;s off-court story. The
                range is a starting point — GradeUp HS helps you verify
                credentials, match with brands, and close real deals when your
                state goes live.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/business/case-studies"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:border-white/40 hover:text-white"
                >
                  See real deal case studies
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                <Link
                  href="/hs"
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-black transition-transform hover:scale-[1.02]"
                >
                  Join the GradeUp HS waitlist
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>

          {/* Trust footer */}
          <section
            aria-label="Honest framing"
            className="mx-auto max-w-3xl px-4 pb-24 sm:px-6 lg:px-8"
          >
            <div className="text-center text-sm text-white/50">
              <p>
                This calculator returns v1 estimates based on publicly reported
                deal ranges. Real market numbers vary widely. Nothing here is
                an offer, quote, or legal advice.
              </p>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

const FACTORS: { title: string; body: string }[] = [
  {
    title: 'Sport demand',
    body: 'Football and basketball drive most HS NIL deal volume. Women\u2019s basketball and niche sports command premium deals in their segments.',
  },
  {
    title: 'State brand density',
    body: 'California, Texas, Florida, Georgia, and New York carry higher multipliers thanks to headquartered consumer brands and larger media markets.',
  },
  {
    title: 'Social reach',
    body: 'Log-scale follower buckets. Advertisers pay more per follower as scale grows — but the first thousand matter most for proving authenticity.',
  },
  {
    title: 'Grade level',
    body: 'Seniors and college-bound athletes carry a premium because brand activation is near-term. Underclassmen discount reflects a longer payoff.',
  },
  {
    title: 'GPA + verification',
    body: 'Our differentiator: scholar-athlete framing. Verified 3.9+ GPAs unlock education and financial-services sponsors that won\u2019t touch unverified claims.',
  },
];
