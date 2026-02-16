import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAction } from '@/lib/hooks/use-action';
import { ToastProvider } from '@/components/ui/toast';

// Mock wrapper for ToastProvider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe('useAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('returns initial state correctly', () => {
      const action = jest.fn().mockResolvedValue({ data: null, error: null });
      const { result } = renderHook(() => useAction(action), { wrapper });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.data).toBeNull();
      expect(typeof result.current.execute).toBe('function');
    });
  });

  describe('loading state', () => {
    it('sets loading state during execution', async () => {
      const action = jest.fn().mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve({ data: 'test', error: null }), 100)
          )
      );

      const { result } = renderHook(() => useAction(action), { wrapper });

      let executePromise: Promise<unknown>;
      act(() => {
        executePromise = result.current.execute();
      });

      // Should be loading immediately after calling execute
      expect(result.current.loading).toBe(true);

      await act(async () => {
        await executePromise;
      });

      // Should no longer be loading after completion
      expect(result.current.loading).toBe(false);
    });

    it('clears error state when starting new execution', async () => {
      const error = new Error('Test error');
      const action = jest
        .fn()
        .mockResolvedValueOnce({ data: null, error })
        .mockResolvedValueOnce({ data: 'success', error: null });

      const { result } = renderHook(() => useAction(action), { wrapper });

      // First call fails
      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toEqual(error);

      // Second call starts - error should be cleared
      let secondExecute: Promise<unknown>;
      act(() => {
        secondExecute = result.current.execute();
      });

      expect(result.current.error).toBeNull();

      await act(async () => {
        await secondExecute;
      });
    });
  });

  describe('successful action', () => {
    it('handles successful action and stores data', async () => {
      const successData = { id: 1, name: 'Test' };
      const action = jest.fn().mockResolvedValue({ data: successData, error: null });
      const onSuccess = jest.fn();

      const { result } = renderHook(
        () => useAction(action, { onSuccess }),
        { wrapper }
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toEqual(successData);
      expect(result.current.error).toBeNull();
      expect(onSuccess).toHaveBeenCalledWith(successData);
    });

    it('returns data from execute call', async () => {
      const successData = { value: 42 };
      const action = jest.fn().mockResolvedValue({ data: successData, error: null });

      const { result } = renderHook(() => useAction(action), { wrapper });

      let returnedData: unknown;
      await act(async () => {
        returnedData = await result.current.execute();
      });

      expect(returnedData).toEqual(successData);
    });

    it('does not call onSuccess when data is null but no error', async () => {
      const action = jest.fn().mockResolvedValue({ data: null, error: null });
      const onSuccess = jest.fn();

      const { result } = renderHook(
        () => useAction(action, { onSuccess }),
        { wrapper }
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('handles error from action result', async () => {
      const error = new Error('Action failed');
      const action = jest.fn().mockResolvedValue({ data: null, error });
      const onError = jest.fn();

      const { result } = renderHook(
        () => useAction(action, { onError }),
        { wrapper }
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onError).toHaveBeenCalledWith(error);
      expect(result.current.error).toEqual(error);
      expect(result.current.data).toBeNull();
    });

    it('handles thrown error from action', async () => {
      const error = new Error('Thrown error');
      const action = jest.fn().mockRejectedValue(error);
      const onError = jest.fn();

      const { result } = renderHook(
        () => useAction(action, { onError }),
        { wrapper }
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onError).toHaveBeenCalledWith(error);
      expect(result.current.error).toEqual(error);
    });

    it('converts non-Error thrown values to Error', async () => {
      const action = jest.fn().mockRejectedValue('String error');
      const onError = jest.fn();

      const { result } = renderHook(
        () => useAction(action, { onError }),
        { wrapper }
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('An unknown error occurred');
    });

    it('returns null from execute on error', async () => {
      const action = jest.fn().mockResolvedValue({ data: null, error: new Error('fail') });

      const { result } = renderHook(() => useAction(action), { wrapper });

      let returnedData: unknown;
      await act(async () => {
        returnedData = await result.current.execute();
      });

      expect(returnedData).toBeNull();
    });
  });

  describe('with arguments', () => {
    it('passes arguments to action function', async () => {
      const action = jest.fn().mockResolvedValue({ data: 'result', error: null });

      const { result } = renderHook(
        () => useAction(action),
        { wrapper }
      );

      await act(async () => {
        await result.current.execute('arg1', 123, { key: 'value' });
      });

      expect(action).toHaveBeenCalledWith('arg1', 123, { key: 'value' });
    });

    it('works with typed arguments', async () => {
      const action = jest.fn<
        Promise<{ data: string | null; error: null }>,
        [string, number]
      >().mockResolvedValue({ data: 'result', error: null });

      const { result } = renderHook(
        () => useAction<string, [string, number]>(action),
        { wrapper }
      );

      await act(async () => {
        await result.current.execute('test', 42);
      });

      expect(action).toHaveBeenCalledWith('test', 42);
    });
  });

  describe('race conditions', () => {
    it('ignores outdated responses when multiple calls are made', async () => {
      let resolveFirst: (value: { data: string; error: null }) => void;
      let resolveSecond: (value: { data: string; error: null }) => void;

      const action = jest
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<{ data: string; error: null }>(resolve => {
              resolveFirst = resolve;
            })
        )
        .mockImplementationOnce(
          () =>
            new Promise<{ data: string; error: null }>(resolve => {
              resolveSecond = resolve;
            })
        );

      const { result } = renderHook(() => useAction(action), { wrapper });

      // Start first call
      act(() => {
        result.current.execute();
      });

      // Start second call before first completes
      act(() => {
        result.current.execute();
      });

      // Resolve second call first
      await act(async () => {
        resolveSecond!({ data: 'second', error: null });
      });

      // Wait for state to settle
      await waitFor(() => {
        expect(result.current.data).toBe('second');
      });

      // Now resolve first call (should be ignored)
      await act(async () => {
        resolveFirst!({ data: 'first', error: null });
      });

      // Data should still be 'second', not 'first'
      expect(result.current.data).toBe('second');
    });
  });

  describe('toast messages', () => {
    it('accepts successMessage option', async () => {
      const action = jest.fn().mockResolvedValue({ data: 'success', error: null });

      const { result } = renderHook(
        () =>
          useAction(action, {
            successMessage: 'Operation completed!',
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.execute();
      });

      // Verify the hook completed successfully
      expect(result.current.data).toBe('success');
    });

    it('accepts errorMessage option', async () => {
      const action = jest.fn().mockResolvedValue({ data: null, error: new Error('fail') });

      const { result } = renderHook(
        () =>
          useAction(action, {
            errorMessage: 'Something went wrong',
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.execute();
      });

      // Verify the hook completed with error
      expect(result.current.error).toBeTruthy();
    });

    it('accepts loadingMessage option', async () => {
      const action = jest.fn().mockResolvedValue({ data: 'result', error: null });

      const { result } = renderHook(
        () =>
          useAction(action, {
            loadingMessage: 'Processing...',
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toBe('result');
    });
  });

  describe('callback options', () => {
    it('calls both onSuccess callback and stores data', async () => {
      const data = { id: 'abc', value: 100 };
      const action = jest.fn().mockResolvedValue({ data, error: null });
      const onSuccess = jest.fn();

      const { result } = renderHook(
        () => useAction(action, { onSuccess, successMessage: 'Done!' }),
        { wrapper }
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toEqual(data);
      expect(onSuccess).toHaveBeenCalledWith(data);
    });

    it('calls onError with error from result', async () => {
      const error = new Error('Validation failed');
      const action = jest.fn().mockResolvedValue({ data: null, error });
      const onError = jest.fn();

      const { result } = renderHook(
        () => useAction(action, { onError }),
        { wrapper }
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onError).toHaveBeenCalledWith(error);
    });

    it('calls onError with caught exception', async () => {
      const error = new Error('Network error');
      const action = jest.fn().mockRejectedValue(error);
      const onError = jest.fn();

      const { result } = renderHook(
        () => useAction(action, { onError }),
        { wrapper }
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe('state transitions', () => {
    it('maintains correct state through success flow', async () => {
      const data = { status: 'complete' };
      const action = jest.fn().mockResolvedValue({ data, error: null });

      const { result } = renderHook(() => useAction(action), { wrapper });

      // Initial state
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();

      let promise: Promise<unknown>;
      act(() => {
        promise = result.current.execute();
      });

      // Loading state
      expect(result.current.loading).toBe(true);

      await act(async () => {
        await promise;
      });

      // Final state
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual(data);
      expect(result.current.error).toBeNull();
    });

    it('maintains correct state through error flow', async () => {
      const error = new Error('Fail');
      const action = jest.fn().mockResolvedValue({ data: null, error });

      const { result } = renderHook(() => useAction(action), { wrapper });

      let promise: Promise<unknown>;
      act(() => {
        promise = result.current.execute();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        await promise;
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toEqual(error);
    });

    it('clears previous data on error', async () => {
      const action = jest
        .fn()
        .mockResolvedValueOnce({ data: 'first success', error: null })
        .mockResolvedValueOnce({ data: null, error: new Error('Second fails') });

      const { result } = renderHook(() => useAction(action), { wrapper });

      // First call succeeds
      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toBe('first success');

      // Second call fails - should clear data
      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeTruthy();
    });

    it('clears previous error on success', async () => {
      const action = jest
        .fn()
        .mockResolvedValueOnce({ data: null, error: new Error('First fails') })
        .mockResolvedValueOnce({ data: 'second success', error: null });

      const { result } = renderHook(() => useAction(action), { wrapper });

      // First call fails
      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBeTruthy();

      // Second call succeeds - should clear error
      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.data).toBe('second success');
    });
  });
});
