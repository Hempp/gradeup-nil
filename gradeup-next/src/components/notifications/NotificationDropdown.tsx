'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, Settings, Inbox } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NotificationBadge } from './NotificationBadge';
import { NotificationItem, type Notification } from './NotificationItem';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface NotificationDropdownProps {
  /** Array of notifications to display */
  notifications: Notification[];
  /** Callback when a notification is marked as read */
  onMarkAsRead?: (id: string) => void;
  /** Callback when all notifications are marked as read */
  onMarkAllAsRead?: () => void;
  /** Callback when a notification is clicked */
  onNotificationClick?: (notification: Notification) => void;
  /** Callback when settings is clicked */
  onSettingsClick?: () => void;
  /** Link to view all notifications */
  viewAllHref?: string;
  /** Additional CSS classes for the trigger button */
  className?: string;
  /** Maximum notifications to show in dropdown */
  maxVisible?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

/**
 * NotificationDropdown - Dropdown panel showing notifications
 *
 * Features:
 * - Bell icon with unread count badge
 * - List of recent notifications
 * - Mark individual or all as read
 * - Empty state when no notifications
 * - Keyboard accessible
 */
export function NotificationDropdown({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick,
  onSettingsClick,
  viewAllHref,
  className,
  maxVisible = 5,
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const visibleNotifications = notifications.slice(0, maxVisible);
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
    (notification: Notification) => {
      if (onNotificationClick) {
        onNotificationClick(notification);
      }
      setIsOpen(false);
    },
    [onNotificationClick]
  );

  const handleMarkAllAsRead = useCallback(() => {
    if (onMarkAllAsRead) {
      onMarkAllAsRead();
    }
  }, [onMarkAllAsRead]);

  return (
    <div className="relative">
      {/* Trigger Button */}
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
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAllAsRead}
                      className="h-8 px-2 text-xs gap-1"
                      aria-label="Mark all as read"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Mark all read
                    </Button>
                  )}
                  {onSettingsClick && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onSettingsClick}
                      className="h-8 w-8 p-0"
                      aria-label="Notification settings"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            {/* Content */}
            <CardContent className="p-0">
              {notifications.length === 0 ? (
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
                        onMarkAsRead={onMarkAsRead}
                        onClick={handleNotificationClick}
                        className="rounded-none"
                      />
                    ))}
                  </div>

                  {/* View All Link */}
                  {hasMore && viewAllHref && (
                    <div className="border-t border-[var(--border-color)] p-2">
                      <a
                        href={viewAllHref}
                        className={cn(
                          'flex items-center justify-center gap-2 w-full py-2 rounded-lg',
                          'text-sm text-[var(--color-primary)] font-medium',
                          'hover:bg-[var(--color-primary)]/5 transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2',
                          'focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
                          'focus-visible:ring-offset-[var(--bg-primary)]'
                        )}
                        onClick={() => setIsOpen(false)}
                      >
                        View all notifications
                        <span className="text-xs text-[var(--text-muted)]">
                          ({notifications.length})
                        </span>
                      </a>
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
