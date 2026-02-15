'use client';

import { useState, useCallback } from 'react';
import DOMPurifyModule from 'dompurify';
import type { DOMPurify as DOMPurifyType, Config } from 'dompurify';

// DOMPurify is typed as the purify instance
const DOMPurify: DOMPurifyType = DOMPurifyModule;

/* ===============================================================================
   VALIDATION TYPES
   =============================================================================== */

export type ValidatorFn = (value: string) => string | null;
export type ValidationRules<T> = Partial<Record<keyof T, ValidatorFn[]>>;

export interface FormErrors<T> {
  [K: string]: string | null;
}

export interface UseFormValidationReturn<T> {
  values: T;
  errors: FormErrors<T>;
  touched: Partial<Record<keyof T, boolean>>;
  handleChange: (name: keyof T, value: string) => void;
  handleBlur: (name: keyof T) => void;
  validate: () => boolean;
  validateField: (name: keyof T) => string | null;
  isValid: boolean;
  setValues: React.Dispatch<React.SetStateAction<T>>;
  setFieldValue: (name: keyof T, value: string) => void;
  setFieldError: (name: keyof T, error: string | null) => void;
  reset: () => void;
}

/* ===============================================================================
   VALIDATORS
   =============================================================================== */

export const validators = {
  /**
   * Checks if a field is not empty
   */
  required: (value: string): string | null => {
    if (!value || value.trim() === '') {
      return 'This field is required';
    }
    return null;
  },

  /**
   * Validates email format
   */
  email: (value: string): string | null => {
    if (!value) return null; // Let required handle empty values
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  /**
   * Creates a minimum length validator
   */
  minLength: (min: number): ValidatorFn => (value: string): string | null => {
    if (!value) return null; // Let required handle empty values
    if (value.length < min) {
      return `Must be at least ${min} characters`;
    }
    return null;
  },

  /**
   * Creates a maximum length validator
   */
  maxLength: (max: number): ValidatorFn => (value: string): string | null => {
    if (!value) return null;
    if (value.length > max) {
      return `Must be no more than ${max} characters`;
    }
    return null;
  },

  /**
   * Validates password requirements (min 8 chars)
   */
  password: (value: string): string | null => {
    if (!value) return null; // Let required handle empty values
    if (value.length < 8) {
      return 'Password must be at least 8 characters';
    }
    return null;
  },

  /**
   * Validates strong password (8+ chars, uppercase, lowercase, number)
   */
  strongPassword: (value: string): string | null => {
    if (!value) return null;
    if (value.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(value)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(value)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(value)) {
      return 'Password must contain at least one number';
    }
    return null;
  },

  /**
   * Creates a password confirmation validator
   */
  passwordMatch: (getPassword: () => string): ValidatorFn => (value: string): string | null => {
    if (!value) return null;
    if (value !== getPassword()) {
      return 'Passwords do not match';
    }
    return null;
  },

  /**
   * Validates phone number format
   */
  phone: (value: string): string | null => {
    if (!value) return null;
    // Remove formatting characters for validation
    const digitsOnly = value.replace(/[\s\-\(\)\.]/g, '');
    if (!/^\+?[0-9]{10,15}$/.test(digitsOnly)) {
      return 'Please enter a valid phone number';
    }
    return null;
  },

  /**
   * Validates URL format
   */
  url: (value: string): string | null => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return 'Please enter a valid URL';
    }
  },

  /**
   * Validates that value is a number
   */
  numeric: (value: string): string | null => {
    if (!value) return null;
    if (isNaN(Number(value))) {
      return 'Must be a valid number';
    }
    return null;
  },

  /**
   * Creates a minimum value validator
   */
  min: (minVal: number): ValidatorFn => (value: string): string | null => {
    if (!value) return null;
    const num = Number(value);
    if (isNaN(num) || num < minVal) {
      return `Must be at least ${minVal}`;
    }
    return null;
  },

  /**
   * Creates a maximum value validator
   */
  max: (maxVal: number): ValidatorFn => (value: string): string | null => {
    if (!value) return null;
    const num = Number(value);
    if (isNaN(num) || num > maxVal) {
      return `Must be no more than ${maxVal}`;
    }
    return null;
  },

  /**
   * Creates a regex pattern validator
   */
  pattern: (regex: RegExp, message: string): ValidatorFn => (value: string): string | null => {
    if (!value) return null;
    if (!regex.test(value)) {
      return message;
    }
    return null;
  },

  /**
   * Validates GPA format (0.00 - 4.00)
   */
  gpa: (value: string): string | null => {
    if (!value) return null;
    const num = parseFloat(value);
    if (isNaN(num) || num < 0 || num > 4.0) {
      return 'GPA must be between 0.00 and 4.00';
    }
    return null;
  },
};

