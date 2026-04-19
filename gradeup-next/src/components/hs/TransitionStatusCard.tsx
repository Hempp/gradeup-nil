'use client';

/**
 * TransitionStatusCard
 *
 * Athlete-facing read view of their current transition row. Renders four
 * shapes based on the row's status:
 *   - pending (no proof)      → proof-required state + upload prompt
 *   - pending (proof on file) → "under review" state + replace/cancel
 *   - verified                → success card + link back to dashboard
 *   - denied / cancelled      → informational footer; the page above the
 *                               card renders the initiate form again
 *
 * The cancel action is a small POST to /api/hs/athlete/transition/cancel.
 * Router.refresh() after success so the server component re-reads the row.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ncaaDivisionLabel,
  transitionStatusLabel,
  type NcaaDivision,
  type TransitionStatus,
} from '@/lib/hs-nil/transitions';

export interface TransitionStatusCardProps {
  transitionId: string;
  status: TransitionStatus;
  collegeName: string;
  collegeState: string;
  ncaaDivision: NcaaDivision;
  matriculationDate: string;
  sportContinued: boolean;
  proofOnFile: boolean;
  denialReason?: string | null;
  requestedAt: string;
  confirmedAt?: string | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function TransitionStatusCard(props: TransitionStatusCardProps) {
  const {
    transitionId,
    status,
    collegeName,
    collegeState,
    ncaaDivision,
    matriculationDate,
    sportContinued,
    proofOnFile,
    denialReason,
    requestedAt,
    confirmedAt,
  } = props;

  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function onCancel() {
    if (!confirm('Cancel this transition request? You can start a new one afterwards.')) {
      return;
    }
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch('/api/hs/athlete/transition/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transitionId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Cancel failed (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Cancel failed.');
    } finally {
      setCancelling(false);
    }
  }

  // Shared detail rows
  const details = (
    <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2">
      <div>
        <dt className="text-xs font-semibold uppercase tracking-widest text-white/50">
          College
        </dt>
        <dd className="mt-0.5 text-white">
          {collegeName}, {collegeState}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-widest text-white/50">
          Division
        </dt>
        <dd className="mt-0.5 text-white">{ncaaDivisionLabel(ncaaDivision)}</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-widest text-white/50">
          Matriculation
        </dt>
        <dd className="mt-0.5 text-white">{formatDate(matriculationDate)}</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-widest text-white/50">
          Continuing sport
        </dt>
        <dd className="mt-0.5 text-white">{sportContinued ? 'Yes' : 'No'}</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-widest text-white/50">
          Requested
        </dt>
        <dd className="mt-0.5 text-white">{formatDate(requestedAt)}</dd>
      </div>
      {confirmedAt ? (
        <div>
          <dt className="text-xs font-semibold uppercase tracking-widest text-white/50">
            {status === 'verified' ? 'Verified' : 'Resolved'}
          </dt>
          <dd className="mt-0.5 text-white">{formatDate(confirmedAt)}</dd>
        </div>
      ) : null}
    </dl>
  );

  if (status === 'verified') {
    return (
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
          Verified
        </p>
        <h2 className="mt-2 font-display text-2xl md:text-3xl">
          You&apos;re on the college side
        </h2>
        <p className="mt-3 text-sm text-white/80">
          Your enrollment at <strong>{collegeName}</strong> is verified. Your
          account has flipped to the college-NIL bracket. Your high-school
          academic history stays on your profile — nothing is lost.
        </p>
        {details}
        <div className="mt-6">
          <Link
            href="/hs/athlete"
            className="inline-flex min-h-[44px] items-center rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="rounded-xl border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/5 p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          {proofOnFile ? 'Under review' : 'Proof needed'}
        </p>
        <h2 className="mt-2 font-display text-2xl md:text-3xl">
          {proofOnFile
            ? `Reviewing your transition to ${collegeName}`
            : `Upload enrollment proof for ${collegeName}`}
        </h2>
        <p className="mt-3 text-sm text-white/80">
          {proofOnFile
            ? 'An admin is reviewing your enrollment proof. You\u2019ll get an email the moment a decision lands — usually within two business days.'
            : 'We have your request. Upload enrollment proof below to put it in the review queue.'}
        </p>
        {details}
        {cancelError && (
          <p className="mt-4 rounded-md border border-[var(--color-error,#DA2B57)]/50 bg-[var(--color-error,#DA2B57)]/10 p-3 text-sm text-[var(--color-error,#DA2B57)]">
            {cancelError}
          </p>
        )}
        <div className="mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            className="inline-flex min-h-[44px] items-center rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelling ? 'Cancelling…' : 'Cancel transition'}
          </button>
        </div>
      </div>
    );
  }

  // denied / cancelled
  const toneBorder =
    status === 'denied'
      ? 'border-[var(--color-error,#DA2B57)]/40 bg-[var(--color-error,#DA2B57)]/5'
      : 'border-white/10 bg-white/5';
  const eyebrowTone =
    status === 'denied'
      ? 'text-[var(--color-error,#DA2B57)]'
      : 'text-white/60';

  return (
    <div className={`rounded-xl border p-6 text-white ${toneBorder}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest ${eyebrowTone}`}>
        {transitionStatusLabel(status)}
      </p>
      <h2 className="mt-2 font-display text-2xl md:text-3xl">
        {status === 'denied'
          ? `Your transition to ${collegeName} needs another look`
          : `Your transition to ${collegeName} was cancelled`}
      </h2>
      {status === 'denied' && denialReason ? (
        <p className="mt-3 rounded-md border border-white/10 bg-black/30 p-3 text-sm text-white/80">
          <span className="block text-xs font-semibold uppercase tracking-widest text-white/50">
            From our ops team
          </span>
          {denialReason}
        </p>
      ) : (
        <p className="mt-3 text-sm text-white/70">
          You can start a new request below when you&apos;re ready.
        </p>
      )}
      {details}
    </div>
  );
}
