/**
 * DeliverableItemCard
 *
 * Role-neutral display card for a single `deal_deliverable_submissions`
 * row. Used by:
 *   - The athlete submit page (/hs/deals/[id]/deliver)
 *   - The brand review page (/hs/brand/deals/[id], owned by BRAND-REVIEW)
 *
 * Stays role-neutral: renders the submission content + status pill +
 * (when applicable) the brand's review_notes on rejection. No role-
 * specific action buttons live here — callers wrap the card with their
 * own action UI.
 */

import Link from 'next/link';
import type {
  DeliverablePlatform,
  DeliverableStatus,
  DeliverableSubmissionType,
} from '@/lib/hs-nil/deliverables';
import { deliverableSubmissionTypeLabel } from '@/lib/hs-nil/deliverables';

export interface DeliverableItemCardSubmission {
  id: string;
  submission_type: DeliverableSubmissionType;
  content_url: string | null;
  storage_path: string | null;
  /** Signed URL returned by GET /api/hs/deals/[id]/deliverables for image previews. */
  signedUrl?: string | null;
  note: string | null;
  platform: DeliverablePlatform | null;
  status: DeliverableStatus;
  review_notes: string | null;
  created_at: string;
}

interface Props {
  submission: DeliverableItemCardSubmission;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function StatusPill({ status }: { status: DeliverableStatus }) {
  const styles: Record<DeliverableStatus, string> = {
    submitted: 'bg-yellow-400/15 text-yellow-200 border-yellow-400/30',
    accepted: 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30',
    rejected: 'bg-red-400/15 text-red-200 border-red-400/30',
    superseded: 'bg-white/10 text-white/50 border-white/15',
  };
  const labels: Record<DeliverableStatus, string> = {
    submitted: 'Submitted',
    accepted: 'Accepted',
    rejected: 'Needs revision',
    superseded: 'Superseded',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}
      aria-label={`Status: ${labels[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: DeliverablePlatform | null }) {
  if (!platform) return null;
  const label =
    platform === 'twitter_x'
      ? 'X / Twitter'
      : platform.charAt(0).toUpperCase() + platform.slice(1);
  return (
    <span className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-white/70">
      {label}
    </span>
  );
}

export function DeliverableItemCard({ submission }: Props) {
  const s = submission;
  const typeLabel = deliverableSubmissionTypeLabel(s.submission_type);

  return (
    <article
      className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
      aria-label={`${typeLabel} submitted ${formatWhen(s.created_at)}`}
    >
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
          {typeLabel}
        </span>
        <PlatformBadge platform={s.platform} />
        <span className="ml-auto text-xs text-white/40">
          {formatWhen(s.created_at)}
        </span>
        <StatusPill status={s.status} />
      </header>

      <div className="space-y-3 text-sm text-white/90">
        {s.submission_type === 'image_proof' && s.signedUrl && (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.signedUrl}
              alt="Deliverable proof image"
              className="h-auto w-full object-contain"
              style={{ maxHeight: 320 }}
            />
          </div>
        )}

        {s.submission_type === 'image_proof' && !s.signedUrl && s.storage_path && (
          <p className="text-sm text-white/60">
            Image uploaded — preview unavailable.
          </p>
        )}

        {(s.submission_type === 'social_post_url' ||
          s.submission_type === 'external_link' ||
          s.submission_type === 'receipt') &&
          s.content_url && (
            <p className="break-all text-sm">
              <Link
                href={s.content_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent-primary)] underline underline-offset-2 hover:opacity-80"
              >
                {s.content_url}
              </Link>
            </p>
          )}

        {s.note && (
          <p className="whitespace-pre-line rounded-lg bg-white/5 p-3 text-sm text-white/80">
            {s.note}
          </p>
        )}
      </div>

      {s.status === 'rejected' && s.review_notes && (
        <div
          role="note"
          className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-red-200/80">
            Brand notes
          </p>
          <p className="mt-1 whitespace-pre-line">{s.review_notes}</p>
        </div>
      )}
    </article>
  );
}

export default DeliverableItemCard;
