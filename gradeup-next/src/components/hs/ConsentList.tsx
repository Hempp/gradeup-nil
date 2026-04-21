'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Athlete-facing list of parental consents.
 *
 * Groups rows into Pending, Active, and Historical (revoked or expired).
 * Pending rows live in `pending_consents`; Active and Historical rows live in
 * `parental_consents`. The server page hands us pre-normalized shapes so this
 * component only does presentation + mutations (revoke, resend).
 *
 * Revoke opens a confirm dialog and then POSTs to /api/hs/consent/revoke/[id].
 * Resend hits /api/hs/consent/pending/[id]/resend, which is currently a stub
 * (TODO: wire real re-issue logic).
 */

export interface PendingConsent {
  id: string;
  parentEmail: string;
  parentFullName: string | null;
  scope: {
    dealCategories: string[];
    maxDealAmount: number;
    durationMonths: number;
  };
  expiresAt: string; // ISO
  createdAt: string; // ISO
}

export interface ActiveConsent {
  id: string;
  parentEmail: string;
  parentFullName: string;
  relationship: 'parent' | 'legal_guardian';
  scope: {
    dealCategories: string[];
    maxDealAmount: number;
    durationMonths: number;
  };
  signedAt: string; // ISO
  expiresAt: string; // ISO
}

export interface HistoricalConsent {
  id: string;
  parentEmail: string;
  parentFullName: string;
  signedAt: string; // ISO
  expiresAt: string; // ISO
  revokedAt: string | null; // ISO
  scope: {
    dealCategories: string[];
    maxDealAmount: number;
    durationMonths: number;
  };
}

interface ConsentListProps {
  pending: PendingConsent[];
  active: ActiveConsent[];
  historical: HistoricalConsent[];
}

const CATEGORY_LABELS: Record<string, string> = {
  apparel: 'Apparel & merch',
  food_beverage: 'Food & beverage',
  local_business: 'Local business',
  training: 'Training & camps',
  autograph: 'Autograph & memorabilia',
  social_media_promo: 'Social media promo',
};

