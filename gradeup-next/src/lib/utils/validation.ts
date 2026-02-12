'use client';

import { useState, useCallback } from 'react';

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
