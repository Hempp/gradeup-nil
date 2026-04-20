'use client';

/**
 * CampaignParticipantRow — brand-side row for one participant with
 * accept / reject actions. Each action hits the participant-scoped
 * API; successful transitions trigger a router.refresh() so the
 * server-rendered list picks up the new state.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface CampaignParticipantRowProps {
  campaignId: string;
  participationId: string;
  athleteDisplay: string;
  status: string;
  appliedAt: string;
  acceptedAt: string | null;
  individualDealId: string | null;
}

export default function CampaignParticipantRow({
  campaignId,
  participationId,
  athleteDisplay,
  status,
  appliedAt,
  acceptedAt,
  individualDealId,
}: CampaignParticipantRowProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<'idle' | 'accept' | 'reject'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setBusy('accept');
    setError(null);
    try {
      const res = await fetch(
        `/api/hs/brand/campaigns/${campaignId}/participants/${participationId}/accept`,
        { method: 'POST' },
      );
      const data = (await res.json().catch(() => ({}))) as {
        violations?: string[];
        error?: string;
      };
      if (!res.ok) {
        setError(
          data.violations?.join(' · ') ?? data.error ?? 'Could not accept.',
        );
        return;
      }
      router.refresh();
    } catch {
      setError('Unexpected error.');
    } finally {
      setBusy('idle');
    }
  }

  async function handleReject() {
    const reason =
      typeof window !== 'undefined'
        ? window.prompt('Optional note for the athlete (they see this):')
        : null;
    setBusy('reject');
    setError(null);
    try {
      const res = await fetch(
        `/api/hs/brand/campaigns/${campaignId}/participants/${participationId}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: reason || null }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Could not reject.');
        return;
      }
      router.refresh();
    } catch {
      setError('Unexpected error.');
    } finally {
      setBusy('idle');
    }
  }

  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{athleteDisplay}</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-white/40">
            {status}
          </p>
          <p className="mt-1 text-xs text-white/50">
            Applied {new Date(appliedAt).toLocaleDateString()}
            {acceptedAt
              ? ` · Accepted ${new Date(acceptedAt).toLocaleDateString()}`
              : ''}
          </p>
          {individualDealId && (
            <p className="mt-1 text-xs text-[var(--accent-primary)]">
              Deal:{' '}
              <a
                href={`/hs/brand/deals/${individualDealId}`}
                className="underline"
              >
                open the spawned deal
              </a>
            </p>
          )}
          {error && (
            <p className="mt-2 text-xs text-red-300" role="alert">
              {error}
            </p>
          )}
        </div>
        {status === 'applied' && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleAccept}
              disabled={busy !== 'idle'}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              {busy === 'accept' ? 'Accepting...' : 'Accept'}
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={busy !== 'idle'}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50"
            >
              {busy === 'reject' ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
