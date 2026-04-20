'use client';

/**
 * Post-result conversion CTA: turns the estimate into a waitlist signup
 * with state + role + grad year pre-filled from the calculator inputs.
 *
 * Intentionally a thin, inline form rather than a full WaitlistForm
 * import — we're already on a marketing page and a multi-step signup
 * here would break momentum. Email + one-click submit.
 */

import { useId, useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PILOT_STATES, type USPSStateCode } from '@/lib/hs-nil/state-rules';
import {
  type ValuationInput,
  gradLevelToGraduationYear,
} from '@/lib/hs-nil/valuation';

interface ValuationPostCTAProps {
  inputs: ValuationInput;
  valuationRequestId: string | null;
}

type Role = 'athlete' | 'parent';
type Status = 'idle' | 'submitting' | 'done' | 'error';

const PILOT_SET = new Set<USPSStateCode>(PILOT_STATES);

function inferRoleFromGradLevel(
  gradLevel: ValuationInput['gradLevel']
): Role {
  // Parents shopping for a freshman are more common than the kid
  // typing in their own NIL estimate. Senior/college+: lean athlete.
  if (gradLevel === 'senior' || gradLevel === 'college_freshman') return 'athlete';
  return 'parent';
}

export function ValuationPostCTA({
  inputs,
  valuationRequestId,
}: ValuationPostCTAProps) {
  const emailId = useId();
  const errorId = useId();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>(inferRoleFromGradLevel(inputs.gradLevel));
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const stateEligible = PILOT_SET.has(inputs.stateCode);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'submitting' || !stateEligible) return;

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setError(null);

    try {
      const gradYear = gradLevelToGraduationYear(inputs.gradLevel);
      const res = await fetch('/api/hs/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          role,
          state_code: inputs.stateCode,
          ...(role === 'athlete' ? { grad_year: gradYear } : {}),
          sport: inputs.sport,
          referred_by: valuationRequestId
            ? `valuation:${valuationRequestId}`
            : 'valuation',
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? 'Could not join waitlist. Try again.');
        setStatus('error');
        return;
      }

      // Fire-and-forget conversion attribution to the valuation log.
      if (valuationRequestId) {
        // Waitlist endpoint doesn't surface the inserted row id, so we
        // send null. The valuation_requests row still gets flagged as
        // converted_to_waitlist=true for funnel analytics.
        fetch('/api/hs/valuation/estimate/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            valuationRequestId,
            waitlistId: null,
          }),
        }).catch(() => {
          // Best-effort only.
        });
      }

      setStatus('done');
    } catch {
      setError('Network error. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="rounded-2xl border border-[var(--accent-success)]/30 bg-[var(--accent-success)]/10 p-6 text-center">
        <CheckCircle2
          className="mx-auto mb-3 h-10 w-10 text-[var(--accent-success)]"
          aria-hidden="true"
        />
        <h3 className="font-display text-xl font-semibold text-white">
          You&rsquo;re on the list
        </h3>
        <p className="mt-2 text-sm text-white/70">
          We&rsquo;ll email you the moment GradeUp HS opens in {inputs.stateCode}.
          Look out for a message from us.
        </p>
      </div>
    );
  }

  if (!stateEligible) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="font-display text-xl font-semibold text-white">
          Your state isn&rsquo;t in our pilot yet
        </h3>
        <p className="mt-2 text-sm text-white/70">
          GradeUp HS is live in {PILOT_STATES.join(', ')}. Drop your email on
          the main page and we&rsquo;ll reach out the moment we expand.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 sm:p-8"
    >
      <h3 className="font-display text-2xl font-semibold text-white">
        Get first access when we open
      </h3>
      <p className="mt-2 text-sm text-white/70">
        We&rsquo;ll email you when GradeUp HS goes live in {inputs.stateCode}.
        Your calculator inputs come along so we can prioritize your onboarding.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor={emailId} className="sr-only">
            Email
          </label>
          <Input
            id={emailId}
            type="email"
            autoComplete="email"
            placeholder="parent@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === 'error') setStatus('idle');
            }}
            required
            aria-invalid={status === 'error'}
            aria-describedby={status === 'error' ? errorId : undefined}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          isLoading={status === 'submitting'}
          disabled={status === 'submitting'}
          className="gap-2"
        >
          Join waitlist
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <fieldset className="mt-4">
        <legend className="sr-only">I am a</legend>
        <div className="flex gap-3 text-sm text-white/80">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="role"
              value="parent"
              checked={role === 'parent'}
              onChange={() => setRole('parent')}
              className="h-4 w-4 accent-[var(--accent-primary)]"
            />
            I&rsquo;m a parent
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="role"
              value="athlete"
              checked={role === 'athlete'}
              onChange={() => setRole('athlete')}
              className="h-4 w-4 accent-[var(--accent-primary)]"
            />
            I&rsquo;m the athlete
          </label>
        </div>
      </fieldset>

      {status === 'error' && error && (
        <p
          id={errorId}
          role="alert"
          className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}

      <p className="mt-4 text-xs text-white/40">
        No spam. Unsubscribe any time. We don&rsquo;t sell your data.
      </p>
    </form>
  );
}

export default ValuationPostCTA;
