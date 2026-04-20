/**
 * /solutions/brands/training-facility — Vertical landing for private
 * coaching gyms, speed/agility trainers, sport-specific training
 * facilities, and skill camps.
 *
 * Owned by VERTICAL-BRAND-PAGES. Server Component. ISR every 5 min.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldAlert, Dumbbell, Check, ArrowRight } from 'lucide-react';
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

const PAGE_URL = '/solutions/brands/training-facility';

export const metadata: Metadata = {
  title:
    'Training facility brand NIL campaigns | HS scholar-athletes | GradeUp',
  description:
    'Private coaching gyms, speed-and-agility programs, and skill camps run compliance-handled NIL campaigns with verified HS scholar-athletes. No performance guarantees, no school IP, real enrollments.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: 'Training facility NIL campaigns with HS scholar-athletes',
    description:
      'Sponsor the athlete who already trains with you. Compliance-handled, monthly-series pricing.',
    type: 'website',
    url: PAGE_URL,
  },
  robots: { index: true, follow: true },
  keywords: [
    'training facility NIL',
    'sport performance gym sponsorship',
    'speed and agility camp marketing',
    'HS athlete training sponsorship',
    'skill camp NIL partnership',
  ],
};

// Representative valuation — senior basketball, GA, 2k-10k, 3.5-3.9, verified + Tier B
const VALUATION_INPUT: ValuationInput = {
  sport: 'basketball_m',
  stateCode: 'GA',
  gradLevel: 'senior',
  followerCountBucket: '2k_to_10k',
  gpaBucket: '3_5_to_3_9',
  verifiedGpa: true,
  tierBSubmitted: true,
};

const FAQ_ITEMS = [
  {
    question: 'How do I price a multi-month series?',
    answer:
      'Monthly retainers are cleaner than per-post pricing for training facilities. A typical senior with 2-10k followers: $300-$600 per month. Deliverables usually include 2 training reels, 1 progress post, and 1 open-gym appearance. Each month is its own escrow release so you can cancel between months.',
  },
  {
    question: 'Can I sponsor a summer camp using an athlete?',
    answer:
      'Yes — this is the highest-converting training-facility use case. Pattern: pay the athlete $400-$800 to post 2-3 reels in May, then appear at the opening day. Enrollment conversions track back through a promo code or sub-affiliate link. We run the GHSA/FHSAA disclosure flow end-to-end.',
  },
  {
    question: 'How do appearance fees work on top of the content fee?',
    answer:
      'Each appearance is a separate line item on the deal. Typical: $75-$150 for 45 minutes, up to $300 for a half-day camp assist. Appearances release escrow the day they happen, separate from the monthly content escrow.',
  },
  {
    question: 'What if the athlete school has its own NIL clearinghouse?',
    answer:
      'Many do. Every pilot state either runs disclosure through the state athletic association (CA, NJ) or the school directly (FL, GA, IL, NY, TX). We file with the right recipient automatically — you do not coordinate anything.',
  },
  {
    question: 'Can I offer a free camp spot in exchange for posts?',
    answer:
      'Trading a free camp for content is treated as compensation and must go through the NIL deal just like cash. The camp retail value becomes the deal comp. Do not hand out "free" spots off-platform — it creates a disclosure gap.',
  },
  {
    question: 'What about athletes in prohibited states (MI, WY, AL, HI, IN)?',
    answer:
      'Deals cannot originate with an athlete in a state that prohibits HS NIL. The platform blocks these geographies at signup. Watch the expansion map on /solutions/state-ads.',
  },
];

export default function TrainingFacilityPage() {
  const v = estimateValuation(VALUATION_INPUT);

  return (
    <>
      <SolutionSchema
        scriptId="solutions-brands-training-facility-jsonld"
        pageUrl={PAGE_URL}
        name="GradeUp HS — Training Facility NIL Campaigns"
        description="Compliance-handled NIL campaigns connecting private training facilities and skill camps with verified HS scholar-athletes in 7 pilot states."
        audience="Private training facilities, skill camps, speed-and-agility gyms, and sport-specific coaches"
      />

      <SolutionHero
        eyebrow="For training facilities"
        title="Sponsor the athlete"
        titleAccent="who already trains with you."
        subtitle="Private coaching gyms, speed-and-agility programs, sport-specific facilities, and skill camps turn their best clients into their best marketing. Monthly-series pricing. Compliance handled."
        primaryCta={{
          label: 'Start a training campaign',
          href: '/hs/signup/brand',
          ariaLabel: 'Sign up as a training facility brand',
        }}
        secondaryCta={{
          label: 'See what to pay',
          href: '/solutions/brands/fmv',
        }}
        supportingNote="Live in 7 pilot states. Cancel between months."
      />

      <ConcreteExampleSection />

      <ProblemProductProof
        eyebrow="Why training fits"
        heading="The athlete is already your client. Make it formal."
        steps={[
          {
            kind: 'problem',
            heading: 'Word-of-mouth is untracked',
            body: 'Athletes already train with you. They already talk about the gym in the locker room. None of that shows up in your marketing funnel, and you cannot target it with ads.',
            bullets: [
              'Enrollment spikes are hard to attribute',
              'Parents ask around without a clear referral source',
              'Camp attendance fluctuates unpredictably',
            ],
          },
          {
            kind: 'product',
            heading: 'Formalize the referral',
            body: 'Pay your best HS client to post about their training. Multi-month series bundle training reels, progress posts, and open-gym appearances. Every deal runs on rails — disclosure, escrow, review.',
            bullets: [
              'Monthly retainer structure',
              'State disclosure filed automatically',
              'Per-month escrow release',
              'TX: age-17 gate + custodial trust until 18',
            ],
          },
          {
            kind: 'proof',
            heading: 'Summer camps convert 3-5x on this pattern',
            body: 'In the pilot period, training-facility brands running May-August scholar-athlete series saw 3-5x lift on summer-camp enrollment vs. paid social, with 30-day attribution.',
            bullets: [
              'Long-form retainers avoid per-post friction',
              'Promo codes close the attribution loop',
              'Roster-wide campaigns scale the cost curve',
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
        heading="Training-facility case studies"
        subheading="Multi-month retainers, summer-camp lifts, open-gym appearance ROI."
      />

      <ComplianceCallout />

      <SolutionFaq
        scriptId="solutions-brands-training-facility-faq-jsonld"
        pageUrl={PAGE_URL}
        heading="Training-facility questions"
        items={FAQ_ITEMS}
      />

      <HorizontalVerticalNav current="training-facility" />

      <SolutionCtaBand
        heading="Turn your best client into your best marketing."
        subheading="No setup fee. Monthly-series pricing. Cancel between months."
        primaryLabel="Start a training campaign"
        primaryHref="/hs/signup/brand"
        secondaryLabel="See what to pay"
        secondaryHref="/solutions/brands/fmv"
        trustNote="Verified athletes · Disclosure filed for you · TX custodial trust built in"
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
              <Dumbbell className="h-5 w-5 text-[var(--accent-primary)]" aria-hidden="true" />
            </div>
            <span className="text-xs uppercase tracking-widest text-[var(--accent-primary)] font-semibold mt-1.5">
              What this looks like in practice
            </span>
          </div>
          <p className="text-xl md:text-2xl text-white leading-relaxed">
            A speed-and-agility gym outside Atlanta pays a{' '}
            <span className="text-[var(--accent-primary)] font-semibold">
              senior basketball player with 4,800 Instagram followers
            </span>{' '}
            $450 per month for a three-month series: two training-session
            reels, one monthly progress post, and two open-gym appearance
            Saturdays. Summer-camp enrollment climbs. GradeUp verifies his
            GPA, files the GHSA school disclosure, and holds escrow month
            by month.
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
      title: 'Pick the athlete',
      body: 'Start with someone who already trains with you, or post open and find a new one.',
    },
    {
      n: '02',
      title: 'Define the series',
      body: 'Typical: 2 training reels/month + 1 progress post + 1 open-gym appearance.',
    },
    {
      n: '03',
      title: 'We file disclosure',
      body: 'State-specific window (GA: 168 hrs, TX: 168 hrs + age-17 gate). Filed automatically.',
    },
    {
      n: '04',
      title: 'Monthly deliverables + review',
      body: 'Athlete submits each month. You review before escrow releases.',
    },
    {
      n: '05',
      title: 'Pay monthly on approval',
      body: 'Parent-custodial Stripe. TX payments held until age 18 when required.',
    },
  ];
  return (
    <section
      aria-label="What a campaign looks like"
      className="bg-[var(--marketing-gray-950)] py-20"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-10">
          What a monthly-series campaign{' '}
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
            A senior basketball player, GA, 2k-10k followers, 3.5-3.9 GPA
            verified + transcript
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            <Stat
              label="Annual range (low)"
              value={formatValuationCents(lowCents)}
              hint="Light season, single series"
            />
            <Stat
              label="Annual expected"
              value={formatValuationCents(midCents)}
              hint="3-month + summer series mix"
              accent
            />
            <Stat
              label="Annual range (high)"
              value={formatValuationCents(highCents)}
              hint="Full-year contract + camps"
            />
          </div>
          <p className="mt-6 text-sm text-white/60 max-w-3xl">
            A monthly training series for this athlete lands around{' '}
            <span className="text-white font-semibold">$300 – $600 per month</span>.
            Annual total depends on how many months and whether appearance
            fees stack. Open the{' '}
            <Link
              href="/solutions/brands/fmv"
              className="text-[var(--accent-primary)] underline underline-offset-4"
            >
              brand FMV tool
            </Link>{' '}
            for your specific athlete.
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
            <ShieldAlert className="h-6 w-6 text-[var(--accent-gold)]" aria-hidden="true" />
            <h2 className="font-display text-2xl font-bold text-white">
              What you cannot do
            </h2>
          </div>
          <p className="text-white/70 mb-6">
            Training-facility deals have four common failure modes. We
            block each at deal creation.
          </p>
          <ul className="space-y-3">
            <ComplianceItem>
              <strong>No performance guarantees.</strong> Copy like
              &ldquo;train here and get recruited by D1&rdquo; or &ldquo;I
              got my scholarship because of this gym&rdquo; is flatly
              banned. Pay-for-play language violates every state NIL rule.
            </ComplianceItem>
            <ComplianceItem>
              <strong>No school team name or logo.</strong> The athlete
              cannot wear the school jersey, rep the mascot, or film in the
              school weight room. Personal gear is fine.
            </ComplianceItem>
            <ComplianceItem>
              <strong>No implied roster spot.</strong> You cannot offer the
              sponsorship in exchange for a specific school commit or
              position. It is an NIL deal, not a recruitment tool.
            </ComplianceItem>
            <ComplianceItem>
              <strong>Texas: age-17 + custodial trust.</strong> For TX
              athletes under 17 the deal is blocked. For 17-year-olds,
              payout holds in a parent-custodial trust until the 18th
              birthday. Handled automatically.
            </ComplianceItem>
          </ul>
          <p className="text-sm text-white/60 mt-6">
            We run every deal through the state-rules engine before it goes
            live. Compare guardrails across verticals at{' '}
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
