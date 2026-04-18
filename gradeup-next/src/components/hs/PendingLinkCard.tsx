'use client';

/**
 * PendingLinkCard
 * ----------------------------------------------------------------------------
 * Athlete-side tile for a pending hs_parent_athlete_links row. The parent
 * created this pending row at signup; the athlete confirms or declines here,
 * completing (or rejecting) the symmetric-trust contract.
 *
 * UX contract:
 *   - Two actions: Confirm (primary) and Decline (destructive).
 *   - Each action opens a single confirm dialog with unambiguous copy, then
 *     POSTs to the matching API route.
 *   - On success, `router.refresh()` re-fetches the server settings page so
 *     the card relocates out of Pending. On failure, an aria-live region
 *     surfaces the message.
 *
 * Privacy: the parent's email is already masked by the server (see
 * `maskEmail` in /lib/services/hs-nil/athlete-links.ts). We just render it.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Action = 'confirm' | 'decline';
type Status =
  | { kind: 'idle' }
  | { kind: 'submitting'; action: Action }
  | { kind: 'error'; message: string };

export interface PendingLinkCardProps {
  linkId: string;
  parentFullName: string;
  /** Already masked on the server — render as-is. */
  parentEmailMasked: string;
  relationship: 'parent' | 'legal_guardian';
  /** ISO timestamp from hs_parent_athlete_links.created_at. */
  createdAt: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const RELATIONSHIP_LABEL: Record<
  PendingLinkCardProps['relationship'],
  string
> = {
  parent: 'Parent',
  legal_guardian: 'Legal guardian',
};

export default function PendingLinkCard({
  linkId,
  parentFullName,
  parentEmailMasked,
  relationship,
  createdAt,
}: PendingLinkCardProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState<Action | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const submitting = status.kind === 'submitting';

  async function submit(action: Action) {
    setStatus({ kind: 'submitting', action });
    try {
      const path =
        action === 'confirm'
          ? `/api/hs/athlete/links/${encodeURIComponent(linkId)}/verify`
          : `/api/hs/athlete/links/${encodeURIComponent(linkId)}/decline`;
      const res = await fetch(path, { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(
          data.error ??
            (action === 'confirm'
              ? 'Could not confirm this link.'
              : 'Could not decline this link.')
        );
      }
      setConfirmOpen(null);
      setStatus({ kind: 'idle' });
      router.refresh();
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Something went wrong.',
      });
    }
  }

  return (
    <article className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-6 backdrop-blur-sm md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
            Pending your confirmation
          </p>
          <h3 className="mt-1 font-display text-xl text-white md:text-2xl">
            {parentFullName}
          </h3>
          <p className="mt-1 text-xs text-white/60">{parentEmailMasked}</p>
          <p className="mt-2 text-sm text-white/70">
            Claims to be your{' '}
            <strong>
              {RELATIONSHIP_LABEL[relationship].toLowerCase()}
            </strong>{' '}
            · requested {formatDate(createdAt)}
          </p>
        </div>
      </div>

      {status.kind === 'error' && (
        <p
          role="alert"
          aria-live="assertive"
          className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
        >
          {status.message}
        </p>
      )}

      <div
        aria-live="polite"
        className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end"
      >
        <button
          type="button"
          onClick={() => setConfirmOpen('decline')}
          disabled={submitting}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen('confirm')}
          disabled={submitting}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Confirm link
        </button>
      </div>

      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`pending-dialog-${linkId}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--marketing-gray-900,#0a0a0a)] p-6 text-white shadow-xl">
            {confirmOpen === 'confirm' ? (
              <>
                <h2
                  id={`pending-dialog-${linkId}`}
                  className="font-display text-2xl"
                >
                  Confirm this parent link?
                </h2>
                <p className="mt-3 text-sm text-white/80">
                  Confirm that <strong>{parentFullName}</strong> is your parent
                  or legal guardian? They&rsquo;ll be able to approve NIL deals
                  for you. You can unlink at any time.
                </p>
              </>
            ) : (
              <>
                <h2
                  id={`pending-dialog-${linkId}`}
                  className="font-display text-2xl"
                >
                  Decline this link request?
                </h2>
                <p className="mt-3 text-sm text-white/80">
                  Decline the link request from{' '}
                  <strong>{parentFullName}</strong>? They won&rsquo;t be
                  notified — they&rsquo;ll just see the link never completed.
                </p>
              </>
            )}

            {status.kind === 'error' && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
              >
                {status.message}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(null);
                  if (status.kind === 'error') setStatus({ kind: 'idle' });
                }}
                disabled={submitting}
                className="min-h-[44px] rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => submit(confirmOpen)}
                disabled={submitting}
                className={[
                  'min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50',
                  confirmOpen === 'confirm'
                    ? 'bg-[var(--accent-primary)] text-black hover:opacity-90'
                    : 'bg-red-500 text-white hover:bg-red-600',
                ].join(' ')}
              >
                {submitting
                  ? confirmOpen === 'confirm'
                    ? 'Confirming…'
                    : 'Declining…'
                  : confirmOpen === 'confirm'
                    ? 'Confirm link'
                    : 'Decline link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
