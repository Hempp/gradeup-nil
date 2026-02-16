import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Props for the Badge component
 */
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Visual style variant of the badge
   * - 'default': Neutral gray badge
   * - 'primary': Primary brand color
   * - 'success': Green for positive states
   * - 'warning': Yellow/orange for attention
   * - 'error': Red for errors or negative states
   * - 'outline': Bordered with transparent background
   * @default 'default'
   */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'outline';
  /**
   * Size of the badge
   * - 'sm': 20px height, extra small text
   * - 'md': 24px height, small text
   * @default 'md'
   */
  size?: 'sm' | 'md';
}

/**
 * A small label component for displaying status, categories, or counts
 *
 * Commonly used for status indicators, tags, and notification counts.
 * Renders as an inline-flex pill-shaped element.
 *
 * @example
 * // Status badge
 * <Badge variant="success">Verified</Badge>
 *
 * // Error badge
 * <Badge variant="error" size="sm">Rejected</Badge>
 *
 * // Count badge
 * <Badge variant="primary">3 new</Badge>
 */
const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center font-medium rounded-full
      whitespace-nowrap
    `;

    const variants = {
      default: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)]',
      primary: 'bg-[var(--color-primary-muted)] text-[var(--color-primary)] border border-[var(--color-primary)]',
      success: 'bg-[var(--color-success-muted)] text-[var(--color-success)] border border-[var(--color-success)]',
      warning: 'bg-[var(--color-warning-muted)] text-[var(--color-warning)] border border-[var(--color-warning)]',
      error: 'bg-[var(--color-error-muted)] text-[var(--color-error)] border border-[var(--color-error)]',
      outline: 'bg-transparent text-[var(--text-secondary)] border border-[var(--border-color)]',
    };

    const sizes = {
      sm: 'h-5 px-2 text-xs',
      md: 'h-6 px-2.5 text-xs',
    };

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