/* ===============================================================================
   USE FORM VALIDATION HOOK
   =============================================================================== */

export function useFormValidation<T extends { [K in keyof T]: string }>(
  initialValues: T,
  validationRules: ValidationRules<T>
): UseFormValidationReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  /**
   * Validate a single field against its rules
   */
  const validateField = useCallback(
    (name: keyof T): string | null => {
      const fieldRules = validationRules[name];
      if (!fieldRules) return null;

      const value = values[name] || '';

      for (const rule of fieldRules) {
        const error = rule(value);
        if (error) return error;
      }

      return null;
    },
    [values, validationRules]
  );

  /**
   * Validate all fields and return validity
   */
  const validate = useCallback((): boolean => {
    const newErrors: FormErrors<T> = {};
    let isValid = true;

    for (const key of Object.keys(validationRules) as Array<keyof T>) {
      const error = validateField(key);
      newErrors[key as string] = error;
      if (error) isValid = false;
    }

    setErrors(newErrors);

    // Mark all fields as touched
    const allTouched: Partial<Record<keyof T, boolean>> = {};
    for (const key of Object.keys(validationRules) as Array<keyof T>) {
      allTouched[key] = true;
    }
    setTouched(allTouched);

    return isValid;
  }, [validateField, validationRules]);

  /**
   * Handle field value change
   */
  const handleChange = useCallback(
    (name: keyof T, value: string) => {
      setValues((prev) => ({ ...prev, [name]: value }));

      // Clear error when user starts typing (if field was touched)
      if (touched[name]) {
        const fieldRules = validationRules[name];
        if (fieldRules) {
          let error: string | null = null;
          for (const rule of fieldRules) {
            error = rule(value);
            if (error) break;
          }
          setErrors((prev) => ({ ...prev, [name]: error }));
        }
      }
    },
    [touched, validationRules]
  );

  /**
   * Handle field blur - validate on blur
   */
  const handleBlur = useCallback(
    (name: keyof T) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      const error = validateField(name);
      setErrors((prev) => ({ ...prev, [name]: error }));
    },
    [validateField]
  );

  /**
   * Set a single field value
   */
  const setFieldValue = useCallback((name: keyof T, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  /**
   * Set a single field error
   */
  const setFieldError = useCallback((name: keyof T, error: string | null) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, []);

  /**
   * Reset form to initial values
   */
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  /**
   * Check if form is valid (no errors for touched fields)
   */
  const isValid = Object.values(errors).every((error) => !error);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validate,
    validateField,
    isValid,
    setValues,
    setFieldValue,
    setFieldError,
    reset,
  };
}

/* ===============================================================================
   UTILITY FUNCTIONS
   =============================================================================== */

/**
 * Combine multiple validators into one
 */
export function combineValidators(...validators: ValidatorFn[]): ValidatorFn {
  return (value: string): string | null => {
    for (const validator of validators) {
      const error = validator(value);
      if (error) return error;
    }
    return null;
  };
}

/**
 * Create a conditional validator
 */
