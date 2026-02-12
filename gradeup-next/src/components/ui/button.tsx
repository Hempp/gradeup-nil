'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-semibold rounded-[var(--radius-md)]
      transition-all duration-[var(--transition-fast)]
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    const variants = {
      primary: `
        bg-[var(--color-primary)] text-[var(--text-inverse)]
        hover:bg-[var(--color-primary-hover)]
        active:scale-[0.98]
      `,
      secondary: `
        bg-[var(--color-secondary)] text-white
        hover:bg-[var(--color-secondary-hover)]
        active:scale-[0.98]
      `,
      outline: `
        border border-[var(--border-color)] bg-transparent text-[var(--text-primary)]
        hover:bg-[var(--bg-card)] hover:border-[var(--border-color-hover)]
        active:scale-[0.98]
      `,
      ghost: `
        bg-transparent text-[var(--text-secondary)]
        hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]
        active:scale-[0.98]
      `,
      danger: `
        bg-[var(--color-error)] text-white
        hover:bg-[#dc2626]
        active:scale-[0.98]
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
        {...props}
      >
        {isLoading && (
          <>
            <span className="sr-only">Loading</span>
            <svg
              className="animate-spin h-4 w-4"
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
