/**
 * /hs/admin/state-ad-digest — Admin dashboard for the weekly state-AD
 * compliance digest email.
 *
 * Shows every active assignment with digest preferences + last send
 * timestamp and a "Force send now" action per row. Write action routes
 * through /api/hs/admin/actions/state-ad-digest-send which writes
 * admin_audit_log.
 *
 * Admin-gated. Non-admins 404 (mirrors every other admin page).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listAllAssignmentsForAdmin } from '@/lib/hs-nil/state-ad-digest';
import { AdminActionButton } from '@/components/hs/AdminActionButton';

export const metadata: Metadata = {
  title: 'State-AD digest — GradeUp HS ops',
  description:
    'Admin controls for the weekly state-AD compliance digest email: delivery history, opt-in status, force-send.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DOW_LABELS: Record<number, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

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

function fmtDate(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Never';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
}

function sendHistorySignal(iso: string | null): {
  label: string;
  tone: 'ok' | 'stale' | 'never';
} {
  if (!iso) return { label: 'Never sent', tone: 'never' };
  const days = daysSince(iso);
  if (days === null) return { label: 'Never sent', tone: 'never' };
  if (days <= 8) return { label: `Last sent ${days}d ago`, tone: 'ok' };
  return { label: `Stale · ${days}d ago`, tone: 'stale' };
}

export default async function StateAdDigestAdminPage() {
  await requireAdminOr404();

  const assignments = await listAllAssignmentsForAdmin();
  const enabledCount = assignments.filter((a) => a.digestEnabled).length;
  const disabledCount = assignments.length - enabledCount;
  const withEmail = assignments.filter((a) => a.contactEmail).length;

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <nav
          aria-label="Breadcrumb"
          className="text-xs uppercase tracking-widest text-white/50"
        >
          <Link href="/hs/admin" className="hover:text-white">
            Ops dashboard
          </Link>
          <span className="mx-2 text-white/30">/</span>
          <span className="text-white/80">State-AD digest</span>
        </nav>

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Weekly compliance digest
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            State-AD digest delivery
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-white/60">
            The weekly compliance digest fans out from{' '}
            <code className="rounded bg-white/10 px-1">/api/cron/hs-state-ad-digest</code>{' '}
            daily at 09:00 UTC. Each AD picks their own day-of-week via portal
            settings; a 6-day idempotency window prevents double-sends. States
            with zero activity for the week are skipped automatically.
          </p>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          <SummaryCard label="Active assignments" value={assignments.length} />
          <SummaryCard label="Digest opt-in" value={enabledCount} />
          <SummaryCard label="Opted out" value={disabledCount} />
          <SummaryCard label="Emails on file" value={withEmail} />
        </div>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-white">
            Assignments ({assignments.length})
          </h2>
          {assignments.length === 0 ? (
            <p className="mt-4 rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
              No active state-AD assignments. Send an invitation from{' '}
              <Link
                href="/hs/admin/state-ads"
                className="underline decoration-white/40 hover:text-white"
              >
                /hs/admin/state-ads
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {assignments.map((a) => {
                const sendSig = sendHistorySignal(a.digestLastSentAt);
                const confirmDesc = a.digestEnabled
                  ? `Force-send now. Bypasses the normal 6-day window and the empty-week suppression rule. Writes an admin_audit_log row. Recipient: ${a.contactEmail ?? '(no email on file)'}.`
                  : `This AD has opted out of the weekly digest. Force-sending is still allowed but the opt-out remains — future weekly runs will continue to skip this assignment until re-enabled. Recipient: ${a.contactEmail ?? '(no email on file)'}.`;

                return (
                  <li
                    key={a.assignmentId}
                    className="rounded-xl border border-white/10 bg-white/5 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="font-display text-xl text-white">
                            {a.stateCode}
                          </p>
                          <span className="truncate text-sm text-white/80">
                            {a.organizationName}
                          </span>
                          <DigestEnabledChip enabled={a.digestEnabled} />
                          <SendToneChip tone={sendSig.tone} label={sendSig.label} />
                        </div>
                        <dl className="mt-3 grid grid-cols-1 gap-3 text-xs text-white/60 md:grid-cols-3">
                          <div>
                            <dt className="uppercase tracking-widest text-white/40">
                              Preferred day
                            </dt>
                            <dd className="mt-0.5 font-mono text-white/85">
                              {DOW_LABELS[a.digestDayOfWeek] ?? '—'}
                            </dd>
                          </div>
                          <div>
                            <dt className="uppercase tracking-widest text-white/40">
                              Last sent
                            </dt>
                            <dd className="mt-0.5 font-mono text-white/85">
                              {fmtDate(a.digestLastSentAt)}
                            </dd>
                          </div>
                          <div>
                            <dt className="uppercase tracking-widest text-white/40">
                              Contact email
                            </dt>
                            <dd className="mt-0.5 truncate font-mono text-white/85">
                              {a.contactEmail ?? '(resolved from auth.users at send)'}
                            </dd>
                          </div>
                        </dl>
                      </div>
                      <div className="shrink-0">
                        <AdminActionButton
                          label="Force send now"
                          tone="primary"
                          confirmTitle={`Send digest to ${a.organizationName}?`}
                          confirmDescription={confirmDesc}
                          endpoint="/api/hs/admin/actions/state-ad-digest-send"
                          payload={{ assignmentId: a.assignmentId }}
                          submitLabel="Send digest"
                          ariaLabel={`Force send digest for ${a.organizationName}`}
                          requireReason
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="mt-10 text-xs text-white/40">
          Cron:{' '}
          <code className="rounded bg-white/10 px-1">0 9 * * *</code> (09:00 UTC
          daily) · Idempotency window: 6 days · Empty-week suppression: on ·
          Audit action:{' '}
          <code className="rounded bg-white/10 px-1">state_ad_digest_force_sent</code>
          {' · '}
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

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-[10px] uppercase tracking-widest text-white/50">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl text-white">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function DigestEnabledChip({ enabled }: { enabled: boolean }) {
  if (enabled) {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-200">
        Subscribed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/70">
      Opted out
    </span>
  );
}

function SendToneChip({
  tone,
  label,
}: {
  tone: 'ok' | 'stale' | 'never';
  label: string;
}) {
  const styles: Record<typeof tone, string> = {
    ok: 'border-sky-400/40 bg-sky-400/10 text-sky-200',
    stale: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
    never: 'border-white/20 bg-white/5 text-white/60',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${styles[tone]}`}
    >
      {label}
    </span>
  );
}
