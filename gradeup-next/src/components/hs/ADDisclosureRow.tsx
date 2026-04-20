/**
 * ADDisclosureRow — compact row for the AD's disclosure list.
 *
 * Server-safe. Shows disclosure status, anonymised athlete, recipient,
 * scheduled/sent timestamps, and a payload preview (no PII).
 */

import type { AdDisclosureRow as AdDisclosureRowData } from '@/lib/hs-nil/state-ad-portal';

export interface ADDisclosureRowProps {
  row: AdDisclosureRowData;
}

function statusTone(status: string): string {
  if (status === 'sent') return 'text-emerald-200 border-emerald-400/40 bg-emerald-400/10';
  if (status === 'failed') return 'text-[var(--color-error,#DA2B57)] border-[var(--color-error,#DA2B57)]/40 bg-[var(--color-error,#DA2B57)]/10';
  if (status === 'pending') return 'text-amber-200 border-amber-400/40 bg-amber-400/10';
  return 'text-white/70 border-white/20 bg-white/5';
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ADDisclosureRow({ row }: ADDisclosureRowProps) {
  return (
    <li className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            {row.athleteAnon}
            {row.athleteSchool ? ` · ${row.athleteSchool}` : ''}
          </p>
          <p className="mt-0.5 text-xs text-white/60">
            Recipient: {row.recipient}
          </p>
          {row.payloadPreview ? (
            <p className="mt-1 text-xs text-white/50">
              {row.payloadPreview}
            </p>
          ) : null}
          {row.failureReason ? (
            <p className="mt-2 rounded-md border border-[var(--color-error,#DA2B57)]/30 bg-[var(--color-error,#DA2B57)]/5 px-3 py-2 text-xs text-[var(--color-error,#DA2B57)]">
              <span className="font-semibold">Failed:</span> {row.failureReason}
            </p>
          ) : null}
        </div>
        <span
          className={[
            'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest',
            statusTone(row.status),
          ].join(' ')}
        >
          {row.status}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-white/70">
        <div>
          <dt className="text-[10px] uppercase tracking-widest text-white/40">
            Scheduled
          </dt>
          <dd className="mt-0.5 font-mono text-white/80">
            {fmt(row.scheduledFor)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-widest text-white/40">
            Sent
          </dt>
          <dd className="mt-0.5 font-mono text-white/80">{fmt(row.sentAt)}</dd>
        </div>
      </dl>
    </li>
  );
}

export default ADDisclosureRow;
