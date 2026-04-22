/**
 * /solutions/brands/fitness — Vertical landing for gyms, fitness apps,
 * non-prohibited supplement brands, sport-equipment brands, and
 * athletic-recovery services.
 *
 * Server Component. ISR 5-min.
 */
import Link from 'next/link';
import { ShieldAlert, Flame, Check, ArrowRight } from 'lucide-react';
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
import { buildMarketingMetadata } from '@/lib/seo';

export const revalidate = 300;

const PAGE_URL = '/solutions/brands/fitness';

export const metadata = {
  ...buildMarketingMetadata({
    title: 'Fitness brand NIL campaigns | HS scholar-athletes | GradeUp',
    description:
      'Gyms, fitness apps, non-prohibited supplements, sport equipment, and recovery brands run compliance-handled NIL campaigns with verified HS scholar-athletes across 7 pilot states. Banned-substance checks included.',
    path: PAGE_URL,
  }),
  robots: { index: true, follow: true },
  keywords: [
    'fitness NIL',
    'gym opening athlete marketing',
    'supplement HS NIL',
    'sport equipment sponsorship',
    'athletic recovery brand partnership',
  ],
};

// Representative valuation — senior football, FL, 2k-10k, 3.0-3.5, unverified
const VALUATION_INPUT: ValuationInput = {
  sport: 'football',
  stateCode: 'FL',
  gradLevel: 'senior',
  followerCountBucket: '2k_to_10k',
  gpaBucket: '3_0_to_3_5',
  verifiedGpa: false,
  tierBSubmitted: false,
};

const FAQ_ITEMS = [
  {
    question: 'How does the banned-substance check work?',
    answer:
      'At brand signup, you upload the SKU list you want to feature. Each SKU runs through the state-association banned-substance lists (NFHS plus each pilot state supplement rules). SKUs that conflict get flagged and cannot be featured in that state. A green/red column shows in your brand dashboard before any athlete matches.',
  },
  {
    question: 'Can I run a team takeover with 6 athletes on the same roster?',
    answer:
      'Yes — this is our most common fitness pattern. Book 4-8 athletes from one school team under a master campaign. Per-athlete fees drop 15-20% above 4 concurrent. One batch disclosure filing covers the roster. Grand-opening and first-week campaigns are the highest-converting use case.',
  },
  {
    question: 'What about supplement brands that are not banned?',
    answer:
      'Plenty of products pass: whey/plant protein (non-prop-blend), electrolytes, creatine (varies by state — check CA carefully), recovery drinks, compression gear, foam rollers, resistance bands. The dashboard tells you exactly what clears in each state before you create the campaign.',
  },
  {
    question: 'Can I sponsor an athlete during their competitive season?',
    answer:
      'Yes, but two extra guardrails kick in: (1) no performance-contingent language, and (2) for in-season athletes the content cannot reference a specific game outcome. Off-season (summer, spring for fall sports) has the loosest rules.',
  },
  {
    question: 'How do gym-opening campaigns work end-to-end?',
    answer:
      'Standard 30-day package: book 4-6 local scholar-athletes 2 weeks pre-open. Each posts 1 pre-open teaser, 2 post-open reels, and attends the opening-day appearance. Total cost typically $3k-$8k for 4-6 athletes combined. One Texas gym hit 340 new memberships in 60 days from this pattern.',
  },
  {
    question: 'What if my product already has a celebrity athlete endorsement?',
    answer:
      'HS-NIL complements celebrity endorsement well — the celebrity drives top-of-funnel awareness, local HS athletes drive ZIP-code-level intent. We do not require exclusivity; most brands run both stacks in parallel.',
  },
];

