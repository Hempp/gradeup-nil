'use client';

import { useId } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface RangeSliderProps {
  /** Label displayed above the slider */
  label: string;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Step increment */
  step: number;
  /** Current value */
  value: number;
  /** Callback when value changes */
  onChange: (value: number) => void;
  /** Function to format the displayed value */
  formatValue: (value: number) => string;
  /** Additional CSS classes for the container */
  className?: string;
  /** Whether the slider is disabled */
  disabled?: boolean;
  /** Custom aria-label for the slider */
  ariaLabel?: string;
  /** Show min/max labels */
  showMinMax?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * RangeSlider - A reusable accessible range slider component
 *
 * Features:
 * - Full ARIA support (aria-valuemin, aria-valuemax, aria-valuenow, aria-valuetext)
 * - Live region for screen reader announcements
 * - Customizable value formatting
 * - Keyboard accessible (arrow keys, home, end)
 * - Styled with CSS variables for theme compatibility
 *
 * @example
 * ```tsx
 * <RangeSlider
 *   label="Engagement Rate"
 *   min={0}
 *   max={10}
 *   step={0.5}
 *   value={engagementMin}
 *   onChange={setEngagementMin}
 *   formatValue={(v) => `${v}%+`}
 * />
 * ```
 */
export function RangeSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  formatValue,
  className = '',
  disabled = false,
  ariaLabel,
  showMinMax = false,
}: RangeSliderProps) {
  const sliderId = useId();

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor={sliderId}
          className="text-xs font-medium text-[var(--text-muted)]"
        >
          {label}
        </label>
        <span
          className="text-xs font-medium text-[var(--color-primary)]"
          aria-live="polite"
        >
          {formatValue(value)}
        </span>
      </div>
      <input
        id={sliderId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        aria-label={ariaLabel || label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={formatValue(value)}
        className={`
          w-full h-2 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer
          accent-[var(--color-primary)]
          transition-opacity duration-150
          focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-card)]
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      />
      {showMinMax && (
        <div className="flex justify-between mt-1 text-xs text-[var(--text-muted)]">
          <span>{formatValue(min)}</span>
          <span>{formatValue(max)}</span>
        </div>
      )}
    </div>
  );
}

export default RangeSlider;
