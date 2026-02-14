'use client';

import { forwardRef, useState, type HTMLAttributes, type ChangeEvent } from 'react';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════════════════════
   FILTER BAR TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export interface FilterOption {
  value: string;
  label: string;
}

export interface Filter {
  id: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

export interface FilterBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  filters?: Filter[];
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  /** Show filters in a collapsible drawer on mobile */
  mobileCollapsible?: boolean;
  /** Label for the mobile filter toggle button */
  mobileFilterLabel?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════════════════════════════════════ */

const SearchIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
    focusable="false"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
    focusable="false"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const FilterIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
    focusable="false"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const CloseIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
    focusable="false"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════════════
   FILTER SELECT COMPONENT (Touch-friendly)
   ═══════════════════════════════════════════════════════════════════════════ */

interface FilterSelectProps {
  filter: Filter;
  fullWidth?: boolean;
}

function FilterSelect({ filter, fullWidth = false }: FilterSelectProps) {
  return (
    <div className={cn('relative', fullWidth && 'w-full')}>
      <select
        id={filter.id}
        value={filter.value}
        onChange={(e) => filter.onChange(e.target.value)}
        className={cn(
          // Base styles
          'appearance-none',
          // Touch-friendly height (44px minimum tap target)
          'h-11 min-h-[44px] pl-3 pr-10',
          fullWidth ? 'w-full' : '',
          // Visual styles
          'rounded-[var(--radius-lg)]',
          'bg-[var(--bg-card)] border border-[var(--border-color)]',
          'text-sm text-[var(--text-primary)]',
          // Interactions
          'transition-all duration-[var(--transition-fast)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent',
          'hover:border-[var(--border-color-hover)]',
          'cursor-pointer',
          // Touch-specific
          'touch-manipulation'
        )}
        aria-label={filter.label}
      >
        <option value="">{filter.label}</option>
        {filter.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
        <ChevronDownIcon />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MOBILE FILTER DRAWER
   ═══════════════════════════════════════════════════════════════════════════ */

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: Filter[];
  activeFilterCount: number;
}

function MobileFilterDrawer({ isOpen, onClose, filters, activeFilterCount }: MobileFilterDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 md:hidden',
          'bg-[var(--bg-card)] rounded-t-[var(--radius-xl)]',
          'border-t border-[var(--border-color)]',
          'shadow-[var(--shadow-lg)]',
          'animate-slide-in-right',
          'max-h-[80vh] overflow-y-auto'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Filter options"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[var(--border-color)]" aria-hidden="true" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-[var(--color-primary)] text-white">
                {activeFilterCount}
              </span>
            )}
          </h3>
          <button
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors touch-manipulation"
            aria-label="Close filters"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Filter options */}
        <div className="p-4 space-y-4">
          {filters.map((filter) => (
            <div key={filter.id}>
              <label
                htmlFor={`mobile-${filter.id}`}
                className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
              >
                {filter.label}
              </label>
              <FilterSelect filter={{ ...filter, id: `mobile-${filter.id}` }} fullWidth />
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-[var(--border-color)] flex gap-3">
          <button
            onClick={() => {
              filters.forEach((f) => f.onChange(''));
            }}
            className="flex-1 h-11 min-h-[44px] px-4 rounded-[var(--radius-lg)] border border-[var(--border-color)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors touch-manipulation"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-11 min-h-[44px] px-4 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity touch-manipulation"
          >
            Apply
          </button>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FILTER BAR COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

const FilterBar = forwardRef<HTMLDivElement, FilterBarProps>(
  (
    {
      className,
      filters = [],
      searchValue = '',
      searchPlaceholder = 'Search...',
      onSearchChange,
      mobileCollapsible = true,
      mobileFilterLabel = 'Filters',
      ...props
    },
    ref
  ) => {
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

    const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
      onSearchChange?.(e.target.value);
    };

    const activeFilterCount = filters.filter((f) => f.value !== '').length;

    return (
      <>
        <div
          ref={ref}
          className={cn(
            'flex flex-wrap items-center gap-3',
            className
          )}
          {...props}
        >
          {/* Mobile: Filter toggle button */}
          {mobileCollapsible && filters.length > 0 && (
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className={cn(
                'md:hidden flex items-center gap-2',
                'h-11 min-h-[44px] px-4',
                'rounded-[var(--radius-lg)]',
                'bg-[var(--bg-card)] border border-[var(--border-color)]',
                'text-sm text-[var(--text-primary)]',
                'hover:border-[var(--border-color-hover)]',
                'transition-all duration-[var(--transition-fast)]',
                'touch-manipulation'
              )}
              aria-expanded={isMobileDrawerOpen}
              aria-controls="mobile-filter-drawer"
            >
              <FilterIcon />
              <span>{mobileFilterLabel}</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-[var(--color-primary)] text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}

          {/* Desktop: Filter dropdowns */}
          {filters.map((filter) => (
            <div key={filter.id} className="hidden md:block">
              <FilterSelect filter={filter} />
            </div>
          ))}

          {/* Search input - always visible */}
          {onSearchChange && (
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                value={searchValue}
                onChange={handleSearchChange}
                placeholder={searchPlaceholder}
                className={cn(
                  // Touch-friendly height
                  'w-full h-11 min-h-[44px] pl-3 pr-10',
                  // Visual styles
                  'rounded-[var(--radius-lg)]',
                  'bg-[var(--bg-card)] border border-[var(--border-color)]',
                  'text-sm text-[var(--text-primary)]',
                  'placeholder:text-[var(--text-muted)]',
                  // Interactions
                  'transition-all duration-[var(--transition-fast)]',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent',
                  'hover:border-[var(--border-color-hover)]',
                  // Touch-specific
                  'touch-manipulation'
                )}
                aria-label={searchPlaceholder}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
                <SearchIcon />
              </div>
            </div>
          )}
        </div>

        {/* Mobile filter drawer */}
        {mobileCollapsible && (
          <MobileFilterDrawer
            isOpen={isMobileDrawerOpen}
            onClose={() => setIsMobileDrawerOpen(false)}
            filters={filters}
            activeFilterCount={activeFilterCount}
          />
        )}
      </>
    );
  }
);

FilterBar.displayName = 'FilterBar';

export { FilterBar };
