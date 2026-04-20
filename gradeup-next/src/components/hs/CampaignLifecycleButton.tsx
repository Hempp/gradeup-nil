'use client';

/**
 * CampaignLifecycleButton — small client button that posts to the
 * campaign open/close endpoints and refreshes the page on success.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  action: 'open' | 'close';
  campaignId: string;
  label: string;
}

export default function CampaignLifecycleButton({
  action,
  campaignId,
  label,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/hs/brand/campaigns/${campaignId}/${action}`,
        { method: 'POST' },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `Could not ${action}.`);
        return;
      }
      router.refresh();
    } catch {
      setError(`Unexpected error.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent-primary)] px-5 py-3 text-sm font-semibold text-black disabled:opacity-50"
      >
        {busy ? `${action === 'open' ? 'Opening' : 'Closing'}...` : label}
      </button>
      {error && (
        <p className="text-xs text-red-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
