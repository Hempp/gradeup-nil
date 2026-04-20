'use client';

/**
 * StateAdAcceptInvitationForm — Client Component that the authenticated
 * AD uses on the final acceptance page. POSTs to
 * /api/hs/state-ad/invitation/[token]/accept.
 *
 * On success → redirects into /hs/ad-portal so the new AD lands on their
 * dashboard immediately. On failure → surfaces the error inline (expired,
 * already accepted, revoked, etc.) so the admin can re-issue the invite.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export interface StateAdAcceptInvitationFormProps {
  token: string;
  stateCode: string;
  organizationName: string;
}

type FormState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'error'; message: string; code?: string };

export function StateAdAcceptInvitationForm({
  token,
  stateCode,
  organizationName,
}: StateAdAcceptInvitationFormProps) {
  const [state, setState] = useState<FormState>({ phase: 'idle' });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const submitting = state.phase === 'submitting' || isPending;

  async function onAccept() {
    setState({ phase: 'submitting' });
    try {
      const res = await fetch(
        `/api/hs/state-ad/invitation/${encodeURIComponent(token)}/accept`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        }
      );
      type ApiBody = { ok?: boolean; error?: string; code?: string };
      const data: ApiBody = await res.json().catch(() => ({}) as ApiBody);
      if (!res.ok || !data.ok) {
        setState({
          phase: 'error',
          message: data.error || `Request failed (${res.status}).`,
          code: data.code,
        });
        return;
      }
      startTransition(() => {
        router.replace(`/hs/ad-portal?state=${encodeURIComponent(stateCode)}`);
      });
    } catch (err) {
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Network error',
      });
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <h2 className="font-display text-xl text-white md:text-2xl">
        Accept access to {organizationName}
      </h2>
      <p className="mt-2 text-sm text-white/70">
        By accepting, this GradeUp account ({'\u00a0'}
        <span className="font-mono">your signed-in email</span>
        {'\u00a0'}) gets read-only access to every HS-NIL deal + disclosure
        for <strong>{stateCode}</strong>. You can sign out anytime; access can
        be revoked by a GradeUp admin.
      </p>
      <ul className="mt-4 space-y-2 text-sm text-white/70">
        <li>Read-only surface. No write actions.</li>
        <li>
          First-name + last-initial only. No contact info, DOB, or parent PII.
        </li>
        <li>Every page view is audit-logged and visible to you.</li>
      </ul>

      {state.phase === 'error' ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-[var(--color-error,#DA2B57)]/40 bg-[var(--color-error,#DA2B57)]/10 px-3 py-2 text-sm text-[var(--color-error,#DA2B57)]"
        >
          {state.message}
          {state.code ? (
            <span className="ml-2 text-xs text-[var(--color-error,#DA2B57)]/80">
              ({state.code})
            </span>
          ) : null}
        </p>
      ) : null}

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onAccept}
          disabled={submitting}
          className={[
            'inline-flex items-center rounded-md border px-4 py-2 text-xs font-semibold uppercase tracking-widest transition',
            submitting
              ? 'cursor-not-allowed border-white/10 text-white/40'
              : 'border-[var(--accent-primary)]/60 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10',
          ].join(' ')}
        >
          {submitting ? 'Accepting…' : 'Accept invitation'}
        </button>
      </div>
    </div>
  );
}

export default StateAdAcceptInvitationForm;
