/**
 * Global Error Handling Utilities
 * Provides consistent error handling, logging, and user-friendly messages
 */

import * as Sentry from '@sentry/nextjs';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
  originalError?: Error;
}

export interface ErrorLogEntry {
  timestamp: string;
  error: AppError;
  url?: string;
  userId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Error Codes & Messages
// ═══════════════════════════════════════════════════════════════════════════

const ERROR_MESSAGES: Record<string, { message: string; userMessage: string; severity: ErrorSeverity }> = {
  // Authentication Errors
  AUTH_INVALID_CREDENTIALS: {
    message: 'Invalid email or password',
    userMessage: 'The email or password you entered is incorrect. Please try again.',
    severity: 'low',
  },
  AUTH_SESSION_EXPIRED: {
    message: 'User session has expired',
    userMessage: 'Your session has expired. Please sign in again.',
    severity: 'low',
  },
  AUTH_UNAUTHORIZED: {
    message: 'User is not authorized',
    userMessage: 'You don\'t have permission to access this resource.',
    severity: 'medium',
  },

  // Network Errors
  NETWORK_ERROR: {
    message: 'Network request failed',
    userMessage: 'Unable to connect. Please check your internet connection and try again.',
    severity: 'medium',
  },
  TIMEOUT_ERROR: {
    message: 'Request timed out',
    userMessage: 'The request took too long. Please try again.',
    severity: 'medium',
  },

  // Data Errors
  DATA_NOT_FOUND: {
    message: 'Requested data not found',
    userMessage: 'The requested item could not be found.',
    severity: 'low',
  },
  DATA_VALIDATION_ERROR: {
    message: 'Data validation failed',
    userMessage: 'Please check your input and try again.',
    severity: 'low',
  },
  DATA_CONFLICT: {
    message: 'Data conflict detected',
    userMessage: 'This action conflicts with existing data. Please refresh and try again.',
    severity: 'medium',
  },

  // Server Errors
  SERVER_ERROR: {
    message: 'Internal server error',
    userMessage: 'Something went wrong on our end. Please try again later.',
    severity: 'high',
  },
  SERVICE_UNAVAILABLE: {
    message: 'Service temporarily unavailable',
    userMessage: 'This service is temporarily unavailable. Please try again in a few minutes.',
    severity: 'high',
  },

  // File Errors
  FILE_TOO_LARGE: {
    message: 'File exceeds size limit',
    userMessage: 'The file you selected is too large. Please choose a smaller file.',
    severity: 'low',
  },
  FILE_TYPE_NOT_ALLOWED: {
    message: 'File type not supported',
    userMessage: 'This file type is not supported. Please choose a different file.',
    severity: 'low',
  },
  FILE_UPLOAD_FAILED: {
    message: 'File upload failed',
    userMessage: 'Unable to upload the file. Please try again.',
    severity: 'medium',
  },

  // Generic
  UNKNOWN_ERROR: {
    message: 'An unknown error occurred',
    userMessage: 'Something unexpected happened. Please try again.',
    severity: 'medium',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Error Factory
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a standardized AppError from an error code
 *
 * Looks up the error code in ERROR_MESSAGES to get the appropriate
 * message, user-friendly message, and severity level.
 *
 * @param code - Error code key (e.g., 'AUTH_INVALID_CREDENTIALS')
 * @param context - Optional additional context data
 * @param originalError - Optional original Error for stack trace
 * @returns Fully populated AppError object
 * @example
 * const error = createAppError('AUTH_SESSION_EXPIRED', { userId: '123' });
 * showToast(error.userMessage);
 */
export function createAppError(
  code: string,
  context?: Record<string, unknown>,
  originalError?: Error
): AppError {
  const errorConfig = ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR;

  return {
    code,
    message: errorConfig.message,
    userMessage: errorConfig.userMessage,
    severity: errorConfig.severity,
    context,
    originalError,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Error Parser
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse any error into a standardized AppError
 *
 * Handles AppError, Supabase errors, fetch errors, and generic Error
 * objects. Automatically categorizes the error and provides appropriate
 * user-friendly messaging.
 *
 * @param error - Any error value (Error, AppError, Supabase error, unknown)
 * @returns Normalized AppError with consistent structure
 * @example
 * try {
 *   await riskyOperation();
 * } catch (e) {
 *   const appError = parseError(e);
 *   showToast(appError.userMessage);
 *   logError(appError);
 * }
 */
export function parseError(error: unknown): AppError {
  // Already an AppError
  if (isAppError(error)) {
    return error;
  }

  // Supabase errors
  if (isSupabaseError(error)) {
    return parseSupabaseError(error);
  }

  // Fetch/Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return createAppError('NETWORK_ERROR', undefined, error);
  }

  // Standard Error
  if (error instanceof Error) {
    // Check for common error patterns
    if (error.message.includes('timeout')) {
      return createAppError('TIMEOUT_ERROR', undefined, error);
    }
    if (error.message.includes('unauthorized') || error.message.includes('401')) {
      return createAppError('AUTH_UNAUTHORIZED', undefined, error);
    }
    if (error.message.includes('not found') || error.message.includes('404')) {
      return createAppError('DATA_NOT_FOUND', undefined, error);
    }

    return createAppError('UNKNOWN_ERROR', { originalMessage: error.message }, error);
  }

  // Unknown error type
  return createAppError('UNKNOWN_ERROR', { errorValue: String(error) });
}

// ═══════════════════════════════════════════════════════════════════════════
// Type Guards
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Type guard to check if a value is an AppError
 *
 * @param error - Value to check
 * @returns True if the value is an AppError
 * @example
 * if (isAppError(error)) {
 *   console.log(error.userMessage); // TypeScript knows it's AppError
 * }
 */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'userMessage' in error &&
    'severity' in error
  );
}

interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
}

function isSupabaseError(error: unknown): error is SupabaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    (('code' in error) || ('status' in error))
  );
}

