// Sentry client-side configuration
// This configures Sentry for the browser runtime

import * as Sentry from '@sentry/nextjs';

// Only initialize Sentry in production
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions for performance monitoring

    // Session replay for debugging user issues
    replaysOnErrorSampleRate: 1.0, // Capture replays on errors
    replaysSessionSampleRate: 0.1, // Capture 10% of normal sessions

    // Environment
    environment: process.env.NODE_ENV,

    // Release tracking
    release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

    // Ignore certain errors that are not actionable
    ignoreErrors: [
      // Browser extensions
      /^ResizeObserver loop/,
      // User-triggered navigation
      /AbortError/,
      // Common false positives
      /^Non-Error promise rejection captured/,
    ],

    // Filter out transactions from development/testing
    beforeSend(event) {
      // Don't send events in development
      if (process.env.NODE_ENV === 'development') {
        return null;
      }
      return event;
    },

    // Integrations
    integrations: [
      Sentry.replayIntegration({
        // Mask all user input for privacy
        maskAllText: false,
        maskAllInputs: true,
        // Block sensitive fields
        blockAllMedia: false,
      }),
    ],
  });
}
