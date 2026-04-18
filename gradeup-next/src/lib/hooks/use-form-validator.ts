'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES & INTERFACES
   ═══════════════════════════════════════════════════════════════════════════ */

export type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

export interface FieldValidation {
  /** Validation status for this field */
  status: ValidationStatus;
  /** Error message if invalid */
  error: string | null;
  /** Whether field has been touched/modified */
  touched: boolean;
  /** Whether field is currently being validated (async) */
  isValidating: boolean;
}

export interface ValidationRule<T = unknown> {
  /** Validation function - return error message or null if valid */
  validate: (value: T, allValues: Record<string, unknown>) => string | null | Promise<string | null>;
  /** Run this validation only when specific fields change */
  dependsOn?: string[];
  /** Debounce validation in ms (for async validations) */
  debounceMs?: number;
}

export interface FieldConfig<T = unknown> {
  /** Initial value */
  initialValue: T;
  /** Validation rules for this field */
  rules?: ValidationRule<T>[];
  /** Fields that should re-validate when this field changes */
  triggers?: string[];
}

export interface FormValidatorOptions<T extends Record<string, unknown>> {
  /** Field configurations */
  fields: { [K in keyof T]: FieldConfig<T[K]> };
  /** Callback when form becomes valid/invalid */
  onValidityChange?: (isValid: boolean) => void;
  /** Validate on change (default: true) */
  validateOnChange?: boolean;
  /** Validate on blur (default: true) */
  validateOnBlur?: boolean;
  /** Debounce all validations (default: 150ms) */
  debounceMs?: number;
}

