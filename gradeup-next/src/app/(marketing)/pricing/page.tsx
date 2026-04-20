import type { Metadata } from 'next';
import Script from 'next/script';
import Link from 'next/link';
import { Check, ArrowRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ISR every 5 minutes
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Pricing — GradeUp HS-NIL',
  description:
    'Transparent NIL pricing for HS scholar-athletes, their parents, and local brands. No sales calls. No hidden fees. 8% take-rate on deals.',
  openGraph: {
    title: 'Pricing — GradeUp HS-NIL',
    description:
      'Transparent NIL pricing for HS scholar-athletes, their parents, and local brands. No sales calls. No hidden fees. 8% take-rate on deals.',
    type: 'website',
  },
  alternates: { canonical: '/pricing' },
};

// ═══════════════════════════════════════════════════════════════════════════
// JSON-LD — Offer schema per tier. Content is a static, hard-coded object
// constructed at build time — no user input reaches this payload. Rendered
// via dangerouslySetInnerHTML because Next.js requires it for <script
// type="application/ld+json">. Safe by construction.
// ═══════════════════════════════════════════════════════════════════════════

const OFFERS_JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Offer',
      name: 'GradeUp HS-NIL — Athletes',
      description:
        'Free forever for HS scholar-athletes. Platform take-rate of 8% on deals under $500 and 6% on deals $500 and above is applied to deal compensation. Parent custodian receives 92-94% of gross.',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      category: 'Athletes',
      url: 'https://gradeup-nil.com/pricing#athletes',
    },
    {
      '@type': 'Offer',
      name: 'GradeUp HS-NIL — Brands',
      description:
        'Free to sign up. 8% platform fee per completed deal. No monthly minimums. No hidden costs.',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      category: 'Brands',
      url: 'https://gradeup-nil.com/pricing#brands',
    },
    {
      '@type': 'Offer',
      name: 'GradeUp HS-NIL — Brand Plus',
      description:
        'Unlimited campaigns, priority athlete matching, branded case study, 1-on-1 onboarding. Reduced 5% platform fee on completed deals.',
      price: '149',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      category: 'Brands',
      url: 'https://gradeup-nil.com/pricing#brand-plus',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '149',
        priceCurrency: 'USD',
        billingIncrement: 1,
        unitCode: 'MON',
      },
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// TIER CARDS
// ═══════════════════════════════════════════════════════════════════════════

type Tier = {
  id: string;
  name: string;
  headline: string;
  price: string;
  priceDetail?: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  highlighted?: boolean;
  features: string[];
};

