'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

/* ═══════════════════════════════════════════════════════════════════════════
   EMPTY STATE TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DEFAULT ICON
   ═══════════════════════════════════════════════════════════════════════════ */

const DefaultIcon = () => (
  <svg
    className="h-16 w-16"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
    />
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════════════
   EMPTY STATE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      className,
      icon,
      title,
      description,
      actionLabel,
      onAction,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center py-16 px-4',
          className
        )}
        {...props}
      >
        {/* Icon */}
        <div className="text-[var(--text-muted)] mb-4">
          {icon || <DefaultIcon />}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2 text-center">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-sm text-[var(--text-secondary)] max-w-sm text-center mb-6">
            {description}
          </p>
        )}

        {/* Action button */}
        {actionLabel && onAction && (
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';

export { EmptyState };
