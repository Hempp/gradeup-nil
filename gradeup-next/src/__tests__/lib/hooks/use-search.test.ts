/**
 * Tests for the useSearch and useFilters hooks
 * @module __tests__/lib/hooks/use-search.test
 */

import { renderHook, act } from '@testing-library/react';
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

  describe('URL synchronization', () => {
    it('syncs filters to URL when enabled', () => {
      const { result } = renderHook(() =>
        useFilters({
          defaultFilters: {
            status: { value: 'all', label: 'All' },
          },
          syncWithUrl: true,
        })
      );

      act(() => {
        result.current.setFilter('status', { value: 'active', label: 'Active' });
      });

      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining('status=active'),
        expect.any(Object)
      );
    });

    it('removes params from URL when filter is reset', () => {
      const { result } = renderHook(() =>
        useFilters({
          defaultFilters: {
            status: { value: 'all', label: 'All' },
          },
          syncWithUrl: true,
        })
      );

      act(() => {
        result.current.setFilter('status', { value: 'active', label: 'Active' });
      });

      act(() => {
        result.current.resetFilters();
      });

      expect(mockReplace).toHaveBeenLastCalledWith('/test', expect.any(Object));
    });
  });
});

describe('applyFilters function', () => {
  const { applyFilters } = require('@/lib/hooks/use-search');

  interface TestItem {
    id: number;
    name: string;
    status: string;
    category: string;
    price: number;
  }

  const testItems: TestItem[] = [
    { id: 1, name: 'Item 1', status: 'active', category: 'sports', price: 100 },
    { id: 2, name: 'Item 2', status: 'inactive', category: 'tech', price: 200 },
    { id: 3, name: 'Item 3', status: 'active', category: 'sports', price: 300 },
    { id: 4, name: 'Item 4', status: 'pending', category: 'tech', price: 400 },
  ];

  const defaultFilters = {
    status: { value: '', label: '' },
    category: { value: '', label: '' },
  };

  it('returns all items when no filters are active', () => {
    const result = applyFilters(testItems, defaultFilters, defaultFilters, []);
    expect(result).toEqual(testItems);
  });

  it('filters items using predicate', () => {
    const filters = {
      status: { value: 'active', label: 'Active' },
      category: { value: '', label: '' },
    };

    const definitions = [
      {
        key: 'status',
        predicate: (item: TestItem, value: string) => item.status === value,
      },
    ];

    const result = applyFilters(testItems, filters, defaultFilters, definitions);
    expect(result).toHaveLength(2);
    expect(result.every(item => item.status === 'active')).toBe(true);
  });

  it('applies multiple filters', () => {
    const filters = {
      status: { value: 'active', label: 'Active' },
      category: { value: 'sports', label: 'Sports' },
    };

    const definitions = [
      {
        key: 'status',
        predicate: (item: TestItem, value: string) => item.status === value,
      },
      {
        key: 'category',
        predicate: (item: TestItem, value: string) => item.category === value,
      },
    ];

    const result = applyFilters(testItems, filters, defaultFilters, definitions);
    expect(result).toHaveLength(2);
    expect(result.every(item => item.status === 'active' && item.category === 'sports')).toBe(true);
  });

  it('handles array filter values', () => {
    const filters = {
      status: { value: ['active', 'pending'], label: '' },
      category: { value: '', label: '' },
    };

    const arrayDefaultFilters = {
      status: { value: [] as string[], label: '' },
      category: { value: '', label: '' },
    };

    const definitions = [
      {
        key: 'status',
        predicate: (item: TestItem, value: string[]) => value.includes(item.status),
      },
    ];

    const result = applyFilters(testItems, filters, arrayDefaultFilters, definitions);
    expect(result).toHaveLength(3);
  });

  it('skips filters at default value', () => {
    const filters = {
      status: { value: 'active', label: 'Active' },
      category: { value: '', label: '' }, // default value
    };

    const definitions = [
      {
        key: 'status',
        predicate: (item: TestItem, value: string) => item.status === value,
      },
      {
        key: 'category',
        predicate: (item: TestItem, value: string) => item.category === value,
      },
    ];

    const result = applyFilters(testItems, filters, defaultFilters, definitions);
    // Only status filter should apply
    expect(result).toHaveLength(2);
  });

  it('handles missing filter definition', () => {
    const filters = {
      status: { value: 'active', label: 'Active' },
      nonexistent: { value: 'value', label: 'Value' },
    };

    const definitions = [
      {
        key: 'status',
        predicate: (item: TestItem, value: string) => item.status === value,
      },
      // No definition for 'nonexistent'
    ];

    const result = applyFilters(testItems, filters, defaultFilters, definitions);
    // Should only apply status filter, skip nonexistent
    expect(result).toHaveLength(2);
  });
});

