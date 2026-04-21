/**
 * DealAcceptPanel — client-side accept / decline controls for an HS deal.
 *
 * Handshake with the VALIDATION-GATE-extended API:
 *   - Accept: PATCH /api/deals/[id] with { status: 'accepted' }.
 *     Fallback: if the server responds 404/405 (PATCH not wired), we retry
 *     against POST /api/deals/[id]/accept. Both shapes are considered
 *     acceptable per the agent hand-off.
 *   - Decline: PATCH /api/deals/[id] with { status: 'rejected', rejection_reason }.
 *     Fallback: POST /api/deals/[id]/decline with the same body.
 *
 * 409 consent_required semantics:
 *   The server may reject an accept because the athlete's active consent no
 *   longer covers the deal (edge case: consent revoked between page load and
 *   click). We surface this by navigating the athlete to the consent-request
 *   flow with a pre-filled scope built from the server's suggestion (or a
 *   fallback derived from the deal). The URL scheme is:
 *     /hs/consent/request?category=<id>&maxAmount=<usd>&durationMonths=<n>
 */
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export interface DealAcceptPanelProps {
  dealId: string;
  brandName: string;
  dealTitle: string;
  compensationAmount: number;
  startDate: string | null;
  endDate: string | null;
  /** Null when the server couldn't compute a disclosure window. */
  disclosureWindowHours: number | null;
  /** 'school' | 'state_athletic_association' | 'both' | null */
  disclosureRecipient:
    | 'school'
    | 'state_athletic_association'
    | 'both'
    | null;
  /** Deal's consent category id, used to prefill a new consent request if the
   * accept is rejected with consent_required. */
  consentCategory: string | null;
  /** True when the athlete is under 18 and payouts therefore route to parent. */
  isMinor: boolean;
  /** When false, we surface the "set up payouts" banner. */
  payoutsReady: boolean;
}

interface ConsentRequiredSuggestion {
  category?: string | null;
  maxDealAmount?: number;
  durationMonths?: number;
}

