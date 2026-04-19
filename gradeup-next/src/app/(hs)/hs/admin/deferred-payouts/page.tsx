/**
 * /hs/admin/deferred-payouts — Escrow-until-18 ops queue.
 *
 * Lists every hs_deferred_payouts row grouped by status. The primary
 * population is TX athletes whose compensation is held in trust until
 * their 18th birthday, but the page is state-agnostic — any future
 * paymentDeferredUntilAge18 state will show up here.
 *
 * Admin-gated via profiles.role = 'admin' (404 otherwise — same pattern
 * as the other /hs/admin/* pages). Filters by release window via the
 * `window` query param ('overdue' | 'next-30-days' | 'all'). Default
 * shows overdue + the next 30 days.
 *
 * Action buttons (force release / forfeit) post to
 * /api/hs/admin/actions/deferred-release which records an
 * admin_audit_log entry with the required reason.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DeferredPayoutsAdminPanel } from '@/components/hs/DeferredPayoutsAdminPanel';

export const metadata: Metadata = {
  title: 'Deferred payouts — GradeUp HS',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function requireAdminOr404() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || profile.role !== 'admin') notFound();
}

interface DeferredRow {
  id: string;
  deal_id: string;
  athlete_user_id: string;
  parent_profile_id: string;
  amount_cents: number;
  state_code: string;
  deferral_reason: string;
  release_eligible_at: string;
  status: string;
  released_at: string | null;
  released_transfer_id: string | null;
  forfeiture_reason: string | null;
  trust_account_identifier: string | null;
  created_at: string;
}

type WindowFilter = 'overdue' | 'next-30-days' | 'all';

interface PageProps {
  searchParams?: Promise<{
    window?: string;
    state?: string;
  }>;
}

export default async function AdminDeferredPayoutsPage(props: PageProps) {
  await requireAdminOr404();

  const sp = (await props.searchParams) ?? {};
  const windowFilter: WindowFilter =
    sp.window === 'all'
      ? 'all'
      : sp.window === 'overdue'
        ? 'overdue'
        : 'next-30-days';
  const stateFilter = sp.state?.toUpperCase().slice(0, 2) || null;

  const supabase = await createClient();

  let rows: DeferredRow[] = [];
  try {
    let query = supabase
      .from('hs_deferred_payouts')
      .select(
        'id, deal_id, athlete_user_id, parent_profile_id, amount_cents, state_code, deferral_reason, release_eligible_at, status, released_at, released_transfer_id, forfeiture_reason, trust_account_identifier, created_at',
      )
      .order('release_eligible_at', { ascending: true })
      .limit(500);

    if (stateFilter) {
      query = query.eq('state_code', stateFilter);
    }

    const nowIso = new Date().toISOString();
    if (windowFilter === 'overdue') {
      query = query.lte('release_eligible_at', nowIso).eq('status', 'holding');
    } else if (windowFilter === 'next-30-days') {
      const thirtyDaysOut = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString();
      query = query.lte('release_eligible_at', thirtyDaysOut);
    }

    const { data, error } = await query;
    if (error) throw error;
    rows = (data as unknown as DeferredRow[]) ?? [];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-admin/deferred-payouts] query failed', err);
  }

  const holding = rows.filter((r) => r.status === 'holding');
  const released = rows.filter((r) => r.status === 'released');
  const forfeited = rows.filter((r) => r.status === 'forfeited');
  const refunded = rows.filter((r) => r.status === 'refunded_to_brand');

  const now = Date.now();
  const overdue = holding.filter(
    (r) => new Date(r.release_eligible_at).getTime() <= now,
  );
  const upcoming = holding.filter(
    (r) => new Date(r.release_eligible_at).getTime() > now,
  );

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
          <span className="text-white/80">Deferred payouts</span>
        </nav>

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Escrow-until-18 · Ops queue
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Deferred custodial payouts
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            TX UIL (and any future state with{' '}
            <code className="rounded bg-white/10 px-1">
              paymentDeferredUntilAge18
            </code>
            ) requires athlete NIL compensation to be held in custodial trust
            until the athlete&rsquo;s 18th birthday. The daily release cron
            moves these to the parent Connect account automatically; this
            page is the escape hatch for force-release, forfeiture, or
            dispute review.
          </p>
        </header>

        <aside className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/5 p-5 text-sm text-white/80">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-200">
            Cron schedule
          </p>
          <p className="mt-2">
            <code>/api/cron/hs-deferred-releases</code> runs daily at 10:00 UTC
            (5:00 AM ET). Rows are batched 100 per run. Force-release
            bypasses the date check; forfeiture leaves funds in the shared
            trust account for out-of-band ops resolution.
          </p>
        </aside>

        <nav
          aria-label="Window filter"
          className="mt-6 flex flex-wrap gap-2 text-xs uppercase tracking-widest"
        >
          <Link
            href="/hs/admin/deferred-payouts?window=overdue"
            className={`rounded-full border px-3 py-1 ${
              windowFilter === 'overdue'
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-white/20 text-white/60 hover:text-white'
            }`}
          >
            Overdue ({overdue.length})
          </Link>
          <Link
            href="/hs/admin/deferred-payouts?window=next-30-days"
            className={`rounded-full border px-3 py-1 ${
              windowFilter === 'next-30-days'
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-white/20 text-white/60 hover:text-white'
            }`}
          >
            Next 30 days
          </Link>
          <Link
            href="/hs/admin/deferred-payouts?window=all"
            className={`rounded-full border px-3 py-1 ${
              windowFilter === 'all'
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-white/20 text-white/60 hover:text-white'
            }`}
          >
            All
          </Link>
        </nav>

        <section className="mt-10 space-y-10">
          <DeferredPayoutsAdminPanel
            title={`Overdue release (${overdue.length})`}
            tone="error"
            rows={overdue}
            emptyCopy="No overdue deferrals — cron is keeping up."
          />
          <DeferredPayoutsAdminPanel
            title={`Holding — upcoming (${upcoming.length})`}
            tone="default"
            rows={upcoming}
            emptyCopy="No upcoming deferrals in this window."
          />
          {windowFilter === 'all' && (
            <>
              <DeferredPayoutsAdminPanel
                title={`Released (${released.length})`}
                tone="success"
                rows={released}
                emptyCopy="No released deferrals yet."
                readOnly
              />
              <DeferredPayoutsAdminPanel
                title={`Forfeited (${forfeited.length})`}
                tone="warn"
                rows={forfeited}
                emptyCopy="No forfeitures recorded."
                readOnly
              />
              <DeferredPayoutsAdminPanel
                title={`Refunded to brand (${refunded.length})`}
                tone="warn"
                rows={refunded}
                emptyCopy="No brand refunds."
                readOnly
              />
            </>
          )}
        </section>
      </section>
    </main>
  );
}
