'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { Athlete, Sport, School } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface AthleteSearchFilters {
  /** Search query string */
  search: string;
  /** Selected sport IDs */
  sportIds: string[];
  /** Selected school IDs */
  schoolIds: string[];
  /** Selected divisions (D1, D2, D3, NAIA) */
  divisions: string[];
  /** Minimum GPA filter */
  minGpa: number;
  /** Maximum GPA filter */
  maxGpa: number;
  /** Minimum follower count */
  minFollowers: number;
  /** Maximum follower count */
  maxFollowers: number;
  /** Verification status filter */
  verifiedOnly: boolean;
}

export interface AthleteSearchPagination {
  /** Current page (1-indexed) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total number of items */
  total: number;
  /** Total number of pages */
  totalPages: number;
}

export interface AthleteSearchResult {
  /** Array of athlete results */
  athletes: Athlete[];
  /** Pagination info */
  pagination: AthleteSearchPagination;
}

export interface UseAthleteSearchOptions {
  /** Debounce delay for search input in milliseconds */
  debounceMs?: number;
  /** Default page size */
  defaultPageSize?: number;
  /** Sync filters with URL query parameters */
  syncWithUrl?: boolean;
  /** Auto-fetch on mount */
  autoFetch?: boolean;
}

export interface UseAthleteSearchResult {
  // Filter state
  filters: AthleteSearchFilters;
  setFilter: <K extends keyof AthleteSearchFilters>(key: K, value: AthleteSearchFilters[K]) => void;
  setFilters: (filters: Partial<AthleteSearchFilters>) => void;
  resetFilters: () => void;
  clearFilter: (key: keyof AthleteSearchFilters) => void;

  // Search input
  searchInput: string;
  setSearchInput: (value: string) => void;
  clearSearch: () => void;

  // Pagination
  pagination: AthleteSearchPagination;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;

  // Results
  athletes: Athlete[];
  isLoading: boolean;
  error: string | null;

  // Utility
  refetch: () => Promise<void>;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  isSearching: boolean;
  getFilterTags: () => FilterTag[];
}

export interface FilterTag {
  id: string;
  label: string;
  onRemove: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Default Values
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_FILTERS: AthleteSearchFilters = {
  search: '',
  sportIds: [],
  schoolIds: [],
  divisions: [],
  minGpa: 0,
  maxGpa: 4.0,
  minFollowers: 0,
  maxFollowers: 10000000,
  verifiedOnly: false,
};

const DEFAULT_PAGINATION: AthleteSearchPagination = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0,
};