function labelFor(id: string): string {
  return CATEGORY_LABELS[id] ?? id.replace(/_/g, ' ');
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** "in 3 days", "in 1 hour", "expired 2 days ago". Terse, human. */
function formatRelative(iso: string): string {
  const target = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = target - now;
  const absMs = Math.abs(diffMs);
  const days = Math.floor(absMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor(absMs / (1000 * 60 * 60));
  const minutes = Math.floor(absMs / (1000 * 60));
  const future = diffMs > 0;

  let label: string;
  if (days >= 2) label = `${days} days`;
  else if (days === 1) label = '1 day';
  else if (hours >= 2) label = `${hours} hours`;
  else if (hours === 1) label = '1 hour';
  else if (minutes >= 2) label = `${minutes} minutes`;
  else label = 'less than a minute';

  return future ? `in ${label}` : `${label} ago`;
}

function scopeSummary(scope: {
  dealCategories: string[];
  maxDealAmount: number;
  durationMonths: number;
}): string {
  const count = scope.dealCategories.length;
  const noun = count === 1 ? 'category' : 'categories';
  return `${count} ${noun} · up to $${scope.maxDealAmount.toLocaleString()}/deal · ${scope.durationMonths} mo`;
}

export default function ConsentList({
  pending,
  active,
  historical,
}: ConsentListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [revokeTarget, setRevokeTarget] = useState<ActiveConsent | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [resendStatus, setResendStatus] = useState<
    Record<string, 'idle' | 'loading' | 'sent' | 'error'>
  >({});

  const hasAny =
    pending.length > 0 || active.length > 0 || historical.length > 0;

  const sortedHistorical = useMemo(
    () =>
      [...historical].sort(
        (a, b) =>
          new Date(b.revokedAt ?? b.expiresAt).getTime() -
          new Date(a.revokedAt ?? a.expiresAt).getTime()
      ),
    [historical]
  );

  async function handleRevoke() {
    if (!revokeTarget) return;
    setActionError(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/hs/consent/revoke/${encodeURIComponent(revokeTarget.id)}`,
        { method: 'POST' }
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        ok?: boolean;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? 'Could not revoke this consent.');
      }
      setRevokeTarget(null);
      startTransition(() => router.refresh());
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Revoke failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend(pendingId: string) {
    setResendStatus((prev) => ({ ...prev, [pendingId]: 'loading' }));
    try {
      const res = await fetch(
        `/api/hs/consent/pending/${encodeURIComponent(pendingId)}/resend`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Resend failed.');
      }
      setResendStatus((prev) => ({ ...prev, [pendingId]: 'sent' }));
    } catch {
      setResendStatus((prev) => ({ ...prev, [pendingId]: 'error' }));
    }
  }

  if (!hasAny) {
    return (
      <section
        aria-labelledby="empty-heading"
        className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center"
      >
        <h2 id="empty-heading" className="font-display text-2xl text-white">
          You haven&rsquo;t requested parental consent yet.
        </h2>
        <p className="mt-3 text-sm text-white/70">
          A parent or legal guardian needs to sign off before you can accept NIL
          deals. It takes a few minutes.
        </p>
        <Link
          href="/hs/consent/request"
          className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--accent-primary)] px-5 py-3 font-semibold text-black transition hover:opacity-90"
        >
          Request consent
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-10">
      {actionError && (
        <div
          role="alert"
          className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {actionError}
        </div>
      )}

      {/* Pending */}
      <section aria-labelledby="pending-heading">
        <div className="flex items-baseline justify-between">
          <h2 id="pending-heading" className="font-display text-2xl">
            Waiting on parent
          </h2>
          <span className="text-xs text-white/50">
            {pending.length} {pending.length === 1 ? 'request' : 'requests'}
          </span>
        </div>

        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-white/50">
            No pending requests. New ones will show up here while they wait for
            signature.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pending.map((p) => {
              const expired = new Date(p.expiresAt).getTime() < Date.now();
              const status = resendStatus[p.id] ?? 'idle';
              return (
                <li
                  key={p.id}
                  className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                        Pending signature
                      </p>
                      <p className="mt-1 font-display text-lg text-white">
                        {p.parentFullName ?? p.parentEmail}
                      </p>
                      {p.parentFullName && (
                        <p className="text-xs text-white/60">{p.parentEmail}</p>
                      )}
                      <p className="mt-2 text-sm text-white/70">
                        {scopeSummary(p.scope)}
                      </p>
                      <p className="mt-2 text-xs text-white/50">
                        {expired
                          ? `Link expired ${formatRelative(p.expiresAt)}`
                          : `Link expires ${formatRelative(p.expiresAt)}`}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleResend(p.id)}
                        disabled={status === 'loading' || expired}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {status === 'loading'
                          ? 'Sending…'
                          : status === 'sent'
                            ? 'Resent'
                            : 'Resend email'}
                      </button>
                      {status === 'error' && (
                        <p
                          role="alert"
                          className="text-xs text-red-300"
                        >
                          Couldn&rsquo;t resend. Try again.
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Active */}
      <section aria-labelledby="active-heading">
        <div className="flex items-baseline justify-between">
          <h2 id="active-heading" className="font-display text-2xl">
            Active
          </h2>
          <span className="text-xs text-white/50">
            {active.length} {active.length === 1 ? 'consent' : 'consents'}
          </span>
        </div>

        {active.length === 0 ? (
          <p className="mt-3 text-sm text-white/50">
            No active consent on file. Once a parent signs, their consent shows
            up here.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {active.map((c) => (
              <li
                key={c.id}
                className="rounded-2xl border border-emerald-400/30 bg-emerald-500/5 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                      Signed &middot;{' '}
                      {c.relationship === 'parent' ? 'Parent' : 'Legal guardian'}
                    </p>
                    <p className="mt-1 font-display text-lg text-white">
                      {c.parentFullName}
                    </p>
                    <p className="text-xs text-white/60">{c.parentEmail}</p>
                    <p className="mt-2 text-sm text-white/70">
                      {scopeSummary(c.scope)}
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-white/60">
                      <dt>Signed</dt>
                      <dd className="text-white/80">
                        {formatDate(c.signedAt)}
                      </dd>
                      <dt>Expires</dt>
                      <dd className="text-white/80">
                        {formatDate(c.expiresAt)} ({formatRelative(c.expiresAt)})
                      </dd>
                    </dl>

                    {c.scope.dealCategories.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {c.scope.dealCategories.map((cat) => (
                          <li
                            key={cat}
                            className="rounded-full border border-white/15 bg-black/30 px-2.5 py-0.5 text-[11px] text-white/70"
                          >
                            {labelFor(cat)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setRevokeTarget(c)}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10"
                  >
                    Revoke
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Historical */}
      {sortedHistorical.length > 0 && (
        <section aria-labelledby="history-heading">
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            aria-expanded={historyOpen}
            aria-controls="history-list"
            className="flex w-full items-baseline justify-between text-left"
          >
            <h2
              id="history-heading"
              className="font-display text-2xl text-white/70"
            >
              History
            </h2>
            <span className="text-xs text-white/50">
              {sortedHistorical.length} past &middot;{' '}
              {historyOpen ? 'hide' : 'show'}
            </span>
          </button>

          {historyOpen && (
            <ul id="history-list" className="mt-4 space-y-3">
              {sortedHistorical.map((h) => {
                const revoked = Boolean(h.revokedAt);
                return (
                  <li
                    key={h.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 opacity-70"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
                      {revoked ? 'Revoked' : 'Expired'}
                    </p>
                    <p className="mt-1 font-display text-lg text-white/80">
                      {h.parentFullName}
                    </p>
                    <p className="text-xs text-white/50">{h.parentEmail}</p>
                    <p className="mt-2 text-sm text-white/60">
                      {scopeSummary(h.scope)}
                    </p>
                    <p className="mt-2 text-xs text-white/40">
                      Signed {formatDate(h.signedAt)} ·{' '}
                      {revoked
                        ? `revoked ${formatDate(h.revokedAt as string)}`
                        : `expired ${formatDate(h.expiresAt)}`}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Revoke confirm dialog */}
      {revokeTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="revoke-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--marketing-gray-900,#0a0a0a)] p-6 text-white shadow-xl">
            <h2 id="revoke-title" className="font-display text-2xl">
              Revoke consent?
            </h2>
            <p className="mt-3 text-sm text-white/80">
              Revoke parental consent from{' '}
              <strong>{revokeTarget.parentFullName}</strong>? Active deals may
              pause until a new consent is in place.
            </p>
            <p className="mt-3 text-xs text-white/60">
              You can request a fresh consent at any time — the parent will get
              a new signing link.
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setRevokeTarget(null)}
                disabled={submitting}
                className="min-h-[44px] rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
              >
                Keep consent
              </button>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={submitting || isPending}
                className="min-h-[44px] rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Revoking…' : 'Revoke consent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
