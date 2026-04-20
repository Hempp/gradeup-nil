/**
 * /solutions/parents — For Parents landing.
 *
 * Voice: warm, reassuring, second-person ("your athlete"). Parents are the
 * primary audience; avoid business-jargon. Every line should lower the
 * perceived risk of signing their kid up.
 *
 * Server Component. ISR 5-min.
 */
import type { Metadata } from 'next';
import {
  Heart,
  ShieldCheck,
  Wallet,
  Eye,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';
import {
  SolutionHero,
  ProblemProductProof,
  CaseStudyTagStrip,
  SolutionFaq,
  SolutionSchema,
  SolutionCtaBand,
} from '@/components/marketing';

export const revalidate = 300;

const PAGE_URL = '/solutions/parents';

export const metadata: Metadata = {
  title: 'NIL for Parents — A first deal without the risk | GradeUp',
  description:
    'The safest way for your scholar-athlete to sign their first NIL deal. Dual-signed consent, custodial payouts, state-by-state compliance, and a parent dashboard for the person who writes the permission slip.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: 'GradeUp for Parents — Your scholar-athlete&rsquo;s first NIL deal, without the risk',
    description:
      'Dual signature. Custodial payouts. State-compliant. Built for the parent who wants their kid to earn, safely.',
    type: 'website',
    url: PAGE_URL,
  },
  robots: { index: true, follow: true },
  keywords: [
    'high school NIL for parents',
    'parental consent NIL',
    'scholar-athlete first NIL deal',
    'NIL custodial payout',
    'parent dashboard NIL',
    'safe NIL platform for minors',
  ],
};

const FAQ_ITEMS = [
  {
    question: 'Does my athlete need to be 18 to sign a deal?',
    answer:
      'No. In most pilot states, athletes under 18 can sign with a parent or legal guardian&rsquo;s written consent, which we collect and store as part of every deal. Texas requires the athlete be at least 17 and holds the payment in trust until they turn 18 — GradeUp handles that automatically.',
  },
  {
    question: 'Where does the money actually go?',
    answer:
      'Into a custodial Stripe Connect account that you, the parent, own and control. Payouts route to your account and you decide how to route them from there — save, invest, gift, or transfer. GradeUp never holds your athlete&rsquo;s earnings beyond the short window between deal completion and payout release.',
  },
  {
    question: 'Is this NCAA-safe for college recruiting later?',
    answer:
      'Yes. GradeUp is built to preserve future NCAA eligibility. We follow each state&rsquo;s high-school athletic association rules (which are what governs your athlete today), and we never allow school IP, pay-for-play, or banned categories like gambling, alcohol, or cannabis.',
  },
  {
    question: 'What if I don&rsquo;t want my athlete doing a particular deal?',
    answer:
      'You approve every deal before it activates. No deal exists on your athlete&rsquo;s profile until you, as the parent, sign. If you decline, the deal never happens. You can also pause or withdraw consent at any time.',
  },
  {
    question: 'What data do you collect on my child?',
    answer:
      'The minimum to run a compliant deal: name, school, sport, sport season, and self-reported GPA (optionally verified via Tier B transcript review). We do not sell data, do not ship third-party ad trackers to your athlete&rsquo;s dashboard, and follow COPPA/FERPA-aligned practices. Full privacy policy at /privacy.',
  },
  {
    question: 'How much does this cost us?',
    answer:
      'Signing up as a parent is free. Athletes are free too. GradeUp takes a small platform fee only when a deal closes — it comes out of the brand&rsquo;s budget, not out of your athlete&rsquo;s earnings.',
  },
];

