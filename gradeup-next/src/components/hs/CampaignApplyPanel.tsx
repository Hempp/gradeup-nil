'use client';

/**
 * CampaignApplyPanel — athlete-facing apply button + consent-gap
 * redirect. Client Component — manages submit state and reacts to
 * 409 consent_scope_gap by offering a redirect into the consent
 * request flow with the suggested scope prefilled.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Props {
  campaignId: string;
  initialCovered: boolean;
  alreadyApplied: boolean;
}

export default function CampaignApplyPanel(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [consentGap, setConsentGap] = useState<boolean>(false);

  if (props.alreadyApplied) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/70">
        You already applied to this campaign. Check your dashboard for
        status updates.
      </div>
    );
  }

  async function handleApply() {
    setBusy(true);
    setError(null);
    setConsentGap(false);
    try {
      const res = await fetch('/api/hs/athlete/campaigns/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: props.campaignId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        violations?: string[];
      };
      if (res.status === 409 && data.error === 'consent_scope_gap') {
        setConsentGap(true);
        setError(
          data.violations?.[0] ??
            'Your current parental consent does not cover this campaign.',
        );
        return;
      }
      if (!res.ok) {
        setError(
          data.violations?.join(' · ') ?? data.error ?? 'Could not apply.',
        );
        return;
      }
      router.push('/hs/athlete');
    } catch {
      setError('Unexpected error.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      {error && (
        <p className="mb-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {!props.initialCovered || consentGap ? (
          <Link
            href="/hs/consent/request"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-amber-400/50 bg-amber-400/10 px-5 py-3 text-sm font-semibold text-amber-200"
          >
            Ask a parent to expand consent
          </Link>
        ) : null}
        <button
          type="button"
          onClick={handleApply}
          disabled={busy}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent-primary)] px-5 py-3 text-sm font-semibold text-black disabled:opacity-50"
        >
          {busy ? 'Applying...' : 'Apply to this campaign'}
        </button>
      </div>
    </div>
  );
}