interface ApiErrorPayload {
  error?: string;
  code?: string;
  suggestion?: ConsentRequiredSuggestion;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'TBD';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'TBD';
  return d.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDisclosureWindow(hours: number | null): string {
  if (!hours) return 'the window required by your state';
  if (hours % 24 === 0) {
    const days = hours / 24;
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

function formatRecipient(
  recipient: DealAcceptPanelProps['disclosureRecipient'],
): string {
  switch (recipient) {
    case 'school':
      return 'your school';
    case 'state_athletic_association':
      return 'your state athletic association';
    case 'both':
      return 'your school and your state athletic association';
    default:
      return 'your state compliance office';
  }
}

/**
 * Try PATCH, falling back to POST on a method-mismatch response. This keeps
 * the UI resilient against whichever acceptance route the VALIDATION-GATE
 * agent wired. We DO NOT retry on 4xx errors other than 404/405.
 */
async function mutateDeal(
  dealId: string,
  action: 'accept' | 'decline',
  body: Record<string, unknown>,
): Promise<Response> {
  const patchBody = {
    ...body,
    status: action === 'accept' ? 'accepted' : 'rejected',
  };
  const patchRes = await fetch(`/api/deals/${dealId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patchBody),
  });
  if (patchRes.status !== 404 && patchRes.status !== 405) return patchRes;

  // Fallback to sub-route.
  return fetch(`/api/deals/${dealId}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function buildConsentHref(params: {
  category: string | null;
  maxAmount: number;
  durationMonths: number;
}): string {
  const qs = new URLSearchParams();
  if (params.category) qs.set('category', params.category);
  qs.set('maxAmount', String(Math.max(1, Math.round(params.maxAmount))));
  qs.set(
    'durationMonths',
    String(Math.min(24, Math.max(1, Math.round(params.durationMonths)))),
  );
  return `/hs/consent/request?${qs.toString()}`;
}

export function DealAcceptPanel(props: DealAcceptPanelProps) {
  const {
    dealId,
    brandName,
    dealTitle,
    compensationAmount,
    startDate,
    endDate,
    disclosureWindowHours,
    disclosureRecipient,
    consentCategory,
    isMinor,
    payoutsReady,
  } = props;

  const router = useRouter();

  const [mode, setMode] = useState<'idle' | 'confirming' | 'declining'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Close the modal on Escape when a dialog is open and no mutation is in
  // flight. Keeps the UX consistent with the rest of the product and
  // prevents trapping mobile users with no visible Cancel affordance.
  useEffect(() => {
    if (mode === 'idle') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        setMode('idle');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mode, submitting]);

  async function handleAccept() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await mutateDeal(dealId, 'accept', {});

      if (res.status === 409) {
        const payload = (await res.json().catch(() => ({}))) as ApiErrorPayload;
        if (payload.code === 'consent_required') {
          const suggestion = payload.suggestion ?? {};
          const href = buildConsentHref({
            category: suggestion.category ?? consentCategory,
            maxAmount: suggestion.maxDealAmount ?? compensationAmount,
            durationMonths: suggestion.durationMonths ?? 12,
          });
          router.push(href);
          return;
        }
        throw new Error(payload.error ?? 'This deal could not be accepted.');
      }

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as ApiErrorPayload;
        throw new Error(payload.error ?? 'Something went wrong. Try again.');
      }

      // Stay on the deal detail — the server-rendered page will refresh and
      // move us into the in_progress presentation on the next load.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
      setMode('idle');
    }
  }

  async function handleDecline() {
    setError(null);
    setSubmitting(true);
    try {
      const reasonTrimmed = declineReason.trim();
      const res = await mutateDeal(dealId, 'decline', {
        rejection_reason: reasonTrimmed || undefined,
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as ApiErrorPayload;
        throw new Error(payload.error ?? 'Could not decline the deal.');
      }
      router.push('/hs/deals');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  }

  const windowLabel = formatDisclosureWindow(disclosureWindowHours);
  const recipientLabel = formatRecipient(disclosureRecipient);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
        Accept or decline
      </p>
      <h2 className="mt-2 font-display text-2xl text-white md:text-3xl">
        Ready to say yes to {brandName}?
      </h2>

      <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
          Here&rsquo;s what happens next
        </p>
        <ol className="mt-3 space-y-2 text-sm text-white/80 md:text-base">
          <li>
            <span className="mr-2 font-semibold text-white">1.</span>
            You accept &ldquo;{dealTitle}.&rdquo;
          </li>
          <li>
            <span className="mr-2 font-semibold text-white">2.</span>A contract
            is generated for {isMinor ? 'you and your parent' : 'you'} to sign.
          </li>
          <li>
            <span className="mr-2 font-semibold text-white">3.</span>
            Once {isMinor ? 'both signatures' : 'your signature'} land, the deal
            goes active and {recipientLabel} is notified within {windowLabel}.
          </li>
          <li>
            <span className="mr-2 font-semibold text-white">4.</span>
            Deliverables due by {formatDate(endDate)} (starting{' '}
            {formatDate(startDate)}).
          </li>
          <li>
            <span className="mr-2 font-semibold text-white">5.</span>
            Payout (${Math.round(compensationAmount).toLocaleString()}) goes to{' '}
            {isMinor ? "your parent's account" : 'your account'}.
          </li>
        </ol>
      </div>

      {!payoutsReady && (
        <div
          role="status"
          className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"
        >
          <p className="font-semibold">Payouts aren&rsquo;t set up yet.</p>
          <p className="mt-1 text-amber-100/90">
            {isMinor
              ? 'Your parent needs to finish the payout setup before money can move.'
              : 'Finish payout setup so the deal can actually pay out.'}{' '}
            <a
              href="/hs/onboarding/payouts"
              className="font-semibold text-amber-100 underline hover:text-white"
            >
              Set up payouts
            </a>
            .
          </p>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
        >
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          variant="primary"
          onClick={() => setMode('confirming')}
          disabled={submitting}
        >
          Accept deal
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => setMode('declining')}
          disabled={submitting}
        >
          Decline
        </Button>
      </div>

      {/* Accept confirm dialog */}
      {mode === 'confirming' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="accept-confirm-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setMode('idle');
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--marketing-gray-900,#0a0a0a)] p-6 text-white shadow-xl">
            <h3 id="accept-confirm-title" className="font-display text-2xl">
              Accept this deal?
            </h3>
            <p className="mt-3 text-sm text-white/80">
              You&rsquo;re accepting {dealTitle} with {brandName} for $
              {Math.round(compensationAmount).toLocaleString()}.{' '}
              {isMinor
                ? 'A contract will be sent to you and your parent to sign.'
                : 'A contract will be sent for you to sign.'}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setMode('idle')}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAccept}
                isLoading={submitting}
                disabled={submitting}
              >
                Confirm and accept
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Decline dialog */}
      {mode === 'declining' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="decline-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setMode('idle');
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--marketing-gray-900,#0a0a0a)] p-6 text-white shadow-xl">
            <h3 id="decline-title" className="font-display text-2xl">
              Decline this deal?
            </h3>
            <p className="mt-3 text-sm text-white/80">
              {brandName} will be notified. Optional: tell them why so future
              offers come in closer to what you want.
            </p>
            <label
              htmlFor="decline-reason"
              className="mt-4 block text-sm font-medium text-white/80"
            >
              Reason (optional)
            </label>
            <textarea
              id="decline-reason"
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. timing conflicts with my season"
              className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40"
              maxLength={500}
            />
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setMode('idle')}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDecline}
                isLoading={submitting}
                disabled={submitting}
              >
                Decline deal
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default DealAcceptPanel;
