'use client';

/**
 * PayoutSetupCard — parent-facing CTA for Stripe Connect onboarding.
 *
 * POSTs to `/api/hs/payouts/onboard`, then redirects the browser to the
 * returned Stripe-hosted onboarding URL. Works for both first-time
 * onboarding and resume/re-verify (the server decides which code path
 * to take based on whether a Connect account id already exists).
 *
 * State states:
 *   - 'not_started'       → "Set up payouts"
 *   - 'in_progress'       → "Resume onboarding"
 *   - 'complete'          → no button (or "Re-verify" if caller allows)
 *   - 'requires_attention'→ "Resolve with Stripe" (requirements_due list)
 *   - 'deauthorized'      → "Restart onboarding"
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export type PayoutOnboardingState =
  | 'not_started'
  | 'in_progress'
  | 'complete'
  | 'requires_attention'
  | 'deauthorized';

interface PayoutSetupCardProps {
  state: PayoutOnboardingState;
  requirementsDue?: string[];
}

function labelFor(state: PayoutOnboardingState): string {
  switch (state) {
    case 'not_started':
      return 'Set up payouts';
    case 'in_progress':
      return 'Resume onboarding';
    case 'complete':
      return 'Re-verify bank details';
    case 'requires_attention':
      return 'Resolve with Stripe';
    case 'deauthorized':
      return 'Restart onboarding';
  }
}

export default function PayoutSetupCard({
  state,
  requirementsDue,
}: PayoutSetupCardProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/hs/payouts/onboard', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const { error: apiError } = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(apiError ?? 'Could not start onboarding. Try again.');
        setSubmitting(false);
        return;
      }

      const { onboardingUrl } = (await res.json()) as {
        onboardingUrl?: string;
      };

      if (!onboardingUrl) {
        setError('Unexpected response from server.');
        setSubmitting(false);
        return;
      }

      // Hand off to Stripe-hosted onboarding.
      window.location.assign(onboardingUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      {state === 'requires_attention' &&
        requirementsDue &&
        requirementsDue.length > 0 && (
          <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            <p className="font-semibold">Stripe needs a few more details:</p>
            <ul className="mt-2 list-disc pl-5 text-amber-100/80">
              {requirementsDue.map((r) => (
                <li key={r}>{r.replace(/_/g, ' ')}</li>
              ))}
            </ul>
          </div>
        )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100"
        >
          {error}
        </div>
      )}

      <Button
        onClick={handleClick}
        disabled={submitting}
        size="lg"
        variant="primary"
      >
        {submitting ? 'Starting…' : labelFor(state)}
      </Button>
    </div>
  );
}
