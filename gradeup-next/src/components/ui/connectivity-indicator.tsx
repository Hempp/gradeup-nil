'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useServiceWorker } from '@/components/providers/service-worker-provider';
import { Wifi, WifiOff, RefreshCw, X } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   CONNECTIVITY INDICATOR
   Shows network status with graceful offline handling
   ═══════════════════════════════════════════════════════════════════════════ */

export type ConnectionQuality = 'good' | 'slow' | 'offline';

interface ConnectivityIndicatorProps {
  /** Position on screen */
  position?: 'top' | 'bottom' | 'topbar';
  /** Show indicator even when online (default: false - only shows when offline/slow) */
  alwaysShow?: boolean;
  /** Auto-hide after coming back online (ms, default: 3000) */
  autoHideDelay?: number;
  /** Show last synced timestamp */
  showLastSynced?: boolean;
  /** Last sync timestamp */
  lastSyncedAt?: Date | null;
  /** Callback when retry is clicked */
  onRetry?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Network connectivity indicator with offline awareness.
 *
 * Features:
 * - Shows online/offline/slow network status
 * - Auto-dismisses when back online
 * - Optional "Last synced" timestamp
 * - Retry button for manual reconnection attempts
 * - Graceful degradation messaging
 *
 * @example
 * // In topbar
 * <ConnectivityIndicator position="topbar" showLastSynced lastSyncedAt={lastSync} />
 *
 * @example
 * // Floating banner
 * <ConnectivityIndicator position="bottom" autoHideDelay={5000} onRetry={refetchData} />
 */
export function ConnectivityIndicator({
  position = 'bottom',
  alwaysShow = false,
  autoHideDelay = 3000,
  showLastSynced = false,
  lastSyncedAt,
  onRetry,
  className,
}: ConnectivityIndicatorProps) {
  const { isOnline } = useServiceWorker();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('good');
  const [isRetrying, setIsRetrying] = useState(false);
  const previousOnlineRef = useRef(isOnline);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Detect connection quality using Network Information API
  useEffect(() => {
    const updateConnectionQuality = () => {
      if (!isOnline) {
        setConnectionQuality('offline');
        return;
      }

      // Use Network Information API if available
      const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
      if (connection) {
        const effectiveType = connection.effectiveType;
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          setConnectionQuality('slow');
        } else {
          setConnectionQuality('good');
        }
      } else {
        setConnectionQuality('good');
      }
    };

    updateConnectionQuality();

    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    if (connection) {
      connection.addEventListener('change', updateConnectionQuality);
      return () => connection.removeEventListener('change', updateConnectionQuality);
    }
  }, [isOnline]);

