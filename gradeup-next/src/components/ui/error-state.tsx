'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import {
  LucideIcon,
  AlertTriangle,
  RefreshCw,
  ServerCrash,
  WifiOff,
  ShieldX,
  DatabaseZap,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   ERROR STATE TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export type ErrorType = 'generic' | 'network' | 'server' | 'permission' | 'data';

export interface ErrorStateProps extends HTMLAttributes<HTMLDivElement> {
  /** Custom icon to display */
  icon?: LucideIcon;
  /** Error title */
  title?: string;
  /** Error description/message */
  description?: string;
  /** Type of error - affects default icon and styling */
  errorType?: ErrorType;
  /** Retry action callback */
  onRetry?: () => void;
  /** Custom retry button text */
  retryLabel?: string;
  /** Additional action */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Whether retry is in progress */
  isRetrying?: boolean;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DEFAULT ERROR CONFIGURATIONS
   ═══════════════════════════════════════════════════════════════════════════ */

const errorTypeConfig: Record<
  ErrorType,
  { icon: LucideIcon; title: string; description: string; color: string }
> = {
  generic: {
    icon: AlertTriangle,
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again.',
    color: 'text-[var(--color-error)]',
  },
  network: {
    icon: WifiOff,
    title: 'Connection error',
    description:
      'Unable to connect to the server. Please check your internet connection and try again.',
    color: 'text-[var(--color-warning)]',
  },
  server: {
    icon: ServerCrash,
    title: 'Server error',
    description:
      'Our servers are having trouble right now. Please try again in a few moments.',
    color: 'text-[var(--color-error)]',
  },
  permission: {
    icon: ShieldX,
    title: 'Access denied',
    description: 'You do not have permission to access this resource.',
    color: 'text-[var(--color-error)]',
  },
  data: {
    icon: DatabaseZap,
    title: 'Failed to load data',
    description:
      'We could not load the requested data. Please try again.',
    color: 'text-[var(--color-warning)]',
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   BASE ERROR STATE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

const ErrorState = forwardRef<HTMLDivElement, ErrorStateProps>(
  (
    {
      className,
      icon,
      title,
      description,
      errorType = 'generic',
      onRetry,
      retryLabel = 'Try again',
      action,
      isRetrying = false,
      ...props
    },
    ref
  ) => {
    const config = errorTypeConfig[errorType];
    const Icon = icon || config.icon;
    const displayTitle = title || config.title;
    const displayDescription = description || config.description;

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center py-12 px-4 sm:py-16',
          className
        )}
        role="alert"
        aria-live="assertive"
        {...props}
      >
        {/* Icon */}
        <div className="mb-4 rounded-full bg-[var(--color-error)]/10 p-4">
          <Icon
            className={cn('h-10 w-10 sm:h-12 sm:w-12', config.color)}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2 text-center">
          {displayTitle}
        </h3>

        {/* Description */}
        <p className="text-sm text-[var(--text-secondary)] max-w-sm text-center mb-6">
          {displayDescription}
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {onRetry && (
            <Button
              variant="primary"
              onClick={onRetry}
              disabled={isRetrying}
              className="gap-2"
            >
              <RefreshCw
                className={cn('h-4 w-4', isRetrying && 'animate-spin')}
                aria-hidden="true"
              />
              {isRetrying ? 'Retrying...' : retryLabel}
            </Button>
          )}
          {action && (
            <Button variant="outline" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      </div>
    );
  }
);

ErrorState.displayName = 'ErrorState';

/* ═══════════════════════════════════════════════════════════════════════════
   PRE-BUILT ERROR STATES FOR COMMON SCENARIOS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Error state for network/connection errors
 */
export function NetworkError({ onRetry, isRetrying }: { onRetry?: () => void; isRetrying?: boolean }) {
  return (
    <ErrorState
      errorType="network"
      onRetry={onRetry}
      isRetrying={isRetrying}
    />
  );
}

/**
 * Error state for server errors
 */
export function ServerError({ onRetry, isRetrying }: { onRetry?: () => void; isRetrying?: boolean }) {
  return (
    <ErrorState
      errorType="server"
      onRetry={onRetry}
      isRetrying={isRetrying}
    />
  );
}

/**
 * Error state for data loading errors
 */
export function DataLoadError({
  onRetry,
  isRetrying,
  resourceName,
}: {
  onRetry?: () => void;
  isRetrying?: boolean;
  resourceName?: string;
}) {
  return (
    <ErrorState
      errorType="data"
      description={
        resourceName
          ? `We could not load your ${resourceName}. Please try again.`
          : undefined
      }
      onRetry={onRetry}
      isRetrying={isRetrying}
    />
  );
}

/**
 * Error state for permission/access denied errors
 */
export function PermissionError({
  action,
}: {
  action?: { label: string; onClick: () => void };
}) {
  return <ErrorState errorType="permission" action={action} />;
}

/**
 * Generic error state with custom message
 */
export function GenericError({
  title,
  description,
  onRetry,
  isRetrying,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}) {
  return (
    <ErrorState
      errorType="generic"
      title={title}
      description={description}
      onRetry={onRetry}
      isRetrying={isRetrying}
    />
  );
}

export { ErrorState };
