/**
 * /about — Who GradeUp is, and how it relates to StatStaq.
 *
 * Voice: plain-spoken, proof-first, honest. This site had every fabricated
 * stat/testimonial/number stripped — so this page invents NOTHING. No user
 * counts, no funding figures, no press, no named team, no dates of "traction."
 * It describes what GradeUp IS and what StatStaq DOES — truthful for an early
 * pilot. The one hard number here (15% sourced / 0% you bring) is the pricing
 * model already published on /pricing and the homepage, mirrored verbatim.
 *
 * Server Component. ISR 5-min.
 */
import Link from 'next/link';
import { Briefcase, ShieldCheck } from 'lucide-react';
import { SolutionSchema, SolutionCtaBand } from '@/components/marketing';
import { buildMarketingMetadata } from '@/lib/seo';

export const revalidate = 300;

const PAGE_URL = '/about';

export const metadata = {
  ...buildMarketingMetadata({
    title: 'About GradeUp — the verified-GPA NIL layer, part of StatStaq',
    description:
      'GradeUp is the verified-GPA layer that qualifies scholar-athletes for NIL; StatStaq is the done-for-you agency that produces the content, values the brand, sources the deals, and negotiates the contracts. Here is how the two fit together.',
    path: PAGE_URL,
  }),
  robots: { index: true, follow: true },
  keywords: [
    'about GradeUp NIL',
    'GradeUp and StatStaq',
    'verified GPA NIL',
    'done-for-you NIL agency',
    'scholar-athlete NIL platform',
  ],
};

