'use client';

import {
  forwardRef,
  useState,
  useCallback,
  useId,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from 'react';
import { Eye, EyeOff, AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPasswordStrength, type PasswordStrength } from '@/lib/utils/validation';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string | null;
  hint?: string;
  icon?: ReactNode;
  rightIcon?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | null;
  hint?: string;
  fullWidth?: boolean;
  showCount?: boolean;
}

export interface PasswordFieldProps extends Omit<FormFieldProps, 'type'> {
  showStrength?: boolean;
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
// Form Field Component
// ═══════════════════════════════════════════════════════════════════════════

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  function FormField(
    {
      className,
      label,
      error,
      hint,
      icon,
      rightIcon,
      size = 'md',
      fullWidth = true,
      id,
      disabled,
      ...props
    },
    ref
  ) {
    const generatedId = useId();
    const inputId = id || `field-${props.name || generatedId}`;
    const hasError = !!error;

    return (
      <div className={cn('space-y-1.5', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--text-primary)]"
          >
            {label}
            {props.required && (
              <span className="text-[var(--color-error)] ml-0.5">*</span>
            )}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              <span className={iconSizes[size]}>{icon}</span>
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            className={cn(
              'w-full rounded-[var(--radius-md)]',
              'bg-[var(--bg-secondary)] border',
              'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
              'transition-colors duration-[var(--transition-fast)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent',
              sizeClasses[size],
              icon && 'pl-10',
              rightIcon && 'pr-10',
              hasError
                ? 'border-[var(--color-error)] focus:ring-[var(--color-error)]'
                : 'border-[var(--border-color)]',
              disabled && 'opacity-50 cursor-not-allowed bg-[var(--bg-tertiary)]',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              <span className={iconSizes[size]}>{rightIcon}</span>
            </div>
          )}

          {hasError && !rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-error)]">
              <AlertCircle className={iconSizes[size]} />
            </div>
          )}
        </div>

        {hasError && (
          <p
            id={`${inputId}-error`}
            className="text-sm text-[var(--color-error)] flex items-center gap-1"
            role="alert"
          >
            {error}
          </p>
        )}

        {hint && !hasError && (
          <p
            id={`${inputId}-hint`}
            className="text-sm text-[var(--text-muted)]"
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// TextArea Field Component
// ═══════════════════════════════════════════════════════════════════════════

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  function TextAreaField(
    {
      className,
      label,
      error,
      hint,
      fullWidth = true,
      showCount = false,
      maxLength,
      id,
      disabled,
      value,
      ...props
    },
    ref
  ) {
    const generatedId = useId();
    const inputId = id || `field-${props.name || generatedId}`;
    const hasError = !!error;
    const charCount = typeof value === 'string' ? value.length : 0;

    return (
      <div className={cn('space-y-1.5', fullWidth && 'w-full')}>
        {label && (
          <div className="flex items-center justify-between">
            <label
              htmlFor={inputId}
              className="block text-sm font-medium text-[var(--text-primary)]"
            >
              {label}
              {props.required && (
                <span className="text-[var(--color-error)] ml-0.5">*</span>
              )}
            </label>
            {showCount && maxLength && (
              <span className="text-xs text-[var(--text-muted)]">
                {charCount}/{maxLength}
              </span>
            )}
          </div>
        )}

        <textarea
          ref={ref}
          id={inputId}
          disabled={disabled}
          value={value}
          maxLength={maxLength}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          className={cn(
            'w-full rounded-[var(--radius-md)] px-3 py-2.5',
            'bg-[var(--bg-secondary)] border',
            'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
            'transition-colors duration-[var(--transition-fast)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent',
            'min-h-[100px] resize-y',
            hasError
              ? 'border-[var(--color-error)] focus:ring-[var(--color-error)]'
              : 'border-[var(--border-color)]',
            disabled && 'opacity-50 cursor-not-allowed bg-[var(--bg-tertiary)]',
            className
          )}
          {...props}
        />

        {hasError && (
          <p
            id={`${inputId}-error`}
            className="text-sm text-[var(--color-error)] flex items-center gap-1"
            role="alert"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </p>
        )}

        {hint && !hasError && (
          <p
            id={`${inputId}-hint`}
            className="text-sm text-[var(--text-muted)]"
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Password Field Component
// ═══════════════════════════════════════════════════════════════════════════

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField(
    { showStrength = false, value, ...props },
    ref
  ) {
    const [showPassword, setShowPassword] = useState(false);
    const [strength, setStrength] = useState<PasswordStrength | null>(null);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (showStrength) {
          setStrength(getPasswordStrength(e.target.value));
        }
        props.onChange?.(e);
      },
      [showStrength, props]
    );

    const strengthColors: Record<string, string> = {
      weak: 'bg-[var(--color-error)]',
      fair: 'bg-[var(--color-warning)]',
      good: 'bg-[var(--color-primary)]',
      strong: 'bg-[var(--color-success)]',
    };

    const strengthWidths: Record<number, string> = {
      0: 'w-0',
      1: 'w-1/4',
      2: 'w-2/4',
      3: 'w-3/4',
      4: 'w-full',
    };

    return (
      <div className="space-y-2">
        <FormField
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          value={value}
          {...props}
          onChange={handleChange}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 hover:text-[var(--text-primary)] transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          }
        />

        {showStrength && strength && (
          <div className="space-y-1">
            {/* Strength bar */}
            <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  strengthWidths[strength.score],
                  strengthColors[strength.label]
                )}
              />
            </div>

            {/* Strength label and feedback */}
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'text-xs font-medium capitalize',
                  strength.label === 'weak' && 'text-[var(--color-error)]',
                  strength.label === 'fair' && 'text-[var(--color-warning)]',
                  strength.label === 'good' && 'text-[var(--color-primary)]',
                  strength.label === 'strong' && 'text-[var(--color-success)]'
                )}
              >
                {strength.label}
              </span>
              {strength.score === 4 && (
                <Check className="h-3.5 w-3.5 text-[var(--color-success)]" />
              )}
            </div>

            {/* Feedback hints */}
            {strength.feedback.length > 0 && strength.score < 4 && (
              <ul className="text-xs text-[var(--text-muted)] space-y-0.5">
                {strength.feedback.map((hint, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
                    {hint}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Checkbox Field Component
// ═══════════════════════════════════════════════════════════════════════════

export interface CheckboxFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  description?: string;
  error?: string | null;
}

export const CheckboxField = forwardRef<HTMLInputElement, CheckboxFieldProps>(
  function CheckboxField(
    { className, label, description, error, id, disabled, ...props },
    ref
  ) {
    const inputId = id || `checkbox-${props.name || Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;

    return (
      <div className="space-y-1">
        <div className="flex items-start gap-3">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : undefined}
            className={cn(
              'h-4 w-4 mt-0.5 rounded',
              'border-[var(--border-color)] bg-[var(--bg-secondary)]',
              'text-[var(--color-primary)]',
              'focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-0',
              hasError && 'border-[var(--color-error)]',
              disabled && 'opacity-50 cursor-not-allowed',
              className
            )}
            {...props}
          />
          <div className="flex-1">
            <label
              htmlFor={inputId}
              className={cn(
                'text-sm font-medium cursor-pointer',
                disabled ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
              )}
            >
              {label}
            </label>
            {description && (
              <p className="text-sm text-[var(--text-muted)]">{description}</p>
            )}
          </div>
        </div>

        {hasError && (
          <p
            id={`${inputId}-error`}
            className="text-sm text-[var(--color-error)] flex items-center gap-1 pl-7"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Radio Group Component
// ═══════════════════════════════════════════════════════════════════════════

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  label?: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string | null;
  orientation?: 'horizontal' | 'vertical';
}

export function RadioGroup({
  name,
  label,
  options,
  value,
  onChange,
  error,
  orientation = 'vertical',
}: RadioGroupProps) {
  const hasError = !!error;

  return (
    <fieldset className="space-y-2">
      {label && (
        <legend className="text-sm font-medium text-[var(--text-primary)]">
          {label}
        </legend>
      )}

      <div
        className={cn(
          'flex gap-4',
          orientation === 'vertical' && 'flex-col'
        )}
        role="radiogroup"
      >
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex items-start gap-3 cursor-pointer',
              option.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange?.(e.target.value)}
              disabled={option.disabled}
              className={cn(
                'h-4 w-4 mt-0.5',
                'border-[var(--border-color)] bg-[var(--bg-secondary)]',
                'text-[var(--color-primary)]',
                'focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-0',
                hasError && 'border-[var(--color-error)]'
              )}
            />
            <div>
              <span
                className={cn(
                  'text-sm font-medium',
                  option.disabled ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
                )}
              >
                {option.label}
              </span>
              {option.description && (
                <p className="text-sm text-[var(--text-muted)]">
                  {option.description}
                </p>
              )}
            </div>
          </label>
        ))}
      </div>

      {hasError && (
        <p className="text-sm text-[var(--color-error)] flex items-center gap-1" role="alert">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </fieldset>
  );
}
