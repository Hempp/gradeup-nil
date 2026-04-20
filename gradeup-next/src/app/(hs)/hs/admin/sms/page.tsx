/**
 * /hs/admin/sms — Twilio SMS fallback dashboard (Phase 17)
 *
 * Ops surface for the parent-consent SMS fallback. Admin-only; non-admins
 * 404 to avoid leaking the route. Shows today's delivery stats plus the
 * last 50 SMS rows with recipient mask, kind, status, and the first 80
 * chars of the body (privacy — full body only via DB).
 *
 * Read-only for now; the single write action is force-resend via the
 * AdminActionButton -> /api/hs/admin/actions/sms-force-send endpoint,
 * which writes an admin_audit_log row.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  countSmsSentToday,
  listRecentSmsMessages,
  type SmsMessageRow,
} from '@/lib/hs-nil/sms';
import { AdminActionButton } from '@/components/hs/AdminActionButton';

export const metadata: Metadata = {
  title: 'SMS ops — GradeUp HS',
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

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 4) return raw;
  return `***-***-${digits.slice(-4)}`;
}

function truncateBody(body: string, limit = 80): string {
  if (!body) return '';
  return body.length > limit ? `${body.slice(0, limit)}…` : body;
}

function statusTone(status: SmsMessageRow['status']): {
  border: string;
  text: string;
  label: string;
} {
  switch (status) {
    case 'sent':
      return {
        border: 'border-emerald-400/40',
        text: 'text-emerald-200',
        label: 'sent',
      };
    case 'sending':
    case 'queued':
      return {
        border: 'border-amber-400/40',
        text: 'text-amber-200',
        label: status,
      };
    case 'failed':
      return {
        border: 'border-[var(--color-error,#DA2B57)]/50',
        text: 'text-[var(--color-error,#DA2B57)]',
        label: 'failed',
      };
    case 'undeliverable':
    default:
      return {
        border: 'border-white/20',
        text: 'text-white/60',
        label: 'undeliverable',
      };
  }
}

export default async function AdminSmsPage() {
  await requireAdminOr404();

  const [stats, rows] = await Promise.all([
    countSmsSentToday(),
    listRecentSmsMessages(50),
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
          <span className="text-white/80">SMS</span>
        </nav>

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Consent fallback · Twilio
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Parent SMS queue
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Outbound SMS fallbacks tied to parental-consent flows. Every
            attempt lands here regardless of outcome. Recipient phone and
            body are truncated — full body is DB-only.
          </p>
        </header>

        {/* Today stats */}
        <dl
          aria-label="SMS delivery stats today (UTC)"
          className="mt-8 grid gap-3 sm:grid-cols-4"
        >
          <StatCard label="Sent / sending" value={stats.sent} tone="ok" />
          <StatCard label="Failed" value={stats.failed} tone="warn" />
          <StatCard
            label="Undeliverable"
            value={stats.undeliverable}
            tone="error"
          />
          <StatCard label="Total today" value={stats.total} tone="neutral" />
        </dl>

        <aside className="mt-6 rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 p-5 text-sm text-white/80">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Operator notes
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>
              In production with no <code>SMS_PROVIDER</code> env var set, the
              service fails closed — no silent drops.
            </li>
            <li>
              Failed rows with <code>retries_remaining &gt; 0</code> are
              auto-retried every 15 min by{' '}
              <code>/api/cron/hs-sms-worker</code>.
            </li>
            <li>
              Force-resend uses the same provider and writes an{' '}
              <code>admin_audit_log</code> row.
            </li>
          </ul>
        </aside>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-white">
            Last {rows.length} messages
          </h2>
          <div className="mt-4">
            {rows.length === 0 ? (
              <p className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                No SMS attempts on record yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {rows.map((row) => {
                  const tone = statusTone(row.status);
                  return (
                    <li
                      key={row.id}
                      className={`rounded-xl border ${tone.border} bg-white/5 p-4`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-semibold uppercase tracking-widest ${tone.text}`}
                          >
                            {tone.label} · {row.kind} ·{' '}
                            {maskPhone(row.recipient_phone)}
                          </p>
                          <p className="mt-1 font-mono text-xs text-white/70">
                            {row.id}
                          </p>
                        </div>
                        <dl className="flex flex-wrap gap-4 text-xs text-white/60">
                          <Fact label="Twilio SID" value={row.twilio_sid ?? '—'} />
                          <Fact
                            label="Retries left"
                            value={String(row.retries_remaining)}
                          />
                          <Fact label="Created" value={fmt(row.created_at)} />
                          <Fact label="Sent" value={fmt(row.sent_at)} />
                        </dl>
                      </div>

                      <p className="mt-3 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/80">
                        {truncateBody(row.body_text)}
                      </p>

                      {row.error_message ? (
                        <p className="mt-2 text-xs text-[var(--color-error,#DA2B57)]">
                          <span className="font-semibold">Error:</span>{' '}
                          {row.error_code ? `[${row.error_code}] ` : ''}
                          {truncateBody(row.error_message, 200)}
                        </p>
                      ) : null}

                      {row.status === 'failed' ||
                      row.status === 'undeliverable' ? (
                        <div className="mt-3">
                          <AdminActionButton
                            label="Force resend"
                            confirmTitle={`Force-resend SMS ${row.id.slice(0, 8)}?`}
                            confirmDescription="Creates a fresh attempt using the current provider configuration. Writes to admin_audit_log."
                            endpoint="/api/hs/admin/actions/sms-force-send"
                            payload={{ messageId: row.id }}
                            submitLabel="Force resend"
                            ariaLabel={`Force resend SMS ${row.id}`}
                          />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'ok' | 'warn' | 'error' | 'neutral';
}) {
  const toneClass =
    tone === 'ok'
      ? 'border-emerald-400/30 text-emerald-200'
      : tone === 'warn'
        ? 'border-amber-400/30 text-amber-200'
        : tone === 'error'
          ? 'border-[var(--color-error,#DA2B57)]/40 text-[var(--color-error,#DA2B57)]'
          : 'border-white/10 text-white';
  return (
    <div
      className={`rounded-xl border bg-white/5 p-4 ${toneClass}`}
      role="group"
    >
      <dt className="text-[10px] uppercase tracking-widest text-white/40">
        {label}
      </dt>
      <dd className="mt-1 font-display text-3xl tabular-nums">{value}</dd>
    </div>
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
