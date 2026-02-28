'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
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
  Clock,
  FileX,
  CreditCard,
  Upload,
  Search,
  UserX,
  Ban,
  HelpCircle,
} from 'lucide-react';
import { parseErrorToUserFriendly } from '@/lib/utils/error-messages';

/* ═══════════════════════════════════════════════════════════════════════════
   ERROR STATE TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export type ErrorType =
  | 'generic'
  | 'network'
  | 'server'
  | 'permission'
  | 'data'
  | 'timeout'
  | 'notFound'
  | 'payment'
  | 'upload'
  | 'search'
  | 'auth'
  | 'blocked';

export interface ErrorStateProps extends HTMLAttributes<HTMLDivElement> {
  /** Custom icon to display */
  icon?: LucideIcon;
  /** Error title */
  title?: string;
  /** Error description/message */
  description?: string;
  /** Actionable hint for the user */
  hint?: string;
  /** Type of error - affects default icon and styling */
  errorType?: ErrorType;
  /** Retry action callback */
  onRetry?: () => void;
  /** Custom retry button text */
  retryLabel?: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Whether retry is in progress */
  isRetrying?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show help link */
  showHelp?: boolean;
  /** Custom help link */
  helpLink?: string;
  /** Custom illustration (replaces icon) */
  illustration?: ReactNode;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DEFAULT ERROR CONFIGURATIONS
   ═══════════════════════════════════════════════════════════════════════════ */

interface ErrorTypeConfigItem {
  icon: LucideIcon;
  title: string;
  description: string;
  hint: string;
  color: string;
  bgColor: string;
}

