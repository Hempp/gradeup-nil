'use client';

/**
 * BulkActionDialog — shared confirm-with-reason modal for bulk admin
 * actions.
 *
 * Reused across all four bulk endpoints. Per-action specifics (extra
 * fields, submit label) are passed in via the `extraFields` render prop
 * and `endpoint` / `buildBody` so the dialog doesn't need to know about
 * each action's schema.
 *
 * Pattern mirrors AdminActionButton / AdminPayoutResolveDialog:
 *   idle → confirm → submitting → done | error
 *
 * On success, router.refresh() is invoked so the page's server-side
 * queue query re-runs and mutated rows fall out of the list. A short
 * "Logged" toast with the ok/skipped/failed counts is shown inline.
 */

import {
  useCallback,
  useEffect,
  useId,
  useState,
  useTransition,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

export interface BulkItemResultView {
  status: 'ok' | 'skipped_retry_guard' | 'failed';
  error?: string;
  auditLogId?: string | null;
  skippedUntil?: string;
}

export interface BulkActionDialogResult {
  status: 'completed' | 'partial_failure' | 'failed';
  bulkOperationId: string | null;
  counts: { ok: number; skipped: number; failed: number };
  items: Record<string, BulkItemResultView>;
}

export interface BulkActionDialogProps {
  /** Visible heading in the dialog. */
  title: string;
  /** Optional description under the heading. */
  description?: string;
  /** Count of selected targets (rendered in headline). */
  count: number;
  /** Text on the submit button. */
  submitLabel: string;
  /** POST endpoint for the bulk action. */
  endpoint: string;
  /** Render extra fields above the reason textarea (e.g., payout decision). */
  extraFields?: () => ReactNode;
  /** Build the JSON body from (reason). Must include all required fields. */
  buildBody: (reason: string) => Record<string, unknown>;
  /** Client-side guard — return a string to block submit with an inline error. */
  validateBeforeSubmit?: () => string | null;
  /** Called with open-state changes so the BulkActionBar can close. */
  onOpenChange: (open: boolean) => void;
  /** Called when a run completes (any terminal status). */
  onComplete?: (result: BulkActionDialogResult) => void;
}

type UiState =
  | { phase: 'confirm' }
  | { phase: 'submitting' }
  | { phase: 'done'; result: BulkActionDialogResult }
  | { phase: 'error'; message: string };

export function BulkActionDialog(props: BulkActionDialogProps) {
  const {
    title,
    description,
    count,
    submitLabel,
    endpoint,
    extraFields,
    buildBody,
    validateBeforeSubmit,
    onOpenChange,
    onComplete,
  } = props;

  const [state, setState] = useState<UiState>({ phase: 'confirm' });
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const baseId = useId();
  const reasonId = `${baseId}-reason`;
  const errorId = `${baseId}-error`;

  const submitting = state.phase === 'submitting' || isPending;
  const canSubmit = !submitting && reason.trim().length >= 10;

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, submitting]);

  async function onSubmit() {
    if (!canSubmit) return;
    const gate = validateBeforeSubmit?.();
    if (gate) {
      setState({ phase: 'error', message: gate });
      return;
    }
    setState({ phase: 'submitting' });
    try {
      const body = buildBody(reason.trim());
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      type ApiBody = {
        ok?: boolean;
        status?: 'completed' | 'partial_failure' | 'failed';
        bulkOperationId?: string;
        summary?: {
          items?: Record<string, BulkItemResultView>;
          counts?: { ok: number; skipped: number; failed: number };
        };
        error?: string;
      };
      const data: ApiBody = await res.json().catch(() => ({}) as ApiBody);
      if (!res.ok && !data.status) {
        setState({
          phase: 'error',
          message: data.error || `Request failed (${res.status}).`,
        });
        return;
      }
      const result: BulkActionDialogResult = {
        status: data.status ?? 'failed',
        bulkOperationId: data.bulkOperationId ?? null,
        counts: data.summary?.counts ?? { ok: 0, skipped: 0, failed: 0 },
        items: data.summary?.items ?? {},
      };
      setState({ phase: 'done', result });
      onComplete?.(result);
      startTransition(() => router.refresh());
    } catch (err) {
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Network error',
      });
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${baseId}-title`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) close();
      }}
    >
      <div className="w-full max-w-lg rounded-xl border border-white/15 bg-[var(--marketing-gray-900)] p-6 text-white shadow-2xl">
        <p
          id={`${baseId}-title`}
          className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]"
        >
          Bulk action · {count} selected
        </p>
        <h2 className="mt-1 font-display text-2xl text-white">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm text-white/60">{description}</p>
        ) : null}

        {state.phase !== 'done' ? (
          <>
            {extraFields ? <div className="mt-4">{extraFields()}</div> : null}

            <label htmlFor={reasonId} className="mt-4 block">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-white/60">
                Reason (required · min 10 chars · captured on bulk op row)
              </span>
              <textarea
                id={reasonId}
                required
                minLength={10}
                maxLength={2000}
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={submitting}
                placeholder="Why is this bulk action being taken?"
                className="mt-1 block w-full rounded-md border border-white/20 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[var(--accent-primary)] focus:outline-none"
              />
              <span className="mt-1 block text-[11px] text-white/50">
                {reason.trim().length}/10
              </span>
            </label>

            {state.phase === 'error' ? (
              <p
                id={errorId}
                role="alert"
                className="mt-3 rounded-md border border-[var(--color-error,#DA2B57)]/40 bg-[var(--color-error,#DA2B57)]/10 px-3 py-2 text-xs text-[var(--color-error,#DA2B57)]"
              >
                {state.message}
              </p>
            ) : null}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={submitting}
                className="inline-flex items-center rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={!canSubmit}
                aria-describedby={
                  state.phase === 'error' ? errorId : undefined
                }
                className={[
                  'inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-widest transition',
                  canSubmit
                    ? 'border-[var(--accent-primary)]/60 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10'
                    : 'cursor-not-allowed border-white/10 text-white/40',
                ].join(' ')}
              >
                {submitting ? 'Working…' : submitLabel}
              </button>
            </div>
          </>
        ) : (
          <BulkResultSummary
            result={state.result}
            onClose={close}
          />
        )}
      </div>
    </div>
  );
}

function BulkResultSummary({
  result,
  onClose,
}: {
  result: BulkActionDialogResult;
  onClose: () => void;
}) {
  const { counts, status, bulkOperationId, items } = result;
  const statusTone =
    status === 'completed'
      ? 'text-emerald-200 border-emerald-400/40'
      : status === 'partial_failure'
        ? 'text-amber-200 border-amber-400/40'
        : 'text-[var(--color-error,#DA2B57)] border-[var(--color-error,#DA2B57)]/40';

  return (
    <div className="mt-4">
      <p
        className={`inline-block rounded-md border px-2 py-0.5 text-[11px] uppercase tracking-widest ${statusTone}`}
      >
        {status.replace(/_/g, ' ')}
      </p>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <ResultStat label="Succeeded" value={counts.ok} tone="ok" />
        <ResultStat label="Skipped" value={counts.skipped} tone="warn" />
        <ResultStat label="Failed" value={counts.failed} tone="err" />
      </dl>
      {bulkOperationId ? (
        <p className="mt-3 text-xs text-white/50">
          Bulk op id:{' '}
          <span className="font-mono text-white/80">
            {bulkOperationId.slice(0, 8)}
          </span>
        </p>
      ) : null}

      {counts.failed > 0 || counts.skipped > 0 ? (
        <details className="mt-3 text-xs text-white/70">
          <summary className="cursor-pointer text-white/80">
            Per-item detail
          </summary>
          <ul className="mt-2 max-h-48 space-y-1 overflow-auto">
            {Object.entries(items).map(([targetId, item]) => (
              <li
                key={targetId}
                className="flex items-start justify-between gap-3 rounded-md border border-white/10 bg-black/40 px-2 py-1.5"
              >
                <span className="font-mono text-[11px]">
                  {targetId.slice(0, 8)}
                </span>
                <span
                  className={[
                    'text-[11px] uppercase tracking-widest',
                    item.status === 'ok'
                      ? 'text-emerald-200'
                      : item.status === 'skipped_retry_guard'
                        ? 'text-amber-200'
                        : 'text-[var(--color-error,#DA2B57)]',
                  ].join(' ')}
                >
                  {item.status}
                </span>
                {item.error ? (
                  <span className="truncate text-right text-[11px] text-white/60">
                    {item.error}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/70 transition hover:bg-white/10"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function ResultStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'ok' | 'warn' | 'err';
}) {
  const color =
    tone === 'ok'
      ? 'text-emerald-200'
      : tone === 'warn'
        ? 'text-amber-200'
        : 'text-[var(--color-error,#DA2B57)]';
  return (
    <div className="rounded-md border border-white/10 bg-black/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-white/40">
        {label}
      </p>
      <p className={`mt-1 font-display text-xl ${color}`}>{value}</p>
    </div>
  );
}

export default BulkActionDialog;
