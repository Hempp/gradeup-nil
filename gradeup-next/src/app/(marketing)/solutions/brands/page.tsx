/**
 * /solutions/brands — Brands overview / gateway.
 *
 * This page is NOT a vertical-specific landing. Vertical landings
 * (local-restaurant, training-facility, tutoring, local-retail, fitness)
 * live under /solutions/brands/{vertical}/ and are owned by a separate
 * agent. This gateway links DOWN into those + the FMV calculator + pricing.
 *
 * Voice: direct, performance-framed, low on jargon. A local restaurant
 * owner who&rsquo;s never heard of NIL should feel oriented in 30 seconds.
 *
 * Server Component. ISR 5-min.
 */
import {
  Utensils,
  Dumbbell,
  BookOpen,
  ShoppingBag,
  Heart,
  Calculator,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import {
  SolutionHero,
  ProblemProductProof,
  PersonaCard,
  CaseStudyTagStrip,
  SolutionFaq,
  SolutionSchema,
  SolutionCtaBand,
} from '@/components/marketing';
import { buildMarketingMetadata } from '@/lib/seo';

export const revalidate = 300;

const PAGE_URL = '/solutions/brands';

export const metadata = {
  ...buildMarketingMetadata({
    title: 'NIL for Brands — Reach HS scholar-athletes, compliance handled | GradeUp',
    description:
      'Self-serve NIL for local brands. Filter scholar-athletes by state, sport, and verified GPA. Compliance, consent, and disclosures are built in. Deals close in days, not months.',
    path: PAGE_URL,
  }),
  robots: { index: true, follow: true },
  keywords: [
    'NIL for brands',
    'local brand NIL',
    'high school NIL brand',
    'small business NIL marketing',
    'state NIL compliance',
    'athlete brand partnership',
    'HS athlete FMV',
  ],
};

const FAQ_ITEMS = [
  {
    question: 'How is this different from Opendorse or the big NIL platforms?',
    answer:
      'They&rsquo;re built for college athletic departments. We&rsquo;re built for high school, parent-first. Our deal flow assumes minors, our compliance engine is state-by-state, and our pricing is self-serve — no enterprise sales call required.',
  },
  {
    question: 'Is my state even eligible?',
    answer:
      'We&rsquo;re live in California, Florida, Georgia, Illinois, New Jersey, New York, and Texas. More states roll out as their athletic associations finalize NIL rules. If your target athletes are in a pilot state, you&rsquo;re ready to go.',
  },
  {
    question: 'How do I know what a deal is worth?',
    answer:
      'Use the Brand FMV calculator at /solutions/brands/fmv. Enter sport, state, and the deliverable; you get a fair-market-value range in seconds. Pricing all HS deals at FMV is also how we keep you on the right side of every state&rsquo;s rule set.',
  },
  {
    question: 'Who handles consent and disclosures?',
    answer:
      'We do. Every deal requires a dual-signed consent from athlete + parent before it activates. State disclosures (72-hour, 7-day, 14-day — it varies) file automatically from a template we maintain. You ship the offer; we handle the paperwork.',
  },
  {
    question: 'When do I pay?',
    answer:
      'Brand funds escrow at deal signing; deliverable is reviewed within 48 hours of submission; payout releases to the athlete&rsquo;s custodial parent account on approval. GradeUp&rsquo;s platform fee is added to the brand side, never subtracted from the athlete&rsquo;s payout. See /pricing.',
  },
  {
    question: 'Can I run campaigns across multiple athletes?',
    answer:
      'Yes. Post a campaign, get matched applications, accept the athletes that fit your budget and fit your brand. Our multi-athlete surface (the NIL Club sub-affiliate counter) tracks every share and deliverable across the whole cohort.',
  },
];

export default function BrandsSolutionPage() {
  return (
    <>
      <SolutionSchema
        scriptId="solutions-brands-jsonld"
        pageUrl={PAGE_URL}
        name="GradeUp NIL for Brands"
        description="Self-serve NIL platform for local brands reaching HS scholar-athletes. State-by-state compliance, parent-signed consent, FMV-priced offers."
        audience="Local and regional brands marketing to HS scholar-athletes"
      />

      <SolutionHero
        eyebrow="For brands"
        title="Reach HS scholar-athletes in your state —"
        titleAccent="compliance handled."
        subtitle="Self-serve NIL for local brands. Filter athletes by state, sport, and verified GPA. Consent, disclosures, and payouts are all automated. You ship the offer; we run the rail."
        primaryCta={{
          label: 'Partner as a brand',
          href: '/signup?role=brand',
          ariaLabel: 'Create a free brand account',
        }}
        secondaryCta={{
          label: 'Price a deal with FMV',
          href: '/solutions/brands/fmv',
        }}
        supportingNote="Free to sign up. Pay only when a deal closes. No enterprise sales call."
      />

      <ProblemProductProof
        eyebrow="The brand&rsquo;s problem"
        heading="You want a local athlete. Your options today are awful."
        subheading="The big platforms are enterprise SaaS. The alternative is DM&rsquo;ing a 16-year-old from your brand account. Neither of those works."
        steps={[
          {
            kind: 'problem',
            heading: 'The status quo',
            body: 'You can hire an agency, pay for a college-NIL platform your budget can&rsquo;t support, or cold-message athletes on Instagram. Every path is slow, expensive, or legally exposed.',
            bullets: [
              'No self-serve HS option',
              'Unclear state-by-state rules',
              'No built-in parent consent',
              'No way to verify the athlete is who they say they are',
            ],
          },
          {
            kind: 'product',
            heading: 'What we built',
            body: 'A brand dashboard where you filter athletes, price the deal with FMV, sign the contract, fund escrow, and review the deliverable — all in one place. State rules are encoded. Parent consent is mandatory. Everything happens on rails.',
            bullets: [
              'Filter by state, sport, grade, verified GPA',
              'FMV calculator on every offer',
              'Dual-signed consent required before activation',
              'Deliverable review in 48 hours',
            ],
          },
          {
            kind: 'proof',
            heading: 'Brands closing, fast',
            body: 'The first brand cohort included local restaurants, training facilities, tutoring services, boutique retail, and fitness studios. All five verticals closed deals in the pilot period. Every deal is traceable to a published case study.',
            bullets: [
              '5 brand verticals closed deals in pilot',
              'Average time from signup to first deal: under 2 weeks',
              'Published case studies with verified brand ROI',
            ],
          },
        ]}
      />

      <section aria-label="Brand verticals" className="bg-black py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest border border-white/10 bg-white/5 text-[var(--accent-primary)]">
              Pick your vertical
            </span>
            <h2 className="font-display mt-4 text-3xl sm:text-4xl font-bold text-white">
              Playbooks for the five brand types we&rsquo;ve run deals in.
            </h2>
            <p className="mt-3 text-white/70 text-lg">
              Each page includes real deal examples, typical FMV ranges, and
              deliverable templates tuned to that vertical.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <PersonaCard
              eyebrow="Local restaurants"
              title="Restaurant &amp; QSR"
              description="Meal deals, team meals, post-game visits. Low-ticket, high-frequency, high community signal."
              href="/solutions/brands/local-restaurant"
              icon={<Utensils className="h-6 w-6" />}
              ctaLabel="Restaurant playbook"
            />
            <PersonaCard
              eyebrow="Training facilities"
              title="Training &amp; performance"
              description="Gyms, strength coaches, sport-specific facilities. Long-term sponsorships that double as program endorsements."
              href="/solutions/brands/training-facility"
              icon={<Dumbbell className="h-6 w-6" />}
              ctaLabel="Training playbook"
            />
            <PersonaCard
              eyebrow="Tutoring services"
              title="Tutoring &amp; academic"
              description="The purest GradeUp match — a tutor paying a 3.9 scholar-athlete to say studying works. Exceptional community signal."
              href="/solutions/brands/tutoring"
              icon={<BookOpen className="h-6 w-6" />}
              ctaLabel="Tutoring playbook"
            />
            <PersonaCard
              eyebrow="Local retail"
              title="Boutique retail"
              description="Local fashion, sneaker shops, specialty retail. Instagram-native, product-drop-friendly, parent-approved."
              href="/solutions/brands/local-retail"
              icon={<ShoppingBag className="h-6 w-6" />}
              ctaLabel="Retail playbook"
            />
            <PersonaCard
              eyebrow="Fitness &amp; wellness"
              title="Fitness &amp; wellness"
              description="Yoga, recovery, nutrition, wellness brands. Athlete-endorsement fits naturally with the brand promise."
              href="/solutions/brands/fitness"
              icon={<Heart className="h-6 w-6" />}
              ctaLabel="Fitness playbook"
            />
            <PersonaCard
              eyebrow="Fair market value"
              title="Price the deal, live"
              description="FMV calculator: enter sport, state, and deliverable. Get a price range built on our pilot-era deal data."
              href="/solutions/brands/fmv"
              icon={<Calculator className="h-6 w-6" />}
              ctaLabel="Open FMV calculator"
            />
          </div>

          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Link
              href="/pricing"
              className="btn-marketing-primary inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-md font-semibold shadow-lg"
            >
              See brand pricing
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/compare"
              className="btn-marketing-outline inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-md font-semibold"
            >
              Compare to Opendorse
            </Link>
          </div>
        </div>
      </section>

      <CaseStudyTagStrip
        tags={['food_beverage', 'multi_athlete', 'viral_share']}
        heading="Brand ROI, already in the wild."
        subheading="Case studies by brand type. Every number tied to a verified deal."
      />

      <SolutionFaq
        scriptId="solutions-brands-faq-jsonld"
        pageUrl={PAGE_URL}
        heading="Brand questions, answered straight"
        items={FAQ_ITEMS}
      />

      <SolutionCtaBand
        heading="Run your first HS NIL deal in under 2 weeks."
        subheading="Self-serve, FMV-priced, compliance handled. Pay only when the deal closes."
        primaryLabel="Partner as a brand"
        primaryHref="/signup?role=brand"
        secondaryLabel="See brand pricing"
        secondaryHref="/pricing"
        trustNote="Free to sign up · No enterprise sales · FMV-priced every deal"
      />
    </>
  );
}
