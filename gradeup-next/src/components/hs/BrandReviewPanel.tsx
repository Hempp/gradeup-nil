'use client';

/**
 * BrandReviewPanel
 *
 * Client island on /hs/brand/deals/[id]. Renders two primary action
 * buttons ("Approve & release payout" / "Request revision") and wires
 * each to a ReviewDecisionDialog confirmation. On submit, POSTs to
 * /api/hs/brand/deals/[id]/review and uses router.refresh() so the
 * server component re-renders with the new deal state.
 *
 * State machine:
 *   idle
 *     → open: 'approve'   — confirm dialog (approve variant)
 *     → open: 'revision'  — confirm dialog (revision variant)
 *   submitting-approve
 *     → done-approve  (shows "Approved — payout releasing...")
 *     → error
 *   submitting-revision
 *     → done-revision (shows "Revision request sent")
 *     → error
 *
 * The panel only renders the dialogs when deal is in `in_review` —
 * the parent Server Component is responsible for deciding whether to
 * mount this panel at all.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ReviewDecisionDialog } from './ReviewDecisionDialog';

export interface BrandReviewPanelProps {
  dealId: string;
  /** Human name used in the dialog copy (e.g. "Jordan Rivers"). */
  athleteDisplayName: string;
  /** Optional submission to pin to the approval row. */
  submissionId?: string | null;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'open'; variant: 'approve' | 'request_revision' }
  | {
      kind: 'submitting';
      variant: 'approve' | 'request_revision';
    }
  | {
      kind: 'done';
      variant: 'approve' | 'request_revision';
      payoutStatus?: 'releasing' | 'already_paid' | 'pending_retry';
    }
  | {
      kind: 'error';
      variant: 'approve' | 'request_revision';
      message: string;
    };

export function BrandReviewPanel({
  dealId,
  athleteDisplayName,
  submissionId = null,
}: BrandReviewPanelProps) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const dialogOpen =
    phase.kind === 'open' ||
    phase.kind === 'submitting' ||
    phase.kind === 'error';
  const dialogVariant =
    phase.kind === 'idle' || phase.kind === 'done'
      ? 'approve'
      : phase.variant;
  const submitting = phase.kind === 'submitting' || isPending;

  function openApprove() {
    setPhase({ kind: 'open', variant: 'approve' });
  }
  function openRevision() {
    setPhase({ kind: 'open', variant: 'request_revision' });
  }
  function cancel() {
    if (submitting) return;
    setPhase({ kind: 'idle' });
  }

  async function onConfirm(notes: string) {
    if (phase.kind !== 'open') return;
    const variant = phase.variant;
    setPhase({ kind: 'submitting', variant });

    try {
      const res = await fetch(`/api/hs/brand/deals/${dealId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: variant === 'approve' ? 'approve' : 'request_revision',
          notes: notes.length ? notes : undefined,
          submissionId: submissionId ?? undefined,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        ok?: boolean;
        approvalId?: string;
        newDealStatus?: string;
        payout?: { status?: 'releasing' | 'already_paid' | 'pending_retry' };
      };

      if (!res.ok || !json.ok) {
        setPhase({
          kind: 'error',
          variant,
          message:
            json.error ??
            (res.status === 409
              ? 'This deal is no longer awaiting review.'
              : 'Something went wrong. Please try again.'),
        });
        return;
      }

      setPhase({
        kind: 'done',
        variant,
        payoutStatus: json.payout?.status,
      });
      // Refresh the Server Component so the status pill + history update.
      startTransition(() => router.refresh());
    } catch (err) {
      setPhase({
        kind: 'error',
        variant,
        message:
          err instanceof Error
            ? err.message
            : 'Network error. Please check your connection.',
      });
    }
  }

  // --------------------------------------------------------------------
  // Success view — replaces the action buttons inline.
  // --------------------------------------------------------------------
  if (phase.kind === 'done') {
    if (phase.variant === 'approve') {
      const label =
        phase.payoutStatus === 'pending_retry'
          ? 'Approved. Payout is queued — we will release it as soon as the custodian account is ready.'
          : phase.payoutStatus === 'already_paid'
            ? 'Approved. Payout was already released for this deal.'
            : 'Approved. The payout is releasing to the custodian account now.';
      return (
        <div
          role="status"
          className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5 text-sm text-emerald-100"
        >
          {label}
        </div>
      );
    }
    return (
      <div
        role="status"
        className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5 text-sm text-amber-100"
      >
        Revision request sent. {athleteDisplayName} has been notified and can
        resubmit from their deal page.
      </div>
    );
  }

  // --------------------------------------------------------------------
  // Default view — action buttons + (conditionally) the dialog
  // --------------------------------------------------------------------
  return (
    <section
      aria-label="Review decision"
      className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
        Your turn
      </p>
      <h2 className="mt-2 font-display text-2xl text-white md:text-3xl">
        Review {athleteDisplayName}&rsquo;s deliverable.
      </h2>
      <p className="mt-2 text-sm text-white/70">
        Approve to release the agreed compensation, or send notes if something
        needs to change. Revision requests do not charge the deal.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={openApprove}
          disabled={submitting}
          className="inline-flex min-h-[44px] items-center rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Approve &amp; release payout
        </button>
        <button
          type="button"
          onClick={openRevision}
          disabled={submitting}
          className="inline-flex min-h-[44px] items-center rounded-lg border border-amber-400/60 bg-transparent px-5 py-2.5 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-400/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Request revision
        </button>
      </div>

      <ReviewDecisionDialog
        variant={dialogVariant}
        athleteDisplayName={athleteDisplayName}
        open={dialogOpen}
        submitting={submitting}
        errorMessage={phase.kind === 'error' ? phase.message : null}
        onCancel={cancel}
        onConfirm={onConfirm}
      />
    </section>
  );
}

export default BrandReviewPanel;
