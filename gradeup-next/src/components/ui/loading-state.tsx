import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════════════════════
   LOADING STATE COMPONENT
   A simple, reusable loading indicator with customizable message.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface LoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  /** Loading message to display */
  message?: string;
  /** Size of the spinner */
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: {
    spinner: 'h-6 w-6',
    text: 'text-sm',
    container: 'min-h-[200px]',
  },
  md: {
    spinner: 'h-8 w-8',
    text: 'text-base',
    container: 'min-h-[400px]',
  },
  lg: {
    spinner: 'h-12 w-12',
    text: 'text-lg',
    container: 'min-h-[500px]',
  },
};

const LoadingState = forwardRef<HTMLDivElement, LoadingStateProps>(
  ({ className, message = 'Loading...', size = 'md', ...props }, ref) => {
    const sizes = sizeClasses[size];

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center',
          sizes.container,
          className
        )}
        role="status"
        aria-live="polite"
        aria-busy="true"
        {...props}
      >
        <div className="text-center">
          <div
            className={cn(
              'animate-spin rounded-full border-b-2 border-[var(--color-primary)] mx-auto mb-4',
              sizes.spinner
            )}
            aria-hidden="true"
          />
          <p className={cn('text-[var(--text-muted)]', sizes.text)}>
            {message}
          </p>
        </div>
      </div>
    );
  }
);

LoadingState.displayName = 'LoadingState';

export { LoadingState };
