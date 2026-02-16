// Sentry edge runtime configuration
// This configures Sentry for edge/middleware functions

import * as Sentry from '@sentry/nextjs';

// Only initialize Sentry in production
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Performance monitoring (lower for edge)
    tracesSampleRate: 0.05,

    // Environment
    environment: process.env.NODE_ENV,

    // Release tracking
    release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  });
}
