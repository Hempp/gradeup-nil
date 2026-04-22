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
    title: 'NIL Oversight for State Athletic Associations | GradeUp',
    description:
      'A read-only dashboard of every GradeUp NIL deal in your state, per member school, with disclosure-window compliance signals. Free for state athletic associations.',
    path: PAGE_URL,
  }),
  robots: { index: true, follow: true },
  keywords: [
    'state athletic association NIL',
    'HS NIL compliance oversight',
    'state NIL dashboard',
    'interscholastic NIL reporting',
    'state athletic director NIL portal',
    'NIL disclosure window tracking',
  ],
};

const FAQ_ITEMS = [
  {
    question: 'Is there any cost to the association?',
    answer:
      'No. The State-AD Portal is free for state athletic associations. It is an oversight surface, not a product we monetize against governing bodies.',
  },
  {
    question: 'What exactly does the portal show?',
    answer:
      'Read-only access to every GradeUp NIL deal originating from a member school in your state: athlete (with privacy-appropriate display), school, brand, deal category, compensation band, and the disclosure window status (filed on time, filed late, not yet filed).',
  },
  {
    question: 'Can the portal trigger enforcement actions?',
    answer:
      'The portal is read-only and advisory. Enforcement remains the association&rsquo;s responsibility under its bylaws. What we provide is clean evidence — timestamps, signatures, a full audit trail — so any action taken is fact-backed.',
  },
  {
    question: 'How do we request access?',
    answer:
      'Email state-ads@gradeupnil.com from an association domain. We verify the sender against publicly listed association contacts, provision a named administrator account, and share the invite flow at /hs/state-ad-invite. Turnaround is typically 3 business days.',
  },
  {
    question: 'Does the portal work in states where HS NIL is prohibited?',
    answer:
      'No active deal flow exists in prohibited states. The portal is relevant only for states with permitting rules. Our current coverage is California, Florida, Georgia, Illinois, New Jersey, New York, and Texas, with more added as associations finalize rule sets.',
  },
];

