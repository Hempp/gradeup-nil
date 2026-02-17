'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

// ============================================================================
// Types
// ============================================================================

export type PushPermissionState = 'default' | 'granted' | 'denied';

export type PushSubscriptionState =
  | 'loading'
  | 'subscribed'
  | 'unsubscribed'
  | 'denied'
  | 'unsupported'
  | 'error';

export interface UsePushNotificationsOptions {
  /** Auto-request permission when the hook initializes */
  autoRequest?: boolean;
  /** Callback when subscription state changes */
  onSubscriptionChange?: (subscribed: boolean) => void;
  /** Callback when permission is denied */
  onPermissionDenied?: () => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
}

export interface UsePushNotificationsResult {
  /** Current subscription state */
  state: PushSubscriptionState;
  /** Whether push notifications are supported */
  isSupported: boolean;
  /** Whether the user is currently subscribed */
  isSubscribed: boolean;
  /** Current notification permission state */
  permission: PushPermissionState;
  /** Loading state for async operations */
  loading: boolean;
  /** Error if any operation failed */
  error: Error | null;
  /** Subscribe to push notifications */
  subscribe: () => Promise<{ success: boolean; error?: string }>;
  /** Unsubscribe from push notifications */
  unsubscribe: () => Promise<{ success: boolean; error?: string }>;
  /** Request notification permission without subscribing */
  requestPermission: () => Promise<NotificationPermission>;
  /** Check if service worker is registered */
  isServiceWorkerRegistered: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const SERVICE_WORKER_PATH = '/sw.js';

// ============================================================================
// Utilities
// ============================================================================

/**
 * Convert a base64 string to a Uint8Array for use with applicationServerKey
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Check if push notifications are supported in this browser
 */
function checkPushSupport(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook to manage browser push notification subscriptions
 *
 * Handles service worker registration, permission requests, and subscription
 * management. Syncs subscription state with the backend via API.
 *
 * @param options - Configuration options
 * @returns Object containing subscription state and control methods
 *
 * @example
 * function NotificationSettings() {
 *   const {
 *     isSubscribed,
 *     isSupported,
 *     permission,
 *     loading,
 *     subscribe,
 *     unsubscribe
 *   } = usePushNotifications({
 *     onSubscriptionChange: (subscribed) => {
 *       toast.success(subscribed ? 'Subscribed!' : 'Unsubscribed');
 *     }
 *   });
 *
 *   if (!isSupported) {
 *     return <p>Push notifications are not supported in your browser.</p>;
 *   }
 *
 *   if (permission === 'denied') {
 *     return <p>Notifications are blocked. Please enable them in your browser settings.</p>;
 *   }
 *
 *   return (
 *     <button onClick={isSubscribed ? unsubscribe : subscribe} disabled={loading}>
 *       {loading ? 'Loading...' : isSubscribed ? 'Disable Notifications' : 'Enable Notifications'}
 *     </button>
 *   );
 * }
 */
export function usePushNotifications(
  options: UsePushNotificationsOptions = {}
): UsePushNotificationsResult {
  const { autoRequest = false, onSubscriptionChange, onPermissionDenied, onError } = options;

  // State
  const [state, setState] = useState<PushSubscriptionState>('loading');
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<PushPermissionState>('default');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isServiceWorkerRegistered, setIsServiceWorkerRegistered] = useState(false);

  // Refs
  const mountedRef = useRef(true);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const userIdRef = useRef<string | null>(null);

  // Get current user
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      userIdRef.current = user?.id || null;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      userIdRef.current = session?.user?.id || null;
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Initialize push notification state
  useEffect(() => {
    mountedRef.current = true;

    async function init() {
      // Check browser support
      const supported = checkPushSupport();
      if (!mountedRef.current) return;

      setIsSupported(supported);

      if (!supported) {
        setState('unsupported');
        setLoading(false);
        return;
      }

      // Check current permission state
      const currentPermission = Notification.permission as PushPermissionState;
      setPermission(currentPermission);

      if (currentPermission === 'denied') {
        setState('denied');
        setLoading(false);
        onPermissionDenied?.();
        return;
      }

      // Register service worker
      try {
        const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH);
        await navigator.serviceWorker.ready;

        if (!mountedRef.current) return;

        swRegistrationRef.current = registration;
        setIsServiceWorkerRegistered(true);

        // Check existing subscription
        const subscription = await registration.pushManager.getSubscription();

        if (!mountedRef.current) return;

        if (subscription) {
          setIsSubscribed(true);
          setState('subscribed');
        } else {
          setIsSubscribed(false);
          setState('unsubscribed');
        }
      } catch (err) {
        if (!mountedRef.current) return;

        const error = err instanceof Error ? err : new Error('Failed to initialize push notifications');
        setError(error);
        setState('error');
        onError?.(error);
      }

      setLoading(false);
    }

    init();

    return () => {
      mountedRef.current = false;
    };
  }, [onPermissionDenied, onError]);

