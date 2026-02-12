'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent } from './card';

/* ═══════════════════════════════════════════════════════════════════════════
   ERROR BOUNDARY TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
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
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Render custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Render default error fallback
      return (
        <ErrorFallback
          error={this.state.error ?? undefined}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   ERROR FALLBACK COMPONENT
   Default error fallback UI for ErrorBoundary
   ═══════════════════════════════════════════════════════════════════════════ */

export function ErrorFallback({
  error,
  resetError,
}: {
  error?: Error;
  resetError?: () => void;
}) {
  return (
    <Card className="max-w-md mx-auto my-8">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center">
          {/* Error Icon */}
          <div className="w-12 h-12 rounded-full bg-[var(--error-100)] flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-[var(--color-error)]" />
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Something went wrong
          </h3>

          {/* Error Message */}
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {error?.message || 'An unexpected error occurred. Please try again.'}
          </p>

          {/* Error Details (development only) */}
          {process.env.NODE_ENV === 'development' && error?.stack && (
            <details className="w-full mb-4 text-left">
              <summary className="text-xs text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)] transition-colors">
                Show error details
              </summary>
              <pre className="mt-2 p-3 bg-[var(--bg-secondary)] rounded-[var(--radius-md)] text-xs text-[var(--text-secondary)] overflow-x-auto whitespace-pre-wrap break-words">
                {error.stack}
              </pre>
            </details>
          )}

          {/* Retry Button */}
          {resetError && (
            <Button variant="primary" onClick={resetError} size="sm">
              <RefreshCw className="w-4 h-4" />
              Try again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   INLINE ERROR COMPONENT
   For smaller components where a full card is too much
   ═══════════════════════════════════════════════════════════════════════════ */

export function InlineError({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-[var(--error-100)] border border-[var(--color-error)] rounded-[var(--radius-md)] text-sm">
      {/* Error Icon */}
      <XCircle className="w-5 h-5 text-[var(--color-error)] flex-shrink-0" />

      {/* Message */}
      <span className="text-[var(--color-error)] flex-1">{message}</span>

      {/* Retry Button */}
      {retry && (
        <button
          onClick={retry}
          className="
            flex items-center gap-1.5 px-2 py-1
            text-xs font-medium text-[var(--color-error)]
            bg-transparent hover:bg-[var(--error-100)]
            border border-[var(--color-error)] rounded-[var(--radius-sm)]
            transition-all duration-[var(--transition-fast)]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error)] focus-visible:ring-offset-2
          "
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE ERROR COMPONENT
   Full page error for route-level errors
   ═══════════════════════════════════════════════════════════════════════════ */

export function PageError({
  title = 'Something went wrong',
  message,
  retry,
}: {
  title?: string;
  message?: string;
  retry?: () => void;
}) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        {/* Large Error Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--error-100)] flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-[var(--color-error)]" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
          {title}
        </h1>

        {/* Message */}
        <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
          {message || "We're sorry, but something unexpected happened. Our team has been notified and is working on a fix."}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {retry && (
            <Button variant="primary" onClick={retry}>
              <RefreshCw className="w-4 h-4" />
              Try again
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
          >
            Go to homepage
          </Button>
        </div>

        {/* Support Link */}
        <p className="mt-6 text-sm text-[var(--text-muted)]">
          If this problem persists,{' '}
          <a
            href="/support"
            className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] underline transition-colors"
          >
            contact support
          </a>
        </p>
      </div>
    </div>
  );
}
