/**
 * ConsentScopeGap — shown when an HS athlete opens a deal whose terms aren't
 * covered by an active parental consent.
 *
 * The server page is the authority on scope coverage — it calls
 * `checkConsentScope` in `@/lib/hs-nil/deal-validation` and only renders this
 * component when the deal is blocked. We just present the gap clearly and
 * forward the athlete to /hs/consent/request with a pre-filled scope.
 *
 * URL scheme (see Phase 4 output contract):
 *   /hs/consent/request?category=<id>&maxAmount=<usd>&durationMonths=<n>
 * Multiple categories can be passed as repeated `category` params or as a
 * single comma-joined value — we emit the single-param form for readability.
 *
 * Secondary "Decline" action posts to the deal PATCH endpoint with
 * status=rejected. Because this component is surface-level UI we keep the
 * decline behaviour inline — parent pages that don't want it can omit
 * `onDecline` / `dealId`.
 */
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export interface ConsentScopeGapProps {
  /** Human-readable reason this deal isn't covered. */
  reason:
    | 'no_active_consent'
    | 'category_not_covered'
    | 'amount_exceeds_scope'
    | 'duration_exceeds_scope'
    | 'consent_expires_before_deal_end';
  /** What the existing consent (if any) covers, for "you previously approved" copy. */
  existingScopeSummary?: string | null;
  /** The deal's consent-category id (apparel, social_media_promo, etc). */
  suggestedCategory: string | null;
  /** The deal's compensation amount (drives maxAmount prefill). */
  suggestedMaxAmount: number;
  /** The deal's duration in whole months. */
  suggestedDurationMonths: number;
  /** For inline decline — when present, the component shows a decline CTA. */
  dealId?: string;
}

const REASON_COPY: Record<ConsentScopeGapProps['reason'], string> = {
  no_active_consent:
    "Your parent hasn't signed a consent yet. This deal can't move forward until one is on file.",
  category_not_covered:
    "Your existing consent doesn't cover this type of deal. Your parent needs to approve a broader scope.",
  amount_exceeds_scope:
    "This deal is worth more than your existing consent allows. Your parent needs to approve a higher cap.",
  duration_exceeds_scope:
    "This deal runs longer than your existing consent allows. Your parent needs to extend the window.",
  consent_expires_before_deal_end:
    "Your consent expires before this deal would end. Your parent needs to re-sign with a longer window.",
};

function buildPrefillHref(params: {
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

export function ConsentScopeGap({
  reason,
  existingScopeSummary,
  suggestedCategory,
  suggestedMaxAmount,
  suggestedDurationMonths,
  dealId,
}: ConsentScopeGapProps) {
  const [declining, setDeclining] = useState(false);
  const [declineError, setDeclineError] = useState<string | null>(null);

  const href = buildPrefillHref({
    category: suggestedCategory,
    maxAmount: suggestedMaxAmount,
    durationMonths: suggestedDurationMonths,
  });

  async function handleDecline() {
    if (!dealId) return;
    setDeclineError(null);
    setDeclining(true);
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? 'Could not decline the deal.');
      }
      window.location.href = '/hs/deals';
    } catch (err) {
      setDeclineError(
        err instanceof Error ? err.message : 'Something went wrong.',
      );
      setDeclining(false);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6 backdrop-blur-sm md:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">
        Parental consent gap
      </p>
      <h2 className="mt-2 font-display text-2xl text-white md:text-3xl">
        This deal needs consent we don&rsquo;t have yet.
      </h2>
      <p className="mt-3 text-sm text-white/80 md:text-base">
        {REASON_COPY[reason]}
      </p>

      {existingScopeSummary && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
          <p>
            <span className="font-semibold text-white/80">What you have:</span>{' '}
            {existingScopeSummary}
          </p>
          <p className="mt-1">
            <span className="font-semibold text-white/80">What you need:</span>{' '}
            {suggestedCategory ? `${suggestedCategory} coverage` : 'broader coverage'} up
            to ${Math.round(suggestedMaxAmount).toLocaleString()} for{' '}
            {suggestedDurationMonths}{' '}
            {suggestedDurationMonths === 1 ? 'month' : 'months'}.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href={href} className="inline-block">
          <Button size="lg" variant="primary">
            Request parental consent for this deal
          </Button>
        </Link>
        {dealId && (
          <Button
            size="lg"
            variant="outline"
            onClick={handleDecline}
            isLoading={declining}
            disabled={declining}
          >
            Decline this deal
          </Button>
        )}
      </div>

      {declineError && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
        >
          {declineError}
        </p>
      )}
    </div>
  );
}

export default ConsentScopeGap;
