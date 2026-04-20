/**
 * /hs/admin/annual-report — Annual Report builder landing.
 *
 * The founder's workflow:
 *   1. Pick a reporting window (preset or custom).
 *   2. Click "Preview Report" → renders the full long-form preview
 *      at /hs/admin/annual-report/preview?... with same params.
 *   3. Click "Raw Data" → /hs/admin/annual-report/data?... for JSON
 *      sanity check.
 *   4. Click "Export Data JSON" → GET /api/hs/admin/annual-report/collect
 *      triggers download of the full AnnualReportData blob.
 *   5. Click "Export Data CSV" → chooses a section, downloads a CSV.
 *   6. Click "Generate Narrative Draft" → re-renders the preview with
 *      emphasis on the narrative paragraphs for copy-paste to PDF.
 *
 * Admin-gated (404 for non-admins). Read-only on this page; snapshot
 * creation happens via a separate action (future phase — draft snapshot
 * insert will land when founder-review loop is in place).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AnnualReportRangeSelector from '@/components/hs/AnnualReportRangeSelector';

export const metadata: Metadata = {
  title: 'Annual Report Builder — GradeUp HS admin',
  description:
    'Founder-facing tool to build the "HS NIL at N" annual report: pick a window, preview, export JSON/CSV.',
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

export default async function HsAnnualReportLanding({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  await requireAdminOr404();
  const sp = await searchParams;

  const defaultYear = new Date().getUTCFullYear();
  const qs = new URLSearchParams();
  if (sp.year) qs.set('year', sp.year);
  if (sp.from) qs.set('from', sp.from);
  if (sp.to) qs.set('to', sp.to);
  const qsString = qs.toString() ? `?${qs.toString()}` : '';

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            HS-NIL · Annual Report
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Build the &ldquo;HS NIL at {Math.max(1, (Number(sp.year) || defaultYear) - 2025)}&rdquo;
            report
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/60">
            Opendorse&apos;s &ldquo;NIL at N&rdquo; reports are the college-NIL
            industry reference. This is ours. Pick a window, preview, export
            the numbers, then write the narrative on top of the generated draft.
          </p>
        </header>

        <div className="mt-8">
          <AnnualReportRangeSelector
            defaultYear={defaultYear}
            defaultFrom={sp.from}
            defaultTo={sp.to}
          />
        </div>

        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            href={`/hs/admin/annual-report/preview${qsString}`}
            className="block rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/[0.08]"
          >
            <p className="font-display text-lg text-white">Preview Report</p>
            <p className="mt-1 text-sm text-white/60">
              Full-page long-form render with exec summary, key findings, and
              all section tables. Server-rendered against live data at request
              time.
            </p>
          </Link>

          <Link
            href={`/hs/admin/annual-report/data${qsString}`}
            className="block rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/[0.08]"
          >
            <p className="font-display text-lg text-white">Raw Data Browser</p>
            <p className="mt-1 text-sm text-white/60">
              Section-by-section JSON pretty-print for sanity-checking
              numbers before publication.
            </p>
          </Link>

          <a
            href={`/api/hs/admin/annual-report/collect${qsString}`}
            className="block rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/[0.08]"
          >
            <p className="font-display text-lg text-white">Export Data JSON</p>
            <p className="mt-1 text-sm text-white/60">
              Download the full AnnualReportData blob. The same data a published
              snapshot would freeze.
            </p>
          </a>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <p className="font-display text-lg text-white">Export Data CSV</p>
            <p className="mt-1 text-sm text-white/60">
              Pick a section to download as CSV:
            </p>
            <ul className="mt-3 grid gap-2 text-sm">
              {[
                ['athletes_by_state', 'Athletes by state'],
                ['athletes_by_sport', 'Athletes by sport'],
                ['deals_top_brands', 'Top brands by deal count'],
                ['deals_top_sports', 'Top sports by deal volume'],
                ['compliance_consents_by_age', 'Consents by age bucket'],
                ['referrals_tier_distribution', 'Referrer tier distribution'],
                ['shares_by_platform', 'Share events by platform'],
                ['states_per_state', 'Per-state activation'],
              ].map(([sec, label]) => {
                const exportQs = new URLSearchParams(qs.toString());
                exportQs.set('section', sec);
                return (
                  <li key={sec}>
                    <a
                      href={`/api/hs/admin/annual-report/export/csv?${exportQs.toString()}`}
                      className="text-[var(--accent-primary)] hover:underline"
                    >
                      {label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="mt-12 rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-display text-xl text-white">How to ship the report</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-6 text-sm text-white/70">
            <li>
              Pick the reporting window above. For the first report, use the
              concierge-cohort window (30 days after pilot launch).
            </li>
            <li>
              Click <em>Preview Report</em>. Read it end-to-end. Flag any
              numbers that look wrong.
            </li>
            <li>
              Open <em>Raw Data Browser</em> in a second tab to verify any
              suspicious figure against its section JSON.
            </li>
            <li>
              Export the full JSON for archive. This is what the snapshot
              table freezes on publish.
            </li>
            <li>
              Copy the generated executive summary + key findings into the
              <code className="mx-1 rounded bg-black/40 px-1.5 py-0.5 text-xs">
                docs/HS-NIL-AT-1-TEMPLATE.md
              </code>
              doc. Edit by hand. Publish the final designed PDF.
            </li>
            <li>
              Pitch the report using the appendix list in the template
              (SBJ, Athletic Business, On3, CalMatters, state-specific
              education press, NIL podcasts).
            </li>
          </ol>
        </section>

        <p className="mt-10 text-xs text-white/40">
          Admin-only. Published reports freeze into the
          <code className="mx-1 rounded bg-black/40 px-1.5 py-0.5 text-xs">
            annual_report_snapshots
          </code>
          table so numbers never silently change.{' '}
          <Link
            href="/hs/admin"
            className="underline decoration-white/30 underline-offset-2 hover:text-white/60"
          >
            ← Back to admin home
          </Link>
        </p>
      </section>
    </main>
  );
}
