'use client';

/**
 * VerifiedLinkCard
 * ----------------------------------------------------------------------------
 * Athlete-side tile for a VERIFIED hs_parent_athlete_links row. The athlete
 * has already confirmed the parent — this card gives them a way out if the
 * relationship changes or they linked the wrong person.
 *
 * Critical legal-UX contract (repeated in the confirm dialog so the athlete
 * understands): unlinking does NOT revoke active parental consents. Consent
 * rows in `parental_consents` are legally binding for the deals they already
 * cover. Unlinking only prevents the parent from approving NEW deals going
 * forward.
 *
 * Action: Unlink (destructive). One button, one confirm dialog, POST to the
 * sibling /remove endpoint, router.refresh() on success.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'error'; message: string };

export interface VerifiedLinkCardProps {
  linkId: string;
  parentFullName: string;
  /** Already masked on the server — render as-is. */
  parentEmailMasked: string;
  relationship: 'parent' | 'legal_guardian';
  /** ISO timestamp from hs_parent_athlete_links.verified_at. */
  verifiedAt: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const RELATIONSHIP_LABEL: Record<
  VerifiedLinkCardProps['relationship'],
  string
> = {
  parent: 'Parent',
  legal_guardian: 'Legal guardian',
};

export default function VerifiedLinkCard({
  linkId,
  parentFullName,
  parentEmailMasked,
  relationship,
  verifiedAt,
}: VerifiedLinkCardProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const submitting = status.kind === 'submitting';

  async function handleUnlink() {
    setStatus({ kind: 'submitting' });
    try {
      const res = await fetch(
        `/api/hs/athlete/links/${encodeURIComponent(linkId)}/remove`,
        { method: 'POST' }
      );
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? 'Could not unlink this parent.');
      }
      setConfirmOpen(false);
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
    <article className="rounded-2xl border border-emerald-400/30 bg-emerald-500/5 p-6 backdrop-blur-sm md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
            Linked ·{' '}
            {RELATIONSHIP_LABEL[relationship]}
          </p>
          <h3 className="mt-1 font-display text-xl text-white md:text-2xl">
            {parentFullName}
          </h3>
          <p className="mt-1 text-xs text-white/60">{parentEmailMasked}</p>
          <p className="mt-2 text-sm text-white/70">
            Verified {formatDate(verifiedAt)}
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

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={submitting}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Unlink
        </button>
      </div>

      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`verified-dialog-${linkId}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--marketing-gray-900,#0a0a0a)] p-6 text-white shadow-xl">
            <h2
              id={`verified-dialog-${linkId}`}
              className="font-display text-2xl"
            >
              Unlink {parentFullName}?
            </h2>
            <p className="mt-3 text-sm text-white/80">
              Unlink <strong>{parentFullName}</strong>? Any active parental
              consents from them will remain signed for existing deals, but
              they&rsquo;ll no longer be able to approve new deals until a new
              link is established.
            </p>

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
                  setConfirmOpen(false);
                  if (status.kind === 'error') setStatus({ kind: 'idle' });
                }}
                disabled={submitting}
                className="min-h-[44px] rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
              >
                Keep link
              </button>
              <button
                type="button"
                onClick={handleUnlink}
                disabled={submitting}
                className="min-h-[44px] rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Unlinking…' : 'Unlink parent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
