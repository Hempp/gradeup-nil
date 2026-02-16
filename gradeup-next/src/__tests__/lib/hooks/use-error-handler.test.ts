/**
 * Tests for useErrorHandler hook
 * @module __tests__/lib/hooks/use-error-handler.test
 */

import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '@/lib/hooks/use-error-handler';

// Mock toast actions
const mockError = jest.fn();
jest.mock('@/components/ui/toast', () => ({
  useToastActions: () => ({
    error: mockError,
    success: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  }),
}));

// Mock error handler
jest.mock('@/lib/utils/error-handler', () => ({
  handleError: jest.fn(),
  parseError: jest.fn((error: unknown) => ({
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error',
    userMessage: error instanceof Error ? error.message : 'Something went wrong',
    originalError: error,
  })),
}));

describe('useErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('shows toast by default', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handle(new Error('Test error'));
      });

      expect(mockError).toHaveBeenCalledWith('Test error');
    });

    it('does not show toast when silent', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handle(new Error('Test error'), true);
      });

      expect(mockError).not.toHaveBeenCalled();
    });

    it('does not show toast when showToast option is false', () => {
      const { result } = renderHook(() => useErrorHandler({ showToast: false }));

      act(() => {
        result.current.handle(new Error('Test error'));
      });

      expect(mockError).not.toHaveBeenCalled();
    });

    it('calls onError callback', () => {
      const onError = jest.fn();
      const { result } = renderHook(() => useErrorHandler({ onError }));

      act(() => {
        result.current.handle(new Error('Test error'));
      });

      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0].message).toBe('Test error');
    });

    it('returns parsed error', () => {
      const { result } = renderHook(() => useErrorHandler());

      let appError;
      act(() => {
        appError = result.current.handle(new Error('Test error'));
      });

      expect(appError).toEqual(
        expect.objectContaining({
          code: 'UNKNOWN_ERROR',
          message: 'Test error',
        })
      );
    });
  });

  describe('handleAsync', () => {
    it('returns data on success', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const { data, error } = await result.current.handleAsync(
        Promise.resolve({ success: true })
      );

      expect(data).toEqual({ success: true });
      expect(error).toBeNull();
    });

    it('returns error on failure', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const { data, error } = await result.current.handleAsync(
        Promise.reject(new Error('Async error'))
      );

      expect(data).toBeNull();
      expect(error).toEqual(
        expect.objectContaining({
          message: 'Async error',
        })
      );
    });

    it('returns fallback on error when provided', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const { data, error } = await result.current.handleAsync(
        Promise.reject(new Error('Error')),
        { fallback: { default: true } }
      );

      expect(data).toEqual({ default: true });
      expect(error).not.toBeNull();
    });

    it('does not show toast when silent', async () => {
      const { result } = renderHook(() => useErrorHandler());

      await result.current.handleAsync(
        Promise.reject(new Error('Silent error')),
        { silent: true }
      );

      expect(mockError).not.toHaveBeenCalled();
    });
  });

  describe('wrapAsync', () => {
    it('wraps function and returns data on success', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const asyncFn = async (value: unknown) => `Result: ${value}`;
      const wrappedFn = result.current.wrapAsync(asyncFn);

      const { data, error } = await wrappedFn('test');

      expect(data).toBe('Result: test');
      expect(error).toBeNull();
    });

    it('wraps function and returns error on failure', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const asyncFn = async () => {
        throw new Error('Wrapped error');
      };
      const wrappedFn = result.current.wrapAsync(asyncFn);

      const { data, error } = await wrappedFn();

      expect(data).toBeNull();
      expect(error).toEqual(
        expect.objectContaining({
          message: 'Wrapped error',
        })
      );
    });

    it('does not show toast when silent option provided', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const asyncFn = async () => {
        throw new Error('Silent wrapped error');
      };
      const wrappedFn = result.current.wrapAsync(asyncFn, { silent: true });

      await wrappedFn();

      expect(mockError).not.toHaveBeenCalled();
    });
  });
});
