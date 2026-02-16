/**
 * Tests for useNotifications hook and helper functions
 * @module __tests__/lib/hooks/use-notifications.test
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useNotifications,
  getNotificationTypeLabel,
  getNotificationTypeIcon,
  getRelativeTime,
  getNotificationColorClass,
  type Notification,
  type NotificationType,
} from '@/lib/hooks/use-notifications';

// Mock notification service
jest.mock('@/lib/services/notifications', () => ({
  checkTableExists: jest.fn().mockResolvedValue(false),
  getNotifications: jest.fn().mockResolvedValue({ data: [], error: null }),
  markNotificationAsRead: jest.fn().mockResolvedValue({ error: null }),
  markAllAsRead: jest.fn().mockResolvedValue({ error: null }),
  deleteNotification: jest.fn().mockResolvedValue({ error: null }),
  subscribeToNotifications: jest.fn(() => jest.fn()),
}));

describe('useNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useNotifications(null));

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('provides required functions', () => {
    const { result } = renderHook(() => useNotifications('user-123'));

    expect(typeof result.current.markAsRead).toBe('function');
    expect(typeof result.current.markAllAsRead).toBe('function');
    expect(typeof result.current.deleteNotification).toBe('function');
    expect(typeof result.current.refresh).toBe('function');
  });

  it('uses mock data when table does not exist', async () => {
    const { result } = renderHook(() => useNotifications('user-123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isUsingMockData).toBe(true);
    expect(result.current.notifications.length).toBeGreaterThan(0);
  });

  it('calculates unread count correctly', async () => {
    const { result } = renderHook(() => useNotifications('user-123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Mock data has 2 unread notifications
    expect(result.current.unreadCount).toBe(2);
  });

  it('marks notification as read in mock mode', async () => {
    const { result } = renderHook(() => useNotifications('user-123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const notificationId = result.current.notifications[0].id;

    const response = await result.current.markAsRead(notificationId);

    expect(response.success).toBe(true);
  });

  it('marks all as read in mock mode', async () => {
    const { result } = renderHook(() => useNotifications('user-123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const response = await result.current.markAllAsRead();

    expect(response.success).toBe(true);
  });

  it('returns error when marking all without userId', async () => {
    const { result } = renderHook(() => useNotifications(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const response = await result.current.markAllAsRead();

    expect(response.success).toBe(false);
    expect(response.error).toBe('No user ID provided');
  });

  it('deletes notification in mock mode', async () => {
    const { result } = renderHook(() => useNotifications('user-123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCount = result.current.notifications.length;
    const notificationId = result.current.notifications[0].id;

    await act(async () => {
      await result.current.deleteNotification(notificationId);
    });

    expect(result.current.notifications.length).toBe(initialCount - 1);
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
  it('returns correct icon for deal types', () => {
    expect(getNotificationTypeIcon('deal')).toBe('Briefcase');
    expect(getNotificationTypeIcon('deal_offer')).toBe('DollarSign');
    expect(getNotificationTypeIcon('deal_accepted')).toBe('CheckCircle');
    expect(getNotificationTypeIcon('deal_rejected')).toBe('XCircle');
  });

  it('returns correct icon for message types', () => {
    expect(getNotificationTypeIcon('message')).toBe('MessageSquare');
    expect(getNotificationTypeIcon('message_received')).toBe('MessageSquare');
  });

  it('returns correct icon for payment types', () => {
    expect(getNotificationTypeIcon('payment')).toBe('CreditCard');
    expect(getNotificationTypeIcon('payment_received')).toBe('CheckCircle');
    expect(getNotificationTypeIcon('payment_pending')).toBe('Clock');
  });

  it('returns correct icon for other types', () => {
    expect(getNotificationTypeIcon('system')).toBe('Bell');
    expect(getNotificationTypeIcon('opportunity_match')).toBe('Star');
    expect(getNotificationTypeIcon('profile_view')).toBe('Eye');
  });
});

describe('getRelativeTime', () => {
  it('returns "Just now" for recent times', () => {
    const now = new Date().toISOString();
    expect(getRelativeTime(now)).toBe('Just now');
  });

  it('returns minutes ago', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(getRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
  });

  it('returns singular minute', () => {
    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000 - 1000).toISOString();
    expect(getRelativeTime(oneMinuteAgo)).toBe('1 minute ago');
  });

  it('returns hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(threeHoursAgo)).toBe('3 hours ago');
  });

  it('returns singular hour', () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000 - 1000).toISOString();
    expect(getRelativeTime(oneHourAgo)).toBe('1 hour ago');
  });

  it('returns days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(twoDaysAgo)).toBe('2 days ago');
  });

  it('returns singular day', () => {
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 1000).toISOString();
    expect(getRelativeTime(oneDayAgo)).toBe('1 day ago');
  });

  it('returns weeks ago', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(twoWeeksAgo)).toBe('2 weeks ago');
  });

  it('returns months ago', () => {
    const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(twoMonthsAgo)).toBe('2 months ago');
  });

  it('returns years ago', () => {
    const oneYearAgo = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(oneYearAgo)).toBe('1 year ago');
  });
});

describe('getNotificationColorClass', () => {
  it('returns green for successful/positive types', () => {
    expect(getNotificationColorClass('deal_accepted')).toBe('text-green-500');
    expect(getNotificationColorClass('deal_completed')).toBe('text-green-500');
    expect(getNotificationColorClass('deal_offer')).toBe('text-green-500');
    expect(getNotificationColorClass('payment')).toBe('text-green-500');
    expect(getNotificationColorClass('payment_received')).toBe('text-green-500');
    expect(getNotificationColorClass('verification_approved')).toBe('text-green-500');
  });

  it('returns red for negative types', () => {
    expect(getNotificationColorClass('deal_rejected')).toBe('text-red-500');
    expect(getNotificationColorClass('deal_cancelled')).toBe('text-red-500');
    expect(getNotificationColorClass('verification_rejected')).toBe('text-red-500');
  });

  it('returns yellow for pending types', () => {
    expect(getNotificationColorClass('payment_pending')).toBe('text-yellow-500');
    expect(getNotificationColorClass('verification_request')).toBe('text-yellow-500');
  });

  it('returns blue for informational types', () => {
    expect(getNotificationColorClass('deal')).toBe('text-blue-500');
    expect(getNotificationColorClass('message')).toBe('text-blue-500');
    expect(getNotificationColorClass('message_received')).toBe('text-blue-500');
    expect(getNotificationColorClass('profile_view')).toBe('text-blue-500');
  });

  it('returns purple for opportunity types', () => {
    expect(getNotificationColorClass('opportunity_match')).toBe('text-purple-500');
  });

  it('returns gray for system types', () => {
    expect(getNotificationColorClass('system')).toBe('text-gray-500');
  });
});

describe('Notification type', () => {
  it('has correct structure', () => {
    const notification: Notification = {
      id: 'test-1',
      type: 'deal_offer',
      title: 'New Offer',
      message: 'You have a new deal offer',
      read: false,
      created_at: new Date().toISOString(),
      url: '/deals/123',
      metadata: { amount: 1000 },
    };

    expect(notification.id).toBe('test-1');
    expect(notification.type).toBe('deal_offer');
    expect(notification.read).toBe(false);
  });
});

describe('NotificationType', () => {
  it('supports all notification types', () => {
    const types: NotificationType[] = [
      'deal',
      'deal_offer',
      'deal_accepted',
      'deal_rejected',
      'deal_completed',
      'deal_cancelled',
      'message',
      'message_received',
      'payment',
      'payment_received',
      'payment_pending',
      'system',
      'verification_approved',
      'verification_rejected',
      'verification_request',
      'opportunity_match',
      'profile_view',
    ];

    expect(types.length).toBe(17);
  });
});
