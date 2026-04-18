/**
 * /hs/admin/disclosures — Ops listing for failed + overdue-pending disclosures.
 *
 * Read-only in this pass. Write actions (manual retry, mark-as-sent, etc.)
 * are TODO for Phase 6 — they're called out in the "what to do next" block
 * and in each row. We also surface overdue-but-still-pending rows because
 * those indicate the cron worker didn't pick them up (also ops-worthy).
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AdminActionButton } from '@/components/hs/AdminActionButton';

export const metadata: Metadata = {
  title: 'Disclosure ops — GradeUp HS',
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

interface DisclosureRow {
  id: string;
  deal_id: string;
  athlete_user_id: string;
  state_code: string;
  scheduled_for: string;
  sent_at: string | null;
  recipient: string;
  status: string;
  failure_reason: string | null;
  created_at: string;
}

async function safeFetch<T>(
  label: string,
  fn: () => Promise<T[]>
): Promise<T[]> {
  try {
    return await fn();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[hs-admin/disclosures] ${label} failed`, err);
    return [];
  }
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

export default async function AdminDisclosuresPage() {
  await requireAdminOr404();

  const supabase = await createClient();
  const failed = await safeFetch<DisclosureRow>('failed', async () => {
    const { data, error } = await supabase
      .from('hs_deal_disclosures')
      .select(
        'id, deal_id, athlete_user_id, state_code, scheduled_for, sent_at, recipient, status, failure_reason, created_at'
      )
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as DisclosureRow[];
  });

  const overduePending = await safeFetch<DisclosureRow>(
    'overdue_pending',
    async () => {
      const { data, error } = await supabase
        .from('hs_deal_disclosures')
        .select(
          'id, deal_id, athlete_user_id, state_code, scheduled_for, sent_at, recipient, status, failure_reason, created_at'
        )
        .eq('status', 'pending')
        .lt('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as DisclosureRow[];
    }
  );

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <AdminBreadcrumb label="Disclosures" />
        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Compliance · Ops queue
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Disclosure failures
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Outbound disclosures that didn&rsquo;t reach the state athletic
            association or the school. Read-only surface — resolution steps
            below.
          </p>
        </header>

        <NextStepsBlock title="What to do next">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Review the <code>failure_reason</code>. Network blips usually
              self-heal on the next cron tick.
            </li>
            <li>
              Persistent failures usually mean the state recipient endpoint
              changed — update{' '}
              <code>src/lib/hs-nil/disclosure-recipients.ts</code> and
              redeploy.
            </li>
            <li>
              Use the <strong>Retry</strong> button on a failed row to
              re-queue a new <code>pending</code> disclosure (scheduled
              10 minutes out). The original failed row stays in place as
              history. Every retry is captured in the admin audit log.
            </li>
          </ol>
        </NextStepsBlock>

        <Section title={`Failed (${failed.length})`}>
          {failed.length === 0 ? (
            <EmptyState>No failed disclosures.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {failed.map((row) => (
                <DisclosureRowCard key={row.id} row={row} tone="error" />
              ))}
            </ul>
          )}
        </Section>

        <Section title={`Pending but overdue (${overduePending.length})`}>
          <p className="-mt-3 mb-3 text-sm text-white/50">
            These were scheduled earlier than now but never transitioned to{' '}
            <code>sent</code>. Either the cron is behind or the job crashed.
          </p>
          {overduePending.length === 0 ? (
            <EmptyState>Nothing stuck in pending.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {overduePending.map((row) => (
                <DisclosureRowCard key={row.id} row={row} tone="warn" />
              ))}
            </ul>
          )}
        </Section>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Shared UI fragments (local to this file for now — keep them tight).
// ---------------------------------------------------------------------------

function AdminBreadcrumb({ label }: { label: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-xs uppercase tracking-widest text-white/50"
    >
      <Link href="/hs/admin" className="hover:text-white">
        Ops dashboard
      </Link>
      <span className="mx-2 text-white/30">/</span>
      <span className="text-white/80">{label}</span>
    </nav>
  );
}

function NextStepsBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <aside className="mt-6 rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 p-5 text-sm text-white/80">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
        {title}
      </p>
      <div className="mt-3">{children}</div>
    </aside>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
      {children}
    </p>
  );
}

function DisclosureRowCard({
  row,
  tone,
}: {
  row: DisclosureRow;
  tone: 'error' | 'warn';
}) {
  const border =
    tone === 'error'
      ? 'border-[var(--color-error,#DA2B57)]/40'
      : 'border-amber-400/40';
  const chipText =
    tone === 'error' ? 'text-[var(--color-error,#DA2B57)]' : 'text-amber-200';
  return (
    <li className={`rounded-xl border ${border} bg-white/5 p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-widest ${chipText}`}>
            {row.status} · {row.state_code} · {row.recipient}
          </p>
          <p className="mt-1 font-mono text-sm text-white/80">{row.id}</p>
        </div>
        <dl className="flex flex-wrap gap-4 text-xs text-white/60">
          <Fact label="Deal" value={row.deal_id.slice(0, 8)} />
          <Fact label="Athlete" value={row.athlete_user_id.slice(0, 8)} />
          <Fact label="Scheduled" value={fmt(row.scheduled_for)} />
          <Fact label="Created" value={fmt(row.created_at)} />
        </dl>
      </div>
      {row.failure_reason ? (
        <p className="mt-3 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/70">
          <span className="font-semibold text-white/80">Reason:</span>{' '}
          {row.failure_reason}
        </p>
      ) : null}
      {tone === 'error' ? (
        <div className="mt-3">
          <AdminActionButton
            label="Retry"
            confirmTitle={`Retry disclosure for deal ${row.deal_id.slice(0, 8)}?`}
            confirmDescription="Inserts a new pending row scheduled 10 minutes out. The old failed row stays as history."
            endpoint="/api/hs/admin/actions/disclosure-retry"
            payload={{ dealId: row.deal_id }}
            submitLabel="Re-queue disclosure"
            ariaLabel={`Retry disclosure ${row.id}`}
          />
        </div>
      ) : (
        <p className="mt-3 text-xs text-white/40">
          Pending-overdue rows re-drain automatically on the next cron tick.
        </p>
      )}
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
