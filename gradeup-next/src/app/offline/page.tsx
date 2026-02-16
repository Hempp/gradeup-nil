'use client';

import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <WifiOff className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">You&apos;re Offline</h1>
        <p className="mt-4 text-muted-foreground">
          It looks like you&apos;ve lost your internet connection. Some features may not be
          available until you&apos;re back online.
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          Check your Wi-Fi or mobile data connection and try again.
        </p>
      </div>
    </div>
  );
}
