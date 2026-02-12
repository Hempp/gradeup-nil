'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-primary)]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          {/* Error Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-[var(--error-100)] flex items-center justify-center mb-6">
            <AlertTriangle className="h-8 w-8 text-[var(--color-error)]" />
          </div>

          {/* Error Message */}
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Something went wrong
          </h1>
          <p className="text-[var(--text-muted)] mb-6">
            We encountered an unexpected error. Please try again or return to the homepage.
          </p>

          {/* Error Details (development only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] text-left">
              <p className="text-xs font-mono text-[var(--color-error)] break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs font-mono text-[var(--text-muted)] mt-1">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="secondary" onClick={reset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button variant="primary" onClick={() => window.location.href = '/'}>
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
