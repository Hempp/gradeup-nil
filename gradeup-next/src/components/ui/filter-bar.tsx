'use client';

import { forwardRef, type HTMLAttributes, type ChangeEvent } from 'react';
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
      ...props
    },
    ref
  ) => {
    const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
      onSearchChange?.(e.target.value);
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-wrap items-center gap-3',
          className
        )}
        {...props}
      >
        {/* Filter dropdowns */}
        {filters.map((filter) => (
          <div key={filter.id} className="relative">
            <select
              id={filter.id}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className={`
                appearance-none
                h-10 pl-3 pr-10
                rounded-[var(--radius-lg)]
                bg-[var(--bg-card)] border border-[var(--border-color)]
                text-sm text-[var(--text-primary)]
                transition-all duration-[var(--transition-fast)]
                focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent
                hover:border-[var(--border-color-hover)]
                cursor-pointer
              `}
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
        ))}

        {/* Search input */}
        {onSearchChange && (
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchValue}
              onChange={handleSearchChange}
              placeholder={searchPlaceholder}
              className={`
                w-full h-10 pl-3 pr-10
                rounded-[var(--radius-lg)]
                bg-[var(--bg-card)] border border-[var(--border-color)]
                text-sm text-[var(--text-primary)]
                placeholder:text-[var(--text-muted)]
                transition-all duration-[var(--transition-fast)]
                focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent
                hover:border-[var(--border-color-hover)]
              `}
              aria-label={searchPlaceholder}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
              <SearchIcon />
            </div>
          </div>
        )}
      </div>
    );
  }
);

FilterBar.displayName = 'FilterBar';

export { FilterBar };
