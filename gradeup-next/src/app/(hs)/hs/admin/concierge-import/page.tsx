/**
 * /hs/admin/concierge-import — Batch list landing.
 *
 * Admin-only. Lists all concierge import batches in reverse-chronological
 * order with status + row counts. Primary CTA is "New import" which
 * routes to the upload page.
 *
 * Gated via profiles.role='admin'. Non-admins get a 404 to avoid leaking
 * the existence of the admin surface.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { listBatches, type BatchSummary } from '@/lib/hs-nil/concierge-import';

export const metadata: Metadata = {
  title: 'Concierge import — GradeUp HS admin',
  description:
    'Bulk CSV import of hand-sourced pilot parent+athlete cohorts.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso ?? '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadge(status: string): string {
  switch (status) {
    case 'completed':
      return 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10';
    case 'partial_failure':
      return 'border-amber-400/40 text-amber-200 bg-amber-500/10';
    case 'cancelled':
      return 'border-white/20 text-white/60 bg-white/5';
    case 'applying':
      return 'border-[var(--accent-primary)]/50 text-[var(--accent-primary)] bg-[var(--accent-primary)]/10';
    default:
      return 'border-white/20 text-white/80 bg-white/5';
  }
}

export default async function ConciergeImportLandingPage() {
  await requireAdminOr404();

  let batches: BatchSummary[] = [];
  let loadError: string | null = null;
  try {
    batches = await listBatches(100);
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Unable to load batches.';
  }

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
              HS-NIL · Concierge import
            </p>
            <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
              Bulk CSV import
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/60">
              Upload a CSV of hand-sourced parent+athlete pairs, review
              per-row validation, then apply. Per-row atomic — a failure
              on row 5 doesn&rsquo;t block rows 6-20.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="/docs/HS-NIL-CONCIERGE-IMPORT-TEMPLATE.csv"
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              download
            >
              Download CSV template
            </a>
            <Link
              href="/hs/admin/concierge-import/new"
              className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              New import
            </Link>
          </div>
        </header>

        {loadError && (
          <div
            role="alert"
            className="mt-8 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {loadError}
          </div>
        )}

        <section className="mt-10 rounded-xl border border-white/10 bg-white/5">
          <header className="flex items-baseline justify-between border-b border-white/10 px-5 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/80">
              Recent batches
            </h2>
            <span className="text-xs text-white/50">{batches.length} total</span>
          </header>

          {batches.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-white/50">
              No imports yet. Start with the CSV template above and upload your
              first cohort.
            </p>
          ) : (
            <ul className="divide-y divide-white/10">
              {batches.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">
                      <span className={['mr-2 inline-block rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest', statusBadge(b.status)].join(' ')}>
                        {b.status.replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono text-xs text-white/60">{b.pilotStateCode}</span>{' '}
                      · {b.filename}
                    </p>
                    <p className="mt-0.5 text-xs text-white/50">
                      {b.rowCount} rows · {b.succeededCount} applied · {b.failedCount} failed · uploaded {fmtDate(b.createdAt)}
                      {b.completedAt ? ` · completed ${fmtDate(b.completedAt)}` : ''}
                    </p>
                  </div>
                  <Link
                    href={`/hs/admin/concierge-import/${b.id}`}
                    className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-8 text-xs text-white/40">
          <Link
            href="/hs/admin"
            className="underline decoration-white/30 underline-offset-2 hover:text-white/60"
          >
            Back to ops dashboard
          </Link>
        </p>
      </section>
    </main>
  );
}
