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
 * Hook for debounced search with optional URL synchronization
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
 * Apply filters to a list of items locally
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
 * Apply search query to items
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
 * Combined search and filter application
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
