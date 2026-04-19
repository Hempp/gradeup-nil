'use client';

/**
 * TransitionReviewPanel — admin decision UI for a single transition.
 *
 * Two primary actions: Verify, Deny (with 20-char min reason). A third
 * "Request more info" button is deliberately greyed out and TODO-marked
 * for a future release (would need a new 'needs_more_info' status on the
 * transitions table that lets the athlete re-upload without re-initiating).
 *
 * The signed view URL for the enrollment proof is generated server-side
 * (300s TTL) and passed in as a prop.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export interface TransitionReviewPanelProps {
  transitionId: string;
  athleteUserId: string;
  collegeName: string;
  proofSignedUrl: string | null;
  proofStoragePath: string | null;
}

type Mode = 'idle' | 'deny';

export default function TransitionReviewPanel(
  props: TransitionReviewPanelProps
) {
  const { transitionId, proofSignedUrl, proofStoragePath } = props;
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('idle');
  const [denialReason, setDenialReason] = useState('');
  const [submitting, setSubmitting] = useState<'verify' | 'deny' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<'verified' | 'denied' | null>(null);

  async function onVerify() {
    if (!proofStoragePath) {
      setError(
        'Cannot verify without enrollment proof. Ask the athlete to upload first.'
      );
      return;
    }
    setSubmitting('verify');
    setError(null);
    try {
      const res = await fetch('/api/hs/admin/actions/transition-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transitionId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Verify failed (${res.status})`);
      }
      setDone('verified');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verify failed.');
    } finally {
      setSubmitting(null);
    }
  }

  async function onDeny() {
    if (denialReason.trim().length < 20) {
      setError('Denial reason must be at least 20 characters.');
      return;
    }
    setSubmitting('deny');
    setError(null);
    try {
      const res = await fetch('/api/hs/admin/actions/transition-deny', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transitionId,
          denialReason: denialReason.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Deny failed (${res.status})`);
      }
      setDone('denied');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deny failed.');
    } finally {
      setSubmitting(null);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
          Recorded
        </p>
        <p className="mt-2 text-sm text-white/80">
          Transition {done}. The audit log has the entry. The athlete has
          been emailed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-xl border border-white/10 bg-white/5 p-6">
      <div>
        <h3 className="font-display text-xl text-white md:text-2xl">
          Decision panel
        </h3>
        <p className="mt-2 text-sm text-white/70">
          Review the enrollment proof, then verify or deny. Verifying flips
          the athlete&apos;s bracket to college and writes the audit log.
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
          Enrollment proof
        </p>
        {proofSignedUrl ? (
          <a
            href={proofSignedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex min-h-[44px] items-center rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            View proof ↗ (link valid 5 min)
          </a>
        ) : proofStoragePath ? (
          <p className="mt-2 text-sm text-amber-200">
            Signed URL failed. Storage path: <code>{proofStoragePath}</code>
          </p>
        ) : (
          <p className="mt-2 text-sm text-amber-200">
            Athlete has not uploaded proof yet. Cannot verify until they do.
          </p>
        )}
      </div>

      {mode === 'deny' ? (
        <div>
          <label htmlFor="denial-reason" className="block">
            <span className="block text-xs font-semibold uppercase tracking-widest text-white/60">
              Denial reason (shown to athlete, min 20 chars)
            </span>
            <textarea
              id="denial-reason"
              rows={4}
              minLength={20}
              maxLength={2000}
              required
              value={denialReason}
              onChange={(e) => setDenialReason(e.target.value)}
              placeholder="e.g. Uploaded letter is the acceptance letter only, not matriculation confirmation. Please resubmit once you have the enrollment letter from the registrar."
              className="mt-2 w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-error,#DA2B57)] focus:ring-2 focus:ring-[var(--color-error,#DA2B57)]"
              disabled={submitting !== null}
            />
            <span className="mt-1 block text-xs text-white/50">
              {denialReason.trim().length}/20
            </span>
          </label>
        </div>
      ) : null}

      {error && (
        <p className="rounded-md border border-[var(--color-error,#DA2B57)]/50 bg-[var(--color-error,#DA2B57)]/10 p-3 text-sm text-[var(--color-error,#DA2B57)]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          disabled
          className="inline-flex min-h-[44px] cursor-not-allowed items-center rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-white/40"
          title="TODO: request-more-info flow"
        >
          Request more info (coming soon)
        </button>
        {mode === 'deny' ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMode('idle');
                setDenialReason('');
                setError(null);
              }}
              disabled={submitting !== null}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={onDeny}
              disabled={submitting !== null || denialReason.trim().length < 20}
            >
              {submitting === 'deny' ? 'Denying…' : 'Confirm deny'}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="danger"
              onClick={() => setMode('deny')}
              disabled={submitting !== null}
            >
              Deny
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={onVerify}
              disabled={submitting !== null || !proofStoragePath}
            >
              {submitting === 'verify' ? 'Verifying…' : 'Verify transition'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
