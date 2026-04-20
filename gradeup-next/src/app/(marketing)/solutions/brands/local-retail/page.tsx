/**
 * /solutions/brands/local-retail — Vertical landing for local boutiques,
 * skate shops, outdoor retail, non-school team stores, and independent
 * apparel brands.
 *
 * Server Component. ISR 5-min.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldAlert, ShoppingBag, Check, ArrowRight } from 'lucide-react';
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

const PAGE_URL = '/solutions/brands/local-retail';

export const metadata: Metadata = {
  title: 'Local retail brand NIL campaigns | HS scholar-athletes | GradeUp',
  description:
    'Local boutiques, skate shops, outdoor retail, and independent apparel brands run compliance-handled NIL campaigns with verified HS scholar-athletes across 7 pilot states. No school IP, real foot traffic.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: 'Local retail NIL campaigns with HS scholar-athletes',
    description:
      'Teen athlete + Instagram + your product = native content. Compliance handled.',
    type: 'website',
    url: PAGE_URL,
  },
  robots: { index: true, follow: true },
  keywords: [
    'local retail NIL',
    'skate shop influencer',
    'boutique apparel partnership',
    'HS athlete fit shoot',
    'independent retail marketing',
  ],
};

// Representative valuation — junior track, NY, under-500 followers, 3.0-3.5, verified
const VALUATION_INPUT: ValuationInput = {
  sport: 'track_field',
  stateCode: 'NY',
  gradLevel: 'junior',
  followerCountBucket: 'under_500',
  gpaBucket: '3_0_to_3_5',
  verifiedGpa: true,
  tierBSubmitted: false,
};

const FAQ_ITEMS = [
  {
    question: 'How do I avoid school IP in product photography?',
    answer:
      'Rule of thumb: if it would make the school athletic director do a double-take, cut it. No mascot graphics, no school colors in a way that references the team, no uniforms or anything uniform-adjacent, no shooting on school property. Outdoor shots, home shots, or neutral-background studio are safest.',
  },
  {
    question: 'What is the right season timing?',
    answer:
      'Back-to-school (August), season-opener (varies by sport), holiday (November-December), and spring-break (March) are the four highest-converting windows. We pre-book athletes 4-6 weeks before each. Off-season sits at 40-60% of peak conversion.',
  },
  {
    question: 'Do you offer volume discounts for multi-athlete drops?',
    answer:
      'Yes. Campaigns with 3+ concurrent athletes drop 15% on platform fees and we run one batch state-association disclosure instead of one per athlete. Most brand-store launches book 3-5 athletes to saturate a ZIP-code micro-market.',
  },
  {
    question: 'Can I give the athlete free product instead of cash?',
    answer:
      'Trading product-only for content is valid as long as the retail value is declared as the deal compensation. TX triggers its custodial-trust rule for anything paid to minors. Safer pattern: pay a nominal cash fee plus free product.',
  },
  {
    question: 'What about athletes whose parents own a competing store?',
    answer:
      'Conflict-of-interest flags fire at deal creation if the athlete disclosed family businesses overlap. You see the flag and can drop or proceed — we do not block it, but it is on the record.',
  },
  {
    question: 'Can I re-use the athlete content in my store or newsletter?',
    answer:
      'Only if the deal grants usage rights beyond the original platform. Standard NIL grants the post on the platform it was made for; repurposing in-store signage, email, or paid social needs an add-on at deal creation. Typical add-on: $50-$150 for 6-month usage.',
  },
];

export default function LocalRetailPage() {
  const v = estimateValuation(VALUATION_INPUT);

  return (
    <>
      <SolutionSchema
        scriptId="solutions-brands-local-retail-jsonld"
        pageUrl={PAGE_URL}
        name="GradeUp HS — Local Retail NIL Campaigns"
        description="Compliance-handled NIL campaigns connecting independent retail brands with verified HS scholar-athletes in 7 pilot states."
        audience="Local retail, boutiques, skate shops, outdoor retail, and independent apparel brands"
      />

      <SolutionHero
        eyebrow="For local retail"
        title="The kid with the"
        titleAccent="good fit shot."
        subtitle="Boutiques, skate shops, outdoor stores, independent apparel, and non-school team stores turn a teen athlete Instagram grid into native product content. Compliance handled. No school IP."
        primaryCta={{
          label: 'Start a retail campaign',
          href: '/hs/signup/brand',
          ariaLabel: 'Sign up as a retail brand',
        }}
        secondaryCta={{
          label: 'See what to pay',
          href: '/solutions/brands/fmv',
        }}
        supportingNote="Live in 7 pilot states. Volume discounts for multi-athlete drops."
      />

      <ConcreteExampleSection />

      <ProblemProductProof
        eyebrow="Why local retail fits"
        heading="The content is native. The athlete was posting it anyway."
        steps={[
          {
            kind: 'problem',
            heading: 'Paid influencer content reads sponsored',
            body: 'A 50k-follower out-of-state influencer feels like advertising. A ZIP-code-local teen athlete posting her Friday fit does not. The content is indistinguishable from her regular grid.',
            bullets: [
              'Big-name influencers lose local intent',
              'Stock-photo marketing feels generic',
              'Teen audiences tune out obvious ads',
            ],
          },
          {
            kind: 'product',
            heading: 'Micro-local, micro-native',
            body: 'A 720-follower junior with a friends-circle audience is the highest engagement rate on the platform. A 3-4 post fit series with your product drops converts within her immediate community — which is your actual customer base.',
            bullets: [
              'ZIP-code radius filter on matches',
              'School IP + uniform policing built in',
              'Multi-athlete drop pattern supported',
              'Creative pre-screen before posts go live',
            ],
          },
          {
            kind: 'proof',
            heading: 'Drops at 3+ athletes beat single-influencer CAC',
            body: 'In pilot data, retail brands that ran 3-5 concurrent local athletes in one drop saw 1.8-3.1x better CAC than a single mid-tier influencer campaign. The overlap in audiences creates a small-town saturation effect.',
            bullets: [
              'Batch disclosure for 3+ athletes',
              'Volume discount at 3+ concurrent',
              'Seasonal drop timing pre-built',
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
        tags={['multi_athlete']}
        heading="Multi-athlete drop case studies"
        subheading="Retail campaigns that saturate a ZIP code with native content."
      />

      <ComplianceCallout />

      <SolutionFaq
        scriptId="solutions-brands-local-retail-faq-jsonld"
        pageUrl={PAGE_URL}
        heading="Local retail questions"
        items={FAQ_ITEMS}
      />

      <HorizontalVerticalNav current="local-retail" />

      <SolutionCtaBand
        heading="Your product. Their grid. Native."
        subheading="No setup fee. Volume discounts on 3+ concurrent athletes. Disclosure handled."
        primaryLabel="Start a retail campaign"
        primaryHref="/hs/signup/brand"
        secondaryLabel="See what to pay"
        secondaryHref="/solutions/brands/fmv"
        trustNote="Verified athletes · Creative pre-screened · School IP blocked"
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
              <ShoppingBag className="h-5 w-5 text-[var(--accent-primary)]" aria-hidden="true" />
            </div>
            <span className="text-xs uppercase tracking-widest text-[var(--accent-primary)] font-semibold mt-1.5">
              What this looks like in practice
            </span>
          </div>
          <p className="text-xl md:text-2xl text-white leading-relaxed">
            A Brooklyn skate shop pays a{' '}
            <span className="text-[var(--accent-primary)] font-semibold">
              junior track athlete with 720 Instagram followers
            </span>{' '}
            $125 for a four-post fit series: new-season hoodie, season-opener
            day-one fit, back-to-school drop, weekend-session reel. Product is
            shot outside the school in personal clothing except the featured
            piece. GradeUp files the 7-day NYSPHSAA + school disclosure (NY
            requires both). Four-month follower lift drives walk-ins through
            the code.
          </p>
        </div>
      </div>
    </section>
  );
}

function CampaignShapeSection() {
  const steps = [
    { n: '01', title: 'Seed + shoot', body: 'Ship product. Athlete integrates into 2-4 grid posts + 1 reel across 3-4 weeks.' },
    { n: '02', title: 'Creative pre-screen', body: 'Photos must not include school IP, uniforms, or anything resembling a school kit. We review.' },
    { n: '03', title: 'Disclosure filed', body: 'NY = 7 days to BOTH association and school. CA = 72 hrs. We file in the right place.' },
    { n: '04', title: 'Post + review', body: 'Each post goes through brand review before escrow releases that line.' },
    { n: '05', title: 'Pay by deliverable', body: 'Per-post escrow release. Multi-post deals pay in chunks, not in a lump.' },
  ];
  return (
    <section aria-label="What a campaign looks like" className="bg-[var(--marketing-gray-950)] py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-10">
          What a fit-shoot series{' '}
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
            A junior track athlete, NY, under-500 followers, 3.0-3.5 GPA verified
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            <Stat label="Annual range (low)" value={formatValuationCents(lowCents)} hint="One drop, post-only" />
            <Stat label="Annual expected" value={formatValuationCents(midCents)} hint="2-3 drops + friends-circle conversion" accent />
            <Stat label="Annual range (high)" value={formatValuationCents(highCents)} hint="Full seasonal rotation + reels" />
          </div>
          <p className="mt-6 text-sm text-white/60 max-w-3xl">
            A single retail fit series for this athlete lands around{' '}
            <span className="text-white font-semibold">$75 – $200</span>.
            Under-500 followers is the &ldquo;micro-native&rdquo; segment —
            high engagement, low reach, perfect for local retail. Use the{' '}
            <Link
              href="/solutions/brands/fmv"
              className="text-[var(--accent-primary)] underline underline-offset-4"
            >
              brand FMV tool
            </Link>{' '}
            to test a bigger athlete.
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
            Retail is clean but product photography is where brands slip up.
          </p>
          <ul className="space-y-3">
            <ComplianceItem>
              <strong>No school-branded merchandise.</strong> You cannot
              co-brand with the athlete school. No custom tees with the
              mascot, no &ldquo;Go Falcons&rdquo; graphics, no school
              colors dressed up as retail.
            </ComplianceItem>
            <ComplianceItem>
              <strong>Nothing resembling a school uniform.</strong> Product
              photography cannot put the athlete in anything that reads as
              &ldquo;team-issued.&rdquo; Personal fit shots only. Location
              matters too — no shooting in the school cafeteria, locker
              room, or stadium.
            </ComplianceItem>
            <ComplianceItem>
              <strong>Disclose every post.</strong> #ad or paid partnership
              tag required on every piece of content. Auto-injected and
              enforced.
            </ComplianceItem>
            <ComplianceItem>
              <strong>Non-prohibited product only.</strong> Retail deals
              cannot promote alcohol, vaping, tobacco, cannabis, firearms,
              or gambling — including &ldquo;lifestyle&rdquo; adjacencies
              like branded rolling papers or vape cases.
            </ComplianceItem>
          </ul>
          <p className="text-sm text-white/60 mt-6">
            We review the first post in every campaign before it goes live.
            Cross-check on{' '}
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