// ═══════════════════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * useAthleteSearch - Advanced athlete search hook with debouncing, filtering, and pagination
 *
 * Provides comprehensive search functionality for athletes including:
 * - Debounced search input
 * - Multi-select filters (sport, school, division)
 * - Range filters (GPA, follower count)
 * - Boolean filters (verification status)
 * - URL query synchronization for shareable searches
 * - Pagination support
 *
 * @param options - Configuration options
 * @returns UseAthleteSearchResult with all search state and controls
 *
 * @example
 * ```tsx
 * function AthleteDiscovery() {
 *   const {
 *     filters,
 *     setFilter,
 *     searchInput,
 *     setSearchInput,
 *     athletes,
 *     isLoading,
 *     pagination,
 *     setPage,
 *     hasActiveFilters,
 *     resetFilters,
 *   } = useAthleteSearch({
 *     syncWithUrl: true,
 *     debounceMs: 300,
 *   });
 *
 *   return (
 *     <div>
 *       <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
 *       {athletes.map(athlete => <AthleteCard key={athlete.id} athlete={athlete} />)}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAthleteSearch(options: UseAthleteSearchOptions = {}): UseAthleteSearchResult {
  const {
    debounceMs = 300,
    defaultPageSize = 10,
    syncWithUrl = false,
    autoFetch = true,
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State
  const [filters, setFiltersState] = useState<AthleteSearchFilters>(() =>
    getInitialFiltersFromUrl(searchParams, syncWithUrl)
  );
  const [searchInput, setSearchInputState] = useState(filters.search);
  const [pagination, setPaginationState] = useState<AthleteSearchPagination>(() => ({
    ...DEFAULT_PAGINATION,
    page: syncWithUrl ? parseInt(searchParams.get('page') || '1', 10) : 1,
    pageSize: syncWithUrl
      ? parseInt(searchParams.get('page_size') || String(defaultPageSize), 10)
      : defaultPageSize,
  }));
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Refs for debouncing
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync filters to URL
  const syncToUrl = useCallback(
    (newFilters: AthleteSearchFilters, newPagination: AthleteSearchPagination) => {
      if (!syncWithUrl) return;

      const params = new URLSearchParams();

      // Add search
      if (newFilters.search) {
        params.set('q', newFilters.search);
      }

      // Add multi-select filters
      if (newFilters.sportIds.length > 0) {
        params.set('sport_ids', newFilters.sportIds.join(','));
      }
      if (newFilters.schoolIds.length > 0) {
        params.set('school_ids', newFilters.schoolIds.join(','));
      }
      if (newFilters.divisions.length > 0) {
        params.set('divisions', newFilters.divisions.join(','));
      }

      // Add range filters (only if not default)
      if (newFilters.minGpa > DEFAULT_FILTERS.minGpa) {
        params.set('min_gpa', String(newFilters.minGpa));
      }
      if (newFilters.maxGpa < DEFAULT_FILTERS.maxGpa) {
        params.set('max_gpa', String(newFilters.maxGpa));
      }
      if (newFilters.minFollowers > DEFAULT_FILTERS.minFollowers) {
        params.set('min_followers', String(newFilters.minFollowers));
      }
      if (newFilters.maxFollowers < DEFAULT_FILTERS.maxFollowers) {
        params.set('max_followers', String(newFilters.maxFollowers));
      }

      // Add boolean filters
      if (newFilters.verifiedOnly) {
        params.set('verified', 'true');
      }

      // Add pagination
      if (newPagination.page > 1) {
        params.set('page', String(newPagination.page));
      }
      if (newPagination.pageSize !== defaultPageSize) {
        params.set('page_size', String(newPagination.pageSize));
      }

      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [syncWithUrl, pathname, router, defaultPageSize]
  );

  // Fetch athletes from API
  const fetchAthletes = useCallback(
    async (currentFilters: AthleteSearchFilters, currentPagination: AthleteSearchPagination) => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();

        // Build query params
        params.set('page', String(currentPagination.page));
        params.set('page_size', String(currentPagination.pageSize));

        if (currentFilters.search) {
          params.set('search', currentFilters.search);
        }
        if (currentFilters.sportIds.length > 0) {
          params.set('sport_ids', currentFilters.sportIds.join(','));
        }
        if (currentFilters.schoolIds.length > 0) {
          params.set('school_ids', currentFilters.schoolIds.join(','));
        }
        if (currentFilters.divisions.length > 0) {
          params.set('divisions', currentFilters.divisions.join(','));
        }
        if (currentFilters.minGpa > DEFAULT_FILTERS.minGpa) {
          params.set('min_gpa', String(currentFilters.minGpa));
        }
        if (currentFilters.maxGpa < DEFAULT_FILTERS.maxGpa) {
          params.set('max_gpa', String(currentFilters.maxGpa));
        }
        if (currentFilters.minFollowers > DEFAULT_FILTERS.minFollowers) {
          params.set('min_followers', String(currentFilters.minFollowers));
        }
        if (currentFilters.maxFollowers < DEFAULT_FILTERS.maxFollowers) {
          params.set('max_followers', String(currentFilters.maxFollowers));
        }
        if (currentFilters.verifiedOnly) {
          params.set('verified', 'true');
        }

        const response = await fetch(`/api/athletes?${params.toString()}`, {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch athletes: ${response.statusText}`);
        }

        const data = await response.json();

        setAthletes(data.athletes || []);
        setPaginationState((prev) => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.total_pages || 0,
        }));
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was aborted, ignore
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to fetch athletes');
        setAthletes([]);
      } finally {
        setIsLoading(false);
        setIsSearching(false);
      }
    },
    []
  );

  // Debounced search input handler
  const setSearchInput = useCallback(
    (value: string) => {
      setSearchInputState(value);
      setIsSearching(true);

      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Set new debounced update
      debounceTimeoutRef.current = setTimeout(() => {
        setFiltersState((prev) => {
          const newFilters = { ...prev, search: value };
          const newPagination = { ...pagination, page: 1 };
          setPaginationState(newPagination);
          syncToUrl(newFilters, newPagination);
          fetchAthletes(newFilters, newPagination);
          return newFilters;
        });
      }, debounceMs);
    },
    [debounceMs, pagination, syncToUrl, fetchAthletes]
  );

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchInputState('');
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    setFiltersState((prev) => {
      const newFilters = { ...prev, search: '' };
      const newPagination = { ...pagination, page: 1 };
      setPaginationState(newPagination);
      syncToUrl(newFilters, newPagination);
      fetchAthletes(newFilters, newPagination);
      return newFilters;
    });
  }, [pagination, syncToUrl, fetchAthletes]);

  // Set single filter
  const setFilter = useCallback(
    <K extends keyof AthleteSearchFilters>(key: K, value: AthleteSearchFilters[K]) => {
      setFiltersState((prev) => {
        const newFilters = { ...prev, [key]: value };
        const newPagination = { ...pagination, page: 1 }; // Reset to page 1 on filter change
        setPaginationState(newPagination);
        syncToUrl(newFilters, newPagination);
        fetchAthletes(newFilters, newPagination);
        return newFilters;
      });
    },
    [pagination, syncToUrl, fetchAthletes]
  );

  // Set multiple filters
  const setFilters = useCallback(
    (newFilters: Partial<AthleteSearchFilters>) => {
      setFiltersState((prev) => {
        const merged = { ...prev, ...newFilters };
        const newPagination = { ...pagination, page: 1 };
        setPaginationState(newPagination);
        syncToUrl(merged, newPagination);
        fetchAthletes(merged, newPagination);
        return merged;
      });
    },
    [pagination, syncToUrl, fetchAthletes]
  );

  // Reset all filters
  const resetFilters = useCallback(() => {
    setSearchInputState('');
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const newFilters = { ...DEFAULT_FILTERS };
    const newPagination = { ...DEFAULT_PAGINATION, pageSize: pagination.pageSize };
    setFiltersState(newFilters);
    setPaginationState(newPagination);
    syncToUrl(newFilters, newPagination);
    fetchAthletes(newFilters, newPagination);
  }, [pagination.pageSize, syncToUrl, fetchAthletes]);

  // Clear single filter
  const clearFilter = useCallback(
    (key: keyof AthleteSearchFilters) => {
      setFiltersState((prev) => {
        const newFilters = { ...prev, [key]: DEFAULT_FILTERS[key] };
        if (key === 'search') {
          setSearchInputState('');
        }
        const newPagination = { ...pagination, page: 1 };
        setPaginationState(newPagination);
        syncToUrl(newFilters, newPagination);
        fetchAthletes(newFilters, newPagination);
        return newFilters;
      });
    },
    [pagination, syncToUrl, fetchAthletes]
  );

  // Pagination controls
  const setPage = useCallback(
    (page: number) => {
      setPaginationState((prev) => {
        const newPagination = { ...prev, page: Math.max(1, Math.min(page, prev.totalPages || 1)) };
        syncToUrl(filters, newPagination);
        fetchAthletes(filters, newPagination);
        return newPagination;
      });
    },
    [filters, syncToUrl, fetchAthletes]
  );

  const setPageSize = useCallback(
    (size: number) => {
      setPaginationState((prev) => {
        const newPagination = { ...prev, pageSize: size, page: 1 };
        syncToUrl(filters, newPagination);
        fetchAthletes(filters, newPagination);
        return newPagination;
      });
    },
    [filters, syncToUrl, fetchAthletes]
  );

  const nextPage = useCallback(() => {
    setPage(pagination.page + 1);
  }, [pagination.page, setPage]);

  const prevPage = useCallback(() => {
    setPage(pagination.page - 1);
  }, [pagination.page, setPage]);

  // Refetch
  const refetch = useCallback(async () => {
    await fetchAthletes(filters, pagination);
  }, [fetchAthletes, filters, pagination]);

  // Calculate active filter count
  const { hasActiveFilters, activeFilterCount } = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.sportIds.length > 0) count++;
    if (filters.schoolIds.length > 0) count++;
    if (filters.divisions.length > 0) count++;
    if (filters.minGpa > DEFAULT_FILTERS.minGpa) count++;
    if (filters.maxGpa < DEFAULT_FILTERS.maxGpa) count++;
    if (filters.minFollowers > DEFAULT_FILTERS.minFollowers) count++;
    if (filters.maxFollowers < DEFAULT_FILTERS.maxFollowers) count++;
    if (filters.verifiedOnly) count++;
    return { hasActiveFilters: count > 0, activeFilterCount: count };
  }, [filters]);

  // Generate filter tags for UI display
  const getFilterTags = useCallback((): FilterTag[] => {
    const tags: FilterTag[] = [];

    if (filters.search) {
      tags.push({
        id: 'search',
        label: `Search: "${filters.search}"`,
        onRemove: () => clearFilter('search'),
      });
    }

    filters.sportIds.forEach((sportId) => {
      tags.push({
        id: `sport-${sportId}`,
        label: `Sport: ${sportId}`,
        onRemove: () => setFilter('sportIds', filters.sportIds.filter((id) => id !== sportId)),
      });
    });

    filters.schoolIds.forEach((schoolId) => {
      tags.push({
        id: `school-${schoolId}`,
        label: `School: ${schoolId}`,
        onRemove: () => setFilter('schoolIds', filters.schoolIds.filter((id) => id !== schoolId)),
      });
    });

    filters.divisions.forEach((division) => {
      tags.push({
        id: `division-${division}`,
        label: division,
        onRemove: () => setFilter('divisions', filters.divisions.filter((d) => d !== division)),
      });
    });

    if (filters.minGpa > DEFAULT_FILTERS.minGpa) {
      tags.push({
        id: 'minGpa',
        label: `Min GPA: ${filters.minGpa.toFixed(1)}`,
        onRemove: () => clearFilter('minGpa'),
      });
    }

    if (filters.maxGpa < DEFAULT_FILTERS.maxGpa) {
      tags.push({
        id: 'maxGpa',
        label: `Max GPA: ${filters.maxGpa.toFixed(1)}`,
        onRemove: () => clearFilter('maxGpa'),
      });
    }

    if (filters.minFollowers > DEFAULT_FILTERS.minFollowers) {
      tags.push({
        id: 'minFollowers',
        label: `Min Followers: ${formatFollowerCount(filters.minFollowers)}`,
        onRemove: () => clearFilter('minFollowers'),
      });
    }

    if (filters.maxFollowers < DEFAULT_FILTERS.maxFollowers) {
      tags.push({
        id: 'maxFollowers',
        label: `Max Followers: ${formatFollowerCount(filters.maxFollowers)}`,
        onRemove: () => clearFilter('maxFollowers'),
      });
    }

    if (filters.verifiedOnly) {
      tags.push({
        id: 'verified',
        label: 'Verified Only',
        onRemove: () => clearFilter('verifiedOnly'),
      });
    }

    return tags;
  }, [filters, clearFilter, setFilter]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchAthletes(filters, pagination);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // Filter state
    filters,
    setFilter,
    setFilters,
    resetFilters,
    clearFilter,

    // Search input
    searchInput,
    setSearchInput,
    clearSearch,

    // Pagination
    pagination,
    setPage,
    setPageSize,
    nextPage,
    prevPage,

    // Results
    athletes,
    isLoading,
    error,

    // Utility
    refetch,
    hasActiveFilters,
    activeFilterCount,
    isSearching,
    getFilterTags,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse initial filters from URL search params
 */
function getInitialFiltersFromUrl(
  searchParams: ReturnType<typeof useSearchParams>,
  syncWithUrl: boolean
): AthleteSearchFilters {
  if (!syncWithUrl) {
    return { ...DEFAULT_FILTERS };
  }

  return {
    search: searchParams.get('q') || '',
    sportIds: searchParams.get('sport_ids')?.split(',').filter(Boolean) || [],
    schoolIds: searchParams.get('school_ids')?.split(',').filter(Boolean) || [],
    divisions: searchParams.get('divisions')?.split(',').filter(Boolean) || [],
    minGpa: parseFloat(searchParams.get('min_gpa') || '0') || 0,
    maxGpa: parseFloat(searchParams.get('max_gpa') || '4.0') || 4.0,
    minFollowers: parseInt(searchParams.get('min_followers') || '0', 10) || 0,
    maxFollowers: parseInt(searchParams.get('max_followers') || '10000000', 10) || 10000000,
    verifiedOnly: searchParams.get('verified') === 'true',
  };
}

/**
 * Format follower count for display
 */
function formatFollowerCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(0)}K`;
  }
  return String(count);
}

export default useAthleteSearch;
