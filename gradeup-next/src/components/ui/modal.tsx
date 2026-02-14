'use client';

import {
  forwardRef,
  useEffect,
  useRef,
  useCallback,
  useId,
  type HTMLAttributes,
  type ReactNode,
  type MouseEvent,
  type KeyboardEvent,
} from 'react';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════════════════════
   MODAL TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  size?: ModalSize;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  footer?: ReactNode;
  children: ReactNode;
  /** On mobile, show as bottom sheet instead of centered modal */
  mobileBottomSheet?: boolean;
  /** On mobile, make modal full screen */
  mobileFullScreen?: boolean;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════════════════════════════════════ */

const CloseIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════════════
   SIZE CONFIGURATION
   ═══════════════════════════════════════════════════════════════════════════ */

const sizeConfig: Record<ModalSize, string> = {
  sm: 'max-w-[400px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
  xl: 'max-w-[960px]',
  full: 'max-w-full',
};

/* ═══════════════════════════════════════════════════════════════════════════
   FOCUS TRAP UTILITY
   ═══════════════════════════════════════════════════════════════════════════ */

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  return Array.from(elements).filter(
    (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODAL COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      className,
      isOpen,
      onClose,
      title,
      size = 'md',
      showCloseButton = true,
      closeOnOverlayClick = true,
      closeOnEscape = true,
      footer,
      children,
      mobileBottomSheet = true,
      mobileFullScreen = false,
      ...props
    },
    ref
  ) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);
    const titleId = useId();

    // Store the previously focused element and focus the modal
    useEffect(() => {
      if (isOpen) {
        previousActiveElement.current = document.activeElement as HTMLElement;

        // Small delay to ensure modal is rendered
        const timer = setTimeout(() => {
          if (modalRef.current) {
            const focusableElements = getFocusableElements(modalRef.current);
            if (focusableElements.length > 0) {
              focusableElements[0].focus();
            } else {
              modalRef.current.focus();
            }
          }
        }, 10);

        return () => clearTimeout(timer);
      } else {
        // Restore focus when closing
        if (previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
      }
    }, [isOpen]);

    // Lock body scroll when modal is open
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }

      return () => {
        document.body.style.overflow = '';
      };
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
      if (!isOpen || !closeOnEscape) return;

      const handleKeyDown = (e: globalThis.KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeOnEscape, onClose]);

    // Focus trap
    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'Tab' || !modalRef.current) return;

        const focusableElements = getFocusableElements(modalRef.current);
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      },
      []
    );

    // Handle overlay click
    const handleOverlayClick = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
          onClose();
        }
      },
      [closeOnOverlayClick, onClose]
    );

    if (!isOpen) return null;

    return (
      <div
        className={cn(
          'fixed inset-0 z-50 flex p-0 sm:p-4',
          mobileBottomSheet ? 'items-end sm:items-center justify-center' : 'items-center justify-center',
          mobileFullScreen && 'sm:items-center sm:justify-center'
        )}
        role="presentation"
      >
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={handleOverlayClick}
          aria-hidden="true"
        />

        {/* Modal container */}
        <div
          ref={(node) => {
            modalRef.current = node;
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className={cn(
            // Base styles
            'relative w-full bg-[var(--bg-card)] shadow-[var(--shadow-lg)] border border-[var(--border-color)] flex flex-col animate-fade-in',
            // Mobile: Full width, bottom sheet style with rounded top corners only
            mobileBottomSheet && 'rounded-t-[var(--radius-xl)] rounded-b-none max-h-[85vh] sm:rounded-[var(--radius-xl)] sm:max-h-[90vh]',
            // Mobile full screen option
            mobileFullScreen && 'h-full max-h-full rounded-none sm:h-auto sm:max-h-[90vh] sm:rounded-[var(--radius-xl)]',
            // Default (not bottom sheet, not full screen)
            !mobileBottomSheet && !mobileFullScreen && 'rounded-[var(--radius-xl)] max-h-[90vh]',
            // Size config (only applies on sm+ screens when using mobile variants)
            (mobileBottomSheet || mobileFullScreen) ? `sm:${sizeConfig[size]}` : sizeConfig[size],
            // Default size config when no mobile variant
            !mobileBottomSheet && !mobileFullScreen && sizeConfig[size],
            className
          )}
          style={{
            animation: mobileBottomSheet
              ? 'fadeIn 0.2s ease-out, slideUpMobile 0.3s ease-out'
              : 'fadeIn 0.2s ease-out, slideUp 0.3s ease-out',
          }}
          {...props}
        >
          {/* Mobile drag handle indicator (bottom sheet style) */}
          {mobileBottomSheet && (
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-[var(--border-color)]" aria-hidden="true" />
            </div>
          )}

          {/* Header */}
          {(title || showCloseButton) && (
            <div className={cn(
              'flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]',
              mobileBottomSheet && 'pt-2 sm:pt-4'
            )}>
              {title && (
                <h2
                  id={titleId}
                  className="text-lg font-semibold text-[var(--text-primary)]"
                >
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    `
                    p-2 rounded-[var(--radius-md)]
                    text-[var(--text-muted)] hover:text-[var(--text-primary)]
                    hover:bg-[var(--bg-tertiary)]
                    transition-colors duration-[var(--transition-fast)]
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]
                    `,
                    !title && 'ml-auto'
                  )}
                  aria-label="Close modal"
                >
                  <CloseIcon />
                </button>
              )}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 px-6 py-6 overflow-y-auto">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border-color)]">
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  }
);

Modal.displayName = 'Modal';

/* ═══════════════════════════════════════════════════════════════════════════
   SLIDE UP ANIMATION (Added to globals.css if not present)
   ═══════════════════════════════════════════════════════════════════════════ */

// Note: The slideUp animation should be added to globals.css:
// @keyframes slideUp {
//   from { opacity: 0; transform: translateY(20px); }
//   to { opacity: 1; transform: translateY(0); }
// }

export { Modal };
