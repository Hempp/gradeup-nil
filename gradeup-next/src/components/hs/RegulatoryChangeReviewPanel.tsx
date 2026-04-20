'use client';

/**
 * RegulatoryChangeReviewPanel — Client Component.
 *
 * Admin review form for a single regulatory_change_events row. Lets the
 * operator pick an outcome (no_change / minor_update / rule_change /
 * unable_to_parse) and record structured notes. Submits to the admin
 * review API. On success, refreshes the page (the event drops out of
 * the unreviewed queue on re-render).
 *
 * Outcome semantics (reminder to the reviewing admin):
 *   - no_change: cosmetic churn on the tracked page (nav/footer, date).
 *                Filters this signal out of the queue.
 *   - minor_update: real content edit but no rules shift (typo fixes,
 *                   contact info updates).
 *   - rule_change: STATE_RULES engine needs an edit. Writes an
 *                  admin_audit_log row under 'regulatory_change_reviewed'.
 *   - unable_to_parse: we couldn't reliably tell. Often a 404/timeout —
 *                      already marked this way automatically on fetch
 *                      failures; admin can use it to flag re-polls.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Outcome =
  | 'no_change'
  | 'minor_update'
  | 'rule_change'
  | 'unable_to_parse';

export interface RegulatoryChangeReviewPanelProps {
  eventId: string;
  stateCode: string;
  sourceUrl: string;
  defaultOutcome?: Outcome;
}

const OUTCOME_OPTIONS: { value: Outcome; label: string; hint: string }[] = [
  {
    value: 'no_change',
    label: 'No change',
    hint: 'Cosmetic churn (nav, footer, date stamp). Filter out of signal.',
  },
  {
    value: 'minor_update',
    label: 'Minor update',
    hint: 'Page edited but no rules shift (typo, contact info).',
  },
  {
    value: 'rule_change',
    label: 'Rule change',
    hint: 'STATE_RULES needs an update. Writes an admin audit log entry.',
  },
  {
    value: 'unable_to_parse',
    label: 'Unable to parse',
    hint: 'Fetch failed / page unreadable / needs a re-poll later.',
  },
];

export function RegulatoryChangeReviewPanel(
  props: RegulatoryChangeReviewPanelProps
) {
  const [outcome, setOutcome] = useState<Outcome>(
    props.defaultOutcome ?? 'no_change'
  );
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submittedOk, setSubmittedOk] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const notesTooShort = notes.trim().length < 10;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (notesTooShort) {
      setError('Review notes must be at least 10 characters.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(
          '/api/hs/admin/actions/regulatory-change-review',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventId: props.eventId,
              outcome,
              notes: notes.trim(),
            }),
          }
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(
            typeof body?.error === 'string'
              ? body.error
              : `Review failed (${res.status}).`
          );
          return;
        }
        setSubmittedOk(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error.');
      }
    });
  }

  if (submittedOk) {
    return (
      <div
        role="status"
        className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 p-4 text-sm text-emerald-100"
      >
        Review recorded. This event will drop off the unreviewed queue on
        next refresh.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 md:p-6"
    >
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-widest text-white/60">
          Review outcome
        </legend>
        <div className="mt-3 space-y-2">
          {OUTCOME_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={[
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                outcome === opt.value
                  ? 'border-[var(--accent-primary)]/60 bg-[var(--accent-primary)]/5'
                  : 'border-white/10 bg-black/30 hover:bg-white/5',
              ].join(' ')}
            >
              <input
                type="radio"
                name="regulatory-review-outcome"
                value={opt.value}
                checked={outcome === opt.value}
                onChange={() => setOutcome(opt.value)}
                className="mt-1 h-4 w-4 accent-[var(--accent-primary)]"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-white">
                  {opt.label}
                </span>
                <span className="mt-0.5 block text-xs text-white/60">
                  {opt.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="review-notes"
          className="text-xs font-semibold uppercase tracking-widest text-white/60"
        >
          Review notes
        </label>
        <textarea
          id="review-notes"
          rows={5}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did you find? Paste the relevant line or section. Minimum 10 characters."
          className="mt-2 w-full rounded-lg border border-white/15 bg-black/40 p-3 text-sm text-white outline-none transition-colors focus:border-[var(--accent-primary)]/60"
          required
          minLength={10}
          maxLength={2000}
        />
        <p className="mt-1 text-xs text-white/40">
          Notes become part of the audit trail if outcome is "rule change".
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-[var(--color-error,#DA2B57)]/60 bg-[var(--color-error,#DA2B57)]/10 px-3 py-2 text-sm text-[var(--color-error,#DA2B57)]"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <p className="text-xs text-white/50">
          Reviewing event for <strong>{props.stateCode}</strong> ·{' '}
          <a
            href={props.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-white/30 underline-offset-2"
          >
            open source
          </a>
        </p>
        <button
          type="submit"
          disabled={isPending || notesTooShort}
          className={[
            'rounded-md px-4 py-2 text-sm font-semibold transition-colors',
            isPending || notesTooShort
              ? 'cursor-not-allowed bg-white/10 text-white/40'
              : 'bg-[var(--accent-primary)] text-black hover:bg-white',
          ].join(' ')}
        >
          {isPending ? 'Submitting…' : 'Record review'}
        </button>
      </div>
    </form>
  );
}

export default RegulatoryChangeReviewPanel;
