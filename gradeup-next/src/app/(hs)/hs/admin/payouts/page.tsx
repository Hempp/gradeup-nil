/**
 * /hs/admin/payouts — Stuck + failed parent-custodial payouts.
 *
 * "Stuck" = status='pending' for more than 2 days without transitioning.
 * "Failed" = status='failed'.
 *
 * Read-only. Retry actions will land in Phase 6 alongside the broader
 * Stripe Connect admin UX.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AdminPayoutResolveDialog } from '@/components/hs/AdminPayoutResolveDialog';

export const metadata: Metadata = {
  title: 'Payout ops — GradeUp HS',
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

interface PayoutRow {
  id: string;
  deal_id: string;
  parent_profile_id: string;
  status: string;
  payout_amount: number;
  payout_currency: string;
  failed_reason: string | null;
  stripe_transfer_id: string | null;
  created_at: string;
  authorized_at: string | null;
  paid_at: string | null;
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
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

export default async function AdminPayoutsPage() {
  await requireAdminOr404();

  const supabase = await createClient();
  let rows: PayoutRow[] = [];
  try {
    const twoDaysAgo = new Date(
      Date.now() - 2 * 24 * 60 * 60 * 1000
    ).toISOString();
    const { data, error } = await supabase
      .from('hs_deal_parent_payouts')
      .select(
        'id, deal_id, parent_profile_id, status, payout_amount, payout_currency, failed_reason, stripe_transfer_id, created_at, authorized_at, paid_at'
      )
      .in('status', ['failed', 'pending'])
      .lt('created_at', twoDaysAgo)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    rows = (data ?? []) as PayoutRow[];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-admin/payouts] query failed', err);
  }

  const failed = rows.filter((r) => r.status === 'failed');
  const stuck = rows.filter((r) => r.status === 'pending');

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
          <span className="text-white/80">Payouts</span>
        </nav>

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Payments · Ops queue
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Parent payout queue
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Failed transfers and pending transfers that haven&rsquo;t moved
            in more than 2 days.
          </p>
        </header>

        <aside className="mt-6 rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 p-5 text-sm text-white/80">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            What to do next
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>
              For failed rows: open the Stripe dashboard with the{' '}
              <code>stripe_transfer_id</code>. Most failures are
              missing-payout-method or verification lapses on the parent
              Connect account.
            </li>
            <li>
              For stuck-pending rows: check whether the source brand funding
              cleared. If the deal completed but funding was delayed, the
              transfer will kick in automatically on next webhook.
            </li>
            <li>
              Use <strong>Mark resolved</strong> to record an out-of-band
              resolution. Pick <code>paid</code> for a manual ACH transfer,
              or <code>refunded</code> if the platform kept the money.
              A reference code (ACH confirmation / Stripe refund id /
              ticket id) and reason are required and land in the audit log.
            </li>
          </ol>
        </aside>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-white">
            Failed ({failed.length})
          </h2>
          <div className="mt-4">
            {failed.length === 0 ? (
              <p className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                No failed payouts.
              </p>
            ) : (
              <ul className="space-y-3">
                {failed.map((row) => (
                  <PayoutRowCard key={row.id} row={row} tone="error" />
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-white">
            Stuck pending ≥ 2d ({stuck.length})
          </h2>
          <div className="mt-4">
            {stuck.length === 0 ? (
              <p className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                No stuck pending payouts.
              </p>
            ) : (
              <ul className="space-y-3">
                {stuck.map((row) => (
                  <PayoutRowCard key={row.id} row={row} tone="warn" />
                ))}
              </ul>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function PayoutRowCard({
  row,
  tone,
}: {
  row: PayoutRow;
  tone: 'error' | 'warn';
}) {
  const border =
    tone === 'error'
      ? 'border-[var(--color-error,#DA2B57)]/40'
      : 'border-amber-400/40';
  const chipText =
    tone === 'error'
      ? 'text-[var(--color-error,#DA2B57)]'
      : 'text-amber-200';
  return (
    <li className={`rounded-xl border ${border} bg-white/5 p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-widest ${chipText}`}>
            {row.status} · {daysAgo(row.created_at)}d old
          </p>
          <p className="mt-1 text-lg text-white">
            {row.payout_amount.toFixed(2)}{' '}
            <span className="text-sm text-white/50">
              {row.payout_currency}
            </span>
          </p>
        </div>
        <dl className="flex flex-wrap gap-4 text-xs text-white/60">
          <Fact label="Payout" value={row.id.slice(0, 8)} />
          <Fact label="Deal" value={row.deal_id.slice(0, 8)} />
          <Fact label="Parent" value={row.parent_profile_id.slice(0, 8)} />
          <Fact
            label="Transfer"
            value={row.stripe_transfer_id ?? '—'}
          />
          <Fact label="Created" value={fmt(row.created_at)} />
          <Fact label="Authorized" value={fmt(row.authorized_at)} />
        </dl>
      </div>
      {row.failed_reason ? (
        <p className="mt-3 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/70">
          <span className="font-semibold text-white/80">Failure:</span>{' '}
          {row.failed_reason}
        </p>
      ) : null}
      <div className="mt-3">
        <AdminPayoutResolveDialog
          payoutId={row.id}
          payoutLabel={`${row.payout_amount.toFixed(2)} ${row.payout_currency}`}
        />
      </div>
    </li>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-white/40">
        {label}
      </dt>
      <dd className="font-mono text-white/80">{value}</dd>
    </div>
  );
}
