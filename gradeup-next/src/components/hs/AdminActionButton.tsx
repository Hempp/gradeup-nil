'use client';

/**
 * AdminActionButton — reusable confirm-with-reason dialog button.
 *
 * Used by three of the four Phase 6 admin write actions:
 *   - retry disclosure
 *   - force-verify link
 *   - send consent renewal nudge
 *
 * Pattern:
 *   1. Click button → inline dialog expands with confirm prompt + reason
 *      textarea (min 10 chars enforced client + server).
 *   2. Submit → fetch the endpoint with { ...payload, reason }.
 *   3. On success → show inline confirmation, refresh the page (server
 *      component re-renders with the row removed from the queue).
 *   4. On error → show error inline, keep the dialog open so the admin
 *      can adjust and retry.
 *
 * Style matches the rest of /hs/admin: white/5 backgrounds, white/10
 * borders, accent-primary CTAs, amber/error chips.
 *
 * The `requireReason` prop defaults to true. The consent-renewal action
 * uses requireReason={false} because the reason is implied ("consent is
 * expiring"). The server still writes a canned reason in that case via
 * the admin-actions service.
 */

import { useId, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export interface AdminActionButtonProps {
  /** Label on the button (e.g. "Retry"). */
  label: string;
  /** Headline of the confirm dialog (e.g. "Retry disclosure for deal …"). */
  confirmTitle: string;
  /** Optional secondary body under the title. */
  confirmDescription?: string;
  /** API endpoint to POST to. */
  endpoint: string;
  /**
   * Payload merged into the POST body. The reason textarea contribution
   * is added as `reason` when requireReason=true.
   */
  payload: Record<string, unknown>;
  /** Whether to show/require the reason textarea. Default true. */
  requireReason?: boolean;
  /** CTA text on the confirm submit button. Default "Confirm". */
  submitLabel?: string;
  /** Inline variant/tone. Default 'primary'. */
  tone?: 'primary' | 'danger' | 'neutral';
  /** Disable the button (e.g., row already actioned). */
  disabled?: boolean;
  /** Descriptive aria-label override; falls back to `label`. */
  ariaLabel?: string;
}

type UiState =
  | { phase: 'idle' }
  | { phase: 'confirm' }
  | { phase: 'submitting' }
  | { phase: 'done'; auditLogId: string | null }
  | { phase: 'error'; message: string };

export function AdminActionButton(props: AdminActionButtonProps) {
  const {
    label,
    confirmTitle,
    confirmDescription,
    endpoint,
    payload,
    requireReason = true,
    submitLabel = 'Confirm',
    tone = 'primary',
    disabled = false,
    ariaLabel,
  } = props;

  const [state, setState] = useState<UiState>({ phase: 'idle' });
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const baseId = useId();
  const reasonId = `${baseId}-reason`;
  const errorId = `${baseId}-error`;

  const toneClasses =
    tone === 'danger'
      ? 'border-[var(--color-error,#DA2B57)]/60 text-[var(--color-error,#DA2B57)] hover:bg-[var(--color-error,#DA2B57)]/10'
      : tone === 'neutral'
        ? 'border-white/30 text-white/80 hover:bg-white/10'
        : 'border-[var(--accent-primary)]/60 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10';

  const submitting = state.phase === 'submitting' || isPending;
  const canSubmit =
    !submitting && (!requireReason || reason.trim().length >= 10);

  async function onSubmit() {
    if (!canSubmit) return;
    setState({ phase: 'submitting' });
    try {
      const body: Record<string, unknown> = { ...payload };
      if (requireReason) body.reason = reason.trim();

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      type ApiBody = {
        ok?: boolean;
        auditLogId?: string;
        error?: string;
        code?: string;
      };
      const data: ApiBody = await res
        .json()
        .catch(() => ({}) as ApiBody);

      if (!res.ok || !data.ok) {
        const msg = data.error || `Request failed (${res.status}).`;
        setState({ phase: 'error', message: msg });
        return;
      }

      setState({ phase: 'done', auditLogId: data.auditLogId ?? null });
      // Refresh the server page so the row leaves the queue.
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
          aria-label={ariaLabel ?? label}
          disabled={disabled || state.phase === 'done'}
          onClick={() => {
            setState({ phase: 'confirm' });
            // Focus textarea after render.
            setTimeout(() => textareaRef.current?.focus(), 0);
          }}
          className={[
            'inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-widest transition',
            toneClasses,
            disabled || state.phase === 'done'
              ? 'cursor-not-allowed opacity-50'
              : '',
          ].join(' ')}
        >
          {state.phase === 'done' ? 'Done' : label}
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
      <p className="text-sm font-semibold text-white">{confirmTitle}</p>
      {confirmDescription ? (
        <p className="mt-1 text-xs text-white/60">{confirmDescription}</p>
      ) : null}

      {requireReason ? (
        <label htmlFor={reasonId} className="mt-3 block">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-white/60">
            Reason (required · min 10 chars · captured in audit log)
          </span>
          <textarea
            ref={textareaRef}
            id={reasonId}
            name="reason"
            required
            minLength={10}
            maxLength={2000}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 block w-full rounded-md border border-white/20 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[var(--accent-primary)] focus:outline-none"
            placeholder="Why is this action being taken? (visible only to admins)"
            disabled={submitting}
          />
          <span className="mt-1 block text-[11px] text-white/50">
            {reason.trim().length}/10
          </span>
        </label>
      ) : null}

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
          aria-describedby={
            state.phase === 'error' ? errorId : undefined
          }
          className={[
            'inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-widest transition',
            canSubmit
              ? toneClasses
              : 'cursor-not-allowed border-white/10 text-white/40',
          ].join(' ')}
        >
          {submitting ? 'Working…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            setState({ phase: 'idle' });
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

export default AdminActionButton;
