'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-[var(--neutral-50)] p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-[var(--error-100)] flex items-center justify-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--error-600)]"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-[var(--neutral-900)] mb-2">
                Something went wrong
              </h1>
              <p className="text-[var(--neutral-600)]">
                We apologize for the inconvenience. Our team has been notified and is working on a
                fix.
              </p>
            </div>

            {error.digest && (
              <p className="text-xs text-[var(--neutral-400)] font-mono">
                Error ID: {error.digest}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={reset} variant="primary">
                Try Again
              </Button>
              <Button onClick={() => (window.location.href = '/')} variant="secondary">
                Go Home
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
