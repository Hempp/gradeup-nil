'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface UseSearchOptions {
  debounceMs?: number;
  minLength?: number;
  syncWithUrl?: boolean;
  paramName?: string;
}

export interface UseSearchResult {
  query: string;
  debouncedQuery: string;
  setQuery: (value: string) => void;
  clearQuery: () => void;
  isSearching: boolean;
}

export interface FilterValue {
  value: string | number | boolean | string[];
  label?: string;
}

export interface UseFiltersOptions<T extends Record<string, FilterValue>> {
  defaultFilters: T;
  syncWithUrl?: boolean;
}

export interface UseFiltersResult<T extends Record<string, FilterValue>> {
  filters: T;
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  setFilters: (newFilters: Partial<T>) => void;
  resetFilters: () => void;
  clearFilter: (key: keyof T) => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Debounced Search Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook for debounced search input with optional URL synchronization
 *
 * Provides controlled search input state with debounced output for
 * performance optimization. Can sync with URL query parameters for
 * shareable/bookmarkable search states.
 *
 * @param options - Configuration options for the search behavior
 * @param options.debounceMs - Delay before updating debounced value (default: 300)
 * @param options.minLength - Minimum query length to trigger search (default: 0)
 * @param options.syncWithUrl - Whether to sync with URL query params (default: false)
 * @param options.paramName - URL parameter name for query (default: 'q')
 * @returns UseSearchResult with query state and control functions
 * @example
 * function SearchPage() {
 *   const { query, debouncedQuery, setQuery, clearQuery, isSearching } = useSearch({
 *     debounceMs: 300,
 *     syncWithUrl: true
 *   });
 *
 *   return (
 *     <input
 *       value={query}
 *       onChange={(e) => setQuery(e.target.value)}
 *       placeholder="Search athletes..."
 *     />
 *   );
 * }
 */
export function useSearch(options: UseSearchOptions = {}): UseSearchResult {
  const {
    debounceMs = 300,
    minLength = 0,
    syncWithUrl = false,
    paramName = 'q',
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize from URL if syncing
  const initialQuery = syncWithUrl ? (searchParams.get(paramName) || '') : '';
  const [query, setQueryState] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set query with debounce
  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    setIsSearching(true);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      const effectiveQuery = value.length >= minLength ? value : '';
      setDebouncedQuery(effectiveQuery);
      setIsSearching(false);

      // Sync with URL
      if (syncWithUrl) {
        const params = new URLSearchParams(searchParams.toString());
        if (effectiveQuery) {
          params.set(paramName, effectiveQuery);
        } else {
          params.delete(paramName);
        }
        const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        router.replace(newUrl, { scroll: false });
      }
    }, debounceMs);
  }, [debounceMs, minLength, paramName, pathname, router, searchParams, syncWithUrl]);

  // Clear query
  const clearQuery = useCallback(() => {
    setQueryState('');
    setDebouncedQuery('');
    setIsSearching(false);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (syncWithUrl) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(paramName);
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(newUrl, { scroll: false });
    }
  }, [paramName, pathname, router, searchParams, syncWithUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    query,
    debouncedQuery,
    setQuery,
    clearQuery,
    isSearching,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Filters Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook for managing filter state with optional URL synchronization
 *
 * Provides comprehensive filter state management with support for
 * multiple filter types (strings, numbers, booleans, arrays) and
 * optional URL synchronization for shareable filter states.
 *
 * @param options - Configuration options
 * @param options.defaultFilters - Initial filter values with type information
 * @param options.syncWithUrl - Whether to sync with URL query params (default: false)
 * @returns UseFiltersResult with filter state and control functions
 * @example
 * const { filters, setFilter, resetFilters, hasActiveFilters } = useFilters({
 *   defaultFilters: {
 *     sport: { value: '', label: 'All Sports' },
 *     minGpa: { value: 0, label: 'Min GPA' },
 *     verified: { value: false, label: 'Verified Only' }
 *   },
 *   syncWithUrl: true
 * });
 */
export function useFilters<T extends Record<string, FilterValue>>(
  options: UseFiltersOptions<T>
): UseFiltersResult<T> {
  const { defaultFilters, syncWithUrl = false } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize filters from URL if syncing
  const getInitialFilters = useCallback((): T => {
    if (!syncWithUrl) return defaultFilters;

    const filters = { ...defaultFilters };
    Object.keys(defaultFilters).forEach((key) => {
      const paramValue = searchParams.get(key);
      if (paramValue !== null) {
        const defaultValue = defaultFilters[key as keyof T];

        // Parse based on type
        if (Array.isArray(defaultValue.value)) {
          (filters as Record<string, FilterValue>)[key] = {
            ...defaultValue,
            value: paramValue.split(',').filter(Boolean),
          };
        } else if (typeof defaultValue.value === 'number') {
          (filters as Record<string, FilterValue>)[key] = {
            ...defaultValue,
            value: parseFloat(paramValue) || defaultValue.value,
          };
        } else if (typeof defaultValue.value === 'boolean') {
          (filters as Record<string, FilterValue>)[key] = {
            ...defaultValue,
            value: paramValue === 'true',
          };
        } else {
          (filters as Record<string, FilterValue>)[key] = {
            ...defaultValue,
            value: paramValue,
          };
        }
      }
    });
    return filters;
  }, [defaultFilters, searchParams, syncWithUrl]);

  const [filters, setFiltersState] = useState<T>(getInitialFilters);

  // Sync filters to URL
  const syncToUrl = useCallback((newFilters: T) => {
    if (!syncWithUrl) return;

    const params = new URLSearchParams(searchParams.toString());

    Object.entries(newFilters).forEach(([key, filter]) => {
      const defaultFilter = defaultFilters[key as keyof T];
      const value = filter.value;
      const defaultValue = defaultFilter.value;

      // Only set if different from default
      const isDifferent = Array.isArray(value)
        ? value.length > 0 && JSON.stringify(value) !== JSON.stringify(defaultValue)
        : value !== defaultValue;

      if (isDifferent) {
        if (Array.isArray(value)) {
          params.set(key, value.join(','));
        } else {
          params.set(key, String(value));
        }
      } else {
        params.delete(key);
      }
    });

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [defaultFilters, pathname, router, searchParams, syncWithUrl]);

  // Set single filter
  const setFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFiltersState((prev) => {
      const newFilters = { ...prev, [key]: value };
      syncToUrl(newFilters);
      return newFilters;
    });
  }, [syncToUrl]);

  // Set multiple filters
  const setFilters = useCallback((newFilters: Partial<T>) => {
    setFiltersState((prev) => {
      const merged = { ...prev, ...newFilters };
      syncToUrl(merged);
      return merged;
    });
  }, [syncToUrl]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
    syncToUrl(defaultFilters);
  }, [defaultFilters, syncToUrl]);

  // Clear single filter
  const clearFilter = useCallback((key: keyof T) => {
    setFiltersState((prev) => {
      const newFilters = { ...prev, [key]: defaultFilters[key] };
      syncToUrl(newFilters);
      return newFilters;
    });
  }, [defaultFilters, syncToUrl]);

  // Check for active filters
  const { hasActiveFilters, activeFilterCount } = useMemo(() => {
    let count = 0;
    Object.keys(filters).forEach((key) => {
      const filter = filters[key as keyof T];
      const defaultFilter = defaultFilters[key as keyof T];

      if (Array.isArray(filter.value)) {
        if (filter.value.length > 0 && JSON.stringify(filter.value) !== JSON.stringify(defaultFilter.value)) {
          count++;
        }
      } else if (filter.value !== defaultFilter.value) {
        count++;
      }
    });
    return { hasActiveFilters: count > 0, activeFilterCount: count };
  }, [filters, defaultFilters]);

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    clearFilter,
    hasActiveFilters,
    activeFilterCount,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Combined Search & Filter Hook
