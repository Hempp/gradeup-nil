// Sentry server-side configuration
// This configures Sentry for the Node.js server runtime

import * as Sentry from '@sentry/nextjs';

// Only initialize Sentry in production
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Performance monitoring (lower rate for server to reduce costs)
    tracesSampleRate: 0.05, // 5% of server transactions

    // Environment
    environment: process.env.NODE_ENV,

    // Release tracking
    release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

    // Ignore certain errors
    ignoreErrors: [
      // Network timeouts that are expected
      /ECONNRESET/,
      /ETIMEDOUT/,
    ],

    // Filter events
    beforeSend(event) {
      // Don't send events in development
      if (process.env.NODE_ENV === 'development') {
        return null;
      }
      return event;
    },
  });
}
