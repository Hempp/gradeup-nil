/**
 * Structured Logging Utility for GradeUp NIL
 *
 * Features:
 * - Development-only logging by default
 * - Sentry integration for error tracking in production
 * - Multiple log levels (debug, info, warn, error)
 * - Context support (component name, user id, custom data)
 * - Scoped loggers for components
 */

import * as Sentry from '@sentry/nextjs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  component?: string;
  userId?: string;
  [key: string]: unknown;
}

const isDev = process.env.NODE_ENV === 'development';

/**
 * Format a log message with timestamp, level, and optional context
 */
function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * Add context to Sentry scope for better error tracking
 */
function addSentryContext(context?: LogContext): void {
  if (!context) return;

  Sentry.withScope((scope) => {
    if (context.component) {
      scope.setTag('component', context.component);
    }
    if (context.userId) {
      scope.setUser({ id: context.userId });
    }
    // Add any additional context as extra data
    const { component: _component, userId: _userId, ...extra } = context;
    if (Object.keys(extra).length > 0) {
      scope.setExtras(extra);
    }
  });
}

/**
 * Main logger object with methods for each log level
 */
export const logger = {
  /**
   * Debug level - verbose debugging information
   * Only logs in development
   */
  debug: (message: string, context?: LogContext) => {
    if (isDev) {
      console.debug(formatMessage('debug', message, context));
    }
  },

  /**
   * Info level - general informational messages
   * Only logs in development
   */
  info: (message: string, context?: LogContext) => {
    if (isDev) {
      console.info(formatMessage('info', message, context));
    }
  },

  /**
   * Warn level - warning messages that don't indicate errors
   * Logs in development, adds breadcrumb in production
   */
  warn: (message: string, context?: LogContext) => {
    if (isDev) {
      console.warn(formatMessage('warn', message, context));
    } else {
      // Add as Sentry breadcrumb in production for debugging context
      Sentry.addBreadcrumb({
        category: 'warning',
        message,
        level: 'warning',
        data: context,
      });
    }
  },

  /**
   * Error level - error messages indicating failures
   * Logs in development, captures in Sentry in production
   */
  error: (message: string, error?: Error, context?: LogContext) => {
    if (isDev) {
      console.error(formatMessage('error', message, context), error);
    } else {
      // Add context to Sentry
      addSentryContext(context);

      // Add breadcrumb for the error message
      Sentry.addBreadcrumb({
        category: 'error',
        message,
        level: 'error',
        data: context,
      });

      // If an error object is provided, capture it explicitly
      if (error) {
        Sentry.captureException(error, {
          tags: context?.component ? { component: context.component } : undefined,
          extra: context,
        });
      }
    }
  },
};

/**
 * Create a scoped logger for a specific component
 * Pre-fills the component context for all log calls
 *
 * @example
 * const log = createLogger('useEarningsData');
 * log.debug('Fetching earnings', { userId: '123' });
 * // Output: [2024-01-15T10:30:00.000Z] [DEBUG] Fetching earnings {"component":"useEarningsData","userId":"123"}
 */
export function createLogger(component: string) {
  return {
    debug: (message: string, context?: Omit<LogContext, 'component'>) =>
      logger.debug(message, { ...context, component }),
    info: (message: string, context?: Omit<LogContext, 'component'>) =>
      logger.info(message, { ...context, component }),
    warn: (message: string, context?: Omit<LogContext, 'component'>) =>
      logger.warn(message, { ...context, component }),
    error: (message: string, error?: Error, context?: Omit<LogContext, 'component'>) =>
      logger.error(message, error, { ...context, component }),
  };
}

export type Logger = ReturnType<typeof createLogger>;
