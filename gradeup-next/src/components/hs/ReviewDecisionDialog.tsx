'use client';

/**
 * ReviewDecisionDialog
 *
 * Lightweight confirmation dialog used by BrandReviewPanel for both the
 * approve path and the request-revision path. Rendered as an inline
 * disclosure (not a portalled modal) so it sits directly under the
 * action buttons and inherits the page's focus flow — matches the
 * AdminActionButton / AdminPayoutResolveDialog pattern already in use.
 *
 * Approve variant:
 *   - No required fields.
 *   - Optional "private notes" textarea (sent to the API as notes;
 *     never emailed to the athlete).
 *   - Warning copy: "This will release the agreed compensation to
 *     [athlete name]'s parent custodian account. This action cannot
 *     be undone."
 *
 * Revision variant:
 *   - Required notes textarea (min 20 chars). Client-side counter.
 *   - Warning copy: "This will send the athlete your notes and ask
 *     them to resubmit. The deal won't be charged yet."
 *
 * Accessibility:
 *   - role="dialog" + aria-modal="true" + aria-labelledby.
 *   - Focus moves into the dialog on open.
 *   - Esc + Cancel both close without side effects.
 */

import { useEffect, useId, useRef, useState } from 'react';

export type ReviewDialogVariant = 'approve' | 'request_revision';

export interface ReviewDecisionDialogProps {
  variant: ReviewDialogVariant;
  athleteDisplayName: string;
  open: boolean;
  submitting?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: (notes: string) => void;
}

const MIN_REVISION_NOTES = 20;

export function ReviewDecisionDialog({
  variant,
  athleteDisplayName,
  open,
  submitting = false,
  errorMessage = null,
  onCancel,
  onConfirm,
}: ReviewDecisionDialogProps) {
  const [notes, setNotes] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const titleId = useId();
  const notesId = useId();
  const errorId = useId();

  // Reset text when opening. Auto-focus the textarea once visible.
  useEffect(() => {
    if (open) {
      setNotes('');
      // defer to next tick so the textarea is in the DOM
      queueMicrotask(() => textareaRef.current?.focus());
    }
  }, [open]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, onCancel]);

  if (!open) return null;

  const isApprove = variant === 'approve';
  const title = isApprove ? 'Approve and release payout?' : 'Request revision?';
  const body = isApprove
    ? `This will release the agreed compensation to ${athleteDisplayName}'s parent custodian account. This action cannot be undone.`
    : `This will send ${athleteDisplayName} your notes and ask them to resubmit. The deal won't be charged yet.`;

  const trimmed = notes.trim();
  const revisionTooShort =
    !isApprove && trimmed.length < MIN_REVISION_NOTES;
  const canSubmit = !submitting && !revisionTooShort;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="mt-4 rounded-2xl border border-white/15 bg-black/60 p-5 backdrop-blur-sm md:p-6"
    >
      <h3 id={titleId} className="font-display text-xl text-white">
        {title}
      </h3>
      <p className="mt-2 text-sm text-white/70">{body}</p>

      <div className="mt-4">
        <label
          htmlFor={notesId}
          className="block text-xs font-semibold uppercase tracking-wider text-white/60"
        >
          {isApprove ? 'Private notes (optional)' : `Notes for ${athleteDisplayName}`}
        </label>
        <textarea
          ref={textareaRef}
          id={notesId}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          maxLength={2000}
          disabled={submitting}
          aria-invalid={revisionTooShort || Boolean(errorMessage)}
          aria-describedby={errorMessage ? errorId : undefined}
          placeholder={
            isApprove
              ? 'Anything you want on file — not emailed to the athlete.'
              : 'Tell the athlete what to change. Be specific and kind — they will see this verbatim.'
          }
          className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 p-3 text-sm text-white placeholder:text-white/30 focus:border-[var(--accent-primary)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]/40 disabled:opacity-60"
        />
        {!isApprove && (
          <p
            className={`mt-1 text-xs ${
              revisionTooShort ? 'text-amber-300' : 'text-white/50'
            }`}
          >
            {trimmed.length}/{MIN_REVISION_NOTES} minimum characters
          </p>
        )}
      </div>

      {errorMessage && (
        <p
          id={errorId}
          role="alert"
          className="mt-3 rounded-md border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200"
        >
          {errorMessage}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex min-h-[44px] items-center rounded-lg border border-white/15 bg-transparent px-4 py-2 text-sm font-medium text-white hover:bg-white/5 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => canSubmit && onConfirm(trimmed)}
          disabled={!canSubmit}
          className={[
            'inline-flex min-h-[44px] items-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
            isApprove
              ? 'bg-emerald-500 text-black hover:bg-emerald-400'
              : 'bg-amber-400 text-black hover:bg-amber-300',
          ].join(' ')}
        >
          {submitting
            ? isApprove
              ? 'Releasing payout…'
              : 'Sending notes…'
            : isApprove
              ? 'Confirm approval'
              : 'Send revision request'}
        </button>
      </div>
    </div>
  );
}

export default ReviewDecisionDialog;
