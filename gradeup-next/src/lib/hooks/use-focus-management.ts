'use client';

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  type RefObject,
  type KeyboardEvent,
} from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   FOCUS MANAGEMENT TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export interface UseFocusTrapOptions {
  /** Whether the trap is active */
  enabled?: boolean;
  /** Ref to the container element */
  containerRef: RefObject<HTMLElement>;
  /** Initial element to focus (selector or 'first') */
  initialFocus?: string | 'first' | 'last' | 'none';
  /** Where to return focus on unmount */
  returnFocus?: boolean;
  /** Allow focus to escape with Escape key */
  escapeDeactivates?: boolean;
  /** Callback when escape is pressed */
  onEscape?: () => void;
}

export interface UseFocusTrapResult {
  /** Activate the focus trap */
  activate: () => void;
  /** Deactivate the focus trap */
  deactivate: () => void;
  /** Whether the trap is currently active */
  isActive: boolean;
  /** Focus the first focusable element */
  focusFirst: () => void;
  /** Focus the last focusable element */
  focusLast: () => void;
}

export interface UseRovingTabIndexOptions<T extends HTMLElement = HTMLElement> {
  /** Ref to the container element */
  containerRef: RefObject<T>;
  /** Selector for focusable items */
  itemSelector: string;
  /** Orientation for arrow key navigation */
  orientation?: 'horizontal' | 'vertical' | 'both';
  /** Whether navigation wraps around */
  wrap?: boolean;
  /** Callback when active item changes */
  onActiveChange?: (index: number, element: HTMLElement) => void;
}

export interface UseRovingTabIndexResult {
  /** Current active index */
  activeIndex: number;
  /** Set active index programmatically */
  setActiveIndex: (index: number) => void;
  /** Handle keyboard navigation */
  handleKeyDown: (event: KeyboardEvent) => void;
  /** Focus the active item */
  focusActive: () => void;
}

/* ═══════════════════════════════════════════════════════════════════════════
   FOCUSABLE ELEMENT UTILITIES
   ═══════════════════════════════════════════════════════════════════════════ */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Get all focusable elements within a container.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)) as HTMLElement[];
  return elements.filter((el) => {
    // Filter out elements that are not visible or have display: none
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
  });
}

/**
 * Get the first focusable element within a container.
 */
export function getFirstFocusable(container: HTMLElement): HTMLElement | null {
  const elements = getFocusableElements(container);
  return elements[0] || null;
}

/**
 * Get the last focusable element within a container.
 */
