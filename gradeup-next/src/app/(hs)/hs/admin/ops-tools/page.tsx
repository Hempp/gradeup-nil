/**
 * /hs/admin/ops-tools — Landing page for bulk-action + cohort tooling.
 *
 * Three sections:
 *   1. Recent bulk operations (last ~10) with their per-item summaries.
 *   2. Active retry-guard status: what targets are currently cooling
 *      down and for how long.
 *   3. Concierge cohort glimpse: count + link to the full dashboard.
 *
 * Admin-gated, feature-flag-gated (via the (hs) layout).
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  listBulkOperations,
  countBulkOperationsByStatus,
  loadConciergeCohort,
} from '@/lib/hs-nil/bulk-actions';
import { listActiveRetryGuards } from '@/lib/hs-nil/retry-guards';
import { BulkOperationCard } from '@/components/hs/BulkOperationCard';
import { RetryGuardStatus } from '@/components/hs/RetryGuardStatus';

export const metadata: Metadata = {
  title: 'Ops tools — GradeUp HS',
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

async function safe<T>(loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-admin/ops-tools] loader failed', err);
    return fallback;
  }
}

export default async function OpsToolsLandingPage() {
  await requireAdminOr404();

  const [recent, counts, guards, cohort] = await Promise.all([
    safe(() => listBulkOperations(10, 0), []),
    safe(() => countBulkOperationsByStatus(), {
      running: 0,
      partial_failure: 0,
    }),
    safe(() => listActiveRetryGuards(60), []),
    safe(() => loadConciergeCohort(), []),
  ]);

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <nav
          aria-label="Breadcrumb"
          className="text-xs uppercase tracking-widest text-white/50"
        >
          <Link href="/hs/admin" className="hover:text-white">
            Ops dashboard
          </Link>
          <span className="mx-2 text-white/30">/</span>
          <span className="text-white/80">Ops tools</span>
        </nav>

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Ops tools · Bulk + cohort
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Scale-up tooling
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Bulk admin actions, retry deduplication, and concierge-cohort
            tracking for the pilot.
          </p>
        </header>

        {/* Signal row */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Stat
            label="Running bulk ops"
            value={counts.running}
            tone={counts.running > 0 ? 'warn' : 'neutral'}
          />
          <Stat
            label="Partial-failure ops"
            value={counts.partial_failure}
            tone={counts.partial_failure > 0 ? 'err' : 'neutral'}
          />
          <Stat
            label="Concierge cohort"
            value={cohort.length}
            tone="info"
          />
        </div>

        {/* Quick links */}
        <div className="mt-6 flex flex-wrap gap-3 text-xs">
          <Link
            href="/hs/admin/ops-tools/bulk-operations"
            className="inline-flex items-center rounded-md border border-white/20 px-3 py-1.5 font-semibold uppercase tracking-widest text-white/80 hover:bg-white/10"
          >
            Full bulk op history
          </Link>
          <Link
            href="/hs/admin/ops-tools/concierge-cohort"
            className="inline-flex items-center rounded-md border border-white/20 px-3 py-1.5 font-semibold uppercase tracking-widest text-white/80 hover:bg-white/10"
          >
            Concierge cohort dashboard
          </Link>
          <Link
            href="/hs/admin/audit"
            className="inline-flex items-center rounded-md border border-white/20 px-3 py-1.5 font-semibold uppercase tracking-widest text-white/80 hover:bg-white/10"
          >
            Admin audit log
          </Link>
        </div>

        {/* Recent bulk ops */}
        <section className="mt-10">
          <h2 className="font-display text-2xl text-white">
            Recent bulk operations
          </h2>
          <div className="mt-4 space-y-3">
            {recent.length === 0 ? (
              <p className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                No bulk operations recorded yet.
              </p>
            ) : (
              recent.map((op) => <BulkOperationCard key={op.id} op={op} />)
            )}
          </div>
        </section>

        {/* Retry guards */}
        <section className="mt-10">
          <h2 className="font-display text-2xl text-white">
            Retry guards (last 60 min)
          </h2>
          <p className="mt-1 text-sm text-white/60">
            Targets acted on recently via single-row or bulk flows.
            Re-running a bulk operation against any of these will record
            them as <code>skipped_retry_guard</code>.
          </p>
          <div className="mt-4">
            <RetryGuardStatus guards={guards} />
          </div>
        </section>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'warn' | 'err' | 'info';
}) {
  const border =
    tone === 'warn'
      ? 'border-amber-400/40'
      : tone === 'err'
        ? 'border-[var(--color-error,#DA2B57)]/40'
        : tone === 'info'
          ? 'border-[var(--accent-primary)]/40'
          : 'border-white/10';
  return (
    <div className={`rounded-xl border ${border} bg-white/5 px-4 py-3`}>
      <p className="text-[10px] uppercase tracking-widest text-white/40">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl text-white">{value}</p>
    </div>
  );
}