  // Auto-request permission if enabled
  useEffect(() => {
    if (autoRequest && isSupported && permission === 'default' && !loading) {
      requestPermission();
    }
  }, [autoRequest, isSupported, permission, loading]);

  /**
   * Request notification permission
   */
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();

      if (mountedRef.current) {
        setPermission(result as PushPermissionState);

        if (result === 'denied') {
          setState('denied');
          onPermissionDenied?.();
        }
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to request permission');
      if (mountedRef.current) {
        setError(error);
        onError?.(error);
      }
      return 'denied';
    }
  }, [isSupported, onPermissionDenied, onError]);

  /**
   * Subscribe to push notifications
   */
  const subscribe = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!isSupported) {
      return { success: false, error: 'Push notifications not supported' };
    }

    if (!VAPID_PUBLIC_KEY) {
      return { success: false, error: 'Push notifications not configured' };
    }

    if (!userIdRef.current) {
      return { success: false, error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      // Request permission if needed
      if (permission === 'default') {
        const result = await requestPermission();
        if (result !== 'granted') {
          setLoading(false);
          return { success: false, error: 'Permission denied' };
        }
      } else if (permission === 'denied') {
        setLoading(false);
        return { success: false, error: 'Notifications are blocked' };
      }

      // Get service worker registration
      let registration = swRegistrationRef.current;
      if (!registration) {
        registration = await navigator.serviceWorker.ready;
        swRegistrationRef.current = registration;
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Extract subscription data
      const subscriptionJSON = subscription.toJSON();
      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscriptionJSON.keys?.p256dh || '',
          auth: subscriptionJSON.keys?.auth || '',
        },
      };

      // Save to backend
      const response = await fetch('/api/notifications/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscriptionData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save subscription');
      }

      if (mountedRef.current) {
        setIsSubscribed(true);
        setState('subscribed');
        onSubscriptionChange?.(true);
      }

      setLoading(false);
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to subscribe');

      if (mountedRef.current) {
        setError(error);
        setState('error');
        onError?.(error);
      }

      setLoading(false);
      return { success: false, error: error.message };
    }
  }, [isSupported, permission, requestPermission, onSubscriptionChange, onError]);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!isSupported) {
      return { success: false, error: 'Push notifications not supported' };
    }

    if (!userIdRef.current) {
      return { success: false, error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      // Get service worker registration
      let registration = swRegistrationRef.current;
      if (!registration) {
        registration = await navigator.serviceWorker.ready;
        swRegistrationRef.current = registration;
      }

      // Get current subscription
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Remove from backend
        const response = await fetch('/api/notifications/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        if (!response.ok) {
          const data = await response.json();
          console.warn('Failed to remove subscription from server:', data.error);
          // Continue anyway since the local unsubscribe succeeded
        }
      }

      if (mountedRef.current) {
        setIsSubscribed(false);
        setState('unsubscribed');
        onSubscriptionChange?.(false);
      }

      setLoading(false);
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to unsubscribe');

      if (mountedRef.current) {
        setError(error);
        onError?.(error);
      }

      setLoading(false);
      return { success: false, error: error.message };
    }
  }, [isSupported, onSubscriptionChange, onError]);

  return {
    state,
    isSupported,
    isSubscribed,
    permission,
    loading,
    error,
    subscribe,
    unsubscribe,
    requestPermission,
    isServiceWorkerRegistered,
  };
}

export default usePushNotifications;
