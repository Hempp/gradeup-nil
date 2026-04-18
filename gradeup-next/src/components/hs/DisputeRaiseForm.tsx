'use client';

/**
 * DisputeRaiseForm — Client Component used by both athlete- and brand-side
 * dispute surfaces. Collects:
 *   - reason category (select)
 *   - description (textarea, min 30 / max 2000)
 *   - evidence URLs (dynamic list, up to 10)
 *
 * Submits to POST /api/hs/deals/[id]/dispute. A confirm dialog gates the
 * submit so the user can back out.
 *
 * 44px minimum touch targets; labels always visible; error messages
 * announced via role="alert" on the inline error block.
 */

import { useId, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export type DisputeReasonCategory =
  | 'non_delivery'
  | 'quality'
  | 'timing'
  | 'compensation'
  | 'misconduct'
  | 'other';

interface CategoryOption {
  value: DisputeReasonCategory;
  label: string;
  helper: string;
}

// Athlete-side and brand-side both see the same categories. The helper
// copy is deliberately role-neutral — a "non-delivery" could come from
// either side (brand didn't pay; athlete didn't ship the post).
const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    value: 'non_delivery',
    label: 'Non-delivery',
    helper:
      'The other side did not deliver what was agreed — no post, no payment, no meet-up.',
  },
  {
    value: 'quality',
    label: 'Quality / misrepresentation',
    helper:
      'What was delivered does not match what was agreed — wrong content, edits, or format.',
  },
  {
    value: 'timing',
    label: 'Timing / review stalled',
    helper:
      'The other side is sitting on a review, delivery, or payment past the agreed window.',
  },
  {
    value: 'compensation',
    label: 'Compensation issue',
    helper:
      'Payment didn’t arrive, arrived short, or does not match the signed terms.',
  },
  {
    value: 'misconduct',
    label: 'Misconduct',
    helper:
      'Conduct issue that makes continuing the deal inappropriate (brand-sensitive behavior, scope violations).',
  },
  {
    value: 'other',
    label: 'Something else',
    helper:
      'None of the above — please describe in detail below so an admin can triage.',
  },
];

export interface DisputeRaiseFormProps {
  dealId: string;
  dealTitle: string;
  /** Role raising the dispute. Affects copy only — the server re-resolves. */
  raisingRole: 'athlete' | 'brand' | 'parent';
}

type UiState =
  | { phase: 'idle' }
  | { phase: 'confirm' }
  | { phase: 'submitting' }
  | { phase: 'done'; disputeId: string }
  | { phase: 'error'; message: string };

