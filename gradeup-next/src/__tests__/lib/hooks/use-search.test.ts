/**
 * Tests for the useSearch and useFilters hooks
 * @module __tests__/lib/hooks/use-search.test
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSearch, useFilters, type FilterValue } from '@/lib/hooks/use-search';

// Mock Next.js navigation
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
}));

describe('useSearch hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with empty query', () => {
    const { result } = renderHook(() => useSearch());

    expect(result.current.query).toBe('');
    expect(result.current.debouncedQuery).toBe('');
    expect(result.current.isSearching).toBe(false);
  });

  it('updates query immediately', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('test');
    });

    expect(result.current.query).toBe('test');
    expect(result.current.isSearching).toBe(true);
  });

  it('debounces the query update', async () => {
    const { result } = renderHook(() => useSearch({ debounceMs: 300 }));

    act(() => {
      result.current.setQuery('test');
    });

    // Query updates immediately
    expect(result.current.query).toBe('test');
    // But debounced query hasn't updated yet
    expect(result.current.debouncedQuery).toBe('');

    // Fast-forward debounce time
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.debouncedQuery).toBe('test');
    expect(result.current.isSearching).toBe(false);
  });

  it('respects minLength option', async () => {
    const { result } = renderHook(() => useSearch({ debounceMs: 100, minLength: 3 }));

    act(() => {
      result.current.setQuery('ab');
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Should be empty because min length not met
    expect(result.current.debouncedQuery).toBe('');

    act(() => {
      result.current.setQuery('abc');
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.debouncedQuery).toBe('abc');
  });

  it('clears query correctly', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('test');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.debouncedQuery).toBe('test');

    act(() => {
      result.current.clearQuery();
    });

    expect(result.current.query).toBe('');
    expect(result.current.debouncedQuery).toBe('');
    expect(result.current.isSearching).toBe(false);
  });

  it('cancels pending debounce on new input', () => {
    const { result } = renderHook(() => useSearch({ debounceMs: 300 }));

    act(() => {
      result.current.setQuery('first');
    });

    // Advance partially
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Set new query before debounce completes
    act(() => {
      result.current.setQuery('second');
    });

    // Complete the new debounce
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Should have 'second', not 'first'
    expect(result.current.debouncedQuery).toBe('second');
  });

  it('uses custom param name with URL sync', () => {
    const { result } = renderHook(() =>
      useSearch({
        syncWithUrl: true,
        paramName: 'search',
        debounceMs: 100,
      })
    );

    act(() => {
      result.current.setQuery('test');
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('search=test'),
      expect.any(Object)
    );
  });

  it('removes param from URL when query is cleared', () => {
    const { result } = renderHook(() =>
      useSearch({
        syncWithUrl: true,
        debounceMs: 100,
      })
    );

    act(() => {
      result.current.setQuery('test');
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    act(() => {
      result.current.clearQuery();
    });

    expect(mockReplace).toHaveBeenLastCalledWith('/test', expect.any(Object));
  });
});

describe('useFilters hook', () => {
  type TestFilters = {
    status: FilterValue;
    category: FilterValue;
    range: FilterValue;
  };

  const defaultFilters: TestFilters = {
    status: { value: 'all', label: 'All' },
    category: { value: '', label: '' },
    range: { value: ['0', '100'], label: '0-100' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default filters', () => {
    const { result } = renderHook(() => useFilters({ defaultFilters }));

    expect(result.current.filters.status.value).toBe('all');
    expect(result.current.filters.category.value).toBe('');
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.activeFilterCount).toBe(0);
  });

  it('sets individual filter', () => {
    const { result } = renderHook(() => useFilters({ defaultFilters }));

    act(() => {
      result.current.setFilter('status', { value: 'active', label: 'Active' });
    });

    expect(result.current.filters.status.value).toBe('active');
    expect(result.current.hasActiveFilters).toBe(true);
    expect(result.current.activeFilterCount).toBe(1);
  });

  it('sets multiple filters at once', () => {
    const { result } = renderHook(() => useFilters({ defaultFilters }));

    act(() => {
      result.current.setFilters({
        status: { value: 'active', label: 'Active' },
        category: { value: 'sports', label: 'Sports' },
      });
    });

    expect(result.current.filters.status.value).toBe('active');
    expect(result.current.filters.category.value).toBe('sports');
    expect(result.current.activeFilterCount).toBe(2);
  });

  it('clears individual filter', () => {
    const { result } = renderHook(() => useFilters({ defaultFilters }));

    act(() => {
      result.current.setFilter('status', { value: 'active', label: 'Active' });
    });

    expect(result.current.filters.status.value).toBe('active');

    act(() => {
      result.current.clearFilter('status');
    });

    expect(result.current.filters.status.value).toBe('all');
  });

  it('resets all filters to defaults', () => {
    const { result } = renderHook(() => useFilters({ defaultFilters }));

    act(() => {
      result.current.setFilters({
        status: { value: 'active', label: 'Active' },
        category: { value: 'sports', label: 'Sports' },
      });
    });

    expect(result.current.activeFilterCount).toBe(2);

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.filters.status.value).toBe('all');
    expect(result.current.filters.category.value).toBe('');
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('correctly calculates active filter count', () => {
    const { result } = renderHook(() =>
      useFilters({
        defaultFilters: {
          filter1: { value: '', label: '' },
          filter2: { value: '', label: '' },
          filter3: { value: '', label: '' },
        },
      })
    );

    expect(result.current.activeFilterCount).toBe(0);

    act(() => {
      result.current.setFilter('filter1', { value: 'value1', label: 'Value 1' });
    });
    expect(result.current.activeFilterCount).toBe(1);

    act(() => {
      result.current.setFilter('filter2', { value: 'value2', label: 'Value 2' });
    });
    expect(result.current.activeFilterCount).toBe(2);

    act(() => {
      result.current.clearFilter('filter1');
    });
    expect(result.current.activeFilterCount).toBe(1);
  });

  it('handles array filter values', () => {
    const { result } = renderHook(() => useFilters({ defaultFilters }));

    act(() => {
      result.current.setFilter('range', { value: ['10', '50'], label: '10-50' });
    });

    expect(result.current.filters.range.value).toEqual(['10', '50']);
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('handles boolean filter values', () => {
    const boolFilters = {
      isActive: { value: false, label: 'Inactive' },
    };

    const { result } = renderHook(() => useFilters({ defaultFilters: boolFilters }));

    act(() => {
      result.current.setFilter('isActive', { value: true, label: 'Active' });
    });

    expect(result.current.filters.isActive.value).toBe(true);
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('handles numeric filter values', () => {
    const numFilters = {
      minAmount: { value: 0, label: '0' },
    };

    const { result } = renderHook(() => useFilters({ defaultFilters: numFilters }));

    act(() => {
      result.current.setFilter('minAmount', { value: 1000, label: '1000' });
    });

    expect(result.current.filters.minAmount.value).toBe(1000);
    expect(result.current.hasActiveFilters).toBe(true);
  });
});
