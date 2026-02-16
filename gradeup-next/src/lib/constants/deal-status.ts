import type { DealStatus } from '@/types';

/**
 * Centralized configuration for deal status display properties.
 * Use this constant for consistent status labels and colors across the application.
 */
export const DEAL_STATUS_CONFIG: Record<DealStatus, { label: string; color: string }> = {
  pending: { label: 'Incoming', color: 'var(--color-warning)' },
  negotiating: { label: 'Negotiating', color: 'var(--color-info)' },
  accepted: { label: 'Accepted', color: 'var(--color-success)' },
  active: { label: 'Active', color: 'var(--color-primary)' },
  completed: { label: 'Completed', color: 'var(--color-success)' },
  rejected: { label: 'Rejected', color: 'var(--color-error)' },
  cancelled: { label: 'Cancelled', color: 'var(--color-muted)' },
  draft: { label: 'Draft', color: 'var(--color-muted)' },
  expired: { label: 'Expired', color: 'var(--color-muted)' },
  paused: { label: 'Paused', color: 'var(--color-warning)' },
};

/**
 * The ordered list of deal statuses displayed in the Kanban board view.
 * These represent the primary workflow stages for deals.
 */
export const KANBAN_COLUMNS: DealStatus[] = ['pending', 'negotiating', 'accepted', 'active', 'completed'];

/**
 * Helper function to get status label from the config.
 */
export function getStatusLabel(status: DealStatus): string {
  return DEAL_STATUS_CONFIG[status]?.label ?? status;
}

/**
 * Helper function to get status color from the config.
 */
export function getStatusColor(status: DealStatus): string {
  return DEAL_STATUS_CONFIG[status]?.color ?? 'var(--color-muted)';
}
