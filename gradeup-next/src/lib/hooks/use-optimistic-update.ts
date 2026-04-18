'use client';

import { useState, useCallback, useRef, useTransition } from 'react';
import { useToast } from '@/components/ui/toast';

/* ═══════════════════════════════════════════════════════════════════════════
   OPTIMISTIC UPDATE TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export type OptimisticStatus = 'idle' | 'pending' | 'success' | 'error' | 'rolledBack';

export interface OptimisticState<T> {
  /** Current data (optimistic or confirmed) */
  data: T;
  /** Previous data for rollback */
  previousData: T | null;
  /** Current operation status */
  status: OptimisticStatus;
  /** Error if operation failed */
  error: Error | null;
  /** Whether data is optimistic (not yet confirmed) */
  isOptimistic: boolean;
  /** Whether a transition is pending */
  isPending: boolean;
}

export interface UseOptimisticOptions<T> {
  /** Callback when optimistic update succeeds */
  onSuccess?: (data: T) => void;
  /** Callback when optimistic update fails and rolls back */
  onRollback?: (error: Error, previousData: T) => void;
  /** Show toast notifications (default: true for errors) */
  showErrorToast?: boolean;
  /** Custom error message for toast */
  errorMessage?: string;
  /** Rollback delay in ms (default: 0) */
  rollbackDelay?: number;
}

