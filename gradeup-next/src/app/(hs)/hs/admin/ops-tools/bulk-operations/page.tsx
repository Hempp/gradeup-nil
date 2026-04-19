/**
 * /hs/admin/ops-tools/bulk-operations — Full history of bulk admin ops.
 *
 * Pagination is ?page=N (50/page). Each card shows the aggregate counts
 * and an expandable per-item summary (target id → status) for runs
 * with skips or failures.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { listBulkOperations } from '@/lib/hs-nil/bulk-actions';
import { BulkOperationCard } from '@/components/hs/BulkOperationCard';

export const metadata: Metadata = {
  title: 'Bulk operations — GradeUp HS',
};
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE_SIZE = 50;

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

export default async function BulkOperationsHistoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  await requireAdminOr404();

  const resolved = (await searchParams) ?? {};
  const pageNum = Math.max(1, Number.parseInt(resolved.page ?? '1', 10) || 1);
  const offset = (pageNum - 1) * PAGE_SIZE;

  let ops: Awaited<ReturnType<typeof listBulkOperations>> = [];
  try {
    ops = await listBulkOperations(PAGE_SIZE, offset);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-admin/ops-tools/bulk-operations] load failed', err);
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
          <Link
            href="/hs/admin/ops-tools"
            className="hover:text-white"
          >
            Ops tools
          </Link>
          <span className="mx-2 text-white/30">/</span>
          <span className="text-white/80">Bulk operations</span>
        </nav>

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Audit · Bulk operations
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Bulk operation history
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Every admin bulk run, newest first. Per-item results live on
            each row.
          </p>
        </header>

        <div className="mt-8 space-y-3">
          {ops.length === 0 ? (
            <p className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
              {pageNum === 1
                ? 'No bulk operations yet.'
                : 'No more results on this page.'}
            </p>
          ) : (
            ops.map((op) => <BulkOperationCard key={op.id} op={op} />)
          )}
        </div>

        <nav
          aria-label="Pagination"
          className="mt-8 flex items-center justify-between text-xs text-white/60"
        >
          <Link
            href={
              pageNum > 1
                ? `/hs/admin/ops-tools/bulk-operations?page=${pageNum - 1}`
                : '#'
            }
            aria-disabled={pageNum <= 1}
            className={[
              'inline-flex items-center rounded-md border border-white/20 px-3 py-1.5 font-semibold uppercase tracking-widest',
              pageNum > 1
                ? 'text-white/80 hover:bg-white/10'
                : 'cursor-not-allowed opacity-40',
            ].join(' ')}
          >
            ← Newer
          </Link>
          <span>Page {pageNum}</span>
          <Link
            href={`/hs/admin/ops-tools/bulk-operations?page=${pageNum + 1}`}
            className={[
              'inline-flex items-center rounded-md border border-white/20 px-3 py-1.5 font-semibold uppercase tracking-widest',
              ops.length === PAGE_SIZE
                ? 'text-white/80 hover:bg-white/10'
                : 'cursor-not-allowed opacity-40',
            ].join(' ')}
            aria-disabled={ops.length < PAGE_SIZE}
          >
            Older →
          </Link>
        </nav>
      </section>
    </main>
  );
}
