'use client';

import React, { Component, ErrorInfo, ReactNode, useState } from 'react';
import { AlertTriangle, RefreshCw, XCircle, Home, HelpCircle, ChevronDown, Copy, Check, Bug } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { cn } from '@/lib/utils';
import { parseErrorToUserFriendly, type UserFriendlyError } from '@/lib/utils/error-messages';

/* ═══════════════════════════════════════════════════════════════════════════
   ERROR BOUNDARY TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback component to render on error */
  fallback?: ReactNode;
  /** Custom fallback render function with error info */
  fallbackRender?: (props: { error: Error; resetError: () => void }) => ReactNode;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Callback when user clicks reset/retry */
  onReset?: () => void;
  /** Component name for better error messages */
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ERROR BOUNDARY CLASS COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Store error info for display
    this.setState({ errorInfo });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('[ErrorBoundary] Caught an error');
      console.error('Error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = (): void => {
    // Call optional onReset callback
    this.props.onReset?.();

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback render function if provided
      if (this.props.fallbackRender && this.state.error) {
        return this.props.fallbackRender({
          error: this.state.error,
          resetError: this.resetError,
        });
      }

      // Render custom fallback component if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Render default error fallback
      return (
        <ErrorFallback
          error={this.state.error ?? undefined}
          errorInfo={this.state.errorInfo ?? undefined}
          resetError={this.resetError}
          componentName={this.props.componentName}
        />
      );
    }

    return this.props.children;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   ERROR FALLBACK COMPONENT
   Default error fallback UI for ErrorBoundary with enhanced UX
   ═══════════════════════════════════════════════════════════════════════════ */

export interface ErrorFallbackProps {
  error?: Error;
  errorInfo?: ErrorInfo;
  resetError?: () => void;
  componentName?: string;
  /** Show detailed error info (auto-enabled in development) */
  showDetails?: boolean;
}

