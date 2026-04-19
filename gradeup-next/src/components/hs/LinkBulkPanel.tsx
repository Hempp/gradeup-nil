'use client';

/**
 * LinkBulkPanel — client wrapper for /hs/admin/links stale-link rows.
 */

import { useMemo, useState } from 'react';
import { AdminActionButton } from './AdminActionButton';
import { BulkActionBar } from './BulkActionBar';
import { BulkActionDialog } from './BulkActionDialog';

export interface LinkBulkRow {
  id: string;
  parent_profile_id: string;
  athlete_user_id: string;
  relationship: string;
  verification_method: string | null;
  created_at: string;
}

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

function daysAgo(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
}

export function LinkBulkPanel({ rows }: { rows: LinkBulkRow[] }) {
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
        No stale link requests right now.
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
            aria-label="Select all visible links"
          />
          Select all visible ({rows.length})
        </label>
      </div>

      <ul className="space-y-3">
        {rows.map((row) => (
          <li
            key={row.id}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={selected.has(row.id)}
                onChange={() => toggleOne(row.id)}
                aria-label={`Select link ${row.id}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-amber-200">
                      Unverified · {daysAgo(row.created_at)}d
                    </p>
                    <p className="mt-1 text-sm text-white/90">
                      {row.relationship === 'legal_guardian'
                        ? 'Legal guardian'
                        : 'Parent'}{' '}
                      claimed on athlete{' '}
                      <span className="font-mono text-white">
                        {row.athlete_user_id.slice(0, 8)}
                      </span>
                    </p>
                  </div>
                  <dl className="flex flex-wrap gap-4 text-xs text-white/60">
                    <div>
                      <dt className="text-[10px] uppercase tracking-widest text-white/40">
                        Parent profile
                      </dt>
                      <dd className="font-mono text-white/80">
                        {row.parent_profile_id.slice(0, 8)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-widest text-white/40">
                        Requested
                      </dt>
                      <dd className="text-white/80">{fmt(row.created_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-widest text-white/40">
                        Channel
                      </dt>
                      <dd className="text-white/80">
                        {row.verification_method ?? '—'}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="mt-3">
                  <AdminActionButton
                    label="Force verify"
                    confirmTitle={`Force-verify link between parent ${row.parent_profile_id.slice(0, 8)} and athlete ${row.athlete_user_id.slice(0, 8)}?`}
                    confirmDescription="Admin override. Stamps verified_at + method='manual_support'. Neither party is emailed."
                    endpoint="/api/hs/admin/actions/link-verify"
                    payload={{ linkId: row.id }}
                    submitLabel="Force verify"
                    ariaLabel={`Force verify link ${row.id}`}
                  />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelected(new Set())}
        onOpenDialog={() => setDialogOpen(true)}
        actionLabel="Bulk force verify"
      />

      {dialogOpen ? (
        <BulkActionDialog
          title="Bulk force-verify selected links"
          description={`Stamps verified_at + method='manual_support' on each selected link. Neither party is emailed.`}
          count={selectedIds.length}
          submitLabel={`Verify ${selectedIds.length}`}
          endpoint="/api/hs/admin/actions/bulk/link-verify"
          buildBody={(reason) => ({ linkIds: selectedIds, reason })}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setSelected(new Set());
          }}
        />
      ) : null}
    </div>
  );
}

export default LinkBulkPanel;