export default function AboutPage() {
  return (
    <>
      <SolutionSchema
        scriptId="about-jsonld"
        pageUrl={PAGE_URL}
        name="About GradeUp NIL"
        description="GradeUp is the verified-GPA layer that qualifies scholar-athletes for NIL. StatStaq is the done-for-you agency that runs the deals. Here is how the two fit together."
        audience="Scholar-athletes, parents, and brands considering GradeUp"
      />

      {/* ─────────────────────────────────────────────────────────────
          1. HERO — eyebrow + mission line
          ───────────────────────────────────────────────────────────── */}
      <section
        aria-label="About GradeUp"
        className="relative overflow-hidden bg-[var(--cream)] pt-32 pb-16 sm:pt-40 sm:pb-20"
      >
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="eyebrow inline-block px-3 py-1 rounded-full border border-[var(--hairline)] bg-[var(--cream-surface)]">
            About GradeUp
          </span>
          <h1 className="mt-6 font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--ink)]">
            We help scholar-athletes monetize NIL{' '}
            <span className="text-[var(--cobalt)]">
              without losing eligibility — or their childhood.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-[var(--ink-muted)] leading-relaxed">
            From middle school through college, an athlete&rsquo;s name, image,
            and likeness is worth something. GradeUp exists so a young person can
            realize that value the right way: grades verified first, a parent
            holding the pen, compliance handled in the background, and a real
            agency doing the actual work — not a dashboard that leaves a
            fifteen-year-old to negotiate with brands alone.
          </p>
          <div className="stat-strip mt-8 inline-flex">
            <b>Verified GPA</b>&nbsp;·&nbsp;<b>Parent-controlled</b>&nbsp;·&nbsp;<b>Done-for-you</b>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. WHAT GRADEUP IS
          ───────────────────────────────────────────────────────────── */}
      <section
        aria-label="What GradeUp is"
        className="bg-[var(--cream-section)] py-20 border-y border-[var(--hairline)]"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="eyebrow inline-block px-3 py-1 rounded-full border border-[var(--hairline)] bg-[var(--cream-surface)]">
            What GradeUp is
          </span>
          <h2 className="font-display mt-4 text-3xl sm:text-4xl font-bold text-[var(--ink)]">
            The verified-GPA layer. Your grades are the qualifier.
          </h2>
          <div className="mt-5 space-y-4 text-[var(--ink-muted)] text-lg leading-relaxed">
            <p>
              GradeUp is the verified-GPA scholar-athlete layer of StatStaq.
              Most NIL platforms lead with follower counts and highlight reels.
              GradeUp leads with the report card. A verified GPA is what gets an
              athlete through the gate — it is the thing we check, and it is the
              thing that makes a scholar-athlete worth partnering with in the
              first place.
            </p>
            <p>
              It is deliberately{' '}
              <strong className="text-[var(--ink)]">done-for-you</strong>. An
              athlete qualifies with their grades; they do not have to learn
              contract law, pitch brands, or read a state athletic
              association&rsquo;s rulebook at midnight. GradeUp handles the
              qualifying and the compliance. The work of the deal is handled by
              StatStaq.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. WHAT STATSTAQ IS  — the key gap
          ───────────────────────────────────────────────────────────── */}
      <section aria-label="What StatStaq is" className="bg-[var(--cream)] py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="eyebrow inline-block px-3 py-1 rounded-full border border-[var(--hairline)] bg-[var(--cream-surface)]">
            What StatStaq is
          </span>
          <h2 className="font-display mt-4 text-3xl sm:text-4xl font-bold text-[var(--ink)]">
            StatStaq is the agency that actually runs the deal.
          </h2>
          <p className="mt-5 text-[var(--ink-muted)] text-lg leading-relaxed">
            This is the part most people miss, so we&rsquo;ll say it plainly.
            GradeUp is how an athlete{' '}
            <strong className="text-[var(--ink)]">qualifies</strong>. StatStaq is
            the done-for-you agency that does the work — GradeUp&rsquo;s parent
            company, and the real asset behind everything. When a deal happens,
            StatStaq&rsquo;s team is the one running it end to end:
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <StatStaqCard
              title="Produces the content"
              body="The photo, the video, the post — StatStaq's team produces the creative a brand is paying for, so the athlete isn't left to make it alone."
            />
            <StatStaqCard
              title="Values the brand"
              body="What is a given scholar-athlete's NIL actually worth? StatStaq prices it, so a deal isn't a guess and nobody gets shortchanged."
            />
            <StatStaqCard
              title="Sources the deals"
              body="StatStaq's deal desk finds and brings the opportunities — local and regional brands looking to partner with verified scholar-athletes."
            />
            <StatStaqCard
              title="Negotiates the contracts"
              body="StatStaq papers and negotiates the agreement — terms, usage, timelines — so the athlete and their parent sign something clean."
            />
          </div>

          <p className="mt-8 text-[var(--ink-muted)] text-lg leading-relaxed">
            Put simply:{' '}
            <strong className="text-[var(--ink)]">
              GradeUp is how you qualify. StatStaq is who does the work.
            </strong>{' '}
            The GPA gate is the front door; the agency is the whole house behind
            it.
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. HOW WE MAKE MONEY  (mirrors /pricing verbatim model)
          ───────────────────────────────────────────────────────────── */}
      <section
        aria-label="How we make money"
        className="bg-[var(--cream-section)] py-20 border-y border-[var(--hairline)]"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="eyebrow inline-block px-3 py-1 rounded-full border border-[var(--hairline)] bg-[var(--cream-surface)]">
            How we make money
          </span>
          <h2 className="font-display mt-4 text-3xl sm:text-4xl font-bold text-[var(--ink)]">
            Free to athletes and parents. We only earn when we deliver.
          </h2>
          <div className="mt-5 space-y-4 text-[var(--ink-muted)] text-lg leading-relaxed">
            <p>
              Signing up is free for scholar-athletes and free for parents.
              Always. Parents never see a fee for joining, approving a deal, or
              acting as the custodian of their athlete&rsquo;s earnings.
            </p>
            <p>
              StatStaq keeps a flat{' '}
              <strong className="text-[var(--ink)]">15% commission only on
              deals its deal desk sources and closes</strong>. No deal, no fee.
              And on a deal the athlete brings themselves —{' '}
              <strong className="text-[var(--ink)]">0%</strong>. That one stays
              entirely theirs. On a $1,000 sourced deal the custodian keeps
              $850; on a $1,000 deal the athlete brings, they keep the full
              $1,000.
            </p>
          </div>
          <div className="stat-strip mt-8 inline-flex">
            <b>Free</b>&nbsp;to start&nbsp;·&nbsp;<b>15%</b>&nbsp;sourced&nbsp;·&nbsp;<b>0%</b>&nbsp;you bring
          </div>
          <p className="mt-6 text-sm text-[var(--ink-meta)]">
            The full breakdown lives on the{' '}
            <Link
              href="/pricing"
              className="text-[var(--cobalt)] font-semibold hover:text-[var(--cobalt-hover)]"
            >
              pricing page
            </Link>
            . Same numbers, no asterisks.
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. COMPLIANCE STANCE
          ───────────────────────────────────────────────────────────── */}
      <section aria-label="Our compliance stance" className="bg-[var(--cream)] py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="eyebrow inline-block px-3 py-1 rounded-full border border-[var(--hairline)] bg-[var(--cream-surface)]">
            Our compliance stance
          </span>
          <h2 className="font-display mt-4 text-3xl sm:text-4xl font-bold text-[var(--ink)]">
            Built for minors first, deals second.
          </h2>
          <p className="mt-5 text-[var(--ink-muted)] text-lg leading-relaxed">
            NIL for a young athlete only works if the adults are protected as
            carefully as the opportunity. That shapes how the platform is built:
          </p>

          <ul className="mt-8 space-y-5">
            <ComplianceItem
              title="Dual-signed parental consent"
              body="No deal goes live without both the athlete and a parent or legal guardian signing. There is no implied consent and no surprise contract."
            />
            <ComplianceItem
              title="Custodial payouts the parent controls"
              body="Earnings route into a custodial account the parent owns and controls. The parent decides what happens with an athlete's money."
            />
            <ComplianceItem
              title="State-by-state HS rule awareness"
              body="High-school NIL is governed state by state, and the rules move. The platform is built to check a deal against the athlete's state athletic-association rules before it can activate."
            />
            <ComplianceItem
              title="Built to protect future NCAA eligibility"
              body="No school IP, no pay-for-play, and no banned categories like gambling, alcohol, or cannabis. The goal is that a deal today never costs a college scholarship tomorrow."
            />
          </ul>

          <p className="mt-8 rounded-2xl border border-[var(--hairline)] bg-[var(--cream-surface)] p-5 text-sm text-[var(--ink-meta)] leading-relaxed">
            One honest caveat: this is how we build and operate, not legal
            advice. NIL rules differ by state and change often, and every
            family&rsquo;s situation is different. We handle compliance in good
            faith and keep an audit trail — but if you have a specific legal
            question, talk to a qualified professional in your state.
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. CLOSING CTA
          ───────────────────────────────────────────────────────────── */}
      <SolutionCtaBand
        heading="Qualify with your grades. Let the team run the rest."
        subheading="Create a free account to get started, or see exactly how the numbers work first."
        primaryLabel="Get started"
        primaryHref="/signup"
        secondaryLabel="See the pricing"
        secondaryHref="/pricing"
        trustNote="Free for athletes and parents · 15% only on sourced deals · 0% on deals you bring"
      />
    </>
  );
}

function StatStaqCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="card-marketing p-6">
      <div className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] mb-4">
        <Briefcase className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-bold text-[var(--ink)] mb-2">{title}</h3>
      <p className="text-[var(--ink-muted)] text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function ComplianceItem({ title, body }: { title: string; body: string }) {
  return (
    <li className="flex gap-4">
      <span
        className="mt-1 inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
        aria-hidden="true"
      >
        <ShieldCheck className="h-4 w-4" />
      </span>
      <div>
        <h3 className="text-lg font-bold text-[var(--ink)]">{title}</h3>
        <p className="mt-1 text-[var(--ink-muted)] leading-relaxed">{body}</p>
      </div>
    </li>
  );
}
