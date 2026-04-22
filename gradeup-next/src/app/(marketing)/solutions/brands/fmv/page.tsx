/**
 * /solutions/brands/fmv — Brand-side Fair-Market-Value calculator
 *
 * Public / unauthenticated. Reframes the athlete-side /hs/valuation
 * calculator for brands: "what should I pay an HS athlete with these
 * specs?" Logs brand intent as a sales lead via
 * /api/hs/valuation/brand-estimate with perspective='brand'.
 *
 * Phase 13 co-agent boundary: this page, its API route, the one shared
 * migration, and the three new BrandFmv* components. Everything else
 * (vertical pages, pricing, navbar, other persona pages) lives with
 * sister agents.
 *
 * SEO & framing
 * ─────────────
 *   - Title keyword-anchored on "Fair Market Value / pay" rather than
 *     "calculator" alone, mirroring Opendorse's post-House-settlement
 *     "NIL Budgets + Fair Market Value" framing.
 *   - ISR 3600s — copy is static.
 *   - robots: indexable.
 */

import Link from 'next/link';
import { ArrowRight, Shield, Sparkles, TrendingUp } from 'lucide-react';
import { BrandFmvCalculatorClient } from './client';
import { buildMarketingMetadata } from '@/lib/seo';

export const revalidate = 3600;

export const metadata = {
  ...buildMarketingMetadata({
    title: 'HS Athlete NIL Fair Market Value — What Should I Pay? | GradeUp HS',
    description:
      'Know before you negotiate. Range-calibrated Fair Market Value estimates for high-school NIL deals, tuned to pilot states and current deal data. Free brand tool.',
    path: '/solutions/brands/fmv',
  }),
  keywords: [
    'NIL fair market value',
    'HS NIL budget',
    'high school athlete sponsorship cost',
    'brand NIL calculator',
    'NIL campaign budget',
    'high school NIL FMV',
    'Opendorse alternative',
  ],
  robots: { index: true, follow: true },
};

export default function BrandFmvPage() {
  return (
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

      <div className="relative">
        {/* Hero */}
        <section
          aria-label="Brand FMV calculator hero"
          className="mx-auto max-w-5xl px-4 pt-24 pb-10 sm:px-6 sm:pt-32 lg:px-8"
        >
          <div className="text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">
              <Sparkles
                className="h-3.5 w-3.5 text-[var(--accent-primary)]"
                aria-hidden="true"
              />
              <span className="text-white/80">
                For brands &middot; Free &middot; No signup to see estimate
              </span>
            </div>

            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              What should I pay an{' '}
              <span className="bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-gold)] bg-clip-text text-transparent">
                HS athlete?
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
              Know before you negotiate. Ranges calibrated to pilot states
              and current HS-NIL deal data. Same engine the athletes use to
              see what they&rsquo;re worth &mdash; reframed for you.
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
                Benchmarked to Opendorse college averages
              </span>
              <span>Campaign preview included</span>
            </div>
          </div>
        </section>

        {/* Calculator */}
        <section
          aria-label="Brand Fair Market Value calculator"
          className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8"
        >
          <BrandFmvCalculatorClient />
        </section>

        {/* How it works + honest framing */}
        <section
          aria-label="How this tool works"
          className="mx-auto max-w-4xl px-4 pb-16 sm:px-6 lg:px-8"
        >
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-10">
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">
              Same engine, different question
            </h2>
            <p className="mt-3 text-white/70">
              Athletes land on{' '}
              <Link
                href="/hs/valuation"
                className="text-[var(--accent-primary)] underline-offset-2 hover:underline"
              >
                /hs/valuation
              </Link>{' '}
              to see what they&rsquo;re worth. You land here to see what
              you should pay. Both run the same deterministic model
              calibrated against 2024-2026 public HS NIL deal data, then
              layer deliverable + campaign-size multipliers on top.
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
              <strong className="text-white">What this is not:</strong>{' '}
              a quote, offer, or guarantee. Actual deals are brokered
              between brand + athlete + parent on GradeUp HS. The range
              is a starting point so you walk into the conversation
              anchored, not bluffing.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/business/case-studies"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:border-white/40 hover:text-white"
              >
                See brand case studies
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <Link
                href="/hs/signup/brand"
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-black transition-transform hover:scale-[1.02]"
              >
                Sign up as a brand
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
              Estimates only, returned based on publicly reported deal
              ranges. Real market numbers vary widely by region, timing,
              and athlete. Nothing here is an offer, quote, or legal
              advice. Your inputs log anonymously to help us calibrate
              the model &mdash; no email is captured unless you
              explicitly opt in.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

const FACTORS: { title: string; body: string }[] = [
  {
    title: 'Athlete specs drive unit price',
    body: 'Sport demand, state brand density, grade level, social reach, GPA bucket. Same coefficients as the athlete-side calculator.',
  },
  {
    title: 'Deliverable shapes the bundle',
    body: 'Single post (1.0x), three-post series (2.2x), in-person appearance (1.8x), multi-month campaign (5.0x). Bundle discounts baked in.',
  },
  {
    title: 'Athlete count scales the campaign',
    body: 'Total campaign cost = per-athlete x count. At 10+ athletes we surface a volume-rate ribbon &mdash; ask us for a rate card.',
  },
  {
    title: 'State rules flag compliance',
    body: 'Your target state drives banned categories, disclosure windows, school-IP rules, and custodial-trust flags. Surfaced before you post.',
  },
];
