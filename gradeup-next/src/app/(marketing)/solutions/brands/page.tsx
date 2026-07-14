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
    title: 'NIL for Brands — Partner with verified scholar-athletes | GradeUp, part of StatStaq',
    description:
      'Partner with GPA-verified HS scholar-athletes. GradeUp verifies the grades; StatStaq’s team produces the content, values the brand fit, sources the deal, and negotiates the contract. Compliance, consent, and disclosures are built in.',
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
    question: 'How is this different from the big college NIL platforms?',
    answer:
      'They’re built for college athletic departments. We’re built for high school, parent-first. Our deal flow assumes minors, our compliance engine is state-by-state, and sign-up is self-serve — no enterprise sales call required. GradeUp verifies every athlete’s GPA; StatStaq’s team sources the match and negotiates the deal on the athlete’s side.',
  },
  {
    question: 'Is my state even eligible?',
    answer:
      'We’re live in California, Florida, Georgia, Illinois, New Jersey, New York, and Texas. More states roll out as their athletic associations finalize NIL rules. If your target athletes are in a pilot state, you’re ready to go.',
  },
  {
    question: 'How do I know what a deal is worth?',
    answer:
      'Use the Brand FMV calculator at /solutions/brands/fmv. Enter sport, state, and the deliverable; you get a fair-market-value range in seconds. Pricing all HS deals at FMV is also how we keep you on the right side of every state’s rule set.',
  },
  {
    question: 'Who handles consent and disclosures?',
    answer:
      'GradeUp does. Every deal requires a dual-signed consent from athlete + parent before it activates. State disclosures (72-hour, 7-day, 14-day — it varies) file automatically from a template we maintain. You post the offer; GradeUp handles the paperwork and StatStaq’s team runs the deal on the athlete’s side.',
  },
  {
    question: 'When do I pay?',
    answer:
      'Brand funds escrow at deal signing; deliverable is reviewed within 48 hours of submission; payout releases to the athlete’s custodial parent account on approval. GradeUp’s platform fee is added to the brand side, never subtracted from the athlete’s payout. See /pricing.',
  },
  {
    question: 'Can I run campaigns across multiple athletes?',
    answer:
      'Yes. Post a campaign; StatStaq’s team matches it to verified athletes that fit your budget and your brand, and you accept the ones you want. Our multi-athlete surface tracks every share and deliverable across the whole cohort.',
  },
];

export default function BrandsSolutionPage() {
  return (
    <>
      <SolutionSchema
        scriptId="solutions-brands-jsonld"
        pageUrl={PAGE_URL}
        name="GradeUp NIL for Brands"
        description="GradeUp verifies HS scholar-athletes’ GPA and runs state-by-state compliance; StatStaq’s team sources and negotiates the deal for local brands reaching them. FMV-priced offers, parent-signed consent."
        audience="Local and regional brands marketing to HS scholar-athletes"
      />

      <SolutionHero
        eyebrow="For brands"
        title="Reach HS scholar-athletes in your state —"
        titleAccent="compliance handled."
        subtitle="Partner with GPA-verified HS scholar-athletes in your state. GradeUp verifies grades and runs compliance; StatStaq’s team produces the content, values the brand fit, sources the match, and negotiates the deal. You post the offer — their team runs the rest."
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
        image={{
          src: '/editorial/photo-03.jpg',
          alt: 'A local brand owner preparing a partnership offer for a scholar-athlete',
        }}
      />

      <ProblemProductProof
        eyebrow="The brand’s problem"
        heading="You want a local athlete. Your options today are awful."
        subheading="The big platforms are enterprise SaaS. The alternative is DM’ing a 16-year-old from your brand account. Neither of those works."
        steps={[
          {
            kind: 'problem',
            heading: 'The status quo',
            body: 'You can hire an agency, pay for a college-NIL platform your budget can’t support, or cold-message athletes on Instagram. Every path is slow, expensive, or legally exposed.',
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
            body: 'A brand dashboard where you browse GPA-verified athletes and price the deal with FMV. GradeUp verifies the GPA and runs compliance; StatStaq’s team sources the match and negotiates the contract on the athlete’s side. You fund escrow and review the deliverable — everything happens on rails.',
            bullets: [
              'Filter by state, sport, grade, verified GPA',
              'FMV calculator on every offer',
              'Dual-signed consent required before activation',
              'Deliverable review in 48 hours',
            ],
          },
          {
            kind: 'proof',
            heading: 'The proof is published, not promised',
            body: 'StatStaq’s team is already sourcing and negotiating deals across five brand verticals — local restaurants, training facilities, tutoring services, boutique retail, and fitness studios. Every closed deal becomes a case study, tied to a verified GPA and a real brand.',
            bullets: [
              'Case studies published as deals close, not projected',
              'Every case study ties to a verified GPA and a real brand',
              'No stock numbers — what closed is what you see',
            ],
          },
        ]}
      />

      <section aria-label="Brand verticals" className="bg-[var(--cream-section)] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <span className="eyebrow inline-block px-3 py-1 rounded-full border border-[var(--hairline)] bg-[var(--cream-surface)]">
              Pick your vertical
            </span>
            <h2 className="font-display mt-4 text-3xl sm:text-4xl font-bold text-[var(--ink)]">
              Playbooks for the five brand types StatStaq’s team runs deals in.
            </h2>
            <p className="mt-3 text-[var(--ink-muted)] text-lg">
              Each page includes real deal examples, typical FMV ranges, and
              deliverable templates tuned to that vertical.
            </p>
            <div className="stat-strip mt-6 inline-flex">
              <b>Produce</b>&nbsp;·&nbsp;<b>Value</b>&nbsp;·&nbsp;<b>Source</b>&nbsp;·&nbsp;<b>Negotiate</b>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <PersonaCard
              eyebrow="Local restaurants"
              title="Restaurant & QSR"
              description="Meal deals, team meals, post-game visits. Low-ticket, high-frequency, high community signal."
              href="/solutions/brands/local-restaurant"
              icon={<Utensils className="h-6 w-6" />}
              ctaLabel="Restaurant playbook"
            />
            <PersonaCard
              eyebrow="Training facilities"
              title="Training & performance"
              description="Gyms, strength coaches, sport-specific facilities. Long-term sponsorships that double as program endorsements."
              href="/solutions/brands/training-facility"
              icon={<Dumbbell className="h-6 w-6" />}
              ctaLabel="Training playbook"
            />
            <PersonaCard
              eyebrow="Tutoring services"
              title="Tutoring & academic"
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
              eyebrow="Fitness & wellness"
              title="Fitness & wellness"
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
              See how we compare
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
        heading="Partner with a verified scholar-athlete. StatStaq runs the deal."
        subheading="FMV-priced, compliance handled. Pay only when the deal closes."
        primaryLabel="Partner as a brand"
        primaryHref="/signup?role=brand"
        secondaryLabel="See brand pricing"
        secondaryHref="/pricing"
        trustNote="Free to sign up · No enterprise sales · FMV-priced every deal"
      />
    </>
  );
}
