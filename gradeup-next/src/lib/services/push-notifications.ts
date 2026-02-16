/**
 * Push Notifications Service for GradeUp NIL Platform
 *
 * Handles browser push notification subscriptions and sending notifications
 * using the Web Push API with VAPID authentication.
 */

import * as webpush from 'web-push';
import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('PushNotifications');

// Configure VAPID keys for Web Push authentication
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:support@gradeupnil.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Types

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
}

export interface SendNotificationResult {
  success: boolean;
  sent?: number;
  error?: string;
}

export interface BulkNotificationResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    user_id: string;
    success: boolean;
    error?: string;
  }>;
}

export type SubscriptionStatus = 'active' | 'inactive' | 'denied' | 'not_supported' | 'unknown';

/**
 * Check if push notifications are supported in the current browser
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Request permission for push notifications
 */
export async function requestPushPermission(): Promise<{
  data: NotificationPermission | null;
  error: Error | null;
}> {
  if (typeof window === 'undefined') {
    return { data: null, error: new Error('Push notifications not available on server') };
  }

  if (!isPushSupported()) {
    return { data: null, error: new Error('Push notifications not supported in this browser') };
  }

  try {
    const permission = await Notification.requestPermission();
    return { data: permission, error: null };
  } catch (err) {
    return { data: null, error: new Error(`Failed to request permission: ${(err as Error).message}`) };
  }
}

/**
 * Save a push subscription for a user
 */
export async function saveSubscription(userId: string, subscription: PushSubscription) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      created_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,endpoint',
    });

  if (error) {
    log.error('Failed to save subscription', error);
    return { success: false, error: error.message };
  }

  log.info('Subscription saved successfully', { userId });
  return { success: true };
}

/**
 * Remove a push subscription for a user
 */
export async function removeSubscription(userId: string, endpoint: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);

  if (error) {
    log.error('Failed to remove subscription', error);
    return { success: false, error: error.message };
  }

  log.info('Subscription removed successfully', { userId });
  return { success: true };
}

/**
 * Get the subscription status for a user
 */
export async function getSubscriptionStatus(
  userId: string
): Promise<{
  data: {
    status: SubscriptionStatus;
    hasSubscription: boolean;
    permission: NotificationPermission | null;
  } | null;
  error: Error | null;
}> {
  if (!userId) {
    return { data: null, error: new Error('User ID is required') };
  }

  // Check browser support
  if (typeof window !== 'undefined' && !isPushSupported()) {
    return {
      data: {
        status: 'not_supported',
        hasSubscription: false,
        permission: null,
      },
      error: null,
    };
  }

  // Get current permission status
  const permission = typeof window !== 'undefined' ? Notification.permission : null;

  if (permission === 'denied') {
    return {
      data: {
        status: 'denied',
        hasSubscription: false,
        permission,
      },
      error: null,
    };
  }

  // Check for active subscription in database
  const supabase = await createClient();
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (error) {
    log.error('Failed to check subscription status', error);
    return { data: null, error: new Error(error.message) };
  }

  const hasSubscription = subscriptions && subscriptions.length > 0;

  return {
    data: {
      status: hasSubscription ? 'active' : 'inactive',
      hasSubscription,
      permission,
    },
    error: null,
  };
}

/**
 * Send a push notification to a single user
 */
export async function sendPushNotification(
  userId: string,
  notification: { title: string; body: string; url?: string }
): Promise<SendNotificationResult> {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    log.warn('VAPID keys not configured, skipping push notification');
    return { success: false, error: 'Push notifications not configured' };
  }

  const supabase = await createClient();

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (error) {
    log.error('Failed to fetch subscriptions', error);
    return { success: false, error: error.message };
  }

  if (!subscriptions?.length) {
    log.info('No push subscriptions found for user', { userId });
    return { success: false, error: 'No subscriptions' };
  }

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    url: notification.url || '/',
    icon: '/icon-192.png',
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      )
    )
  );

  // Clean up expired subscriptions (410 Gone responses)
  const expiredEndpoints: string[] = [];
  results.forEach((result, index) => {
    if (result.status === 'rejected' && 'statusCode' in result.reason && result.reason.statusCode === 410) {
      expiredEndpoints.push(subscriptions[index].endpoint);
    }
  });

  if (expiredEndpoints.length > 0) {
    log.info('Cleaning up expired subscriptions', { userId, count: expiredEndpoints.length });
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .in('endpoint', expiredEndpoints);
  }

  const successful = results.filter((r) => r.status === 'fulfilled').length;
  log.info('Push notifications sent', { userId, total: subscriptions.length, successful });

  return { success: true, sent: successful };
}

/**
 * Send push notifications to multiple users
 */
export async function sendBulkNotifications(
  userIds: string[],
  notification: NotificationPayload
): Promise<{ data: BulkNotificationResult | null; error: Error | null }> {
  if (!userIds || userIds.length === 0) {
    return { data: null, error: new Error('At least one user ID is required') };
  }

  if (!notification.title || !notification.body) {
    return { data: null, error: new Error('Notification title and body are required') };
  }

  const results: BulkNotificationResult['results'] = [];
  let successful = 0;
  let failed = 0;

  // Process each user
  for (const userId of userIds) {
    const result = await sendPushNotification(userId, {
      title: notification.title,
      body: notification.body,
      url: notification.url,
    });

    if (!result.success) {
      failed++;
      results.push({
        user_id: userId,
        success: false,
        error: result.error,
      });
    } else {
      successful++;
      results.push({
        user_id: userId,
        success: true,
      });
    }
  }

  return {
    data: {
      total: userIds.length,
      successful,
      failed,
      results,
    },
    error: null,
  };
}

/**
 * Get all active subscriptions (admin function)
 */
export async function getAllActiveSubscriptions(): Promise<{
  data: Array<{ user_id: string; endpoint: string }> | null;
  error: Error | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint');

  if (error) {
    log.error('Failed to fetch all subscriptions', error);
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

/**
 * Send notification to all subscribed users (admin broadcast)
 */
export async function broadcastNotification(
  notification: NotificationPayload
): Promise<{ data: BulkNotificationResult | null; error: Error | null }> {
  const { data: subscriptions, error: subError } = await getAllActiveSubscriptions();

  if (subError || !subscriptions) {
    return { data: null, error: subError || new Error('Failed to get subscriptions') };
  }

  if (subscriptions.length === 0) {
    return {
      data: {
        total: 0,
        successful: 0,
        failed: 0,
        results: [],
      },
      error: null,
    };
  }

  // Get unique user IDs
  const userIds = [...new Set(subscriptions.map(sub => sub.user_id))];
  return sendBulkNotifications(userIds, notification);
}

/**
 * Get the VAPID public key for client-side subscription
 */
export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}
