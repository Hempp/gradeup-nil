'use client';

/**
 * DisclosureBulkPanel — client wrapper for the /hs/admin/disclosures
 * failed list. Renders each row with a checkbox, a "Select all visible"
 * control at the top, the floating BulkActionBar, and the retry dialog.
 *
 * The existing single-row AdminActionButton (retry) is preserved on each
 * row card so the operator can still act one-at-a-time if they prefer.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { AdminActionButton } from './AdminActionButton';
import { BulkActionBar } from './BulkActionBar';
import { BulkActionDialog } from './BulkActionDialog';

export interface DisclosureBulkRow {
  id: string;
  deal_id: string;
  athlete_user_id: string;
  state_code: string;
  scheduled_for: string;
  recipient: string;
  status: string;
  failure_reason: string | null;
  created_at: string;
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

export function DisclosureBulkPanel({
  rows,
}: {
  rows: DisclosureBulkRow[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);

  // Bulk op keys on deal_id (retryDisclosure resolves latest failed row
  // for the deal). Uniqueness matters because two failed rows on the same
  // deal should only retry once.
  const selectedDealIds = useMemo(() => {
    const out = new Set<string>();
    for (const row of rows) {
      if (selected.has(row.id)) out.add(row.deal_id);
    }
    return Array.from(out);
  }, [rows, selected]);

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
        No failed disclosures.
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
            aria-label="Select all visible disclosures"
          />
          Select all visible ({rows.length})
        </label>
      </div>

      <ul className="space-y-3">
        {rows.map((row) => (
          <DisclosureRowCard
            key={row.id}
            row={row}
            checked={selected.has(row.id)}
            onToggle={() => toggleOne(row.id)}
          />
        ))}
      </ul>

      <BulkActionBar
        selectedCount={selectedDealIds.length}
        onClear={() => setSelected(new Set())}
        onOpenDialog={() => setDialogOpen(true)}
        actionLabel="Bulk retry"
      />

      {dialogOpen ? (
        <BulkActionDialog
          title="Bulk-retry selected disclosures"
          description={`Re-queue ${selectedDealIds.length} disclosure${selectedDealIds.length === 1 ? '' : 's'} for their latest failure. Deals retried in the last 10 minutes will be skipped.`}
          count={selectedDealIds.length}
          submitLabel={`Re-queue ${selectedDealIds.length}`}
          endpoint="/api/hs/admin/actions/bulk/disclosure-retry"
          buildBody={(reason) => ({ dealIds: selectedDealIds, reason })}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setSelected(new Set());
          }}
        />
      ) : null}
    </div>
  );
}

function DisclosureRowCard({
  row,
  checked,
  onToggle,
}: {
  row: DisclosureBulkRow;
  checked: boolean;
  onToggle: () => void;
}): ReactNode {
  return (
    <li className="rounded-xl border border-[var(--color-error,#DA2B57)]/40 bg-white/5 p-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={checked}
          onChange={onToggle}
          aria-label={`Select disclosure ${row.id}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-error,#DA2B57)]">
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

export default DisclosureBulkPanel;
