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
import { PayoutBulkPanel } from '@/components/hs/PayoutBulkPanel';

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
            <PayoutBulkPanel rows={failed} tone="error" sectionKey="failed" />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-white">
            Stuck pending ≥ 2d ({stuck.length})
          </h2>
          <div className="mt-4">
            <PayoutBulkPanel rows={stuck} tone="warn" sectionKey="stuck" />
          </div>
        </section>
      </section>
    </main>
  );
}

