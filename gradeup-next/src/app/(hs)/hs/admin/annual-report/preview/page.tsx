/**
 * /hs/admin/annual-report/preview — Full-rendered preview of the annual report.
 *
 * Server Component. Calls collectAnnualReportData at request time with the
 * range passed in the URL params. Renders:
 *   - executive summary (programmatic draft)
 *   - top-5 key findings
 *   - section tables for Athletes / Deals / Compliance / Referrals / Shares /
 *     Trajectory / Brands / States
 *   - methodology note + partial-failure warnings
 *
 * Intentionally verbose — this is the journalist's view, not a dashboard.
 * Admin-gated; admins can copy-paste the long-form text into the final
 * designed PDF.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AnnualReportExecutiveSummary from '@/components/hs/AnnualReportExecutiveSummary';
import AnnualReportKeyFindingCard from '@/components/hs/AnnualReportKeyFindingCard';
import AnnualReportSectionTable from '@/components/hs/AnnualReportSectionTable';
import {
  collectAnnualReportData,
  parseAnnualRangeParams,
} from '@/lib/hs-nil/annual-report';
import {
  buildTocSections,
  generateExecutiveSummary,
  generateKeyFindings,
  generateMethodologyNote,
  narrativeForAthletes,
  narrativeForBrands,
  narrativeForCompliance,
  narrativeForDeals,
  narrativeForReferrals,
  narrativeForShares,
  narrativeForStates,
} from '@/lib/hs-nil/annual-report-narrative';

export const metadata: Metadata = {
  title: 'Annual Report Preview — GradeUp HS admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

async function requireAdminOr404(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (error || !profile || profile.role !== 'admin') notFound();
}

interface PageSearchParams {
  year?: string;
  from?: string;
  to?: string;
}

function pct(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

function usd(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

export default async function HsAnnualReportPreview({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  await requireAdminOr404();
  const sp = await searchParams;

  const supabase = await createClient();
  const range = parseAnnualRangeParams({
    year: sp.year,
    from: sp.from,
    to: sp.to,
  });

  const data = await collectAnnualReportData(supabase, range);
  const execSummary = generateExecutiveSummary(data);
  const findings = generateKeyFindings(data);
  const methodology = generateMethodologyNote(data);
  const toc = buildTocSections(data);

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-4xl px-6 py-16">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between text-xs text-white/50">
          <Link
            href={`/hs/admin/annual-report?${new URLSearchParams(sp as Record<string, string>).toString()}`}
            className="underline decoration-white/30 underline-offset-2 hover:text-white/80"
          >
            ← Back to builder
          </Link>
          <span className="font-mono">
            {data.meta.reportLabel} · admin preview
          </span>
        </div>

        {/* Partial-failure warning */}
        {data.partialFailures.length > 0 ? (
          <aside className="mb-6 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-100">
            <p className="font-semibold">Partial failure in the data pull:</p>
            <ul className="mt-2 list-disc pl-5">
              {data.partialFailures.map((f, i) => (
                <li key={i} className="font-mono text-xs">
                  {f.section}: {f.message}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-yellow-200/70">
              These sections fell back to empty data. Fix the root cause before
              publishing.
            </p>
          </aside>
        ) : null}

        {/* Executive summary */}
        <AnnualReportExecutiveSummary
          reportLabel={data.meta.reportLabel}
          rangeStart={data.meta.rangeStart}
          rangeEnd={data.meta.rangeEnd}
          summary={execSummary}
        />

        {/* Table of contents */}
        <nav
          aria-label="Table of contents"
          className="mt-10 rounded-xl border border-white/10 bg-white/5 p-6"
        >
          <h2 className="font-display text-xl text-white">Contents</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-6 text-sm text-white/70">
            {toc.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`} className="text-[var(--accent-primary)] hover:underline">
                  {t.title}
                </a>
                <span className="ml-2 text-white/50">— {t.summary}</span>
              </li>
            ))}
          </ol>
        </nav>

        {/* Key findings */}
        <section id="key-findings" className="mt-10">
          <h2 className="font-display text-2xl text-white md:text-3xl">
            Key Findings
          </h2>
          <p className="mt-2 text-sm text-white/60">
            Ranked by novelty + shareworthiness. Sources below each card help
            fact-check before publication.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {findings.length === 0 ? (
              <p className="text-sm text-white/50">
                Not enough data to generate findings — check the raw data view.
              </p>
            ) : (
              findings.map((f, idx) => (
                <AnnualReportKeyFindingCard
                  key={idx}
                  finding={f}
                  index={idx}
                  showSource
                />
              ))
            )}
          </div>
        </section>

        {/* Part 1 — The Market */}
        <section id="part-1-market" className="mt-14">
          <h2 className="font-display text-2xl text-white md:text-3xl">
            Part 1 — The Market
          </h2>
          <p className="mt-2 text-sm text-white/70">
            {narrativeForAthletes(data.athletes)}
          </p>

          <AnnualReportSectionTable
            id="athletes-by-state"
            title="Athlete signups by state"
            rows={data.athletes.byState}
            columns={[
              { key: 'stateCode', label: 'State' },
              { key: 'count', label: 'Signups', align: 'right' },
            ]}
            limit={12}
          />

          <AnnualReportSectionTable
            id="athletes-by-sport"
            title="Athlete signups by sport"
            rows={data.athletes.bySport}
            columns={[
              { key: 'sport', label: 'Sport' },
              { key: 'count', label: 'Signups', align: 'right' },
            ]}
            limit={10}
          />

          <AnnualReportSectionTable
            id="athletes-by-tier"
            title="Verification tier distribution"
            rows={data.athletes.byVerificationTier}
            columns={[
              { key: 'tier', label: 'Tier' },
              { key: 'count', label: 'Athletes', align: 'right' },
            ]}
          />
        </section>

        {/* Part 2 — The Pilot */}
        <section id="part-2-pilot" className="mt-14">
          <h2 className="font-display text-2xl text-white md:text-3xl">
            Part 2 — The Pilot
          </h2>
          <p className="mt-2 text-sm text-white/70">
            {narrativeForDeals(data.deals)}
          </p>

          <AnnualReportSectionTable
            id="deals-by-state"
            title="Deal volume by state"
            rows={data.deals.byState}
            columns={[
              { key: 'stateCode', label: 'State' },
              { key: 'count', label: 'Deals', align: 'right' },
              {
                key: 'grossCents',
                label: 'Gross',
                align: 'right',
                format: (v) => usd(Number(v) || 0),
              },
            ]}
            limit={12}
          />

          <AnnualReportSectionTable
            id="deals-top-brands"
            title="Top 10 brands by deal count"
            rows={data.deals.topBrandsByDealCount}
            columns={[
              { key: 'brandName', label: 'Brand' },
              { key: 'dealCount', label: 'Deals', align: 'right' },
              {
                key: 'grossCents',
                label: 'Gross',
                align: 'right',
                format: (v) => usd(Number(v) || 0),
              },
            ]}
          />

          <AnnualReportSectionTable
            id="deals-top-sports"
            title="Top sports by deal volume"
            rows={data.deals.topSportsByDealVolume}
            columns={[
              { key: 'sport', label: 'Sport' },
              { key: 'dealCount', label: 'Deals', align: 'right' },
              {
                key: 'grossCents',
                label: 'Gross',
                align: 'right',
                format: (v) => usd(Number(v) || 0),
              },
            ]}
          />

          <AnnualReportSectionTable
            id="brands-by-vertical"
            title="HS-enabled brand verticals"
            narrative={narrativeForBrands(data.brands)}
            rows={data.brands.byVertical}
            columns={[
              { key: 'vertical', label: 'Vertical' },
              { key: 'count', label: 'Brands', align: 'right' },
            ]}
          />
        </section>

        {/* Part 3 — Compliance */}
        <section id="part-3-compliance" className="mt-14">
          <h2 className="font-display text-2xl text-white md:text-3xl">
            Part 3 — Compliance
          </h2>
          <p className="mt-2 text-sm text-white/70">
            {narrativeForCompliance(data.compliance)}
          </p>

          <AnnualReportSectionTable
            id="disclosures-by-state"
            title="Disclosure success rate by state"
            rows={data.compliance.disclosuresByState}
            columns={[
              { key: 'stateCode', label: 'State' },
              { key: 'sent', label: 'Sent', align: 'right' },
              { key: 'failed', label: 'Failed', align: 'right' },
            ]}
          />

          <AnnualReportSectionTable
            id="disputes-by-category"
            title="Disputes by category"
            rows={data.compliance.disputesByCategory}
            columns={[
              { key: 'category', label: 'Category' },
              { key: 'count', label: 'Count', align: 'right' },
            ]}
          />

          <AnnualReportSectionTable
            id="consents-by-age"
            title="Parental consents by athlete age bucket"
            rows={data.compliance.consentsByAgeBucket}
            columns={[
              { key: 'bucket', label: 'Age bucket' },
              { key: 'count', label: 'Consents', align: 'right' },
            ]}
          />

          <AnnualReportSectionTable
            id="consents-by-scope"
            title="Consents by scope category"
            rows={data.compliance.consentsByScopeCategory}
            columns={[
              { key: 'category', label: 'Scope category' },
              { key: 'count', label: 'Consents', align: 'right' },
            ]}
          />
        </section>

        {/* Part 4 — Viral Growth */}
        <section id="part-4-viral-growth" className="mt-14">
          <h2 className="font-display text-2xl text-white md:text-3xl">
            Part 4 — Viral Growth
          </h2>
          <p className="mt-2 text-sm text-white/70">
            {narrativeForReferrals(data.referrals)}
          </p>
          <p className="mt-2 text-sm text-white/70">
            {narrativeForShares(data.shares)}
          </p>

          <AnnualReportSectionTable
            id="referrer-tiers"
            title="Referrer tier distribution"
            narrative={`Referred-vs-organic consent conversion: ${pct(
              data.referrals.referredVsOrganicConsentRate.referred
            )} vs ${pct(data.referrals.referredVsOrganicConsentRate.organic)}.`}
            rows={data.referrals.topReferrerTier}
            columns={[
              { key: 'tier', label: 'Tier' },
              { key: 'count', label: 'Referrers', align: 'right' },
            ]}
          />

          <AnnualReportSectionTable
            id="shares-by-platform"
            title="Share events by platform"
            rows={data.shares.byPlatform}
            columns={[
              { key: 'platform', label: 'Platform' },
              { key: 'count', label: 'Events', align: 'right' },
            ]}
          />
        </section>

        {/* Part 5 — Bridge to College */}
        <section id="part-5-bridge-to-college" className="mt-14">
          <h2 className="font-display text-2xl text-white md:text-3xl">
            Part 5 — The Bridge to College
          </h2>
          <p className="mt-2 text-sm text-white/70">
            GradeUp&apos;s trajectory surface captures each high-school athlete&apos;s
            academic-athletic story 18–24 months before matriculation. When the
            athlete flips to the college bracket, the history comes with them.
          </p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <dt className="text-xs uppercase tracking-widest text-white/50">
                Trajectory profiles
              </dt>
              <dd className="mt-1 font-display text-2xl text-white">
                {data.trajectory.trajectoryProfilesCreated}
              </dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <dt className="text-xs uppercase tracking-widest text-white/50">
                Public URL views
              </dt>
              <dd className="mt-1 font-display text-2xl text-white">
                {data.trajectory.publicUrlViews}
              </dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <dt className="text-xs uppercase tracking-widest text-white/50">
                Institution-verified GPA %
              </dt>
              <dd className="mt-1 font-display text-2xl text-white">
                {pct(data.trajectory.institutionVerifiedGpaPct)}
              </dd>
            </div>
          </dl>

          <AnnualReportSectionTable
            id="states-per-state"
            title="Per-state activation detail"
            narrative={narrativeForStates(data.states)}
            rows={data.states.perState}
            columns={[
              { key: 'stateCode', label: 'State' },
              { key: 'waitlistCount', label: 'Waitlist', align: 'right' },
              { key: 'signupCount', label: 'Signups', align: 'right' },
              {
                key: 'conversionRate',
                label: 'Conv.',
                align: 'right',
                format: (v) => pct(Number(v) || 0),
              },
              { key: 'activeDeals', label: 'Active deals', align: 'right' },
              { key: 'completedDeals', label: 'Completed', align: 'right' },
            ]}
          />
        </section>

        {/* Methodology */}
        <section id="methodology" className="mt-14 rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-display text-2xl text-white md:text-3xl">
            Methodology
          </h2>
          <pre className="mt-4 whitespace-pre-wrap text-sm text-white/80">
            {methodology}
          </pre>
        </section>

        {/* About + citations pointers */}
        <section id="about" className="mt-14">
          <h2 className="font-display text-2xl text-white md:text-3xl">
            About GradeUp
          </h2>
          <p className="mt-2 text-sm text-white/70">
            GradeUp is the first NIL platform built for high-school
            scholar-athletes and their custodial parents. The model rewards
            verified academic excellence alongside athletic performance and is
            architected with parental consent, state-disclosure, and
            parent-custodial-payout as first-class primitives — not bolted-on
            compliance.
          </p>
          <p className="mt-4 text-sm text-white/60">
            See <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs">
              docs/HS-NIL-AT-1-TEMPLATE.md
            </code>{' '}
            for the final publishable report template and pitch-list appendix.
          </p>
        </section>

        <section id="citations" className="mt-14">
          <h2 className="font-display text-2xl text-white md:text-3xl">
            Citations
          </h2>
          <p className="mt-2 text-sm text-white/70">
            Every figure in this report is generated by
            <code className="mx-1 rounded bg-black/40 px-1.5 py-0.5 text-xs">
              src/lib/hs-nil/annual-report.ts
            </code>
            from the GradeUp production Postgres schema. Each <code className="mx-1">collect*Figures</code> function documents its source tables inline.
          </p>
        </section>
      </section>
    </main>
  );
}
