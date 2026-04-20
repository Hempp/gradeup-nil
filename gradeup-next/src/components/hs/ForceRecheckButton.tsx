'use client';

/**
 * ForceRecheckButton — Client Component.
 *
 * Submits a POST to /api/hs/admin/actions/regulatory-recheck for a single
 * source. On success refreshes the admin landing page so the last_checked
 * timestamp and any newly created change event appear immediately.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export interface ForceRecheckButtonProps {
  sourceId: string;
  stateCode: string;
}

export function ForceRecheckButton(props: ForceRecheckButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [lastOutcome, setLastOutcome] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    setLastOutcome(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          '/api/hs/admin/actions/regulatory-recheck',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceId: props.sourceId }),
          }
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(
            typeof body?.error === 'string'
              ? body.error
              : `Recheck failed (${res.status}).`
          );
          return;
        }
        setLastOutcome(
          typeof body?.outcome === 'string' ? body.outcome : 'ok'
        );
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error.');
      }
    });
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-label={`Force recheck ${props.stateCode} source`}
        className={[
          'rounded-md border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80 transition-colors',
          isPending
            ? 'cursor-not-allowed opacity-60'
            : 'hover:border-[var(--accent-primary)]/60 hover:text-[var(--accent-primary)]',
        ].join(' ')}
      >
        {isPending ? 'Rechecking…' : 'Force recheck'}
      </button>
      {lastOutcome && (
        <p className="mt-1 text-[10px] text-white/50">
          Last outcome: {lastOutcome}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-1 text-[10px] text-[var(--color-error,#DA2B57)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default ForceRecheckButton;
