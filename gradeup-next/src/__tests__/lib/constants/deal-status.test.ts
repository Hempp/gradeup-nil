/**
 * Tests for deal status constants and helper functions
 * @module __tests__/lib/constants/deal-status.test
 */

import {
  DEAL_STATUS_CONFIG,
  KANBAN_COLUMNS,
  getStatusLabel,
  getStatusColor,
} from '@/lib/constants/deal-status';
import type { DealStatus } from '@/types';

describe('deal-status constants', () => {
  describe('DEAL_STATUS_CONFIG', () => {
    const allStatuses: DealStatus[] = [
      'pending',
      'negotiating',
      'accepted',
      'active',
      'completed',
      'rejected',
      'cancelled',
      'draft',
      'expired',
      'paused',
    ];

    it('has config for all deal statuses', () => {
      allStatuses.forEach((status) => {
        expect(DEAL_STATUS_CONFIG[status]).toBeDefined();
        expect(DEAL_STATUS_CONFIG[status].label).toBeDefined();
        expect(DEAL_STATUS_CONFIG[status].color).toBeDefined();
      });
    });

    it('has non-empty labels for all statuses', () => {
      allStatuses.forEach((status) => {
        expect(DEAL_STATUS_CONFIG[status].label.length).toBeGreaterThan(0);
      });
    });

    it('has CSS variable colors for all statuses', () => {
      allStatuses.forEach((status) => {
        expect(DEAL_STATUS_CONFIG[status].color).toMatch(/^var\(--/);
      });
    });

    it('uses warning color for pending status', () => {
      expect(DEAL_STATUS_CONFIG.pending.color).toBe('var(--color-warning)');
    });

    it('uses success color for completed status', () => {
      expect(DEAL_STATUS_CONFIG.completed.color).toBe('var(--color-success)');
    });

    it('uses error color for rejected status', () => {
      expect(DEAL_STATUS_CONFIG.rejected.color).toBe('var(--color-error)');
    });
  });

  describe('KANBAN_COLUMNS', () => {
    it('contains the main workflow statuses', () => {
      expect(KANBAN_COLUMNS).toContain('pending');
      expect(KANBAN_COLUMNS).toContain('negotiating');
      expect(KANBAN_COLUMNS).toContain('accepted');
      expect(KANBAN_COLUMNS).toContain('active');
      expect(KANBAN_COLUMNS).toContain('completed');
    });

    it('has statuses in workflow order', () => {
      expect(KANBAN_COLUMNS[0]).toBe('pending');
      expect(KANBAN_COLUMNS[KANBAN_COLUMNS.length - 1]).toBe('completed');
    });

    it('excludes non-workflow statuses', () => {
      expect(KANBAN_COLUMNS).not.toContain('rejected');
      expect(KANBAN_COLUMNS).not.toContain('cancelled');
      expect(KANBAN_COLUMNS).not.toContain('draft');
      expect(KANBAN_COLUMNS).not.toContain('expired');
    });

    it('has 5 columns', () => {
      expect(KANBAN_COLUMNS).toHaveLength(5);
    });
  });

  describe('getStatusLabel', () => {
    it('returns correct label for known statuses', () => {
      expect(getStatusLabel('pending')).toBe('Incoming');
      expect(getStatusLabel('negotiating')).toBe('Negotiating');
      expect(getStatusLabel('accepted')).toBe('Accepted');
      expect(getStatusLabel('active')).toBe('Active');
      expect(getStatusLabel('completed')).toBe('Completed');
      expect(getStatusLabel('rejected')).toBe('Rejected');
      expect(getStatusLabel('cancelled')).toBe('Cancelled');
      expect(getStatusLabel('draft')).toBe('Draft');
      expect(getStatusLabel('expired')).toBe('Expired');
      expect(getStatusLabel('paused')).toBe('Paused');
    });

    it('returns status itself for unknown status', () => {
      // Cast to bypass TypeScript for testing fallback behavior
      const unknownStatus = 'unknown_status' as DealStatus;
      expect(getStatusLabel(unknownStatus)).toBe('unknown_status');
    });
  });

  describe('getStatusColor', () => {
    it('returns correct color for known statuses', () => {
      expect(getStatusColor('pending')).toBe('var(--color-warning)');
      expect(getStatusColor('negotiating')).toBe('var(--color-info)');
      expect(getStatusColor('accepted')).toBe('var(--color-success)');
      expect(getStatusColor('active')).toBe('var(--color-primary)');
      expect(getStatusColor('completed')).toBe('var(--color-success)');
      expect(getStatusColor('rejected')).toBe('var(--color-error)');
      expect(getStatusColor('cancelled')).toBe('var(--color-muted)');
      expect(getStatusColor('draft')).toBe('var(--color-muted)');
      expect(getStatusColor('expired')).toBe('var(--color-muted)');
      expect(getStatusColor('paused')).toBe('var(--color-warning)');
    });

    it('returns muted color for unknown status', () => {
      const unknownStatus = 'unknown_status' as DealStatus;
      expect(getStatusColor(unknownStatus)).toBe('var(--color-muted)');
    });
  });
});
