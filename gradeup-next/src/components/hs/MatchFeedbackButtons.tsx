'use client';

/**
 * MatchFeedbackButtons — per-card feedback controls for a suggested
 * athlete.
 *
 * Four signals:
 *   - thumb_up       positive, +0.10 weight
 *   - thumb_down     negative, -0.20 weight (flips a prior thumb_up)
 *   - dismiss        quiet negative, -0.05 weight; hides this card
 *                    from /hs/brand/suggested for 30 days
 *   - save           stronger positive, +0.20 weight, also adds to
 *                    /hs/brand/shortlist (POST /api/hs/brand/shortlist)
 *
 * Optimistic UI:
 *   Each click flips the local state instantly, then POSTs. On a 4xx/5xx
 *   we roll back and surface a compact error message below the button
 *   row.
 *
 * Privacy:
 *   Feedback is per-brand and never exposed to athletes or other brands.
 */

import { useCallback, useId, useState, useTransition } from 'react';

type FeedbackSignal =
  | 'thumb_up'
  | 'thumb_down'
  | 'dismiss'
  | 'saved_to_shortlist';

interface MatchFeedbackButtonsProps {
  athleteRef: string;
  /** Initial saved / dismissed state so the UI reflects persistence. */
  initialSaved?: boolean;
  initialDismissed?: boolean;
  /**
   * Which page is driving this button cluster. Valid values match the
   * feedback_source_page CHECK in SQL.
   */
  sourcePage?: '/hs/brand/suggested' | '/hs/brand/shortlist';
}

type OpinionState = 'thumb_up' | 'thumb_down' | null;

export default function MatchFeedbackButtons({
  athleteRef,
  initialSaved = false,
  initialDismissed = false,
  sourcePage = '/hs/brand/suggested',
}: MatchFeedbackButtonsProps) {
  const [opinion, setOpinion] = useState<OpinionState>(null);
  const [saved, setSaved] = useState(initialSaved);
  const [dismissed, setDismissed] = useState(initialDismissed);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const errorId = useId();

  const postFeedback = useCallback(
    async (signal: FeedbackSignal) => {
      const res = await fetch('/api/hs/brand/match-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteRef, signal, sourcePage }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
    },
    [athleteRef, sourcePage]
  );

  const saveShortlist = useCallback(
    async (addNotRemove: boolean) => {
      const res = await fetch('/api/hs/brand/shortlist', {
        method: addNotRemove ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteRef }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
    },
    [athleteRef]
  );

  const handleThumb = useCallback(
    (next: OpinionState) => {
      if (pending) return;
      setError(null);
      const prior = opinion;
      // Clicking the already-active thumb clears it. Otherwise it flips.
      const resolved: OpinionState = prior === next ? null : next;
      setOpinion(resolved);

      if (resolved === null) {
        // No-op server-side for now (idempotency group means the prior
        // opinion stays recorded with its weight). A future "clear
        // opinion" signal would be added here.
        return;
      }

      startTransition(async () => {
        try {
          await postFeedback(resolved);
        } catch (err) {
          setOpinion(prior);
          setError(err instanceof Error ? err.message : 'Feedback failed');
        }
      });
    },
    [opinion, pending, postFeedback]
  );

  const handleDismiss = useCallback(() => {
    if (pending || dismissed) return;
    setError(null);
    setDismissed(true);
    startTransition(async () => {
      try {
        await postFeedback('dismiss');
      } catch (err) {
        setDismissed(false);
        setError(err instanceof Error ? err.message : 'Feedback failed');
      }
    });
  }, [dismissed, pending, postFeedback]);

  const handleSaveToggle = useCallback(() => {
    if (pending) return;
    setError(null);
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      try {
        await saveShortlist(next);
      } catch (err) {
        setSaved(!next);
        setError(err instanceof Error ? err.message : 'Save failed');
      }
    });
  }, [pending, saveShortlist, saved]);

  const baseBtn =
    'inline-flex min-h-[36px] items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors';
  const inactive =
    'border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white';
  const active =
    'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]';
  const dangerActive =
    'border-rose-400/50 bg-rose-400/10 text-rose-200';

  if (dismissed) {
    return (
      <div className="mt-4 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white/60">
        <span>Hidden from suggested list for 30 days.</span>
      </div>
    );
  }

  return (
    <div className="mt-4" aria-describedby={error ? errorId : undefined}>
      <div
        role="group"
        aria-label="Match feedback"
        className="flex flex-wrap items-center gap-2"
      >
        <button
          type="button"
          onClick={() => handleThumb('thumb_up')}
          aria-pressed={opinion === 'thumb_up'}
          disabled={pending}
          className={`${baseBtn} ${opinion === 'thumb_up' ? active : inactive}`}
        >
          <span aria-hidden="true">▲</span>
          Good fit
        </button>
        <button
          type="button"
          onClick={() => handleThumb('thumb_down')}
          aria-pressed={opinion === 'thumb_down'}
          disabled={pending}
          className={`${baseBtn} ${opinion === 'thumb_down' ? dangerActive : inactive}`}
        >
          <span aria-hidden="true">▼</span>
          Not a fit
        </button>
        <button
          type="button"
          onClick={handleSaveToggle}
          aria-pressed={saved}
          disabled={pending}
          className={`${baseBtn} ${saved ? active : inactive}`}
        >
          <span aria-hidden="true">{saved ? '★' : '☆'}</span>
          {saved ? 'Saved' : 'Save'}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={pending}
          className={`${baseBtn} ${inactive}`}
        >
          Hide
        </button>
      </div>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-xs text-rose-300"
        >
          {error}
        </p>
      )}
    </div>
  );
}
