/**
 * /solutions/brands/tutoring — Vertical landing for local and online
 * tutoring, test-prep services, and study-app brands.
 *
 * Core GradeUp thesis alignment: the scholar-athlete IS the perfect
 * spokesperson for an educational brand. Server Component. ISR 5-min.
 */
import Link from 'next/link';
import { ShieldAlert, GraduationCap, Check, ArrowRight } from 'lucide-react';
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

const PAGE_URL = '/solutions/brands/tutoring';

export const metadata = {
  ...buildMarketingMetadata({
    title: 'Tutoring brand NIL campaigns | HS scholar-athletes | GradeUp',
    description:
      'Local tutoring, online test-prep, and study-app brands run compliance-handled NIL campaigns with verified 3.9+ GPA scholar-athletes across 7 pilot states. Academic integrity first.',
    path: PAGE_URL,
  }),
  robots: { index: true, follow: true },
  keywords: [
    'tutoring NIL',
    'SAT prep influencer',
    'study app partnership',
    'HS scholar-athlete testimonial',
    'education brand NIL',
  ],
};

// Representative valuation — senior soccer_w, IL, 500-2k, 3.9+, Tier B verified
const VALUATION_INPUT: ValuationInput = {
  sport: 'soccer_w',
  stateCode: 'IL',
  gradLevel: 'senior',
  followerCountBucket: '500_to_2k',
  gpaBucket: '3_9_plus',
  verifiedGpa: true,
  tierBSubmitted: true,
};

const FAQ_ITEMS = [
  {
    question: 'How do I make sure the testimonial is authentic?',
    answer:
      'Every Tier B scholar-athlete has submitted an actual transcript that a human admin reviewed. When they claim a GPA, we have seen the paperwork. For score-improvement claims (SAT, ACT, AP), we require the athlete to upload the before/after score report. If they cannot, the post cannot reference a specific number.',
  },
  {
    question: 'What counts as an FTC-compliant disclosure?',
    answer:
      'Every sponsored post auto-injects #ad and #sponsored. For video, the athlete says "paid partnership with [brand]" in the first five seconds. We also enforce the native Instagram paid-partnership tag. Legal has signed off on the template.',
  },
  {
    question: 'Can I source athletes by GPA tier?',
    answer:
      'Yes — this is the GradeUp differentiator. Filter on "verified 3.7+" or "verified 3.9+" and only see scholars whose transcripts we have checked. For tutoring brands this is the only filter that matters.',
  },
  {
    question: 'What if the athlete never actually used my tutoring service?',
    answer:
      'Then they cannot endorse it. FTC requires a real-user relationship for testimonials. Typical solve: offer a free 3-month trial pre-campaign, then run the testimonial post-trial. The trial cost becomes part of the deal value.',
  },
  {
    question: 'How do I track enrollment ROI?',
    answer:
      'Every deal creates a promo code and UTM link. Code redemptions and UTM sign-ups show up in the brand dashboard. Typical tutoring attribution window is 30 days — longer than restaurant or retail.',
  },
  {
    question: 'Can I run the same testimonial across multiple athletes?',
    answer:
      'Yes. Multi-athlete campaigns bundle several scholars under one master brief. Each runs their own testimonial. Pricing scales linearly but production coordination halves. Great for SAT prep, college essay coaching, and online learning apps.',
  },
];

