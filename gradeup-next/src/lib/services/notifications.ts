import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type NotificationType =
  | 'deal'
  | 'deal_offer'
  | 'deal_accepted'
  | 'deal_rejected'
  | 'deal_completed'
  | 'deal_cancelled'
  | 'message'
  | 'message_received'
  | 'payment'
  | 'payment_received'
  | 'payment_pending'
  | 'system'
  | 'verification_approved'
  | 'verification_rejected'
  | 'verification_request'
  | 'opportunity_match'
  | 'profile_view';

/**
 * Database notification record
 * Maps to the notifications table in Supabase
 */
export interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  read_at?: string | null;
  url?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Client-side notification interface
 * Provides a friendlier API for UI components
 */
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

export interface NotificationFilters {
  type?: NotificationType[];
  read?: boolean;
  limit?: number;
  offset?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Transform a database notification record to client-side notification format
 *
 * Maps database column names to client-friendly property names
 * (e.g., 'body' becomes 'message').
 *
 * @param record - The raw NotificationRecord from Supabase
 * @returns Transformed Notification object for UI consumption
 * @internal
 */
function transformNotification(record: NotificationRecord): Notification {
  return {
    id: record.id,
    type: record.type as NotificationType,
    title: record.title,
    message: record.body,
    read: record.read,
    created_at: record.created_at,
    url: record.url ?? undefined,
    metadata: record.metadata,
  };
}

/**
 * Check if the notifications table exists and is accessible
 *
 * Used to determine whether to use real notifications or fall back
 * to mock data. Returns true if the table exists, even with RLS errors.
 *
 * @returns Promise resolving to boolean indicating table availability
 * @example
 * const tableExists = await checkTableExists();
 * if (!tableExists) {
 *   console.log('Using mock notifications');
 * }
 */
export async function checkTableExists(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('notifications')
      .select('id')
      .limit(1);

    // If we get a specific error about the table not existing, return false
    if (error) {
      // PostgreSQL error code 42P01 = undefined_table
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return false;
      }
      // For other errors (like RLS), assume table exists
      return true;
    }

    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Service Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get notifications for a specific user
 *
 * Fetches the most recent notifications for a user, ordered by
 * creation date (newest first).
 *
 * @param userId - The unique identifier of the user
 * @param limit - Maximum notifications to return (default: 50)
 * @returns Promise resolving to Notification array or an error
 * @example
 * const { data: notifications } = await getNotifications(userId, 20);
 * const unread = notifications?.filter(n => !n.read);
 */
export async function getNotifications(
  userId: string,
  limit: number = 50
): Promise<{ data: Notification[] | null; error: Error | null }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { data: null, error: new Error(`Failed to fetch notifications: ${error.message}`) };
  }

  const notifications = (data as NotificationRecord[]).map(transformNotification);
  return { data: notifications, error: null };
}

/**
 * Mark a single notification as read
 *
 * Updates the read status and read_at timestamp for a notification.
 * Optionally scopes the update to a specific user for security.
 *
 * @param notificationId - The unique identifier of the notification
 * @param userId - Optional user ID to scope the update for extra security
 * @returns Promise resolving to the updated Notification or an error
 * @example
 * const { data } = await markNotificationAsRead('notif-123', currentUserId);
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId?: string
): Promise<{ data: Notification | null; error: Error | null }> {
  const supabase = createClient();

  let query = supabase
    .from('notifications')
    .update({
      read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', notificationId);

  // Optionally scope to user for extra security
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    return { data: null, error: new Error(`Failed to mark notification as read: ${error.message}`) };
  }

  return { data: transformNotification(data as NotificationRecord), error: null };
}

/**
 * Mark all unread notifications as read for a user
 *
 * Batch updates all notifications with read=false to read=true
 * and sets the read_at timestamp.
 *
 * @param userId - The unique identifier of the user
 * @returns Promise resolving to success or an error
 * @example
 * await markAllAsRead(userId);
 * setUnreadCount(0);
 */
export async function markAllAsRead(
  userId: string
): Promise<{ data: null; error: Error | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('notifications')
    .update({
      read: true,
      read_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    return { data: null, error: new Error(`Failed to mark all notifications as read: ${error.message}`) };
  }

  return { data: null, error: null };
}

/**
 * Delete a notification
 *
 * Permanently removes a notification from the database.
 * Optionally scopes the deletion to a specific user for security.
 *
 * @param notificationId - The unique identifier of the notification
 * @param userId - Optional user ID to scope the deletion for extra security
 * @returns Promise resolving to success or an error
 * @example
 * const { error } = await deleteNotification('notif-123', currentUserId);
 */
export async function deleteNotification(
  notificationId: string,
  userId?: string
): Promise<{ data: null; error: Error | null }> {
  const supabase = createClient();

  let query = supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  // Optionally scope to user for extra security
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { error } = await query;

  if (error) {
    return { data: null, error: new Error(`Failed to delete notification: ${error.message}`) };
  }

  return { data: null, error: null };
}

/**
 * Get the count of unread notifications for a user
 *
 * Performs a count-only query for efficiency when only the
 * unread count is needed (e.g., for notification badges).
 *
 * @param userId - The unique identifier of the user
 * @returns Promise resolving to the unread count number
 * @example
 * const { data: count } = await getUnreadCount(userId);
 * setBadgeCount(count);
 */
export async function getUnreadCount(
  userId: string
): Promise<{ data: number; error: Error | null }> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    return { data: 0, error: new Error(`Failed to fetch unread count: ${error.message}`) };
  }

  return { data: count ?? 0, error: null };
}

