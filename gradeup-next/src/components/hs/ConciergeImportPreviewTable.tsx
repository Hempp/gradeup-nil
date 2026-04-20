'use client';

/**
 * ConciergeImportPreviewTable
 * --------------------------------------------------------------------
 * Batch detail client surface. Given an initial preview payload, polls
 * the preview endpoint after Apply to surface per-row progress, and
 * renders Apply / Cancel controls.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ConciergeImportRowDetail, type RowDetailProps } from './ConciergeImportRowDetail';

interface PreviewPayload {
  batch: {
    id: string;
    filename: string;
    pilotStateCode: string;
    status: string;
    rowCount: number;
    succeededCount: number;
    failedCount: number;
    notes: string | null;
    createdAt: string;
    completedAt: string | null;
  };
  rows: RowDetailProps[];
}

interface Props {
  initial: PreviewPayload;
}

export function ConciergeImportPreviewTable({ initial }: Props) {
  const [data, setData] = useState<PreviewPayload>(initial);
  const [busy, setBusy] = useState<null | 'apply' | 'cancel'>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/hs/admin/actions/concierge-import/preview?batchId=${data.batch.id}`
      );
      if (!res.ok) return;
      const next = (await res.json()) as PreviewPayload & { ok?: boolean };
      setData({ batch: next.batch, rows: next.rows });
      if (
        next.batch.status === 'completed' ||
        next.batch.status === 'partial_failure' ||
        next.batch.status === 'cancelled'
      ) {
        stopPolling();
      }
    } catch {
      // swallow; next tick will retry
    }
  }, [data.batch.id, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(() => {
      void refresh();
    }, 3000);
  }, [refresh, stopPolling]);

  useEffect(() => {
    // If we mount with an already-in-flight batch, keep polling.
    if (data.batch.status === 'applying') startPolling();
    return stopPolling;
  }, [data.batch.status, startPolling, stopPolling]);

  const apply = async () => {
    setError(null);
    setBusy('apply');
    try {
      const res = await fetch('/api/hs/admin/actions/concierge-import/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: data.batch.id }),
      });
      if (res.status === 202 || res.ok) {
        await refresh();
        startPolling();
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? `Apply failed (HTTP ${res.status}).`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Apply failed.');
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    if (!confirm('Cancel this batch? Already-applied rows will NOT be rolled back.')) {
      return;
    }
    setError(null);
    setBusy('cancel');
    try {
      const res = await fetch('/api/hs/admin/actions/concierge-import/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: data.batch.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? `Cancel failed (HTTP ${res.status}).`);
      } else {
        await refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed.');
    } finally {
      setBusy(null);
    }
  };

  const validRows = data.rows.filter((r) => r.validationStatus === 'valid');
  const invalidRows = data.rows.filter((r) => r.validationStatus === 'invalid');
  const pendingValidRows = validRows.filter(
    (r) => !r.appliedAt || r.applyError
  );
  const canApply =
    pendingValidRows.length > 0 &&
    data.batch.status !== 'cancelled' &&
    data.batch.status !== 'applying';
  const canCancel =
    data.batch.status === 'pending' ||
    data.batch.status === 'previewing' ||
    data.batch.status === 'partial_failure';

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      {/* Summary strip */}
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryTile label="Status" value={data.batch.status.replace(/_/g, ' ')} />
        <SummaryTile label="Rows" value={String(data.batch.rowCount)} />
        <SummaryTile
          label="Valid"
          value={`${validRows.length} / ${data.batch.rowCount}`}
        />
        <SummaryTile
          label="Applied"
          value={`${data.batch.succeededCount} ok · ${validRows.filter((r) => r.applyError).length} failed`}
        />
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <button
          type="button"
          onClick={apply}
          disabled={!canApply || busy !== null}
          className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy === 'apply'
            ? 'Starting...'
            : `Apply ${pendingValidRows.length} valid row${pendingValidRows.length === 1 ? '' : 's'}`}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={!canCancel || busy !== null}
          className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-40"
        >
          {busy === 'cancel' ? 'Cancelling...' : 'Cancel batch'}
        </button>
        <button
          type="button"
          onClick={() => void refresh()}
          className="ml-auto rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
        >
          Refresh
        </button>
      </div>

      {/* Invalid rows (surface first — admin must edit the CSV + re-upload) */}
      {invalidRows.length > 0 && (
        <section>
          <h2 className="font-display text-lg text-red-200">
            Invalid rows ({invalidRows.length})
          </h2>
          <p className="mt-1 text-xs text-white/60">
            These rows failed per-row validation. Fix them in the CSV and
            upload a new batch — they cannot be applied from this page.
          </p>
          <ol className="mt-3 space-y-2">
            {invalidRows.map((r) => (
              <ConciergeImportRowDetail key={r.rowNumber} {...r} />
            ))}
          </ol>
        </section>
      )}

      {/* Valid rows */}
      <section>
        <h2 className="font-display text-lg text-white">
          Valid rows ({validRows.length})
        </h2>
        <p className="mt-1 text-xs text-white/60">
          Already-applied rows are skipped on re-apply. Rows with apply errors
          are retried automatically.
        </p>
        {validRows.length === 0 ? (
          <p className="mt-3 text-sm text-white/50">No valid rows in this batch.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {validRows.map((r) => (
              <ConciergeImportRowDetail key={r.rowNumber} {...r} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-[10px] uppercase tracking-widest text-white/50">{label}</p>
      <p className="mt-1 font-display text-xl text-white">{value}</p>
    </div>
  );
}
