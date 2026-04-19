/**
 * BulkOperationCard — single admin_bulk_operations row display.
 *
 * Shows the headline (op type, status, counts), the reason, and an
 * expandable per-item summary for partial_failure / failed runs.
 */

import type { BulkOperationRecord } from '@/lib/hs-nil/bulk-actions';

const OP_LABELS: Record<string, string> = {
  bulk_disclosure_retry: 'Bulk disclosure retry',
  bulk_payout_resolve: 'Bulk payout resolve',
  bulk_link_force_verify: 'Bulk link force-verify',
  bulk_consent_renewal_nudge: 'Bulk consent nudge',
};

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

export function BulkOperationCard({
  op,
}: {
  op: BulkOperationRecord;
}) {
  const tone =
    op.status === 'completed'
      ? 'border-emerald-400/40'
      : op.status === 'partial_failure'
        ? 'border-amber-400/40'
        : op.status === 'running'
          ? 'border-white/20'
          : 'border-[var(--color-error,#DA2B57)]/40';

  const chipTone =
    op.status === 'completed'
      ? 'text-emerald-200'
      : op.status === 'partial_failure'
        ? 'text-amber-200'
        : op.status === 'running'
          ? 'text-white/70'
          : 'text-[var(--color-error,#DA2B57)]';

  const counts = op.summary?.counts ?? { ok: 0, skipped: 0, failed: 0 };
  const items = op.summary?.items ?? {};
  const hasDetail =
    op.status === 'partial_failure' ||
    op.status === 'failed' ||
    counts.skipped > 0;

  return (
    <article
      className={`rounded-xl border ${tone} bg-white/5 p-4 text-sm text-white/80`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className={`text-xs font-semibold uppercase tracking-widest ${chipTone}`}
          >
            {op.status.replace(/_/g, ' ')}
          </p>
          <h3 className="mt-1 font-display text-lg text-white">
            {OP_LABELS[op.operation_type] ?? op.operation_type}
          </h3>
          <p className="mt-1 text-xs text-white/50">
            {op.item_count} target{op.item_count === 1 ? '' : 's'} ·{' '}
            {fmt(op.created_at)}
            {op.completed_at ? ` → ${fmt(op.completed_at)}` : ''}
          </p>
        </div>
        <dl className="flex gap-3 text-xs">
          <Stat label="ok" value={counts.ok} />
          <Stat label="skipped" value={counts.skipped} />
          <Stat label="failed" value={counts.failed} />
        </dl>
      </header>

      <p className="mt-3 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/70">
        <span className="font-semibold text-white/80">Reason:</span>{' '}
        {op.reason}
      </p>

      {hasDetail ? (
        <details className="mt-3 text-xs text-white/70">
          <summary className="cursor-pointer text-white/80">
            Per-item detail ({Object.keys(items).length})
          </summary>
          <ul className="mt-2 max-h-72 space-y-1 overflow-auto">
            {Object.entries(items).map(([targetId, item]) => {
              const itemTone =
                item.status === 'ok'
                  ? 'text-emerald-200'
                  : item.status === 'skipped_retry_guard'
                    ? 'text-amber-200'
                    : 'text-[var(--color-error,#DA2B57)]';
              return (
                <li
                  key={targetId}
                  className="flex items-start justify-between gap-3 rounded-md border border-white/10 bg-black/40 px-2 py-1.5"
                >
                  <span className="font-mono text-[11px]">
                    {targetId.slice(0, 12)}
                  </span>
                  <span
                    className={`text-[11px] uppercase tracking-widest ${itemTone}`}
                  >
                    {item.status}
                  </span>
                  {item.error ? (
                    <span className="ml-auto truncate text-right text-[11px] text-white/60">
                      {item.error}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </details>
      ) : null}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/40 px-2 py-1">
      <dt className="text-[10px] uppercase tracking-widest text-white/40">
        {label}
      </dt>
      <dd className="font-display text-base text-white">{value}</dd>
    </div>
  );
}

export default BulkOperationCard;
