'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { SlidersHorizontal, X, ChevronDown, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AthleteSearchFilters } from '@/hooks/useAthleteSearch';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface FilterOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SearchFiltersProps {
  /** Current filter values */
  filters: AthleteSearchFilters;
  /** Callback to update a single filter */
  setFilter: <K extends keyof AthleteSearchFilters>(key: K, value: AthleteSearchFilters[K]) => void;
  /** Callback to reset all filters */
  onReset: () => void;
  /** Whether there are active filters */
  hasActiveFilters: boolean;
  /** Count of active filters */
  activeFilterCount: number;
  /** Available sports for filter */
  sports?: FilterOption[];
  /** Available schools for filter */
  schools?: FilterOption[];
  /** Whether the panel starts expanded */
  defaultExpanded?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Loading state for options */
  isLoadingOptions?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Division Options
// ═══════════════════════════════════════════════════════════════════════════

const DIVISION_OPTIONS: FilterOption[] = [
  { value: 'D1', label: 'NCAA Division I' },
  { value: 'D2', label: 'NCAA Division II' },
  { value: 'D3', label: 'NCAA Division III' },
  { value: 'NAIA', label: 'NAIA' },
];

// ═══════════════════════════════════════════════════════════════════════════
// GPA Presets
// ═══════════════════════════════════════════════════════════════════════════

const GPA_PRESETS = [
  { value: 3.5, label: '3.5+' },
  { value: 3.0, label: '3.0+' },
  { value: 2.5, label: '2.5+' },
  { value: 2.0, label: '2.0+' },
];

// ═══════════════════════════════════════════════════════════════════════════
// Follower Count Presets
// ═══════════════════════════════════════════════════════════════════════════

const FOLLOWER_PRESETS = [
  { min: 0, max: 1000, label: 'Under 1K' },
  { min: 1000, max: 10000, label: '1K - 10K' },
  { min: 10000, max: 100000, label: '10K - 100K' },
  { min: 100000, max: 1000000, label: '100K - 1M' },
  { min: 1000000, max: 10000000, label: '1M+' },
];

// ═══════════════════════════════════════════════════════════════════════════
// Component: MultiSelectDropdown
// ═══════════════════════════════════════════════════════════════════════════