export function when(
  condition: (value: string) => boolean,
  validator: ValidatorFn
): ValidatorFn {
  return (value: string): string | null => {
    if (condition(value)) {
      return validator(value);
    }
    return null;
  };
}

/* ===============================================================================
   ADDITIONAL VALIDATORS
   =============================================================================== */

/**
 * Social media handle validators
 */
export const socialValidators = {
  /**
   * Instagram handle validation
   */
  instagram: (value: string): string | null => {
    if (!value) return null;
    const handle = value.startsWith('@') ? value.slice(1) : value;
    if (!/^[a-zA-Z0-9._]+$/.test(handle)) {
      return 'Invalid characters in Instagram handle';
    }
    if (handle.length > 30) {
      return 'Instagram handle too long (max 30 characters)';
    }
    return null;
  },

  /**
   * Twitter/X handle validation
   */
  twitter: (value: string): string | null => {
    if (!value) return null;
    const handle = value.startsWith('@') ? value.slice(1) : value;
    if (!/^[a-zA-Z0-9_]+$/.test(handle)) {
      return 'Invalid characters in Twitter handle';
    }
    if (handle.length > 15) {
      return 'Twitter handle too long (max 15 characters)';
    }
    return null;
  },

  /**
   * TikTok handle validation
   */
  tiktok: (value: string): string | null => {
    if (!value) return null;
    const handle = value.startsWith('@') ? value.slice(1) : value;
    if (!/^[a-zA-Z0-9._]+$/.test(handle)) {
      return 'Invalid characters in TikTok handle';
    }
    if (handle.length > 24) {
      return 'TikTok handle too long (max 24 characters)';
    }
    return null;
  },
};

/**
 * Date validators
 */
export const dateValidators = {
  /**
   * Validate that a date is in the future
   */
  futureDate: (value: string): string | null => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    if (date <= new Date()) {
      return 'Date must be in the future';
    }
    return null;
  },

  /**
   * Validate that a date is in the past
   */
  pastDate: (value: string): string | null => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    if (date >= new Date()) {
      return 'Date must be in the past';
    }
    return null;
  },

  /**
   * Create a date range validator
   */
  dateAfter: (afterDate: string, fieldName = 'start date'): ValidatorFn => (value: string): string | null => {
    if (!value || !afterDate) return null;
    const date = new Date(value);
    const after = new Date(afterDate);
    if (date <= after) {
      return `Must be after ${fieldName}`;
    }
    return null;
  },

  /**
   * Validate graduation year (current year to +6 years)
   */
  graduationYear: (value: string): string | null => {
    if (!value) return null;
    const year = parseInt(value, 10);
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < currentYear || year > currentYear + 6) {
      return `Graduation year must be between ${currentYear} and ${currentYear + 6}`;
    }
    return null;
  },
};

/* ===============================================================================
   PASSWORD STRENGTH
   =============================================================================== */

export interface PasswordStrength {
  score: number; // 0-4
  label: 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
}

/**
 * Calculate password strength with detailed feedback
 */
export function getPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  if (!password) {
    return { score: 0, label: 'weak', feedback: ['Enter a password'] };
  }

  // Length checks
  if (password.length >= 8) {
    score++;
  } else {
    feedback.push('Use at least 8 characters');
  }

  if (password.length >= 12) {
    score++;
  }

  // Character variety checks
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) {
    score++;
  } else {
    feedback.push('Include uppercase and lowercase letters');
  }

  if (/[0-9]/.test(password)) {
    score++;
  } else {
    feedback.push('Include at least one number');
  }

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score++;
  } else {
    feedback.push('Include a special character');
  }

  // Cap at 4
  score = Math.min(4, score);

  const labels: Record<number, 'weak' | 'fair' | 'good' | 'strong'> = {
    0: 'weak',
    1: 'weak',
    2: 'fair',
    3: 'good',
    4: 'strong',
  };

  return {
    score,
    label: labels[score],
    feedback,
  };
}

