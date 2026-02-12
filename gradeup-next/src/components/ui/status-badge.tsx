import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import type { DealStatus } from '@/types';

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: DealStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<DealStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-color)]',
  },
  pending: {
    label: 'Pending',
    className: 'status-pending',
  },
  negotiating: {
    label: 'Negotiating',
    className: 'status-negotiating',
  },
  accepted: {
    label: 'Accepted',
    className: 'status-active',
  },
  active: {
    label: 'Active',
    className: 'status-active',
  },
  completed: {
    label: 'Completed',
    className: 'status-completed',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-color)]',
  },
  expired: {
    label: 'Expired',
    className: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-color)]',
  },
  rejected: {
    label: 'Rejected',
    className: 'status-rejected',
  },
};

const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, size = 'md', className, ...props }, ref) => {
    const config = statusConfig[status];

    const sizes = {
      sm: 'h-5 px-2 text-xs',
      md: 'h-6 px-2.5 text-xs',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-full whitespace-nowrap border',
          config.className,
          sizes[size],
          className
        )}
        {...props}
      >
        {config.label}
      </span>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

export { StatusBadge };
