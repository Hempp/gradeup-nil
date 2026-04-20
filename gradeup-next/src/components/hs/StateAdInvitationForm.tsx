'use client';

/**
 * StateAdInvitationForm — admin-only Client Component to send a new
 * state-AD invitation. POSTs to /api/hs/admin/actions/state-ad/invite.
 *
 * Fields:
 *   - email             (required)
 *   - stateCode         (required; picked from the pre-loaded list)
 *   - organizationName  (required; e.g. "CIF — California Interscholastic Federation")
 *
 * On success → shows the inviter a confirmation with the invitee email and
 * a copy-link affordance so the admin can hand the token off manually if
 * their mail provider queues the automated send.
 */

import { useId, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export interface StateAdInvitationFormProps {
  /** Array of { code, name } pulled from state_nil_rules (or static STATE_RULES). */
  stateOptions: Array<{ code: string; name: string }>;
}

type FormState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | {
      phase: 'done';
      invitedEmail: string;
      stateCode: string;
      organizationName: string;
    }
  | { phase: 'error'; message: string };

export function StateAdInvitationForm({
  stateOptions,
}: StateAdInvitationFormProps) {
  const [state, setState] = useState<FormState>({ phase: 'idle' });
  const [email, setEmail] = useState('');
  const [stateCode, setStateCode] = useState(stateOptions[0]?.code ?? '');
  const [organizationName, setOrganizationName] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const baseId = useId();

  const submitting = state.phase === 'submitting' || isPending;
  const canSubmit =
    !submitting &&
    email.trim().length > 4 &&
    stateCode.length === 2 &&
    organizationName.trim().length >= 2;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setState({ phase: 'submitting' });
    try {
      const res = await fetch('/api/hs/admin/actions/state-ad/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          stateCode,
          organizationName: organizationName.trim(),
        }),
      });
      type ApiBody = {
        ok?: boolean;
        invitation?: { invitedEmail: string; stateCode: string; organizationName: string };
        error?: string;
      };
      const data: ApiBody = await res.json().catch(() => ({}) as ApiBody);
      if (!res.ok || !data.ok || !data.invitation) {
        setState({
          phase: 'error',
          message: data.error || `Request failed (${res.status}).`,
        });
        return;
      }
      setState({
        phase: 'done',
        invitedEmail: data.invitation.invitedEmail,
        stateCode: data.invitation.stateCode,
        organizationName: data.invitation.organizationName,
      });
      setEmail('');
      setOrganizationName('');
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Network error',
      });
    }
  }

  if (state.phase === 'done') {
    return (
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-6 text-sm text-emerald-100">
        <p className="font-semibold">Invitation sent.</p>
        <p className="mt-2 text-emerald-100/80">
          <strong>{state.invitedEmail}</strong> will receive a secure link for{' '}
          <strong>{state.organizationName}</strong> ({state.stateCode}).
          Expires in 30 days.
        </p>
        <button
          type="button"
          onClick={() => setState({ phase: 'idle' })}
          className="mt-4 inline-flex items-center rounded-md border border-emerald-300/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-100 transition hover:bg-emerald-400/10"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6"
      noValidate
    >
      <div>
        <label
          htmlFor={`${baseId}-email`}
          className="block text-[11px] font-semibold uppercase tracking-widest text-white/60"
        >
          Invitee email
        </label>
        <input
          id={`${baseId}-email`}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          className="mt-1 block w-full rounded-md border border-white/20 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[var(--accent-primary)] focus:outline-none"
          placeholder="compliance@cifstate.org"
        />
      </div>

      <div>
        <label
          htmlFor={`${baseId}-state`}
          className="block text-[11px] font-semibold uppercase tracking-widest text-white/60"
        >
          State
        </label>
        <select
          id={`${baseId}-state`}
          required
          value={stateCode}
          onChange={(e) => setStateCode(e.target.value)}
          disabled={submitting}
          className="mt-1 block w-full rounded-md border border-white/20 bg-black/60 px-3 py-2 text-sm text-white focus:border-[var(--accent-primary)] focus:outline-none"
        >
          {stateOptions.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.code} — {opt.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor={`${baseId}-org`}
          className="block text-[11px] font-semibold uppercase tracking-widest text-white/60"
        >
          Organization name
        </label>
        <input
          id={`${baseId}-org`}
          type="text"
          required
          minLength={2}
          maxLength={200}
          value={organizationName}
          onChange={(e) => setOrganizationName(e.target.value)}
          disabled={submitting}
          className="mt-1 block w-full rounded-md border border-white/20 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[var(--accent-primary)] focus:outline-none"
          placeholder="CIF — California Interscholastic Federation"
        />
      </div>

      {state.phase === 'error' ? (
        <p
          role="alert"
          className="rounded-md border border-[var(--color-error,#DA2B57)]/40 bg-[var(--color-error,#DA2B57)]/10 px-3 py-2 text-xs text-[var(--color-error,#DA2B57)]"
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={!canSubmit}
          className={[
            'inline-flex items-center rounded-md border px-4 py-2 text-xs font-semibold uppercase tracking-widest transition',
            canSubmit
              ? 'border-[var(--accent-primary)]/60 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10'
              : 'cursor-not-allowed border-white/10 text-white/40',
          ].join(' ')}
        >
          {submitting ? 'Sending…' : 'Send invitation'}
        </button>
      </div>
    </form>
  );
}

export default StateAdInvitationForm;
