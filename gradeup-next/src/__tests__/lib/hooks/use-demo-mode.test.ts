import { renderHook } from '@testing-library/react';
import {
  isDemoMode,
  useDemoData,
  fetchWithDemoFallback,
} from '@/lib/hooks/use-demo-mode';

describe('use-demo-mode', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset the environment before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isDemoMode', () => {
    it('returns true when NEXT_PUBLIC_DEMO_MODE is true', () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
      expect(isDemoMode()).toBe(true);
    });

    it('returns false when NEXT_PUBLIC_DEMO_MODE is false', () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
      expect(isDemoMode()).toBe(false);
    });

    it('returns false when NEXT_PUBLIC_DEMO_MODE is undefined', () => {
      delete process.env.NEXT_PUBLIC_DEMO_MODE;
      expect(isDemoMode()).toBe(false);
    });

    it('returns false when NEXT_PUBLIC_DEMO_MODE has unexpected value', () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = 'yes';
      expect(isDemoMode()).toBe(false);
    });
  });

  describe('useDemoData', () => {
    it('returns demo data when in demo mode', () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
      const demoData = { test: 'data', value: 123 };
      const { result } = renderHook(() => useDemoData(demoData));

      expect(result.current.isDemoMode).toBe(true);
      expect(result.current.data).toEqual(demoData);
    });

    it('returns null when not in demo mode', () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
      const demoData = { test: 'data' };
      const { result } = renderHook(() => useDemoData(demoData));

      expect(result.current.isDemoMode).toBe(false);
      expect(result.current.data).toBeNull();
    });

    it('handles complex nested data structures', () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
      const complexData = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
        metadata: {
          count: 2,
          lastUpdated: '2025-01-01',
        },
      };
      const { result } = renderHook(() => useDemoData(complexData));

      expect(result.current.data).toEqual(complexData);
    });

    it('handles array as demo data', () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
      const arrayData = [1, 2, 3, 4, 5];
      const { result } = renderHook(() => useDemoData(arrayData));

      expect(result.current.data).toEqual(arrayData);
    });

    it('memoizes the isDemoMode result', () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
      const demoData = { test: 'data' };
      const { result, rerender } = renderHook(() => useDemoData(demoData));

      const firstIsDemoMode = result.current.isDemoMode;
      rerender();

      // Should still be the same boolean value
      expect(result.current.isDemoMode).toBe(firstIsDemoMode);
    });
  });

  describe('fetchWithDemoFallback', () => {
    it('returns demo data without calling fetcher in demo mode', async () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
      const fetcher = jest.fn();
      const demoData = { demo: true, value: 'mock' };

      const result = await fetchWithDemoFallback(fetcher, demoData);

      expect(fetcher).not.toHaveBeenCalled();
      expect(result.data).toEqual(demoData);
      expect(result.isDemo).toBe(true);
    });

    it('calls fetcher when not in demo mode', async () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
      const fetchedData = { real: true, fromApi: 'data' };
      const fetcher = jest.fn().mockResolvedValue(fetchedData);
      const demoData = { demo: true };

      const result = await fetchWithDemoFallback(fetcher, demoData);

      expect(fetcher).toHaveBeenCalled();
      expect(result.data).toEqual(fetchedData);
      expect(result.isDemo).toBe(false);
    });

    it('handles fetcher errors correctly when not in demo mode', async () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
      const error = new Error('API failure');
      const fetcher = jest.fn().mockRejectedValue(error);
      const demoData = { demo: true };

      await expect(fetchWithDemoFallback(fetcher, demoData)).rejects.toThrow('API failure');
      expect(fetcher).toHaveBeenCalled();
    });

    it('handles async fetcher with delay', async () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
      const fetchedData = { delayed: true };
      const fetcher = jest.fn().mockImplementation(
        () =>
          new Promise(resolve => setTimeout(() => resolve(fetchedData), 50))
      );

      const result = await fetchWithDemoFallback(fetcher, { demo: true });

      expect(result.data).toEqual(fetchedData);
      expect(result.isDemo).toBe(false);
    });

    it('does not wait for fetcher in demo mode', async () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
      const demoData = { instant: true };

      // This fetcher would take a long time, but should never be called
      const slowFetcher = jest.fn().mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve({ slow: true }), 10000)
          )
      );

      const start = Date.now();
      const result = await fetchWithDemoFallback(slowFetcher, demoData);
      const elapsed = Date.now() - start;

      // Should complete almost instantly (within 100ms), not wait for the slow fetcher
      expect(elapsed).toBeLessThan(100);
      expect(result.data).toEqual(demoData);
      expect(result.isDemo).toBe(true);
    });
  });
});
