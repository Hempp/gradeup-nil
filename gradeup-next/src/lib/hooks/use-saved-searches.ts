'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { FilterValue } from './use-search';

/* ═══════════════════════════════════════════════════════════════════════════
   SAVED SEARCH TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export interface SavedSearch<T extends Record<string, FilterValue> = Record<string, FilterValue>> {
  /** Unique identifier */
  id: string;
  /** User-given name for the search */
  name: string;
  /** Search query text */
  query: string;
  /** Filter values */
  filters: T;
  /** When the search was created */
  createdAt: Date;
  /** When the search was last used */
  lastUsedAt: Date;
  /** Number of times this search has been used */
  useCount: number;
  /** Whether this is a pinned/favorite search */
  isPinned: boolean;
  /** Icon for the search (emoji or icon name) */
  icon?: string;
}

export interface UseSavedSearchesOptions<T extends Record<string, FilterValue>> {
  /** Storage key for localStorage */
  storageKey: string;
  /** Maximum number of saved searches (default: 20) */
  maxSaved?: number;
  /** Maximum number of recent searches to track (default: 5) */
  maxRecent?: number;
  /** Default filters for new searches */
  defaultFilters: T;
}

export interface UseSavedSearchesResult<T extends Record<string, FilterValue>> {
  /** All saved searches */
  savedSearches: SavedSearch<T>[];
  /** Recent searches (most recently used first) */
  recentSearches: SavedSearch<T>[];
  /** Pinned/favorite searches */
  pinnedSearches: SavedSearch<T>[];
  /** Save a new search */
  saveSearch: (name: string, query: string, filters: T, icon?: string) => SavedSearch<T>;
  /** Apply a saved search (returns the search config) */
  applySearch: (id: string) => SavedSearch<T> | null;
  /** Delete a saved search */
  deleteSearch: (id: string) => void;
  /** Rename a saved search */
  renameSearch: (id: string, newName: string) => void;
  /** Toggle pin status */
  togglePin: (id: string) => void;
  /** Update icon */
  updateIcon: (id: string, icon: string) => void;
  /** Check if current search matches a saved search */
  findMatchingSearch: (query: string, filters: T) => SavedSearch<T> | null;
  /** Clear all saved searches */
  clearAll: () => void;
  /** Clear recent history */
  clearRecent: () => void;
  /** Export saved searches as JSON */
  exportSearches: () => string;
  /** Import saved searches from JSON */
  importSearches: (json: string) => number;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SAVED SEARCHES HOOK
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Hook for managing saved search presets with localStorage persistence.
 *
 * Features:
 * - Save and name search configurations
 * - Track recent searches
 * - Pin favorite searches
 * - Import/export functionality
 * - Usage statistics
 *
 * @example
 * const {
 *   savedSearches,
 *   recentSearches,
 *   pinnedSearches,
 *   saveSearch,
 *   applySearch,
 * } = useSavedSearches({
 *   storageKey: 'athlete-searches',
 *   defaultFilters,
 * });
 *
 * // Save current search
 * const saved = saveSearch('Top GPA Athletes', query, filters);
 *
 * // Apply a saved search
 * const search = applySearch(saved.id);
 * if (search) {
 *   setQuery(search.query);
 *   setFilters(search.filters);
 * }
 */
export function useSavedSearches<T extends Record<string, FilterValue>>(
  options: UseSavedSearchesOptions<T>
): UseSavedSearchesResult<T> {
  const {
    storageKey,
    maxSaved = 20,
    maxRecent = 5,
    defaultFilters,
  } = options;

  const [searches, setSearches] = useState<SavedSearch<T>[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as SavedSearch<T>[];
        // Convert date strings back to Date objects
        const restored = parsed.map((s) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          lastUsedAt: new Date(s.lastUsedAt),
        }));
        setSearches(restored);
      }
    } catch (e) {
      console.warn('Failed to load saved searches:', e);
    }
    setIsLoaded(true);
  }, [storageKey]);

  // Persist to localStorage when searches change
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(searches));
    } catch (e) {
      console.warn('Failed to save searches:', e);
    }
  }, [searches, storageKey, isLoaded]);

  // Generate unique ID
  const generateId = useCallback((): string => {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Save a new search
  const saveSearch = useCallback((
    name: string,
    query: string,
    filters: T,
    icon?: string
  ): SavedSearch<T> => {
    const now = new Date();
    const newSearch: SavedSearch<T> = {
      id: generateId(),
      name: name.trim() || 'Untitled Search',
      query,
      filters,
      createdAt: now,
      lastUsedAt: now,
      useCount: 1,
      isPinned: false,
      icon,
    };

    setSearches((prev) => {
      // Remove oldest non-pinned if at limit
      let updated = [...prev];
      if (updated.length >= maxSaved) {
        const unpinned = updated.filter((s) => !s.isPinned);
        if (unpinned.length > 0) {
          // Sort by useCount and lastUsedAt, remove least used
          unpinned.sort((a, b) => {
            if (a.useCount !== b.useCount) return a.useCount - b.useCount;
            return a.lastUsedAt.getTime() - b.lastUsedAt.getTime();
          });
          const toRemove = unpinned[0];
          updated = updated.filter((s) => s.id !== toRemove.id);
        }
      }
      return [newSearch, ...updated];
    });

    return newSearch;
  }, [generateId, maxSaved]);

  // Apply a saved search (update usage stats)
  const applySearch = useCallback((id: string): SavedSearch<T> | null => {
    let found: SavedSearch<T> | null = null;

    setSearches((prev) => {
      const index = prev.findIndex((s) => s.id === id);
      if (index === -1) return prev;

      const updated = [...prev];
      found = {
        ...updated[index],
        lastUsedAt: new Date(),
        useCount: updated[index].useCount + 1,
      };
      updated[index] = found;

      return updated;
    });

    return found;
  }, []);

  // Delete a saved search
  const deleteSearch = useCallback((id: string): void => {
    setSearches((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // Rename a saved search
  const renameSearch = useCallback((id: string, newName: string): void => {
    setSearches((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name: newName.trim() || s.name } : s))
    );
  }, []);

  // Toggle pin status
  const togglePin = useCallback((id: string): void => {
    setSearches((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isPinned: !s.isPinned } : s))
    );
  }, []);

  // Update icon
  const updateIcon = useCallback((id: string, icon: string): void => {
    setSearches((prev) =>
      prev.map((s) => (s.id === id ? { ...s, icon } : s))
    );
  }, []);

  // Find matching search
  const findMatchingSearch = useCallback((query: string, filters: T): SavedSearch<T> | null => {
    return searches.find((s) => {
      if (s.query !== query) return false;
      // Compare filters
      const filterKeys = Object.keys(filters);
      return filterKeys.every((key) => {
        const savedValue = s.filters[key]?.value;
        const currentValue = filters[key]?.value;
        if (Array.isArray(savedValue) && Array.isArray(currentValue)) {
          return JSON.stringify(savedValue) === JSON.stringify(currentValue);
        }
        return savedValue === currentValue;
      });
    }) || null;
  }, [searches]);

  // Clear all saved searches
  const clearAll = useCallback((): void => {
    setSearches([]);
  }, []);

  // Clear recent (non-pinned) searches
  const clearRecent = useCallback((): void => {
    setSearches((prev) => prev.filter((s) => s.isPinned));
  }, []);

  // Export as JSON
  const exportSearches = useCallback((): string => {
    return JSON.stringify(searches, null, 2);
  }, [searches]);

  // Import from JSON
  const importSearches = useCallback((json: string): number => {
    try {
      const imported = JSON.parse(json) as SavedSearch<T>[];
      if (!Array.isArray(imported)) return 0;

      // Validate and add unique searches
      let added = 0;
      setSearches((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        const newSearches = imported
          .filter((s) => s.id && s.name && !existingIds.has(s.id))
          .map((s) => ({
            ...s,
            id: generateId(), // Generate new ID to avoid conflicts
            createdAt: new Date(s.createdAt),
            lastUsedAt: new Date(s.lastUsedAt),
          }));
        added = newSearches.length;
        return [...prev, ...newSearches].slice(0, maxSaved);
      });

      return added;
    } catch (e) {
      console.error('Failed to import searches:', e);
      return 0;
    }
  }, [generateId, maxSaved]);

  // Computed: recent searches (sorted by lastUsedAt)
  const recentSearches = useMemo(() => {
    return [...searches]
      .sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime())
      .slice(0, maxRecent);
  }, [searches, maxRecent]);

  // Computed: pinned searches
  const pinnedSearches = useMemo(() => {
    return searches.filter((s) => s.isPinned);
  }, [searches]);

  return {
    savedSearches: searches,
    recentSearches,
    pinnedSearches,
    saveSearch,
    applySearch,
    deleteSearch,
    renameSearch,
    togglePin,
    updateIcon,
    findMatchingSearch,
    clearAll,
    clearRecent,
    exportSearches,
    importSearches,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUGGESTED SEARCHES
   Pre-defined search templates for common use cases
   ═══════════════════════════════════════════════════════════════════════════ */

export interface SuggestedSearch<T extends Record<string, FilterValue>> {
  id: string;
  name: string;
  description: string;
  icon: string;
  query: string;
  filters: Partial<T>;
}

/**
 * Pre-defined search suggestions for athlete discovery.
 * These are templates that can be applied as starting points.
 */
export const athleteSearchSuggestions: SuggestedSearch<Record<string, FilterValue>>[] = [
  {
    id: 'top-gpa',
    name: 'Top GPA Athletes',
    description: 'Athletes with 3.5+ GPA',
    icon: '🎓',
    query: '',
    filters: {
      minGpa: { value: 3.5, label: 'Min GPA 3.5' },
    },
  },
  {
    id: 'verified-athletes',
    name: 'Verified Athletes',
    description: 'Fully verified athletes only',
    icon: '✅',
    query: '',
    filters: {
      verified: { value: true, label: 'Verified' },
    },
  },
  {
    id: 'high-followers',
    name: 'High Social Reach',
    description: 'Athletes with 10K+ followers',
    icon: '📱',
    query: '',
    filters: {
      minFollowers: { value: 10000, label: '10K+ Followers' },
    },
  },
  {
    id: 'football-players',
    name: 'Football Players',
    description: 'All football athletes',
    icon: '🏈',
    query: '',
    filters: {
      sport: { value: 'Football', label: 'Football' },
    },
  },
  {
    id: 'basketball-players',
    name: 'Basketball Players',
    description: 'All basketball athletes',
    icon: '🏀',
    query: '',
    filters: {
      sport: { value: 'Basketball', label: 'Basketball' },
    },
  },
  {
    id: 'scholar-athletes',
    name: 'Scholar Athletes',
    description: 'High GPA + High engagement',
    icon: '⭐',
    query: '',
    filters: {
      minGpa: { value: 3.5, label: 'Min GPA 3.5' },
      verified: { value: true, label: 'Verified' },
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   SMART SEARCH SUGGESTIONS
   Hook for generating contextual search suggestions
   ═══════════════════════════════════════════════════════════════════════════ */

export interface UseSmartSuggestionsOptions<T extends Record<string, FilterValue>> {
  /** Current search query */
  query: string;
  /** Current filters */
  filters: T;
  /** Saved searches to reference */
  savedSearches: SavedSearch<T>[];
  /** Suggested search templates */
  suggestions?: SuggestedSearch<T>[];
  /** Maximum suggestions to return */
  maxSuggestions?: number;
}

export interface SmartSuggestion<T extends Record<string, FilterValue>> {
  type: 'saved' | 'suggested' | 'refinement';
  label: string;
  description?: string;
  icon?: string;
  action: () => { query: string; filters: Partial<T> };
}

/**
 * Generate smart search suggestions based on context.
 *
 * @example
 * const suggestions = useSmartSuggestions({
 *   query,
 *   filters,
 *   savedSearches,
 *   suggestions: athleteSearchSuggestions,
 * });
 */
export function useSmartSuggestions<T extends Record<string, FilterValue>>(
  options: UseSmartSuggestionsOptions<T>
): SmartSuggestion<T>[] {
  const {
    query,
    filters,
    savedSearches,
    suggestions = [],
    maxSuggestions = 5,
  } = options;

  return useMemo(() => {
    const results: SmartSuggestion<T>[] = [];

    // Add matching saved searches first
    if (query) {
      const matchingSaved = savedSearches
        .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 2);

      for (const saved of matchingSaved) {
        results.push({
          type: 'saved',
          label: saved.name,
          description: `Saved search`,
          icon: saved.icon || '🔖',
          action: () => ({ query: saved.query, filters: saved.filters as Partial<T> }),
        });
      }
    }

    // Add relevant suggestions based on current query/filters
    const relevantSuggestions = suggestions.filter((s) => {
      // Don't suggest if already matching current filters
      const filterKeys = Object.keys(s.filters);
      const alreadyApplied = filterKeys.every((key) => {
        const suggestedValue = s.filters[key]?.value;
        const currentValue = filters[key]?.value;
        return JSON.stringify(suggestedValue) === JSON.stringify(currentValue);
      });
      return !alreadyApplied;
    });

    for (const suggestion of relevantSuggestions.slice(0, maxSuggestions - results.length)) {
      results.push({
        type: 'suggested',
        label: suggestion.name,
        description: suggestion.description,
        icon: suggestion.icon,
        action: () => ({ query: suggestion.query, filters: suggestion.filters as Partial<T> }),
      });
    }

    return results.slice(0, maxSuggestions);
  }, [query, filters, savedSearches, suggestions, maxSuggestions]);
}