export default function TutoringPage() {
  const v = estimateValuation(VALUATION_INPUT);

  return (
    <>
      <SolutionSchema
        scriptId="solutions-brands-tutoring-jsonld"
        pageUrl={PAGE_URL}
        name="GradeUp HS — Tutoring & Test-Prep NIL Campaigns"
        description="Compliance-handled NIL campaigns connecting tutoring and test-prep brands with verified scholar-athletes who have real GPA and transcript proof."
        audience="Tutoring services, SAT/ACT test-prep, study apps, and educational brands"
      />

      <SolutionHero
        eyebrow="For tutoring & test-prep"
        title="The 3.9 GPA IS"
        titleAccent="your spokesperson."
        subtitle="Local tutoring, online test-prep, and study-app brands partner with verified scholar-athletes whose transcripts we have actually checked. Academic integrity first. FTC disclosure baked in."
        primaryCta={{
          label: 'Start a tutoring campaign',
          href: '/hs/signup/brand',
          ariaLabel: 'Sign up as a tutoring brand',
        }}
        secondaryCta={{
          label: 'See what to pay',
          href: '/solutions/brands/fmv',
        }}
        supportingNote="Live in 7 pilot states. Tier B transcript verification included."
      />

      <ConcreteExampleSection />

      <ProblemProductProof
        eyebrow="Why tutoring fits"
        heading="Your spokesperson needs to be real. Ours are verified."
        steps={[
          {
            kind: 'problem',
            heading: 'Fake testimonials are your biggest liability',
            body: 'Education buyers pattern-match on results. A tutoring company pitching its service through a kid with unverified grades is marketing malpractice. Unverified score claims open FTC exposure.',
            bullets: [
              'Parents pattern-match on results',
              'Unverified score claims are FTC liability',
              'Generic influencers cannot speak to your service',
            ],
          },
          {
            kind: 'product',
            heading: 'Verified-GPA scholars, transcript-reviewed',
            body: 'Every Tier B athlete has submitted an actual transcript we reviewed. Filter on 3.7+, 3.9+, or Tier B + honors. Testimonial scripts pass a truthfulness check before they go live.',
            bullets: [
              'Filter by verified GPA tier',
              'Score claims require uploaded score reports',
              'FTC #ad tag auto-injected on every post',
              'State disclosure filed per pilot rule',
            ],
          },
          {
            kind: 'proof',
            heading: 'Highest-credibility, lowest-cost vertical',
            body: 'Tutoring has the lowest deal dollar per post but the highest enrollment conversion rate. ROI shows up in sign-ups, not reach. Multi-athlete bundles make the cost math work.',
            bullets: [
              'Scholar-athlete testimonials outperform generic influencers 2-4x on enrollments',
              '30-day attribution window on promo-code redemptions',
              'Multi-athlete bundles drop per-testimonial cost',
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
        tags={['tier_b_verified', 'local_business']}
        heading="Verified-GPA case studies"
        subheading="Every number tied to a real transcript and a real deal."
      />

      <ComplianceCallout />

      <SolutionFaq
        scriptId="solutions-brands-tutoring-faq-jsonld"
        pageUrl={PAGE_URL}
        heading="Tutoring questions"
        items={FAQ_ITEMS}
      />

      <HorizontalVerticalNav current="tutoring" />

      <SolutionCtaBand
        heading="The 3.9 GPA is verified. The testimonial is real."
        subheading="No setup fee. Transcript verification included. FTC disclosure handled."
        primaryLabel="Start a tutoring campaign"
        primaryHref="/hs/signup/brand"
        secondaryLabel="See what to pay"
        secondaryHref="/solutions/brands/fmv"
        trustNote="Verified transcripts · FTC disclosure auto-filed · Academic integrity"
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
              <GraduationCap className="h-5 w-5 text-[var(--accent-primary)]" aria-hidden="true" />
            </div>
            <span className="text-xs uppercase tracking-widest text-[var(--accent-primary)] font-semibold mt-1.5">
              What this looks like in practice
            </span>
          </div>
          <p className="text-xl md:text-2xl text-white leading-relaxed">
            An SAT-prep company in Chicago pays a{' '}
            <span className="text-[var(--accent-primary)] font-semibold">
              senior soccer player with a verified 4.0 GPA and 1,400 Instagram followers
            </span>{' '}
            $200 for a four-week testimonial series: week-by-week study
            routine, how she balances training and homework, and her real
            score improvement. Transcript is verified server-side before
            any post goes live. GradeUp files the 14-day IHSA disclosure
            and makes sure every post carries the #ad tag.
          </p>
        </div>
      </div>
    </section>
  );
}

function CampaignShapeSection() {
  const steps = [
    { n: '01', title: 'Pick the scholar profile', body: 'Filter on verified GPA >= 3.7 + Tier B transcript. That is your talent pool.' },
    { n: '02', title: 'Testimonial series or single post', body: 'Weekly series converts better for tutoring; single post works for app installs.' },
    { n: '03', title: 'We pre-screen the claim', body: 'If the athlete says "I went from 1320 to 1480," the score claim passes our truthfulness check first.' },
    { n: '04', title: 'Disclosure + #ad', body: 'State-specific disclosure (IL: 14 days, NY: 7 days to association + school) filed automatically. Every post carries #ad.' },
    { n: '05', title: 'Pay on approval', body: 'Escrow releases per milestone. Parent-custodial account.' },
  ];
  return (
    <section aria-label="What a campaign looks like" className="bg-[var(--marketing-gray-950)] py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-10">
          What a testimonial series{' '}
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
            A senior soccer player, IL, 500-2k followers, 4.0 GPA verified + transcript
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            <Stat label="Annual range (low)" value={formatValuationCents(lowCents)} hint="Single testimonial" />
            <Stat label="Annual expected" value={formatValuationCents(midCents)} hint="Multi-brand testimonial mix" accent />
            <Stat label="Annual range (high)" value={formatValuationCents(highCents)} hint="Four-week series across two brands" />
          </div>
          <p className="mt-6 text-sm text-white/60 max-w-3xl">
            A single testimonial series for this athlete lands around{' '}
            <span className="text-white font-semibold">$100 – $300 total</span>.
            Tutoring is a lower-dollar but higher-credibility vertical — ROI
            shows up in enrollment, not post-reach. Open the{' '}
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
            Tutoring is the highest-credibility vertical — which means the
            compliance bar is higher too.
          </p>
          <ul className="space-y-3">
            <ComplianceItem>
              <strong>No unverified score claims.</strong> If the athlete
              says &ldquo;I used this app and got a 1600 SAT,&rdquo; we
              need the actual score report before the post goes live. Same
              for GPA claims, ACT improvements, and AP scores. Fake-
              testimonial FTC liability lands on the brand, not the
              platform.
            </ComplianceItem>
            <ComplianceItem>
              <strong>Academic-integrity language.</strong> No &ldquo;I got
              someone to write this for me&rdquo; humor or implied AI-essay
              use. Education brands cannot be associated with that.
            </ComplianceItem>
            <ComplianceItem>
              <strong>FTC #ad disclosure on every post.</strong> Standard
              across all verticals, but especially scrutinized for
              education brands. We auto-inject the tag; the athlete cannot
              remove it.
            </ComplianceItem>
            <ComplianceItem>
              <strong>No school IP.</strong> The athlete can say &ldquo;I
              am a 4.0 student&rdquo; but cannot name the school, show the
              yearbook, or appear in school uniform.
            </ComplianceItem>
          </ul>
          <p className="text-sm text-white/60 mt-6">
            Our Tier B verification includes the actual transcript, so
            &ldquo;verified 3.9&rdquo; means something. Compare across
            verticals at{' '}
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