const errorTypeConfig: Record<ErrorType, ErrorTypeConfigItem> = {
  generic: {
    icon: AlertTriangle,
    title: 'Something went wrong',
    description: 'An unexpected error occurred.',
    hint: 'Please try again. If the problem persists, contact support.',
    color: 'text-[var(--color-error)]',
    bgColor: 'bg-[var(--color-error)]/10',
  },
  network: {
    icon: WifiOff,
    title: 'Connection error',
    description: 'Unable to connect to the server.',
    hint: 'Check your internet connection and try again.',
    color: 'text-[var(--color-warning)]',
    bgColor: 'bg-[var(--color-warning)]/10',
  },
  server: {
    icon: ServerCrash,
    title: 'Server error',
    description: 'Our servers are having trouble right now.',
    hint: 'Please try again in a few moments. We are working on a fix.',
    color: 'text-[var(--color-error)]',
    bgColor: 'bg-[var(--color-error)]/10',
  },
  permission: {
    icon: ShieldX,
    title: 'Access denied',
    description: 'You do not have permission to access this resource.',
    hint: 'Contact your administrator if you believe this is an error.',
    color: 'text-[var(--color-error)]',
    bgColor: 'bg-[var(--color-error)]/10',
  },
  data: {
    icon: DatabaseZap,
    title: 'Failed to load data',
    description: 'We could not load the requested data.',
    hint: 'Refresh the page or try again later.',
    color: 'text-[var(--color-warning)]',
    bgColor: 'bg-[var(--color-warning)]/10',
  },
  timeout: {
    icon: Clock,
    title: 'Request timed out',
    description: 'The server took too long to respond.',
    hint: 'Check your connection and try again.',
    color: 'text-[var(--color-warning)]',
    bgColor: 'bg-[var(--color-warning)]/10',
  },
  notFound: {
    icon: FileX,
    title: 'Not found',
    description: 'The item you are looking for does not exist or has been removed.',
    hint: 'Check the URL or go back to the previous page.',
    color: 'text-[var(--text-muted)]',
    bgColor: 'bg-[var(--bg-tertiary)]',
  },
  payment: {
    icon: CreditCard,
    title: 'Payment error',
    description: 'There was a problem processing your payment.',
    hint: 'Check your payment details and try again.',
    color: 'text-[var(--color-error)]',
    bgColor: 'bg-[var(--color-error)]/10',
  },
  upload: {
    icon: Upload,
    title: 'Upload failed',
    description: 'We could not upload your file.',
    hint: 'Check your file size and format, then try again.',
    color: 'text-[var(--color-error)]',
    bgColor: 'bg-[var(--color-error)]/10',
  },
  search: {
    icon: Search,
    title: 'Search error',
    description: 'We could not complete your search.',
    hint: 'Try a different search term or check your filters.',
    color: 'text-[var(--text-muted)]',
    bgColor: 'bg-[var(--bg-tertiary)]',
  },
  auth: {
    icon: UserX,
    title: 'Authentication error',
    description: 'There was a problem with your login.',
    hint: 'Please sign in again to continue.',
    color: 'text-[var(--color-error)]',
    bgColor: 'bg-[var(--color-error)]/10',
  },
  blocked: {
    icon: Ban,
    title: 'Action blocked',
    description: 'This action is currently unavailable.',
    hint: 'Please try again later or contact support.',
    color: 'text-[var(--color-error)]',
    bgColor: 'bg-[var(--color-error)]/10',
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   SIZE CONFIGURATIONS
   ═══════════════════════════════════════════════════════════════════════════ */

const sizeConfig = {
  sm: {
    padding: 'py-8 px-4',
    iconSize: 'h-8 w-8',
    iconContainer: 'p-3',
    title: 'text-base font-semibold',
    description: 'text-sm',
    hint: 'text-xs',
    gap: 'mb-3',
  },
  md: {
    padding: 'py-12 px-4 sm:py-16',
    iconSize: 'h-10 w-10 sm:h-12 sm:w-12',
    iconContainer: 'p-4',
    title: 'text-lg font-semibold',
    description: 'text-sm',
    hint: 'text-sm',
    gap: 'mb-4',
  },
  lg: {
    padding: 'py-16 px-4 sm:py-24',
    iconSize: 'h-12 w-12 sm:h-16 sm:w-16',
    iconContainer: 'p-5',
    title: 'text-xl sm:text-2xl font-bold',
    description: 'text-base',
    hint: 'text-sm',
    gap: 'mb-6',
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
      hint,
      errorType = 'generic',
      onRetry,
      retryLabel = 'Try again',
      action,
      secondaryAction,
      isRetrying = false,
      size = 'md',
      showHelp = false,
      helpLink = '/help',
      illustration,
      ...props
    },
    ref
  ) => {
    const typeConfig = errorTypeConfig[errorType];
    const sizeStyles = sizeConfig[size];
    const Icon = icon || typeConfig.icon;
    const displayTitle = title || typeConfig.title;
    const displayDescription = description || typeConfig.description;
    const displayHint = hint || typeConfig.hint;

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center',
          sizeStyles.padding,
          className
        )}
        role="alert"
        aria-live="assertive"
        {...props}
      >
        {/* Illustration or Icon */}
        {illustration ? (
          <div className={sizeStyles.gap}>{illustration}</div>
        ) : (
          <div className={cn('rounded-full', sizeStyles.iconContainer, typeConfig.bgColor, sizeStyles.gap)}>
            <Icon
              className={cn(sizeStyles.iconSize, typeConfig.color)}
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </div>
        )}

        {/* Title */}
        <h3 className={cn(sizeStyles.title, 'text-[var(--text-primary)] mb-2 text-center')}>
          {displayTitle}
        </h3>

        {/* Description */}
        <p className={cn(sizeStyles.description, 'text-[var(--text-secondary)] max-w-sm text-center mb-2')}>
          {displayDescription}
        </p>

        {/* Hint/Suggestion */}
        {displayHint && (
          <p className={cn(sizeStyles.hint, 'text-[var(--text-muted)] max-w-sm text-center mb-6')}>
            {displayHint}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {onRetry && (
            <Button
              variant="primary"
              onClick={onRetry}
              disabled={isRetrying}
              className="gap-2"
              size={size === 'sm' ? 'sm' : 'md'}
            >
              <RefreshCw
                className={cn('h-4 w-4', isRetrying && 'animate-spin')}
                aria-hidden="true"
              />
              {isRetrying ? 'Retrying...' : retryLabel}
            </Button>
          )}
          {action && (
            <Button
              variant={onRetry ? 'outline' : 'primary'}
              onClick={action.onClick}
              className="gap-2"
              size={size === 'sm' ? 'sm' : 'md'}
            >
              {action.icon}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              onClick={secondaryAction.onClick}
              size={size === 'sm' ? 'sm' : 'md'}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>

        {/* Help Link */}
        {showHelp && (
          <a
            href={helpLink}
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            Need help?
          </a>
        )}
      </div>
    );
  }
);

ErrorState.displayName = 'ErrorState';

/* ═══════════════════════════════════════════════════════════════════════════
   PRE-BUILT ERROR STATES FOR COMMON SCENARIOS
   ═══════════════════════════════════════════════════════════════════════════ */

interface CommonErrorProps {
  onRetry?: () => void;
  isRetrying?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Error state for network/connection errors
 */
export function NetworkError({ onRetry, isRetrying, size, className }: CommonErrorProps) {
  return (
    <ErrorState
      errorType="network"
      onRetry={onRetry}
      isRetrying={isRetrying}
      size={size}
      className={className}
    />
  );
}

/**
 * Error state for server errors
 */
export function ServerError({ onRetry, isRetrying, size, className }: CommonErrorProps) {
  return (
    <ErrorState
      errorType="server"
      onRetry={onRetry}
      isRetrying={isRetrying}
      size={size}
      className={className}
    />
  );
}

/**
 * Error state for timeout errors
 */
export function TimeoutError({ onRetry, isRetrying, size, className }: CommonErrorProps) {
  return (
    <ErrorState
      errorType="timeout"
      onRetry={onRetry}
      isRetrying={isRetrying}
      size={size}
      className={className}
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
  size,
  className,
}: CommonErrorProps & { resourceName?: string }) {
  return (
    <ErrorState
      errorType="data"
      description={
        resourceName
          ? `We could not load your ${resourceName}.`
          : undefined
      }
      hint={
        resourceName
          ? `Try refreshing the page to reload your ${resourceName}.`
          : undefined
      }
      onRetry={onRetry}
      isRetrying={isRetrying}
      size={size}
      className={className}
    />
  );
}

/**
 * Error state for permission/access denied errors
 */
export function PermissionError({
  action,
  size,
  className,
}: {
  action?: { label: string; onClick: () => void };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <ErrorState
      errorType="permission"
      action={action}
      size={size}
      className={className}
      showHelp
    />
  );
}

/**
 * Error state for authentication errors
 */
export function AuthError({
  onRetry,
  size,
  className,
}: {
  onRetry?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <ErrorState
      errorType="auth"
      action={{
        label: 'Sign In',
        onClick: () => window.location.href = '/login',
      }}
      onRetry={onRetry}
      size={size}
      className={className}
    />
  );
}

/**
 * Error state for payment errors
 */
export function PaymentError({
  onRetry,
  isRetrying,
  message,
  size,
  className,
}: CommonErrorProps & { message?: string }) {
  return (
    <ErrorState
      errorType="payment"
      description={message}
      onRetry={onRetry}
      isRetrying={isRetrying}
      retryLabel="Try Payment Again"
      size={size}
      className={className}
      action={{
        label: 'Update Payment Method',
        onClick: () => window.location.href = '/settings/payment',
      }}
    />
  );
}

/**
 * Error state for upload errors
 */
export function UploadError({
  onRetry,
  isRetrying,
  fileName,
  reason,
  size,
  className,
}: CommonErrorProps & { fileName?: string; reason?: string }) {
  return (
    <ErrorState
      errorType="upload"
      description={
        fileName
          ? `We could not upload "${fileName}".`
          : undefined
      }
      hint={reason || 'Check your file size and format, then try again.'}
      onRetry={onRetry}
      isRetrying={isRetrying}
      retryLabel="Try Upload Again"
      size={size}
      className={className}
    />
  );
}

/**
 * Error state for search errors
 */
export function SearchError({
  onRetry,
  query,
  size,
  className,
}: {
  onRetry?: () => void;
  query?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <ErrorState
      errorType="search"
      description={
        query
          ? `We could not search for "${query}".`
          : 'We could not complete your search.'
      }
      onRetry={onRetry}
      size={size}
      className={className}
    />
  );
}

/**
 * Error state for not found errors
 */
export function NotFoundError({
  resourceName,
  size,
  className,
  onGoBack,
}: {
  resourceName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onGoBack?: () => void;
}) {
  return (
    <ErrorState
      errorType="notFound"
      description={
        resourceName
          ? `The ${resourceName} you are looking for does not exist or has been removed.`
          : undefined
      }
      action={
        onGoBack
          ? { label: 'Go Back', onClick: onGoBack }
          : { label: 'Go Home', onClick: () => window.location.href = '/' }
      }
      size={size}
      className={className}
    />
  );
}

/**
 * Generic error state with custom message
 */
export function GenericError({
  title,
  description,
  hint,
  onRetry,
  isRetrying,
  size,
  className,
}: {
  title?: string;
  description?: string;
  hint?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <ErrorState
      errorType="generic"
      title={title}
      description={description}
      hint={hint}
      onRetry={onRetry}
      isRetrying={isRetrying}
      size={size}
      className={className}
    />
  );
}

/**
 * Error state from an Error object - auto-parses to user-friendly message
 */
export function ErrorFromException({
  error,
  onRetry,
  isRetrying,
  size,
  className,
}: {
  error: Error | unknown;
  onRetry?: () => void;
  isRetrying?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const friendlyError = parseErrorToUserFriendly(error);

  return (
    <ErrorState
      title={friendlyError.title}
      description={friendlyError.message}
      hint={friendlyError.action}
      onRetry={friendlyError.canRetry ? onRetry : undefined}
      isRetrying={isRetrying}
      size={size}
      className={className}
      showHelp={!!friendlyError.helpLink}
      helpLink={friendlyError.helpLink}
    />
  );
}

export { ErrorState };