export interface UseFormValidatorResult<T extends Record<string, unknown>> {
  /** Current form values */
  values: T;
  /** Validation state for each field */
  fields: Record<keyof T, FieldValidation>;
  /** Whether the entire form is valid */
  isValid: boolean;
  /** Whether any field is currently validating */
  isValidating: boolean;
  /** Whether the form has been modified */
  isDirty: boolean;
  /** Set a field value */
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  /** Set multiple values at once */
  setValues: (values: Partial<T>) => void;
  /** Mark a field as touched (trigger validation) */
  touchField: (field: keyof T) => void;
  /** Validate a specific field */
  validateField: (field: keyof T) => Promise<boolean>;
  /** Validate all fields */
  validateAll: () => Promise<boolean>;
  /** Reset form to initial values */
  reset: () => void;
  /** Get error message for a field */
  getError: (field: keyof T) => string | null;
  /** Check if a field is valid */
  isFieldValid: (field: keyof T) => boolean;
  /** Get props for form fields (for easy integration) */
  getFieldProps: <K extends keyof T>(field: K) => {
    value: T[K];
    onChange: (value: T[K]) => void;
    onBlur: () => void;
    error: string | null;
    isValidating: boolean;
    'aria-invalid': boolean;
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   CORE FORM VALIDATOR HOOK
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Advanced form validation hook with cross-field dependencies and async support.
 *
 * Features:
 * - Field-level and form-level validation
 * - Cross-field dependencies (password confirmation, etc.)
 * - Async validation support with debouncing
 * - Validation state machine (idle, validating, valid, invalid)
 * - Easy integration with form field components
 *
 * @example
 * const { values, fields, setValue, validateAll, getFieldProps } = useFormValidator({
 *   fields: {
 *     email: {
 *       initialValue: '',
 *       rules: [
 *         { validate: (v) => !v ? 'Email is required' : null },
 *         { validate: (v) => !v.includes('@') ? 'Invalid email' : null },
 *         { validate: async (v) => await checkEmailExists(v) ? 'Email taken' : null, debounceMs: 500 },
 *       ],
 *     },
 *     password: {
 *       initialValue: '',
 *       rules: [{ validate: (v) => v.length < 8 ? 'Min 8 characters' : null }],
 *       triggers: ['confirmPassword'], // Re-validate confirmPassword when password changes
 *     },
 *     confirmPassword: {
 *       initialValue: '',
 *       rules: [{
 *         validate: (v, all) => v !== all.password ? 'Passwords must match' : null,
 *         dependsOn: ['password'],
 *       }],
 *     },
 *   },
 * });
 *
 * // In JSX
 * <input {...getFieldProps('email')} />
 * {fields.email.error && <span className="error">{fields.email.error}</span>}
 */
export function useFormValidator<T extends Record<string, unknown>>(
  options: FormValidatorOptions<T>
): UseFormValidatorResult<T> {
  const {
    fields: fieldConfigs,
    onValidityChange,
    validateOnChange = true,
    validateOnBlur = true,
    debounceMs = 150,
  } = options;

  // Initialize values from configs
  const initialValues = useMemo(() => {
    const values: Record<string, unknown> = {};
    for (const [key, config] of Object.entries(fieldConfigs)) {
      values[key] = config.initialValue;
    }
    return values as T;
  }, [fieldConfigs]);

  // State
  const [values, setValuesState] = useState<T>(initialValues);
  const [fieldStates, setFieldStates] = useState<Record<keyof T, FieldValidation>>(() => {
    const states: Record<string, FieldValidation> = {};
    for (const key of Object.keys(fieldConfigs)) {
      states[key] = {
        status: 'idle',
        error: null,
        touched: false,
        isValidating: false,
      };
    }
    return states as Record<keyof T, FieldValidation>;
  });

  // Refs for debouncing and tracking
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const isMounted = useRef(true);
  const previousValidity = useRef<boolean | null>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      // Clear all timers on unmount
      for (const timer of Object.values(debounceTimers.current)) {
        clearTimeout(timer);
      }
    };
  }, []);

  // Validate a single field
  const validateField = useCallback(async (fieldName: keyof T): Promise<boolean> => {
    const config = fieldConfigs[fieldName];
    if (!config?.rules || config.rules.length === 0) {
      setFieldStates((prev) => ({
        ...prev,
        [fieldName]: { ...prev[fieldName], status: 'valid', error: null, isValidating: false },
      }));
      return true;
    }

    setFieldStates((prev) => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], status: 'validating', isValidating: true },
    }));

    const fieldValue = values[fieldName];
    let error: string | null = null;

    for (const rule of config.rules) {
      try {
        const result = await rule.validate(fieldValue, values as Record<string, unknown>);
        if (result) {
          error = result;
          break;
        }
      } catch (e) {
        error = 'Validation error';
        break;
      }
    }

    if (!isMounted.current) return false;

    setFieldStates((prev) => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        status: error ? 'invalid' : 'valid',
        error,
        isValidating: false,
      },
    }));

    return !error;
  }, [fieldConfigs, values]);

  // Validate all fields
  const validateAll = useCallback(async (): Promise<boolean> => {
    const fieldNames = Object.keys(fieldConfigs) as (keyof T)[];

    // Mark all fields as touched
    setFieldStates((prev) => {
      const newStates = { ...prev };
      for (const fieldName of fieldNames) {
        newStates[fieldName] = { ...newStates[fieldName], touched: true };
      }
      return newStates;
    });

    const results = await Promise.all(fieldNames.map(validateField));
    return results.every(Boolean);
  }, [fieldConfigs, validateField]);

  // Set a single field value
  const setValue = useCallback(<K extends keyof T>(fieldName: K, value: T[K]) => {
    setValuesState((prev) => ({ ...prev, [fieldName]: value }));

    if (validateOnChange) {
      // Clear existing timer
      if (debounceTimers.current[fieldName as string]) {
        clearTimeout(debounceTimers.current[fieldName as string]);
      }

      // Debounce validation
      debounceTimers.current[fieldName as string] = setTimeout(() => {
        validateField(fieldName);

        // Also validate triggered fields
        const config = fieldConfigs[fieldName];
        if (config?.triggers) {
          for (const triggeredField of config.triggers) {
            if (triggeredField in fieldConfigs) {
              validateField(triggeredField as keyof T);
            }
          }
        }
      }, debounceMs);
    }
  }, [validateOnChange, debounceMs, validateField, fieldConfigs]);

  // Set multiple values
  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState((prev) => ({ ...prev, ...newValues }));

    if (validateOnChange) {
      // Validate all changed fields after debounce
      if (debounceTimers.current['_batch']) {
        clearTimeout(debounceTimers.current['_batch']);
      }

      debounceTimers.current['_batch'] = setTimeout(() => {
        for (const fieldName of Object.keys(newValues) as (keyof T)[]) {
          validateField(fieldName);
        }
      }, debounceMs);
    }
  }, [validateOnChange, debounceMs, validateField]);

  // Touch a field (trigger validation on blur)
  const touchField = useCallback((fieldName: keyof T) => {
    setFieldStates((prev) => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], touched: true },
    }));

    if (validateOnBlur) {
      validateField(fieldName);
    }
  }, [validateOnBlur, validateField]);

  // Reset form
  const reset = useCallback(() => {
    setValuesState(initialValues);
    setFieldStates(() => {
      const states: Record<string, FieldValidation> = {};
      for (const key of Object.keys(fieldConfigs)) {
        states[key] = {
          status: 'idle',
          error: null,
          touched: false,
          isValidating: false,
        };
      }
      return states as Record<keyof T, FieldValidation>;
    });
  }, [initialValues, fieldConfigs]);

  // Get error for a field
  const getError = useCallback((fieldName: keyof T): string | null => {
    const field = fieldStates[fieldName];
    return field?.touched ? field.error : null;
  }, [fieldStates]);

  // Check if field is valid
  const isFieldValid = useCallback((fieldName: keyof T): boolean => {
    return fieldStates[fieldName]?.status === 'valid';
  }, [fieldStates]);

  // Get props for a field (for easy integration)
  const getFieldProps = useCallback(<K extends keyof T>(fieldName: K) => {
    const fieldState = fieldStates[fieldName];
    return {
      value: values[fieldName],
      onChange: (value: T[K]) => setValue(fieldName, value),
      onBlur: () => touchField(fieldName),
      error: fieldState?.touched ? fieldState.error : null,
      isValidating: fieldState?.isValidating || false,
      'aria-invalid': fieldState?.touched && fieldState?.status === 'invalid',
    };
  }, [values, fieldStates, setValue, touchField]);

  // Computed values
  const isValid = useMemo(() => {
    return Object.values(fieldStates).every(
      (field) => (field as FieldValidation).status === 'valid' || (field as FieldValidation).status === 'idle'
    );
  }, [fieldStates]);

  const isValidating = useMemo(() => {
    return Object.values(fieldStates).some((field) => (field as FieldValidation).isValidating);
  }, [fieldStates]);

  const isDirty = useMemo(() => {
    for (const [key, value] of Object.entries(values)) {
      if (value !== initialValues[key as keyof T]) {
        return true;
      }
    }
    return false;
  }, [values, initialValues]);

  // Notify on validity change
  useEffect(() => {
    if (previousValidity.current !== null && previousValidity.current !== isValid) {
      onValidityChange?.(isValid);
    }
    previousValidity.current = isValid;
  }, [isValid, onValidityChange]);

  return {
    values,
    fields: fieldStates,
    isValid,
    isValidating,
    isDirty,
    setValue,
    setValues,
    touchField,
    validateField,
    validateAll,
    reset,
    getError,
    isFieldValid,
    getFieldProps,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMMON VALIDATION RULES
   ═══════════════════════════════════════════════════════════════════════════ */

/** Required field validation */
export const required = (message = 'This field is required'): ValidationRule<unknown> => ({
  validate: (value) => {
    if (value === null || value === undefined || value === '') {
      return message;
    }
    if (Array.isArray(value) && value.length === 0) {
      return message;
    }
    return null;
  },
});

/** Minimum length validation */
export const minLength = (min: number, message?: string): ValidationRule<string> => ({
  validate: (value) => {
    if (typeof value === 'string' && value.length < min) {
      return message || `Must be at least ${min} characters`;
    }
    return null;
  },
});

/** Maximum length validation */
export const maxLength = (max: number, message?: string): ValidationRule<string> => ({
  validate: (value) => {
    if (typeof value === 'string' && value.length > max) {
      return message || `Must be no more than ${max} characters`;
    }
    return null;
  },
});

/** Email format validation */
export const email = (message = 'Please enter a valid email address'): ValidationRule<string> => ({
  validate: (value) => {
    if (typeof value !== 'string' || !value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : message;
  },
});

/** Pattern matching validation */
export const pattern = (regex: RegExp, message: string): ValidationRule<string> => ({
  validate: (value) => {
    if (typeof value !== 'string' || !value) return null;
    return regex.test(value) ? null : message;
  },
});

/** Matches another field validation (for password confirmation) */
export const matches = (fieldName: string, message?: string): ValidationRule<unknown> => ({
  validate: (value, allValues) => {
    if (value !== allValues[fieldName]) {
      return message || `Must match ${fieldName}`;
    }
    return null;
  },
  dependsOn: [fieldName],
});

/** Minimum number validation */
export const min = (minValue: number, message?: string): ValidationRule<number> => ({
  validate: (value) => {
    if (typeof value === 'number' && value < minValue) {
      return message || `Must be at least ${minValue}`;
    }
    return null;
  },
});

/** Maximum number validation */
export const max = (maxValue: number, message?: string): ValidationRule<number> => ({
  validate: (value) => {
    if (typeof value === 'number' && value > maxValue) {
      return message || `Must be no more than ${maxValue}`;
    }
    return null;
  },
});

/** GPA validation (0.0 - 4.0) */
export const gpa = (message = 'GPA must be between 0.0 and 4.0'): ValidationRule<number | string> => ({
  validate: (value) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue) || numValue < 0 || numValue > 4) {
      return message;
    }
    return null;
  },
});

