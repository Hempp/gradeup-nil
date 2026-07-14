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
    title: 'HS Athlete NIL Fair Market Value — What Should I Pay? | GradeUp, part of StatStaq',
    description:
      'Know before you negotiate — or before StatStaq’s team negotiates on the athlete’s behalf. Range-calibrated Fair Market Value estimates for high-school NIL deals, tuned to pilot states and current deal data. Free brand tool.',
    path: '/solutions/brands/fmv',
  }),
  keywords: [
    'NIL fair market value',
    'HS NIL budget',
    'high school athlete sponsorship cost',
    'brand NIL calculator',
    'NIL campaign budget',
    'high school NIL FMV',
    'college NIL alternative',
  ],
  robots: { index: true, follow: true },
};

export default function BrandFmvPage() {
  return (
    <div className="relative min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <div className="relative">
        {/* Hero */}
        <section
          aria-label="Brand FMV calculator hero"
          className="mx-auto grid max-w-6xl gap-10 px-4 pt-24 pb-10 sm:px-6 sm:pt-32 lg:grid-cols-2 lg:items-center lg:px-8"
        >
          <div className="text-center lg:text-left">
            <div className="eyebrow mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--cream-surface)] px-4 py-2 text-sm">
              <Sparkles
                className="h-3.5 w-3.5 text-[var(--accent-primary)]"
                aria-hidden="true"
              />
              <span className="text-[var(--ink-muted)]">
                For brands &middot; Free &middot; No signup to see estimate
              </span>
            </div>

            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl text-[var(--ink)]">
              What should I pay an{' '}
              <span className="text-[var(--cobalt)]">HS athlete?</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[var(--ink-muted)] sm:text-lg lg:mx-0">
              Know before you negotiate. Ranges calibrated to pilot states
              and current HS-NIL deal data. Same engine the athletes use to
              see what they&rsquo;re worth &mdash; reframed for you.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[var(--ink-meta)] lg:justify-start">
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
                Benchmarked to published college-NIL averages
              </span>
              <span>Campaign preview included</span>
            </div>
          </div>

          <div
            className="duotone relative aspect-[4/3] overflow-hidden rounded-2xl bg-cover bg-center"
            style={{ backgroundImage: `url(/editorial/photo-07.jpg)` }}
            role="img"
            aria-label="Brand team reviewing NIL campaign fair-market-value estimates"
          />
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
          <div className="card-marketing p-6 sm:p-10">
            <h2 className="font-display text-2xl font-semibold sm:text-3xl text-[var(--ink)]">
              Same engine, different question
            </h2>
            <p className="mt-3 text-[var(--ink-muted)]">
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
                  className="rounded-xl border border-[var(--hairline)] bg-[var(--cream)] p-4"
                >
                  <div className="text-sm font-semibold text-[var(--accent-primary)]">
                    {f.title}
                  </div>
                  <p className="mt-1 text-sm text-[var(--ink-muted)]">{f.body}</p>
                </div>
              ))}
            </div>

            <p className="mt-6 text-sm text-[var(--ink-muted)]">
              <strong className="text-[var(--ink)]">What this is not:</strong>{' '}
              a quote, offer, or guarantee. Actual deals are brokered
              between brand + athlete + parent on GradeUp HS &mdash;
              StatStaq&rsquo;s team runs the negotiation on the athlete&rsquo;s
              side. The range is a starting point so you walk into the
              conversation anchored, not bluffing.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/business/case-studies"
                className="btn-marketing-outline inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
              >
                See brand case studies
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <Link
                href="/hs/signup/brand"
                className="btn-marketing-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
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
          <div className="text-center text-sm text-[var(--ink-meta)]">
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
    body: 'Total campaign cost = per-athlete x count. At 10+ athletes we surface a volume-rate ribbon — ask us for a rate card.',
  },
  {
    title: 'State rules flag compliance',
    body: 'Your target state drives banned categories, disclosure windows, school-IP rules, and custodial-trust flags. Surfaced before you post.',
  },
];
