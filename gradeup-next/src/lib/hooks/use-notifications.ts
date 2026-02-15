'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type NotificationType =
  | 'verification_approved'
  | 'verification_rejected'
  | 'verification_request'
  | 'deal_offer'
  | 'message';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: Error | null;
  markAsRead: (notificationId: string) => Promise<{ success: boolean; error?: string }>;
  markAllAsRead: () => Promise<{ success: boolean; error?: string }>;
  deleteNotification: (notificationId: string) => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Mock Data for Testing
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'verification_approved',
    title: 'Enrollment Verified',
    message: 'Your enrollment verification has been approved by the athletic director.',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    url: '/dashboard/verifications',
    metadata: { verification_type: 'enrollment' },
  },
  {
    id: '2',
    type: 'deal_offer',
    title: 'New Deal Offer',
    message: 'Nike has sent you a new endorsement offer worth $5,000.',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    url: '/dashboard/deals/new-offer-123',
    metadata: { brand_name: 'Nike', amount: 5000 },
  },
  {
    id: '3',
    type: 'message',
    title: 'New Message',
    message: 'You have a new message from Gatorade regarding your partnership.',
    read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    url: '/dashboard/messages/conv-456',
    metadata: { sender_name: 'Gatorade', conversation_id: 'conv-456' },
  },
  {
    id: '4',
    type: 'verification_rejected',
    title: 'GPA Verification Needs Update',
    message: 'Your GPA verification was rejected. Please submit an updated transcript.',
    read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    url: '/dashboard/verifications',
    metadata: { verification_type: 'grades', reason: 'Transcript outdated' },
  },
  {
    id: '5',
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
// Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook for managing user notifications
 * Handles fetching, marking as read, deleting, and real-time updates
 */
export function useNotifications(userId: string | null): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Calculate unread count from notifications
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with actual Supabase query when notifications table is ready
      // const supabase = createClient();
      // const { data, error: fetchError } = await supabase
      //   .from('notifications')
      //   .select('*')
      //   .eq('user_id', userId)
      //   .order('created_at', { ascending: false });
      //
      // if (fetchError) {
      //   throw fetchError;
      // }
      //
      // setNotifications(data || []);

      // For now, use mock data with simulated delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setNotifications(MOCK_NOTIFICATIONS);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch notifications'));
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
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Handle different event types
          if (payload.eventType === 'INSERT') {
            // Add new notification at the beginning
            setNotifications(prev => [payload.new as Notification, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            // Update existing notification
            setNotifications(prev =>
              prev.map(n => (n.id === (payload.new as Notification).id ? (payload.new as Notification) : n))
            );
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted notification
            setNotifications(prev => prev.filter(n => n.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Mark single notification as read
  const markAsRead = useCallback(async (
    notificationId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // TODO: Replace with actual Supabase update when notifications table is ready
      // const supabase = createClient();
      // const { error: updateError } = await supabase
      //   .from('notifications')
      //   .update({ read: true })
      //   .eq('id', notificationId)
      //   .eq('user_id', userId);
      //
      // if (updateError) {
      //   return { success: false, error: updateError.message };
      // }

      // Optimistic update
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to mark as read' };
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!userId) {
      return { success: false, error: 'No user ID provided' };
    }

    try {
      // TODO: Replace with actual Supabase update when notifications table is ready
      // const supabase = createClient();
      // const { error: updateError } = await supabase
      //   .from('notifications')
      //   .update({ read: true })
      //   .eq('user_id', userId)
      //   .eq('read', false);
      //
      // if (updateError) {
      //   return { success: false, error: updateError.message };
      // }

      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to mark all as read' };
    }
  }, [userId]);

  // Delete a notification
  const deleteNotification = useCallback(async (
    notificationId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // TODO: Replace with actual Supabase delete when notifications table is ready
      // const supabase = createClient();
      // const { error: deleteError } = await supabase
      //   .from('notifications')
      //   .delete()
      //   .eq('id', notificationId)
      //   .eq('user_id', userId);
      //
      // if (deleteError) {
      //   return { success: false, error: deleteError.message };
      // }

      // Optimistic update
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete notification' };
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get display label for notification type
 */
export function getNotificationTypeLabel(type: NotificationType): string {
  const labels: Record<NotificationType, string> = {
    verification_approved: 'Verification Approved',
    verification_rejected: 'Verification Rejected',
    verification_request: 'Verification Request',
    deal_offer: 'Deal Offer',
    message: 'Message',
  };
  return labels[type] || type;
}

/**
 * Get icon name for notification type (for use with icon system)
 */
export function getNotificationTypeIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    verification_approved: 'CheckCircle',
    verification_rejected: 'XCircle',
    verification_request: 'Clock',
    deal_offer: 'DollarSign',
    message: 'MessageSquare',
  };
  return icons[type] || 'Bell';
}

/**
 * Get relative time string (e.g., "2 hours ago")
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
