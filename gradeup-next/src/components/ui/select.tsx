'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  type ReactNode,
} from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string | null;
  hint?: string;
  disabled?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  name?: string;
  required?: boolean;
}

export interface MultiSelectProps extends Omit<SelectProps, 'value' | 'onChange'> {
  value?: string[];
  onChange?: (value: string[]) => void;
  maxSelections?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Size Configuration
// ═══════════════════════════════════════════════════════════════════════════

const sizeClasses = {
  sm: 'h-9 text-sm',
  md: 'h-10 text-sm',
  lg: 'h-12 text-base',
};

// ═══════════════════════════════════════════════════════════════════════════
// Select Component
// ═══════════════════════════════════════════════════════════════════════════

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  function Select(
    {
      options,
      value,
      onChange,
      placeholder = 'Select...',
      label,
      error,
      hint,
      disabled = false,
      searchable = false,
      clearable = false,
      fullWidth = true,
      size = 'md',
      className,
      name,
      required,
    },
    ref
  ) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);
    const hasError = !!error;

    // Filter options based on search
    const filteredOptions = searchable
      ? options.filter(
          (opt) =>
            opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            opt.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : options;

    // Close on outside click
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
          setSearchQuery('');
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when opening
    useEffect(() => {
      if (isOpen && searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [isOpen, searchable]);

    // Reset highlight when filtering
    useEffect(() => {
      setHighlightedIndex(0);
    }, [searchQuery]);

    // Keyboard navigation
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (!isOpen) {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault();
            setIsOpen(true);
          }
          return;
        }

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setHighlightedIndex((prev) =>
              prev < filteredOptions.length - 1 ? prev + 1 : 0
            );
            break;
          case 'ArrowUp':
            e.preventDefault();
            setHighlightedIndex((prev) =>
              prev > 0 ? prev - 1 : filteredOptions.length - 1
            );
            break;
          case 'Enter':
            e.preventDefault();
            if (filteredOptions[highlightedIndex] && !filteredOptions[highlightedIndex].disabled) {
              onChange?.(filteredOptions[highlightedIndex].value);
              setIsOpen(false);
              setSearchQuery('');
            }
            break;
          case 'Escape':
            e.preventDefault();
            setIsOpen(false);
            setSearchQuery('');
            break;
          case 'Tab':
            setIsOpen(false);
            setSearchQuery('');
            break;
        }
      },
      [isOpen, filteredOptions, highlightedIndex, onChange]
    );

    // Scroll highlighted option into view
    useEffect(() => {
      if (isOpen && listRef.current) {
        const highlightedEl = listRef.current.children[highlightedIndex] as HTMLElement;
        if (highlightedEl) {
          highlightedEl.scrollIntoView({ block: 'nearest' });
        }
      }
    }, [isOpen, highlightedIndex]);

    const handleSelect = (optionValue: string) => {
      onChange?.(optionValue);
      setIsOpen(false);
      setSearchQuery('');
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.('');
    };

    return (
      <div
        ref={containerRef}
        className={cn('relative', fullWidth && 'w-full')}
        onKeyDown={handleKeyDown}
      >
        {/* Hidden input for form submission */}
        {name && <input type="hidden" name={name} value={value || ''} />}

        {/* Label */}
        {label && (
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            {label}
            {required && <span className="text-[var(--color-error)] ml-0.5">*</span>}
          </label>
        )}

        {/* Trigger Button */}
        <button
          ref={ref}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={cn(
            'w-full flex items-center justify-between gap-2 px-3',
            'rounded-[var(--radius-md)] border',
            'bg-[var(--bg-secondary)] text-left',
            'transition-colors duration-[var(--transition-fast)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent',
            sizeClasses[size],
            hasError
              ? 'border-[var(--color-error)] focus:ring-[var(--color-error)]'
              : 'border-[var(--border-color)]',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
        >
          <span
            className={cn(
              'flex-1 truncate',
              selectedOption ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
            )}
          >
            {selectedOption ? (
              <span className="flex items-center gap-2">
                {selectedOption.icon}
                {selectedOption.label}
              </span>
            ) : (
              placeholder
            )}
          </span>

          <div className="flex items-center gap-1">
            {clearable && value && (
              <button
                type="button"
                onClick={handleClear}
                className="p-0.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label="Clear selection"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <ChevronDown
              className={cn(
                'h-4 w-4 text-[var(--text-muted)] transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </div>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            className={cn(
              'absolute z-50 mt-1 w-full',
              'bg-[var(--bg-card)] border border-[var(--border-color)]',
              'rounded-[var(--radius-md)] shadow-lg',
              'overflow-hidden animate-fade-in'
            )}
          >
            {/* Search Input */}
            {searchable && (
              <div className="p-2 border-b border-[var(--border-color)]">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className={cn(
                      'w-full h-8 pl-8 pr-3 text-sm',
                      'bg-[var(--bg-secondary)] border border-[var(--border-color)]',
                      'rounded-[var(--radius-sm)]',
                      'focus:outline-none focus:border-[var(--color-primary)]',
                      'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]'
                    )}
                  />
                </div>
              </div>
            )}

            {/* Options List */}
            <ul
              ref={listRef}
              role="listbox"
              className="max-h-60 overflow-auto py-1"
            >
              {filteredOptions.length === 0 ? (
                <li className="px-3 py-2 text-sm text-[var(--text-muted)] text-center">
                  No options found
                </li>
              ) : (
                filteredOptions.map((option, index) => (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={value === option.value}
                    aria-disabled={option.disabled}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      'px-3 py-2 cursor-pointer flex items-center gap-3',
                      'transition-colors duration-[var(--transition-fast)]',
                      index === highlightedIndex && 'bg-[var(--bg-tertiary)]',
                      value === option.value && 'text-[var(--color-primary)]',
                      option.disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {option.icon && (
                      <span className="flex-shrink-0">{option.icon}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{option.label}</p>
                      {option.description && (
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {option.description}
                        </p>
                      )}
                    </div>
                    {value === option.value && (
                      <Check className="h-4 w-4 flex-shrink-0 text-[var(--color-primary)]" />
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        {/* Error message */}
        {hasError && (
          <p className="mt-1.5 text-sm text-[var(--color-error)]" role="alert">
            {error}
          </p>
        )}

        {/* Hint */}
        {hint && !hasError && (
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">{hint}</p>
        )}
      </div>
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Multi Select Component
// ═══════════════════════════════════════════════════════════════════════════

export const MultiSelect = forwardRef<HTMLButtonElement, MultiSelectProps>(
  function MultiSelect(
    {
      options,
      value = [],
      onChange,
      placeholder = 'Select...',
      label,
      error,
      hint,
      disabled = false,
      searchable = false,
      fullWidth = true,
      size: _size = 'md',
      className,
      name,
      required,
      maxSelections,
    },
    ref
  ) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const hasError = !!error;
    const isMaxReached = maxSelections !== undefined && value.length >= maxSelections;

    // Filter options based on search
    const filteredOptions = searchable
      ? options.filter(
          (opt) =>
            opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            opt.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : options;

    // Close on outside click
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
          setSearchQuery('');
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when opening
    useEffect(() => {
      if (isOpen && searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [isOpen, searchable]);

    const handleToggle = (optionValue: string) => {
      if (value.includes(optionValue)) {
        onChange?.(value.filter((v) => v !== optionValue));
      } else if (!isMaxReached) {
        onChange?.([...value, optionValue]);
      }
    };

    const handleRemove = (optionValue: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.(value.filter((v) => v !== optionValue));
    };

    const selectedOptions = options.filter((opt) => value.includes(opt.value));

    return (
      <div
        ref={containerRef}
        className={cn('relative', fullWidth && 'w-full')}
      >
        {/* Hidden inputs for form submission */}
        {name &&
          value.map((v) => (
            <input key={v} type="hidden" name={`${name}[]`} value={v} />
          ))}

        {/* Label */}
        {label && (
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            {label}
            {required && <span className="text-[var(--color-error)] ml-0.5">*</span>}
          </label>
        )}

        {/* Trigger Button */}
        <button
          ref={ref}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={cn(
            'w-full flex items-center justify-between gap-2 px-3 min-h-[40px] py-1.5',
            'rounded-[var(--radius-md)] border',
            'bg-[var(--bg-secondary)] text-left',
            'transition-colors duration-[var(--transition-fast)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent',
            hasError
              ? 'border-[var(--color-error)] focus:ring-[var(--color-error)]'
              : 'border-[var(--border-color)]',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
        >
          <div className="flex-1 flex flex-wrap gap-1.5">
            {selectedOptions.length === 0 ? (
              <span className="text-[var(--text-muted)]">{placeholder}</span>
            ) : (
              selectedOptions.map((opt) => (
                <span
                  key={opt.value}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5',
                    'text-xs font-medium rounded-full',
                    'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                  )}
                >
                  {opt.label}
                  <button
                    type="button"
                    onClick={(e) => handleRemove(opt.value, e)}
                    className="hover:text-[var(--color-error)]"
                    aria-label={`Remove ${opt.label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            )}
          </div>

          <ChevronDown
            className={cn(
              'h-4 w-4 flex-shrink-0 text-[var(--text-muted)] transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            className={cn(
              'absolute z-50 mt-1 w-full',
              'bg-[var(--bg-card)] border border-[var(--border-color)]',
              'rounded-[var(--radius-md)] shadow-lg',
              'overflow-hidden animate-fade-in'
            )}
          >
            {/* Search Input */}
            {searchable && (
              <div className="p-2 border-b border-[var(--border-color)]">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className={cn(
                      'w-full h-8 pl-8 pr-3 text-sm',
                      'bg-[var(--bg-secondary)] border border-[var(--border-color)]',
                      'rounded-[var(--radius-sm)]',
                      'focus:outline-none focus:border-[var(--color-primary)]',
                      'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]'
                    )}
                  />
                </div>
              </div>
            )}

            {/* Max selection notice */}
            {isMaxReached && (
              <div className="px-3 py-2 text-xs text-[var(--text-muted)] bg-[var(--bg-tertiary)] border-b border-[var(--border-color)]">
                Maximum {maxSelections} selections reached
              </div>
            )}

            {/* Options List */}
            <ul role="listbox" className="max-h-60 overflow-auto py-1">
              {filteredOptions.length === 0 ? (
                <li className="px-3 py-2 text-sm text-[var(--text-muted)] text-center">
                  No options found
                </li>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = value.includes(option.value);
                  const isDisabled = option.disabled || (isMaxReached && !isSelected);

                  return (
                    <li
                      key={option.value}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={isDisabled}
                      onClick={() => !isDisabled && handleToggle(option.value)}
                      className={cn(
                        'px-3 py-2 cursor-pointer flex items-center gap-3',
                        'transition-colors duration-[var(--transition-fast)]',
                        'hover:bg-[var(--bg-tertiary)]',
                        isSelected && 'bg-[var(--color-primary)]/5',
                        isDisabled && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div
                        className={cn(
                          'h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center',
                          isSelected
                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                            : 'border-[var(--border-color)]'
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      {option.icon && (
                        <span className="flex-shrink-0">{option.icon}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{option.label}</p>
                        {option.description && (
                          <p className="text-xs text-[var(--text-muted)] truncate">
                            {option.description}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}

        {/* Error message */}
        {hasError && (
          <p className="mt-1.5 text-sm text-[var(--color-error)]" role="alert">
            {error}
          </p>
        )}

        {/* Hint */}
        {hint && !hasError && (
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">{hint}</p>
        )}
      </div>
    );
  }
);
