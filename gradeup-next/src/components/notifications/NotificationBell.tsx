'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Settings,
  Inbox,
  Volume2,
  VolumeX,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NotificationBadge } from './NotificationBadge';
import { NotificationItem } from './NotificationItem';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/services/notifications';

// ========================================================================
// Types
// ========================================================================

export interface NotificationBellProps {
  /** Enable notification sounds */
  enableSound?: boolean;
  /** URL for notification sound */
  soundUrl?: string;
  /** Maximum notifications to display in dropdown */
  maxVisible?: number;
  /** Link to full notifications page */
  notificationsPageHref?: string;
  /** Link to notification settings */
  settingsHref?: string;
  /** Callback when settings is clicked */
  onSettingsClick?: () => void;
  /** Callback when a notification is clicked */
  onNotificationClick?: (notification: Notification) => void;
  /** Additional CSS classes for the bell button */
  className?: string;
  /** Callback when a new notification arrives */
  onNewNotification?: (notification: Notification) => void;
}

// ========================================================================
// Helper to transform notification for NotificationItem
// ========================================================================

function transformForItem(notification: Notification) {
  return {
    id: notification.id,
    type: notification.type as 'verification_approved' | 'verification_rejected' | 'verification_request' | 'deal_offer' | 'deal_accepted' | 'deal_completed' | 'new_follower' | 'system' | 'warning',
    title: notification.title,
    message: notification.message,
    timestamp: new Date(notification.created_at),
    read: notification.read,
    href: notification.url,
  };
}

// ========================================================================
// Component
// ========================================================================

/**
 * NotificationBell - Bell icon with real-time notifications dropdown
 *
 * Features:
 * - Bell icon with unread count badge
 * - Real-time notification updates via Supabase
 * - Optional notification sounds
 * - Dropdown with recent notifications
 * - Mark as read / Mark all as read
 * - Connection status indicator
 * - Keyboard accessible
 *
 * @example
 * // Basic usage
 * <NotificationBell />
 *
 * @example
 * // With sound and callbacks
 * <NotificationBell
 *   enableSound
 *   notificationsPageHref="/dashboard/notifications"
 *   onNotificationClick={(n) => router.push(n.url)}
 *   onNewNotification={(n) => toast.info(n.title)}
 * />
 */