  // Handle visibility based on online status
  useEffect(() => {
    // Went offline
    if (!isOnline && previousOnlineRef.current) {
      setIsVisible(true);
      setIsDismissed(false);
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    }

    // Came back online
    if (isOnline && !previousOnlineRef.current) {
      // Show "back online" briefly, then auto-hide
      setIsVisible(true);
      setIsDismissed(false);

      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);
    }

    previousOnlineRef.current = isOnline;

    return () => {
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    };
  }, [isOnline, autoHideDelay]);

  // Handle retry
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      await onRetry?.();
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry]);

  // Dismiss handler
  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    setIsVisible(false);
  }, []);

  // Format last synced time
  const formatLastSynced = (date: Date | null | undefined): string => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  // Determine what to show
  const shouldShow = alwaysShow || (isVisible && !isDismissed);
  if (!shouldShow && connectionQuality !== 'offline') return null;

  // Topbar compact variant
  if (position === 'topbar') {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300',
          connectionQuality === 'offline' && 'bg-red-500/20 text-red-400',
          connectionQuality === 'slow' && 'bg-yellow-500/20 text-yellow-400',
          connectionQuality === 'good' && 'bg-green-500/20 text-green-400',
          className
        )}
        role="status"
        aria-live="polite"
      >
        {connectionQuality === 'offline' ? (
          <>
            <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Offline</span>
          </>
        ) : connectionQuality === 'slow' ? (
          <>
            <Wifi className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
            <span>Slow</span>
          </>
        ) : (
          <>
            <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Online</span>
          </>
        )}
      </div>
    );
  }

  // Banner variant (top or bottom)
  const positionClasses = position === 'top'
    ? 'top-0 left-0 right-0'
    : 'bottom-0 left-0 right-0';

  return (
    <div
      className={cn(
        'fixed z-50 px-4 py-3 transition-all duration-300',
        positionClasses,
        connectionQuality === 'offline' && 'bg-red-500 text-white',
        connectionQuality === 'slow' && 'bg-yellow-500 text-black',
        connectionQuality === 'good' && isVisible && 'bg-green-500 text-white',
        !isVisible && 'translate-y-full opacity-0 pointer-events-none',
        position === 'top' && !isVisible && '-translate-y-full',
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          {connectionQuality === 'offline' ? (
            <WifiOff className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          ) : connectionQuality === 'slow' ? (
            <Wifi className="h-5 w-5 flex-shrink-0 animate-pulse" aria-hidden="true" />
          ) : (
            <Wifi className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          )}

          <div>
            <p className="font-medium">
              {connectionQuality === 'offline'
                ? "You're offline"
                : connectionQuality === 'slow'
                ? 'Slow connection detected'
                : 'Back online!'}
            </p>
            <p className="text-sm opacity-90">
              {connectionQuality === 'offline'
                ? 'Changes will sync when you reconnect'
                : connectionQuality === 'slow'
                ? 'Some features may load slowly'
                : 'All changes have been synced'}
            </p>
            {showLastSynced && connectionQuality === 'offline' && (
              <p className="text-xs opacity-75 mt-1">
                Last synced: {formatLastSynced(lastSyncedAt)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRetry && connectionQuality === 'offline' && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium',
                'bg-white/20 hover:bg-white/30 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-white/50',
                isRetrying && 'opacity-50 cursor-not-allowed'
              )}
            >
              <RefreshCw
                className={cn('h-4 w-4', isRetrying && 'animate-spin')}
                aria-hidden="true"
              />
              {isRetrying ? 'Retrying...' : 'Retry'}
            </button>
          )}

          {connectionQuality !== 'offline' && (
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-md hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   USE CONNECTIVITY HOOK
   Standalone hook for connectivity-aware features
   ═══════════════════════════════════════════════════════════════════════════ */

interface UseConnectivityOptions {
  /** Callback when going offline */
  onOffline?: () => void;
  /** Callback when coming back online */
  onOnline?: () => void;
  /** Callback when connection quality changes */
  onQualityChange?: (quality: ConnectionQuality) => void;
}

interface UseConnectivityResult {
  isOnline: boolean;
  connectionQuality: ConnectionQuality;
  /** Execute action with offline fallback */
  withOfflineFallback: <T>(
    onlineAction: () => Promise<T>,
    offlineFallback: () => T | Promise<T>
  ) => Promise<T>;
}

/**
 * Hook for connectivity-aware features.
 *
 * @example
 * const { isOnline, connectionQuality, withOfflineFallback } = useConnectivity({
 *   onOffline: () => showToast('Working offline'),
 *   onOnline: () => syncPendingChanges(),
 * });
 *
 * // Use fallback when offline
 * const data = await withOfflineFallback(
 *   () => fetchFromAPI(),
 *   () => getFromCache()
 * );
 */
export function useConnectivity(options: UseConnectivityOptions = {}): UseConnectivityResult {
  const { onOffline, onOnline, onQualityChange } = options;
  const { isOnline } = useServiceWorker();
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('good');
  const previousOnlineRef = useRef(isOnline);
  const previousQualityRef = useRef(connectionQuality);

  // Track online/offline changes
  useEffect(() => {
    if (!isOnline && previousOnlineRef.current) {
      onOffline?.();
    }
    if (isOnline && !previousOnlineRef.current) {
      onOnline?.();
    }
    previousOnlineRef.current = isOnline;
  }, [isOnline, onOffline, onOnline]);

  // Detect connection quality
  useEffect(() => {
    const updateQuality = () => {
      if (!isOnline) {
        setConnectionQuality('offline');
        return;
      }

      const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
      if (connection) {
        const effectiveType = connection.effectiveType;
        const quality: ConnectionQuality =
          effectiveType === 'slow-2g' || effectiveType === '2g' ? 'slow' : 'good';
        setConnectionQuality(quality);
      } else {
        setConnectionQuality('good');
      }
    };

    updateQuality();

    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    if (connection) {
      connection.addEventListener('change', updateQuality);
      return () => connection.removeEventListener('change', updateQuality);
    }
  }, [isOnline]);

  // Track quality changes
  useEffect(() => {
    if (connectionQuality !== previousQualityRef.current) {
      onQualityChange?.(connectionQuality);
      previousQualityRef.current = connectionQuality;
    }
  }, [connectionQuality, onQualityChange]);

  // Offline fallback helper
  const withOfflineFallback = useCallback(
    async <T,>(
      onlineAction: () => Promise<T>,
      offlineFallback: () => T | Promise<T>
    ): Promise<T> => {
      if (!isOnline) {
        return offlineFallback();
      }
      try {
        return await onlineAction();
      } catch (error) {
        // If online action fails (possibly due to network issue), try fallback
        console.warn('Online action failed, using fallback:', error);
        return offlineFallback();
      }
    },
    [isOnline]
  );

  return {
    isOnline,
    connectionQuality,
    withOfflineFallback,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   TYPE DEFINITIONS
   ═══════════════════════════════════════════════════════════════════════════ */

// Network Information API types (not in standard TypeScript libs)
interface NetworkInformation extends EventTarget {
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  downlink: number;
  rtt: number;
  saveData: boolean;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}