/* ===============================================================================
   FORMATTING UTILITIES
   =============================================================================== */

/**
 * Format phone number for display (US format)
 */
export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return value;
}

/**
 * Strip phone number formatting
 */
export function stripPhoneNumber(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Format GPA for display (validation context)
 */
export function formatGPAValue(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.00';
  return num.toFixed(2);
}

/**
 * Format currency input (strips non-numeric except decimal)
 */
export function formatCurrencyInput(value: string): string {
  // Remove non-numeric except decimal
  const cleaned = value.replace(/[^\d.]/g, '');

  // Ensure only one decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('');
  }

  // Limit decimal places to 2
  if (parts[1] && parts[1].length > 2) {
    return parts[0] + '.' + parts[1].slice(0, 2);
  }

  return cleaned;
}

/**
 * Format social handle (removes @ if present)
 */
export function formatSocialHandle(value: string): string {
  return value.startsWith('@') ? value.slice(1) : value;
}

/**
 * Check if code is running in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

/**
 * Sanitize text input - strips ALL HTML tags and returns plain text only
 * Uses DOMPurify for robust XSS protection on the client side.
 * On the server (SSR), returns input unchanged (sanitization should happen client-side).
 *
 * @param value - The string to sanitize
 * @returns Plain text with all HTML stripped and whitespace trimmed
 */
export function sanitizeText(value: string): string {
  if (!value) return '';

  // On server-side (SSR), return trimmed input unchanged
  // Sanitization will happen on client hydration
  if (!isBrowser()) {
    return value.trim();
  }

  // Use DOMPurify with ALLOWED_TAGS=[] to strip ALL HTML
  // RETURN_DOM_FRAGMENT=false and RETURN_DOM=false ensure we get a string
  const sanitized = DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [], // Strip all attributes
    KEEP_CONTENT: true, // Keep text content from stripped tags
  });

  return sanitized.trim();
}

/**
 * Configuration for allowed HTML tags in sanitizeHtml
 */
const SAFE_HTML_CONFIG: Config = {
  // Allow only safe formatting tags
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'a', 'span'],
  // Allow only safe attributes
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  // Require rel="noopener noreferrer" for security on external links
  ADD_ATTR: ['target'],
  // Allow only safe URI schemes for href
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  // Forbid dangerous protocols
  FORBID_ATTR: ['onclick', 'onerror', 'onload', 'onmouseover', 'onfocus', 'onblur', 'style'],
};

/**
 * Sanitize HTML content - allows safe formatting tags while stripping dangerous content
 * Uses DOMPurify for robust XSS protection on the client side.
 * On the server (SSR), returns input unchanged (sanitization should happen client-side).
 *
 * Allowed tags: p, br, strong, em, b, i, ul, ol, li, a, span
 * Allowed attributes: href (sanitized), target, rel, class
 * Blocked: All event handlers (onclick, onerror, etc.), javascript: URIs, style attributes
 *
 * @param value - The HTML string to sanitize
 * @returns Sanitized HTML with only safe tags and attributes
 */
export function sanitizeHtml(value: string): string {
  if (!value) return '';

  // On server-side (SSR), return input unchanged
  // Sanitization will happen on client hydration
  if (!isBrowser()) {
    return value;
  }

  // Configure DOMPurify hooks to add security attributes to links
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // Add rel="noopener noreferrer" to all links for security
    if (node.tagName === 'A') {
      node.setAttribute('rel', 'noopener noreferrer');
      // Default external links to open in new tab
      if (node.getAttribute('href')?.startsWith('http')) {
        node.setAttribute('target', '_blank');
      }
    }
  });

  const sanitized = DOMPurify.sanitize(value, SAFE_HTML_CONFIG);

  // Remove the hook to avoid affecting other sanitization calls
  DOMPurify.removeHook('afterSanitizeAttributes');

  return sanitized;
}

