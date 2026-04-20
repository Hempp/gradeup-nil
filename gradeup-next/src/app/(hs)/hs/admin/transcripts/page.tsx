'use client';

/**
 * Ops review dashboard for the Tier B transcript queue.
 *
 * Client Component so we can ride the existing `useRequireAuth` hook and
 * keep the review flow fully interactive (approve / reject / resubmit
 * without a full page reload). Server-side auth is the source of truth —
 * this page only renders after the API confirms an admin role by
 * returning data from GET /api/hs/admin/transcripts. The layout-level
 * `useRequireAuth({ allowedRoles: ['admin'] })` blocks non-admins before
 * this component mounts.
 *
 * The underlying `(hs)` layout still 404s when FEATURE_HS_NIL is off, so
 * this page is only reachable during the pilot.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRequireAuth } from '@/context';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

type Decision = 'approve' | 'reject' | 'request_resubmission';

interface OcrSummary {
  provider: string;
  extracted_gpa: number | null;
  extracted_gpa_scale: number | null;
  extracted_gpa_normalised_4_0: number | null;
  extracted_term: string | null;
  confidence: number | null;
  matches_claimed: boolean;
  meets_auto_threshold: boolean;
  processed_at: string;
  error: string | null;
}

interface QueueRow {
  id: string;
  athlete_user_id: string;
  storage_path: string;
  original_filename: string;
  file_size_bytes: number;
  mime_type: string;
  claimed_gpa: number;
  status: string;
  created_at: string;
  signed_view_url: string | null;
  ocr: OcrSummary | null;
}

export default function TranscriptReviewPage() {
  const { user, isLoading, isAuthenticated, isAdmin } = useRequireAuth({
    allowedRoles: ['admin'],
    redirectTo: '/login',
  });

  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setQueueError(null);
    try {
      const res = await fetch('/api/hs/admin/transcripts', {
        method: 'GET',
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || `Queue load failed (${res.status})`);
      }
      setRows(Array.isArray(json.submissions) ? json.submissions : []);
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : 'Queue load failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && isAdmin()) {
      refetch();
    }
  }, [isAuthenticated, isAdmin, refetch]);

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-3 text-white/70">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Checking access…</span>
        </div>
      );
    }
    if (!isAdmin()) {
      return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-white/70">
          This page is for platform administrators only.
        </div>
      );
    }
    return (
      <>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
              Ops queue
            </p>
            <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
              Transcript reviews
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Review pending athlete transcripts. Approvals write the GPA to
              the athlete profile and send an email. Rejections email the
              athlete with any note you provide.
            </p>
          </div>
          <Button variant="outline" onClick={refetch} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>

        {queueError && (
          <p className="mt-6 rounded-md border border-[var(--color-error,#DA2B57)]/50 bg-[var(--color-error,#DA2B57)]/10 p-3 text-sm text-[var(--color-error,#DA2B57)]">
            {queueError}
          </p>
        )}

        {loading && rows.length === 0 && (
          <p className="mt-8 text-white/60">Loading queue…</p>
        )}

        {!loading && rows.length === 0 && !queueError && (
          <p className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6 text-white/70">
            Nothing in the queue right now.
          </p>
        )}

        <ul className="mt-8 space-y-4">
          {rows.map((row) => (
            <ReviewCard
              key={row.id}
              row={row}
              onReviewed={refetch}
            />
          ))}
        </ul>
      </>
    );
  }, [isLoading, isAdmin, rows, loading, queueError, refetch]);

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 py-16">
        {user ? content : null}
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Review card
// ---------------------------------------------------------------------------

function ReviewCard({
  row,
  onReviewed,
}: {
  row: QueueRow;
  onReviewed: () => void;
}) {
  const [approvedGpa, setApprovedGpa] = useState<string>(
    row.claimed_gpa.toFixed(2)
  );
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [athleteVisibleNote, setAthleteVisibleNote] = useState('');
  const [submitting, setSubmitting] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessError, setReprocessError] = useState<string | null>(null);

  async function reprocess(
    provider?: 'openai' | 'google' | 'stub'
  ): Promise<void> {
    setReprocessing(true);
    setReprocessError(null);
    try {
      const res = await fetch(
        '/api/hs/admin/actions/transcript-reprocess',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submissionId: row.id,
            provider,
          }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || `Reprocess failed (${res.status})`);
      }
      onReviewed();
    } catch (err) {
      setReprocessError(
        err instanceof Error ? err.message : 'Reprocess failed.'
      );
    } finally {
      setReprocessing(false);
    }
  }

  async function submit(decision: Decision) {
    setError(null);
    if (decision === 'approve') {
      const n = Number(approvedGpa);
      if (!Number.isFinite(n) || n < 0 || n > 5) {
        setError('Enter an approved GPA between 0.00 and 5.00.');
        return;
      }
    }

    setSubmitting(decision);
    try {
      const res = await fetch('/api/hs/admin/transcripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: row.id,
          decision,
          approvedGpa:
            decision === 'approve' ? Number(approvedGpa) : undefined,
          reviewerNotes: reviewerNotes || undefined,
          athleteVisibleNote: athleteVisibleNote || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || `Review failed (${res.status})`);
      }
      onReviewed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed.');
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <li className="rounded-xl border border-white/10 bg-white/5 p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Submission
          </p>
          <p className="mt-1 font-mono text-sm text-white/80">{row.id}</p>
        </div>
        <dl className="flex flex-wrap gap-4 text-sm text-white/70">
          <Fact label="Claimed GPA" value={row.claimed_gpa.toFixed(2)} />
          <Fact label="Athlete" value={row.athlete_user_id.slice(0, 8)} />
          <Fact label="Submitted" value={formatDate(row.created_at)} />
          <Fact
            label="File"
            value={`${row.original_filename} · ${formatBytes(row.file_size_bytes)}`}
          />
        </dl>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {row.signed_view_url ? (
          <a
            href={row.signed_view_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-white/20 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            View file ↗
          </a>
        ) : (
          <span className="text-sm text-white/50">
            File link unavailable (signed URL failed).
          </span>
        )}
      </div>

      <OcrBlock
        ocr={row.ocr}
        claimedGpa={row.claimed_gpa}
        onReprocess={reprocess}
        reprocessing={reprocessing}
        reprocessError={reprocessError}
      />

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="block text-sm">
          <span className="block text-xs font-semibold uppercase tracking-widest text-white/50">
            Approved GPA
          </span>
          <input
            type="number"
            min={0}
            max={5}
            step={0.01}
            value={approvedGpa}
            onChange={(e) => setApprovedGpa(e.target.value)}
            className="mt-2 w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-white outline-none focus:border-[var(--accent-primary)]"
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="block text-xs font-semibold uppercase tracking-widest text-white/50">
            Note to athlete (shown on rejection / resubmission)
          </span>
          <input
            type="text"
            value={athleteVisibleNote}
            onChange={(e) => setAthleteVisibleNote(e.target.value)}
            maxLength={500}
            placeholder="e.g. Please upload a copy with the official seal visible."
            className="mt-2 w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-white outline-none focus:border-[var(--accent-primary)]"
          />
        </label>
        <label className="block text-sm md:col-span-3">
          <span className="block text-xs font-semibold uppercase tracking-widest text-white/50">
            Internal reviewer notes (private)
          </span>
          <textarea
            value={reviewerNotes}
            onChange={(e) => setReviewerNotes(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Anything future ops should know."
            className="mt-2 w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-white outline-none focus:border-[var(--accent-primary)]"
          />
        </label>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-[var(--color-error,#DA2B57)]/50 bg-[var(--color-error,#DA2B57)]/10 p-3 text-sm text-[var(--color-error,#DA2B57)]">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => submit('request_resubmission')}
          disabled={submitting !== null}
        >
          {submitting === 'request_resubmission'
            ? 'Requesting…'
            : 'Request resubmission'}
        </Button>
        <Button
          variant="danger"
          onClick={() => submit('reject')}
          disabled={submitting !== null}
        >
          {submitting === 'reject' ? 'Rejecting…' : 'Reject'}
        </Button>
        <Button
          variant="primary"
          onClick={() => submit('approve')}
          disabled={submitting !== null}
        >
          {submitting === 'approve' ? 'Approving…' : 'Approve'}
        </Button>
      </div>
    </li>
  );
}

function OcrBlock({
  ocr,
  claimedGpa,
  onReprocess,
  reprocessing,
  reprocessError,
}: {
  ocr: OcrSummary | null;
  claimedGpa: number;
  onReprocess: (provider?: 'openai' | 'google' | 'stub') => Promise<void>;
  reprocessing: boolean;
  reprocessError: string | null;
}) {
  if (!ocr) {
    return (
      <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            OCR result
          </p>
          <ReprocessMenu
            onReprocess={onReprocess}
            reprocessing={reprocessing}
          />
        </div>
        <p className="mt-2 text-sm text-white/60">
          No OCR pass on file yet. Click reprocess to run one.
        </p>
        {reprocessError ? (
          <p className="mt-2 text-xs text-[var(--color-error,#DA2B57)]">
            {reprocessError}
          </p>
        ) : null}
      </div>
    );
  }

  const extracted = ocr.extracted_gpa_normalised_4_0;
  const diff =
    extracted !== null ? Math.abs(extracted - claimedGpa) : null;
  let matchTone: 'match' | 'near' | 'miss' = 'miss';
  let matchLabel = 'Mismatch';
  if (diff !== null) {
    if (diff <= 0.05) {
      matchTone = 'match';
      matchLabel = 'Match (±0.05)';
    } else if (diff <= 0.2) {
      matchTone = 'near';
      matchLabel = `Near-match (±${diff.toFixed(2)})`;
    } else {
      matchTone = 'miss';
      matchLabel = `Mismatch (±${diff.toFixed(2)})`;
    }
  }
  const confidence = ocr.confidence ?? 0;
  const confidencePct = Math.round(confidence * 100);

  const confidenceTone =
    confidence >= 0.9
      ? 'rgba(11,135,94,0.9)'
      : confidence >= 0.7
        ? 'rgba(255,176,0,0.9)'
        : 'rgba(218,43,87,0.9)';
  const matchBg =
    matchTone === 'match'
      ? 'rgba(11,135,94,0.18)'
      : matchTone === 'near'
        ? 'rgba(255,176,0,0.18)'
        : 'rgba(218,43,87,0.18)';

  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
          OCR result
        </p>
        <div className="flex items-center gap-2">
          <span
            className="rounded-full border border-white/15 px-2 py-0.5 text-xs font-semibold text-white/80"
            title="OCR provider that produced this result"
          >
            {ocr.provider}
          </span>
          {ocr.meets_auto_threshold && ocr.matches_claimed ? (
            <span className="rounded-full bg-[rgba(11,135,94,0.25)] px-2 py-0.5 text-xs font-semibold text-[rgb(80,200,140)]">
              Auto-approved
            </span>
          ) : (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/70">
              Needs review
            </span>
          )}
          <ReprocessMenu
            onReprocess={onReprocess}
            reprocessing={reprocessing}
          />
        </div>
      </div>

      <dl className="mt-3 grid gap-3 md:grid-cols-4">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Extracted GPA (norm 4.0)
          </dt>
          <dd className="mt-1 text-sm text-white">
            {extracted !== null ? extracted.toFixed(2) : '—'}
            {ocr.extracted_gpa_scale ? (
              <span className="ml-1 text-white/50">
                ({ocr.extracted_gpa?.toFixed(2)} / {ocr.extracted_gpa_scale})
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Claimed
          </dt>
          <dd className="mt-1 text-sm text-white">{claimedGpa.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Match
          </dt>
          <dd
            className="mt-1 inline-block rounded-md px-2 py-0.5 text-xs font-semibold text-white"
            style={{ background: matchBg }}
          >
            {matchLabel}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Term
          </dt>
          <dd className="mt-1 text-sm text-white">
            {ocr.extracted_term ?? '—'}
          </dd>
        </div>
      </dl>

      <div className="mt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Confidence
          </span>
          <span className="text-xs font-semibold text-white">
            {confidencePct}%
          </span>
        </div>
        <div
          className="mt-1 h-2 w-full rounded-full bg-white/10"
          role="progressbar"
          aria-valuenow={confidencePct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="OCR confidence"
        >
          <div
            className="h-2 rounded-full"
            style={{
              width: `${confidencePct}%`,
              background: confidenceTone,
            }}
          />
        </div>
        <p className="mt-1 text-xs text-white/50">
          Auto-approval threshold is 0.90 with GPA within ±0.05.
        </p>
      </div>

      {ocr.error ? (
        <p className="mt-3 rounded-md border border-[var(--color-error,#DA2B57)]/50 bg-[var(--color-error,#DA2B57)]/10 p-2 text-xs text-[var(--color-error,#DA2B57)]">
          OCR error: {ocr.error}
        </p>
      ) : null}

      {reprocessError ? (
        <p className="mt-2 text-xs text-[var(--color-error,#DA2B57)]">
          {reprocessError}
        </p>
      ) : null}
    </div>
  );
}

function ReprocessMenu({
  onReprocess,
  reprocessing,
}: {
  onReprocess: (provider?: 'openai' | 'google' | 'stub') => Promise<void>;
  reprocessing: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={reprocessing}
        className="rounded-md border border-white/20 px-2 py-1 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-60"
      >
        {reprocessing ? 'Reprocessing…' : 'Reprocess ▾'}
      </button>
      {open && !reprocessing ? (
        <div className="absolute right-0 z-10 mt-1 w-56 rounded-md border border-white/15 bg-black/90 p-1 text-sm text-white shadow-lg">
          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              await onReprocess();
            }}
            className="block w-full rounded px-3 py-2 text-left hover:bg-white/10"
          >
            Default provider (env)
          </button>
          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              await onReprocess('openai');
            }}
            className="block w-full rounded px-3 py-2 text-left hover:bg-white/10"
          >
            Force OpenAI Vision
          </button>
          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              await onReprocess('google');
            }}
            className="block w-full rounded px-3 py-2 text-left hover:bg-white/10"
          >
            Force Google Vision
          </button>
          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              await onReprocess('stub');
            }}
            className="block w-full rounded px-3 py-2 text-left hover:bg-white/10"
          >
            Force stub (dev)
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-widest text-white/50">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-white">{value}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
