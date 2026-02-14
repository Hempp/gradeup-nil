'use client';

import { forwardRef, useId, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════════════════════
   SWITCH TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'role'> {
  /** Whether the switch is on or off */
  checked: boolean;
  /** Callback when the switch is toggled */
  onCheckedChange: (checked: boolean) => void;
  /** Size of the switch */
  size?: 'sm' | 'md' | 'lg';
  /** Optional label for the switch (recommended for accessibility) */
  label?: string;
  /** Optional description text */
  description?: string;
  /** Whether to show the label visually (defaults to true if label provided) */
  showLabel?: boolean;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SIZE CONFIGURATION
   ═══════════════════════════════════════════════════════════════════════════ */

const sizeConfig = {
  sm: {
    track: 'h-5 w-9',
    thumb: 'h-3.5 w-3.5',
    thumbTranslate: 'translate-x-4',
    thumbStart: 'translate-x-0.5',
  },
  md: {
    track: 'h-6 w-11',
    thumb: 'h-4 w-4',
    thumbTranslate: 'translate-x-5',
    thumbStart: 'translate-x-1',
  },
  lg: {
    track: 'h-7 w-14',
    thumb: 'h-5 w-5',
    thumbTranslate: 'translate-x-7',
    thumbStart: 'translate-x-1',
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   SWITCH COMPONENT

   An accessible toggle switch that follows WAI-ARIA switch pattern.
   - Uses role="switch" for proper screen reader announcement
   - Supports keyboard navigation (Space/Enter to toggle)
   - Provides clear state feedback via aria-checked
   ═══════════════════════════════════════════════════════════════════════════ */

const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      className,
      checked,
      onCheckedChange,
      size = 'md',
      label,
      description,
      showLabel = true,
      disabled,
      id,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const switchId = id || `switch-${generatedId}`;
    const labelId = `${switchId}-label`;
    const descriptionId = `${switchId}-description`;
    const config = sizeConfig[size];

    const handleClick = () => {
      if (!disabled) {
        onCheckedChange(!checked);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      // Space and Enter should toggle the switch
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleClick();
      }
    };

    // Build aria-labelledby based on what's provided
    const computedAriaLabelledby = ariaLabelledby || (label && showLabel ? labelId : undefined);
    const computedAriaDescribedby = description ? descriptionId : undefined;

    // If no label is provided visually, require aria-label
    const computedAriaLabel = !label && !ariaLabelledby ? ariaLabel : undefined;

    const switchElement = (
      <button
        ref={ref}
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={computedAriaLabel}
        aria-labelledby={computedAriaLabelledby}
        aria-describedby={computedAriaDescribedby}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer items-center rounded-full',
          'transition-colors duration-200 ease-in-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          config.track,
          checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--border-color)]',
          className
        )}
        {...props}
      >
        {/* Thumb/knob */}
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block rounded-full bg-white shadow-sm ring-0',
            'transition-transform duration-200 ease-in-out',
            config.thumb,
            checked ? config.thumbTranslate : config.thumbStart
          )}
        />
      </button>
    );

    // If no label, return just the switch
    if (!label) {
      return switchElement;
    }

    // If label exists but showLabel is false, add visually hidden label
    if (!showLabel) {
      return (
        <>
          <span id={labelId} className="sr-only">
            {label}
          </span>
          {switchElement}
        </>
      );
    }

    // Return switch with visible label
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label
            id={labelId}
            htmlFor={switchId}
            className={cn(
              'text-sm font-medium cursor-pointer',
              disabled ? 'text-[var(--text-muted)] cursor-not-allowed' : 'text-[var(--text-primary)]'
            )}
          >
            {label}
          </label>
          {description && (
            <p id={descriptionId} className="text-sm text-[var(--text-muted)]">
              {description}
            </p>
          )}
        </div>
        {switchElement}
      </div>
    );
  }
);

Switch.displayName = 'Switch';

export { Switch };
