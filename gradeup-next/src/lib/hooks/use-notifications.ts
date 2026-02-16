'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as notificationService from '@/lib/services/notifications';
import type { Notification, NotificationType } from '@/lib/services/notifications';

// Re-export types for consumers
export type { Notification, NotificationType };

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: Error | null;
  isUsingMockData: boolean;
  markAsRead: (notificationId: string) => Promise<{ success: boolean; error?: string }>;
  markAllAsRead: () => Promise<{ success: boolean; error?: string }>;
  deleteNotification: (notificationId: string) => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Mock Data for Testing / Fallback
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'mock-1',
    type: 'verification_approved',
    title: 'Enrollment Verified',
    message: 'Your enrollment verification has been approved by the athletic director.',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    url: '/dashboard/verifications',
    metadata: { verification_type: 'enrollment' },
  },
  {
    id: 'mock-2',
    type: 'deal_offer',
    title: 'New Deal Offer',
    message: 'Nike has sent you a new endorsement offer worth $5,000.',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    url: '/dashboard/deals/new-offer-123',
    metadata: { brand_name: 'Nike', amount: 5000 },
  },
  {
    id: 'mock-3',
    type: 'message',
    title: 'New Message',
    message: 'You have a new message from Gatorade regarding your partnership.',
    read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    url: '/dashboard/messages/conv-456',
    metadata: { sender_name: 'Gatorade', conversation_id: 'conv-456' },
  },
  {
    id: 'mock-4',
    type: 'verification_rejected',
    title: 'GPA Verification Needs Update',
    message: 'Your GPA verification was rejected. Please submit an updated transcript.',
    read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    url: '/dashboard/verifications',
    metadata: { verification_type: 'grades', reason: 'Transcript outdated' },
  },
  {
    id: 'mock-5',
    type: 'verification_request',
    title: 'Verification Request Submitted',
    message: 'Your sport verification request has been submitted and is pending review.',
    read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
    url: '/dashboard/verifications',
    metadata: { verification_type: 'sport' },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook for managing user notifications with real-time updates
 *
 * Provides comprehensive notification management including fetching,
 * marking as read, deleting, and real-time subscription. Automatically
 * falls back to mock data if the notifications table doesn't exist,
 * making it safe to use during development.
 *
 * @param userId - The unique user ID, or null if not authenticated
 * @returns UseNotificationsResult with notifications array and control functions
 * @example
 * function NotificationCenter() {
 *   const {
 *     notifications,
 *     unreadCount,
 *     loading,
 *     markAsRead,
 *     markAllAsRead,
 *     deleteNotification,
 *     isUsingMockData
 *   } = useNotifications(userId);
 *
 *   return (
 *     <div>
 *       <Badge count={unreadCount} />
 *       {notifications.map(n => (
 *         <NotificationItem
 *           key={n.id}
 *           notification={n}
 *           onRead={() => markAsRead(n.id)}
 *           onDelete={() => deleteNotification(n.id)}
 *         />
 *       ))}
 *       <button onClick={markAllAsRead}>Mark all read</button>
 *     </div>
 *   );
 * }
 */
export function useNotifications(userId: string | null): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  // Track if we've determined the table exists
  const tableExistsRef = useRef<boolean | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Calculate unread count from notifications
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // Fetch notifications from Supabase or fall back to mock data
  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      setIsUsingMockData(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check if table exists (only on first fetch)
      if (tableExistsRef.current === null) {
        tableExistsRef.current = await notificationService.checkTableExists();
      }

      if (!tableExistsRef.current) {
        // Fall back to mock data
        console.info('[useNotifications] Notifications table not available, using mock data');
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
        setNotifications(MOCK_NOTIFICATIONS);
        setIsUsingMockData(true);
        return;
      }

      // Fetch from Supabase
      const { data, error: fetchError } = await notificationService.getNotifications(userId);

      if (fetchError) {
        throw fetchError;
      }

      setNotifications(data || []);
      setIsUsingMockData(false);
    } catch (err) {
      console.error('[useNotifications] Error fetching notifications:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch notifications'));

      // Fall back to mock data on error
      setNotifications(MOCK_NOTIFICATIONS);
      setIsUsingMockData(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription for notification updates
  useEffect(() => {
    if (!userId || isUsingMockData) {
      return;
    }

    // Wait for initial fetch to complete and confirm table exists
    if (tableExistsRef.current !== true) {
      return;
    }

    // Set up real-time subscription
    const unsubscribe = notificationService.subscribeToNotifications(userId, {
      onInsert: (notification) => {
        setNotifications(prev => [notification, ...prev]);
      },
      onUpdate: (notification) => {
        setNotifications(prev =>
          prev.map(n => (n.id === notification.id ? notification : n))
        );
      },
      onDelete: (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      },
      onError: (err) => {
        console.error('[useNotifications] Real-time subscription error:', err);
      },
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [userId, isUsingMockData]);

  // Mark single notification as read
  const markAsRead = useCallback(async (
    notificationId: string
  ): Promise<{ success: boolean; error?: string }> => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
    );

    // If using mock data, just return success
    if (isUsingMockData) {
      return { success: true };
    }

    try {
      const { error: updateError } = await notificationService.markNotificationAsRead(
        notificationId,
        userId ?? undefined
      );

      if (updateError) {
        // Revert optimistic update on error
        setNotifications(prev =>
          prev.map(n => (n.id === notificationId ? { ...n, read: false } : n))
        );
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (err) {
      // Revert optimistic update on error
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: false } : n))
      );
      return { success: false, error: err instanceof Error ? err.message : 'Failed to mark as read' };
    }
  }, [userId, isUsingMockData]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!userId) {
      return { success: false, error: 'No user ID provided' };
    }

    // Optimistic update
    const previousNotifications = notifications;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    // If using mock data, just return success
    if (isUsingMockData) {
      return { success: true };
    }

    try {
      const { error: updateError } = await notificationService.markAllAsRead(userId);

      if (updateError) {
        // Revert optimistic update on error
        setNotifications(previousNotifications);
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (err) {
      // Revert optimistic update on error
      setNotifications(previousNotifications);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to mark all as read' };
    }
  }, [userId, notifications, isUsingMockData]);

  // Delete a notification
  const deleteNotificationHandler = useCallback(async (
    notificationId: string
  ): Promise<{ success: boolean; error?: string }> => {
    // Optimistic update
    const previousNotifications = notifications;
    setNotifications(prev => prev.filter(n => n.id !== notificationId));

    // If using mock data, just return success
    if (isUsingMockData) {
      return { success: true };
    }

    try {
      const { error: deleteError } = await notificationService.deleteNotification(
        notificationId,
        userId ?? undefined
      );

      if (deleteError) {
        // Revert optimistic update on error
        setNotifications(previousNotifications);
        return { success: false, error: deleteError.message };
      }

      return { success: true };
    } catch (err) {
      // Revert optimistic update on error
      setNotifications(previousNotifications);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete notification' };
    }
  }, [userId, notifications, isUsingMockData]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    isUsingMockData,
    markAsRead,
    markAllAsRead,
    deleteNotification: deleteNotificationHandler,
    refresh: fetchNotifications,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get human-readable display label for notification type
 *
 * @param type - The notification type enum value
 * @returns Human-readable label string
 * @example
 * getNotificationTypeLabel('deal_offer') // "Deal Offer"
 * getNotificationTypeLabel('verification_approved') // "Verification Approved"
 */
export function getNotificationTypeLabel(type: NotificationType): string {
  const labels: Record<NotificationType, string> = {
    deal: 'Deal',
    deal_offer: 'Deal Offer',
    deal_accepted: 'Deal Accepted',
    deal_rejected: 'Deal Rejected',
    deal_completed: 'Deal Completed',
    deal_cancelled: 'Deal Cancelled',
    message: 'Message',
    message_received: 'New Message',
    payment: 'Payment',
    payment_received: 'Payment Received',
    payment_pending: 'Payment Pending',
    system: 'System',
    verification_approved: 'Verification Approved',
    verification_rejected: 'Verification Rejected',
    verification_request: 'Verification Request',
    opportunity_match: 'Opportunity Match',
    profile_view: 'Profile View',
  };
  return labels[type] || type;
}

/**
 * Get Lucide icon name for notification type
 *
 * Returns the name of a Lucide icon appropriate for the notification type.
 * Use with dynamic icon imports or icon components.
 *
 * @param type - The notification type enum value
 * @returns Lucide icon component name (e.g., 'CheckCircle', 'DollarSign')
 * @example
 * const iconName = getNotificationTypeIcon('deal_accepted'); // "CheckCircle"
 */
export function getNotificationTypeIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    deal: 'Briefcase',
    deal_offer: 'DollarSign',
    deal_accepted: 'CheckCircle',
    deal_rejected: 'XCircle',
    deal_completed: 'Award',
    deal_cancelled: 'XCircle',
    message: 'MessageSquare',
    message_received: 'MessageSquare',
    payment: 'CreditCard',
    payment_received: 'CheckCircle',
    payment_pending: 'Clock',
    system: 'Bell',
    verification_approved: 'CheckCircle',
    verification_rejected: 'XCircle',
    verification_request: 'Clock',
    opportunity_match: 'Star',
    profile_view: 'Eye',
  };
  return icons[type] || 'Bell';
}

