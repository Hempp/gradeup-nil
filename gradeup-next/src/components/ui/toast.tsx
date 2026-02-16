'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════════════════════
   TOAST TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Visual variants for toast notifications
 * - 'success': Green styling for successful operations
 * - 'error': Red styling for errors
 * - 'warning': Yellow styling for warnings
 * - 'info': Blue styling for informational messages
 */
export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast notification data structure
 */
export interface Toast {
  /** Unique identifier for the toast */
  id: string;
  /** Main text displayed in the toast */
  title: string;
  /** Optional secondary text with more details */
  description?: string;
  /** Visual style variant */
  variant: ToastVariant;
  /** Auto-dismiss duration in ms (default: 5000) */
  duration?: number;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════════════════════════════════════ */

const CheckCircleIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircleIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ExclamationIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const InfoIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════════════
   VARIANT CONFIGURATION
   ═══════════════════════════════════════════════════════════════════════════ */

const variantConfig: Record<ToastVariant, { icon: ReactNode; stripe: string; iconColor: string }> = {
  success: {
    icon: <CheckCircleIcon />,
    stripe: 'bg-[var(--color-success)]',
    iconColor: 'text-[var(--color-success)]',
  },
  error: {
    icon: <XCircleIcon />,
    stripe: 'bg-[var(--color-error)]',
    iconColor: 'text-[var(--color-error)]',
  },
  warning: {
    icon: <ExclamationIcon />,
    stripe: 'bg-[var(--color-warning)]',
    iconColor: 'text-[var(--color-warning)]',
  },
  info: {
    icon: <InfoIcon />,
    stripe: 'bg-[var(--color-accent)]',
    iconColor: 'text-[var(--color-accent)]',
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   CONTEXT
   ═══════════════════════════════════════════════════════════════════════════ */

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Hook to access the toast context
 *
 * Must be used within a ToastProvider. For simpler usage,
 * consider useToastActions() instead.
 *
 * @throws Error if used outside of ToastProvider
 * @returns Toast context with toasts array and control functions
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOAST ITEM COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const duration = toast.duration ?? 5000;
  const config = variantConfig[toast.variant];

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  }, [onRemove, toast.id]);

  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        clearInterval(timer);
        handleClose();
      }
    }, 50);

    return () => clearInterval(timer);
  }, [duration, handleClose]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        `
        relative overflow-hidden
        bg-[var(--bg-card)] rounded-[var(--radius-xl)]
        shadow-[var(--shadow-lg)] border border-[var(--border-color)]
        min-w-[320px] max-w-[420px]
        transition-all duration-300 ease-out
        `,
        isExiting
          ? 'opacity-0 translate-x-full'
          : 'opacity-100 translate-x-0 animate-slide-in-right'
      )}
    >
      {/* Colored left stripe */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', config.stripe)} />

      <div className="flex items-start gap-3 p-4 pl-5">
        {/* Icon */}
        <div className={cn('flex-shrink-0 mt-0.5', config.iconColor)}>
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--text-primary)] text-sm">
            {toast.title}
          </p>
          {toast.description && (
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {toast.description}
            </p>
          )}
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                handleClose();
              }}
              className={cn(
                'mt-2 text-sm font-medium underline underline-offset-2 hover:no-underline',
                config.iconColor
              )}
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="flex-shrink-0 p-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          aria-label="Dismiss notification"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--bg-tertiary)]">
        <div
          className={cn('h-full transition-all duration-50', config.stripe)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOAST PROVIDER
   ═══════════════════════════════════════════════════════════════════════════ */

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Provider component for the toast notification system
 *
 * Wrap your app or a section of it with this provider to enable
 * toast notifications. Toasts appear in the top-right corner.
 *
 * @example
 * // In your layout or app root
 * <ToastProvider>
 *   <ToastGlobalHandler />
 *   <App />
 * </ToastProvider>
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}

      {/* Toast container - top right */}
      <div
        aria-label="Notifications"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONVENIENCE HOOKS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Convenience hook for showing toast notifications
 *
 * Provides simple methods for each toast variant plus a custom method
 * for full control.
 *
 * @returns Object with success, error, warning, info, and custom methods
 * @example
 * function MyComponent() {
 *   const toast = useToastActions();
 *
 *   const handleSave = async () => {
 *     try {
 *       await saveData();
 *       toast.success('Saved!', 'Your changes have been saved.');
 *     } catch (e) {
 *       toast.error('Save failed', 'Please try again.');
 *     }
 *   };
 * }
 */
export function useToastActions() {
  const { addToast } = useToast();

  return {
    success: (title: string, description?: string) =>
      addToast({ title, description, variant: 'success' }),
    error: (title: string, description?: string) =>
      addToast({ title, description, variant: 'error' }),
    warning: (title: string, description?: string) =>
      addToast({ title, description, variant: 'warning' }),
    info: (title: string, description?: string) =>
      addToast({ title, description, variant: 'info' }),
    custom: addToast,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   GLOBAL TOAST (for use outside React components)
   ═══════════════════════════════════════════════════════════════════════════ */

let globalAddToast: ((toast: Omit<Toast, 'id'>) => void) | null = null;

/**
 * Set the global toast handler for use outside React components
 *
 * Called automatically by ToastGlobalHandler. You typically don't
 * need to call this directly.
 *
 * @param handler - Function to add a toast
 * @internal
 */
export function setGlobalToastHandler(handler: (toast: Omit<Toast, 'id'>) => void) {
  globalAddToast = handler;
}

/**
 * Global toast functions for use outside React components
 *
 * Requires ToastGlobalHandler to be rendered inside ToastProvider.
 * Use this for showing toasts from utility functions, API handlers, etc.
 *
 * @example
 * // In an API utility file
 * import { toast } from '@/components/ui/toast';
 *
 * export async function fetchData() {
 *   try {
 *     const data = await api.get('/data');
 *     return data;
 *   } catch (e) {
 *     toast.error('Failed to fetch data');
 *     throw e;
 *   }
 * }
 */
export const toast = {
  success: (title: string, description?: string) => {
    globalAddToast?.({ title, description, variant: 'success' });
  },
  error: (title: string, description?: string) => {
    globalAddToast?.({ title, description, variant: 'error' });
  },
  warning: (title: string, description?: string) => {
    globalAddToast?.({ title, description, variant: 'warning' });
  },
  info: (title: string, description?: string) => {
    globalAddToast?.({ title, description, variant: 'info' });
  },
  custom: (options: Omit<Toast, 'id'>) => {
    globalAddToast?.(options);
  },
};

/**
 * Component to connect global toast handler to provider
 *
 * Place this inside your ToastProvider to enable the global `toast`
 * object for use outside React components.
 *
 * @example
 * <ToastProvider>
 *   <ToastGlobalHandler />
 *   <App />
 * </ToastProvider>
 */
export function ToastGlobalHandler() {
  const { addToast } = useToast();

  useEffect(() => {
    setGlobalToastHandler(addToast);
    return () => {
      globalAddToast = null;
    };
  }, [addToast]);

  return null;
}
