'use client';

/**
 * LinkAthleteForm
 * ----------------------------------------------------------------------------
 * Client Component. The parent types an athlete's email and we POST to
 * /api/hs/parent/link-athlete. The server decides whether the link is
 * `pending_verification` (athlete is in the system, waiting for confirmation)
 * or `pending_invitation` (we'll auto-link when they sign up).
 *
 * Behavior:
 *   - Two render modes: `expanded` (empty-state / first link) and `collapsed`
 *     (a "+ Link another athlete" trigger that toggles into the form).
 *   - Success path preserves the entered email in the banner message so the
 *     parent doesn't have to re-read what they just typed.
 *   - Errors are surfaced inline with role="alert" for a11y.
 *   - router.refresh() fires on success so the server page re-fetches links.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface LinkAthleteFormProps {
  /**
   * Whether to render the form expanded immediately (empty state) or
   * start as a compact "+ Link another athlete" trigger.
   */
  initiallyExpanded?: boolean;
  /** Parent's declared relationship — passed through to the API. */
  relationship?: 'parent' | 'legal_guardian';
}

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'pending_verification'; email: string }
  | { kind: 'pending_invitation'; email: string }
  | { kind: 'error'; message: string };

export default function LinkAthleteForm({
  initiallyExpanded = false,
  relationship,
}: LinkAthleteFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState<boolean>(initiallyExpanded);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setStatus({ kind: 'error', message: "Enter your athlete's email." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus({ kind: 'error', message: 'That email doesn’t look right.' });
      return;
    }

    setStatus({ kind: 'submitting' });

    try {
      const res = await fetch('/api/hs/parent/link-athlete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteEmail: trimmed,
          ...(relationship ? { relationship } : {}),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        status?: 'pending_verification' | 'pending_invitation';
        error?: string;
        code?: string;
      };

      if (!res.ok || !data.ok) {
        const fallback =
          data.code === 'profile_missing'
            ? 'Finish onboarding before linking an athlete.'
            : 'We couldn’t send the link. Try again in a moment.';
        setStatus({ kind: 'error', message: data.error ?? fallback });
        return;
      }

      if (data.status === 'pending_invitation') {
        setStatus({ kind: 'pending_invitation', email: trimmed });
      } else {
        setStatus({ kind: 'pending_verification', email: trimmed });
      }
      setEmail('');
      // Server page re-reads the link list so the new pending row shows up.
      router.refresh();
    } catch {
      setStatus({
        kind: 'error',
        message: 'Network hiccup. Please try again.',
      });
    }
  };

  // Compact trigger — only used when initiallyExpanded is false and the
  // form is not open.
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setStatus({ kind: 'idle' });
        }}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
      >
        <span aria-hidden="true" className="text-[var(--accent-primary)]">
          +
        </span>
        Link another athlete
      </button>
    );
  }

  const submitting = status.kind === 'submitting';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Link your athlete
          </p>
          <h2 className="mt-2 font-display text-2xl text-white md:text-3xl">
            Add an athlete to your account.
          </h2>
          <p className="mt-2 max-w-xl text-sm text-white/70">
            Enter the email your athlete uses to sign in. We&rsquo;ll send them
            a confirmation so the link is two-sided and tamper-proof.
          </p>
        </div>

        {!initiallyExpanded && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm text-white/50 hover:text-white"
            aria-label="Close link-athlete form"
          >
            Close
          </button>
        )}
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <label
            htmlFor="link-athlete-email"
            className="block text-sm font-medium text-white"
          >
            Athlete&rsquo;s email
          </label>
          <input
            id="link-athlete-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status.kind === 'error') setStatus({ kind: 'idle' });
            }}
            disabled={submitting}
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder-white/40 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 disabled:opacity-50"
            placeholder="jordan@example.com"
          />
        </div>

        {status.kind === 'error' && (
          <p
            role="alert"
            className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
          >
            {status.message}
          </p>
        )}

        {status.kind === 'pending_verification' && (
          <p
            role="status"
            className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100"
          >
            Invite sent to <strong>{status.email}</strong>. Your athlete needs
            to confirm the link.
          </p>
        )}

        {status.kind === 'pending_invitation' && (
          <p
            role="status"
            className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
          >
            <strong>{status.email}</strong> isn&rsquo;t registered yet.
            We&rsquo;ll link automatically when they sign up.
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--accent-primary)] px-5 py-3 font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Sending link…' : 'Send link to athlete'}
        </button>
      </form>
    </div>
  );
}
