'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Props for the Button component
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual style variant of the button
   * - 'primary': Main CTA, uses primary brand color
   * - 'secondary': Secondary actions, uses secondary color
   * - 'outline': Bordered button with transparent background
   * - 'ghost': Minimal style, transparent until hovered
   * - 'danger': Destructive actions, uses error color
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  /**
   * Size of the button affecting height and padding
   * - 'sm': 32px height, compact
   * - 'md': 40px height, standard
   * - 'lg': 48px height, prominent
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Shows loading spinner and disables the button
   * Button remains the same size with spinner replacing content
   */
  isLoading?: boolean;
}

/**
 * A versatile button component with multiple variants and sizes
 *
 * Supports loading state, disabled state, and all standard button attributes.
 * Uses CSS custom properties for theming and includes accessibility features
 * like focus rings and aria-busy state.
 *
 * @example
 * // Primary action button
 * <Button onClick={handleSubmit}>Submit</Button>
 *
 * // Loading state
 * <Button isLoading disabled>Processing...</Button>
 *
 * // Different variants
 * <Button variant="outline" size="sm">Cancel</Button>
 * <Button variant="danger" onClick={handleDelete}>Delete</Button>
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-semibold rounded-[var(--radius-md)]
      transition-all duration-[var(--transition-fast)]
      motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    const variants = {
      primary: `
        btn-shine
        bg-[var(--color-primary)] text-[var(--text-inverse)]
        hover:bg-[var(--color-primary-hover)] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_var(--color-primary-glow)]
        active:scale-[0.98] active:translate-y-0
      `,
      secondary: `
        btn-shine
        bg-[var(--color-secondary)] text-white
        hover:bg-[var(--color-secondary-hover)] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(255,215,0,0.3)]
        active:scale-[0.98] active:translate-y-0
      `,
      outline: `
        border border-[var(--border-color)] bg-transparent text-[var(--text-primary)]
        hover:bg-[var(--bg-card)] hover:border-[var(--color-primary)] hover:-translate-y-0.5 hover:shadow-[0_0_20px_var(--color-primary-glow)]
        active:scale-[0.98] active:translate-y-0
      `,
      ghost: `
        bg-transparent text-[var(--text-secondary)]
        hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]
        active:scale-[0.98]
      `,
      danger: `
        btn-shine ripple-effect
        bg-[var(--color-error)] text-white
        hover:bg-[#dc2626] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(239,68,68,0.4)]
        active:scale-[0.98] active:translate-y-0
      `,
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading && (
          <>
            <span className="sr-only">Loading, please wait</span>
            <svg
              className="animate-spin motion-reduce:animate-none h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
