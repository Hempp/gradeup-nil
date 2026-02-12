'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          {/* Error Icon */}
          <div className="mx-auto w-14 h-14 rounded-full bg-[var(--warning-100)] flex items-center justify-center mb-5">
            <AlertTriangle className="h-7 w-7 text-[var(--color-warning)]" />
          </div>

          {/* Error Message */}
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            Dashboard Error
          </h2>
          <p className="text-sm text-[var(--text-muted)] mb-5">
            We couldn&apos;t load this section. This might be a temporary issue.
          </p>

          {/* Error Details (development only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-5 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] text-left">
              <p className="text-xs font-mono text-[var(--color-error)] break-all">
                {error.message}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" size="sm" onClick={reset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button variant="primary" size="sm" onClick={() => window.location.href = '/athlete/dashboard'}>
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
