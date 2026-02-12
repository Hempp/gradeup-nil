'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { AlertTriangle, AlertCircle, Info, HelpCircle, Loader2 } from 'lucide-react';
import { Modal } from './modal';
import { Button } from './button';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'question';

export interface ConfirmOptions {
  title: string;
  description?: string;
  variant?: ConfirmVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

export interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Context
// ═══════════════════════════════════════════════════════════════════════════

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
}

// ═══════════════════════════════════════════════════════════════════════════
// Variant Configuration
// ═══════════════════════════════════════════════════════════════════════════

const variantConfig: Record<
  ConfirmVariant,
  {
    icon: typeof AlertTriangle;
    iconColor: string;
    iconBg: string;
    confirmVariant: 'danger' | 'primary' | 'secondary';
  }
> = {
  danger: {
    icon: AlertTriangle,
    iconColor: 'text-[var(--color-error)]',
    iconBg: 'bg-[var(--color-error)]/10',
    confirmVariant: 'danger',
  },
  warning: {
    icon: AlertCircle,
    iconColor: 'text-[var(--color-warning)]',
    iconBg: 'bg-[var(--color-warning)]/10',
    confirmVariant: 'primary',
  },
  info: {
    icon: Info,
    iconColor: 'text-[var(--color-primary)]',
    iconBg: 'bg-[var(--color-primary)]/10',
    confirmVariant: 'primary',
  },
  question: {
    icon: HelpCircle,
    iconColor: 'text-[var(--color-accent)]',
    iconBg: 'bg-[var(--color-accent)]/10',
    confirmVariant: 'primary',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════════════════════════════════

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);

    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (options?.onConfirm) {
      setIsLoading(true);
      try {
        await options.onConfirm();
      } finally {
        setIsLoading(false);
      }
    }
    resolvePromise?.(true);
    setIsOpen(false);
    setOptions(null);
    setResolvePromise(null);
  }, [options, resolvePromise]);

  const handleCancel = useCallback(() => {
    options?.onCancel?.();
    resolvePromise?.(false);
    setIsOpen(false);
    setOptions(null);
    setResolvePromise(null);
  }, [options, resolvePromise]);

  const variant = options?.variant || 'question';
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      <Modal
        isOpen={isOpen}
        onClose={handleCancel}
        size="sm"
        showCloseButton={false}
        closeOnOverlayClick={!isLoading}
        closeOnEscape={!isLoading}
      >
        <div className="text-center">
          {/* Icon */}
          <div
            className={cn(
              'mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4',
              config.iconBg
            )}
          >
            <Icon className={cn('h-6 w-6', config.iconColor)} />
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            {options?.title}
          </h3>

          {/* Description */}
          {options?.description && (
            <p className="text-sm text-[var(--text-muted)] mb-6">
              {options.description}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={isLoading}
              className="min-w-[100px]"
            >
              {options?.cancelLabel || 'Cancel'}
            </Button>
            <Button
              variant={config.confirmVariant}
              onClick={handleConfirm}
              disabled={isLoading}
              className="min-w-[100px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                options?.confirmLabel || 'Confirm'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Standalone Confirm Dialog (without provider)
// ═══════════════════════════════════════════════════════════════════════════

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  variant?: ConfirmVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  variant = 'question',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isLoading = false,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = async () => {
    await onConfirm();
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <div className="text-center">
        {/* Icon */}
        <div
          className={cn(
            'mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4',
            config.iconBg
          )}
        >
          <Icon className={cn('h-6 w-6', config.iconColor)} />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-sm text-[var(--text-muted)] mb-6">{description}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="min-w-[100px]"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={config.confirmVariant}
            onClick={handleConfirm}
            disabled={isLoading}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Delete Confirmation (Common Pattern)
// ═══════════════════════════════════════════════════════════════════════════

export interface DeleteConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  itemName?: string;
  itemType?: string;
  isLoading?: boolean;
}

export function DeleteConfirm({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = 'item',
  isLoading = false,
}: DeleteConfirmProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      variant="danger"
      title={`Delete ${itemType}?`}
      description={
        itemName
          ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
          : `Are you sure you want to delete this ${itemType}? This action cannot be undone.`
      }
      confirmLabel="Delete"
      cancelLabel="Cancel"
      isLoading={isLoading}
    />
  );
}
