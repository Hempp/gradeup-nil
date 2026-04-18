/**
 * /hs/admin/disputes — Ops queue for open + under-review deal disputes.
 *
 * Server Component, admin-gated (404 for non-admins). Reads via the
 * service-role helper since deal_disputes' user-level RLS doesn't expose
 * the full fleet to admins via the auth client; the service layer is the
 * single write + privileged-read surface.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  listOpenDisputes,
  type OpenDisputeSummary,
  type DisputePriority,
} from '@/lib/hs-nil/disputes';

export const metadata: Metadata = {
  title: 'Dispute queue — GradeUp HS ops',
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

const PRIORITY_TONE: Record<DisputePriority, string> = {
  urgent:
    'border-[var(--color-error,#DA2B57)]/60 text-[var(--color-error,#DA2B57)]',
  high: 'border-amber-400/60 text-amber-200',
  standard: 'border-white/30 text-white/80',
  low: 'border-white/20 text-white/60',
};

function fmtAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'just now';
  const minutes = Math.floor(ms / (60 * 1000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function renderRow(row: OpenDisputeSummary) {
  const counterparties = [row.athlete_name, row.brand_name]
    .filter((s): s is string => Boolean(s && s.trim()))
    .join(' \u00d7 ');
  return (
    <li
      key={row.id}
      className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-[var(--accent-primary)]/40"
    >
      <Link
        href={`/hs/admin/disputes/${row.id}`}
        className="flex flex-wrap items-start justify-between gap-3"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {row.deal_title}
          </p>
          <p className="mt-1 text-xs text-white/60">
            {counterparties || 'Unknown parties'}
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-widest text-white/50">
            Raised by {row.raised_by_role} &middot;{' '}
            {row.reason_category.replace(/_/g, ' ')} &middot; {row.status}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={[
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest',
              PRIORITY_TONE[row.priority],
            ].join(' ')}
          >
            {row.priority}
          </span>
          <span className="text-[11px] text-white/50">
            {fmtAge(row.created_at)} old
          </span>
        </div>
      </Link>
    </li>
  );
}

export default async function AdminDisputesPage() {
  await requireAdminOr404();

  let rows: OpenDisputeSummary[] = [];
  try {
    rows = await listOpenDisputes();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hs-admin/disputes] list failed', err);
  }

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 pt-12 pb-6">
        <Link
          href="/hs/admin"
          className="inline-flex min-h-[44px] items-center text-sm text-white/70 hover:text-white"
        >
          ← Back to ops dashboard
        </Link>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          HS-NIL · Disputes
        </p>
        <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
          Open dispute queue
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/60">
          {rows.length === 0
            ? 'No disputes currently need mediation.'
            : `${rows.length} open or under-review dispute${rows.length === 1 ? '' : 's'}. Sorted by priority, then age (oldest first).`}
        </p>

        {rows.length > 0 && (
          <ul className="mt-8 space-y-3">{rows.map(renderRow)}</ul>
        )}
      </section>
    </main>
  );
}