/** Password strength validation */
export const passwordStrength = (options?: {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumber?: boolean;
  requireSpecial?: boolean;
}): ValidationRule<string> => {
  const {
    minLength: minLen = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumber = true,
    requireSpecial = false,
  } = options || {};

  return {
    validate: (value) => {
      if (typeof value !== 'string') return null;

      if (value.length < minLen) {
        return `Password must be at least ${minLen} characters`;
      }
      if (requireUppercase && !/[A-Z]/.test(value)) {
        return 'Password must contain an uppercase letter';
      }
      if (requireLowercase && !/[a-z]/.test(value)) {
        return 'Password must contain a lowercase letter';
      }
      if (requireNumber && !/\d/.test(value)) {
        return 'Password must contain a number';
      }
      if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
        return 'Password must contain a special character';
      }
      return null;
    },
  };
};

/** URL validation */
export const url = (message = 'Please enter a valid URL'): ValidationRule<string> => ({
  validate: (value) => {
    if (typeof value !== 'string' || !value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return message;
    }
  },
});

/** Phone number validation (basic) */
export const phone = (message = 'Please enter a valid phone number'): ValidationRule<string> => ({
  validate: (value) => {
    if (typeof value !== 'string' || !value) return null;
    // Remove common formatting characters
    const cleaned = value.replace(/[\s\-\(\)]/g, '');
    // Check if it's a reasonable phone number (10-15 digits, optionally starting with +)
    const phoneRegex = /^\+?\d{10,15}$/;
    return phoneRegex.test(cleaned) ? null : message;
  },
});
