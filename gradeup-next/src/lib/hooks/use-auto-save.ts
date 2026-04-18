'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/components/ui/toast';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES & INTERFACES
   ═══════════════════════════════════════════════════════════════════════════ */

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface AutoSaveOptions<T> {
  /** Debounce delay in milliseconds (default: 1000) */
  debounceMs?: number;
  /** Maximum time to wait before forcing a save (default: 5000) */
  maxWaitMs?: number;
  /** Storage key for localStorage fallback */
  storageKey?: string;
  /** Custom save function (receives data, returns promise) */
  onSave?: (data: T) => Promise<void>;
  /** Callback when save succeeds */
  onSuccess?: () => void;
  /** Callback when save fails */
  onError?: (error: Error) => void;
  /** Show toast notifications (default: true for errors, false for success) */
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  /** Enabled state (default: true) */
  enabled?: boolean;
}

export interface UseAutoSaveResult<T> {
  /** Current save status */
  status: AutoSaveStatus;
  /** Last save timestamp */
  lastSaved: Date | null;
  /** Error if save failed */
  error: Error | null;
  /** Trigger a save with new data */
  save: (data: T) => void;
  /** Force immediate save (bypasses debounce) */
  saveNow: (data: T) => Promise<void>;
  /** Clear any pending saves */
  cancel: () => void;
  /** Reset status to idle */
  reset: () => void;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CORE AUTO-SAVE HOOK
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Hook for auto-saving form data with debouncing and status tracking.
 *
 * @param options - Configuration options for auto-save behavior
 * @returns { status, lastSaved, error, save, saveNow, cancel, reset }
 *
 * @example
 * // With localStorage only
 * const { status, save } = useAutoSave<FormData>({
 *   storageKey: 'draft-profile',
 *   debounceMs: 1500,
 * });
 *
 * @example
 * // With API save
 * const { status, save, lastSaved } = useAutoSave<ProfileData>({
 *   onSave: async (data) => {
 *     await updateProfile(data);
 *   },
 *   showSuccessToast: true,
 * });
 *
 * // Usage in form
 * <input onChange={(e) => save({ ...formData, name: e.target.value })} />
 * <span>{status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved' : ''}</span>
 */
export function useAutoSave<T>(options: AutoSaveOptions<T> = {}): UseAutoSaveResult<T> {
  const {
    debounceMs = 1000,
    maxWaitMs = 5000,
    storageKey,
    onSave,
    onSuccess,
    onError,
    showErrorToast = true,
    showSuccessToast = false,
    enabled = true,
  } = options;

  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const { addToast } = useToast();

  // Refs for tracking state across renders
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxWaitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDataRef = useRef<T | null>(null);
  const isMountedRef = useRef(true);
  const firstTriggerTimeRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (maxWaitTimeoutRef.current) clearTimeout(maxWaitTimeoutRef.current);
    };
  }, []);

  // Core save implementation
  const performSave = useCallback(async (data: T): Promise<void> => {
    if (!isMountedRef.current) return;

    setStatus('saving');
    setError(null);

    try {
      // Save to localStorage if storageKey provided
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(data));
        } catch (e) {
          console.warn('localStorage save failed:', e);
        }
      }

      // Call custom save function if provided
      if (onSave) {
        await onSave(data);
      }

      if (!isMountedRef.current) return;

      setStatus('saved');
      setLastSaved(new Date());
      firstTriggerTimeRef.current = null;

      if (showSuccessToast) {
        addToast({
          title: 'Changes saved',
          variant: 'success',
          duration: 2000,
        });
      }

      onSuccess?.();
    } catch (err) {
      if (!isMountedRef.current) return;

      const errorObj = err instanceof Error ? err : new Error('Failed to save');
      setStatus('error');
      setError(errorObj);

      if (showErrorToast) {
        addToast({
          title: 'Failed to save changes',
          description: errorObj.message,
          variant: 'error',
        });
      }

      onError?.(errorObj);
    }
  }, [storageKey, onSave, onSuccess, onError, showErrorToast, showSuccessToast, addToast]);

  // Debounced save trigger
  const save = useCallback((data: T) => {
    if (!enabled) return;

    pendingDataRef.current = data;

    // Track first trigger time for maxWait
    if (firstTriggerTimeRef.current === null) {
      firstTriggerTimeRef.current = Date.now();

      // Set up maxWait timeout
      if (maxWaitTimeoutRef.current) clearTimeout(maxWaitTimeoutRef.current);
      maxWaitTimeoutRef.current = setTimeout(() => {
        if (pendingDataRef.current !== null) {
          performSave(pendingDataRef.current);
          pendingDataRef.current = null;
        }
      }, maxWaitMs);
    }

    // Clear existing debounce timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Set new debounce timeout
    timeoutRef.current = setTimeout(() => {
      if (pendingDataRef.current !== null) {
        performSave(pendingDataRef.current);
        pendingDataRef.current = null;
        if (maxWaitTimeoutRef.current) clearTimeout(maxWaitTimeoutRef.current);
      }
    }, debounceMs);
  }, [enabled, debounceMs, maxWaitMs, performSave]);

  // Immediate save (bypasses debounce)
  const saveNow = useCallback(async (data: T): Promise<void> => {
    if (!enabled) return;

    // Clear any pending timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (maxWaitTimeoutRef.current) clearTimeout(maxWaitTimeoutRef.current);
    pendingDataRef.current = null;
    firstTriggerTimeRef.current = null;

    await performSave(data);
  }, [enabled, performSave]);

  // Cancel pending saves
  const cancel = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (maxWaitTimeoutRef.current) clearTimeout(maxWaitTimeoutRef.current);
    pendingDataRef.current = null;
    firstTriggerTimeRef.current = null;
  }, []);

  // Reset status to idle
  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return {
    status,
    lastSaved,
    error,
    save,
    saveNow,
    cancel,
    reset,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUTO-SAVE STATUS INDICATOR COMPONENT HELPER
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get display text and styling info for auto-save status.
 * Useful for building status indicators.
 *
 * @example
 * const { text, className } = getAutoSaveStatusDisplay(status, lastSaved);
 * return <span className={className}>{text}</span>;
 */
export function getAutoSaveStatusDisplay(
  status: AutoSaveStatus,
  lastSaved: Date | null
): { text: string; className: string } {
  switch (status) {
    case 'saving':
      return {
        text: 'Saving...',
        className: 'text-[var(--text-muted)] animate-pulse',
      };
    case 'saved':
      return {
        text: lastSaved
          ? `Saved ${formatRelativeTime(lastSaved)}`
          : 'Saved',
        className: 'text-[var(--color-success)]',
      };
    case 'error':
      return {
        text: 'Failed to save',
        className: 'text-[var(--color-error)]',
      };
    case 'idle':
    default:
      return {
        text: '',
        className: 'text-[var(--text-muted)]',
      };
  }
}

/**
 * Format a date as relative time (e.g., "just now", "2 min ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin} min ago`;

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   DRAFT RESTORATION HOOK
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Hook for loading saved draft data from localStorage.
 * Pair with useAutoSave for complete draft workflow.
 *
 * @example
 * const { draft, hasDraft, clearDraft, restoreDraft } = useDraft<FormData>('draft-profile');
 *
 * useEffect(() => {
 *   if (hasDraft) {
 *     const shouldRestore = confirm('Restore unsaved changes?');
 *     if (shouldRestore) setFormData(restoreDraft()!);
 *     else clearDraft();
 *   }
 * }, []);
 */
export function useDraft<T>(storageKey: string): {
  draft: T | null;
  hasDraft: boolean;
  clearDraft: () => void;
  restoreDraft: () => T | null;
} {
  const [draft, setDraft] = useState<T | null>(null);

  // Load draft on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setDraft(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load draft:', e);
    }
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setDraft(null);
    } catch (e) {
      console.warn('Failed to clear draft:', e);
    }
  }, [storageKey]);

  const restoreDraft = useCallback((): T | null => {
    return draft;
  }, [draft]);

  return {
    draft,
    hasDraft: draft !== null,
    clearDraft,
    restoreDraft,
  };
}
