import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useNotifications,
  getNotificationTypeLabel,
  getNotificationTypeIcon,
  getRelativeTime,
  getNotificationColorClass,
} from '@/lib/hooks/use-notifications';
import type { Notification, NotificationType } from '@/lib/hooks/use-notifications';

// Mock the notification service
jest.mock('@/lib/services/notifications', () => ({
  checkTableExists: jest.fn(),
  getNotifications: jest.fn(),
  markNotificationAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  deleteNotification: jest.fn(),
  subscribeToNotifications: jest.fn(),
}));

import * as notificationService from '@/lib/services/notifications';

const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>;

// Mock notifications for testing
const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'deal_offer',
    title: 'New Deal Offer',
    message: 'Nike has sent you a new deal offer.',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    url: '/dashboard/deals/123',
  },
  {
    id: 'notif-2',
    type: 'message',
    title: 'New Message',
    message: 'You have a new message from Adidas.',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    url: '/dashboard/messages/456',
  },
  {
    id: 'notif-3',
    type: 'payment_received',
    title: 'Payment Received',
    message: 'You received $500 from your recent deal.',
    read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    url: '/dashboard/earnings',
  },
];

describe('useNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementations
    mockNotificationService.checkTableExists.mockResolvedValue(true);
    mockNotificationService.getNotifications.mockResolvedValue({
      data: mockNotifications,
      error: null,
    });
    mockNotificationService.subscribeToNotifications.mockReturnValue(jest.fn());
    mockNotificationService.markNotificationAsRead.mockResolvedValue({
      data: null,
      error: null,
    });
    mockNotificationService.markAllAsRead.mockResolvedValue({
      data: null,
      error: null,
    });
    mockNotificationService.deleteNotification.mockResolvedValue({
      data: null,
      error: null,
    });
  });

  describe('initialization', () => {
    it('returns initial loading state', () => {
      const { result } = renderHook(() => useNotifications('user-123'));

      expect(result.current.loading).toBe(true);
      expect(result.current.notifications).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('returns empty state when userId is null', async () => {
      const { result } = renderHook(() => useNotifications(null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.notifications).toEqual([]);
      expect(result.current.isUsingMockData).toBe(false);
    });
  });

  describe('fetching notifications', () => {
    it('fetches notifications successfully', async () => {
      const { result } = renderHook(() => useNotifications('user-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.notifications).toEqual(mockNotifications);
      expect(result.current.error).toBeNull();
      expect(result.current.isUsingMockData).toBe(false);
    });

    it('calculates unread count correctly', async () => {
      const { result } = renderHook(() => useNotifications('user-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Two notifications are unread (notif-1 and notif-2)
      expect(result.current.unreadCount).toBe(2);
    });

    it('falls back to mock data when table does not exist', async () => {
      mockNotificationService.checkTableExists.mockResolvedValue(false);

      const { result } = renderHook(() => useNotifications('user-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isUsingMockData).toBe(true);
      expect(result.current.notifications.length).toBeGreaterThan(0);
    });

    it('falls back to mock data on fetch error', async () => {
      mockNotificationService.checkTableExists.mockResolvedValue(true);
      mockNotificationService.getNotifications.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      const { result } = renderHook(() => useNotifications('user-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isUsingMockData).toBe(true);
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('markAsRead', () => {
    it('marks a notification as read with optimistic update', async () => {
      const { result } = renderHook(() => useNotifications('user-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Initially notif-1 is unread
      expect(result.current.notifications.find(n => n.id === 'notif-1')?.read).toBe(false);

      await act(async () => {
        const response = await result.current.markAsRead('notif-1');
        expect(response.success).toBe(true);
      });

      // Should now be marked as read
      expect(result.current.notifications.find(n => n.id === 'notif-1')?.read).toBe(true);
    });

    it('reverts optimistic update on error', async () => {
      mockNotificationService.markNotificationAsRead.mockResolvedValue({
        data: null,
        error: new Error('Update failed'),
      });

      const { result } = renderHook(() => useNotifications('user-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        const response = await result.current.markAsRead('notif-1');
        expect(response.success).toBe(false);
        expect(response.error).toBe('Update failed');
      });

      // Should be reverted back to unread
      expect(result.current.notifications.find(n => n.id === 'notif-1')?.read).toBe(false);
    });

    it('returns success immediately when using mock data', async () => {
      mockNotificationService.checkTableExists.mockResolvedValue(false);

      const { result } = renderHook(() => useNotifications('user-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isUsingMockData).toBe(true);

      await act(async () => {
        const response = await result.current.markAsRead('mock-1');
        expect(response.success).toBe(true);
      });

      // Service should not be called for mock data
      expect(mockNotificationService.markNotificationAsRead).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('marks all notifications as read with optimistic update', async () => {
      const { result } = renderHook(() => useNotifications('user-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Initially there are 2 unread
      expect(result.current.unreadCount).toBe(2);

      await act(async () => {
        const response = await result.current.markAllAsRead();
        expect(response.success).toBe(true);
      });

      // All should now be read
      expect(result.current.unreadCount).toBe(0);
      expect(result.current.notifications.every(n => n.read)).toBe(true);
    });

    it('reverts all on error', async () => {
      mockNotificationService.markAllAsRead.mockResolvedValue({
        data: null,
        error: new Error('Update failed'),
      });

      const { result } = renderHook(() => useNotifications('user-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const originalUnreadCount = result.current.unreadCount;

      await act(async () => {
        const response = await result.current.markAllAsRead();
        expect(response.success).toBe(false);
      });

      // Should be reverted
      expect(result.current.unreadCount).toBe(originalUnreadCount);
    });

    it('returns error when userId is null', async () => {
      const { result } = renderHook(() => useNotifications(null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        const response = await result.current.markAllAsRead();
        expect(response.success).toBe(false);
        expect(response.error).toBe('No user ID provided');
      });
    });
  });

  describe('deleteNotification', () => {
    it('deletes a notification with optimistic update', async () => {
      const { result } = renderHook(() => useNotifications('user-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const originalLength = result.current.notifications.length;

      await act(async () => {
        const response = await result.current.deleteNotification('notif-1');
        expect(response.success).toBe(true);
      });

      expect(result.current.notifications.length).toBe(originalLength - 1);
      expect(result.current.notifications.find(n => n.id === 'notif-1')).toBeUndefined();
    });

    it('reverts deletion on error', async () => {
      mockNotificationService.deleteNotification.mockResolvedValue({
        data: null,
        error: new Error('Delete failed'),
      });

      const { result } = renderHook(() => useNotifications('user-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const originalNotifications = [...result.current.notifications];

      await act(async () => {
        const response = await result.current.deleteNotification('notif-1');
        expect(response.success).toBe(false);
      });

      // Should be reverted
      expect(result.current.notifications.length).toBe(originalNotifications.length);
      expect(result.current.notifications.find(n => n.id === 'notif-1')).toBeDefined();
    });
  });

  describe('refresh', () => {
    it('re-fetches notifications', async () => {
      const { result } = renderHook(() => useNotifications('user-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockNotificationService.getNotifications).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockNotificationService.getNotifications).toHaveBeenCalledTimes(2);
    });
  });

  describe('real-time subscription', () => {
    it('does not subscribe when using mock data', async () => {
      mockNotificationService.checkTableExists.mockResolvedValue(false);

      const { result } = renderHook(() => useNotifications('user-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isUsingMockData).toBe(true);
      // Should not subscribe when using mock data
      expect(mockNotificationService.subscribeToNotifications).not.toHaveBeenCalled();
    });

    it('does not subscribe when userId is null', async () => {
      const { result } = renderHook(() => useNotifications(null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockNotificationService.subscribeToNotifications).not.toHaveBeenCalled();
    });
  });
});

describe('getNotificationTypeLabel', () => {
  it('returns correct label for deal types', () => {
    expect(getNotificationTypeLabel('deal')).toBe('Deal');
    expect(getNotificationTypeLabel('deal_offer')).toBe('Deal Offer');
    expect(getNotificationTypeLabel('deal_accepted')).toBe('Deal Accepted');
    expect(getNotificationTypeLabel('deal_rejected')).toBe('Deal Rejected');
    expect(getNotificationTypeLabel('deal_completed')).toBe('Deal Completed');
    expect(getNotificationTypeLabel('deal_cancelled')).toBe('Deal Cancelled');
  });

  it('returns correct label for message types', () => {
    expect(getNotificationTypeLabel('message')).toBe('Message');
    expect(getNotificationTypeLabel('message_received')).toBe('New Message');
  });

  it('returns correct label for payment types', () => {
    expect(getNotificationTypeLabel('payment')).toBe('Payment');
    expect(getNotificationTypeLabel('payment_received')).toBe('Payment Received');
    expect(getNotificationTypeLabel('payment_pending')).toBe('Payment Pending');
  });

  it('returns correct label for verification types', () => {
    expect(getNotificationTypeLabel('verification_approved')).toBe('Verification Approved');
    expect(getNotificationTypeLabel('verification_rejected')).toBe('Verification Rejected');
    expect(getNotificationTypeLabel('verification_request')).toBe('Verification Request');
  });

  it('returns correct label for other types', () => {
    expect(getNotificationTypeLabel('system')).toBe('System');
    expect(getNotificationTypeLabel('opportunity_match')).toBe('Opportunity Match');
    expect(getNotificationTypeLabel('profile_view')).toBe('Profile View');
  });
});

describe('getNotificationTypeIcon', () => {
  it('returns Briefcase for deal type', () => {
    expect(getNotificationTypeIcon('deal')).toBe('Briefcase');
  });

  it('returns DollarSign for deal_offer', () => {
    expect(getNotificationTypeIcon('deal_offer')).toBe('DollarSign');
  });

  it('returns CheckCircle for success types', () => {
    expect(getNotificationTypeIcon('deal_accepted')).toBe('CheckCircle');
    expect(getNotificationTypeIcon('payment_received')).toBe('CheckCircle');
    expect(getNotificationTypeIcon('verification_approved')).toBe('CheckCircle');
  });

  it('returns XCircle for rejection/cancellation types', () => {
    expect(getNotificationTypeIcon('deal_rejected')).toBe('XCircle');
    expect(getNotificationTypeIcon('deal_cancelled')).toBe('XCircle');
    expect(getNotificationTypeIcon('verification_rejected')).toBe('XCircle');
  });

  it('returns MessageSquare for message types', () => {
    expect(getNotificationTypeIcon('message')).toBe('MessageSquare');
    expect(getNotificationTypeIcon('message_received')).toBe('MessageSquare');
  });

  it('returns Bell for system type', () => {
    expect(getNotificationTypeIcon('system')).toBe('Bell');
  });
});

describe('getRelativeTime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns "Just now" for very recent times', () => {
    const now = new Date().toISOString();
    expect(getRelativeTime(now)).toBe('Just now');

    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
    expect(getRelativeTime(thirtySecondsAgo)).toBe('Just now');
  });

  it('returns minutes ago correctly', () => {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    expect(getRelativeTime(oneMinuteAgo)).toBe('1 minute ago');

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(getRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    expect(getRelativeTime(thirtyMinutesAgo)).toBe('30 minutes ago');
  });

  it('returns hours ago correctly', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(oneHourAgo)).toBe('1 hour ago');

    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(fiveHoursAgo)).toBe('5 hours ago');
  });

  it('returns days ago correctly', () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(oneDayAgo)).toBe('1 day ago');

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(threeDaysAgo)).toBe('3 days ago');
  });

  it('returns weeks ago correctly', () => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(oneWeekAgo)).toBe('1 week ago');

    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(twoWeeksAgo)).toBe('2 weeks ago');
  });

  it('returns months ago correctly', () => {
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(oneMonthAgo)).toBe('1 month ago');

    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(sixMonthsAgo)).toBe('6 months ago');
  });

  it('returns years ago correctly', () => {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(oneYearAgo)).toBe('1 year ago');

    const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(twoYearsAgo)).toBe('2 years ago');
  });
});

describe('getNotificationColorClass', () => {
  it('returns correct color for deal types', () => {
    expect(getNotificationColorClass('deal')).toBe('text-blue-500');
    expect(getNotificationColorClass('deal_offer')).toBe('text-green-500');
    expect(getNotificationColorClass('deal_accepted')).toBe('text-green-500');
    expect(getNotificationColorClass('deal_rejected')).toBe('text-red-500');
    expect(getNotificationColorClass('deal_completed')).toBe('text-green-500');
    expect(getNotificationColorClass('deal_cancelled')).toBe('text-red-500');
  });

  it('returns correct color for message types', () => {
    expect(getNotificationColorClass('message')).toBe('text-blue-500');
    expect(getNotificationColorClass('message_received')).toBe('text-blue-500');
  });

  it('returns correct color for payment types', () => {
    expect(getNotificationColorClass('payment')).toBe('text-green-500');
    expect(getNotificationColorClass('payment_received')).toBe('text-green-500');
    expect(getNotificationColorClass('payment_pending')).toBe('text-yellow-500');
  });

  it('returns correct color for verification types', () => {
    expect(getNotificationColorClass('verification_approved')).toBe('text-green-500');
    expect(getNotificationColorClass('verification_rejected')).toBe('text-red-500');
    expect(getNotificationColorClass('verification_request')).toBe('text-yellow-500');
  });

  it('returns gray for system and unknown types', () => {
    expect(getNotificationColorClass('system')).toBe('text-gray-500');
  });

  it('returns correct color for other types', () => {
    expect(getNotificationColorClass('opportunity_match')).toBe('text-purple-500');
    expect(getNotificationColorClass('profile_view')).toBe('text-blue-500');
  });
});
