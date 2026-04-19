'use client';

/**
 * DeferredPayoutsAdminPanel — client component.
 *
 * Renders one card per deferred payout row with force-release + forfeit
 * buttons. Each action posts to `/api/hs/admin/actions/deferred-release`
 * with the required reason (min 10 chars) and reloads the page on
 * success. Pure SSR page wraps this with auth gating.
 */

import { useState } from 'react';

interface DeferredRow {
  id: string;
  deal_id: string;
  athlete_user_id: string;
  parent_profile_id: string;
  amount_cents: number;
  state_code: string;
  deferral_reason: string;
  release_eligible_at: string;
  status: string;
  released_at: string | null;
  released_transfer_id: string | null;
  forfeiture_reason: string | null;
  trust_account_identifier: string | null;
  created_at: string;
}

export interface DeferredPayoutsAdminPanelProps {
  title: string;
  rows: DeferredRow[];
  tone?: 'default' | 'error' | 'warn' | 'success';
  emptyCopy: string;
  readOnly?: boolean;
}

function formatMoney(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function daysUntil(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const days = Math.round(diffMs / (24 * 60 * 60 * 1000));
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'today';
  return `${days}d out`;
}

function toneClasses(tone: DeferredPayoutsAdminPanelProps['tone']) {
  switch (tone) {
    case 'error':
      return 'border-[var(--color-error,#DA2B57)]/30 bg-[var(--color-error,#DA2B57)]/5';
    case 'warn':
      return 'border-amber-400/30 bg-amber-400/5';
    case 'success':
      return 'border-emerald-400/30 bg-emerald-400/5';
    default:
      return 'border-white/10 bg-white/5';
  }
}

export function DeferredPayoutsAdminPanel({
  title,
  rows,
  tone = 'default',
  emptyCopy,
  readOnly = false,
}: DeferredPayoutsAdminPanelProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(
    deferredId: string,
    decision: 'release' | 'forfeit',
  ): Promise<void> {
    const verb = decision === 'release' ? 'force release' : 'forfeit';
    const reason = window.prompt(
      `Enter reason for ${verb} (min 10 characters):`,
    );
    if (!reason || reason.trim().length < 10) {
      setError(`Reason must be at least 10 characters to ${verb}.`);
      return;
    }
    const confirmed = window.confirm(
      `Confirm ${verb} of deferral ${deferredId}?\n\nThis writes to the audit log.`,
    );
    if (!confirmed) return;

    setBusyId(deferredId);
    setError(null);

    try {
      const res = await fetch('/api/hs/admin/actions/deferred-release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deferredId, decision, reason: reason.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? `Failed to ${verb}.`);
      } else {
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${verb}.`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section>
      <h2 className="font-display text-2xl text-white">{title}</h2>

      {error && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-[var(--color-error,#DA2B57)]/40 bg-[var(--color-error,#DA2B57)]/10 px-4 py-3 text-sm text-[var(--color-error,#DA2B57)]"
        >
          {error}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="mt-4 rounded-lg border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/60">
          {emptyCopy}
        </p>
      ) : (
        <ul className={`mt-4 space-y-3`}>
          {rows.map((row) => (
            <li
              key={row.id}
              className={`rounded-xl border p-5 text-sm ${toneClasses(tone)}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">
                    {formatMoney(row.amount_cents)}{' '}
                    <span className="ml-2 rounded bg-white/10 px-2 py-0.5 text-xs uppercase tracking-widest text-white/70">
                      {row.state_code}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    Releases {formatDate(row.release_eligible_at)} ·{' '}
                    {daysUntil(row.release_eligible_at)}
                  </p>
                </div>
                <div className="text-right text-xs text-white/60">
                  <p>
                    Deal <code className="text-white/80">{row.deal_id.slice(0, 8)}</code>
                  </p>
                  <p>
                    Reason <span className="text-white/80">{row.deferral_reason}</span>
                  </p>
                </div>
              </div>

              {row.trust_account_identifier && (
                <p className="mt-3 text-xs text-white/50">
                  Trust account: <code>{row.trust_account_identifier}</code>
                </p>
              )}

              {row.released_transfer_id && (
                <p className="mt-1 text-xs text-white/50">
                  Stripe transfer:{' '}
                  <code>{row.released_transfer_id}</code>
                  {row.released_at && (
                    <> · released {formatDate(row.released_at)}</>
                  )}
                </p>
              )}

              {row.forfeiture_reason && (
                <p className="mt-1 text-xs text-amber-200/90">
                  Forfeiture: {row.forfeiture_reason}
                </p>
              )}

              {!readOnly && row.status === 'holding' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => handleAction(row.id, 'release')}
                    className="rounded-md border border-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 disabled:opacity-50"
                  >
                    {busyId === row.id ? 'Working…' : 'Force release'}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => handleAction(row.id, 'forfeit')}
                    className="rounded-md border border-[var(--color-error,#DA2B57)] px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-error,#DA2B57)] hover:bg-[var(--color-error,#DA2B57)]/10 disabled:opacity-50"
                  >
                    Forfeit
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
