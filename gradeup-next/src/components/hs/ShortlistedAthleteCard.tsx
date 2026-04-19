'use client';

/**
 * ShortlistedAthleteCard — one card per saved athlete on
 * /hs/brand/shortlist.
 *
 * Differs from SuggestedAthleteCard in three ways:
 *   1. "Remove from shortlist" replaces the thumb cluster.
 *   2. Inline notes editor (PATCH /api/hs/brand/shortlist).
 *   3. "Propose a deal" CTA kept, same HMAC-signed athleteRef.
 */

import Link from 'next/link';
import { useCallback, useId, useState, useTransition } from 'react';

export type GpaTier =
  | 'self_reported'
  | 'user_submitted'
  | 'institution_verified';

export interface ShortlistedAthleteCardProps {
  athleteRef: string;
  firstName: string;
  schoolName: string | null;
  sport: string | null;
  gpa: number | null;
  gpaVerificationTier: GpaTier;
  stateCode: string | null;
  graduationYear: number | null;
  affinityScore: number;
  signalCount: number;
  notes: string | null;
  savedAt: string;
}

const STATE_LABELS: Record<string, string> = {
  CA: 'California',
  FL: 'Florida',
  GA: 'Georgia',
  TX: 'Texas',
};

const TIER_LABEL: Record<GpaTier, string> = {
  self_reported: 'Self-reported',
  user_submitted: 'In review',
  institution_verified: 'Verified',
};

const TIER_TONE: Record<GpaTier, string> = {
  self_reported: 'border-white/15 bg-white/5 text-white/70',
  user_submitted:
    'border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]',
  institution_verified:
    'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ShortlistedAthleteCard({
  athleteRef,
  firstName,
  schoolName,
  sport,
  gpa,
  gpaVerificationTier,
  stateCode,
  graduationYear,
  affinityScore,
  signalCount,
  notes,
  savedAt,
}: ShortlistedAthleteCardProps) {
  const [localNotes, setLocalNotes] = useState(notes ?? '');
  const [savedNotes, setSavedNotes] = useState(notes ?? '');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [pending, startTransition] = useTransition();
  const notesId = useId();
  const errorId = useId();

  const handleSaveNotes = useCallback(() => {
    if (pending) return;
    setError(null);
    const payload = localNotes.trim();
    startTransition(async () => {
      try {
        const res = await fetch('/api/hs/brand/shortlist', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            athleteRef,
            notes: payload || null,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        setSavedNotes(payload);
        setEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed');
      }
    });
  }, [athleteRef, localNotes, pending]);

  const handleRemove = useCallback(() => {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/hs/brand/shortlist', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ athleteRef }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        setRemoved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Remove failed');
      }
    });
  }, [athleteRef, pending]);

  if (removed) {
    return (
      <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm text-white/50">
        Removed from shortlist.
      </article>
    );
  }

  const gpaText = gpa !== null ? gpa.toFixed(2) : '—';
  const stateLabel = stateCode ? (STATE_LABELS[stateCode] ?? stateCode) : '—';
  const tierLabel = TIER_LABEL[gpaVerificationTier];
  const tierTone = TIER_TONE[gpaVerificationTier];
  const proposeHref = `/hs/brand/deals/new?athlete=${encodeURIComponent(athleteRef)}`;

  return (
    <article className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/25">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl text-white">{firstName}</p>
          <p className="mt-1 text-sm text-white/70">
            {schoolName ?? 'School unknown'}
            {sport ? ` · ${sport}` : ''}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-white/40">
            Saved {formatDate(savedAt)}
          </p>
        </div>
        <div className="text-right">
          <p
            className={`font-display text-xl leading-none ${
              affinityScore > 0
                ? 'text-emerald-300'
                : affinityScore < 0
                  ? 'text-rose-300'
                  : 'text-white/50'
            }`}
          >
            {affinityScore > 0 ? '+' : ''}
            {affinityScore.toFixed(2)}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            affinity · {signalCount}
          </p>
        </div>
      </header>

      <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="font-semibold uppercase tracking-wider text-white/40">
            GPA
          </dt>
          <dd className="mt-1 flex items-center gap-2">
            <span className="font-display text-lg text-white">{gpaText}</span>
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${tierTone}`}
            >
              {tierLabel}
            </span>
          </dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-wider text-white/40">
            Graduation
          </dt>
          <dd className="mt-1 font-display text-lg text-white">
            {graduationYear ?? '—'}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="font-semibold uppercase tracking-wider text-white/40">
            State
          </dt>
          <dd className="mt-1">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/90">
              {stateLabel}
            </span>
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <label
          htmlFor={notesId}
          className="text-[10px] font-semibold uppercase tracking-wider text-white/40"
        >
          Notes
        </label>
        {editing ? (
          <div className="mt-1">
            <textarea
              id={notesId}
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--accent-primary)] focus:outline-none"
              placeholder="Why you saved this athlete…"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={pending}
                className="inline-flex min-h-[32px] items-center rounded-md border border-[var(--accent-primary)] bg-[var(--accent-primary)] px-3 py-1 text-xs font-semibold text-black hover:opacity-90"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setLocalNotes(savedNotes);
                  setEditing(false);
                  setError(null);
                }}
                disabled={pending}
                className="inline-flex min-h-[32px] items-center rounded-md border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80 hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-1">
            <p
              id={notesId}
              className={`rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-sm ${
                savedNotes ? 'text-white/80' : 'italic text-white/40'
              }`}
            >
              {savedNotes || 'No notes yet.'}
            </p>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-2 text-xs font-semibold text-[var(--accent-primary)] hover:underline"
            >
              Edit notes
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          href={proposeHref}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-[var(--accent-primary)] px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Propose a deal
        </Link>
        <button
          type="button"
          onClick={handleRemove}
          disabled={pending}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/70 transition-colors hover:border-rose-400/40 hover:text-rose-200"
        >
          Remove
        </button>
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-2 text-xs text-rose-300">
          {error}
        </p>
      )}
    </article>
  );
}
