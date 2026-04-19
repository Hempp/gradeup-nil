'use client';

/**
 * ConciergeCohortTable — client-rendered table of the concierge-marked
 * waitlist rows with their current funnel position.
 *
 * Funnel stages (right to left = deepest first):
 *   share_observed → deal_paid → deal_signed → consent_signed → signed_up → not_signed_up
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ConciergeCohortRow } from '@/lib/hs-nil/bulk-actions';

const STAGE_ORDER = [
  'not_signed_up',
  'signed_up',
  'consent_signed',
  'deal_signed',
  'deal_paid',
  'share_observed',
] as const;

const STAGE_LABELS: Record<string, string> = {
  not_signed_up: 'Not signed up',
  signed_up: 'Signed up',
  consent_signed: 'Consent signed',
  deal_signed: 'Deal signed',
  deal_paid: 'Deal paid',
  share_observed: 'Share observed',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ConciergeCohortTable({
  rows,
}: {
  rows: ConciergeCohortRow[];
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();

  async function unmark(waitlistId: string) {
    setBusyId(waitlistId);
    try {
      await fetch('/api/hs/admin/ops-tools/concierge/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waitlistId, isConcierge: false }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
        No concierge-cohort members yet. Flip{' '}
        <code>hs_waitlist.is_concierge = true</code> for your pilot parents
        (via the SQL console or the Mark endpoint) and they&rsquo;ll show
        up here.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-sm text-white/80">
        <thead>
          <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-widest text-white/40">
            <th className="py-2 pr-4">Parent / athlete</th>
            <th className="py-2 pr-4">State</th>
            <th className="py-2 pr-4">Days since invite</th>
            <th className="py-2 pr-4">Funnel</th>
            <th className="py-2 pr-4">Latest activity</th>
            <th className="py-2" aria-label="actions"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.waitlistId}
              className="border-b border-white/5 align-top"
            >
              <td className="py-3 pr-4">
                <div className="font-mono text-[11px] text-white/50">
                  {row.waitlistId.slice(0, 8)}
                </div>
                <div className="text-white/90">
                  {row.parentName ?? row.email}
                </div>
                <div className="text-xs text-white/50">
                  {row.email} · {row.role}
                </div>
                {row.schoolName ? (
                  <div className="text-xs text-white/40">
                    {row.schoolName}
                  </div>
                ) : null}
              </td>
              <td className="py-3 pr-4 text-white/70">{row.stateCode}</td>
              <td className="py-3 pr-4">{row.daysSinceInvite}d</td>
              <td className="py-3 pr-4">
                <FunnelDots current={row.funnelPosition} />
                <p className="mt-1 text-[11px] text-white/60">
                  {STAGE_LABELS[row.funnelPosition] ?? row.funnelPosition}
                </p>
              </td>
              <td className="py-3 pr-4 text-xs text-white/60">
                {fmtDate(row.latestActivityAt)}
              </td>
              <td className="py-3">
                <button
                  type="button"
                  onClick={() => unmark(row.waitlistId)}
                  disabled={busyId === row.waitlistId}
                  className="inline-flex items-center rounded-md border border-white/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyId === row.waitlistId ? '…' : 'Unmark'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FunnelDots({ current }: { current: string }) {
  const idx = STAGE_ORDER.indexOf(current as (typeof STAGE_ORDER)[number]);
  return (
    <div className="flex items-center gap-1" aria-label="Funnel position">
      {STAGE_ORDER.map((stage, i) => {
        const reached = i <= idx;
        return (
          <span
            key={stage}
            title={STAGE_LABELS[stage]}
            className={[
              'inline-block h-2 w-6 rounded-full',
              reached
                ? 'bg-[var(--accent-primary)]'
                : 'bg-white/10',
            ].join(' ')}
          />
        );
      })}
    </div>
  );
}

export default ConciergeCohortTable;