export default function StateAdsSolutionPage() {
  return (
    <>
      <SolutionSchema
        scriptId="solutions-state-ads-jsonld"
        pageUrl={PAGE_URL}
        name="GradeUp State-AD Portal"
        description="Read-only oversight dashboard for state athletic associations. Every NIL deal in the state, per member school, with disclosure-window compliance signals. Free."
        audience="State athletic associations (governing bodies)"
      />

      <SolutionHero
        eyebrow="State athletic associations"
        title="Every NIL deal in your state."
        titleAccent="One read-only dashboard. Free."
        subtitle="You can&rsquo;t govern what you can&rsquo;t see. The GradeUp State-AD Portal gives your compliance office a read-only view across every member school: athletes, brands, deal categories, and disclosure-window status — all audit-ready."
        primaryCta={{
          label: 'Request portal access',
          href: 'mailto:state-ads@gradeupnil.com?subject=State-AD%20Portal%20access%20request&body=Association%20name%3A%20%0AState%3A%20%0APrimary%20contact%20name%20%26%20title%3A%20%0AEmail%3A%20%0APhone%3A%20',
          ariaLabel: 'Email GradeUp to request state athletic association portal access',
        }}
        secondaryCta={{
          label: 'How the invite flow works',
          href: '/hs/state-ad-invite',
        }}
        supportingNote="Zero cost. 3 business-day turnaround. Read-only by design."
      />

      <ProblemProductProof
        eyebrow="Oversight gap"
        heading="HS NIL is live. The visibility layer isn&rsquo;t."
        subheading="Most state associations issued rules in 2023-25, then moved on. The reporting infrastructure to enforce those rules was never built. That&rsquo;s what this portal is."
        steps={[
          {
            kind: 'problem',
            heading: 'The status quo',
            body: 'Member schools are expected to disclose NIL deals within the association&rsquo;s window. Compliance is voluntary, decentralized, and invisible at the state level. The association finds out about violations months later — if at all.',
            bullets: [
              'Deals happen off-platform, off-record',
              'Disclosure windows miss with no automatic flag',
              'No single source of truth across member schools',
              'Audit requests require manual school-by-school outreach',
            ],
          },
          {
            kind: 'product',
            heading: 'What the portal provides',
            body: 'A read-only dashboard across every GradeUp-originated deal in the state. Every deal shows the school, athlete (privacy-appropriate), brand, category, compensation band, and the disclosure-window status. Exportable.',
            bullets: [
              'Read-only access — no write permissions, ever',
              'Disclosure-window filed / late / missing flag per deal',
              'Full audit trail of signatures and timestamps',
              'CSV export for association records',
            ],
          },
          {
            kind: 'proof',
            heading: 'How we&rsquo;ve built it',
            body: 'The portal already ships with Phase 12. The underlying disclosure-pipeline is live in every pilot state, with automatic filings on every deal. The oversight surface is the read-only mirror of the same data.',
            bullets: [
              'Phase 12 feature — already in production',
              'Covers 7 pilot states today (CA, FL, GA, IL, NJ, NY, TX)',
              'Disclosure-pipeline battle-tested across every deal on platform',
            ],
          },
        ]}
      />

      <section aria-label="What the portal provides" className="bg-black py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest border border-white/10 bg-white/5 text-[var(--accent-primary)]">
              In the portal
            </span>
            <h2 className="font-display mt-4 text-3xl sm:text-4xl font-bold text-white">
              Three things. Done well.
            </h2>
            <p className="mt-3 text-white/70 text-lg">
              The State-AD Portal is deliberately narrow. We don&rsquo;t sell
              anything else to your association.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={<Eye className="h-6 w-6" />}
              title="Visibility"
              body="Every deal on the platform originating from your member schools, in one sortable list."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-6 w-6" />}
              title="Compliance signal"
              body="Disclosure window filed, filed late, or missing — flagged automatically against your state&rsquo;s rule set."
            />
            <FeatureCard
              icon={<FileCheck className="h-6 w-6" />}
              title="Audit export"
              body="Filtered CSV export on demand. Signatures, timestamps, and the full disclosure-pipeline trail."
            />
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 flex items-start gap-3">
            <List className="h-5 w-5 mt-0.5 flex-shrink-0 text-[var(--accent-primary)]" aria-hidden="true" />
            <div>
              <strong className="text-white font-semibold">
                Screenshot placeholder.
              </strong>{' '}
              A representative portal screenshot will ship with the public
              launch. Request access via the invite flow to see the real thing.
              <span className="block text-white/40 mt-1">TODO: /public/solutions/state-ad-dashboard.png</span>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Request access" className="bg-[var(--marketing-gray-950)] py-20 border-y border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest border border-white/10 bg-white/5 text-[var(--accent-primary)]">
            Request access
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
              body="You receive an invite through /hs/state-ad-invite. Log in; the read-only dashboard is populated with all deals in your state from day one."
            />
          </ol>

          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href="mailto:state-ads@gradeupnil.com?subject=State-AD%20Portal%20access%20request&body=Association%20name%3A%20%0AState%3A%20%0APrimary%20contact%20name%20%26%20title%3A%20%0AEmail%3A%20%0APhone%3A%20"
              className="btn-marketing-primary inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-md font-semibold"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email state-ads@gradeupnil.com
            </a>
            <Link
              href="/hs/state-ad-invite"
              className="btn-marketing-outline inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-md font-semibold"
            >
              View the invite flow
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
        heading="Oversight you don&rsquo;t have to build."
        subheading="Already running in 7 pilot states. Free to your association. Read-only by design."
        primaryLabel="Email to request access"
        primaryHref="mailto:state-ads@gradeupnil.com?subject=State-AD%20Portal%20access%20request"
        secondaryLabel="Browse case studies"
        secondaryHref="/business/case-studies"
        trustNote="Read-only · Free · 3 business-day turnaround"
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