export default function ParentsSolutionPage() {
  return (
    <>
      <SolutionSchema
        scriptId="solutions-parents-jsonld"
        pageUrl={PAGE_URL}
        name="GradeUp NIL for Parents"
        description="The safest way for a high-school scholar-athlete to sign their first NIL deal. Parent-signed consent, custodial payouts, state-by-state compliance."
        audience="Parents and legal guardians of high-school athletes"
      />

      <SolutionHero
        eyebrow="For parents"
        title="Your scholar-athlete&rsquo;s first NIL deal,"
        titleAccent="without the risk."
        subtitle="You&rsquo;re the one actually signing the permission slip. GradeUp is the only NIL platform built for that reality — dual-signed consent on every deal, custodial payouts into an account you control, and state-by-state compliance handled in the background."
        primaryCta={{
          label: 'Sign up as a parent',
          href: '/signup?role=parent',
          ariaLabel: 'Create a free parent account',
        }}
        secondaryCta={{
          label: 'Request a concierge invite',
          href: '/hs#waitlist',
        }}
        supportingNote="Free to start. No credit card. No commitment."
      />

      <ProblemProductProof
        eyebrow="The parent&rsquo;s problem"
        heading="NIL is loud. Most of it isn&rsquo;t built for you."
        subheading="College NIL platforms are built for 20-year-olds with an agent. Your athlete is 15. You&rsquo;re the one reading the fine print at midnight. Here&rsquo;s what changes."
        steps={[
          {
            kind: 'problem',
            heading: 'The old NIL story',
            body: 'Most platforms assume the athlete is the decision-maker. For high school, that&rsquo;s you. Consent is buried, money flow is opaque, and nobody explains what a &ldquo;disclosure window&rdquo; is.',
            bullets: [
              'Confusing terms written for college athletes',
              'No visibility into which brands your child is talking to',
              'State rules that change every six months',
              'Payouts that skip the parent entirely',
            ],
          },
          {
            kind: 'product',
            heading: 'What GradeUp does differently',
            body: 'A parent dashboard that mirrors the athlete&rsquo;s view. Dual signature required on every deal. Custodial Stripe Connect account in your name. Plain-English disclosures on everything.',
            bullets: [
              'Dual-signed consent — no deal goes live without your signature',
              'Custodial payout into a Stripe account you own',
              'State-compliant disclosures filed for you automatically',
              'Every deal visible in your parent dashboard in real-time',
            ],
          },
          {
            kind: 'proof',
            heading: 'Parents already using it',
            body: 'We ran the first 20 California parents through a concierge-run pilot before shipping the product. Every deal closed. Zero compliance issues. Every parent kept their dashboard.',
            bullets: [
              '20+ California families in the concierge pilot',
              '7 pilot states live today',
              'Zero deals filed late — disclosure automation caught them all',
            ],
          },
        ]}
      />

      <section aria-label="What parents get" className="bg-black py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest border border-white/10 bg-white/5 text-[var(--accent-primary)]">
              What you get
            </span>
            <h2 className="font-display mt-4 text-3xl sm:text-4xl font-bold text-white">
              A parent dashboard, not a marketing pitch.
            </h2>
            <p className="mt-3 text-white/70 text-lg">
              Everything below is already in the product. Not a roadmap, not a
              future state — the working platform, today.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={<Heart className="h-6 w-6" />}
              title="Dual-signed consent"
              body="Every deal requires both the athlete and a parent signature before it can go live. No gray area, no &ldquo;implied&rdquo; consent, no surprise contracts."
            />
            <FeatureCard
              icon={<Wallet className="h-6 w-6" />}
              title="Custodial payouts"
              body="Money flows into a Stripe Connect account in your name. You decide what happens next — save, invest, or gift to your athlete."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-6 w-6" />}
              title="State-compliant, automatically"
              body="The platform already knows your state&rsquo;s rules. Disclosure filing, banned categories, minimum-age checks — all handled without you lifting a finger."
            />
            <FeatureCard
              icon={<Eye className="h-6 w-6" />}
              title="Full visibility"
              body="Your parent dashboard mirrors your athlete&rsquo;s. Every brand conversation, every deal, every payout — visible in real-time."
            />
            <FeatureCard
              icon={<FileCheck className="h-6 w-6" />}
              title="Audit trail on demand"
              body="Every signature, every disclosure, every payout — logged forever. You can export a clean PDF for tax season or a lawyer in two clicks."
            />
            <FeatureCard
              icon={<CheckCircle2 className="h-6 w-6" />}
              title="NCAA-eligibility safe"
              body="Built to preserve future NCAA eligibility. No school IP. No pay-for-play. No banned categories. Future college coaches will thank you."
            />
          </div>
        </div>
      </section>

      <TestimonialQuote
        quote="I signed the permission slip at 10pm on a Tuesday, saw the deal in my dashboard by Wednesday, and watched the first payout hit my Stripe on Saturday. That&rsquo;s the shortest distance between &lsquo;this is scary&rsquo; and &lsquo;this is real&rsquo; I&rsquo;ve ever seen."
        attribution="Parent, Los Angeles, CA · Concierge pilot"
      />

      <CaseStudyTagStrip
        tags={['parent_quote', 'tier_b_verified']}
        heading="Real parents. Real deals. Real payouts."
        subheading="Published case studies tagged with a parent voice or a parent-verified transcript."
      />

      <SolutionFaq
        scriptId="solutions-parents-faq-jsonld"
        pageUrl={PAGE_URL}
        heading="Questions parents actually ask"
        subheading="Six things every parent wants answered before they sign."
        items={FAQ_ITEMS}
      />

      <SolutionCtaBand
        heading="Ready to sign with confidence?"
        subheading="Create a free parent account. We&rsquo;ll walk you through the first deal."
        primaryLabel="Sign up as a parent"
        primaryHref="/signup?role=parent"
        secondaryLabel="Browse case studies"
        secondaryHref="/business/case-studies?tag=parent_quote"
        trustNote="Free · No credit card · COPPA/FERPA-aligned"
      />
    </>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="card-marketing p-6">
      <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-white/70 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function TestimonialQuote({
  quote,
  attribution,
}: {
  quote: string;
  attribution: string;
}) {
  return (
    <section aria-label="Parent quote" className="bg-[var(--marketing-gray-950)] py-20 border-y border-white/10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <blockquote className="font-display text-2xl sm:text-3xl font-semibold text-white leading-snug">
          &ldquo;{quote}&rdquo;
        </blockquote>
        <p className="mt-5 text-sm uppercase tracking-widest text-[var(--accent-primary)]">
          {attribution}
        </p>
      </div>
    </section>
  );
}
