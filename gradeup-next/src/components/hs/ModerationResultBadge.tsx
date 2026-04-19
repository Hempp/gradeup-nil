/**
 * ModerationResultBadge
 *
 * Small role-aware status indicator used on DeliverableItemCard. Shows:
 *   - Athletes:  "Reviewed automatically" on auto_approved; "Reviewing…"
 *                on pending; "Under moderation review" on flagged /
 *                ops_reviewing; "Needs revision" on human_rejected.
 *   - Brands:    same vocabulary except human_rejected = "Blocked by
 *                moderation" so the brand understands why the deliverable
 *                won't reach their review queue.
 *   - Admin:     the raw machine status.
 *
 * Pure server-safe React. No client hooks.
 */

import type { ModerationStatus } from '@/lib/hs-nil/moderation';
import { moderationBadgeForRole } from '@/lib/hs-nil/moderation';

export interface ModerationResultBadgeProps {
  status: ModerationStatus;
  role: 'athlete' | 'brand' | 'admin';
  /** Optional confidence readout; only rendered for admin. */
  confidence?: number | null;
}

const TONE: Record<ModerationStatus, string> = {
  pending: 'bg-white/10 text-white/70 border-white/20',
  auto_approved: 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30',
  flagged: 'bg-amber-400/15 text-amber-200 border-amber-400/30',
  ops_reviewing: 'bg-amber-400/15 text-amber-200 border-amber-400/30',
  human_approved: 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30',
  human_rejected:
    'bg-[var(--color-error,#DA2B57)]/15 text-[var(--color-error,#DA2B57)] border-[var(--color-error,#DA2B57)]/30',
};

export function ModerationResultBadge({
  status,
  role,
  confidence,
}: ModerationResultBadgeProps) {
  const label = moderationBadgeForRole(status, role);
  const tone = TONE[status] ?? TONE.pending;
  const showConfidence =
    role === 'admin' && typeof confidence === 'number' && !Number.isNaN(confidence);

  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide',
        tone,
      ].join(' ')}
      aria-label={`Moderation status: ${label}`}
    >
      <span>{label}</span>
      {showConfidence && (
        <span className="ml-1 text-white/60">
          {(Math.round((confidence as number) * 100)).toString()}%
        </span>
      )}
    </span>
  );
}

export default ModerationResultBadge;
