'use client';

/**
 * BulkActionBar — floating bottom bar with "N selected" + action button.
 *
 * Bar is only rendered when the controlled selected-id set is non-empty.
 * On action click, calls `onOpenDialog()` so the parent page can mount
 * its own BulkActionDialog variant (each page wires its own body shape).
 *
 * Kept deliberately thin — the page owns selection state via
 * useBulkSelection() so server-side queue refreshes don't blow away
 * partial selections.
 */

import { type ReactNode } from 'react';

export interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onOpenDialog: () => void;
  actionLabel: string;
  /** Optional slot for secondary action (e.g., "Clear"). */
  extra?: ReactNode;
}

export function BulkActionBar({
  selectedCount,
  onClear,
  onOpenDialog,
  actionLabel,
  extra,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;
  return (
    <div
      role="region"
      aria-label="Bulk action bar"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
    >
      <div className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-xl border border-white/15 bg-[var(--marketing-gray-900)]/95 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur">
        <p className="text-xs uppercase tracking-widest text-white/70">
          <span className="font-display text-lg text-[var(--accent-primary)]">
            {selectedCount}
          </span>{' '}
          selected
        </p>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/70 transition hover:bg-white/10"
        >
          Clear
        </button>
        {extra}
        <button
          type="button"
          onClick={onOpenDialog}
          className="inline-flex items-center rounded-md border border-[var(--accent-primary)]/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)] transition hover:bg-[var(--accent-primary)]/10"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

export default BulkActionBar;
