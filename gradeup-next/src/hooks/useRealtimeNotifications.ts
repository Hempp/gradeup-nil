'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import * as notificationService from '@/lib/services/notifications';
import type { Notification, NotificationType } from '@/lib/services/notifications';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Re-export types for consumers
export type { Notification, NotificationType };

// ========================================================================
// Types
// ========================================================================

export interface UseRealtimeNotificationsOptions {
  /** Enable notification sounds for new notifications */
  enableSound?: boolean;
  /** Custom notification sound URL */
  soundUrl?: string;
  /** Maximum notifications to keep in state */
  maxNotifications?: number;
  /** Callback when a new notification arrives */
  onNewNotification?: (notification: Notification) => void;
}

export interface UseRealtimeNotificationsResult {
  /** Array of user notifications */
  notifications: Notification[];
  /** Count of unread notifications */
  unreadCount: number;
  /** Loading state for initial fetch */
  loading: boolean;
  /** Connection state to realtime channel */
  isConnected: boolean;
  /** Error state if any operation fails */
  error: Error | null;
  /** Indicates if using mock data (table doesn't exist) */
  isUsingMockData: boolean;
  /** Mark a single notification as read */
  markAsRead: (notificationId: string) => Promise<{ success: boolean; error?: string }>;
  /** Mark all notifications as read */
  markAllAsRead: () => Promise<{ success: boolean; error?: string }>;
  /** Delete a notification */
  deleteNotification: (notificationId: string) => Promise<{ success: boolean; error?: string }>;
  /** Refresh notifications from server */
  refresh: () => Promise<void>;
}

// ========================================================================
// Sound Utilities
// ========================================================================

const DEFAULT_SOUND_URL = '/sounds/notification.mp3';

let audioContext: AudioContext | null = null;
let notificationSoundBuffer: AudioBuffer | null = null;

/**
 * Initialize audio context and preload notification sound
 */
async function initializeAudio(soundUrl: string): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // Create audio context if not exists
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }

    // Fetch and decode the audio file
    const response = await fetch(soundUrl);
    const arrayBuffer = await response.arrayBuffer();
    notificationSoundBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch (error) {
    console.warn('[useRealtimeNotifications] Failed to initialize audio:', error);
  }
}

/**
 * Play the notification sound
 */
function playNotificationSound(): void {
  if (!audioContext || !notificationSoundBuffer) {
    // Fallback to simple Audio API
    try {
      const audio = new Audio(DEFAULT_SOUND_URL);
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Ignore autoplay errors (user hasn't interacted with page)
      });
    } catch {
      // Ignore audio errors
    }
    return;
  }

  try {
    // Resume audio context if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    // Create and play sound
    const source = audioContext.createBufferSource();
    source.buffer = notificationSoundBuffer;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.5;

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start(0);
  } catch (error) {
    console.warn('[useRealtimeNotifications] Failed to play notification sound:', error);
  }
}

// ========================================================================
// Mock Data for Development/Fallback
// ========================================================================

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'mock-1',
    type: 'verification_approved',
    title: 'Enrollment Verified',
    message: 'Your enrollment verification has been approved by the athletic director.',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    url: '/dashboard/verifications',
    metadata: { verification_type: 'enrollment' },
  },
  {
    id: 'mock-2',
    type: 'deal_offer',
    title: 'New Deal Offer',
    message: 'Nike has sent you a new endorsement offer worth $5,000.',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    url: '/dashboard/deals/new-offer-123',
    metadata: { brand_name: 'Nike', amount: 5000 },
  },
  {
    id: 'mock-3',
    type: 'message',
    title: 'New Message',
    message: 'You have a new message from Gatorade regarding your partnership.',
    read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    url: '/dashboard/messages/conv-456',
    metadata: { sender_name: 'Gatorade', conversation_id: 'conv-456' },
  },
  {
    id: 'mock-4',
    type: 'payment_received',
    title: 'Payment Received',
    message: 'You received a payment of $2,500 from Under Armour.',
    read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    url: '/dashboard/earnings',
    metadata: { brand_name: 'Under Armour', amount: 2500 },
  },
];

// ========================================================================
// Hook Implementation
// ========================================================================

/**
 * Hook for real-time notifications using Supabase Realtime
 *
 * Subscribes to the notifications table for the current user and provides
 * real-time updates for new, updated, and deleted notifications. Includes
 * optional notification sound playback.
 *
 * @param options - Configuration options for the hook
 * @returns Object containing notifications state and control functions
 *
 * @example
 * function NotificationCenter() {
 *   const {
 *     notifications,
 *     unreadCount,
 *     loading,
 *     isConnected,
 *     markAsRead,
 *     markAllAsRead
 *   } = useRealtimeNotifications({
 *     enableSound: true,
 *     onNewNotification: (n) => toast.info(n.title)
 *   });
 *
 *   return (
 *     <div>
 *       <Badge count={unreadCount} />
 *       {notifications.map(n => <NotificationItem key={n.id} {...n} />)}
 *     </div>
 *   );
 * }
 */
