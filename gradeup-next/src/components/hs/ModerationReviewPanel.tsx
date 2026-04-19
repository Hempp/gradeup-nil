'use client';

/**
 * ModerationReviewPanel
 *
 * Client Component rendered inside /hs/admin/moderation/[id]. Shows the
 * classifier's categories + reasons and lets ops approve/reject/rerun.
 * Mandatory reviewer_notes on reject (min 10 chars); optional on approve.
 *
 * This component only talks to the admin API via fetch — the server page
 * does the admin gate and data load.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ModerationStatus } from '@/lib/hs-nil/moderation';

export interface ModerationReviewPanelProps {
  moderationId: string;
  currentStatus: ModerationStatus;
  confidence: number | null;
  categories: string[];
  reasons: string[];
  reviewerNotes: string | null;
}

type Decision = 'approve' | 'reject';

export function ModerationReviewPanel({
  moderationId,
  currentStatus,
  confidence,
  categories,
  reasons,
  reviewerNotes,
}: ModerationReviewPanelProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(reviewerNotes ?? '');
  const [decision, setDecision] = useState<Decision>('approve');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const terminal =
    currentStatus === 'human_approved' || currentStatus === 'human_rejected';

  async function submitDecision() {
    setError(null);
    setSuccess(null);
    if (decision === 'reject' && notes.trim().length < 10) {
      setError('Reviewer notes required (min 10 characters) on reject.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/hs/admin/moderation/decide', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          moderationId,
          decision,
          reviewerNotes: notes.trim() || null,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !payload.ok) {
        setError(payload.error ?? 'Failed to record decision.');
      } else {
        setSuccess(
          decision === 'approve'
            ? 'Approved. Deliverable will flow to the brand.'
            : 'Rejected. Athlete notified via the deliverable card.'
        );
        startTransition(() => router.refresh());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function rerun() {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/hs/admin/moderation/rerun', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ moderationId }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !payload.ok) {
        setError(payload.error ?? 'Rerun failed.');
      } else {
        setSuccess('Classifier re-ran. Reload for fresh reasons.');
        startTransition(() => router.refresh());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 rounded-xl border border-white/10 bg-white/5 p-6">
      {/* Classifier output */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
          Classifier output
        </p>
        <dl className="mt-2 grid grid-cols-1 gap-2 text-sm text-white/80 md:grid-cols-3">
          <div>
            <dt className="text-xs text-white/50">Confidence</dt>
            <dd className="mt-0.5">
              {typeof confidence === 'number'
                ? `${Math.round(confidence * 100)}%`
                : '—'}
            </dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-xs text-white/50">Categories triggered</dt>
            <dd className="mt-0.5 flex flex-wrap gap-1.5">
              {categories.length === 0 ? (
                <span className="text-white/50">None</span>
              ) : (
                categories.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-amber-200"
                  >
                    {c.replace(/_/g, ' ')}
                  </span>
                ))
              )}
            </dd>
          </div>
        </dl>
        {reasons.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/80">
            {reasons.map((r, idx) => (
              <li key={`${idx}-${r}`}>{r}</li>
            ))}
          </ul>
        )}
      </section>

      {/* Decision form */}
      {terminal ? (
        <p className="rounded-lg bg-white/5 p-4 text-sm text-white/70">
          This row is terminal (status: {currentStatus.replace(/_/g, ' ')}).
          Rerun the classifier to re-open.
        </p>
      ) : (
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Decision
          </p>
          <div className="mt-2 flex gap-3" role="radiogroup" aria-label="Decision">
            <label
              className={[
                'flex min-h-[44px] cursor-pointer items-center rounded-md border px-4 text-sm font-medium transition-colors',
                decision === 'approve'
                  ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-100'
                  : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10',
              ].join(' ')}
            >
              <input
                type="radio"
                name="decision"
                value="approve"
                checked={decision === 'approve'}
                onChange={() => setDecision('approve')}
                className="sr-only"
              />
              Approve
            </label>
            <label
              className={[
                'flex min-h-[44px] cursor-pointer items-center rounded-md border px-4 text-sm font-medium transition-colors',
                decision === 'reject'
                  ? 'border-[var(--color-error,#DA2B57)]/60 bg-[var(--color-error,#DA2B57)]/10 text-[var(--color-error,#DA2B57)]'
                  : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10',
              ].join(' ')}
            >
              <input
                type="radio"
                name="decision"
                value="reject"
                checked={decision === 'reject'}
                onChange={() => setDecision('reject')}
                className="sr-only"
              />
              Reject
            </label>
          </div>

          <label
            htmlFor="moderation-reviewer-notes"
            className="mt-4 block text-xs font-semibold uppercase tracking-widest text-white/50"
          >
            Reviewer notes
            {decision === 'reject' && (
              <span className="ml-2 text-[var(--color-error,#DA2B57)]">
                Required · min 10 chars
              </span>
            )}
          </label>
          <textarea
            id="moderation-reviewer-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 min-h-[100px] w-full rounded-md border border-white/15 bg-black/30 p-3 text-sm text-white placeholder-white/30 focus:border-[var(--accent-primary)] focus:outline-none"
            placeholder={
              decision === 'reject'
                ? 'Why is this being rejected? Cite violated policy.'
                : 'Optional context for the audit record.'
            }
            maxLength={4000}
          />

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-md border border-[var(--color-error,#DA2B57)]/40 bg-[var(--color-error,#DA2B57)]/10 p-3 text-sm text-[var(--color-error,#DA2B57)]"
            >
              {error}
            </p>
          )}
          {success && (
            <p
              role="status"
              className="mt-3 rounded-md border border-emerald-400/40 bg-emerald-400/10 p-3 text-sm text-emerald-100"
            >
              {success}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={submitDecision}
              disabled={isSubmitting || isPending}
              className="inline-flex min-h-[44px] items-center rounded-md bg-[var(--accent-primary)] px-4 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving…' : `Confirm ${decision}`}
            </button>
            <button
              type="button"
              onClick={rerun}
              disabled={isSubmitting || isPending}
              className="inline-flex min-h-[44px] items-center rounded-md border border-white/20 px-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              Rerun classifier
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default ModerationReviewPanel;
