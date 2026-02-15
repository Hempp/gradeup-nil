/**
 * Push Notifications Service for GradeUp NIL Platform
 *
 * Handles browser push notification subscriptions and sending notifications.
 * This is a mock implementation - replace with actual push service integration
 * (e.g., Firebase Cloud Messaging, OneSignal, or Web Push API) for production.
 */

// Types

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  user_agent?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
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
  message_id?: string;
  error?: string;
}

export interface BulkNotificationResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    user_id: string;
    success: boolean;
    message_id?: string;
    error?: string;
  }>;
}

export type SubscriptionStatus = 'active' | 'inactive' | 'denied' | 'not_supported' | 'unknown';

// Mock data store (simulates database)
const mockSubscriptions: Map<string, PushSubscription> = new Map();

// Helper to generate mock IDs
function generateMockId(): string {
  return `push_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Helper to simulate network delay
function simulateDelay(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
 * Subscribe a user to push notifications
 * Requests permission if needed and saves the subscription
 */
export async function subscribeToPush(
  userId: string
): Promise<{ data: PushSubscription | null; error: Error | null }> {
  await simulateDelay();

  if (!userId) {
    return { data: null, error: new Error('User ID is required') };
  }

  // Check if already subscribed
  const existing = mockSubscriptions.get(userId);
  if (existing && existing.is_active) {
    return { data: existing, error: null };
  }

  // In a real implementation, this would:
  // 1. Request notification permission
  // 2. Register/get service worker
  // 3. Subscribe to push manager with VAPID key
  // 4. Save subscription to database

  // Mock subscription creation
  const subscription: PushSubscription = {
    id: generateMockId(),
    user_id: userId,
    endpoint: `https://fcm.googleapis.com/fcm/send/${generateMockId()}`,
    keys: {
      p256dh: `BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM`,
      auth: `tBHItJI5svbpez7KI4CCXg`,
    },
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'mock-user-agent',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_active: true,
  };

  mockSubscriptions.set(userId, subscription);

  return { data: subscription, error: null };
}

/**
 * Unsubscribe a user from push notifications
 */
export async function unsubscribeFromPush(
  userId: string
): Promise<{ data: null; error: Error | null }> {
  await simulateDelay();

  if (!userId) {
    return { data: null, error: new Error('User ID is required') };
  }

  const existing = mockSubscriptions.get(userId);
  if (!existing) {
    return { data: null, error: new Error('No active subscription found for this user') };
  }

  // In a real implementation, this would:
  // 1. Get the push subscription from service worker
  // 2. Call subscription.unsubscribe()
  // 3. Remove from database

  // Mark as inactive instead of deleting (for audit purposes)
  existing.is_active = false;
  existing.updated_at = new Date().toISOString();
  mockSubscriptions.set(userId, existing);

  return { data: null, error: null };
}

/**
 * Get the subscription status for a user
 */
export async function getSubscriptionStatus(
  userId: string
): Promise<{
  data: {
    status: SubscriptionStatus;
    subscription: PushSubscription | null;
    permission: NotificationPermission | null;
  } | null;
  error: Error | null;
}> {
  await simulateDelay();

  if (!userId) {
    return { data: null, error: new Error('User ID is required') };
  }

  // Check browser support
  if (typeof window !== 'undefined' && !isPushSupported()) {
    return {
      data: {
        status: 'not_supported',
        subscription: null,
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
        subscription: null,
        permission,
      },
      error: null,
    };
  }

  // Check for active subscription
  const subscription = mockSubscriptions.get(userId);

  if (subscription && subscription.is_active) {
    return {
      data: {
        status: 'active',
        subscription,
        permission,
      },
      error: null,
    };
  }

  return {
    data: {
      status: 'inactive',
      subscription: null,
      permission,
    },
    error: null,
  };
}

/**
 * Send a push notification to a single user
 * Mock implementation - in production, use a push service (FCM, OneSignal, etc.)
 */
export async function sendPushNotification(
  userId: string,
  notification: NotificationPayload
): Promise<{ data: SendNotificationResult | null; error: Error | null }> {
  await simulateDelay(150);

  if (!userId) {
    return { data: null, error: new Error('User ID is required') };
  }

  if (!notification.title || !notification.body) {
    return { data: null, error: new Error('Notification title and body are required') };
  }

  // Check if user has active subscription
  const subscription = mockSubscriptions.get(userId);
  if (!subscription || !subscription.is_active) {
    return {
      data: {
        success: false,
        error: 'User does not have an active push subscription',
      },
      error: null,
    };
  }

  // In a real implementation, this would:
  // 1. Encrypt the notification payload
  // 2. Send to push service endpoint
  // 3. Handle delivery receipt

  // Mock successful send
  const messageId = generateMockId();

  console.log(`[Push Notification] Sent to user ${userId}:`, {
    title: notification.title,
    body: notification.body,
    url: notification.url,
    message_id: messageId,
  });

  return {
    data: {
      success: true,
      message_id: messageId,
    },
    error: null,
  };
}

/**
 * Send push notifications to multiple users
 * Mock implementation - in production, use batch sending for efficiency
 */
export async function sendBulkNotifications(
  userIds: string[],
  notification: NotificationPayload
): Promise<{ data: BulkNotificationResult | null; error: Error | null }> {
  await simulateDelay(50);

  if (!userIds || userIds.length === 0) {
    return { data: null, error: new Error('At least one user ID is required') };
  }

  if (!notification.title || !notification.body) {
    return { data: null, error: new Error('Notification title and body are required') };
  }

  const results: BulkNotificationResult['results'] = [];
  let successful = 0;
  let failed = 0;

  // Process each user (in production, this would be batched)
  for (const userId of userIds) {
    const { data, error } = await sendPushNotification(userId, notification);

    if (error || !data?.success) {
      failed++;
      results.push({
        user_id: userId,
        success: false,
        error: error?.message || data?.error || 'Unknown error',
      });
    } else {
      successful++;
      results.push({
        user_id: userId,
        success: true,
        message_id: data.message_id,
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
 * Mock implementation for testing/debugging
 */
export async function getAllActiveSubscriptions(): Promise<{
  data: PushSubscription[] | null;
  error: Error | null;
}> {
  await simulateDelay();

  const activeSubscriptions = Array.from(mockSubscriptions.values()).filter(
    sub => sub.is_active
  );

  return { data: activeSubscriptions, error: null };
}

/**
 * Send notification to all subscribed users (admin broadcast)
 * Mock implementation
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

  const userIds = subscriptions.map(sub => sub.user_id);
  return sendBulkNotifications(userIds, notification);
}

/**
 * Clear mock data (for testing purposes)
 */
export function clearMockSubscriptions(): void {
  mockSubscriptions.clear();
}
