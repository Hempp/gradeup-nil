'use client';

import { Input } from '@/components/ui/input';

interface FormInputProps {
  /** Unique identifier for the input */
  id: string;
  /** Form field name */
  name: string;
  /** Label text displayed above the input */
  label: string;
  /** Input type (text, email, password, tel, url, etc.) */
  type?: string;
  /** Placeholder text */
  placeholder?: string;
  /** HTML autocomplete attribute */
  autoComplete?: string;
  /** Current input value */
  value: string;
  /** Change handler - supports both input and select for form compatibility */
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  /** Blur handler for validation */
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether the field has been touched (for showing errors) */
  touched?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Icon to display inside the input */
  icon?: React.ReactNode;
  /** Whether the field is optional (shows "(Optional)" label) */
  optional?: boolean;
  /** Whether the field is required (adds aria-required) */
  required?: boolean;
  /** Additional className for the container */
  className?: string;
}

/**
 * A form input component with built-in label, error display, and accessibility attributes.
 * Reduces boilerplate for form fields by combining Input with standard patterns.
 *
 * @example
 * ```tsx
 * <FormInput
 *   id="email"
 *   name="email"
 *   label="Email Address"
 *   type="email"
 *   placeholder="you@example.com"
 *   value={values.email}
 *   onChange={handleInputChange}
 *   onBlur={handleFieldBlur}
 *   touched={touched.email}
 *   error={fieldErrors.email}
 *   required
 * />
 * ```
 */
export function FormInput({
  id,
  name,
  label,
  type = 'text',
  placeholder,
  autoComplete,
  value,
  onChange,
  onBlur,
  disabled,
  touched,
  error,
  icon,
  optional = false,
  required = true,
  className = '',
}: FormInputProps) {
  const hasError = touched && error;
  const errorId = `${id}-error`;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-[var(--neutral-900)]"
      >
        {label}
        {optional && (
          <span className="font-normal text-[var(--neutral-400)]"> (Optional)</span>
        )}
      </label>
      <Input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        error={!!hasError}
        aria-invalid={!!hasError}
        aria-describedby={hasError ? errorId : undefined}
        aria-required={required && !optional}
        icon={icon}
      />
      {hasError && (
        <p id={errorId} className="text-xs text-[var(--error-600)]" role="alert" aria-live="assertive">
          {error}
        </p>
      )}
    </div>
  );
}

interface FormSelectProps {
  /** Unique identifier for the select */
  id: string;
  /** Form field name */
  name: string;
  /** Label text displayed above the select */
  label: string;
  /** Current selected value */
  value: string;
  /** Change handler - supports both input and select for form compatibility */
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  /** Blur handler for validation */
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => void;
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Whether the field has been touched (for showing errors) */
  touched?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Options to display in the select */
  options: string[] | { value: string; label: string }[];
  /** Placeholder option text */
  placeholder?: string;
  /** Whether the field is optional */
  optional?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Additional className for the container */
  className?: string;
}

/**
 * A form select component with built-in label, error display, and accessibility attributes.
 *
 * @example
 * ```tsx
 * <FormSelect
 *   id="division"
 *   name="division"
 *   label="Division"
 *   value={values.division}
 *   onChange={handleInputChange}
 *   onBlur={handleFieldBlur}
 *   touched={touched.division}
 *   error={fieldErrors.division}
 *   options={['NCAA Division I', 'NCAA Division II', 'NAIA']}
 *   placeholder="Select division"
 *   required
 * />
 * ```
 */
export function FormSelect({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  disabled,
  touched,
  error,
  options,
  placeholder = 'Select an option',
  optional = false,
  required = true,
  className = '',
}: FormSelectProps) {
  const hasError = touched && error;
  const errorId = `${id}-error`;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-[var(--neutral-900)]"
      >
        {label}
        {optional && (
          <span className="font-normal text-[var(--neutral-400)]"> (Optional)</span>
        )}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        aria-invalid={!!hasError}
        aria-describedby={hasError ? errorId : undefined}
        aria-required={required && !optional}
        className={`w-full h-10 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed ${
          hasError ? 'border-[var(--error-600)]' : 'border-[var(--border-color)]'
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => {
          const optionValue = typeof option === 'string' ? option : option.value;
          const optionLabel = typeof option === 'string' ? option : option.label;
          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
      {hasError && (
        <p id={errorId} className="text-xs text-[var(--error-600)]" role="alert" aria-live="assertive">
          {error}
        </p>
      )}
    </div>
  );
}

interface FormCheckboxProps {
  /** Unique identifier for the checkbox */
  id: string;
  /** Form field name */
  name: string;
  /** Whether the checkbox is checked */
  checked: boolean;
  /** Change handler */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Whether the checkbox is disabled */
  disabled?: boolean;
  /** Whether the checkbox is required */
  required?: boolean;
  /** Label content (can include JSX for links) */
  children: React.ReactNode;
  /** Additional className for the container */
  className?: string;
}

/**
 * A form checkbox component with built-in label and accessibility attributes.
 *
 * @example
 * ```tsx
 * <FormCheckbox
 *   id="agreeToTerms"
 *   name="agreeToTerms"
 *   checked={agreeToTerms}
 *   onChange={handleInputChange}
 *   required
 * >
 *   I agree to the <Link href="/terms">Terms</Link>
 * </FormCheckbox>
 * ```
 */
export function FormCheckbox({
  id,
  name,
  checked,
  onChange,
  disabled,
  required = true,
  children,
  className = '',
}: FormCheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-3 cursor-pointer ${className}`}
    >
      <input
        id={id}
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-required={required}
        className="mt-0.5 w-4 h-4 rounded border-[var(--surface-200)] text-[var(--primary-500)] focus:ring-[var(--primary-500)] focus:ring-offset-0"
      />
      <span className="text-sm text-[var(--neutral-600)]">{children}</span>
    </label>
  );
}