export function useRealtimeNotifications(
  options: UseRealtimeNotificationsOptions = {}
): UseRealtimeNotificationsResult {
  const {
    enableSound = false,
    soundUrl = DEFAULT_SOUND_URL,
    maxNotifications = 50,
    onNewNotification,
  } = options;

  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Refs
  const channelRef = useRef<RealtimeChannel | null>(null);
  const tableExistsRef = useRef<boolean | null>(null);
  const mountedRef = useRef(true);

  // Calculate unread count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Initialize audio on mount if sound enabled
  useEffect(() => {
    if (enableSound) {
      initializeAudio(soundUrl);
    }
  }, [enableSound, soundUrl]);

  // Get current user
  useEffect(() => {
    mountedRef.current = true;
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mountedRef.current) {
        setUserId(user?.id || null);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (mountedRef.current) {
        setUserId(session?.user?.id || null);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch notifications
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
        console.info('[useRealtimeNotifications] Notifications table not available, using mock data');
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (mountedRef.current) {
          setNotifications(MOCK_NOTIFICATIONS);
          setIsUsingMockData(true);
        }
        return;
      }

      // Fetch from Supabase
      const { data, error: fetchError } = await notificationService.getNotifications(
        userId,
        maxNotifications
      );

      if (!mountedRef.current) return;

      if (fetchError) {
        throw fetchError;
      }

      setNotifications(data || []);
      setIsUsingMockData(false);
    } catch (err) {
      console.error('[useRealtimeNotifications] Error fetching notifications:', err);
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch notifications'));
        setNotifications(MOCK_NOTIFICATIONS);
        setIsUsingMockData(true);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId, maxNotifications]);

  // Initial fetch when userId changes
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Set up real-time subscription
  useEffect(() => {
    if (!userId || isUsingMockData) {
      return;
    }

    // Wait for table existence check
    if (tableExistsRef.current !== true) {
      return;
    }

    const supabase = createClient();

    // Subscribe to notifications channel
    channelRef.current = supabase
      .channel(`realtime-notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!mountedRef.current) return;

          const newNotification = notificationService.subscribeToNotifications(userId, {
            onInsert: () => {},
          });

          // Transform the payload
          const record = payload.new as {
            id: string;
            type: NotificationType;
            title: string;
            body: string;
            read: boolean;
            created_at: string;
            url?: string | null;
            metadata?: Record<string, unknown>;
          };

          const notification: Notification = {
            id: record.id,
            type: record.type,
            title: record.title,
            message: record.body,
            read: record.read,
            created_at: record.created_at,
            url: record.url ?? undefined,
            metadata: record.metadata,
          };

          // Add to notifications
          setNotifications((prev) => {
            // Avoid duplicates
            if (prev.some((n) => n.id === notification.id)) {
              return prev;
            }
            // Keep within max limit
            const updated = [notification, ...prev];
            return updated.slice(0, maxNotifications);
          });

          // Play sound if enabled
          if (enableSound) {
            playNotificationSound();
          }

          // Call callback if provided
          onNewNotification?.(notification);

          // Cleanup unused subscription
          if (typeof newNotification === 'function') {
            newNotification();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!mountedRef.current) return;

          const record = payload.new as {
            id: string;
            type: NotificationType;
            title: string;
            body: string;
            read: boolean;
            created_at: string;
            url?: string | null;
            metadata?: Record<string, unknown>;
          };

          const notification: Notification = {
            id: record.id,
            type: record.type,
            title: record.title,
            message: record.body,
            read: record.read,
            created_at: record.created_at,
            url: record.url ?? undefined,
            metadata: record.metadata,
          };

          setNotifications((prev) =>
            prev.map((n) => (n.id === notification.id ? notification : n))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!mountedRef.current) return;

          const oldRecord = payload.old as { id: string };
          setNotifications((prev) => prev.filter((n) => n.id !== oldRecord.id));
        }
      )
      .subscribe((status, err) => {
        if (!mountedRef.current) return;

        setIsConnected(status === 'SUBSCRIBED');

        if (status === 'CHANNEL_ERROR' && err) {
          setError(new Error(`Realtime connection error: ${err.message}`));
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, isUsingMockData, enableSound, maxNotifications, onNewNotification]);

  // Mark single notification as read
  const markAsRead = useCallback(
    async (notificationId: string): Promise<{ success: boolean; error?: string }> => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
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
          // Revert optimistic update
          setNotifications((prev) =>
            prev.map((n) => (n.id === notificationId ? { ...n, read: false } : n))
          );
          return { success: false, error: updateError.message };
        }

        return { success: true };
      } catch (err) {
        // Revert optimistic update
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: false } : n))
        );
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to mark as read',
        };
      }
    },
    [userId, isUsingMockData]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!userId) {
      return { success: false, error: 'No user ID provided' };
    }

    // Optimistic update
    const previousNotifications = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    // If using mock data, just return success
    if (isUsingMockData) {
      return { success: true };
    }

    try {
      const { error: updateError } = await notificationService.markAllAsRead(userId);

      if (updateError) {
        // Revert optimistic update
        setNotifications(previousNotifications);
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (err) {
      // Revert optimistic update
      setNotifications(previousNotifications);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to mark all as read',
      };
    }
  }, [userId, notifications, isUsingMockData]);

  // Delete a notification
  const deleteNotification = useCallback(
    async (notificationId: string): Promise<{ success: boolean; error?: string }> => {
      // Optimistic update
      const previousNotifications = notifications;
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

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
          // Revert optimistic update
          setNotifications(previousNotifications);
          return { success: false, error: deleteError.message };
        }

        return { success: true };
      } catch (err) {
        // Revert optimistic update
        setNotifications(previousNotifications);
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to delete notification',
        };
      }
    },
    [userId, notifications, isUsingMockData]
  );

  return {
    notifications,
    unreadCount,
    loading,
    isConnected,
    error,
    isUsingMockData,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications,
  };
}
