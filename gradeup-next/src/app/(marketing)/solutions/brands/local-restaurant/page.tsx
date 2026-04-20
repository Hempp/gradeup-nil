/**
 * /solutions/brands/local-restaurant — Vertical landing for QSR, family
 * restaurants, cafes, ice-cream shops, and bakeries.
 *
 * Owned by VERTICAL-BRAND-PAGES. Dark, cyan-accent tone matching
 * /solutions/brands. Server Component, ISR every 5 min.
 *
 * Uses shared components from SOLUTIONS-PAGES: SolutionHero,
 * ProblemProductProof, CaseStudyTagStrip, SolutionFaq, SolutionSchema,
 * SolutionCtaBand. Valuation example is computed server-side against the
 * live `estimateValuation` service so numbers stay aligned with the
 * brand-facing FMV tool.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldAlert, Utensils, Check, ArrowRight } from 'lucide-react';
import {
  SolutionHero,
  ProblemProductProof,
  CaseStudyTagStrip,
  SolutionFaq,
  SolutionSchema,
  SolutionCtaBand,
} from '@/components/marketing';
import {
  estimateValuation,
  formatValuationCents,
  type ValuationInput,
} from '@/lib/hs-nil/valuation';

export const revalidate = 300;

const PAGE_URL = '/solutions/brands/local-restaurant';

export const metadata: Metadata = {
  title:
    'Local restaurant brand NIL campaigns | HS scholar-athletes | GradeUp',
  description:
    'QSR, cafes, ice-cream shops, and family restaurants run compliance-handled NIL campaigns with verified HS scholar-athletes across 7 pilot states. Pay on approval, no alcohol exposure, real foot traffic.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: 'Local restaurant NIL campaigns with HS scholar-athletes',
    description:
      'Fill seats on a Tuesday. Sponsor a junior QB with 2,000 followers. We handle every compliance check.',
    type: 'website',
    url: PAGE_URL,
  },
  robots: { index: true, follow: true },
  keywords: [
    'restaurant NIL',
    'QSR influencer marketing',
    'local restaurant brand partnership',
    'HS athlete restaurant sponsorship',
    'food & beverage NIL',
  ],
};

// Representative valuation — junior football, CA, 500-2k followers, 3.0-3.5
const VALUATION_INPUT: ValuationInput = {
  sport: 'football',
  stateCode: 'CA',
  gradLevel: 'junior',
  followerCountBucket: '500_to_2k',
  gpaBucket: '3_0_to_3_5',
  verifiedGpa: true,
  tierBSubmitted: false,
};

const FAQ_ITEMS = [
  {
    question: 'Can I sponsor an athlete for a grand-opening event?',
    answer:
      'Yes. Grand-openings are the single most common first campaign. Typical format: 1 pre-event IG story with a promo code, 1 in-person appearance at the opening, 1 post-event recap. Budget: $200-$500 per athlete. We schedule the disclosure around the event window so CIF (CA) or FHSAA (FL) is filed on time.',
  },
  {
    question: 'What if I serve alcohol? Can I still run campaigns?',
    answer:
      'Yes, but the athlete content must stay on the food side. A brewery cannot sponsor. A restaurant that has a bar can, as long as the athlete does not post about drinks, appear near the bar area, or wear alcohol branding. We pre-screen creative before it goes live.',
  },
  {
    question: 'How do appearance fees work?',
    answer:
      'Appearances are a separate line item on the deal. Standard minimum is 45 minutes. Athletes show up, sign autographs, take photos with customers, post one live story. Typical fee: $75-$200 on top of the content fee for in-state juniors.',
  },
  {
    question: 'Can I run the same campaign across three locations?',
    answer:
      'Yes. Multi-location campaigns use one master deal plus per-location appearance riders. It is the most cost-efficient pattern — the content fee is shared and each location pays only the appearance line. We prorate state-association disclosures across locations.',
  },
  {
    question: 'What happens if the athlete posts something off-brief?',
    answer:
      'Every deliverable goes through brand review before escrow releases. If it is off-brief, you reject, the athlete re-posts, the clock resets. No payment flows until you approve.',
  },
  {
    question: 'Does my athlete have to be local?',
    answer:
      'No, but local converts better. The platform shows radius (5mi, 10mi, 25mi, any) as a filter. For restaurants, 10mi is the sweet spot — close enough that the athlete and their friends actually visit.',
  },
];

export default function LocalRestaurantPage() {
  const v = estimateValuation(VALUATION_INPUT);

  return (
    <>
      <SolutionSchema
        scriptId="solutions-brands-local-restaurant-jsonld"
        pageUrl={PAGE_URL}
        name="GradeUp HS — Local Restaurant NIL Campaigns"
        description="Compliance-handled NIL campaigns connecting QSR, cafes, and family restaurants with verified HS scholar-athletes in 7 pilot states."
        audience="Local restaurants, QSR, cafes, bakeries, and family-owned food brands"
      />

      <SolutionHero
        eyebrow="For local restaurants"
        title="Fill the Tuesday booths."
        titleAccent="Sponsor a scholar-athlete."
        subtitle="QSR, cafes, ice-cream shops, bakeries, and family restaurants run NIL campaigns with HS scholar-athletes in their ZIP code. Compliance handled. Pay on approval. No alcohol exposure."
        primaryCta={{
          label: 'Start a restaurant campaign',
          href: '/hs/signup/brand',
          ariaLabel: 'Sign up as a local restaurant brand',
        }}
        secondaryCta={{
          label: 'See what to pay',
          href: '/solutions/brands/fmv',
        }}
        supportingNote="Live in 7 pilot states. No setup fee. First deal typically ships in 7 days."
      />

      <ConcreteExampleSection />

      <ProblemProductProof
        eyebrow="Why this vertical works"
        heading="Athletes already post about food. We just make it a paid deal."
        steps={[
          {
            kind: 'problem',
            heading: 'You need local foot traffic',
            body: 'Paid social is expensive and anonymous. A billboard reaches strangers. You want the 100 parents who actually live within five miles of your restaurant.',
            bullets: [
              'Paid social CAC climbing',
              'Billboard audience is strangers',
              'Yelp reviews are noisy',
              'You want parents, not algorithms',
            ],
          },
          {
            kind: 'product',
            heading: 'A local scholar-athlete posts about you',
            body: 'An HS athlete in your ZIP code posts about your restaurant, brings teammates and parents, and shares to an audience that is literally your customer base. Compliance, escrow, and disclosure are all handled.',
            bullets: [
              'ZIP-code radius filter on athlete matching',
              'Parent-signed consent required before activation',
              '72-hour (CA) / 168-hour (FL) disclosure auto-filed',
              'Pay only on brand-approved deliverable',
            ],
          },
          {
            kind: 'proof',
            heading: 'Food & beverage is our busiest vertical',
            body: 'Food campaigns are the highest fit rate, fastest close time, and lowest rejection rate of any brand vertical in the pilot period.',
            bullets: [
              'Grand-openings are the #1 first campaign',
              'Athletes convert friends into Friday-night diners',
              'Multi-location packages prorate disclosure',
            ],
          },
        ]}
      />

      <CampaignShapeSection />

      <ValuationPanel
        midCents={v.midEstimateCents}
        lowCents={v.lowEstimateCents}
        highCents={v.highEstimateCents}
      />

      <CaseStudyTagStrip
        tags={['food_beverage']}
        heading="Food & beverage case studies"
        subheading="Real deals. Verified earnings. Published with brand attribution."
      />

      <ComplianceCallout />

      <SolutionFaq
        scriptId="solutions-brands-local-restaurant-faq-jsonld"
        pageUrl={PAGE_URL}
        heading="Restaurant questions"
        items={FAQ_ITEMS}
      />

      <HorizontalVerticalNav current="local-restaurant" />

      <SolutionCtaBand
        heading="Your first campaign can ship this week."
        subheading="No setup fee. No monthly minimum. You only pay when the athlete delivers and you approve."
        primaryLabel="Start a restaurant campaign"
        primaryHref="/hs/signup/brand"
        secondaryLabel="See what to pay"
        secondaryHref="/solutions/brands/fmv"
        trustNote="Verified athletes · Disclosure filed for you · No enterprise sales"
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline sections specific to this vertical
// ─────────────────────────────────────────────────────────────────────────────

function ConcreteExampleSection() {
  return (
    <section
      aria-label="Concrete campaign example"
      className="bg-black py-16 border-y border-white/10"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[var(--accent-primary)]/30 bg-gradient-to-br from-black via-[var(--marketing-gray-950)] to-black p-8 md:p-10">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20">
              <Utensils
                className="h-5 w-5 text-[var(--accent-primary)]"
                aria-hidden="true"
              />
            </div>
            <span className="text-xs uppercase tracking-widest text-[var(--accent-primary)] font-semibold mt-1.5">
              What this looks like in practice
            </span>
          </div>
          <p className="text-xl md:text-2xl text-white leading-relaxed">
            A family-owned pizzeria in Long Beach pays a{' '}
            <span className="text-[var(--accent-primary)] font-semibold">
              junior football player with 1,800 Instagram followers
            </span>{' '}
            $225 to post about the back-to-school slice-and-soda combo and
            make a 45-minute Friday-night appearance. Three teammates show
            up, a dozen parents follow, and the booth count on a Tuesday
            moves. GradeUp files the 72-hour CIF disclosure, verifies his
            GPA, holds escrow, and pays on approval.
          </p>
        </div>
      </div>
    </section>
  );
}

function CampaignShapeSection() {
  const steps = [
    {
      n: '01',
      title: 'You post the brief',
      body: 'Budget, dates, deliverables (e.g. "1 IG story + 1 in-person appearance, Fri 6-7pm"), ZIP-code radius.',
    },
    {
      n: '02',
      title: 'Athletes apply',
      body: 'Verified scholar-athletes in your radius apply. You see GPA, sport, followers, and past deal ratings.',
    },
    {
      n: '03',
      title: 'You pick, we disclose',
      body: 'Approve the match. We file the state-required disclosure (72 hrs CA, 168 hrs FL) and notify the school.',
    },
    {
      n: '04',
      title: 'Deliverables in escrow',
      body: 'Athlete posts and/or shows up. You review the deliverable before money releases.',
    },
    {
      n: '05',
      title: 'Pay on approval',
      body: 'Escrow releases to the parent-custodial account on approval. No Net 30, no chasing.',
    },
  ];
  return (
    <section
      aria-label="What a campaign looks like"
      className="bg-[var(--marketing-gray-950)] py-20"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-10">
          What a typical campaign{' '}
          <span className="text-[var(--accent-primary)]">looks like</span>
        </h2>
        <ol className="space-y-4">
          {steps.map((s) => (
            <li
              key={s.n}
              className="flex gap-4 rounded-xl border border-white/10 bg-black/40 p-5 hover:border-[var(--accent-primary)]/30 transition-colors"
            >
              <div className="shrink-0 w-10 h-10 rounded-lg bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 flex items-center justify-center font-bold text-[var(--accent-primary)]">
                {s.n}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{s.title}</h3>
                <p className="text-sm text-white/70 mt-1">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ValuationPanel({
  midCents,
  lowCents,
  highCents,
}: {
  midCents: number;
  lowCents: number;
  highCents: number;
}) {
  return (
    <section aria-label="Sample valuation" className="bg-black py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[var(--accent-gold)]/5 via-black to-[var(--accent-primary)]/5 p-8 md:p-10">
          <span className="text-xs uppercase tracking-widest text-[var(--accent-gold)] font-semibold">
            Sample numbers
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white mt-3">
            A junior football player, CA, 500-2k followers, 3.0-3.5 GPA
            verified
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            <Stat
              label="Annual range (low)"
              value={formatValuationCents(lowCents)}
              hint="Slow season, single post"
            />
            <Stat
              label="Annual expected"
              value={formatValuationCents(midCents)}
              hint="3-5 deals across a year"
              accent
            />
            <Stat
              label="Annual range (high)"
              value={formatValuationCents(highCents)}
              hint="Multi-restaurant, appearance-heavy"
            />
          </div>
          <p className="mt-6 text-sm text-white/60 max-w-3xl">
            A single restaurant campaign for this athlete (one IG story +
            one appearance) lands around{' '}
            <span className="text-white font-semibold">$150 – $350</span>.
            The annual range above assumes a realistic mix of 3-5 deals.
            Live numbers come from the{' '}
            <Link
              href="/solutions/brands/fmv"
              className="text-[var(--accent-primary)] underline underline-offset-4"
            >
              brand FMV tool
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 text-center ${
        accent
          ? 'border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/5'
          : 'border-white/10 bg-white/5'
      }`}
    >
      <div className="text-xs uppercase tracking-widest text-white/50">
        {label}
      </div>
      <div
        className={`font-display text-3xl font-bold mt-2 ${
          accent ? 'text-[var(--accent-primary)]' : 'text-white'
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-white/60 mt-2">{hint}</div>
    </div>
  );
}

function ComplianceCallout() {
  return (
    <section aria-label="Compliance guardrails" className="bg-black py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/5 p-8 md:p-10">
          <div className="flex items-center gap-3 mb-5">
            <ShieldAlert
              className="h-6 w-6 text-[var(--accent-gold)]"
              aria-hidden="true"
            />
            <h2 className="font-display text-2xl font-bold text-white">
              What you cannot do
            </h2>
          </div>
          <p className="text-white/70 mb-6">
            Restaurants are one of the cleanest HS-NIL verticals, but two
            rules matter.
          </p>
          <ul className="space-y-3">
            <ComplianceItem>
              <strong>No alcohol associations.</strong> Beer, wine,
              cocktails, happy-hour creative, or &ldquo;over 21&rdquo;
              branding are banned in every pilot state. If your restaurant
              serves alcohol, the athlete content must stay focused on food.
            </ComplianceItem>
            <ComplianceItem>
              <strong>No school IP.</strong> The athlete cannot wear their
              school jersey, use the mascot, or film in the cafeteria.
              T-shirts and street clothes are fine.
            </ComplianceItem>
            <ComplianceItem>
              <strong>Disclosure is handled.</strong> CA = 72-hour CIF
              notice. FL = 168-hour school notice. We file both
              automatically.
            </ComplianceItem>
          </ul>
          <p className="text-sm text-white/60 mt-6">
            Compliance is our wedge. We document every guardrail so your
            legal team can audit it in 10 minutes. Compare across verticals
            on{' '}
            <Link
              href="/solutions/brands"
              className="text-[var(--accent-primary)] underline underline-offset-4"
            >
              /solutions/brands
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}

function ComplianceItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <Check
        className="h-5 w-5 text-[var(--accent-success)] shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <span className="text-white/85">{children}</span>
    </li>
  );
}

function HorizontalVerticalNav({ current }: { current: string }) {
  const verticals = [
    { slug: 'local-restaurant', label: 'Local restaurant' },
    { slug: 'training-facility', label: 'Training facility' },
    { slug: 'tutoring', label: 'Tutoring' },
    { slug: 'local-retail', label: 'Local retail' },
    { slug: 'fitness', label: 'Fitness' },
  ];
  return (
    <section
      aria-label="Other brand verticals"
      className="bg-black py-16 border-t border-white/10"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm uppercase tracking-widest text-white/50 font-semibold">
            Other brand verticals
          </h2>
          <Link
            href="/solutions/brands"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-primary)]"
          >
            All brand solutions
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="flex flex-wrap gap-3">
          {verticals
            .filter((v) => v.slug !== current)
            .map((v) => (
              <Link
                key={v.slug}
                href={`/solutions/brands/${v.slug}`}
                className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm text-white/80 hover:border-[var(--accent-primary)]/40 hover:bg-[var(--accent-primary)]/5 hover:text-white transition-colors"
              >
                {v.label}
              </Link>
            ))}
        </div>
      </div>
    </section>
  );
}
