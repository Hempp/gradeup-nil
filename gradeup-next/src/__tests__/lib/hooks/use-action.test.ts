/**
 * Tests for useAction hook
 * @module __tests__/lib/hooks/use-action.test
 */

import { renderHook, act } from '@testing-library/react';
import { useAction } from '@/lib/hooks/use-action';

// Mock toast
const mockAddToast = jest.fn();
jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    addToast: mockAddToast,
    toasts: [],
    removeToast: jest.fn(),
  }),
}));

describe('useAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with correct initial state', () => {
      const action = jest.fn().mockResolvedValue({ data: null, error: null });
      const { result } = renderHook(() => useAction(action));

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.data).toBeNull();
    });

    it('provides execute function', () => {
      const action = jest.fn().mockResolvedValue({ data: null, error: null });
      const { result } = renderHook(() => useAction(action));

      expect(typeof result.current.execute).toBe('function');
    });
  });

  describe('execute', () => {
    it('calls action with provided arguments', async () => {
      const action = jest.fn().mockResolvedValue({ data: 'result', error: null });
      const { result } = renderHook(() => useAction(action));

      await act(async () => {
        await result.current.execute('arg1', 'arg2');
      });

      expect(action).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('sets loading to true while executing', async () => {
      let resolvePromise: (value: { data: string; error: null }) => void;
      const action = jest.fn().mockImplementation(
        () => new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() => useAction(action));

      act(() => {
        result.current.execute();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise!({ data: 'done', error: null });
      });

      expect(result.current.loading).toBe(false);
    });

    it('sets data on success', async () => {
      const action = jest.fn().mockResolvedValue({ data: { id: '123' }, error: null });
      const { result } = renderHook(() => useAction(action));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toEqual({ id: '123' });
      expect(result.current.error).toBeNull();
    });

    it('sets error on failure', async () => {
      const testError = new Error('Action failed');
      const action = jest.fn().mockResolvedValue({ data: null, error: testError });
      const { result } = renderHook(() => useAction(action));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBe(testError);
      expect(result.current.data).toBeNull();
    });

    it('returns data on success', async () => {
      const action = jest.fn().mockResolvedValue({ data: 'success', error: null });
      const { result } = renderHook(() => useAction(action));

      let returnValue;
      await act(async () => {
        returnValue = await result.current.execute();
      });

      expect(returnValue).toBe('success');
    });

    it('returns null on error', async () => {
      const action = jest.fn().mockResolvedValue({ data: null, error: new Error('Fail') });
      const { result } = renderHook(() => useAction(action));

      let returnValue;
      await act(async () => {
        returnValue = await result.current.execute();
      });

      expect(returnValue).toBeNull();
    });
  });

  describe('toast notifications', () => {
    it('shows success toast when successMessage provided', async () => {
      const action = jest.fn().mockResolvedValue({ data: 'done', error: null });
      const { result } = renderHook(() =>
        useAction(action, { successMessage: 'Action completed!' })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Action completed!',
          variant: 'success',
        })
      );
    });

    it('shows error toast on failure', async () => {
      const action = jest.fn().mockResolvedValue({ data: null, error: new Error('Failed') });
      const { result } = renderHook(() => useAction(action));

      await act(async () => {
        await result.current.execute();
      });

      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed',
          variant: 'error',
        })
      );
    });

    it('uses custom error message when provided', async () => {
      const action = jest.fn().mockResolvedValue({ data: null, error: new Error('Technical error') });
      const { result } = renderHook(() =>
        useAction(action, { errorMessage: 'Something went wrong' })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Something went wrong',
          variant: 'error',
        })
      );
    });

    it('shows loading toast when loadingMessage provided', async () => {
      const action = jest.fn().mockResolvedValue({ data: 'done', error: null });
      const { result } = renderHook(() =>
        useAction(action, { loadingMessage: 'Processing...' })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Processing...',
          variant: 'info',
        })
      );
    });
  });

  describe('callbacks', () => {
    it('calls onSuccess callback on success', async () => {
      const onSuccess = jest.fn();
      const action = jest.fn().mockResolvedValue({ data: { id: '123' }, error: null });
      const { result } = renderHook(() => useAction(action, { onSuccess }));

      await act(async () => {
        await result.current.execute();
      });

      expect(onSuccess).toHaveBeenCalledWith({ id: '123' });
    });

    it('does not call onSuccess when data is null', async () => {
      const onSuccess = jest.fn();
      const action = jest.fn().mockResolvedValue({ data: null, error: null });
      const { result } = renderHook(() => useAction(action, { onSuccess }));

      await act(async () => {
        await result.current.execute();
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('calls onError callback on error', async () => {
      const onError = jest.fn();
      const testError = new Error('Test error');
      const action = jest.fn().mockResolvedValue({ data: null, error: testError });
      const { result } = renderHook(() => useAction(action, { onError }));

      await act(async () => {
        await result.current.execute();
      });

      expect(onError).toHaveBeenCalledWith(testError);
    });
  });

  describe('exception handling', () => {
    it('handles thrown exceptions', async () => {
      const action = jest.fn().mockRejectedValue(new Error('Thrown error'));
      const { result } = renderHook(() => useAction(action));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error?.message).toBe('Thrown error');
      expect(result.current.data).toBeNull();
    });

    it('converts non-Error throws to Error', async () => {
      const action = jest.fn().mockRejectedValue('String error');
      const { result } = renderHook(() => useAction(action));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('shows error toast for thrown exceptions', async () => {
      const action = jest.fn().mockRejectedValue(new Error('Exception'));
      const { result } = renderHook(() => useAction(action));

      await act(async () => {
        await result.current.execute();
      });

      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'error',
        })
      );
    });
  });

  describe('race conditions', () => {
    it('only uses latest execution result', async () => {
      let resolveFirst: (value: { data: string; error: null }) => void;
      let resolveSecond: (value: { data: string; error: null }) => void;

      const action = jest
        .fn()
        .mockImplementationOnce(
          () => new Promise((resolve) => { resolveFirst = resolve; })
        )
        .mockImplementationOnce(
          () => new Promise((resolve) => { resolveSecond = resolve; })
        );

      const { result } = renderHook(() => useAction(action));

      // Start first execution
      act(() => {
        result.current.execute();
      });

      // Start second execution before first completes
      act(() => {
        result.current.execute();
      });

      // Resolve second first
      await act(async () => {
        resolveSecond!({ data: 'second', error: null });
      });

      // Resolve first after second
      await act(async () => {
        resolveFirst!({ data: 'first', error: null });
      });

      // Should have second result, not first
      expect(result.current.data).toBe('second');
    });
  });
});
