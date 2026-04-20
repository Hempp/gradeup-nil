/**
 * /hs/admin/annual-report/data — Section-by-section raw JSON browser.
 *
 * Admin tool for sanity-checking numbers before publication. Renders
 * pretty-printed JSON per section so the founder can verify the exact
 * shape the snapshot will freeze.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  collectAnnualReportData,
  parseAnnualRangeParams,
} from '@/lib/hs-nil/annual-report';

export const metadata: Metadata = {
  title: 'Annual Report Raw Data — GradeUp HS admin',
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

export default async function HsAnnualReportData({
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

  const sections: Array<{ key: keyof typeof data; label: string }> = [
    { key: 'meta', label: 'Meta' },
    { key: 'athletes', label: 'Athletes' },
    { key: 'deals', label: 'Deals' },
    { key: 'compliance', label: 'Compliance' },
    { key: 'referrals', label: 'Referrals' },
    { key: 'shares', label: 'Shares' },
    { key: 'trajectory', label: 'Trajectory' },
    { key: 'brands', label: 'Brands' },
    { key: 'states', label: 'States' },
    { key: 'partialFailures', label: 'Partial failures' },
  ];

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-6 flex items-center justify-between text-xs text-white/50">
          <Link
            href={`/hs/admin/annual-report?${new URLSearchParams(sp as Record<string, string>).toString()}`}
            className="underline decoration-white/30 underline-offset-2 hover:text-white/80"
          >
            ← Back to builder
          </Link>
          <span className="font-mono">
            {data.meta.reportLabel} · raw data
          </span>
        </div>

        <h1 className="font-display text-3xl text-white md:text-4xl">
          Raw AnnualReportData
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Window: {data.meta.rangeStart.slice(0, 10)} →{' '}
          {data.meta.rangeEnd.slice(0, 10)}. Generated{' '}
          {new Date(data.meta.generatedAt).toLocaleString()}.
        </p>

        <nav className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-widest text-white/50">
            Jump to
          </p>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {sections.map((s) => (
              <li key={s.key}>
                <a
                  href={`#section-${s.key}`}
                  className="rounded border border-white/10 bg-black/40 px-2 py-1 font-mono text-xs text-[var(--accent-primary)] hover:bg-black/60"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {sections.map((section) => (
          <section
            id={`section-${section.key}`}
            key={section.key}
            className="mt-8"
          >
            <h2 className="font-display text-xl text-white">{section.label}</h2>
            <pre className="mt-3 max-h-[32rem] overflow-auto rounded-xl border border-white/10 bg-black/60 p-4 text-xs leading-relaxed text-white/80">
              {JSON.stringify(data[section.key], null, 2)}
            </pre>
          </section>
        ))}
      </section>
    </main>
  );
}
