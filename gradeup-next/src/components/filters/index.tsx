'use client';

import { useState, useId } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FilterTag {
  id: string;
  label: string;
  onRemove: () => void;
}

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select...',
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full h-10 px-3 text-left
          rounded-[var(--radius-md)]
          bg-[var(--bg-secondary)] border border-[var(--border-color)]
          text-sm text-[var(--text-primary)]
          transition-colors duration-[var(--transition-fast)]
          focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
          flex items-center justify-between
        `}
      >
        <span className={selected.length === 0 ? 'text-[var(--text-muted)]' : ''}>
          {selected.length === 0 ? placeholder : `${selected.length} selected`}
        </span>
        <svg className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 mt-1 w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-md)] shadow-lg max-h-60 overflow-auto">
            {options.map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--bg-tertiary)] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggleOption(option)}
                  className="h-4 w-4 rounded border-[var(--border-color)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <span className="text-sm text-[var(--text-primary)]">{option}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface RangeSliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  formatValue: (value: number) => string;
}

export function RangeSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  formatValue,
}: RangeSliderProps) {
  const sliderId = useId();

  return (
    <div>
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
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={formatValue(value)}
        className="w-full h-2 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)] transition-opacity duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-card)]"
      />
    </div>
  );
}

interface FilterPanelProps {
  children: React.ReactNode;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  onClearAll: () => void;
  filterTags: FilterTag[];
}

export function FilterPanel({
  children,
  hasActiveFilters,
  activeFilterCount,
  onClearAll,
  filterTags,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-lg)] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-secondary)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[var(--text-muted)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-[var(--color-primary)] text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <svg
          className={cn('h-4 w-4 text-[var(--text-muted)] transition-transform', isExpanded && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Filter Controls */}
      {isExpanded && (
        <div className="px-4 py-4 border-t border-[var(--border-color)]">
          {children}

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex justify-end">
              <Button variant="ghost" size="sm" onClick={onClearAll}>
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Active Filter Tags */}
      {filterTags.length > 0 && (
        <div className="px-4 py-3 border-t border-[var(--border-color)] flex flex-wrap gap-2">
          {filterTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full"
            >
              {tag.label}
              <button
                type="button"
                onClick={tag.onRemove}
                className="hover:bg-[var(--color-primary)]/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
