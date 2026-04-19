'use client';

/**
 * PayoutBulkPanel — client wrapper for /hs/admin/payouts rows.
 *
 * Payouts are the trickiest bulk action because each row carries its own
 * resolution decision + reference. The bulk dialog collects:
 *
 *   - ONE group-level decision (defaults to 'paid') applied to every
 *     selected payout that doesn't have its own per-row decision set.
 *   - ONE group-level reference input (same idea).
 *   - ONE group-level reason.
 *
 * In practice the operator resolves a batch where they already know the
 * decision is uniform ("these five all got manual ACH today"). For
 * mixed batches the operator can still fall through to per-row single
 * resolve via the existing AdminPayoutResolveDialog.
 */

import { useMemo, useState } from 'react';
import { AdminPayoutResolveDialog } from './AdminPayoutResolveDialog';
import { BulkActionBar } from './BulkActionBar';
import { BulkActionDialog } from './BulkActionDialog';

export interface PayoutBulkRow {
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

export function PayoutBulkPanel({
  rows,
  tone,
  sectionKey,
}: {
  rows: PayoutBulkRow[];
  tone: 'error' | 'warn';
  /** Stable key so two PayoutBulkPanels on the same page don't share state. */
  sectionKey: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [decision, setDecision] = useState<'paid' | 'refunded'>('paid');
  const [reference, setReference] = useState('');

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  const allVisibleSelected =
    rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggleAll() {
    if (allVisibleSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
        No rows.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <label className="inline-flex items-center gap-2 text-xs text-white/70">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={toggleAll}
            aria-label={`Select all ${sectionKey} payouts`}
          />
          Select all visible ({rows.length})
        </label>
      </div>

      <ul className="space-y-3">
        {rows.map((row) => (
          <PayoutRowCard
            key={row.id}
            row={row}
            tone={tone}
            checked={selected.has(row.id)}
            onToggle={() => toggleOne(row.id)}
          />
        ))}
      </ul>

      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelected(new Set())}
        onOpenDialog={() => setDialogOpen(true)}
        actionLabel="Bulk resolve"
      />

      {dialogOpen ? (
        <BulkActionDialog
          title="Bulk-resolve selected payouts"
          description={`Applies the chosen decision + reference to every selected payout. Each resolution is recorded individually in the audit log.`}
          count={selectedIds.length}
          submitLabel={`Mark ${selectedIds.length} ${decision}`}
          endpoint="/api/hs/admin/actions/bulk/payout-resolve"
          extraFields={() => (
            <div className="space-y-3">
              <fieldset>
                <legend className="text-[11px] font-semibold uppercase tracking-widest text-white/60">
                  Decision (applied to all selected)
                </legend>
                <div className="mt-2 flex gap-4 text-sm text-white/90">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name={`${sectionKey}-bulk-decision`}
                      value="paid"
                      checked={decision === 'paid'}
                      onChange={() => setDecision('paid')}
                    />
                    Paid (out-of-band)
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name={`${sectionKey}-bulk-decision`}
                      value="refunded"
                      checked={decision === 'refunded'}
                      onChange={() => setDecision('refunded')}
                    />
                    Refunded
                  </label>
                </div>
              </fieldset>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-white/60">
                  Reference code (applied to all selected)
                </span>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="ACH batch # / Stripe refund id / ticket id"
                  className="mt-1 block w-full rounded-md border border-white/20 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[var(--accent-primary)] focus:outline-none"
                />
              </label>
            </div>
          )}
          validateBeforeSubmit={() =>
            reference.trim().length === 0
              ? 'Reference is required.'
              : null
          }
          buildBody={(reason) => ({
            items: selectedIds.map((payoutId) => ({
              payoutId,
              decision,
              reference: reference.trim(),
              reason,
            })),
            groupReason: reason,
          })}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelected(new Set());
              setReference('');
            }
          }}
        />
      ) : null}
    </div>
  );
}

function PayoutRowCard({
  row,
  tone,
  checked,
  onToggle,
}: {
  row: PayoutBulkRow;
  tone: 'error' | 'warn';
  checked: boolean;
  onToggle: () => void;
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
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={checked}
          onChange={onToggle}
          aria-label={`Select payout ${row.id}`}
        />
        <div className="min-w-0 flex-1">
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
              <Fact label="Transfer" value={row.stripe_transfer_id ?? '—'} />
              <Fact label="Created" value={fmt(row.created_at)} />
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
        </div>
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

export default PayoutBulkPanel;