export default function FitnessPage() {
  const v = estimateValuation(VALUATION_INPUT);

  return (
    <>
      <SolutionSchema
        scriptId="solutions-brands-fitness-jsonld"
        pageUrl={PAGE_URL}
        name="GradeUp HS — Fitness NIL Campaigns"
        description="Compliance-handled NIL campaigns connecting fitness, equipment, and recovery brands with verified HS scholar-athletes. Banned-substance screening included."
        audience="Gyms, fitness apps, non-prohibited supplements, equipment brands, and recovery services"
      />

      <SolutionHero
        eyebrow="For fitness + recovery"
        title="The athlete already"
        titleAccent="lives in your category."
        subtitle="Gyms, fitness apps, non-prohibited supplements, sport-equipment brands, and recovery services partner with verified HS scholar-athletes. Banned-substance screening built in. No performance contingencies."
        primaryCta={{
          label: 'Start a fitness campaign',
          href: '/hs/signup/brand',
          ariaLabel: 'Sign up as a fitness brand',
        }}
        secondaryCta={{
          label: 'See what to pay',
          href: '/solutions/brands/fmv',
        }}
        supportingNote="Live in 7 pilot states. Team-takeover campaigns supported."
      />

      <ConcreteExampleSection />

      <ProblemProductProof
        eyebrow="Why fitness fits"
        heading="Direct overlap. Direct ROI. Most edges to respect."
        steps={[
          {
            kind: 'problem',
            heading: 'Compliance keeps you out of the HS market',
            body: 'Fitness has more state-specific banned-substance rules than any other vertical. A brand that gets this wrong pulls the athlete from competition. Most brands stay out entirely — and miss the most native audience they will ever have.',
            bullets: [
              'State banned-substance lists differ',
              'Pay-for-play contingencies are easy to trip',
              'Gym-IP restrictions vary by state',
            ],
          },
          {
            kind: 'product',
            heading: 'SKU screening, batch disclosure, no contingencies',
            body: 'Upload your SKU list at signup; each product runs through the NFHS + state-association banned-substance filter. Team-takeover campaigns get batch disclosure. Pay-for-play language is blocked at deal creation.',
            bullets: [
              'SKU-level banned-substance screening',
              'Team-takeover batch disclosure',
              'Pay-for-play language blocked at deal creation',
              'TX: age-17 + custodial trust automatic',
            ],
          },
          {
            kind: 'proof',
            heading: 'Gym-opening ROI beats paid social 3-5x',
            body: 'Pilot data from four gym openings shows HS-NIL CAC 3-5x better than paid social during the 30-day opening window. Month two regresses to parity; the differential is the window.',
            bullets: [
              'New-location 30-day package',
              'Team takeover of 4-8 roster members',
              'Promo-code attribution',
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
        tags={['training']}
        heading="Fitness + recovery case studies"
        subheading="Gym openings, team takeovers, recovery-brand rollouts."
      />

      <ComplianceCallout />

      <SolutionFaq
        scriptId="solutions-brands-fitness-faq-jsonld"
        pageUrl={PAGE_URL}
        heading="Fitness questions"
        items={FAQ_ITEMS}
      />

      <HorizontalVerticalNav current="fitness" />

      <SolutionCtaBand
        heading="The athlete lives in your category. Make it official."
        subheading="No setup fee. Banned-substance screening included. Team-takeover volume discounts."
        primaryLabel="Start a fitness campaign"
        primaryHref="/hs/signup/brand"
        secondaryLabel="See what to pay"
        secondaryHref="/solutions/brands/fmv"
        trustNote="Verified athletes · Banned-substance filter · TX custodial trust built in"
      />
    </>
  );
}

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
              <Flame className="h-5 w-5 text-[var(--accent-primary)]" aria-hidden="true" />
            </div>
            <span className="text-xs uppercase tracking-widest text-[var(--accent-primary)] font-semibold mt-1.5">
              What this looks like in practice
            </span>
          </div>
          <p className="text-xl md:text-2xl text-white leading-relaxed">
            A 24-hour gym chain opening a new location in Jacksonville pays a{' '}
            <span className="text-[var(--accent-primary)] font-semibold">
              senior football player with 7,800 Instagram followers
            </span>{' '}
            $650 for a grand-opening campaign: 3 reels over 2 weeks (workout
            of the day, fit check, opening-weekend walkthrough) + a
            Saturday appearance. Our banned-substance filter has already
            flagged that FHSAA bans certain pre-workouts — the gym supplement
            vendors are pre-cleared before the athlete ever steps in.
            GradeUp files the 168-hour school disclosure and holds escrow.
          </p>
        </div>
      </div>
    </section>
  );
}

function CampaignShapeSection() {
  const steps = [
    { n: '01', title: 'Pre-screen substances', body: 'Your supplement/product list runs through the state-specific banned-substance filter before athletes can match.' },
    { n: '02', title: 'Pick solo or team takeover', body: 'Single athlete = $400-$1000 window. Team takeover = 4-8 athletes on one roster, volume-discounted.' },
    { n: '03', title: 'Disclosure filed', body: 'State-specific window, school + association as required. TX: age-17 gate + custodial trust.' },
    { n: '04', title: 'Content + appearance', body: 'Typical: 2-3 reels + 1 in-person appearance over 2-4 weeks.' },
    { n: '05', title: 'Pay on approval', body: 'Per-deliverable escrow release. Appearance paid on the day.' },
  ];
  return (
    <section aria-label="What a campaign looks like" className="bg-[var(--marketing-gray-950)] py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-10">
          What a fitness campaign{' '}
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
            A senior football player, FL, 2k-10k followers, 3.0-3.5 GPA
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            <Stat label="Annual range (low)" value={formatValuationCents(lowCents)} hint="1-2 campaigns/year" />
            <Stat label="Annual expected" value={formatValuationCents(midCents)} hint="Gym + equipment mix + appearances" accent />
            <Stat label="Annual range (high)" value={formatValuationCents(highCents)} hint="Full-year contracts + team-takeover fees" />
          </div>
          <p className="mt-6 text-sm text-white/60 max-w-3xl">
            A single fitness campaign for this athlete (3 reels + 1
            appearance) lands around{' '}
            <span className="text-white font-semibold">$400 – $1,000</span>.
            Team takeovers add volume-discount pricing. Test a specific
            athlete in the{' '}
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
      <div className="text-xs uppercase tracking-widest text-white/50">{label}</div>
      <div className={`font-display text-3xl font-bold mt-2 ${accent ? 'text-[var(--accent-primary)]' : 'text-white'}`}>
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
            <ShieldAlert className="h-6 w-6 text-[var(--accent-gold)]" aria-hidden="true" />
            <h2 className="font-display text-2xl font-bold text-white">
              What you cannot do
            </h2>
          </div>
          <p className="text-white/70 mb-6">
            Fitness has the most compliance edges of any vertical. We
            enforce them at deal creation, not after the post goes live.
          </p>
          <ul className="space-y-3">
            <ComplianceItem>
              <strong>No substances banned in HS athletic competition.</strong>{' '}
              Many states ban specific pre-workouts, certain protein
              ingredients, fat-burners, and hemp-derived products for
              in-season HS athletes. Your product list runs through the
              state-specific banned-substance filter before any athlete can
              match. If your product is flagged, the campaign blocks.
            </ComplianceItem>
            <ComplianceItem>
              <strong>No pay-for-play on in-season performance.</strong>{' '}
              Deals cannot be contingent on wins, stats, or playoff
              appearances. Copy like &ldquo;drink our pre-workout and score
              3 TDs&rdquo; violates every state pay-for-play rule.
            </ComplianceItem>
            <ComplianceItem>
              <strong>No school IP or school-uniform training shots.</strong>{' '}
              The athlete cannot film in the school weight room, wear the
              team jersey, or post with the school strength coach in
              uniform. Personal-gym content only.
            </ComplianceItem>
            <ComplianceItem>
              <strong>Texas: age-17 + custodial trust.</strong> For TX
              athletes the minimum-age gate (17) blocks younger athletes,
              and compensation is held in a parent-custodial trust until
              age 18.
            </ComplianceItem>
            <ComplianceItem>
              <strong>Recovery claims need substantiation.</strong>{' '}
              &ldquo;I recovered 40% faster&rdquo; claims require real data
              or they get cut from the deliverable in review.
            </ComplianceItem>
          </ul>
          <p className="text-sm text-white/60 mt-6">
            Compliance is our wedge. Compare guardrails at{' '}
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
      <Check className="h-5 w-5 text-[var(--accent-success)] shrink-0 mt-0.5" aria-hidden="true" />
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
