/**
 * /hs/admin/transitions — ops queue for pending bracket transitions.
 *
 * Sorted by requested_at ASC (oldest-first; fairness). Each row links to
 * the detail page where the admin can actually verify/deny.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { listPendingTransitions } from '@/lib/hs-nil/transitions';

export const metadata: Metadata = {
  title: 'Transitions queue — GradeUp HS Admin',
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

function fmt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function daysAgo(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
}

export default async function AdminTransitionsPage() {
  await requireAdminOr404();

  let rows: Awaited<ReturnType<typeof listPendingTransitions>> = [];
  try {
    rows = await listPendingTransitions(100);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-admin/transitions] query failed', err);
  }

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
          <span className="text-white/80">Bracket transitions</span>
        </nav>

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            HS → College · Ops queue
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Pending bracket transitions
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Oldest requests first. Verify only when enrollment proof is on
            file and matches the claimed college.
          </p>
        </header>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-white">
            Pending ({rows.length})
          </h2>
          <div className="mt-4">
            {rows.length === 0 ? (
              <p className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                No pending transitions right now.
              </p>
            ) : (
              <ul className="space-y-3">
                {rows.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-widest text-amber-200">
                          Pending · {daysAgo(row.requested_at)}d
                        </p>
                        <p className="mt-1 text-sm text-white">
                          <strong>{row.college_name}</strong>,{' '}
                          {row.college_state} · {row.ncaa_division}
                        </p>
                        <p className="mt-0.5 text-xs text-white/60">
                          Athlete{' '}
                          <span className="font-mono text-white/80">
                            {row.athlete_user_id.slice(0, 8)}
                          </span>
                          {' · '}
                          matriculation{' '}
                          {row.matriculation_date}
                          {' · '}
                          proof{' '}
                          {row.enrollment_proof_storage_path
                            ? 'on file'
                            : 'not yet uploaded'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs text-white/60">
                          {fmt(row.requested_at)}
                        </span>
                        <Link
                          href={`/hs/admin/transitions/${row.id}`}
                          className="inline-flex min-h-[44px] items-center rounded-md border border-[var(--accent-primary)]/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10"
                        >
                          Review →
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
