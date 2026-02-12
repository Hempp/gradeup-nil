import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import type { DealStatus } from '@/types';

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: DealStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<DealStatus, { label: string; className: string; dotColor: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-[var(--surface-100)] text-[var(--neutral-400)]',
    dotColor: 'bg-[var(--neutral-400)]',
  },
  pending: {
    label: 'Pending',
    className: 'bg-[var(--warning-100)] text-[var(--warning-600)]',
    dotColor: 'bg-[var(--warning-600)]',
  },
  negotiating: {
    label: 'Negotiating',
    className: 'bg-[var(--secondary-100)] text-[var(--secondary-700)]',
    dotColor: 'bg-[var(--color-gold)]',
  },
  accepted: {
    label: 'Accepted',
    className: 'bg-[var(--success-100)] text-[var(--success-600)]',
    dotColor: 'bg-[var(--success-600)]',
  },
  active: {
    label: 'Active',
    className: 'bg-[var(--success-100)] text-[var(--success-600)]',
    dotColor: 'bg-[var(--success-600)]',
  },
  completed: {
    label: 'Completed',
    className: 'bg-[var(--info-100)] text-[var(--info-600)]',
    dotColor: 'bg-[var(--info-600)]',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-[var(--surface-100)] text-[var(--neutral-400)]',
    dotColor: 'bg-[var(--neutral-400)]',
  },
  expired: {
    label: 'Expired',
    className: 'bg-[var(--surface-100)] text-[var(--neutral-400)]',
    dotColor: 'bg-[var(--neutral-400)]',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-[var(--error-100)] text-[var(--error-600)]',
    dotColor: 'bg-[var(--error-600)]',
  },
};

const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, size = 'md', className, ...props }, ref) => {
    const config = statusConfig[status];

    const sizes = {
      sm: 'px-2.5 py-0.5 text-xs',
      md: 'px-3 py-1 text-xs',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap',
          config.className,
          sizes[size],
          className
        )}
        {...props}
      >
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            config.dotColor
          )}
          aria-hidden="true"
        />
        {config.label}
      </span>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

export { StatusBadge };