export function ErrorFallback({
  error,
  errorInfo,
  resetError,
  componentName,
  showDetails,
}: ErrorFallbackProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const isDev = process.env.NODE_ENV === 'development';
  const shouldShowDetails = showDetails ?? isDev;

  // Get user-friendly error message
  const friendlyError: UserFriendlyError = error
    ? parseErrorToUserFriendly(error)
    : {
        title: 'Something went wrong',
        message: 'An unexpected error occurred.',
        action: 'Please try again or contact support if the problem persists.',
        canRetry: true,
        category: 'unknown',
      };

  // Copy error details to clipboard
  const copyErrorDetails = async () => {
    const details = [
      `Error: ${error?.message}`,
      `Component: ${componentName || 'Unknown'}`,
      `Timestamp: ${new Date().toISOString()}`,
      `URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}`,
      error?.stack ? `\nStack Trace:\n${error.stack}` : '',
      errorInfo?.componentStack ? `\nComponent Stack:${errorInfo.componentStack}` : '',
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy error details');
    }
  };

  return (
    <Card className="max-w-lg mx-auto my-8 shadow-lg">
      <CardContent className="pt-6 pb-6">
        <div className="flex flex-col items-center text-center">
          {/* Error Icon */}
          <div className="w-14 h-14 rounded-full bg-[var(--error-100)] flex items-center justify-center mb-5">
            <AlertTriangle className="w-7 h-7 text-[var(--color-error)]" />
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            {friendlyError.title}
          </h3>

          {/* User-Friendly Message */}
          <p className="text-sm text-[var(--text-secondary)] mb-2 max-w-sm">
            {friendlyError.message}
          </p>

          {/* Actionable Suggestion */}
          <p className="text-sm text-[var(--text-muted)] mb-6 max-w-sm">
            <span className="font-medium">What to do: </span>
            {friendlyError.action}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-4 w-full sm:w-auto">
            {resetError && friendlyError.canRetry && (
              <Button
                variant="primary"
                onClick={resetError}
                size="md"
                className="w-full sm:w-auto gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              size="md"
              className="w-full sm:w-auto gap-2"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Button>
          </div>

          {/* Help Link */}
          {friendlyError.helpLink && (
            <a
              href={friendlyError.helpLink}
              className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] underline underline-offset-2 transition-colors mb-4"
            >
              Get more help
            </a>
          )}

          {/* Error Details (development or when enabled) */}
          {shouldShowDetails && error && (
            <div className="w-full mt-4 border-t border-[var(--border-color)] pt-4">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors w-full justify-center group"
              >
                <Bug className="w-3.5 h-3.5" />
                <span>Technical Details</span>
                <ChevronDown
                  className={cn(
                    'w-3.5 h-3.5 transition-transform duration-200',
                    isExpanded && 'rotate-180'
                  )}
                />
              </button>

              {isExpanded && (
                <div className="mt-3 text-left">
                  {/* Copy Button */}
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={copyErrorDetails}
                      className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors px-2 py-1 rounded hover:bg-[var(--bg-tertiary)]"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[var(--color-success)]" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy details
                        </>
                      )}
                    </button>
                  </div>

                  {/* Error Info */}
                  <div className="space-y-2">
                    {componentName && (
                      <p className="text-xs text-[var(--text-muted)]">
                        <span className="font-medium">Component:</span> {componentName}
                      </p>
                    )}
                    <pre className="p-3 bg-[var(--bg-secondary)] rounded-[var(--radius-md)] text-xs text-[var(--text-secondary)] overflow-x-auto whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                      {error.message}
                      {error.stack && `\n\n${error.stack}`}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Support Link */}
          <p className="text-xs text-[var(--text-muted)] mt-4">
            Need help?{' '}
            <a
              href="/support"
              className="text-[var(--color-primary)] hover:underline transition-colors"
            >
              Contact support
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   INLINE ERROR COMPONENT
   For smaller components where a full card is too much
   ═══════════════════════════════════════════════════════════════════════════ */

export interface InlineErrorProps {
  /** Error message to display */
  message: string;
  /** Optional hint/suggestion for the user */
  hint?: string;
  /** Retry callback */
  retry?: () => void;
  /** Whether retry is in progress */
  isRetrying?: boolean;
  /** Custom action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Variant: 'error' | 'warning' */
  variant?: 'error' | 'warning';
  /** Whether to show icon */
  showIcon?: boolean;
  /** Custom className */
  className?: string;
}

export function InlineError({
  message,
  hint,
  retry,
  isRetrying = false,
  action,
  variant = 'error',
  showIcon = true,
  className,
}: InlineErrorProps) {
  const isWarning = variant === 'warning';

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-[var(--radius-md)] text-sm',
        isWarning
          ? 'bg-[var(--warning-100)] border border-[var(--color-warning)]'
          : 'bg-[var(--error-100)] border border-[var(--color-error)]',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Error Icon */}
      {showIcon && (
        <XCircle
          className={cn(
            'w-5 h-5 flex-shrink-0 mt-0.5',
            isWarning ? 'text-[var(--color-warning)]' : 'text-[var(--color-error)]'
          )}
          aria-hidden="true"
        />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-medium',
          isWarning ? 'text-[var(--color-warning)]' : 'text-[var(--color-error)]'
        )}>
          {message}
        </p>
        {hint && (
          <p className={cn(
            'text-xs mt-1 opacity-80',
            isWarning ? 'text-[var(--color-warning)]' : 'text-[var(--color-error)]'
          )}>
            {hint}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {retry && (
          <button
            onClick={retry}
            disabled={isRetrying}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1',
              'text-xs font-medium',
              'bg-transparent hover:bg-white/20',
              'border rounded-[var(--radius-sm)]',
              'transition-all duration-[var(--transition-fast)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isWarning
                ? 'text-[var(--color-warning)] border-[var(--color-warning)] focus-visible:ring-[var(--color-warning)]'
                : 'text-[var(--color-error)] border-[var(--color-error)] focus-visible:ring-[var(--color-error)]'
            )}
            aria-label={isRetrying ? 'Retrying...' : 'Retry'}
          >
            <RefreshCw className={cn('w-3 h-3', isRetrying && 'animate-spin')} />
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1',
              'text-xs font-medium',
              'bg-transparent hover:bg-white/20',
              'border rounded-[var(--radius-sm)]',
              'transition-all duration-[var(--transition-fast)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              isWarning
                ? 'text-[var(--color-warning)] border-[var(--color-warning)] focus-visible:ring-[var(--color-warning)]'
                : 'text-[var(--color-error)] border-[var(--color-error)] focus-visible:ring-[var(--color-error)]'
            )}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE ERROR COMPONENT
   Full page error for route-level errors
   ═══════════════════════════════════════════════════════════════════════════ */

export interface PageErrorProps {
  /** Error title */
  title?: string;
  /** Error message */
  message?: string;
  /** Suggestion/action text */
  suggestion?: string;
  /** Retry callback */
  retry?: () => void;
  /** Whether retry is in progress */
  isRetrying?: boolean;
  /** Custom retry button label */
  retryLabel?: string;
  /** Show home button */
  showHomeButton?: boolean;
  /** Custom primary action */
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  /** Custom secondary action */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Error code for display (e.g., "404", "500") */
  errorCode?: string;
  /** Illustration/icon to show */
  illustration?: ReactNode;
  /** Additional content below actions */
  footer?: ReactNode;
  /** Custom className */
  className?: string;
}

export function PageError({
  title = 'Something went wrong',
  message,
  suggestion,
  retry,
  isRetrying = false,
  retryLabel = 'Try Again',
  showHomeButton = true,
  primaryAction,
  secondaryAction,
  errorCode,
  illustration,
  footer,
  className,
}: PageErrorProps) {
  const defaultMessage = "We're sorry, but something unexpected happened. Our team has been notified and is working on a fix.";
  const defaultSuggestion = "You can try refreshing the page, or come back later.";

  return (
    <div className={cn('min-h-[50vh] flex items-center justify-center p-4', className)}>
      <div className="max-w-lg w-full text-center">
        {/* Error Code Badge */}
        {errorCode && (
          <div className="inline-block mb-4 px-3 py-1 bg-[var(--error-100)] rounded-full">
            <span className="text-sm font-mono font-medium text-[var(--color-error)]">
              Error {errorCode}
            </span>
          </div>
        )}

        {/* Illustration/Icon */}
        {illustration ? (
          <div className="mb-6">{illustration}</div>
        ) : (
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--error-100)] flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-[var(--color-error)]" />
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-3">
          {title}
        </h1>

        {/* Message */}
        <p className="text-[var(--text-secondary)] mb-3 max-w-md mx-auto">
          {message || defaultMessage}
        </p>

        {/* Suggestion */}
        <p className="text-sm text-[var(--text-muted)] mb-8 max-w-md mx-auto">
          {suggestion || defaultSuggestion}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {/* Primary Action or Retry */}
          {primaryAction ? (
            <Button variant="primary" onClick={primaryAction.onClick} className="gap-2">
              {primaryAction.icon}
              {primaryAction.label}
            </Button>
          ) : retry && (
            <Button
              variant="primary"
              onClick={retry}
              disabled={isRetrying}
              className="gap-2"
            >
              <RefreshCw className={cn('w-4 h-4', isRetrying && 'animate-spin')} />
              {isRetrying ? 'Retrying...' : retryLabel}
            </Button>
          )}

          {/* Secondary Action or Home */}
          {secondaryAction ? (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          ) : showHomeButton && (
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              Go to Homepage
            </Button>
          )}
        </div>

        {/* Quick Help Links */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm">
          <a
            href="/help"
            className="inline-flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            Help Center
          </a>
          <span className="text-[var(--border-color)]">|</span>
          <a
            href="/support"
            className="text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors"
          >
            Contact Support
          </a>
        </div>

        {/* Footer */}
        {footer && <div className="mt-6">{footer}</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SPECIALIZED PAGE ERROR COMPONENTS
   Pre-configured error pages for common scenarios
   ═══════════════════════════════════════════════════════════════════════════ */

/** 404 Not Found Page */
export function NotFoundError({ onGoBack }: { onGoBack?: () => void }) {
  return (
    <PageError
      errorCode="404"
      title="Page Not Found"
      message="The page you're looking for doesn't exist or has been moved."
      suggestion="Check the URL for typos, or use the navigation to find what you need."
      primaryAction={
        onGoBack
          ? { label: 'Go Back', onClick: onGoBack }
          : undefined
      }
      showHomeButton={true}
    />
  );
}

/** 500 Server Error Page */
export function ServerErrorPage({ retry }: { retry?: () => void }) {
  return (
    <PageError
      errorCode="500"
      title="Server Error"
      message="Something went wrong on our end. We've been notified and are working on a fix."
      suggestion="Please try again in a few minutes."
      retry={retry}
    />
  );
}

/** Offline Error Page */
export function OfflineError({ retry }: { retry?: () => void }) {
  return (
    <PageError
      title="You're Offline"
      message="It looks like you've lost your internet connection."
      suggestion="Check your connection and try again when you're back online."
      retry={retry}
      retryLabel="Try Again"
    />
  );
}

/** Permission Denied Error Page */
export function PermissionDeniedError() {
  return (
    <PageError
      errorCode="403"
      title="Access Denied"
      message="You don't have permission to access this page."
      suggestion="If you believe this is an error, please contact your administrator."
      showHomeButton={true}
    />
  );
}