interface MultiSelectProps {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxDisplayItems?: number;
  isLoading?: boolean;
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  maxDisplayItems = 10,
  isLoading = false,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const lower = searchTerm.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(lower));
  }, [options, searchTerm]);

  const toggleOption = useCallback(
    (value: string) => {
      if (selected.includes(value)) {
        onChange(selected.filter((v) => v !== value));
      } else {
        onChange([...selected, value]);
      }
    },
    [selected, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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
          break;
      }
    },
    [disabled, isOpen]
  );

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-multiselect]')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const displayText =
    selected.length === 0 ? placeholder : `${selected.length} selected`;

  return (
    <div className="relative" data-multiselect>
      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
        {label}
      </label>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-label={`${label} dropdown, ${displayText}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          'w-full h-10 px-3 text-left',
          'rounded-[var(--radius-md)]',
          'bg-[var(--bg-secondary)] border border-[var(--border-color)]',
          'text-sm text-[var(--text-primary)]',
          'transition-colors duration-150',
          'focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]',
          'flex items-center justify-between gap-2',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[var(--text-muted)]'
        )}
      >
        <span className={cn(selected.length === 0 && 'text-[var(--text-muted)]')}>
          {isLoading ? 'Loading...' : displayText}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {isOpen && !disabled && (
        <div
          role="listbox"
          aria-label={`${label} options`}
          aria-multiselectable="true"
          className="absolute z-30 mt-1 w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-md)] shadow-lg overflow-hidden"
        >
          {/* Search input for long lists */}
          {options.length > 5 && (
            <div className="p-2 border-b border-[var(--border-color)]">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}...`}
                className="w-full h-8 px-2 text-sm rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          )}

          {/* Options list */}
          <div className="max-h-60 overflow-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-[var(--text-muted)] text-center">
                No options found
              </div>
            ) : (
              filteredOptions.slice(0, maxDisplayItems).map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => toggleOption(option.value)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-left',
                      'hover:bg-[var(--bg-tertiary)] transition-colors',
                      isSelected && 'bg-[var(--color-primary)]/5'
                    )}
                  >
                    <div
                      className={cn(
                        'h-4 w-4 rounded border flex items-center justify-center',
                        isSelected
                          ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                          : 'border-[var(--border-color)]'
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="text-sm text-[var(--text-primary)]">{option.label}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Selected count and clear */}
          {selected.length > 0 && (
            <div className="p-2 border-t border-[var(--border-color)] flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">
                {selected.length} selected
              </span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-[var(--color-primary)] hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Component: RangeSlider
// ═══════════════════════════════════════════════════════════════════════════

interface RangeSliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  formatValue: (value: number) => string;
  showMinMax?: boolean;
  presets?: { value: number; label: string }[];
}

function RangeSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  formatValue,
  showMinMax = false,
  presets,
}: RangeSliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-[var(--text-muted)]">{label}</label>
        <span className="text-xs font-medium text-[var(--color-primary)]" aria-live="polite">
          {formatValue(value)}
        </span>
      </div>

      {/* Presets */}
      {presets && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {presets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange(preset.value)}
              className={cn(
                'px-2 py-1 text-xs rounded-full border transition-colors',
                value === preset.value
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--color-primary)]'
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={formatValue(value)}
        className="w-full h-2 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-card)]"
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

// ═══════════════════════════════════════════════════════════════════════════
// Main Component: SearchFilters
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SearchFilters - Comprehensive filter panel for athlete search
 *
 * Features:
 * - Sport filter (multi-select)
 * - School filter (multi-select)
 * - Division filter (D1, D2, D3, NAIA)
 * - GPA range slider with presets
 * - Follower count range slider
 * - Verification status toggle
 * - Collapsible panel with active filter count
 * - Full keyboard accessibility
 *
 * @example
 * ```tsx
 * <SearchFilters
 *   filters={filters}
 *   setFilter={setFilter}
 *   onReset={resetFilters}
 *   hasActiveFilters={hasActiveFilters}
 *   activeFilterCount={activeFilterCount}
 *   sports={sportsOptions}
 *   schools={schoolsOptions}
 * />
 * ```
 */
export function SearchFilters({
  filters,
  setFilter,
  onReset,
  hasActiveFilters,
  activeFilterCount,
  sports = [],
  schools = [],
  defaultExpanded = false,
  className,
  isLoadingOptions = false,
}: SearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsExpanded(!isExpanded);
      }
    },
    [isExpanded]
  );

  return (
    <Card className={cn('overflow-hidden border-[var(--border-color)]', className)}>
      <CardContent className="p-0">
        {/* Collapsible Header */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          onKeyDown={handleKeyDown}
          aria-expanded={isExpanded}
          aria-controls="search-filters-panel"
          aria-label="Filter options"
          className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-tertiary)] transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)]"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 flex items-center justify-center">
              <SlidersHorizontal className="h-4 w-4 text-[var(--color-primary)]" />
            </div>
            <div className="text-left">
              <span className="font-medium text-[var(--text-primary)]">Filters</span>
              {activeFilterCount > 0 && (
                <Badge variant="primary" size="sm" className="ml-2">
                  {activeFilterCount} active
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onReset();
                }}
                className="text-[var(--text-muted)] hover:text-[var(--color-error)]"
                aria-label="Clear all filters"
              >
                <X className="h-4 w-4 mr-1" aria-hidden="true" />
                Clear
              </Button>
            )}
            <ChevronDown
              className={cn(
                'h-5 w-5 text-[var(--text-muted)] transition-transform duration-200',
                isExpanded && 'rotate-180'
              )}
              aria-hidden="true"
            />
          </div>
        </button>

        {/* Expandable Filter Controls */}
        <div
          id="search-filters-panel"
          className={cn(
            'grid transition-all duration-300 ease-out',
            isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          )}
        >
          <div className="overflow-hidden">
            <div className="p-4 pt-0 border-t border-[var(--border-color)]">
              <div className="pt-4 space-y-6">
                {/* Multi-select filters row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Sport Filter */}
                  <MultiSelectDropdown
                    label="Sport"
                    options={sports}
                    selected={filters.sportIds}
                    onChange={(values) => setFilter('sportIds', values)}
                    placeholder="All sports"
                    isLoading={isLoadingOptions}
                  />

                  {/* School Filter */}
                  <MultiSelectDropdown
                    label="School"
                    options={schools}
                    selected={filters.schoolIds}
                    onChange={(values) => setFilter('schoolIds', values)}
                    placeholder="All schools"
                    isLoading={isLoadingOptions}
                  />

                  {/* Division Filter */}
                  <MultiSelectDropdown
                    label="Division"
                    options={DIVISION_OPTIONS}
                    selected={filters.divisions}
                    onChange={(values) => setFilter('divisions', values)}
                    placeholder="All divisions"
                  />
                </div>

                {/* Range sliders row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* GPA Filter */}
                  <RangeSlider
                    label="Minimum GPA"
                    min={0}
                    max={4.0}
                    step={0.1}
                    value={filters.minGpa}
                    onChange={(value) => setFilter('minGpa', value)}
                    formatValue={(v) => v.toFixed(1)}
                    presets={GPA_PRESETS}
                  />

                  {/* Follower Count Filter */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                      Follower Range
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {FOLLOWER_PRESETS.map((preset) => {
                        const isSelected =
                          filters.minFollowers === preset.min &&
                          filters.maxFollowers === preset.max;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setFilter('minFollowers', preset.min);
                              setFilter('maxFollowers', preset.max);
                            }}
                            className={cn(
                              'px-2.5 py-1.5 text-xs rounded-full border transition-colors',
                              isSelected
                                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                                : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--color-primary)]'
                            )}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Verification toggle */}
                <div className="pt-2 border-t border-[var(--border-color)]">
                  <Switch
                    checked={filters.verifiedOnly}
                    onCheckedChange={(checked) => setFilter('verifiedOnly', checked)}
                    label="Verified athletes only"
                    description="Show only athletes with completed verification"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default SearchFilters;
