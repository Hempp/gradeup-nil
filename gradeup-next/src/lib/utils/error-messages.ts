/**
 * Error Message UX System
 *
 * Provides user-friendly error messages with actionable suggestions.
 * This module maps technical error codes to human-readable messages
 * that help users understand what went wrong and what to do next.
 */

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface UserFriendlyError {
  /** Short, descriptive title */
  title: string;
  /** Detailed explanation in plain language */
  message: string;
  /** Actionable suggestion for the user */
  action: string;
  /** Optional retry capability */
  canRetry?: boolean;
  /** Optional link for more help */
  helpLink?: string;
  /** Error category for analytics */
  category: ErrorCategory;
}

export type ErrorCategory =
  | 'auth'
  | 'network'
  | 'validation'
  | 'permission'
  | 'payment'
  | 'upload'
  | 'data'
  | 'server'
  | 'unknown';

// ═══════════════════════════════════════════════════════════════════════════
// Error Message Mapping
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Comprehensive mapping of error codes to user-friendly messages.
 * Error codes follow the format: category/specific-error
 */
export const errorMessages: Record<string, UserFriendlyError> = {
  // ─────────────────────────────────────────────────────────────────────────
  // Authentication Errors
  // ─────────────────────────────────────────────────────────────────────────
  'auth/invalid-credentials': {
    title: 'Invalid login',
    message: 'The email or password you entered is incorrect.',
    action: 'Check your credentials and try again, or reset your password.',
    canRetry: true,
    helpLink: '/forgot-password',
    category: 'auth',
  },
  'auth/email-not-verified': {
    title: 'Email not verified',
    message: 'You need to verify your email address before logging in.',
    action: 'Check your inbox for a verification email. Click the link to verify.',
    canRetry: false,
    category: 'auth',
  },
  'auth/account-locked': {
    title: 'Account temporarily locked',
    message: 'Too many failed login attempts. Your account has been temporarily locked.',
    action: 'Wait 15 minutes and try again, or reset your password.',
    canRetry: false,
    helpLink: '/forgot-password',
    category: 'auth',
  },
  'auth/session-expired': {
    title: 'Session expired',
    message: 'Your login session has expired for security reasons.',
    action: 'Please sign in again to continue.',
    canRetry: true,
    category: 'auth',
  },
  'auth/email-already-exists': {
    title: 'Email already registered',
    message: 'An account with this email address already exists.',
    action: 'Try logging in instead, or use a different email address.',
    canRetry: false,
    helpLink: '/login',
    category: 'auth',
  },
  'auth/weak-password': {
    title: 'Password too weak',
    message: 'Your password does not meet the security requirements.',
    action: 'Use at least 8 characters with uppercase, lowercase, numbers, and symbols.',
    canRetry: true,
    category: 'auth',
  },
  'auth/invalid-email': {
    title: 'Invalid email address',
    message: 'The email address format is not valid.',
    action: 'Please enter a valid email address (e.g., name@example.com).',
    canRetry: true,
    category: 'auth',
  },
  'auth/user-not-found': {
    title: 'Account not found',
    message: 'We could not find an account with this email address.',
    action: 'Check the email address or create a new account.',
    canRetry: true,
    helpLink: '/signup',
    category: 'auth',
  },
  'auth/password-mismatch': {
    title: 'Passwords do not match',
    message: 'The passwords you entered do not match.',
    action: 'Please make sure both password fields are identical.',
    canRetry: true,
    category: 'auth',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Network Errors
  // ─────────────────────────────────────────────────────────────────────────
  'network/offline': {
    title: "You're offline",
    message: 'Your device is not connected to the internet.',
    action: 'Check your internet connection and try again.',
    canRetry: true,
    category: 'network',
  },
  'network/timeout': {
    title: 'Connection timed out',
    message: 'The server took too long to respond.',
    action: 'Check your connection and try again. If the problem persists, please wait a few minutes.',
    canRetry: true,
    category: 'network',
  },
  'network/server-unreachable': {
    title: 'Cannot reach server',
    message: 'We are having trouble connecting to our servers.',
    action: 'Please try again in a few moments. We are working to fix this.',
    canRetry: true,
    category: 'network',
  },
  'network/slow-connection': {
    title: 'Slow connection',
    message: 'Your connection appears to be slow.',
    action: 'Try moving to an area with better connectivity, or wait for the request to complete.',
    canRetry: true,
    category: 'network',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Permission Errors
  // ─────────────────────────────────────────────────────────────────────────
  'permission/access-denied': {
    title: 'Access denied',
    message: 'You do not have permission to access this resource.',
    action: 'Contact your administrator if you believe this is an error.',
    canRetry: false,
    category: 'permission',
  },
  'permission/role-required': {
    title: 'Role required',
    message: 'This feature requires a specific role or subscription level.',
    action: 'Upgrade your account to access this feature.',
    canRetry: false,
    category: 'permission',
  },
  'permission/verification-required': {
    title: 'Verification required',
    message: 'You need to complete verification before accessing this feature.',
    action: 'Complete your profile verification to continue.',
    canRetry: false,
    helpLink: '/settings/verification',
    category: 'permission',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Payment Errors
  // ─────────────────────────────────────────────────────────────────────────
  'payment/card-declined': {
    title: 'Card declined',
    message: 'Your card was declined by your bank.',
    action: 'Try a different payment method, or contact your bank for more information.',
    canRetry: true,
    category: 'payment',
  },
  'payment/insufficient-funds': {
    title: 'Insufficient funds',
    message: 'There are not enough funds available for this transaction.',
    action: 'Try a different payment method or add funds to your account.',
    canRetry: true,
    category: 'payment',
  },
  'payment/expired-card': {
    title: 'Card expired',
    message: 'The card you entered has expired.',
    action: 'Please update your payment information with a valid card.',
    canRetry: true,
    helpLink: '/settings/payment',
    category: 'payment',
  },
  'payment/invalid-card': {
    title: 'Invalid card details',
    message: 'The card details you entered are not valid.',
    action: 'Double-check your card number, expiration date, and CVC.',
    canRetry: true,
    category: 'payment',
  },
  'payment/processing-error': {
    title: 'Payment processing error',
    message: 'There was a problem processing your payment.',
    action: 'Please try again or contact support if the issue persists.',
    canRetry: true,
    category: 'payment',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Upload Errors
  // ─────────────────────────────────────────────────────────────────────────
  'upload/file-too-large': {
    title: 'File too large',
    message: 'The file you selected exceeds the maximum allowed size.',
    action: 'Please choose a smaller file (max 10MB for images, 100MB for videos).',
    canRetry: true,
    category: 'upload',
  },
  'upload/invalid-file-type': {
    title: 'File type not supported',
    message: 'This file type cannot be uploaded.',
    action: 'Please use a supported format: JPG, PNG, GIF for images, or MP4, MOV for videos.',
    canRetry: true,
    category: 'upload',
  },
  'upload/upload-failed': {
    title: 'Upload failed',
    message: 'We could not upload your file.',
    action: 'Check your internet connection and try again.',
    canRetry: true,
    category: 'upload',
  },
  'upload/corrupt-file': {
    title: 'File may be corrupted',
    message: 'The file could not be read properly.',
    action: 'Try uploading a different file or re-save the original file.',
    canRetry: true,
    category: 'upload',
  },
  'upload/storage-full': {
    title: 'Storage limit reached',
    message: 'You have reached your storage limit.',
    action: 'Delete some files to free up space, or upgrade your account.',
    canRetry: false,
    category: 'upload',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Data/Validation Errors
  // ─────────────────────────────────────────────────────────────────────────
  'data/not-found': {
    title: 'Not found',
    message: 'The item you are looking for does not exist or has been removed.',
    action: 'Go back and try again, or contact support if this is unexpected.',
    canRetry: false,
    category: 'data',
  },
  'data/already-exists': {
    title: 'Already exists',
    message: 'An item with this information already exists.',
    action: 'Try using different information, or update the existing item.',
    canRetry: true,
    category: 'data',
  },
  'data/save-failed': {
    title: 'Could not save changes',
    message: 'Your changes could not be saved.',
    action: 'Check your internet connection and try again.',
    canRetry: true,
    category: 'data',
  },
  'data/load-failed': {
    title: 'Could not load data',
    message: 'We had trouble loading your information.',
    action: 'Refresh the page or try again later.',
    canRetry: true,
    category: 'data',
  },
  'data/delete-failed': {
    title: 'Could not delete',
    message: 'We could not delete this item.',
    action: 'Try again or contact support if the problem persists.',
    canRetry: true,
    category: 'data',
  },
  'validation/required-field': {
    title: 'Required field missing',
    message: 'Please fill in all required fields.',
    action: 'Complete the highlighted fields and try again.',
    canRetry: true,
    category: 'validation',
  },
  'validation/invalid-format': {
    title: 'Invalid format',
    message: 'The information you entered is not in the correct format.',
    action: 'Please check the format and try again.',
    canRetry: true,
    category: 'validation',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Server Errors
  // ─────────────────────────────────────────────────────────────────────────
  'server/internal-error': {
    title: 'Something went wrong',
    message: 'We encountered an unexpected error on our end.',
    action: 'Please try again. If the problem persists, contact support.',
    canRetry: true,
    category: 'server',
  },
  'server/maintenance': {
    title: 'Under maintenance',
    message: 'We are currently performing scheduled maintenance.',
    action: 'Please check back in a few minutes. We will be back soon!',
    canRetry: true,
    category: 'server',
  },
  'server/overloaded': {
    title: 'Server busy',
    message: 'Our servers are experiencing high traffic.',
    action: 'Please wait a moment and try again.',
    canRetry: true,
    category: 'server',
  },
  'server/rate-limited': {
    title: 'Too many requests',
    message: 'You have made too many requests in a short period.',
    action: 'Please wait a minute before trying again.',
    canRetry: true,
    category: 'server',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Default/Unknown Errors
  // ─────────────────────────────────────────────────────────────────────────
  'unknown/generic': {
    title: 'Something went wrong',
    message: 'An unexpected error occurred.',
    action: 'Please try again. If the problem persists, contact support.',
    canRetry: true,
    category: 'unknown',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get a user-friendly error message for a given error code.
 * Falls back to a generic message if the code is not found.
 *
 * @param code - Error code in format 'category/specific-error'
 * @returns UserFriendlyError object with title, message, and action
 *
 * @example
 * const error = getErrorMessage('auth/invalid-credentials');
 * // { title: 'Invalid login', message: 'The email or password...', action: '...' }
 */
export function getErrorMessage(code: string): UserFriendlyError {
  return errorMessages[code] || errorMessages['unknown/generic'];
}

/**
 * Convert a technical error to a user-friendly format.
 * Attempts to detect the error type from the error object or message.
 *
 * @param error - Any error value (Error, string, or unknown)
 * @returns UserFriendlyError with appropriate messaging
 *
 * @example
 * try {
 *   await riskyOperation();
 * } catch (e) {
 *   const friendly = parseErrorToUserFriendly(e);
 *   toast.error(friendly.title, friendly.message);
 * }
 */
export function parseErrorToUserFriendly(error: unknown): UserFriendlyError {
  // If it's already a known error code string
  if (typeof error === 'string' && errorMessages[error]) {
    return errorMessages[error];
  }

  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      if (!navigator.onLine) {
        return errorMessages['network/offline'];
      }
      return errorMessages['network/server-unreachable'];
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return errorMessages['network/timeout'];
    }

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('401')) {
      return errorMessages['auth/session-expired'];
    }
    if (message.includes('invalid credentials') || message.includes('invalid password')) {
      return errorMessages['auth/invalid-credentials'];
    }

    // Permission errors
    if (message.includes('forbidden') || message.includes('403')) {
      return errorMessages['permission/access-denied'];
    }

    // Not found errors
    if (message.includes('not found') || message.includes('404')) {
      return errorMessages['data/not-found'];
    }

    // Server errors
    if (message.includes('500') || message.includes('server error')) {
      return errorMessages['server/internal-error'];
    }
    if (message.includes('503') || message.includes('service unavailable')) {
      return errorMessages['server/maintenance'];
    }
    if (message.includes('429') || message.includes('rate limit')) {
      return errorMessages['server/rate-limited'];
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid')) {
      return errorMessages['validation/invalid-format'];
    }
  }

  // Handle Supabase errors
  if (isSupabaseError(error)) {
    return parseSupabaseErrorToFriendly(error);
  }

  // Handle Stripe errors
  if (isStripeError(error)) {
    return parseStripeErrorToFriendly(error);
  }

  // Default fallback
  return errorMessages['unknown/generic'];
}

// ═══════════════════════════════════════════════════════════════════════════
// Supabase Error Handling
// ═══════════════════════════════════════════════════════════════════════════

interface SupabaseError {
  message: string;
  code?: string;
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

function parseSupabaseErrorToFriendly(error: SupabaseError): UserFriendlyError {
  const code = error.code || '';
  const status = error.status || 0;
  const message = error.message.toLowerCase();

  // Auth errors
  if (code.includes('invalid_credentials') || message.includes('invalid login')) {
    return errorMessages['auth/invalid-credentials'];
  }
  if (code.includes('email_not_confirmed')) {
    return errorMessages['auth/email-not-verified'];
  }
  if (code.includes('user_not_found')) {
    return errorMessages['auth/user-not-found'];
  }
  if (code.includes('email_exists') || code === '23505') {
    return errorMessages['auth/email-already-exists'];
  }
  if (code.includes('weak_password')) {
    return errorMessages['auth/weak-password'];
  }
  if (code.includes('session_expired') || code.includes('refresh_token')) {
    return errorMessages['auth/session-expired'];
  }

  // HTTP status-based errors
  if (status === 401) {
    return errorMessages['auth/session-expired'];
  }
  if (status === 403) {
    return errorMessages['permission/access-denied'];
  }
  if (status === 404) {
    return errorMessages['data/not-found'];
  }
  if (status === 409) {
    return errorMessages['data/already-exists'];
  }
  if (status === 429) {
    return errorMessages['server/rate-limited'];
  }
  if (status >= 500) {
    return errorMessages['server/internal-error'];
  }

  return errorMessages['unknown/generic'];
}

// ═══════════════════════════════════════════════════════════════════════════
// Stripe Error Handling
// ═══════════════════════════════════════════════════════════════════════════

interface StripeError {
  type: string;
  code?: string;
  decline_code?: string;
  message: string;
}

function isStripeError(error: unknown): error is StripeError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof (error as StripeError).type === 'string' &&
    (error as StripeError).type.startsWith('Stripe')
  );
}

function parseStripeErrorToFriendly(error: StripeError): UserFriendlyError {
  const declineCode = error.decline_code || '';
  const code = error.code || '';

  // Card decline reasons
  if (declineCode === 'insufficient_funds') {
    return errorMessages['payment/insufficient-funds'];
  }
  if (declineCode === 'expired_card' || code === 'expired_card') {
    return errorMessages['payment/expired-card'];
  }
  if (declineCode === 'incorrect_cvc' || declineCode === 'invalid_cvc') {
    return errorMessages['payment/invalid-card'];
  }
  if (code === 'card_declined' || declineCode) {
    return errorMessages['payment/card-declined'];
  }
  if (code === 'invalid_card_number') {
    return errorMessages['payment/invalid-card'];
  }

  return errorMessages['payment/processing-error'];
}

// ═══════════════════════════════════════════════════════════════════════════
// Form Validation Error Hints
// ═══════════════════════════════════════════════════════════════════════════

/**
 * User-friendly hints for common form validation errors.
 * Use these to provide helpful inline error messages.
 */
export const validationHints = {
  email: {
    required: 'Please enter your email address.',
    invalid: 'Please enter a valid email (e.g., name@example.com).',
  },
  password: {
    required: 'Please enter a password.',
    tooShort: 'Password must be at least 8 characters.',
    noUppercase: 'Include at least one uppercase letter.',
    noLowercase: 'Include at least one lowercase letter.',
    noNumber: 'Include at least one number.',
    noSpecial: 'Include at least one special character (!@#$%^&*).',
    mismatch: 'Passwords do not match.',
  },
  name: {
    required: 'Please enter your name.',
    tooShort: 'Name must be at least 2 characters.',
  },
  phone: {
    required: 'Please enter your phone number.',
    invalid: 'Please enter a valid phone number.',
  },
  url: {
    invalid: 'Please enter a valid URL (e.g., https://example.com).',
  },
  gpa: {
    required: 'Please enter your GPA.',
    invalid: 'GPA must be between 0.0 and 4.0.',
  },
  amount: {
    required: 'Please enter an amount.',
    tooLow: 'Amount must be greater than $0.',
    tooHigh: 'Amount exceeds the maximum allowed.',
  },
  date: {
    required: 'Please select a date.',
    invalid: 'Please select a valid date.',
    past: 'Date cannot be in the past.',
    future: 'Date cannot be in the future.',
  },
  file: {
    required: 'Please select a file.',
    tooLarge: 'File is too large. Maximum size is {maxSize}.',
    invalidType: 'This file type is not allowed. Please use {allowedTypes}.',
  },
  general: {
    required: 'This field is required.',
    invalid: 'Please check this field and try again.',
    minLength: 'Must be at least {min} characters.',
    maxLength: 'Cannot exceed {max} characters.',
  },
};

/**
 * Get a validation hint with placeholder replacement.
 *
 * @param category - Category of hint (email, password, etc.)
 * @param type - Type of hint within the category
 * @param replacements - Optional key-value pairs to replace in the hint
 * @returns Formatted hint string
 *
 * @example
 * getValidationHint('file', 'tooLarge', { maxSize: '10MB' });
 * // 'File is too large. Maximum size is 10MB.'
 */
export function getValidationHint(
  category: keyof typeof validationHints,
  type: string,
  replacements?: Record<string, string>
): string {
  const categoryHints = validationHints[category] as Record<string, string>;
  let hint = categoryHints[type] || validationHints.general.invalid;

  if (replacements) {
    Object.entries(replacements).forEach(([key, value]) => {
      hint = hint.replace(`{${key}}`, value);
    });
  }

  return hint;
}