export function getLastFocusable(container: HTMLElement): HTMLElement | null {
  const elements = getFocusableElements(container);
  return elements[elements.length - 1] || null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   FOCUS TRAP HOOK
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Hook for trapping focus within a container element.
 *
 * Essential for modals, dialogs, and dropdown menus to maintain
 * keyboard accessibility and prevent users from tabbing outside.
 *
 * @example
 * const dialogRef = useRef<HTMLDivElement>(null);
 * const { activate, deactivate, isActive } = useFocusTrap({
 *   containerRef: dialogRef,
 *   enabled: isOpen,
 *   onEscape: () => setIsOpen(false),
 * });
 *
 * return (
 *   <Dialog ref={dialogRef} open={isOpen}>
 *     <DialogContent>...</DialogContent>
 *   </Dialog>
 * );
 */
export function useFocusTrap(options: UseFocusTrapOptions): UseFocusTrapResult {
  const {
    enabled = true,
    containerRef,
    initialFocus = 'first',
    returnFocus = true,
    escapeDeactivates = true,
    onEscape,
  } = options;

  const [isActive, setIsActive] = useState(false);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus first focusable element
  const focusFirst = useCallback(() => {
    if (!containerRef.current) return;
    const first = getFirstFocusable(containerRef.current);
    first?.focus();
  }, [containerRef]);

  // Focus last focusable element
  const focusLast = useCallback(() => {
    if (!containerRef.current) return;
    const last = getLastFocusable(containerRef.current);
    last?.focus();
  }, [containerRef]);

  // Activate the trap
  const activate = useCallback(() => {
    if (!containerRef.current) return;

    // Store current focus to restore later
    previousActiveElement.current = document.activeElement as HTMLElement;
    setIsActive(true);

    // Focus initial element
    if (initialFocus === 'first') {
      focusFirst();
    } else if (initialFocus === 'last') {
      focusLast();
    } else if (initialFocus !== 'none') {
      const target = containerRef.current.querySelector(initialFocus) as HTMLElement;
      target?.focus();
    }
  }, [containerRef, initialFocus, focusFirst, focusLast]);

  // Deactivate the trap
  const deactivate = useCallback(() => {
    setIsActive(false);

    // Return focus to previous element
    if (returnFocus && previousActiveElement.current) {
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [returnFocus]);

  // Handle focus trap on Tab
  useEffect(() => {
    if (!enabled || !isActive || !containerRef.current) return;

    const container = containerRef.current;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      // Handle Escape key
      if (event.key === 'Escape' && escapeDeactivates) {
        event.preventDefault();
        onEscape?.();
        return;
      }

      // Only trap Tab key
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      // Shift+Tab on first element -> focus last
      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      // Tab on last element -> focus first
      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, isActive, containerRef, escapeDeactivates, onEscape]);

  // Auto-activate when enabled changes
  useEffect(() => {
    if (enabled) {
      activate();
    } else {
      deactivate();
    }
  }, [enabled, activate, deactivate]);

  return {
    activate,
    deactivate,
    isActive,
    focusFirst,
    focusLast,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   ROVING TABINDEX HOOK
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Hook for roving tabindex pattern in composite widgets.
 *
 * Enables arrow key navigation within toolbars, tab lists, menus,
 * and other composite widgets while maintaining a single tab stop.
 *
 * @example
 * const toolbarRef = useRef<HTMLDivElement>(null);
 * const { activeIndex, handleKeyDown } = useRovingTabIndex({
 *   containerRef: toolbarRef,
 *   itemSelector: 'button',
 *   orientation: 'horizontal',
 * });
 *
 * return (
 *   <div ref={toolbarRef} role="toolbar" onKeyDown={handleKeyDown}>
 *     {items.map((item, index) => (
 *       <button
 *         key={item.id}
 *         tabIndex={index === activeIndex ? 0 : -1}
 *       >
 *         {item.label}
 *       </button>
 *     ))}
 *   </div>
 * );
 */
export function useRovingTabIndex<T extends HTMLElement = HTMLElement>(
  options: UseRovingTabIndexOptions<T>
): UseRovingTabIndexResult {
  const {
    containerRef,
    itemSelector,
    orientation = 'horizontal',
    wrap = true,
    onActiveChange,
  } = options;

  const [activeIndex, setActiveIndexState] = useState(0);

  // Get all items
  const getItems = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    return Array.from(containerRef.current.querySelectorAll(itemSelector));
  }, [containerRef, itemSelector]);

  // Set active index with bounds checking
  const setActiveIndex = useCallback(
    (index: number) => {
      const items = getItems();
      if (items.length === 0) return;

      let newIndex = index;
      if (wrap) {
        newIndex = ((index % items.length) + items.length) % items.length;
      } else {
        newIndex = Math.max(0, Math.min(index, items.length - 1));
      }

      setActiveIndexState(newIndex);
      onActiveChange?.(newIndex, items[newIndex]);
    },
    [getItems, wrap, onActiveChange]
  );

  // Focus the active item
  const focusActive = useCallback(() => {
    const items = getItems();
    items[activeIndex]?.focus();
  }, [getItems, activeIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const items = getItems();
      if (items.length === 0) return;

      let handled = false;
      let newIndex = activeIndex;

      switch (event.key) {
        case 'ArrowLeft':
          if (orientation === 'horizontal' || orientation === 'both') {
            newIndex = activeIndex - 1;
            handled = true;
          }
          break;
        case 'ArrowRight':
          if (orientation === 'horizontal' || orientation === 'both') {
            newIndex = activeIndex + 1;
            handled = true;
          }
          break;
        case 'ArrowUp':
          if (orientation === 'vertical' || orientation === 'both') {
            newIndex = activeIndex - 1;
            handled = true;
          }
          break;
        case 'ArrowDown':
          if (orientation === 'vertical' || orientation === 'both') {
            newIndex = activeIndex + 1;
            handled = true;
          }
          break;
        case 'Home':
          newIndex = 0;
          handled = true;
          break;
        case 'End':
          newIndex = items.length - 1;
          handled = true;
          break;
      }

      if (handled) {
        event.preventDefault();
        setActiveIndex(newIndex);
        // Focus after state update
        requestAnimationFrame(() => {
          const items = getItems();
          const boundedIndex = wrap
            ? ((newIndex % items.length) + items.length) % items.length
            : Math.max(0, Math.min(newIndex, items.length - 1));
          items[boundedIndex]?.focus();
        });
      }
    },
    [activeIndex, getItems, orientation, wrap, setActiveIndex]
  );

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown,
    focusActive,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   FOCUS ON MOUNT HOOK
   ═══════════════════════════════════════════════════════════════════════════ */

export interface UseFocusOnMountOptions {
  /** Ref to the element to focus */
  ref: RefObject<HTMLElement>;
  /** Whether to focus on mount */
  enabled?: boolean;
  /** Delay before focusing (ms) */
  delay?: number;
  /** Focus options */
  focusOptions?: FocusOptions;
}

/**
 * Hook to focus an element when it mounts.
 *
 * @example
 * const inputRef = useRef<HTMLInputElement>(null);
 * useFocusOnMount({ ref: inputRef });
 *
 * return <input ref={inputRef} type="text" />;
 */
export function useFocusOnMount(options: UseFocusOnMountOptions): void {
  const { ref, enabled = true, delay = 0, focusOptions } = options;

  useEffect(() => {
    if (!enabled || !ref.current) return;

    const timeoutId = setTimeout(() => {
      ref.current?.focus(focusOptions);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [enabled, ref, delay, focusOptions]);
}

/* ═══════════════════════════════════════════════════════════════════════════
   FOCUS VISIBLE HOOK
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Hook to track :focus-visible state.
 *
 * Returns true when focus should show a visible indicator
 * (keyboard navigation) vs when it should be hidden (mouse click).
 *
 * @example
 * const buttonRef = useRef<HTMLButtonElement>(null);
 * const isFocusVisible = useFocusVisible(buttonRef);
 *
 * return (
 *   <button
 *     ref={buttonRef}
 *     className={cn(isFocusVisible && 'ring-2 ring-blue-500')}
 *   >
 *     Click me
 *   </button>
 * );
 */
export function useFocusVisible(ref: RefObject<HTMLElement>): boolean {
  const [isFocusVisible, setIsFocusVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleFocus = () => {
      // Check if :focus-visible would apply
      if (element.matches(':focus-visible')) {
        setIsFocusVisible(true);
      }
    };

    const handleBlur = () => {
      setIsFocusVisible(false);
    };

    element.addEventListener('focus', handleFocus);
    element.addEventListener('blur', handleBlur);

    return () => {
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
    };
  }, [ref]);

  return isFocusVisible;
}

/* ═══════════════════════════════════════════════════════════════════════════
   FOCUS RETURN HOOK
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Hook to restore focus to the previously focused element.
 *
 * Useful for modals and dialogs to return focus when they close.
 *
 * @example
 * const { saveFocus, restoreFocus } = useFocusReturn();
 *
 * const openModal = () => {
 *   saveFocus(); // Save current focus
 *   setIsOpen(true);
 * };
 *
 * const closeModal = () => {
 *   setIsOpen(false);
 *   restoreFocus(); // Return to previous focus
 * };
 */
export function useFocusReturn() {
  const savedElement = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    savedElement.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback((options?: FocusOptions) => {
    if (savedElement.current) {
      savedElement.current.focus(options);
      savedElement.current = null;
    }
  }, []);

  return { saveFocus, restoreFocus };
}

/* ═══════════════════════════════════════════════════════════════════════════
   FOCUS WITHIN HOOK
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Hook to track whether focus is within a container.
 *
 * @example
 * const containerRef = useRef<HTMLDivElement>(null);
 * const isFocusWithin = useFocusWithin(containerRef);
 *
 * return (
 *   <div
 *     ref={containerRef}
 *     className={cn(isFocusWithin && 'ring-2 ring-blue-500')}
 *   >
 *     <input />
 *     <button>Submit</button>
 *   </div>
 * );
 */
export function useFocusWithin(ref: RefObject<HTMLElement>): boolean {
  const [isFocusWithin, setIsFocusWithin] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleFocusIn = () => setIsFocusWithin(true);
    const handleFocusOut = (event: FocusEvent) => {
      // Check if focus moved outside the container
      if (!element.contains(event.relatedTarget as Node)) {
        setIsFocusWithin(false);
      }
    };

    element.addEventListener('focusin', handleFocusIn);
    element.addEventListener('focusout', handleFocusOut);

    return () => {
      element.removeEventListener('focusin', handleFocusIn);
      element.removeEventListener('focusout', handleFocusOut);
    };
  }, [ref]);

  return isFocusWithin;
}
