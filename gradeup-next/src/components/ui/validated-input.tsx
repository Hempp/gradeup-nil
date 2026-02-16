'use client';

import {
  forwardRef,
  useState,
  useCallback,
  useEffect,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { Check, X, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ValidatorFn, getPasswordStrength } from '@/lib/utils/validation';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

export interface ValidatedInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text displayed above the input */
  label?: string;
  /** Hint text displayed below the input (when no error) */
  hint?: string;
  /** Left icon element */
  icon?: ReactNode;
  /** Input size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Make input full width */
  fullWidth?: boolean;
  /** Array of validator functions to run */
  validators?: ValidatorFn[];
  /** Validation mode: 'onChange' validates as user types, 'onBlur' validates on blur only */
  validateOn?: 'onChange' | 'onBlur' | 'both';
  /** Debounce delay for onChange validation (ms) */
  debounceMs?: number;
  /** External error message (overrides internal validation) */
  error?: string | null;
  /** Show success checkmark when valid */
  showSuccessIcon?: boolean;
  /** Callback when validation state changes */
  onValidationChange?: (state: ValidationState, error: string | null) => void;
  /** Theme variant */
  variant?: 'light' | 'dark';
}

export interface PasswordInputProps extends Omit<ValidatedInputProps, 'type'> {
  /** Show password strength indicator */
  showStrength?: boolean;
  /** Show requirements checklist */
  showRequirements?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Size Configuration
// ═══════════════════════════════════════════════════════════════════════════

const sizeClasses = {
  sm: 'h-9 text-sm px-3',
  md: 'h-10 text-sm px-3',
  lg: 'h-12 text-base px-4',
};

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

// ═══════════════════════════════════════════════════════════════════════════
// ValidatedInput Component
// ═══════════════════════════════════════════════════════════════════════════

export const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  function ValidatedInput(
    {
      className,
      label,
      hint,
      icon,
      size = 'md',
      fullWidth = true,
      validators = [],
      validateOn = 'both',
      debounceMs = 300,
      error: externalError,
      showSuccessIcon = true,
      onValidationChange,
      variant = 'light',
      id,
      disabled,
      value,
      onChange,
      onBlur,
      ...props
    },
    ref
  ) {
    const generatedId = useId();
    const inputId = id || `validated-field-${props.name || generatedId}`;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    const [internalError, setInternalError] = useState<string | null>(null);
    const [validationState, setValidationState] = useState<ValidationState>('idle');
    const [touched, setTouched] = useState(false);
    const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

    // Determine the actual error to display
    const displayError = externalError ?? internalError;
    const hasError = touched && !!displayError;
    const isValid = touched && validationState === 'valid' && !displayError;

    // Run validation against all validators
    const runValidation = useCallback(
      (inputValue: string): string | null => {
        for (const validator of validators) {
          const error = validator(inputValue);
          if (error) return error;
        }
        return null;
      },
      [validators]
    );

    // Update validation state and notify parent
    const updateValidationState = useCallback(
      (error: string | null) => {
        const newState: ValidationState = error ? 'invalid' : 'valid';
        setInternalError(error);
        setValidationState(newState);
        onValidationChange?.(newState, error);
      },
      [onValidationChange]
    );

    // Handle input change with optional debouncing
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(e);

        if (validateOn === 'onChange' || validateOn === 'both') {
          // Clear existing debounce timer
          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }

          // Set validating state immediately
          if (touched) {
            setValidationState('validating');
          }

          // Debounce the actual validation
          const timer = setTimeout(() => {
            if (touched || validateOn === 'onChange') {
              const error = runValidation(e.target.value);
              updateValidationState(error);
            }
          }, debounceMs);

          setDebounceTimer(timer);
        }
      },
      [onChange, validateOn, touched, debounceTimer, debounceMs, runValidation, updateValidationState]
    );

    // Handle blur - validate and mark as touched
    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        onBlur?.(e);
        setTouched(true);

        if (validateOn === 'onBlur' || validateOn === 'both') {
          // Clear any pending debounce
          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }

          const error = runValidation(e.target.value);
          updateValidationState(error);
        }
      },
      [onBlur, validateOn, debounceTimer, runValidation, updateValidationState]
    );

    // Clean up debounce timer on unmount
    useEffect(() => {
      return () => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
      };
    }, [debounceTimer]);

    // Theme-aware classes
    const isDark = variant === 'dark';

    return (
      <div className={cn('space-y-1.5', fullWidth && 'w-full', className)}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium',
              isDark ? 'text-white' : 'text-[var(--text-primary)]'
            )}
          >
            {label}
            {props.required && (
              <span className="text-[var(--color-error)] ml-0.5">*</span>
            )}
          </label>
        )}

        <div className="relative">
          {/* Left Icon */}
          {icon && (
            <div
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2',
                isDark ? 'text-[var(--marketing-gray-400)]' : 'text-[var(--text-muted)]'
              )}
              aria-hidden="true"
            >
              <span className={iconSizes[size]}>{icon}</span>
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? errorId : hint ? hintId : undefined
            }
            className={cn(
              'w-full rounded-[var(--radius-md)]',
              'border transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:border-transparent',
              sizeClasses[size],
              icon && 'pl-10',
              'pr-10', // Always reserve space for right icon
              // Theme-specific styles
              isDark
                ? cn(
                    'bg-[var(--marketing-gray-800)] text-white',
                    'placeholder:text-[var(--marketing-gray-500)]',
                    hasError
                      ? 'border-[var(--color-error)] focus:ring-[var(--color-error)]'
                      : isValid
                      ? 'border-[var(--color-success)] focus:ring-[var(--color-success)]'
                      : 'border-[var(--marketing-gray-700)] focus:ring-[var(--marketing-cyan)]'
                  )
                : cn(
                    'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
                    'placeholder:text-[var(--text-muted)]',
                    hasError
                      ? 'border-[var(--color-error)] focus:ring-[var(--color-error)]'
                      : isValid
                      ? 'border-[var(--color-success)] focus:ring-[var(--color-success)]'
                      : 'border-[var(--border-color)] focus:ring-[var(--color-primary)]'
                  ),
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            {...props}
          />

          {/* Right Icon - Validation State */}
          <div
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2',
              'transition-opacity duration-200'
            )}
            aria-hidden="true"
          >
            {hasError && (
              <X
                className={cn(
                  iconSizes[size],
                  'text-[var(--color-error)]'
                )}
              />
            )}
            {isValid && showSuccessIcon && (
              <Check
                className={cn(
                  iconSizes[size],
                  'text-[var(--color-success)]'
                )}
              />
            )}
            {validationState === 'validating' && touched && (
              <div
                className={cn(
                  iconSizes[size],
                  'border-2 border-t-transparent rounded-full animate-spin',
                  isDark ? 'border-[var(--marketing-cyan)]' : 'border-[var(--color-primary)]'
                )}
              />
            )}
          </div>
        </div>

        {/* Error Message with Animation */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-200 ease-out',
            hasError ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <p
            id={errorId}
            className={cn(
              'text-sm flex items-center gap-1.5 pt-0.5',
              'text-[var(--color-error)]'
            )}
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {displayError}
          </p>
        </div>

        {/* Hint Text (only when no error) */}
        {hint && !hasError && (
          <p
            id={hintId}
            className={cn(
              'text-sm',
              isDark ? 'text-[var(--marketing-gray-400)]' : 'text-[var(--text-muted)]'
            )}
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// PasswordStrengthIndicator Component
// ═══════════════════════════════════════════════════════════════════════════

export interface PasswordStrengthIndicatorProps {
  /** Password value to analyze */
  password: string;
  /** Show requirements checklist */
  showRequirements?: boolean;
  /** Theme variant */
  variant?: 'light' | 'dark';
  /** Additional class name */
  className?: string;
}

const strengthConfig = {
  weak: {
    color: 'var(--color-error)',
    bgColor: 'bg-[var(--color-error)]',
    width: 'w-1/4',
  },
  fair: {
    color: 'var(--color-warning)',
    bgColor: 'bg-[var(--color-warning)]',
    width: 'w-2/4',
  },
  good: {
    color: 'var(--color-primary)',
    bgColor: 'bg-[var(--color-primary)]',
    width: 'w-3/4',
  },
  strong: {
    color: 'var(--color-success)',
    bgColor: 'bg-[var(--color-success)]',
    width: 'w-full',
  },
};

const requirements = [
  { key: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { key: 'uppercase', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lowercase', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { key: 'number', label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { key: 'special', label: 'One special character', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export function PasswordStrengthIndicator({
  password,
  showRequirements = true,
  variant = 'light',
  className,
}: PasswordStrengthIndicatorProps) {
  const strength = getPasswordStrength(password);
  const config = strengthConfig[strength.label];
  const isDark = variant === 'dark';

  if (!password) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Strength Bar */}
      <div className="space-y-1">
        <div
          className={cn(
            'h-1.5 rounded-full overflow-hidden',
            isDark ? 'bg-[var(--marketing-gray-700)]' : 'bg-[var(--bg-tertiary)]'
          )}
        >
          <div
            className={cn(
              'h-full transition-all duration-300 ease-out rounded-full',
              config.width,
              config.bgColor
            )}
          />
        </div>

        {/* Strength Label */}
        <div className="flex items-center justify-between">
          <span
            className={cn('text-xs font-medium capitalize')}
            style={{ color: config.color }}
          >
            {strength.label}
          </span>
          {strength.score === 4 && (
            <Check className="h-3.5 w-3.5 text-[var(--color-success)]" />
          )}
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && strength.score < 4 && (
        <ul className="space-y-1">
          {requirements.map((req) => {
            const passed = req.test(password);
            return (
              <li
                key={req.key}
                className={cn(
                  'flex items-center gap-2 text-xs transition-colors duration-200',
                  passed
                    ? 'text-[var(--color-success)]'
                    : isDark
                    ? 'text-[var(--marketing-gray-400)]'
                    : 'text-[var(--text-muted)]'
                )}
              >
                {passed ? (
                  <Check className="h-3 w-3 flex-shrink-0" />
                ) : (
                  <div
                    className={cn(
                      'h-1.5 w-1.5 rounded-full flex-shrink-0',
                      isDark ? 'bg-[var(--marketing-gray-500)]' : 'bg-[var(--text-muted)]'
                    )}
                  />
                )}
                <span className={passed ? 'line-through opacity-70' : ''}>
                  {req.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PasswordInput Component (ValidatedInput + Strength Indicator)
// ═══════════════════════════════════════════════════════════════════════════

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    {
      showStrength = false,
      showRequirements = true,
      value,
      variant = 'light',
      ...props
    },
    ref
  ) {
    const [showPassword, setShowPassword] = useState(false);
    const [internalValue, setInternalValue] = useState(
      typeof value === 'string' ? value : ''
    );
    const isDark = variant === 'dark';

    // Keep internal value in sync with external value
    useEffect(() => {
      if (typeof value === 'string') {
        setInternalValue(value);
      }
    }, [value]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setInternalValue(e.target.value);
        props.onChange?.(e);
      },
      [props]
    );

    return (
      <div className="space-y-2">
        <div className="relative">
          <ValidatedInput
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            value={value}
            onChange={handleChange}
            variant={variant}
            {...props}
          />

          {/* Toggle Password Visibility Button */}
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={cn(
              'absolute right-8 top-[calc(50%+0.75rem)] -translate-y-1/2 p-1',
              'transition-colors duration-200',
              isDark
                ? 'text-[var(--marketing-gray-400)] hover:text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              // Adjust position if label is present
              props.label && 'top-[calc(50%+1.25rem)]'
            )}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Password Strength Indicator */}
        {showStrength && internalValue && (
          <PasswordStrengthIndicator
            password={internalValue}
            showRequirements={showRequirements}
            variant={variant}
          />
        )}
      </div>
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Preset Validation Rules
// ═══════════════════════════════════════════════════════════════════════════

export { validators } from '@/lib/utils/validation';
