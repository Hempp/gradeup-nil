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

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration?: number;
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
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircleIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ExclamationIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const InfoIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
  }, [duration]);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  }, [onRemove, toast.id]);

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

export function setGlobalToastHandler(handler: (toast: Omit<Toast, 'id'>) => void) {
  globalAddToast = handler;
}

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
 * Place inside ToastProvider
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