function parseSupabaseError(error: SupabaseError): AppError {
  const code = error.code || '';

  // Auth errors
  if (code.includes('invalid_credentials') || code === '400') {
    return createAppError('AUTH_INVALID_CREDENTIALS');
  }
  if (code.includes('session_expired') || code.includes('refresh_token')) {
    return createAppError('AUTH_SESSION_EXPIRED');
  }

  // Data errors
  if (code === '23505') {
    return createAppError('DATA_CONFLICT', { details: error.details });
  }
  if (code === 'PGRST116' || error.status === 404) {
    return createAppError('DATA_NOT_FOUND');
  }

  // Server errors
  if (error.status && error.status >= 500) {
    return createAppError('SERVER_ERROR', { status: error.status });
  }

  return createAppError('UNKNOWN_ERROR', { supabaseError: error });
}

// ═══════════════════════════════════════════════════════════════════════════
// Error Logging
// ═══════════════════════════════════════════════════════════════════════════

const errorLog: ErrorLogEntry[] = [];
const MAX_LOG_SIZE = 100;

/**
 * Log an error to in-memory log and external services
 *
 * In development, logs to console with detailed grouping.
 * In production, sends medium+ severity errors to Sentry.
 * Maintains an in-memory error log (max 100 entries).
 *
 * @param error - The AppError to log
 * @param options - Optional context like URL and userId
 * @example
 * logError(appError, { userId: currentUser.id });
 */
export function logError(
  error: AppError,
  options?: { url?: string; userId?: string }
): void {
  const entry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    error,
    url: options?.url || (typeof window !== 'undefined' ? window.location.href : undefined),
    userId: options?.userId,
  };

  // Add to in-memory log
  errorLog.unshift(entry);
  if (errorLog.length > MAX_LOG_SIZE) {
    errorLog.pop();
  }

  // Console logging in development
  if (process.env.NODE_ENV === 'development') {
    console.group(`[Error: ${error.code}]`);
    console.error('Message:', error.message);
    console.error('User Message:', error.userMessage);
    console.error('Severity:', error.severity);
    if (error.context) console.error('Context:', error.context);
    if (error.originalError) console.error('Original Error:', error.originalError);
    console.groupEnd();
  }

  // In production, send to Sentry
  if (process.env.NODE_ENV === 'production' && error.severity !== 'low') {
    const severityMap: Record<ErrorSeverity, Sentry.SeverityLevel> = {
      low: 'info',
      medium: 'warning',
      high: 'error',
      critical: 'fatal',
    };

    Sentry.withScope((scope) => {
      scope.setLevel(severityMap[error.severity]);
      scope.setTag('error_code', error.code);
      scope.setExtra('userMessage', error.userMessage);
      if (error.context) {
        scope.setExtras(error.context);
      }
      if (options?.userId) {
        scope.setUser({ id: options.userId });
      }

      if (error.originalError) {
        Sentry.captureException(error.originalError);
      } else {
        Sentry.captureMessage(error.message, severityMap[error.severity]);
      }
    });
  }
}

/**
 * Get the in-memory error log (most recent first)
 *
 * @returns Readonly array of error log entries
 */
export function getErrorLog(): readonly ErrorLogEntry[] {
  return errorLog;
}

/**
 * Clear all entries from the in-memory error log
 */
export function clearErrorLog(): void {
  errorLog.length = 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// Error Handler Hook Helper
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Handle an error with parsing, logging, and optional toast notification
 *
 * Convenience function that combines parseError, logError, and optional
 * toast notification into a single call.
 *
 * @param error - Any error value to handle
 * @param options - Optional configuration
 * @param options.silent - If true, skip toast notification
 * @param options.showToast - Toast function to display user message
 * @returns The parsed AppError
 * @example
 * const appError = handleError(e, {
 *   showToast: (msg) => toast.error(msg)
 * });
 */
export function handleError(
  error: unknown,
  options?: { silent?: boolean; showToast?: (message: string) => void }
): AppError {
  const appError = parseError(error);
  logError(appError);

  if (!options?.silent && options?.showToast) {
    options.showToast(appError.userMessage);
  }

  return appError;
}
