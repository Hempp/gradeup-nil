/**
 * /solutions/state-ads — For State Athletic Associations.
 *
 * Audience: state-athletic-association compliance officers. Institutional
 * voice. No marketing gloss. Tell them what they get, how it works, and
 * exactly how to request access.
 *
 * CTA is intentionally low-friction (mailto form) — state associations come
 * in through an invitation workflow at /hs/state-ad-invite. This page is the
 * top-of-funnel for that invite request.
 *
 * Server Component. ISR 5-min.
 */
import {
  ShieldCheck,
  Eye,
  FileCheck,
  List,
  Mail,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import {
  SolutionHero,
  ProblemProductProof,
  SolutionFaq,
  SolutionSchema,
  SolutionCtaBand,
} from '@/components/marketing';
import { buildMarketingMetadata } from '@/lib/seo';

export const revalidate = 300;

const PAGE_URL = '/solutions/state-ads';

export const metadata = {
  ...buildMarketingMetadata({
    title: 'GradeUp transcripts for State Athletic Associations',
    description:
      'State athletic associations can request a GradeUp transcript for any member school — a per-school report of NIL activity, disclosures, and compliance status. Free for governing bodies.',
    path: PAGE_URL,
  }),
  robots: { index: true, follow: true },
  keywords: [
    'state athletic association NIL',
    'HS NIL compliance reports',
    'per-school NIL transcript',
    'interscholastic NIL reporting',
    'state athletic association NIL reports',
    'NIL disclosure window tracking',
  ],
};

const FAQ_ITEMS = [
  {
    question: 'Is there any cost to the association?',
    answer:
      'No. School-transcript reports are free for state athletic associations. This is a governance-support surface, not a product we monetize against governing bodies.',
  },
  {
    question: 'What exactly does a school transcript include?',
    answer:
      'A per-school report covering every GradeUp NIL deal originating from that member school: athlete (with privacy-appropriate display), brand, deal category, compensation band, and disclosure-window status (filed on time, filed late, not yet filed). Requested by your association; scoped to one school per report.',
  },
  {
    question: 'Can these reports trigger enforcement actions?',
    answer:
      'The transcript is evidentiary and advisory — not an enforcement pipeline. Enforcement remains the association&rsquo;s responsibility under its bylaws. What we provide is clean, timestamped, audit-ready data so any action taken is fact-backed.',
  },
  {
    question: 'How does the association request a report?',
    answer:
      'Email state-ads@gradeupnil.com from an association domain. We verify the sender against publicly listed association contacts and onboard a named administrator. Once onboarded, your admin can request a transcript for any member school — reports generate on demand and are emailed plus made available in-app.',
  },
  {
    question: 'Do these reports work in states where HS NIL is prohibited?',
    answer:
      'No active deal flow exists in prohibited states, so transcripts would be empty. This surface is relevant for states with permitting rules. Current coverage: California, Florida, Georgia, Illinois, New Jersey, New York, and Texas, with more added as associations finalize rule sets.',
  },
];

export default function StateAdsSolutionPage() {
  return (
    <>
      <SolutionSchema
        scriptId="solutions-state-ads-jsonld"
        pageUrl={PAGE_URL}
        name="GradeUp school transcripts for State Athletic Associations"
        description="State athletic associations can request a GradeUp transcript for any member school — a per-school report of NIL activity, disclosures, and compliance status. Free."
        audience="State athletic associations (governing bodies)"
      />

      <SolutionHero
        eyebrow="State athletic associations"
        title="Request a GradeUp transcript"
        titleAccent="for any member school. Free."
        subtitle="Instead of a live oversight dashboard, your association requests a transcript for a specific school — one per-school report covering NIL activity, disclosures, and compliance status. Data belongs to the school&rsquo;s athletic program; you see it as a governing body, on request."
        primaryCta={{
          label: 'Request association onboarding',
          href: 'mailto:state-ads@gradeupnil.com?subject=State%20athletic%20association%20onboarding&body=Association%20name%3A%20%0AState%3A%20%0APrimary%20contact%20name%20%26%20title%3A%20%0AEmail%3A%20%0APhone%3A%20',
          ariaLabel: 'Email GradeUp to onboard your state athletic association',
        }}
        secondaryCta={{
          label: 'How the onboarding works',
          href: '/hs/state-ad-invite',
        }}
        supportingNote="Zero cost. 3 business-day turnaround. Read-only by design."
      />

      <ProblemProductProof
        eyebrow="Visibility gap"
        heading="HS NIL is live. The reporting layer isn&rsquo;t."
        subheading="Most state associations issued rules in 2023-25, then moved on. The infrastructure to audit those rules was never built. Our school-transcript reports fill that gap — pulled on demand, per member school."
        steps={[
          {
            kind: 'problem',
            heading: 'The status quo',
            body: 'Member schools are expected to disclose NIL deals within the association&rsquo;s window. Compliance is voluntary, decentralized, and invisible at the state level. The association finds out about violations months later — if at all.',
            bullets: [
              'Deals happen off-platform, off-record',
              'Disclosure windows miss with no automatic flag',
              'No per-school audit trail available on request',
              'Audit requests require manual school-by-school outreach',
            ],
          },
          {
            kind: 'product',
            heading: 'What a school transcript contains',
            body: 'An on-demand, per-school report covering every GradeUp-originated deal from that member school. Each deal shows athlete (privacy-appropriate), brand, category, compensation band, and disclosure-window status. Generated on request, scoped to one school per report.',
            bullets: [
              'Per-school scoping — one report, one school',
              'Disclosure-window filed / late / missing flag per deal',
              'Full audit trail of signatures and timestamps',
              'CSV export for association records',
            ],
          },
          {
            kind: 'proof',
            heading: 'How we&rsquo;ve built it',
            body: 'The underlying disclosure pipeline is live in every pilot state, auto-filing on every deal. Transcript reports are the request-time, per-school view of that data, generated when your association asks for a given school.',
            bullets: [
              'Already in production',
              'Covers 7 pilot states today (CA, FL, GA, IL, NJ, NY, TX)',
              'Disclosure pipeline battle-tested across every deal on platform',
            ],
          },
        ]}
      />

      <section aria-label="What a school transcript contains" className="bg-black py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest border border-white/10 bg-white/5 text-[var(--accent-primary)]">
              On a school transcript
            </span>
            <h2 className="font-display mt-4 text-3xl sm:text-4xl font-bold text-white">
              Three things. Done well.
            </h2>
            <p className="mt-3 text-white/70 text-lg">
              Each report is deliberately narrow — one school, scoped
              data. We don&rsquo;t sell anything else to your association.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={<Eye className="h-6 w-6" />}
              title="Per-school visibility"
              body="Every GradeUp deal originating from one member school, in a single sortable report."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-6 w-6" />}
              title="Compliance signal"
              body="Disclosure window filed, filed late, or missing — flagged automatically against your state&rsquo;s rule set."
            />
            <FeatureCard
              icon={<FileCheck className="h-6 w-6" />}
              title="Audit export"
              body="Filtered CSV export on demand. Signatures, timestamps, and the full disclosure-pipeline trail — per school."
            />
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 flex items-start gap-3">
            <List className="h-5 w-5 mt-0.5 flex-shrink-0 text-[var(--accent-primary)]" aria-hidden="true" />
            <div>
              <strong className="text-white font-semibold">
                Sample report.
              </strong>{' '}
              A representative school-transcript sample ships with the
              public launch. Start onboarding below to see real data.
              <span className="block text-white/40 mt-1">TODO: /public/solutions/state-ad-dashboard.png</span>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Onboard your association" className="bg-[var(--marketing-gray-950)] py-20 border-y border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest border border-white/10 bg-white/5 text-[var(--accent-primary)]">
            Onboard your association
          </span>
          <h2 className="font-display mt-4 text-3xl sm:text-4xl font-bold text-white">
            How to get started
          </h2>
          <ol className="mt-8 space-y-6 text-white/80">
            <Step
              n="01"
              title="Email us from an association domain"
              body="Send a note to state-ads@gradeupnil.com with your association name, state, primary contact, and phone. Domain verification is part of our validation."
            />
            <Step
              n="02"
              title="We verify"
              body="We cross-check the sender against publicly listed association contacts. Typical turnaround is 3 business days."
            />
            <Step
              n="03"
              title="Named administrator account provisioned"
              body="You receive an invite through /hs/state-ad-invite. Log in; your admin can then request a transcript for any member school in your state, on demand."
            />
          </ol>

          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href="mailto:state-ads@gradeupnil.com?subject=State%20athletic%20association%20onboarding&body=Association%20name%3A%20%0AState%3A%20%0APrimary%20contact%20name%20%26%20title%3A%20%0AEmail%3A%20%0APhone%3A%20"
              className="btn-marketing-primary inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-md font-semibold"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email state-ads@gradeupnil.com
            </a>
            <Link
              href="/hs/state-ad-invite"
              className="btn-marketing-outline inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-md font-semibold"
            >
              View the onboarding flow
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <SolutionFaq
        scriptId="solutions-state-ads-faq-jsonld"
        pageUrl={PAGE_URL}
        heading="State-association questions, answered"
        items={FAQ_ITEMS}
      />

      <SolutionCtaBand
        heading="Reporting you don&rsquo;t have to build."
        subheading="Already running in 7 pilot states. Free to your association. Per-school transcripts on request."
        primaryLabel="Email to onboard your association"
        primaryHref="mailto:state-ads@gradeupnil.com?subject=State%20athletic%20association%20onboarding"
        secondaryLabel="Browse case studies"
        secondaryHref="/business/case-studies"
        trustNote="Per-school · Free · 3 business-day turnaround"
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

function Step({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-4">
      <span className="flex-shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-bold">
        {n}
      </span>
      <div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="mt-1 text-white/70 text-sm leading-relaxed">{body}</p>
      </div>
    </li>
  );
}