const tiers: Tier[] = [
  {
    id: 'athletes',
    name: 'Athletes',
    headline: 'Free forever',
    price: '$0',
    priceDetail: 'per month',
    description:
      'Free forever for HS scholar-athletes. The platform take-rate is applied to deal compensation only — you never pay out-of-pocket.',
    ctaLabel: 'Create athlete profile',
    ctaHref: '/signup/athlete',
    features: [
      'Free profile, matching, and dashboard',
      'Take-rate: 8% on deals under $500',
      'Take-rate: 6% on deals $500 and above',
      'Parent custodian receives 92–94% of gross',
      'Per-state rules engine, included',
      'Parental consent flow, included',
    ],
  },
  {
    id: 'brands',
    name: 'Brands',
    headline: 'No monthly minimum',
    price: '$0',
    priceDetail: 'to sign up',
    description:
      'Free to sign up. 8% platform fee per completed deal. No monthly minimums. No hidden costs.',
    ctaLabel: 'Create brand account',
    ctaHref: '/signup/brand',
    features: [
      'Self-serve brand signup in under two minutes',
      '8% platform fee on completed deals only',
      'No monthly minimum, no seat fees',
      'Real-time state-rule preflight on every deal',
      'Escrow-at-signing protects both parties',
      'Upgrade to Brand Plus any time',
    ],
  },
  {
    id: 'brand-plus',
    name: 'Brand Plus',
    headline: 'For regional brands running campaigns',
    price: '$149',
    priceDetail: 'per month, or $1,490/yr (save $298)',
    description:
      'Unlocks unlimited campaigns, priority athlete matching, a branded case study on our site, and a 1-on-1 onboarding call. Platform fee reduced to 5% on completed deals.',
    ctaLabel: 'Start Brand Plus',
    ctaHref: '/signup/brand?plan=plus',
    highlighted: true,
    features: [
      'Unlimited active campaigns',
      'Priority athlete matching in the queue',
      'Branded case study on gradeup-nil.com',
      '1-on-1 onboarding call with our team',
      'Reduced 5% platform fee on completed deals',
      'Dedicated support (email + Slack Connect)',
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// FAQ
// ═══════════════════════════════════════════════════════════════════════════

const faqs: { q: string; a: string }[] = [
  {
    q: 'Why is it free for parents?',
    a: 'Parents are the trusted adults in the HS-NIL system. We do not charge them. Ever. Parents never see a fee for signing up, approving a deal, or acting as the custodian of their athlete\'s earnings. Our take-rate on brand deals pays for the platform, compliance, and state-disclosure infrastructure.',
  },
  {
    q: 'What is a "take-rate"?',
    a: 'A take-rate is the percentage of a completed deal that the platform retains to cover its costs. GradeUp\'s take-rate is 8% on deals under $500 and 6% on deals of $500 or more. The remaining 92–94% goes to the parent custodian account for the benefit of the athlete. For example, on a $300 deal, the athlete\'s custodian receives $276; on a $1,000 deal, the custodian receives $940.',
  },
  {
    q: 'How do I know my deal is in compliance?',
    a: 'Every deal is validated in real time against the current rules for the athlete\'s state. Our per-state rules engine checks for prohibited categories (alcohol, tobacco, gambling, etc.), disclosure windows, amount caps where applicable, and consent scope. Non-compliant deals are rejected at creation, before anyone signs. The state athletic association receives an auditable disclosure record for every completed deal in their state.',
  },
  {
    q: 'What happens if the platform fee would eat too much of a small deal?',
    a: 'We already designed for this: below $500 the take-rate is 8%, so on a $50 deal the fee is $4. We do not charge flat minimums that disproportionately impact small deals. If a deal ever fails state-rule validation, no fee is charged because no deal occurred.',
  },
  {
    q: 'Do you charge schools?',
    a: 'No. Individual high schools pay $0 in year 1 of a pilot state. Future custom enterprise pricing may exist for schools seeking advanced reporting or integrations starting in 2027, but there is no fee today.',
  },
  {
    q: 'Do you charge the state athletic association?',
    a: 'No. The State AD compliance portal is always free. It is a non-commercial public-good product. State athletic associations get read-only visibility into every deal in their state at no cost.',
  },
  {
    q: 'Are there any application fees?',
    a: 'No. We do not charge athletes, parents, or brands an application fee to use the platform. There is no fee to create a profile, browse athletes, browse brands, or post an opportunity.',
  },
  {
    q: 'What about Brand Plus — can I cancel?',
    a: 'Yes. Brand Plus is month-to-month or annual. Cancel any time; the cancellation takes effect at the end of your current billing cycle. We do not prorate mid-cycle refunds. Full terms live on our subscription-terms page.',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPARISON TABLE
// ═══════════════════════════════════════════════════════════════════════════

type Row = { label: string; athletes: string; brands: string; brandPlus: string };

const tableRows: Row[] = [
  { label: "Who it's for", athletes: 'HS scholar-athletes (8th grade through senior year)', brands: 'Local / regional brands running individual deals', brandPlus: 'Brands running repeat campaigns' },
  { label: 'Signup fee', athletes: '$0', brands: '$0', brandPlus: '$149/mo or $1,490/yr' },
  { label: 'Monthly minimum', athletes: 'None', brands: 'None', brandPlus: 'Subscription itself' },
  { label: 'Fee per completed deal', athletes: 'N/A — take-rate, not fee', brands: '8%', brandPlus: '5%' },
  { label: 'Take-rate on deals < $500', athletes: '8% of deal', brands: 'N/A', brandPlus: 'N/A' },
  { label: 'Take-rate on deals ≥ $500', athletes: '6% of deal', brands: 'N/A', brandPlus: 'N/A' },
  { label: 'Parent custodian share', athletes: '92–94% of gross', brands: 'N/A', brandPlus: 'N/A' },
  { label: 'State-rule checks', athletes: 'Yes, included', brands: 'Yes, included', brandPlus: 'Yes, included' },
  { label: 'Parental consent architecture', athletes: 'Yes, included', brands: 'Yes, included', brandPlus: 'Yes, included' },
  { label: 'Dispute resolution', athletes: 'Yes, included', brands: 'Yes, included', brandPlus: 'Yes, included' },
  { label: 'Compliance disclosure pipeline', athletes: 'Yes, included', brands: 'Yes, included', brandPlus: 'Yes, included' },
  { label: 'Unlimited active campaigns', athletes: 'N/A', brands: 'No — single deal at a time', brandPlus: 'Yes' },
  { label: 'Priority athlete matching', athletes: 'N/A', brands: 'Standard queue', brandPlus: 'Priority queue' },
  { label: 'Branded case study authoring', athletes: 'No', brands: 'No', brandPlus: 'Yes, on gradeup-nil.com' },
  { label: 'Dedicated support', athletes: 'Email only', brands: 'Email only', brandPlus: 'Email + Slack Connect' },
  { label: '1-on-1 onboarding call', athletes: 'No', brands: 'No', brandPlus: 'Yes' },
];

// ═══════════════════════════════════════════════════════════════════════════
// HERO
// ═══════════════════════════════════════════════════════════════════════════

function Hero() {
  return (
    <section
      aria-label="Pricing hero"
      className="relative overflow-hidden bg-black pt-32 pb-20 sm:pt-40 sm:pb-24"
    >
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 20% 20%, rgba(0, 240, 255, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(255, 200, 0, 0.08) 0%, transparent 50%)',
        }}
      />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          <Shield className="h-3.5 w-3.5" aria-hidden="true" />
          Transparent pricing
        </span>
        <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Pricing that doesn&rsquo;t require a{' '}
          <span className="gradient-text-cyan">sales call.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
          We publish our take-rate, our subscription price, and what&rsquo;s
          included — so parents, athletes, brands, and compliance officers can
          read this page, decide, and sign up in minutes.
        </p>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TIER CARDS
// ═══════════════════════════════════════════════════════════════════════════

function TierCards() {
  return (
    <section aria-label="Pricing tiers" className="bg-black py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              id={tier.id}
              className={`relative flex flex-col rounded-2xl border p-6 sm:p-8 ${
                tier.highlighted
                  ? 'border-[var(--accent-primary)]/40 bg-gradient-to-br from-[var(--accent-primary)]/10 via-black to-black shadow-[0_0_40px_-10px_rgba(0,240,255,0.3)]'
                  : 'border-white/10 bg-[var(--marketing-gray-950)]'
              }`}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-[var(--accent-primary)]/50 bg-black px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
                  Most popular for brands
                </span>
              )}
              <div className="mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
                  {tier.name}
                </h2>
                <p className="mt-1 text-white/60 text-sm">{tier.headline}</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white sm:text-5xl">
                    {tier.price}
                  </span>
                  {tier.priceDetail && (
                    <span className="text-sm text-white/60">{tier.priceDetail}</span>
                  )}
                </div>
                <p className="mt-3 text-sm text-white/70">{tier.description}</p>
              </div>
              <ul className="mb-6 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm text-white/80"
                  >
                    <Check
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--accent-success)]"
                      aria-hidden="true"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href={tier.ctaHref} className="mt-auto">
                <Button
                  size="lg"
                  className={`w-full gap-2 ${
                    tier.highlighted
                      ? 'btn-marketing-primary'
                      : 'btn-marketing-outline'
                  }`}
                  aria-label={`${tier.ctaLabel} — ${tier.name}`}
                >
                  {tier.ctaLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ALWAYS-FREE ROLES
// ═══════════════════════════════════════════════════════════════════════════

function AlwaysFree() {
  const rows = [
    {
      label: 'State athletic associations',
      detail: '$0 — always free. Non-commercial. Read-only compliance portal.',
    },
    {
      label: 'Parents',
      detail: '$0 — never a fee. Parents pay nothing, ever.',
    },
    {
      label: 'Individual high schools',
      detail:
        '$0 in year 1 for pilot-state schools. Custom enterprise pricing planned for 2027+.',
    },
  ];
  return (
    <section
      aria-label="Always-free roles"
      className="bg-[var(--marketing-gray-950)] py-12 sm:py-16 border-y border-white/10"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Always free
          </h2>
          <p className="mt-2 text-white/60">
            Three groups never pay us — as a matter of policy, not just pricing.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="rounded-xl border border-white/10 bg-black p-5"
            >
              <div className="flex items-center gap-2 text-[var(--accent-success)]">
                <Check className="h-4 w-4" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-widest">
                  Always $0
                </span>
              </div>
              <h3 className="mt-3 text-lg font-bold text-white">{row.label}</h3>
              <p className="mt-2 text-sm text-white/70">{row.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE TABLE
// ═══════════════════════════════════════════════════════════════════════════

function FeatureTable() {
  return (
    <section aria-label="Feature comparison by tier" className="bg-black py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Every feature, every tier
          </h2>
          <p className="mt-2 text-white/60">
            Nothing hidden behind an enterprise call.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[var(--marketing-gray-950)]">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Feature availability across Athletes, Brands, and Brand Plus tiers
            </caption>
            <thead className="bg-white/5">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold text-white sm:px-6">
                  Feature
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-white sm:px-6">
                  Athletes
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-white sm:px-6">
                  Brands
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 font-semibold text-[var(--accent-primary)] sm:px-6"
                >
                  Brand Plus
                </th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, i) => (
                <tr
                  key={row.label}
                  className={i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'}
                >
                  <th
                    scope="row"
                    className="px-4 py-3 font-medium text-white/90 sm:px-6"
                  >
                    {row.label}
                  </th>
                  <td className="px-4 py-3 text-white/70 sm:px-6">{row.athletes}</td>
                  <td className="px-4 py-3 text-white/70 sm:px-6">{row.brands}</td>
                  <td className="px-4 py-3 text-white/90 sm:px-6">{row.brandPlus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FAQ
// ═══════════════════════════════════════════════════════════════════════════

function FAQ() {
  return (
    <section
      aria-label="Pricing FAQ"
      className="bg-[var(--marketing-gray-950)] py-16 border-y border-white/10"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Frequently asked questions
          </h2>
        </div>
        <dl className="space-y-6">
          {faqs.map((item) => (
            <div
              key={item.q}
              className="rounded-xl border border-white/10 bg-black p-5"
            >
              <dt className="text-base font-semibold text-white">{item.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-white/75">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FINAL CTA
// ═══════════════════════════════════════════════════════════════════════════

function FinalCTA() {
  return (
    <section aria-label="Pricing final call to action" className="bg-black py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[var(--accent-primary)]/10 via-black to-[var(--accent-gold)]/10 p-10 text-center">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[var(--accent-primary)]/15 blur-3xl" />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
              Start free. No sales call.
            </h2>
            <p className="mt-4 text-white/70 max-w-2xl mx-auto">
              Create your account today. Review the terms. Run your first deal
              this week.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/signup/brand">
                <Button size="lg" className="btn-marketing-primary gap-2 w-full sm:w-auto">
                  Create a brand account
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/signup/athlete">
                <Button size="lg" className="btn-marketing-outline gap-2 w-full sm:w-auto">
                  Create an athlete profile
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-center text-xs text-white/50 leading-relaxed">
          We do not charge application fees. We do not charge athletes. Parents
          never see a fee. Our take-rate pays for platform + compliance +
          state-disclosure infrastructure.
        </p>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function PricingPage() {
  // Build-time static JSON-LD Offer schema. No user input.
  const jsonLdString = JSON.stringify(OFFERS_JSONLD);
  return (
    <>
      <Script
        id="pricing-offers-jsonld"
        type="application/ld+json"
        strategy="beforeInteractive"
      >
        {jsonLdString}
      </Script>
      <Hero />
      <TierCards />
      <AlwaysFree />
      <FeatureTable />
      <FAQ />
      <FinalCTA />
    </>
  );
}