/* ===============================================================================
   PAYMENT VALIDATORS
   =============================================================================== */

export const paymentValidators = {
  /**
   * Validates US bank routing number (9 digits with ABA checksum)
   */
  routingNumber: (value: string): string | null => {
    if (!value) return null;
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 9) {
      return 'Routing number must be 9 digits';
    }
    // ABA checksum validation
    const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1];
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(digits[i]) * weights[i];
    }
    if (sum % 10 !== 0) {
      return 'Invalid routing number';
    }
    return null;
  },

  /**
   * Validates bank account number (4-17 digits)
   */
  accountNumber: (value: string): string | null => {
    if (!value) return null;
    const digits = value.replace(/\D/g, '');
    if (digits.length < 4 || digits.length > 17) {
      return 'Account number must be 4-17 digits';
    }
    return null;
  },

  /**
   * Validates PayPal email or phone
   */
  paypalAccount: (value: string): string | null => {
    if (!value) return null;
    // Check if it's an email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Check if it's a phone number
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    const cleaned = value.replace(/[\s\-\(\)\.]/g, '');

    if (!emailRegex.test(value) && !phoneRegex.test(cleaned)) {
      return 'Enter a valid email or phone number';
    }
    return null;
  },

  /**
   * Validates Venmo username
   */
  venmoUsername: (value: string): string | null => {
    if (!value) return null;
    const username = value.startsWith('@') ? value.slice(1) : value;
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return 'Invalid Venmo username';
    }
    if (username.length < 5 || username.length > 30) {
      return 'Venmo username must be 5-30 characters';
    }
    return null;
  },

  /**
   * Validates US zip code
   */
  zipCode: (value: string): string | null => {
    if (!value) return null;
    if (!/^\d{5}(-\d{4})?$/.test(value)) {
      return 'Enter a valid ZIP code (12345 or 12345-6789)';
    }
    return null;
  },

  /**
   * Validates US state abbreviation
   */
  stateCode: (value: string): string | null => {
    if (!value) return null;
    const states = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
    ];
    if (!states.includes(value.toUpperCase())) {
      return 'Enter a valid state abbreviation';
    }
    return null;
  },
};

/* ===============================================================================
   VIDEO URL VALIDATORS
   =============================================================================== */

export const videoValidators = {
  /**
   * Validates YouTube URL
   */
  youtubeUrl: (value: string): string | null => {
    if (!value) return null;
    try {
      const url = new URL(value);
      const isYoutube =
        url.hostname.includes('youtube.com') ||
        url.hostname.includes('youtu.be');
      if (!isYoutube) {
        return 'Please enter a valid YouTube URL';
      }
      return null;
    } catch {
      return 'Please enter a valid URL';
    }
  },

  /**
   * Validates TikTok URL
   */
  tiktokUrl: (value: string): string | null => {
    if (!value) return null;
    try {
      const url = new URL(value);
      if (!url.hostname.includes('tiktok.com')) {
        return 'Please enter a valid TikTok URL';
      }
      return null;
    } catch {
      return 'Please enter a valid URL';
    }
  },

  /**
   * Validates either YouTube or TikTok URL
   */
  highlightUrl: (value: string): string | null => {
    if (!value) return null;
    try {
      const url = new URL(value);
      const isYoutube =
        url.hostname.includes('youtube.com') ||
        url.hostname.includes('youtu.be');
      const isTiktok = url.hostname.includes('tiktok.com');

      if (!isYoutube && !isTiktok) {
        return 'Please enter a YouTube or TikTok URL';
      }
      return null;
    } catch {
      return 'Please enter a valid URL';
    }
  },
};

/**
 * Detect video platform from URL
 */
