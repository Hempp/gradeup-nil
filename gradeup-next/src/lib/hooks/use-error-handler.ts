'use client';

import { useCallback } from 'react';
import { useToastActions } from '@/components/ui/toast';
import { handleError, parseError, type AppError } from '@/lib/utils/error-handler';

interface UseErrorHandlerOptions {
  showToast?: boolean;
  onError?: (error: AppError) => void;
}

/**
 * Hook for consistent error handling across components
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { showToast: showToastOption = true, onError } = options;
  const { error: showErrorToast } = useToastActions();

  const handle = useCallback(
    (error: unknown, silent = false): AppError => {
      const appError = parseError(error);

      // Show toast unless silent
      if (!silent && showToastOption) {
        showErrorToast(appError.userMessage);
      }

      // Call custom error handler
      onError?.(appError);

      // Log the error
      handleError(error, { silent: true });

      return appError;
    },
    [showToastOption, showErrorToast, onError]
  );

  const handleAsync = useCallback(
    async <T,>(
      promise: Promise<T>,
      options?: { silent?: boolean; fallback?: T }
    ): Promise<{ data: T | null; error: AppError | null }> => {
      try {
        const data = await promise;
        return { data, error: null };
      } catch (err) {
        const appError = handle(err, options?.silent);
        return { data: options?.fallback ?? null, error: appError };
      }
    },
    [handle]
  );

  const wrapAsync = useCallback(
    <T extends (...args: unknown[]) => Promise<unknown>>(
      fn: T,
      options?: { silent?: boolean }
    ): ((...args: Parameters<T>) => Promise<{ data: Awaited<ReturnType<T>> | null; error: AppError | null }>) => {
      return async (...args: Parameters<T>) => {
        try {
          const data = await fn(...args);
          return { data: data as Awaited<ReturnType<T>>, error: null };
        } catch (err) {
          const appError = handle(err, options?.silent);
          return { data: null, error: appError };
        }
      };
    },
    [handle]
  );

  return {
    handle,
    handleAsync,
    wrapAsync,
  };
}
