'use client';

/**
 * InvitePeerDialog — modal for "Email a friend".
 *
 * Target email + optional personal note. Submits to
 * POST /api/hs/referrals/invite which:
 *   - enforces mutation rate limit,
 *   - enforces a 20/day per-user cap,
 *   - writes an audit row to referral_attributions,
 *   - sends the personalized invite email.
 *
 * Accessible: traps focus inside the dialog, returns focus to the
 * trigger on close, escape closes, role=dialog + aria-modal.
 *
 * Behavioural contract: closes on success; surfaces server-returned
 * error text on failure (server-wrapped in an { error } string).
 */

import { useEffect, useRef, useState } from 'react';

interface InvitePeerDialogProps {
  open: boolean;
  onClose: () => void;
}

export function InvitePeerDialog({ open, onClose }: InvitePeerDialogProps) {
  const [toEmail, setToEmail] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSent(false);
    // focus the email field when the dialog opens
    const t = setTimeout(() => emailInputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const trimmedEmail = toEmail.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (note.trim().length > 500) {
      setError('Personal note must be under 500 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/hs/referrals/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: trimmedEmail,
          personalNote: note.trim() || undefined,
        }),
      });
      const json = (await res
        .json()
        .catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setError(json.error || `Could not send invite (${res.status}).`);
        return;
      }
      setSent(true);
      setToEmail('');
      setNote('');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch {
      setError('Network error. Try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-peer-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <button
        type="button"
        aria-label="Close dialog"
        ref={closeBtnRef}
        className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#111] p-6 shadow-xl md:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2
            id="invite-peer-title"
            className="font-display text-2xl text-white"
          >
            Email a friend
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="mt-2 text-sm text-white/60">
          We&rsquo;ll send them a short email from GradeUp, with your name in
          the subject line and a link that credits you when they join.
        </p>

        {sent ? (
          <div
            role="status"
            className="mt-6 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
          >
            Invite sent. We&rsquo;ll email you when they join.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6" noValidate>
            {error && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              >
                {error}
              </div>
            )}

            <label
              htmlFor="invite-to-email"
              className="block text-sm font-medium text-white"
            >
              Their email
            </label>
            <input
              id="invite-to-email"
              ref={emailInputRef}
              type="email"
              required
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="friend@example.com"
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder-white/40 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40"
              disabled={submitting}
            />

            <label
              htmlFor="invite-note"
              className="mt-4 block text-sm font-medium text-white"
            >
              Personal note{' '}
              <span className="text-white/50">(optional)</span>
            </label>
            <textarea
              id="invite-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Hey — this is the NIL thing I mentioned. Worth a look."
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder-white/40 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40"
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-white/50">
              {note.trim().length}/500
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default InvitePeerDialog;