export function detectVideoPlatform(url: string): 'youtube' | 'tiktok' | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
      return 'youtube';
    }
    if (parsed.hostname.includes('tiktok.com')) {
      return 'tiktok';
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract YouTube video ID from URL
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    // youtube.com/watch?v=VIDEO_ID
    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v');
    }
    // youtu.be/VIDEO_ID
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Mask sensitive account number for display
 */
export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length < 4) return '****';
  return '****' + accountNumber.slice(-4);
}

/* ===============================================================================
   ADDITIONAL VALIDATORS FOR VALIDATED INPUT COMPONENT
   =============================================================================== */

/**
 * Username validators
 */
export const usernameValidators = {
  /**
   * Validates alphanumeric username with underscores allowed
   */
  alphanumeric: (value: string): string | null => {
    if (!value) return null;
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return 'Only letters, numbers, and underscores allowed';
    }
    return null;
  },

  /**
   * Validates username starts with a letter
   */
  startsWithLetter: (value: string): string | null => {
    if (!value) return null;
    if (!/^[a-zA-Z]/.test(value)) {
      return 'Must start with a letter';
    }
    return null;
  },

  /**
   * Creates a username validator with all rules
   */
  username: (value: string): string | null => {
    if (!value) return null;
    if (value.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (value.length > 20) {
      return 'Username must be 20 characters or less';
    }
    if (!/^[a-zA-Z]/.test(value)) {
      return 'Username must start with a letter';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return 'Only letters, numbers, and underscores allowed';
    }
    return null;
  },
};

/**
 * Name validators
 */
export const nameValidators = {
  /**
   * Validates name contains only letters, spaces, hyphens, and apostrophes
   */
  name: (value: string): string | null => {
    if (!value) return null;
    if (!/^[a-zA-Z\s'-]+$/.test(value)) {
      return 'Please enter a valid name';
    }
    return null;
  },

  /**
   * Validates first name (no spaces)
   */
  firstName: (value: string): string | null => {
    if (!value) return null;
    if (!/^[a-zA-Z'-]+$/.test(value)) {
      return 'Please enter a valid first name';
    }
    if (value.length < 2) {
      return 'First name must be at least 2 characters';
    }
    return null;
  },

  /**
   * Validates last name (no spaces)
   */
  lastName: (value: string): string | null => {
    if (!value) return null;
    if (!/^[a-zA-Z'-]+$/.test(value)) {
      return 'Please enter a valid last name';
    }
    if (value.length < 2) {
      return 'Last name must be at least 2 characters';
    }
    return null;
  },
};

/**
 * Confirm field validator creator
 * Creates a validator that checks if value matches another field
 */
export function confirmField(
  getOriginalValue: () => string,
  fieldName = 'password'
): ValidatorFn {
  return (value: string): string | null => {
    if (!value) return null;
    const original = getOriginalValue();
    if (value !== original) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}s do not match`;
    }
    return null;
  };
}

/**
 * Extended GPA validator with customizable scale
 */
export function gpaValidator(maxGpa: number = 4.0): ValidatorFn {
  return (value: string): string | null => {
    if (!value) return null;
    const num = parseFloat(value);
    if (isNaN(num)) {
      return 'Please enter a valid GPA';
    }
    if (num < 0) {
      return 'GPA cannot be negative';
    }
    if (num > maxGpa) {
      return `GPA must be ${maxGpa.toFixed(2)} or less`;
    }
    // Check for proper decimal format (up to 2 decimal places)
    if (!/^\d+(\.\d{1,2})?$/.test(value)) {
      return 'GPA format should be like 3.50';
    }
    return null;
  };
}

/**
 * Creates an async-compatible validator wrapper
 * Useful for server-side validation like checking email availability
 */
export function createAsyncValidator(
  asyncFn: (value: string) => Promise<string | null>,
  loadingMessage = 'Checking...'
): {
  validate: (value: string) => Promise<string | null>;
  getLoadingMessage: () => string;
} {
  return {
    validate: asyncFn,
    getLoadingMessage: () => loadingMessage,
  };
}
