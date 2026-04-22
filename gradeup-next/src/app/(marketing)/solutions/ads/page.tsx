/**
 * /solutions/ads — For high-school athletic directors.
 *
 * Audience: an individual school's compliance contact — the HS AD wearing
 * a dozen hats who just got asked by the superintendent to &ldquo;figure out NIL
 * by September.&rdquo; Operational voice. Pragmatic. Not state-AD (oversight);
 * this is the on-the-ground school rep.
 *
 * Server Component. ISR 5-min.
 */
import {
  GraduationCap,
  ShieldCheck,
  FileCheck,
  Bell,
  Users,
  ClipboardCheck,
} from 'lucide-react';
import {
  SolutionHero,
  ProblemProductProof,
  CaseStudyTagStrip,
  SolutionFaq,
  SolutionSchema,
  SolutionCtaBand,
} from '@/components/marketing';
import { buildMarketingMetadata } from '@/lib/seo';

export const revalidate = 300;

const PAGE_URL = '/solutions/ads';

export const metadata = {
  ...buildMarketingMetadata({
    title: 'NIL for High-School Athletic Directors | GradeUp',
    description:
      'The compliance layer your school doesn&rsquo;t have bandwidth to build. Parent-signed consent, state disclosures, and a full audit trail — without a single new hire.',
    path: PAGE_URL,
  }),
  robots: { index: true, follow: true },
  keywords: [
    'high school athletic director NIL',
    'HS AD NIL compliance',
    'school NIL policy',
    'NIL compliance for schools',
    'athletic director NIL tools',
    'HS NIL school partnership',
  ],
};

const FAQ_ITEMS = [
  {
    question: 'Does our school have to formally opt in?',
    answer:
      'No. Your athletes can sign up as individuals with parental consent; their deals flow through GradeUp with disclosures filed to your state association. A formal school partnership is optional but gets you an AD-level read-only view of your own athletes&rsquo; deals.',
  },
  {
    question: 'What does a school partnership actually cost us?',
    answer:
      'Nothing. School partnerships are free. GradeUp&rsquo;s revenue comes from the brand side of closed deals — never from schools, athletes, or families.',
  },
  {
    question: 'How much extra work is this for the AD?',
    answer:
      'Minimal. Disclosures file automatically. Consent is collected from parents directly. As the AD, you get a read-only view of your athletes&rsquo; deals plus optional alerts when a new disclosure is filed against your school. You can look away and still be compliant.',
  },
  {
    question: 'Will this put our program at risk with the state association?',
    answer:
      'The opposite. We follow your state association&rsquo;s disclosure rules automatically, and the state-AD portal (used by your association) sees the same feed. Running HS NIL through GradeUp puts your program on the cleanest possible side of any future audit.',
  },
  {
    question: 'What about NCAA recruiting exposure for our athletes?',
    answer:
      'Every deal passes a rules-engine check against the universal NCAA guardrails — no school IP, no pay-for-play, no banned categories. Your athletes&rsquo; future eligibility is preserved by default.',
  },
  {
    question: 'Can I see the deals my athletes are signing?',
    answer:
      'Yes, with a school partnership. Read-only dashboard showing every deal originating from your school, with the same audit trail the state association sees. No surprises.',
  },
];

