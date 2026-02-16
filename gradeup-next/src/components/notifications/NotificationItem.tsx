'use client';

import { forwardRef } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Bell,
  Trophy,
  DollarSign,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type NotificationType =
  | 'verification_approved'
  | 'verification_rejected'
  | 'verification_request'
  | 'deal_offer'
  | 'deal_accepted'
  | 'deal_completed'
  | 'new_follower'
  | 'system'
  | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  href?: string;
  avatar?: string;
  avatarFallback?: string;
}

export interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onClick?: (notification: Notification) => void;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

function getNotificationIcon(type: NotificationType) {
  const iconClass = 'h-4 w-4';

  const icons: Record<NotificationType, React.ReactNode> = {
    verification_approved: <CheckCircle2 className={cn(iconClass, 'text-[var(--color-success)]')} />,
    verification_rejected: <XCircle className={cn(iconClass, 'text-[var(--color-error)]')} />,
    verification_request: <Clock className={cn(iconClass, 'text-[var(--color-warning)]')} />,
    deal_offer: <DollarSign className={cn(iconClass, 'text-[var(--color-primary)]')} />,
    deal_accepted: <Trophy className={cn(iconClass, 'text-[var(--color-success)]')} />,
    deal_completed: <CheckCircle2 className={cn(iconClass, 'text-[var(--color-success)]')} />,
    new_follower: <UserPlus className={cn(iconClass, 'text-[var(--color-primary)]')} />,
    system: <Bell className={cn(iconClass, 'text-[var(--text-muted)]')} />,
    warning: <AlertTriangle className={cn(iconClass, 'text-[var(--color-warning)]')} />,
  };

  return icons[type] || <Bell className={cn(iconClass, 'text-[var(--text-muted)]')} />;
}

function getIconBackgroundColor(type: NotificationType): string {
  const colors: Record<NotificationType, string> = {
    verification_approved: 'bg-[var(--color-success)]/10',
    verification_rejected: 'bg-[var(--color-error)]/10',
    verification_request: 'bg-[var(--color-warning)]/10',
    deal_offer: 'bg-[var(--color-primary)]/10',
    deal_accepted: 'bg-[var(--color-success)]/10',
    deal_completed: 'bg-[var(--color-success)]/10',
    new_follower: 'bg-[var(--color-primary)]/10',
    system: 'bg-[var(--bg-tertiary)]',
    warning: 'bg-[var(--color-warning)]/10',
  };

  return colors[type] || 'bg-[var(--bg-tertiary)]';
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

/**
 * NotificationItem - Individual notification row
 *
 * Displays notification with icon, title, message, timestamp
 * and visual distinction for read/unread states.
 */
export const NotificationItem = forwardRef<HTMLDivElement, NotificationItemProps>(
  ({ notification, onMarkAsRead, onClick, className }, ref) => {
    const { id, type, title, message, timestamp, read, avatar, avatarFallback } = notification;

    const timeAgo = formatDistanceToNow(new Date(timestamp), { addSuffix: true });

    const handleClick = () => {
      if (!read && onMarkAsRead) {
        onMarkAsRead(id);
      }
      if (onClick) {
        onClick(notification);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    };

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]',
          read
            ? 'bg-transparent hover:bg-[var(--bg-tertiary)]/50'
            : 'bg-[var(--color-primary)]/5 hover:bg-[var(--color-primary)]/10',
          className
        )}
        aria-label={`${read ? 'Read' : 'Unread'} notification: ${title}`}
      >
        {/* Unread Indicator */}
        {!read && (
          <div
            className="absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-[var(--color-primary)]"
            aria-hidden="true"
          />
        )}

        {/* Icon or Avatar */}
        {avatar ? (
          <Avatar
            src={avatar}
            fallback={avatarFallback}
            size="sm"
            className="flex-shrink-0"
          />
        ) : (
          <div
            className={cn(
              'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center',
              getIconBackgroundColor(type)
            )}
          >
            {getNotificationIcon(type)}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                'text-sm truncate',
                read
                  ? 'font-normal text-[var(--text-secondary)]'
                  : 'font-medium text-[var(--text-primary)]'
              )}
            >
              {title}
            </p>
            <span className="text-xs text-[var(--text-muted)] whitespace-nowrap flex-shrink-0">
              {timeAgo}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">
            {message}
          </p>
        </div>
      </div>
    );
  }
);

NotificationItem.displayName = 'NotificationItem';
