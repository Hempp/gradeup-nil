import { createClient } from '@/lib/supabase/client';

// Types
export type NotificationType =
  | 'deal_offer'
  | 'deal_accepted'
  | 'deal_rejected'
  | 'deal_completed'
  | 'deal_cancelled'
  | 'message_received'
  | 'verification_approved'
  | 'verification_rejected'
  | 'payment_received'
  | 'payment_pending'
  | 'opportunity_match'
  | 'profile_view'
  | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  read_at: string | null;
  created_at: string;
  // Related entities
  deal_id?: string;
  opportunity_id?: string;
  sender_id?: string;
}

export interface NotificationFilters {
  type?: NotificationType[];
  read?: boolean;
  limit?: number;
  offset?: number;
}

// Service functions

/**
 * Get notifications for a specific user with optional filters
 */
export async function getNotifications(
  userId: string,
  limit: number = 20
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

  return { data: data as Notification[], error: null };
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ data: Notification | null; error: Error | null }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('notifications')
    .update({
      read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(`Failed to mark notification as read: ${error.message}`) };
  }

  return { data: data as Notification, error: null };
}

/**
 * Mark all notifications as read for a user
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
 */
export async function deleteNotification(
  notificationId: string
): Promise<{ data: null; error: Error | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    return { data: null, error: new Error(`Failed to delete notification: ${error.message}`) };
  }

  return { data: null, error: null };
}

/**
 * Get the count of unread notifications for a user
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
 * Get notifications with advanced filtering
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

  return { data: data as Notification[], total: count ?? 0, error: null };
}

/**
 * Create a new notification (typically called by backend/triggers)
 */
export async function createNotification(
  notification: Omit<Notification, 'id' | 'created_at' | 'read' | 'read_at'>
): Promise<{ data: Notification | null; error: Error | null }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      ...notification,
      read: false,
      read_at: null,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(`Failed to create notification: ${error.message}`) };
  }

  return { data: data as Notification, error: null };
}

/**
 * Delete all read notifications for a user (cleanup)
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