export function DisputeRaiseForm(props: DisputeRaiseFormProps) {
  const { dealId, dealTitle, raisingRole } = props;

  const [state, setState] = useState<UiState>({ phase: 'idle' });
  const [category, setCategory] = useState<DisputeReasonCategory>('non_delivery');
  const [description, setDescription] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const baseId = useId();
  const categoryId = `${baseId}-category`;
  const descId = `${baseId}-description`;
  const errorId = `${baseId}-error`;
  const confirmBoxRef = useRef<HTMLDivElement | null>(null);

  const submitting = state.phase === 'submitting' || isPending;
  const descLen = description.trim().length;
  const descValid = descLen >= 30 && descLen <= 2000;
  const cleanEvidence = evidenceUrls
    .map((u) => u.trim())
    .filter((u) => u.length > 0);
  const evidenceValid = cleanEvidence.every((u) => {
    try {
      const parsed = new URL(u);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  });
  const canConfirm = descValid && evidenceValid && !submitting;

  function addEvidenceField() {
    if (evidenceUrls.length >= 10) return;
    setEvidenceUrls((arr) => [...arr, '']);
  }
  function updateEvidence(i: number, v: string) {
    setEvidenceUrls((arr) => arr.map((e, idx) => (idx === i ? v : e)));
  }
  function removeEvidence(i: number) {
    setEvidenceUrls((arr) => arr.filter((_, idx) => idx !== i));
  }

  async function onSubmit() {
    if (!canConfirm) return;
    setState({ phase: 'submitting' });
    try {
      const res = await fetch(`/api/hs/deals/${dealId}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reasonCategory: category,
          description: description.trim(),
          evidenceUrls: cleanEvidence.length > 0 ? cleanEvidence : undefined,
        }),
      });

      type ApiBody = {
        ok?: boolean;
        disputeId?: string;
        error?: string;
        code?: string;
      };
      const data: ApiBody = await res.json().catch(() => ({}) as ApiBody);

      if (!res.ok || !data.ok) {
        const msg = data.error || `Request failed (${res.status}).`;
        setState({ phase: 'error', message: msg });
        return;
      }

      setState({ phase: 'done', disputeId: data.disputeId ?? '' });
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

  if (state.phase === 'done') {
    const backHref =
      raisingRole === 'brand'
        ? `/hs/brand/deals/${dealId}`
        : `/hs/deals/${dealId}`;
    return (
      <div
        className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-6 md:p-8"
        role="status"
      >
        <h2 className="font-display text-2xl text-white">Dispute filed</h2>
        <p className="mt-3 text-sm text-white/80">
          A GradeUp admin will review both sides and follow up by email. The
          deal is paused in the meantime — no further status changes or
          payouts will happen until the dispute is resolved.
        </p>
        <a
          href={backHref}
          className="mt-6 inline-flex min-h-[44px] items-center rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
        >
          Back to the deal
        </a>
      </div>
    );
  }

  const selectedOption = CATEGORY_OPTIONS.find((o) => o.value === category);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
        Report a problem
      </p>
      <h2 className="mt-2 font-display text-2xl text-white md:text-3xl">
        Raise a dispute
      </h2>
      <p className="mt-3 text-sm text-white/70 md:text-base">
        Filing a dispute on &ldquo;{dealTitle}&rdquo; will pause the deal and
        any pending payout until a GradeUp admin reviews both sides. Please
        provide specific details — vague disputes slow resolution.
      </p>

      <div className="mt-6">
        <label
          htmlFor={categoryId}
          className="block text-xs font-semibold uppercase tracking-widest text-white/70"
        >
          What is the issue?
        </label>
        <select
          id={categoryId}
          value={category}
          onChange={(e) => setCategory(e.target.value as DisputeReasonCategory)}
          disabled={submitting}
          className="mt-2 block min-h-[44px] w-full rounded-md border border-white/20 bg-black/60 px-3 py-2 text-sm text-white focus:border-[var(--accent-primary)] focus:outline-none"
        >
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {selectedOption && (
          <p className="mt-2 text-xs text-white/60">{selectedOption.helper}</p>
        )}
      </div>

      <div className="mt-6">
        <label
          htmlFor={descId}
          className="block text-xs font-semibold uppercase tracking-widest text-white/70"
        >
          Describe what happened (required · min 30 chars)
        </label>
        <textarea
          id={descId}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
          rows={6}
          minLength={30}
          maxLength={2000}
          placeholder="When did this happen? What was agreed? What's different about what was delivered or paid?"
          className="mt-2 block w-full rounded-md border border-white/20 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[var(--accent-primary)] focus:outline-none"
        />
        <div className="mt-1 flex justify-between text-[11px] text-white/50">
          <span>{descLen < 30 ? `${descLen}/30 minimum` : `${descLen} chars`}</span>
          <span>{descLen}/2000 max</span>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
          Supporting links (optional · up to 10)
        </p>
        <p className="mt-1 text-xs text-white/50">
          Paste URLs to screenshots, receipts, message threads, or the
          delivered content that supports your side of the story.
        </p>
        <ul className="mt-3 space-y-2">
          {evidenceUrls.map((url, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => updateEvidence(i, e.target.value)}
                disabled={submitting}
                placeholder="https://…"
                aria-label={`Evidence URL ${i + 1}`}
                className="block min-h-[44px] flex-1 rounded-md border border-white/20 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[var(--accent-primary)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeEvidence(i)}
                disabled={submitting}
                aria-label={`Remove evidence URL ${i + 1}`}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-white/20 px-3 text-sm text-white/80 hover:bg-white/10"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        {evidenceUrls.length < 10 && (
          <button
            type="button"
            onClick={addEvidenceField}
            disabled={submitting}
            className="mt-3 inline-flex min-h-[44px] items-center rounded-md border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Add a link
          </button>
        )}
        {!evidenceValid && (
          <p className="mt-2 text-xs text-[var(--color-error,#DA2B57)]">
            One or more URLs are invalid — links must start with http:// or
            https://.
          </p>
        )}
      </div>

      {state.phase === 'error' && (
        <p
          id={errorId}
          role="alert"
          className="mt-6 rounded-md border border-[var(--color-error,#DA2B57)]/40 bg-[var(--color-error,#DA2B57)]/10 px-3 py-2 text-sm text-[var(--color-error,#DA2B57)]"
        >
          {state.message}
        </p>
      )}

      {state.phase !== 'confirm' && (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setState({ phase: 'confirm' });
              setTimeout(
                () =>
                  confirmBoxRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                  }),
                0
              );
            }}
            disabled={!canConfirm}
            className={[
              'inline-flex min-h-[44px] items-center rounded-md border px-4 py-2 text-sm font-semibold uppercase tracking-widest transition',
              canConfirm
                ? 'border-[var(--color-error,#DA2B57)]/60 text-[var(--color-error,#DA2B57)] hover:bg-[var(--color-error,#DA2B57)]/10'
                : 'cursor-not-allowed border-white/10 text-white/40',
            ].join(' ')}
            aria-describedby={state.phase === 'error' ? errorId : undefined}
          >
            Continue
          </button>
          <p className="text-xs text-white/50">
            You&rsquo;ll get one more chance to confirm.
          </p>
        </div>
      )}

      {state.phase === 'confirm' && (
        <div
          ref={confirmBoxRef}
          className="mt-6 rounded-lg border border-[var(--color-error,#DA2B57)]/40 bg-black/40 p-4"
          role="dialog"
          aria-label="Confirm dispute submission"
        >
          <p className="text-sm font-semibold text-white">
            Raise a dispute for this deal?
          </p>
          <p className="mt-1 text-xs text-white/70">
            The deal will be paused while we review. Both sides will be
            notified. You can&rsquo;t silently retract a dispute — any
            withdrawal is recorded in the audit log.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="inline-flex min-h-[44px] items-center rounded-md border border-[var(--color-error,#DA2B57)]/60 bg-[var(--color-error,#DA2B57)]/15 px-4 py-2 text-sm font-semibold uppercase tracking-widest text-[var(--color-error,#DA2B57)] hover:bg-[var(--color-error,#DA2B57)]/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Filing…' : 'Yes, raise dispute'}
            </button>
            <button
              type="button"
              onClick={() => setState({ phase: 'idle' })}
              disabled={submitting}
              className="inline-flex min-h-[44px] items-center rounded-md border border-white/20 px-4 py-2 text-sm font-semibold uppercase tracking-widest text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DisputeRaiseForm;
