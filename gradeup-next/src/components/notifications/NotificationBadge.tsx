'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface NotificationBadgeProps {
  /** Number of unread notifications */
  count: number;
  /** Additional CSS classes */
  className?: string;
  /** Maximum count to display before showing "99+" */
  maxCount?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

/**
 * NotificationBadge - A simple badge showing unread notification count
 *
 * Displays a red dot when count > 0, with the number inside.
 * Shows "99+" when count exceeds maxCount.
 */
export function NotificationBadge({
  count,
  className,
  maxCount = 99,
}: NotificationBadgeProps) {
  if (count <= 0) {
    return null;
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  return (
    <Badge
      variant="error"
      size="sm"
      className={cn(
        'min-w-[20px] h-5 px-1.5 text-[10px] font-bold',
        'bg-[var(--color-error)] text-white border-none',
        'shadow-[0_0_8px_var(--color-error-muted)]',
        className
      )}
      aria-label={`${count} unread notification${count !== 1 ? 's' : ''}`}
    >
      {displayCount}
    </Badge>
  );
}
