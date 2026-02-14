'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface MultiSelectDropdownOption {
  value: string;
  label: string;
}

export interface MultiSelectDropdownProps {
  /** Label displayed above the dropdown */
  label: string;
  /** Array of options - can be strings or objects with value/label */
  options: string[] | MultiSelectDropdownOption[];
  /** Currently selected values */
  selected: string[];
  /** Callback when selection changes */
  onChange: (values: string[]) => void;
  /** Placeholder text when nothing is selected */
  placeholder?: string;
  /** Additional CSS classes for the container */
  className?: string;
  /** Whether the dropdown is disabled */
  disabled?: boolean;
  /** Custom aria-label for the dropdown button */
  ariaLabel?: string;
  /** Maximum number of items to show before scrolling */
  maxDisplayItems?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * MultiSelectDropdown - A reusable multi-select dropdown component
 *
 * Features:
 * - Keyboard accessible (Enter/Space to toggle, Escape to close)
 * - Click outside to close
 * - Support for string or object options
 * - Visual feedback for selected count
 * - Customizable styling via CSS variables
 *
 * @example
 * ```tsx
 * <MultiSelectDropdown
 *   label="Sports"
 *   options={['Basketball', 'Football', 'Soccer']}
 *   selected={selectedSports}
 *   onChange={setSelectedSports}
 *   placeholder="All sports"
 * />
 * ```
 */
export function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select...',
  className = '',
  disabled = false,
  ariaLabel,
  maxDisplayItems = 10,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Normalize options to always have value/label pairs
  const normalizedOptions: MultiSelectDropdownOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  // Toggle a single option
  const toggleOption = useCallback((value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
  }, [selected, onChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        setIsOpen(!isOpen);
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
    }
  }, [disabled, isOpen]);

  // Handle option keyboard navigation
  const handleOptionKeyDown = useCallback((e: React.KeyboardEvent, value: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleOption(value);
    }
  }, [toggleOption]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Generate display text
  const displayText = selected.length === 0
    ? placeholder
    : `${selected.length} selected`;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
        {label}
      </label>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-label={ariaLabel || `${label} dropdown, ${displayText}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`
          w-full h-10 px-3 text-left
          rounded-[var(--radius-md)]
          bg-[var(--bg-secondary)] border border-[var(--border-color)]
          text-sm text-[var(--text-primary)]
          transition-colors duration-[var(--transition-fast)]
          focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
          flex items-center justify-between
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[var(--text-muted)]'}
        `}
      >
        <span className={selected.length === 0 ? 'text-[var(--text-muted)]' : ''}>
          {displayText}
        </span>
        <svg
          className={`h-4 w-4 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && !disabled && (
        <>
          {/* Backdrop for click-outside handling */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          {/* Dropdown panel */}
          <div
            role="listbox"
            aria-label={`${label} options`}
            aria-multiselectable="true"
            className="absolute z-20 mt-1 w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-md)] shadow-lg overflow-auto"
            style={{ maxHeight: `${maxDisplayItems * 40}px` }}
          >
            {normalizedOptions.map((option) => {
              const isSelected = selected.includes(option.value);
              return (
                <label
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => handleOptionKeyDown(e, option.value)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--bg-tertiary)] cursor-pointer focus:bg-[var(--bg-tertiary)] focus:outline-none"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOption(option.value)}
                    tabIndex={-1}
                    className="h-4 w-4 rounded border-[var(--border-color)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">{option.label}</span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default MultiSelectDropdown;