export default function AdsSolutionPage() {
  return (
    <>
      <SolutionSchema
        scriptId="solutions-ads-jsonld"
        pageUrl={PAGE_URL}
        name="GradeUp NIL for High-School Athletic Directors"
        description="HS NIL compliance the school doesn&rsquo;t have bandwidth to build in-house. Parent consent, state disclosures, audit trail — all automated."
        audience="High-school athletic directors and compliance contacts"
      />

      <SolutionHero
        eyebrow="For athletic directors"
        title="GradeUp handles the compliance layer"
        titleAccent="your school doesn&rsquo;t have bandwidth to build."
        subtitle="Parent-signed consent on every deal. State disclosures filed automatically. A full audit trail you can pull up in two clicks when your superintendent asks. Built for the AD wearing twelve other hats."
        primaryCta={{
          label: 'Partner your school',
          href: '/signup?role=school_admin',
          ariaLabel: 'Start a school partnership with GradeUp',
        }}
        secondaryCta={{
          label: 'Talk to us',
          href: 'mailto:schools@gradeupnil.com?subject=School%20partnership%20inquiry&body=School%20name%3A%20%0AState%3A%20%0AAD%20name%3A%20%0AEmail%3A%20%0APhone%3A%20',
        }}
        supportingNote="Free for schools. Zero new headcount. 7 pilot states live."
      />

      <ProblemProductProof
        eyebrow="The AD&rsquo;s problem"
        heading="HS NIL compliance is non-trivial. You&rsquo;re already overloaded."
        subheading="Your state just passed a rule set. Your superintendent is asking for a policy. You have a day job running an athletic department."
        steps={[
          {
            kind: 'problem',
            heading: 'What&rsquo;s being asked of you',
            body: 'Figure out NIL compliance, without the legal staff a college program has, without the budget for enterprise SaaS, and without letting your top athletes lose eligibility or slip through the rules.',
            bullets: [
              'State-specific disclosure windows to track',
              'Parent consent to collect and retain',
              'School IP protection and banned categories',
              'Audit-trail requests with zero notice',
            ],
          },
          {
            kind: 'product',
            heading: 'What GradeUp gives you',
            body: 'A compliance rail that runs without you. Parent consent, state-by-state disclosure filings, universal NCAA guardrails, and a read-only dashboard of every deal that touches your school.',
            bullets: [
              'Parent-signed consent on every deal, archived forever',
              'State disclosures filed automatically within your association&rsquo;s window',
              'Rule-engine check on every deal (school IP, pay-for-play, banned categories)',
              'Optional AD read-only dashboard across your school&rsquo;s deals',
            ],
          },
          {
            kind: 'proof',
            heading: 'Already running',
            body: 'The compliance pipeline is in production in 7 pilot states. Every deal runs the same rules engine, files the same state disclosures, and leaves the same audit trail. Your school plugs in; nothing about your day changes.',
            bullets: [
              'Phase 12 compliance rail — already shipped',
              '7 pilot states covered (CA, FL, GA, IL, NJ, NY, TX)',
              'Zero late filings in pilot — automation catches everything',
            ],
          },
        ]}
      />

      <section aria-label="What the AD gets" className="bg-black py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest border border-white/10 bg-white/5 text-[var(--accent-primary)]">
              What you get
            </span>
            <h2 className="font-display mt-4 text-3xl sm:text-4xl font-bold text-white">
              A compliance partner. Not another app to run.
            </h2>
            <p className="mt-3 text-white/70 text-lg">
              The goal is fewer things on your plate. Every feature below
              subtracts work from your day.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={<ShieldCheck className="h-6 w-6" />}
              title="State disclosures automated"
              body="Whatever your association&rsquo;s window is — 72 hours, 7 days, 14 days — we file inside it. Every time."
            />
            <FeatureCard
              icon={<FileCheck className="h-6 w-6" />}
              title="Parent consent archived"
              body="Dual-signed consent on every deal, stored with timestamps and signature records. Audit-ready forever."
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Athlete-level visibility"
              body="With a school partnership, a read-only dashboard of every deal your athletes sign — without giving the AD a workload."
            />
            <FeatureCard
              icon={<Bell className="h-6 w-6" />}
              title="Optional filing alerts"
              body="Opt in to email notifications when a new disclosure is filed against your school. Opt out for total silence."
            />
            <FeatureCard
              icon={<ClipboardCheck className="h-6 w-6" />}
              title="One-click audit export"
              body="Superintendent asks for a report? Filter by date range, click export, send the CSV. Done in 60 seconds."
            />
            <FeatureCard
              icon={<GraduationCap className="h-6 w-6" />}
              title="NCAA eligibility protection"
              body="Every deal runs through the universal rules engine — school IP, pay-for-play, banned categories. Your athletes&rsquo; future is preserved."
            />
          </div>
        </div>
      </section>

      <CaseStudyTagStrip
        tags={['tier_b_verified', 'multi_athlete']}
        heading="Deals at real schools, already compliant."
        subheading="Case studies from partnered schools with verified GPA and multi-athlete campaigns."
      />

      <SolutionFaq
        scriptId="solutions-ads-faq-jsonld"
        pageUrl={PAGE_URL}
        heading="Common AD questions"
        items={FAQ_ITEMS}
      />

      <SolutionCtaBand
        heading="Offload the paperwork. Keep the oversight."
        subheading="A school partnership is free and takes less than an afternoon to set up."
        primaryLabel="Partner your school"
        primaryHref="/signup?role=school_admin"
        secondaryLabel="Email schools team"
        secondaryHref="mailto:schools@gradeupnil.com?subject=School%20partnership%20inquiry"
        trustNote="Free · No headcount · Audit-ready from day one"
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
