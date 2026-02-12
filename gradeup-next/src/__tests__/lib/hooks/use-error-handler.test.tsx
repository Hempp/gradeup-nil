import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '@/lib/hooks/use-error-handler';
import type { AppError } from '@/lib/utils/error-handler';

// Mock the toast actions
const mockShowError = jest.fn();
jest.mock('@/components/ui/toast', () => ({
  useToastActions: () => ({
    error: mockShowError,
    success: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  }),
}));

// Mock the error handler utils
jest.mock('@/lib/utils/error-handler', () => ({
  handleError: jest.fn(),
  parseError: jest.fn((error: unknown) => {
    if (error instanceof Error) {
      return {
        code: 'TEST_ERROR',
        message: error.message,
        userMessage: `User message: ${error.message}`,
        severity: 'medium',
      };
    }
    return {
      code: 'UNKNOWN_ERROR',
      message: 'Unknown error',
      userMessage: 'Something went wrong',
      severity: 'medium',
    };
  }),
}));

interface AsyncResult<T> {
  data: T | null;
  error: AppError | null;
}

describe('useErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('parses error and returns AppError', () => {
      const { result } = renderHook(() => useErrorHandler());
      const testError = new Error('Test error');

      let appError: AppError | undefined;
      act(() => {
        appError = result.current.handle(testError);
      });

      expect(appError).toEqual({
        code: 'TEST_ERROR',
        message: 'Test error',
        userMessage: 'User message: Test error',
        severity: 'medium',
      });
    });

    it('shows toast by default', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handle(new Error('Test'));
      });

      expect(mockShowError).toHaveBeenCalledWith('User message: Test');
    });

    it('does not show toast when silent', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handle(new Error('Test'), true);
      });

      expect(mockShowError).not.toHaveBeenCalled();
    });

    it('does not show toast when showToast option is false', () => {
      const { result } = renderHook(() => useErrorHandler({ showToast: false }));

      act(() => {
        result.current.handle(new Error('Test'));
      });

      expect(mockShowError).not.toHaveBeenCalled();
    });

    it('calls custom onError callback', () => {
      const onError = jest.fn();
      const { result } = renderHook(() => useErrorHandler({ onError }));

      act(() => {
        result.current.handle(new Error('Test'));
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'TEST_ERROR' })
      );
    });
  });

  describe('handleAsync', () => {
    it('returns data on success', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const successPromise = Promise.resolve('success data');

      let response: AsyncResult<string> | undefined;
      await act(async () => {
        response = await result.current.handleAsync(successPromise);
      });

      expect(response).toEqual({ data: 'success data', error: null });
    });

    it('returns error on failure', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const failPromise = Promise.reject(new Error('Failed'));

      let response: AsyncResult<unknown> | undefined;
      await act(async () => {
        response = await result.current.handleAsync(failPromise);
      });

      expect(response?.data).toBeNull();
      expect(response?.error).toEqual(
        expect.objectContaining({ code: 'TEST_ERROR' })
      );
    });

    it('uses fallback value on error', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const failPromise = Promise.reject(new Error('Failed'));

      let response: AsyncResult<string> | undefined;
      await act(async () => {
        response = await result.current.handleAsync(failPromise, {
          fallback: 'fallback value',
        });
      });

      expect(response?.data).toBe('fallback value');
    });

    it('can be silent', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const failPromise = Promise.reject(new Error('Failed'));

      await act(async () => {
        await result.current.handleAsync(failPromise, { silent: true });
      });

      expect(mockShowError).not.toHaveBeenCalled();
    });
  });

  describe('wrapAsync', () => {
    it('wraps successful async function', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const asyncFn = jest.fn().mockResolvedValue('result');

      let response: AsyncResult<string> | undefined;
      await act(async () => {
        const wrapped = result.current.wrapAsync(asyncFn);
        response = await wrapped('arg1', 'arg2');
      });

      expect(asyncFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(response).toEqual({ data: 'result', error: null });
    });

    it('wraps failing async function', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const asyncFn = jest.fn().mockRejectedValue(new Error('Failed'));

      let response: AsyncResult<unknown> | undefined;
      await act(async () => {
        const wrapped = result.current.wrapAsync(asyncFn);
        response = await wrapped();
      });

      expect(response?.data).toBeNull();
      expect(response?.error).toEqual(
        expect.objectContaining({ code: 'TEST_ERROR' })
      );
    });

    it('can be configured as silent', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const asyncFn = jest.fn().mockRejectedValue(new Error('Failed'));

      await act(async () => {
        const wrapped = result.current.wrapAsync(asyncFn, { silent: true });
        await wrapped();
      });

      expect(mockShowError).not.toHaveBeenCalled();
    });
  });
});
