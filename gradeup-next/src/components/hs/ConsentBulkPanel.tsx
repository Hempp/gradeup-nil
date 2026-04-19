'use client';

/**
 * ConsentBulkPanel — client wrapper for /hs/admin/consents expiring rows.
 */

import { useMemo, useState } from 'react';
import { AdminActionButton } from './AdminActionButton';
import { BulkActionBar } from './BulkActionBar';
import { BulkActionDialog } from './BulkActionDialog';

export interface ConsentBulkRow {
  id: string;
  athlete_user_id: string;
  parent_full_name: string;
  parent_email: string;
  relationship: string;
  signed_at: string;
  expires_at: string;
  signature_method: string;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysUntil(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

export function ConsentBulkPanel({ rows }: { rows: ConsentBulkRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);

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
        No expirations in the next 14 days.
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
            aria-label="Select all visible consents"
          />
          Select all visible ({rows.length})
        </label>
      </div>

      <ul className="space-y-3">
        {rows.map((row) => {
          const d = daysUntil(row.expires_at);
          const tone =
            d <= 3
              ? 'border-[var(--color-error,#DA2B57)]/40 text-[var(--color-error,#DA2B57)]'
              : d <= 7
                ? 'border-amber-400/40 text-amber-200'
                : 'border-white/15 text-white/70';
          const borderOnly = tone.split(' ')[0];
          const textOnly = tone.split(' ')[1];
          return (
            <li
              key={row.id}
              className={`rounded-xl border ${borderOnly} bg-white/5 p-4`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selected.has(row.id)}
                  onChange={() => toggleOne(row.id)}
                  aria-label={`Select consent ${row.id}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-semibold uppercase tracking-widest ${textOnly}`}
                      >
                        Expires in {d} {d === 1 ? 'day' : 'days'}
                      </p>
                      <p className="mt-1 text-sm text-white/90">
                        {row.parent_full_name}{' '}
                        <span className="text-white/50">
                          (
                          {row.relationship === 'legal_guardian'
                            ? 'legal guardian'
                            : 'parent'}
                          )
                        </span>
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-white/60">
                        {row.parent_email}
                      </p>
                    </div>
                    <dl className="flex flex-wrap gap-4 text-xs text-white/60">
                      <Fact
                        label="Athlete"
                        value={row.athlete_user_id.slice(0, 8)}
                      />
                      <Fact
                        label="Signed"
                        value={fmtDate(row.signed_at)}
                      />
                      <Fact
                        label="Expires"
                        value={fmtDate(row.expires_at)}
                      />
                      <Fact label="Method" value={row.signature_method} />
                    </dl>
                  </div>
                  <div className="mt-3">
                    <AdminActionButton
                      label="Send renewal nudge"
                      confirmTitle={`Send consent renewal nudge to ${row.parent_email}?`}
                      confirmDescription="Emails a reminder with a renewal link. Does not modify the consent record."
                      endpoint="/api/hs/admin/actions/consent-renew"
                      payload={{ consentId: row.id }}
                      requireReason={false}
                      submitLabel="Send email"
                      ariaLabel={`Send renewal nudge for consent ${row.id}`}
                    />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelected(new Set())}
        onOpenDialog={() => setDialogOpen(true)}
        actionLabel="Bulk send nudges"
      />

      {dialogOpen ? (
        <BulkActionDialog
          title="Bulk-send consent renewal nudges"
          description={`Emails the renewal reminder to ${selectedIds.length} parent${selectedIds.length === 1 ? '' : 's'}. Parents nudged in the last 60 minutes are skipped.`}
          count={selectedIds.length}
          submitLabel={`Send ${selectedIds.length}`}
          endpoint="/api/hs/admin/actions/bulk/consent-renewal"
          buildBody={(reason) => ({ consentIds: selectedIds, reason })}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setSelected(new Set());
          }}
        />
      ) : null}
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

export default ConsentBulkPanel;
