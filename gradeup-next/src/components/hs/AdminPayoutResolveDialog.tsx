'use client';

/**
 * AdminPayoutResolveDialog — payout-specific admin resolution dialog.
 *
 * Unlike the generic AdminActionButton this one has two extra required
 * inputs:
 *   - decision: 'paid' | 'refunded' (radio)
 *   - reference: ACH confirmation code / refund id / ticket id (text)
 *
 * Pattern matches AdminActionButton otherwise: click → expand → fill in →
 * confirm → refresh the server page on success.
 */

import { useId, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export interface AdminPayoutResolveDialogProps {
  payoutId: string;
  /** Display shorthand for the confirm dialog (e.g. "{amount} {currency}"). */
  payoutLabel: string;
}

type UiState =
  | { phase: 'idle' }
  | { phase: 'confirm' }
  | { phase: 'submitting' }
  | { phase: 'done'; auditLogId: string | null }
  | { phase: 'error'; message: string };

export function AdminPayoutResolveDialog({
  payoutId,
  payoutLabel,
}: AdminPayoutResolveDialogProps) {
  const [state, setState] = useState<UiState>({ phase: 'idle' });
  const [decision, setDecision] = useState<'paid' | 'refunded'>('paid');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const baseId = useId();
  const referenceId = `${baseId}-reference`;
  const reasonId = `${baseId}-reason`;
  const errorId = `${baseId}-error`;

  const submitting = state.phase === 'submitting' || isPending;
  const canSubmit =
    !submitting && reference.trim().length > 0 && reason.trim().length >= 10;

  async function onSubmit() {
    if (!canSubmit) return;
    setState({ phase: 'submitting' });
    try {
      const res = await fetch('/api/hs/admin/actions/payout-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payoutId,
          decision,
          reference: reference.trim(),
          reason: reason.trim(),
        }),
      });
      type ApiBody = {
        ok?: boolean;
        auditLogId?: string;
        error?: string;
      };
      const data: ApiBody = await res
        .json()
        .catch(() => ({}) as ApiBody);
      if (!res.ok || !data.ok) {
        setState({
          phase: 'error',
          message: data.error || `Request failed (${res.status}).`,
        });
        return;
      }
      setState({ phase: 'done', auditLogId: data.auditLogId ?? null });
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Network error',
      });
    }
  }

  if (state.phase === 'idle' || state.phase === 'done') {
    return (
      <div className="inline-flex items-center gap-3">
        <button
          type="button"
          disabled={state.phase === 'done'}
          onClick={() => setState({ phase: 'confirm' })}
          className={[
            'inline-flex items-center rounded-md border border-[var(--accent-primary)]/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)] transition hover:bg-[var(--accent-primary)]/10',
            state.phase === 'done' ? 'cursor-not-allowed opacity-50' : '',
          ].join(' ')}
        >
          {state.phase === 'done' ? 'Resolved' : 'Mark resolved'}
        </button>
        {state.phase === 'done' ? (
          <span className="text-xs text-emerald-200">
            Logged
            {state.auditLogId
              ? ` · ${state.auditLogId.slice(0, 8)}`
              : ''}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-white/15 bg-black/40 p-4">
      <p className="text-sm font-semibold text-white">
        Mark payout {payoutLabel} as resolved?
      </p>
      <p className="mt-1 text-xs text-white/60">
        This transitions the payout row to a terminal state. All inputs are
        captured in the admin audit log.
      </p>

      <fieldset className="mt-4">
        <legend className="text-[11px] font-semibold uppercase tracking-widest text-white/60">
          Decision
        </legend>
        <div className="mt-2 flex gap-4 text-sm text-white/90">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name={`${baseId}-decision`}
              value="paid"
              checked={decision === 'paid'}
              onChange={() => setDecision('paid')}
              disabled={submitting}
            />
            Paid (out-of-band, e.g. manual ACH)
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name={`${baseId}-decision`}
              value="refunded"
              checked={decision === 'refunded'}
              onChange={() => setDecision('refunded')}
              disabled={submitting}
            />
            Refunded (money returned to platform)
          </label>
        </div>
      </fieldset>

      <label htmlFor={referenceId} className="mt-4 block">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-white/60">
          Reference code (required)
        </span>
        <input
          id={referenceId}
          type="text"
          required
          maxLength={200}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          disabled={submitting}
          placeholder="ACH confirmation # / Stripe refund id / internal ticket"
          className="mt-1 block w-full rounded-md border border-white/20 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[var(--accent-primary)] focus:outline-none"
        />
      </label>

      <label htmlFor={reasonId} className="mt-3 block">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-white/60">
          Reason (required · min 10 chars · captured in audit log)
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
          placeholder="Why is this being resolved manually?"
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

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          aria-describedby={state.phase === 'error' ? errorId : undefined}
          className={[
            'inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-widest transition',
            canSubmit
              ? 'border-[var(--accent-primary)]/60 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10'
              : 'cursor-not-allowed border-white/10 text-white/40',
          ].join(' ')}
        >
          {submitting ? 'Working…' : `Mark ${decision}`}
        </button>
        <button
          type="button"
          onClick={() => {
            setState({ phase: 'idle' });
            setReference('');
            setReason('');
          }}
          disabled={submitting}
          className="inline-flex items-center rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default AdminPayoutResolveDialog;