describe('applySearch function', () => {
  const { applySearch } = require('@/lib/hooks/use-search');

  interface TestItem {
    id: number;
    name: string;
    description: string;
    price: number;
  }

  const testItems: TestItem[] = [
    { id: 1, name: 'Apple iPhone', description: 'Latest smartphone', price: 999 },
    { id: 2, name: 'Samsung Galaxy', description: 'Android phone', price: 899 },
    { id: 3, name: 'Apple Watch', description: 'Smart watch device', price: 399 },
    { id: 4, name: 'Sony Headphones', description: 'Wireless audio', price: 199 },
  ];

  it('returns all items when query is empty', () => {
    const result = applySearch(testItems, '', ['name']);
    expect(result).toEqual(testItems);
  });

  it('returns all items when query is whitespace', () => {
    const result = applySearch(testItems, '   ', ['name']);
    expect(result).toEqual(testItems);
  });

  it('searches in specified string fields', () => {
    const result = applySearch(testItems, 'apple', ['name']);
    expect(result).toHaveLength(2);
    expect(result.every(item => item.name.toLowerCase().includes('apple'))).toBe(true);
  });

  it('searches across multiple fields', () => {
    const result = applySearch(testItems, 'phone', ['name', 'description']);
    // iPhone, Android phone, Headphones (wireless audio description doesn't contain 'phone' but name contains 'phone')
    expect(result).toHaveLength(3); // iPhone, Samsung Galaxy (Android phone), Sony Headphones
  });

  it('is case insensitive', () => {
    const result1 = applySearch(testItems, 'APPLE', ['name']);
    const result2 = applySearch(testItems, 'apple', ['name']);
    expect(result1).toEqual(result2);
  });

  it('searches in numeric fields', () => {
    const result = applySearch(testItems, '999', ['price']);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Apple iPhone');
  });

  it('handles partial matches', () => {
    const result = applySearch(testItems, 'watch', ['name', 'description']);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Apple Watch');
  });

  it('returns empty array when no matches', () => {
    const result = applySearch(testItems, 'xyz123nonexistent', ['name', 'description']);
    expect(result).toHaveLength(0);
  });
});

describe('applySearchAndFilters function', () => {
  const { applySearchAndFilters } = require('@/lib/hooks/use-search');

  interface TestItem {
    id: number;
    name: string;
    status: string;
    category: string;
  }

  const testItems: TestItem[] = [
    { id: 1, name: 'Nike Running Shoes', status: 'active', category: 'sports' },
    { id: 2, name: 'Adidas Soccer Ball', status: 'inactive', category: 'sports' },
    { id: 3, name: 'Nike Tech Fleece', status: 'active', category: 'apparel' },
    { id: 4, name: 'Samsung Phone', status: 'active', category: 'tech' },
  ];

  const defaultFilters = {
    status: { value: '', label: '' },
    category: { value: '', label: '' },
  };

  it('applies both search and filters', () => {
    const filters = {
      status: { value: 'active', label: 'Active' },
      category: { value: '', label: '' },
    };

    const definitions = [
      {
        key: 'status',
        predicate: (item: TestItem, value: string) => item.status === value,
      },
    ];

    const result = applySearchAndFilters(
      testItems,
      'nike',
      ['name'],
      filters,
      defaultFilters,
      definitions
    );

    expect(result).toHaveLength(2);
    expect(result.every(item => item.name.toLowerCase().includes('nike'))).toBe(true);
    expect(result.every(item => item.status === 'active')).toBe(true);
  });

  it('returns filtered results when no search query', () => {
    const filters = {
      status: { value: '', label: '' },
      category: { value: 'sports', label: 'Sports' },
    };

    const definitions = [
      {
        key: 'category',
        predicate: (item: TestItem, value: string) => item.category === value,
      },
    ];

    const result = applySearchAndFilters(
      testItems,
      '',
      ['name'],
      filters,
      defaultFilters,
      definitions
    );

    expect(result).toHaveLength(2);
    expect(result.every(item => item.category === 'sports')).toBe(true);
  });

  it('returns searched results when no filters', () => {
    const result = applySearchAndFilters(
      testItems,
      'phone',
      ['name'],
      defaultFilters,
      defaultFilters,
      []
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Samsung Phone');
  });

  it('returns all items when no search and no filters', () => {
    const result = applySearchAndFilters(
      testItems,
      '',
      ['name'],
      defaultFilters,
      defaultFilters,
      []
    );

    expect(result).toEqual(testItems);
  });
});

describe('useSearchWithFilters hook', () => {
  const { useSearchWithFilters } = require('@/lib/hooks/use-search');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('combines search and filter functionality', () => {
    const defaultFilters = {
      status: { value: '', label: '' },
    };

    const { result } = renderHook(() =>
      useSearchWithFilters({
        searchOptions: { debounceMs: 100 },
        filterOptions: { defaultFilters },
      })
    );

    // Should have search properties
    expect(result.current.query).toBe('');
    expect(typeof result.current.setQuery).toBe('function');
    expect(typeof result.current.clearQuery).toBe('function');

    // Should have filter properties
    expect(result.current.filters).toEqual(defaultFilters);
    expect(typeof result.current.setFilter).toBe('function');
    expect(typeof result.current.resetFilters).toBe('function');
  });

  it('updates search state', () => {
    const { result } = renderHook(() =>
      useSearchWithFilters({
        searchOptions: { debounceMs: 100 },
        filterOptions: { defaultFilters: { status: { value: '', label: '' } } },
      })
    );

    act(() => {
      result.current.setQuery('test');
    });

    expect(result.current.query).toBe('test');

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.debouncedQuery).toBe('test');
  });

  it('updates filter state', () => {
    const { result } = renderHook(() =>
      useSearchWithFilters({
        searchOptions: {},
        filterOptions: { defaultFilters: { status: { value: '', label: '' } } },
      })
    );

    act(() => {
      result.current.setFilter('status', { value: 'active', label: 'Active' });
    });

    expect(result.current.filters.status.value).toBe('active');
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('tracks active filter count', () => {
    const { result } = renderHook(() =>
      useSearchWithFilters({
        searchOptions: {},
        filterOptions: {
          defaultFilters: {
            status: { value: '', label: '' },
            category: { value: '', label: '' },
          },
        },
      })
    );

    expect(result.current.activeFilterCount).toBe(0);

    act(() => {
      result.current.setFilter('status', { value: 'active', label: 'Active' });
    });

    expect(result.current.activeFilterCount).toBe(1);

    act(() => {
      result.current.setFilter('category', { value: 'sports', label: 'Sports' });
    });

    expect(result.current.activeFilterCount).toBe(2);
  });
});