// ═══════════════════════════════════════════════════════════════════════════

export interface UseSearchWithFiltersOptions<T extends Record<string, FilterValue>> {
  searchOptions?: UseSearchOptions;
  filterOptions: UseFiltersOptions<T>;
}

export interface UseSearchWithFiltersResult<T extends Record<string, FilterValue>>
  extends UseSearchResult,
    UseFiltersResult<T> {}

/**
 * Combined hook for search with filters
 *
 * Combines useSearch and useFilters into a single hook for components
 * that need both search and filter functionality together.
 *
 * @param options - Combined search and filter options
 * @returns Combined result from both useSearch and useFilters
 * @example
 * const {
 *   query, debouncedQuery, setQuery,
 *   filters, setFilter, resetFilters
 * } = useSearchWithFilters({
 *   searchOptions: { debounceMs: 300, syncWithUrl: true },
 *   filterOptions: { defaultFilters: { ... }, syncWithUrl: true }
 * });
 */
export function useSearchWithFilters<T extends Record<string, FilterValue>>(
  options: UseSearchWithFiltersOptions<T>
): UseSearchWithFiltersResult<T> {
  const searchResult = useSearch(options.searchOptions);
  const filterResult = useFilters(options.filterOptions);

  return {
    ...searchResult,
    ...filterResult,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Local Filter Application
// ═══════════════════════════════════════════════════════════════════════════

export type FilterPredicate<T> = (item: T, filterValue: FilterValue['value']) => boolean;

export interface FilterDefinition<T> {
  key: string;
  predicate: FilterPredicate<T>;
}

/**
 * Apply filters to a list of items locally (client-side filtering)
 *
 * Filters an array of items using predicate functions defined for each
 * filter key. Skips filters that are at their default values.
 *
 * @param items - Array of items to filter
 * @param filters - Current filter values
 * @param defaultFilters - Default filter values for comparison
 * @param definitions - Filter definitions with predicate functions
 * @returns Filtered array of items
 * @example
 * const filtered = applyFilters(
 *   athletes,
 *   filters,
 *   defaultFilters,
 *   [
 *     { key: 'sport', predicate: (a, v) => a.sport === v },
 *     { key: 'minGpa', predicate: (a, v) => a.gpa >= v }
 *   ]
 * );
 */
export function applyFilters<T, F extends Record<string, FilterValue>>(
  items: T[],
  filters: F,
  defaultFilters: F,
  definitions: FilterDefinition<T>[]
): T[] {
  return items.filter((item) => {
    return definitions.every((definition) => {
      const filter = filters[definition.key as keyof F];
      const defaultFilter = defaultFilters[definition.key as keyof F];

      if (!filter) return true;

      // Check if filter is at default value
      const isDefault = Array.isArray(filter.value)
        ? filter.value.length === 0 || JSON.stringify(filter.value) === JSON.stringify(defaultFilter.value)
        : filter.value === defaultFilter.value;

      if (isDefault) return true;

      return definition.predicate(item, filter.value);
    });
  });
}

/**
 * Apply search query to items (client-side text search)
 *
 * Filters items by checking if any of the specified fields contain
 * the search query (case-insensitive). Supports string and number fields.
 *
 * @param items - Array of items to search
 * @param query - Search query string
 * @param searchFields - Array of field keys to search within
 * @returns Filtered array of items matching the query
 * @example
 * const results = applySearch(athletes, 'John', ['first_name', 'last_name', 'school']);
 */
export function applySearch<T>(
  items: T[],
  query: string,
  searchFields: (keyof T)[]
): T[] {
  if (!query.trim()) return items;

  const lowerQuery = query.toLowerCase();

  return items.filter((item) => {
    return searchFields.some((field) => {
      const value = item[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(lowerQuery);
      }
      if (typeof value === 'number') {
        return value.toString().includes(lowerQuery);
      }
      return false;
    });
  });
}

/**
 * Combined search and filter application (client-side)
 *
 * Applies both text search and filters to an array of items.
 * Search is applied first, then filters are applied to the results.
 *
 * @param items - Array of items to search and filter
 * @param query - Search query string
 * @param searchFields - Array of field keys to search within
 * @param filters - Current filter values
 * @param defaultFilters - Default filter values for comparison
 * @param filterDefinitions - Filter definitions with predicate functions
 * @returns Filtered array of items matching both search and filters
 * @example
 * const results = applySearchAndFilters(
 *   athletes,
 *   debouncedQuery,
 *   ['first_name', 'last_name'],
 *   filters,
 *   defaultFilters,
 *   filterDefinitions
 * );
 */
export function applySearchAndFilters<T, F extends Record<string, FilterValue>>(
  items: T[],
  query: string,
  searchFields: (keyof T)[],
  filters: F,
  defaultFilters: F,
  filterDefinitions: FilterDefinition<T>[]
): T[] {
  let result = items;

  // Apply search first
  result = applySearch(result, query, searchFields);

  // Then apply filters
  result = applyFilters(result, filters, defaultFilters, filterDefinitions);

  return result;
}