export function NotificationBell({
  enableSound = false,
  soundUrl,
  maxVisible = 5,
  notificationsPageHref = '/dashboard/notifications',
  settingsHref,
  onSettingsClick,
  onNotificationClick,
  className,
  onNewNotification,
}: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(enableSound);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Use the real-time notifications hook
  const {
    notifications,
    unreadCount,
    loading,
    isConnected,
    error,
    isUsingMockData,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useRealtimeNotifications({
    enableSound: soundEnabled,
    soundUrl,
    onNewNotification,
  });

  // Transform notifications for display
  const visibleNotifications = useMemo(() => {
    return notifications.slice(0, maxVisible).map(transformForItem);
  }, [notifications, maxVisible]);

  const hasMore = notifications.length > maxVisible;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleNotificationClick = useCallback(
    (notification: { id: string; type: string; title: string; message: string; timestamp: Date; read: boolean; href?: string }) => {
      // Find original notification
      const originalNotification = notifications.find((n) => n.id === notification.id);

      if (originalNotification) {
        // Mark as read
        markAsRead(notification.id);

        // Call external handler
        if (onNotificationClick) {
          onNotificationClick(originalNotification);
        } else if (originalNotification.url) {
          // Navigate to notification URL
          router.push(originalNotification.url);
        }
      }

      setIsOpen(false);
    },
    [notifications, markAsRead, onNotificationClick, router]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsRead();
  }, [markAllAsRead]);

  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev);
  }, []);

  const handleSettingsClick = useCallback(() => {
    if (onSettingsClick) {
      onSettingsClick();
    } else if (settingsHref) {
      router.push(settingsHref);
    }
    setIsOpen(false);
  }, [onSettingsClick, settingsHref, router]);

  const handleViewAll = useCallback(() => {
    router.push(notificationsPageHref);
    setIsOpen(false);
  }, [router, notificationsPageHref]);

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          'hover:bg-[var(--bg-tertiary)] focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
          'focus-visible:ring-offset-[var(--bg-primary)]',
          isOpen && 'bg-[var(--bg-tertiary)]',
          className
        )}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5 text-[var(--text-secondary)]" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1">
            <NotificationBadge count={unreadCount} />
          </div>
        )}
        {/* Connection indicator */}
        {!isUsingMockData && (
          <span
            className={cn(
              'absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full border border-[var(--bg-primary)]',
              isConnected ? 'bg-[var(--color-success)]' : 'bg-[var(--color-warning)]'
            )}
            aria-hidden="true"
            title={isConnected ? 'Connected' : 'Reconnecting...'}
          />
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute right-0 top-full mt-2 w-[380px] z-50',
            'animate-in fade-in-0 zoom-in-95 slide-in-from-top-2',
            'duration-200'
          )}
          role="menu"
          aria-label="Notifications menu"
        >
          <Card className="overflow-hidden shadow-xl border-[var(--border-color)]">
            {/* Header */}
            <CardHeader className="pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="text-xs text-[var(--text-muted)] font-normal">
                      ({unreadCount} unread)
                    </span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-1">
                  {/* Refresh button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={loading}
                    className="h-8 w-8 p-0"
                    aria-label="Refresh notifications"
                  >
                    <RefreshCw
                      className={cn('h-4 w-4', loading && 'animate-spin')}
                    />
                  </Button>
                  {/* Sound toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSound}
                    className="h-8 w-8 p-0"
                    aria-label={soundEnabled ? 'Disable notification sounds' : 'Enable notification sounds'}
                  >
                    {soundEnabled ? (
                      <Volume2 className="h-4 w-4" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-[var(--text-muted)]" />
                    )}
                  </Button>
                  {/* Mark all as read */}
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAllAsRead}
                      className="h-8 px-2 text-xs gap-1"
                      aria-label="Mark all as read"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Mark all
                    </Button>
                  )}
                  {/* Settings */}
                  {(onSettingsClick || settingsHref) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSettingsClick}
                      className="h-8 w-8 p-0"
                      aria-label="Notification settings"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {/* Status indicators */}
              {(error || isUsingMockData) && (
                <div className="mt-2">
                  {error && (
                    <p className="text-xs text-[var(--color-error)]">
                      {error.message}
                    </p>
                  )}
                  {isUsingMockData && !error && (
                    <p className="text-xs text-[var(--text-muted)]">
                      Demo mode - showing sample notifications
                    </p>
                  )}
                </div>
              )}
            </CardHeader>

            {/* Content */}
            <CardContent className="p-0">
              {loading && notifications.length === 0 ? (
                /* Loading State */
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <RefreshCw className="h-6 w-6 text-[var(--text-muted)] animate-spin" />
                  <p className="text-sm text-[var(--text-muted)] mt-2">
                    Loading notifications...
                  </p>
                </div>
              ) : notifications.length === 0 ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="h-12 w-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                    <Inbox className="h-6 w-6 text-[var(--text-muted)]" />
                  </div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    All caught up!
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    No notifications to display
                  </p>
                </div>
              ) : (
                /* Notifications List */
                <div className="max-h-[400px] overflow-y-auto">
                  <div className="divide-y divide-[var(--border-color)]">
                    {visibleNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={(id) => markAsRead(id)}
                        onClick={handleNotificationClick}
                        className="rounded-none"
                      />
                    ))}
                  </div>

                  {/* View All Link */}
                  {hasMore && (
                    <div className="border-t border-[var(--border-color)] p-2">
                      <button
                        onClick={handleViewAll}
                        className={cn(
                          'flex items-center justify-center gap-2 w-full py-2 rounded-lg',
                          'text-sm text-[var(--color-primary)] font-medium',
                          'hover:bg-[var(--color-primary)]/5 transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2',
                          'focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
                          'focus-visible:ring-offset-[var(--bg-primary)]'
                        )}
                      >
                        View all notifications
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="text-xs text-[var(--text-muted)]">
                          ({notifications.length})
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
