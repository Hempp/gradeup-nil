'use client';

import { useState, useId, useMemo, useCallback, ReactNode } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface FilterTag {
  /** Unique identifier for the filter */
  id: string;
  /** Display label for the tag */
  label: string;
  /** Callback to remove this filter */
  onRemove: () => void;
}

export interface FilterPanelProps {
  /** Title displayed in the header */
  title?: string;
  /** Whether the panel starts expanded */
  defaultExpanded?: boolean;
  /** Callback when clear all is clicked */
  onClearAll?: () => void;
  /** Whether there are any active filters */
  hasActiveFilters: boolean;
  /** Number of active filters for badge display */
  activeFilterCount?: number;
  /** Filter tags to display when collapsed/expanded */
  filterTags?: FilterTag[];
  /** Children components (the actual filter controls) */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the clear button */
  showClearButton?: boolean;
  /** Custom icon for the header */
  headerIcon?: ReactNode;
  /** Aria label for the panel */
  ariaLabel?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * FilterPanel - A reusable collapsible filter panel component
 *
 * Features:
 * - Collapsible panel with smooth animation
 * - Active filter count badge
 * - Filter tags with remove functionality
 * - Clear all button
 * - Full keyboard accessibility
 * - ARIA compliant (aria-expanded, aria-controls)
 *
 * @example
 * ```tsx
 * <FilterPanel
 *   hasActiveFilters={filters.sports.length > 0}
 *   activeFilterCount={activeCount}
 *   onClearAll={handleClearFilters}
 *   filterTags={[
 *     { id: 'sport-basketball', label: 'Basketball', onRemove: () => {} },
 *   ]}
 * >
 *   <MultiSelectDropdown ... />
 *   <RangeSlider ... />
 * </FilterPanel>
 * ```
 */
export function FilterPanel({
  title = 'Filters',
  defaultExpanded = false,
  onClearAll,
  hasActiveFilters,
  activeFilterCount = 0,
  filterTags = [],
  children,
  className = '',
  showClearButton = true,
  headerIcon,
  ariaLabel = 'Filter options',
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const filterPanelId = useId();

  // Handle keyboard navigation for collapsible panel
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
  }, [isExpanded]);

  // Memoize the header icon to prevent unnecessary re-renders
  const defaultHeaderIcon = useMemo(() => (
    <div
      className="h-9 w-9 rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 flex items-center justify-center"
      aria-hidden="true"
    >
      <SlidersHorizontal className="h-4 w-4 text-[var(--color-primary)]" />
    </div>
  ), []);

  return (
    <Card className={`overflow-hidden border-[var(--border-color)] ${className}`}>
      <CardContent className="p-0">
        {/* Collapsible Header - Accessible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          onKeyDown={handleKeyDown}
          aria-expanded={isExpanded}
          aria-controls={filterPanelId}
          aria-label={ariaLabel}
          className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-tertiary)] transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)]"
        >
          <div className="flex items-center gap-3">
            {headerIcon || defaultHeaderIcon}
            <div className="text-left">
              <span className="font-medium text-[var(--text-primary)]">{title}</span>
              {activeFilterCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--color-primary)] text-[var(--text-inverse)]">
                  {activeFilterCount} active
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && showClearButton && onClearAll && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearAll();
                }}
                className="text-[var(--text-muted)] hover:text-[var(--color-error)]"
                aria-label="Clear all filters"
              >
                <X className="h-4 w-4 mr-1" aria-hidden="true" />
                Clear
              </Button>
            )}
            <svg
              className={`h-5 w-5 text-[var(--text-muted)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Expandable Filter Controls - CSS Grid for smooth animation */}
        <div
          id={filterPanelId}
          className={`grid transition-all duration-300 ease-out motion-reduce:transition-none ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
        >
          <div className="overflow-hidden">
            <div className="p-4 pt-0 border-t border-[var(--border-color)]">
              <div className="pt-4">
                {children}
              </div>
            </div>
          </div>
        </div>

        {/* Active filter tags - Accessible with keyboard support */}
        {hasActiveFilters && filterTags.length > 0 && (
          <div
            className="flex flex-wrap gap-2 px-4 pb-4 pt-2 border-t border-[var(--border-color)]"
            role="list"
            aria-label="Active filters"
          >
            {filterTags.map((tag) => (
              <button
                key={tag.id}
                onClick={tag.onRemove}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--color-primary)] text-[var(--text-inverse)] hover:bg-[var(--color-primary)]/80 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 transition-colors duration-150"
                aria-label={`Remove ${tag.label} filter`}
                role="listitem"
              >
                {tag.label}
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FilterPanel;