export interface UseOptimisticResult<T, A extends unknown[]> {
  /** Current optimistic state */
  state: OptimisticState<T>;
  /** Execute optimistic update */
  execute: (optimisticData: T, serverAction: (...args: A) => Promise<T>, ...args: A) => Promise<T | null>;
  /** Manually rollback to previous state */
  rollback: () => void;
  /** Reset to initial state */
  reset: (data: T) => void;
  /** Whether operation is in progress */
  isPending: boolean;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CORE OPTIMISTIC UPDATE HOOK
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Hook for optimistic UI updates with automatic rollback on failure.
 *
 * Optimistic updates show changes immediately while the server processes the request.
 * If the server request fails, the UI automatically rolls back to the previous state.
 *
 * @param initialData - Initial data state
 * @param options - Configuration options
 * @returns Optimistic state and control functions
 *
 * @example
 * // Basic usage - updating a deal status
 * const { state, execute, isPending } = useOptimistic(deal, {
 *   onSuccess: () => toast.success('Deal updated!'),
 *   onRollback: () => toast.error('Failed to update deal'),
 * });
 *
 * const handleAccept = async () => {
 *   const optimisticDeal = { ...deal, status: 'accepted' };
 *   await execute(optimisticDeal, updateDealStatus, deal.id, 'accepted');
 * };
 *
 * // The UI shows optimisticDeal immediately while server processes
 * return <DealCard deal={state.data} isPending={isPending} />;
 *
 * @example
 * // With list operations
 * const { state, execute } = useOptimistic(notifications);
 *
 * const markAsRead = async (id: string) => {
 *   const optimisticList = notifications.map(n =>
 *     n.id === id ? { ...n, read: true } : n
 *   );
 *   await execute(optimisticList, markNotificationRead, id);
 * };
 */
export function useOptimistic<T, A extends unknown[] = []>(
  initialData: T,
  options: UseOptimisticOptions<T> = {}
): UseOptimisticResult<T, A> {
  const {
    onSuccess,
    onRollback,
    showErrorToast = true,
    errorMessage,
    rollbackDelay = 0,
  } = options;

  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    previousData: null,
    status: 'idle',
    error: null,
    isOptimistic: false,
    isPending: false,
  });

  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();
  const isMountedRef = useRef(true);

  // Track mount state
  useState(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  });

  // Execute optimistic update
  const execute = useCallback(
    async (
      optimisticData: T,
      serverAction: (...args: A) => Promise<T>,
      ...args: A
    ): Promise<T | null> => {
      // Store previous data for potential rollback
      const previousData = state.data;

      // Immediately apply optimistic update
      setState((prev) => ({
        ...prev,
        data: optimisticData,
        previousData: previousData,
        status: 'pending',
        error: null,
        isOptimistic: true,
        isPending: true,
      }));

      try {
        // Execute server action (may be wrapped in startTransition)
        let result: T;

        await new Promise<void>((resolve) => {
          startTransition(async () => {
            try {
              result = await serverAction(...args);

              if (!isMountedRef.current) return;

              // Server confirmed - update with actual data
              setState((prev) => ({
                ...prev,
                data: result!,
                previousData: null,
                status: 'success',
                error: null,
                isOptimistic: false,
                isPending: false,
              }));

              onSuccess?.(result!);
              resolve();
            } catch (error) {
              if (!isMountedRef.current) return;

              const errorObj = error instanceof Error ? error : new Error('Operation failed');

              // Rollback after delay
              setTimeout(() => {
                if (!isMountedRef.current) return;

                setState((prev) => ({
                  ...prev,
                  data: previousData,
                  previousData: null,
                  status: 'rolledBack',
                  error: errorObj,
                  isOptimistic: false,
                  isPending: false,
                }));

                // Show error toast
                if (showErrorToast) {
                  addToast({
                    title: errorMessage || 'Operation failed',
                    description: errorObj.message,
                    variant: 'error',
                    action: {
                      label: 'Retry',
                      onClick: () => execute(optimisticData, serverAction, ...args),
                    },
                  });
                }

                onRollback?.(errorObj, previousData);
              }, rollbackDelay);

              resolve();
            }
          });
        });

        return state.data;
      } catch (error) {
        // Fallback error handling
        const errorObj = error instanceof Error ? error : new Error('Operation failed');

        setState((prev) => ({
          ...prev,
          data: previousData,
          previousData: null,
          status: 'error',
          error: errorObj,
          isOptimistic: false,
          isPending: false,
        }));

        return null;
      }
    },
    [state.data, onSuccess, onRollback, showErrorToast, errorMessage, rollbackDelay, addToast]
  );

  // Manual rollback
  const rollback = useCallback(() => {
    if (state.previousData !== null) {
      setState((prev) => ({
        ...prev,
        data: prev.previousData!,
        previousData: null,
        status: 'rolledBack',
        isOptimistic: false,
        isPending: false,
      }));
    }
  }, [state.previousData]);

  // Reset to new data
  const reset = useCallback((data: T) => {
    setState({
      data,
      previousData: null,
      status: 'idle',
      error: null,
      isOptimistic: false,
      isPending: false,
    });
  }, []);

  return {
    state,
    execute,
    rollback,
    reset,
    isPending: isPending || state.isPending,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   OPTIMISTIC LIST OPERATIONS
   ═══════════════════════════════════════════════════════════════════════════ */

export interface UseOptimisticListOptions<T> extends UseOptimisticOptions<T[]> {
  /** Key extractor for list items */
  getKey: (item: T) => string;
}

export interface UseOptimisticListResult<T, A extends unknown[]> extends UseOptimisticResult<T[], A> {
  /** Add item optimistically */
  addItem: (item: T, serverAction: (...args: A) => Promise<T>, ...args: A) => Promise<T | null>;
  /** Update item optimistically */
  updateItem: (
    key: string,
    updater: (item: T) => T,
    serverAction: (...args: A) => Promise<T>,
    ...args: A
  ) => Promise<T | null>;
  /** Remove item optimistically */
  removeItem: (key: string, serverAction: (...args: A) => Promise<void>, ...args: A) => Promise<void>;
  /** Reorder items optimistically */
  reorderItems: (
    fromIndex: number,
    toIndex: number,
    serverAction: (...args: A) => Promise<T[]>,
    ...args: A
  ) => Promise<T[] | null>;
}

/**
 * Hook for optimistic list operations (add, update, remove, reorder).
 *
 * @example
 * const { state, addItem, updateItem, removeItem } = useOptimisticList(deals, {
 *   getKey: (deal) => deal.id,
 * });
 *
 * // Add item optimistically
 * await addItem(newDeal, createDeal, newDeal);
 *
 * // Update item optimistically
 * await updateItem(deal.id, (d) => ({ ...d, status: 'active' }), updateDeal, deal.id);
 *
 * // Remove item optimistically
 * await removeItem(deal.id, deleteDeal, deal.id);
 */
export function useOptimisticList<T, A extends unknown[] = []>(
  initialList: T[],
  options: UseOptimisticListOptions<T>
): UseOptimisticListResult<T, A> {
  const { getKey, ...restOptions } = options;
  const baseOptimistic = useOptimistic<T[], A>(initialList, restOptions);

  // Add item
  const addItem = useCallback(
    async (
      item: T,
      serverAction: (...args: A) => Promise<T>,
      ...args: A
    ): Promise<T | null> => {
      const optimisticList = [...baseOptimistic.state.data, item];
      return baseOptimistic.execute(
        optimisticList,
        async (...actionArgs: A) => {
          const result = await serverAction(...actionArgs);
          return [...baseOptimistic.state.data, result];
        },
        ...args
      ) as Promise<T | null>;
    },
    [baseOptimistic]
  );

  // Update item
  const updateItem = useCallback(
    async (
      key: string,
      updater: (item: T) => T,
      serverAction: (...args: A) => Promise<T>,
      ...args: A
    ): Promise<T | null> => {
      const optimisticList = baseOptimistic.state.data.map((item) =>
        getKey(item) === key ? updater(item) : item
      );
      return baseOptimistic.execute(
        optimisticList,
        async (...actionArgs: A) => {
          const result = await serverAction(...actionArgs);
          return baseOptimistic.state.data.map((item) =>
            getKey(item) === key ? result : item
          );
        },
        ...args
      ) as Promise<T | null>;
    },
    [baseOptimistic, getKey]
  );

  // Remove item
  const removeItem = useCallback(
    async (
      key: string,
      serverAction: (...args: A) => Promise<void>,
      ...args: A
    ): Promise<void> => {
      const optimisticList = baseOptimistic.state.data.filter(
        (item) => getKey(item) !== key
      );
      await baseOptimistic.execute(
        optimisticList,
        async (...actionArgs: A) => {
          await serverAction(...actionArgs);
          return baseOptimistic.state.data.filter((item) => getKey(item) !== key);
        },
        ...args
      );
    },
    [baseOptimistic, getKey]
  );

  // Reorder items
  const reorderItems = useCallback(
    async (
      fromIndex: number,
      toIndex: number,
      serverAction: (...args: A) => Promise<T[]>,
      ...args: A
    ): Promise<T[] | null> => {
      const items = [...baseOptimistic.state.data];
      const [movedItem] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, movedItem);

      return baseOptimistic.execute(items, serverAction, ...args);
    },
    [baseOptimistic]
  );

  return {
    ...baseOptimistic,
    addItem,
    updateItem,
    removeItem,
    reorderItems,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   OPTIMISTIC TOGGLE HELPER
   ═══════════════════════════════════════════════════════════════════════════ */

export interface UseOptimisticToggleResult {
  /** Current value (optimistic or confirmed) */
  value: boolean;
  /** Toggle the value */
  toggle: () => Promise<void>;
  /** Whether toggle is pending */
  isPending: boolean;
  /** Whether current value is optimistic */
  isOptimistic: boolean;
}

/**
 * Simplified hook for optimistic boolean toggles.
 *
 * @example
 * const { value, toggle, isPending } = useOptimisticToggle(
 *   isSubscribed,
 *   async (newValue) => {
 *     await updateSubscription(newValue);
 *   }
 * );
 *
 * return (
 *   <Switch
 *     checked={value}
 *     onChange={toggle}
 *     disabled={isPending}
 *   />
 * );
 */
export function useOptimisticToggle(
  initialValue: boolean,
  serverAction: (newValue: boolean) => Promise<void>,
  options: Omit<UseOptimisticOptions<boolean>, 'onSuccess'> = {}
): UseOptimisticToggleResult {
  const { state, execute, isPending } = useOptimistic<boolean, [boolean]>(initialValue, options);

  const toggle = useCallback(async () => {
    const newValue = !state.data;
    await execute(
      newValue,
      async (value) => {
        await serverAction(value);
        return value;
      },
      newValue
    );
  }, [state.data, execute, serverAction]);

  return {
    value: state.data,
    toggle,
    isPending,
    isOptimistic: state.isOptimistic,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   OPTIMISTIC MUTATION WRAPPER
   For wrapping existing mutations with optimistic behavior
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Wrap an existing mutation function with optimistic update behavior.
 *
 * @example
 * const optimisticUpdateDeal = wrapWithOptimistic(
 *   updateDeal,
 *   (deal, args) => ({ ...deal, status: args.status }),
 *   { showErrorToast: true }
 * );
 *
 * // Use like normal but with optimistic updates
 * await optimisticUpdateDeal(deal, { status: 'accepted' });
 */
export function wrapWithOptimistic<T, Args extends unknown[]>(
  mutation: (...args: Args) => Promise<T>,
  optimisticUpdater: (currentData: T, args: Args) => T,
  options: UseOptimisticOptions<T> = {}
) {
  return async (currentData: T, ...args: Args): Promise<T> => {
    const optimisticData = optimisticUpdater(currentData, args);

    // This is a simplified wrapper - for full functionality use the hook
    try {
      return await mutation(...args);
    } catch (error) {
      options.onRollback?.(error as Error, currentData);
      throw error;
    }
  };
}