/**
 * Get human-readable relative time string from ISO date
 *
 * Converts an ISO date string to a relative time description
 * like "5 minutes ago", "2 hours ago", "3 days ago", etc.
 *
 * @param dateString - ISO date string
 * @returns Human-readable relative time string
 * @example
 * getRelativeTime(new Date(Date.now() - 60000).toISOString()) // "1 minute ago"
 * getRelativeTime(new Date(Date.now() - 3600000).toISOString()) // "1 hour ago"
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks === 1 ? '' : 's'} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths === 1 ? '' : 's'} ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears === 1 ? '' : 's'} ago`;
}

/**
 * Get Tailwind CSS color class for notification type
 *
 * Returns a text color class appropriate for the notification type's
 * semantic meaning (green for success, red for errors, etc.).
 *
 * @param type - The notification type enum value
 * @returns Tailwind text color class (e.g., 'text-green-500')
 * @example
 * <div className={getNotificationColorClass('deal_accepted')}>
 *   {notification.title}
 * </div>
 */
export function getNotificationColorClass(type: NotificationType): string {
  const colors: Record<NotificationType, string> = {
    deal: 'text-blue-500',
    deal_offer: 'text-green-500',
    deal_accepted: 'text-green-500',
    deal_rejected: 'text-red-500',
    deal_completed: 'text-green-500',
    deal_cancelled: 'text-red-500',
    message: 'text-blue-500',
    message_received: 'text-blue-500',
    payment: 'text-green-500',
    payment_received: 'text-green-500',
    payment_pending: 'text-yellow-500',
    system: 'text-gray-500',
    verification_approved: 'text-green-500',
    verification_rejected: 'text-red-500',
    verification_request: 'text-yellow-500',
    opportunity_match: 'text-purple-500',
    profile_view: 'text-blue-500',
  };
  return colors[type] || 'text-gray-500';
}
