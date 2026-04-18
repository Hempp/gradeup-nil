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