/**
 * Get notifications with advanced filtering and pagination
 *
 * Supports filtering by notification type and read status,
 * with offset-based pagination. Returns total count for pagination UI.
 *
 * @param userId - The unique identifier of the user
 * @param filters - Optional filter and pagination parameters
 * @returns Promise resolving to notifications array, total count, or an error
 * @example
 * const { data, total } = await getNotificationsWithFilters(userId, {
 *   type: ['deal_offer', 'deal_accepted'],
 *   read: false,
 *   limit: 10,
 *   offset: 0
 * });
 */
export async function getNotificationsWithFilters(
  userId: string,
  filters?: NotificationFilters
): Promise<{ data: Notification[] | null; total: number; error: Error | null }> {
  const supabase = createClient();
  const limit = filters?.limit ?? 20;
  const offset = filters?.offset ?? 0;

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.type && filters.type.length > 0) {
    query = query.in('type', filters.type);
  }

  if (typeof filters?.read === 'boolean') {
    query = query.eq('read', filters.read);
  }

  const { data, count, error } = await query;

  if (error) {
    return { data: null, total: 0, error: new Error(`Failed to fetch notifications: ${error.message}`) };
  }

  const notifications = (data as NotificationRecord[]).map(transformNotification);
  return { data: notifications, total: count ?? 0, error: null };
}

/**
 * Create a new notification for a user
 *
 * Inserts a new notification record with the specified type, title,
 * message, and optional URL and metadata.
 *
 * @param notification - The notification data to create
 * @returns Promise resolving to the created Notification or an error
 * @example
 * await createNotification({
 *   user_id: athleteId,
 *   type: 'deal_offer',
 *   title: 'New Deal Offer',
 *   message: 'Nike wants to partner with you!',
 *   url: '/deals/offer-123',
 *   metadata: { brandName: 'Nike', amount: 5000 }
 * });
 */
export async function createNotification(
  notification: {
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    url?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<{ data: Notification | null; error: Error | null }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: notification.user_id,
      type: notification.type,
      title: notification.title,
      body: notification.message,
      url: notification.url ?? null,
      metadata: notification.metadata ?? {},
      read: false,
      read_at: null,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(`Failed to create notification: ${error.message}`) };
  }

  return { data: transformNotification(data as NotificationRecord), error: null };
}

/**
 * Delete all read notifications for a user (cleanup utility)
 *
 * Removes all notifications that have been marked as read,
 * useful for cleaning up old notifications.
 *
 * @param userId - The unique identifier of the user
 * @returns Promise resolving to success or an error
 * @example
 * // In settings or cleanup action
 * await deleteReadNotifications(userId);
 * showToast('Old notifications cleared');
 */
export async function deleteReadNotifications(
  userId: string
): Promise<{ data: null; error: Error | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .eq('read', true);

  if (error) {
    return { data: null, error: new Error(`Failed to delete read notifications: ${error.message}`) };
  }

  return { data: null, error: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// Real-time Subscription
// ═══════════════════════════════════════════════════════════════════════════

export interface NotificationSubscriptionCallbacks {
  onInsert?: (notification: Notification) => void;
  onUpdate?: (notification: Notification) => void;
  onDelete?: (id: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Subscribe to real-time notification updates for a user
 *
 * Sets up Supabase Realtime subscriptions for INSERT, UPDATE, and DELETE
 * events on the user's notifications. Use the returned function to
 * clean up the subscription.
 *
 * @param userId - The unique identifier of the user
 * @param callbacks - Callback functions for different events
 * @returns Unsubscribe function to clean up the subscription
 * @example
 * const unsubscribe = subscribeToNotifications(userId, {
 *   onInsert: (notification) => {
 *     setNotifications(prev => [notification, ...prev]);
 *     playNotificationSound();
 *   },
 *   onUpdate: (notification) => {
 *     setNotifications(prev =>
 *       prev.map(n => n.id === notification.id ? notification : n)
 *     );
 *   },
 *   onDelete: (id) => {
 *     setNotifications(prev => prev.filter(n => n.id !== id));
 *   },
 *   onError: (error) => console.error('Subscription error:', error)
 * });
 *
 * // Cleanup on component unmount
 * return () => unsubscribe();
 */
export function subscribeToNotifications(
  userId: string,
  callbacks: NotificationSubscriptionCallbacks
): () => void {
  const supabase = createClient();

  const channel: RealtimeChannel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (callbacks.onInsert) {
          const notification = transformNotification(payload.new as NotificationRecord);
          callbacks.onInsert(notification);
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
        if (callbacks.onUpdate) {
          const notification = transformNotification(payload.new as NotificationRecord);
          callbacks.onUpdate(notification);
        }
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
        if (callbacks.onDelete) {
          const oldRecord = payload.old as { id: string };
          callbacks.onDelete(oldRecord.id);
        }
      }
    )
    .subscribe((status, err) => {
      if (err && callbacks.onError) {
        callbacks.onError(new Error(`Subscription error: ${err.message}`));
      }
    });

  // Return cleanup function
  return () => {
    supabase.removeChannel(channel);
  };
}
