'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, X, Loader2, User, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Athlete } from '@/types';
import type { FilterTag } from '@/hooks/useAthleteSearch';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface AthleteSearchBarProps {
  /** Current search input value */
  value: string;
  /** Callback when search input changes */
  onChange: (value: string) => void;
  /** Callback when search is cleared */
  onClear?: () => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether search is in progress */
  isSearching?: boolean;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Autocomplete suggestions */
  suggestions?: AthleteSearchSuggestion[];
  /** Callback when a suggestion is selected */
  onSelectSuggestion?: (suggestion: AthleteSearchSuggestion) => void;
  /** Enable autocomplete dropdown */
  showAutocomplete?: boolean;
  /** Active filter tags */
  filterTags?: FilterTag[];
  /** Show filter chips inline */
  showFilterChips?: boolean;
  /** Callback when clear all filters is clicked */
  onClearAllFilters?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Minimum characters before showing suggestions */
  minCharsForSuggestions?: number;
}

export interface AthleteSearchSuggestion {
  id: string;
  type: 'athlete' | 'sport' | 'school' | 'recent';
  label: string;
  subtitle?: string;
  imageUrl?: string;
  data?: Partial<Athlete>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Size Configuration
// ═══════════════════════════════════════════════════════════════════════════

const sizeConfig = {
  sm: {
    input: 'h-9 text-sm pl-9 pr-9',
    icon: 'h-4 w-4',
    iconLeft: 'left-2.5',
    iconRight: 'right-2.5',
    suggestion: 'py-2 px-3',
    chip: 'text-xs px-2 py-0.5',
  },
  md: {
    input: 'h-11 text-sm pl-10 pr-10',
    icon: 'h-4 w-4',
    iconLeft: 'left-3',
    iconRight: 'right-3',
    suggestion: 'py-2.5 px-3',
    chip: 'text-xs px-2.5 py-1',
  },
  lg: {
    input: 'h-12 text-base pl-12 pr-12',
    icon: 'h-5 w-5',
    iconLeft: 'left-4',
    iconRight: 'right-4',
    suggestion: 'py-3 px-4',
    chip: 'text-sm px-3 py-1',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Component: AthleteSearchBar
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AthleteSearchBar - Search input with autocomplete suggestions and filter chips
 *
 * Features:
 * - Debounced input (handled by parent hook)
 * - Autocomplete dropdown with suggestions
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Filter chips for active filters
 * - Clear all filters button
 * - Loading and searching states
 * - Full accessibility support
 *
 * @example
 * ```tsx
 * <AthleteSearchBar
 *   value={searchInput}
 *   onChange={setSearchInput}
 *   onClear={clearSearch}
 *   isSearching={isSearching}
 *   filterTags={getFilterTags()}
 *   showFilterChips
 *   onClearAllFilters={resetFilters}
 * />
 * ```
 */
export function AthleteSearchBar({
  value,
  onChange,
  onClear,
  placeholder = 'Search athletes by name, school, sport...',
  isSearching = false,
  isLoading = false,
  suggestions = [],
  onSelectSuggestion,
  showAutocomplete = true,
  filterTags = [],
  showFilterChips = true,
  onClearAllFilters,
  className,
  autoFocus = false,
  size = 'md',
  minCharsForSuggestions = 2,
}: AthleteSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const config = sizeConfig[size];

  // Show suggestions dropdown
  const showSuggestions = useMemo(() => {
    return (
      showAutocomplete &&
      isFocused &&
      value.length >= minCharsForSuggestions &&
      suggestions.length > 0
    );
  }, [showAutocomplete, isFocused, value, minCharsForSuggestions, suggestions]);

  // Handle input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setHighlightedIndex(-1);
    },
    [onChange]
  );

  // Handle clear
  const handleClear = useCallback(() => {
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  }, [onChange, onClear]);

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback(
    (suggestion: AthleteSearchSuggestion) => {
      onSelectSuggestion?.(suggestion);
      setIsFocused(false);
      setHighlightedIndex(-1);
    },
    [onSelectSuggestion]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions) {
        if (e.key === 'Escape') {
          handleClear();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
            handleSelectSuggestion(suggestions[highlightedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsFocused(false);
          setHighlightedIndex(-1);
          break;
      }
    },
    [showSuggestions, suggestions, highlightedIndex, handleSelectSuggestion, handleClear]
  );

  // Scroll highlighted suggestion into view
  useEffect(() => {
    if (highlightedIndex >= 0 && suggestionsRef.current) {
      const highlightedElement = suggestionsRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-search-bar]')) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Get suggestion icon
  const getSuggestionIcon = (type: AthleteSearchSuggestion['type']) => {
    switch (type) {
      case 'athlete':
        return <User className="h-4 w-4" />;
      case 'school':
        return <GraduationCap className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  return (
    <div className={cn('space-y-3', className)} data-search-bar>
      {/* Search Input */}
      <div className="relative">
        {/* Search Icon */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none',
            config.iconLeft
          )}
        >
          {isSearching || isLoading ? (
            <Loader2 className={cn(config.icon, 'animate-spin')} aria-hidden="true" />
          ) : (
            <Search className={config.icon} aria-hidden="true" />
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          aria-label="Search athletes"
          aria-expanded={showSuggestions}
          aria-haspopup="listbox"
          aria-controls={showSuggestions ? 'search-suggestions' : undefined}
          aria-activedescendant={
            highlightedIndex >= 0 ? `suggestion-${highlightedIndex}` : undefined
          }
          className={cn(
            'w-full',
            'rounded-[var(--radius-lg)]',
            'bg-[var(--bg-card)] border border-[var(--border-color)]',
            'text-[var(--text-primary)]',
            'placeholder:text-[var(--text-muted)]',
            'transition-all duration-150',
            'focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20',
            'hover:border-[var(--border-color-hover)]',
            config.input
          )}
        />

        {/* Clear Button */}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className={cn(
              'absolute top-1/2 -translate-y-1/2',
              'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              'transition-colors duration-150',
              'focus:outline-none focus:text-[var(--text-primary)]',
              config.iconRight
            )}
            aria-label="Clear search"
          >
            <X className={config.icon} aria-hidden="true" />
          </button>
        )}

        {/* Autocomplete Suggestions */}
        {showSuggestions && (
          <div
            id="search-suggestions"
            ref={suggestionsRef}
            role="listbox"
            aria-label="Search suggestions"
            className="absolute z-40 mt-1 w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-md)] shadow-lg overflow-hidden max-h-80 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                id={`suggestion-${index}`}
                type="button"
                role="option"
                aria-selected={index === highlightedIndex}
                onClick={() => handleSelectSuggestion(suggestion)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  'w-full flex items-center gap-3 text-left transition-colors',
                  config.suggestion,
                  index === highlightedIndex
                    ? 'bg-[var(--color-primary)]/10'
                    : 'hover:bg-[var(--bg-tertiary)]'
                )}
              >
                {/* Icon or Image */}
                {suggestion.imageUrl ? (
                  <img
                    src={suggestion.imageUrl}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)]">
                    {getSuggestionIcon(suggestion.type)}
                  </div>
                )}

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {suggestion.label}
                  </div>
                  {suggestion.subtitle && (
                    <div className="text-xs text-[var(--text-muted)] truncate">
                      {suggestion.subtitle}
                    </div>
                  )}
                </div>

                {/* Type Badge */}
                <Badge variant="outline" size="sm" className="capitalize flex-shrink-0">
                  {suggestion.type}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter Chips */}
      {showFilterChips && filterTags.length > 0 && (
        <div
          className="flex flex-wrap gap-2"
          role="list"
          aria-label="Active filters"
        >
          {filterTags.map((tag) => (
            <button
              key={tag.id}
              onClick={tag.onRemove}
              className={cn(
                'inline-flex items-center gap-1.5',
                'rounded-full',
                'bg-[var(--color-primary)] text-white',
                'hover:bg-[var(--color-primary)]/80',
                'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2',
                'transition-colors duration-150',
                config.chip
              )}
              role="listitem"
              aria-label={`Remove ${tag.label} filter`}
            >
              {tag.label}
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          ))}

          {/* Clear All Button */}
          {filterTags.length > 1 && onClearAllFilters && (
            <button
              onClick={onClearAllFilters}
              className={cn(
                'inline-flex items-center gap-1.5',
                'rounded-full',
                'border border-[var(--border-color)]',
                'text-[var(--text-muted)]',
                'hover:text-[var(--color-error)] hover:border-[var(--color-error)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]',
                'transition-colors duration-150',
                config.chip
              )}
            >
              Clear all
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default AthleteSearchBar;
