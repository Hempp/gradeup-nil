/**
 * /hs/admin/ops-tools/concierge-cohort — Per-parent funnel dashboard.
 *
 * Shows every hs_waitlist row with is_concierge=true, each annotated
 * with their current funnel position (not_signed_up → signed_up →
 * consent_signed → deal_signed → deal_paid → share_observed) derived
 * from joins against auth.users / parental_consents / deals /
 * deal_share_events.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { loadConciergeCohort } from '@/lib/hs-nil/bulk-actions';
import { ConciergeCohortTable } from '@/components/hs/ConciergeCohortTable';

export const metadata: Metadata = {
  title: 'Concierge cohort — GradeUp HS',
};
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function requireAdminOr404() {
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

export default async function ConciergeCohortPage() {
  await requireAdminOr404();

  let rows: Awaited<ReturnType<typeof loadConciergeCohort>> = [];
  try {
    rows = await loadConciergeCohort();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-admin/ops-tools/concierge-cohort] load failed', err);
  }

  const stageCounts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.funnelPosition] = (acc[r.funnelPosition] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <nav
          aria-label="Breadcrumb"
          className="text-xs uppercase tracking-widest text-white/50"
        >
          <Link href="/hs/admin" className="hover:text-white">
            Ops dashboard
          </Link>
          <span className="mx-2 text-white/30">/</span>
          <Link href="/hs/admin/ops-tools" className="hover:text-white">
            Ops tools
          </Link>
          <span className="mx-2 text-white/30">/</span>
          <span className="text-white/80">Concierge cohort</span>
        </nav>

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Pilot · Concierge cohort
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Concierge parents
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Every concierge-flagged parent and where they sit in the
            funnel. Latest activity is the most-recent share, deal, or
            consent event we saw on the athlete tied to this parent by
            email.
          </p>
        </header>

        <aside className="mt-6 rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 p-5 text-sm text-white/80">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Funnel distribution
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            {[
              'not_signed_up',
              'signed_up',
              'consent_signed',
              'deal_signed',
              'deal_paid',
              'share_observed',
            ].map((stage) => (
              <span
                key={stage}
                className="rounded-md border border-white/10 bg-black/40 px-2 py-1"
              >
                <span className="text-white/50">
                  {stage.replace(/_/g, ' ')}:
                </span>{' '}
                <span className="font-display text-white">
                  {stageCounts[stage] ?? 0}
                </span>
              </span>
            ))}
          </div>
        </aside>

        <div className="mt-8">
          <ConciergeCohortTable rows={rows} />
        </div>

        <p className="mt-8 text-xs text-white/40">
          Tip: flip <code>is_concierge</code> from the row actions column
          to remove a parent from the cohort. To add a parent, call{' '}
          <code>POST /api/hs/admin/ops-tools/concierge/mark</code> with{' '}
          <code>{'{ waitlistId, isConcierge: true }'}</code> or use the
          SQL console.
        </p>
      </section>
    </main>
  );
}
