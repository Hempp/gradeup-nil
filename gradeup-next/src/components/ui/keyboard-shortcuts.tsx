'use client';

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  useRef,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Modal } from './modal';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export type ShortcutKey = string;

export interface Shortcut {
  /** Unique identifier for the shortcut */
  id: string;
  /** Display name for the shortcut */
  label: string;
  /** Description of what the shortcut does */
  description?: string;
  /** Key combination (e.g., 'g h', 'Cmd+/', 'Escape') */
  keys: string;
  /** Category for grouping in the help dialog */
  category: ShortcutCategory;
  /** Handler function when shortcut is triggered */
  handler: () => void;
  /** Whether this shortcut is enabled */
  enabled?: boolean;
  /** Pages/routes where this shortcut is active (empty = all pages) */
  routes?: string[];
  /** Pages/routes where this shortcut is disabled */
  excludeRoutes?: string[];
}

export type ShortcutCategory =
  | 'navigation'
  | 'actions'
  | 'search'
  | 'dialogs'
  | 'general';

export interface ShortcutCategoryInfo {
  id: ShortcutCategory;
  label: string;
  icon?: ReactNode;
}

export interface KeyboardShortcutsContextValue {
  /** Whether the shortcuts dialog is open */
  isDialogOpen: boolean;
  /** Open the shortcuts dialog */
  openDialog: () => void;
  /** Close the shortcuts dialog */
  closeDialog: () => void;
  /** Toggle the shortcuts dialog */
  toggleDialog: () => void;
  /** Register a shortcut */
  registerShortcut: (shortcut: Shortcut) => void;
  /** Unregister a shortcut */
  unregisterShortcut: (id: string) => void;
  /** Get all registered shortcuts */
  getShortcuts: () => Shortcut[];
  /** Whether shortcuts are currently enabled */
  enabled: boolean;
  /** Enable/disable all shortcuts */
  setEnabled: (enabled: boolean) => void;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CATEGORY DEFINITIONS
   ═══════════════════════════════════════════════════════════════════════════ */

const SHORTCUT_CATEGORIES: ShortcutCategoryInfo[] = [
  { id: 'navigation', label: 'Navigation' },
  { id: 'search', label: 'Search' },
  { id: 'actions', label: 'Actions' },
  { id: 'dialogs', label: 'Dialogs' },
  { id: 'general', label: 'General' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Checks if the current active element is an input-like element
 */
function isInputElement(element: Element | null): boolean {
  if (!element) return false;

  const tagName = element.tagName.toLowerCase();
  const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
  const isContentEditable = element.getAttribute('contenteditable') === 'true';

  return isInput || isContentEditable;
}

/**
 * Parses a key string into its components
 * Supports formats like: 'g h', 'Cmd+/', '?', 'Escape', 'Ctrl+Shift+K'
 */
function parseKeyString(keyString: string): {
  isSequence: boolean;
  keys: string[];
  modifiers: { meta: boolean; ctrl: boolean; alt: boolean; shift: boolean };
  key: string;
} {
  const parts = keyString.split(' ');

  // Check if it's a sequence (like 'g h')
  if (parts.length > 1 && !parts.some(p => p.includes('+'))) {
    return {
      isSequence: true,
      keys: parts.map(p => p.toLowerCase()),
      modifiers: { meta: false, ctrl: false, alt: false, shift: false },
      key: '',
    };
  }

  // Parse modifier+key combinations
  const keyParts = keyString.split('+');
  const modifiers = {
    meta: false,
    ctrl: false,
    alt: false,
    shift: false,
  };

  let key = '';

  for (const part of keyParts) {
    const lowerPart = part.toLowerCase();
    if (lowerPart === 'cmd' || lowerPart === 'meta' || lowerPart === 'command') {
      modifiers.meta = true;
    } else if (lowerPart === 'ctrl' || lowerPart === 'control') {
      modifiers.ctrl = true;
    } else if (lowerPart === 'alt' || lowerPart === 'option') {
      modifiers.alt = true;
    } else if (lowerPart === 'shift') {
      modifiers.shift = true;
    } else {
      key = part;
    }
  }

  return {
    isSequence: false,
    keys: [],
    modifiers,
    key: key.toLowerCase(),
  };
}

/**
 * Formats a key for display
 */
function formatKeyForDisplay(key: string): string {
  const keyMap: Record<string, string> = {
    'cmd': '\u2318',
    'meta': '\u2318',
    'command': '\u2318',
    'ctrl': '\u2303',
    'control': '\u2303',
    'alt': '\u2325',
    'option': '\u2325',
    'shift': '\u21E7',
    'escape': 'Esc',
    'enter': '\u21B5',
    'return': '\u21B5',
    'backspace': '\u232B',
    'delete': '\u2326',
    'tab': '\u21E5',
    'space': 'Space',
    'arrowup': '\u2191',
    'arrowdown': '\u2193',
    'arrowleft': '\u2190',
    'arrowright': '\u2192',
  };

  return keyMap[key.toLowerCase()] || key.toUpperCase();
}

/**
 * Parses key combination for display in the UI
 */
function parseKeysForDisplay(keyString: string): string[][] {
  const parts = keyString.split(' ');

  // Sequence like 'g h'
  if (parts.length > 1 && !parts.some(p => p.includes('+'))) {
    return parts.map(p => [formatKeyForDisplay(p)]);
  }

  // Modifier combination like 'Cmd+/'
  const keyParts = keyString.split('+');
  return [keyParts.map(p => formatKeyForDisplay(p))];
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONTEXT
   ═══════════════════════════════════════════════════════════════════════════ */

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK: useKeyboardShortcuts
   ═══════════════════════════════════════════════════════════════════════════ */

export function useKeyboardShortcuts(): KeyboardShortcutsContextValue {
  const context = useContext(KeyboardShortcutsContext);

  if (!context) {
    throw new Error(
      'useKeyboardShortcuts must be used within a KeyboardShortcutsProvider'
    );
  }

  return context;
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK: useRegisterShortcut
   Convenience hook to register a shortcut and automatically unregister on unmount
   ═══════════════════════════════════════════════════════════════════════════ */

export function useRegisterShortcut(shortcut: Shortcut): void {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();

  useEffect(() => {
    registerShortcut(shortcut);
    return () => unregisterShortcut(shortcut.id);
  }, [shortcut.id, shortcut.keys, registerShortcut, unregisterShortcut]);
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTS: Keyboard Key Display
   ═══════════════════════════════════════════════════════════════════════════ */

interface KbdProps {
  children: ReactNode;
  className?: string;
}

/**
 * Individual keyboard key with polished keycap styling
 */
function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        // Base styles
        'inline-flex items-center justify-center',
        'min-w-[1.75rem] h-7 px-2',
        'text-xs font-medium font-mono',
        // Keycap visual styling
        'bg-gradient-to-b from-[var(--surface-white)] to-[var(--surface-100)]',
        'border border-[var(--surface-200)]',
        'rounded-md',
        'shadow-[0_2px_0_0_var(--surface-200),inset_0_-1px_0_0_var(--surface-100)]',
        // Text
        'text-[var(--text-secondary)]',
        // Transitions
        'transition-all duration-75',
        className
      )}
    >
      {children}
    </kbd>
  );
}

interface KeyComboProps {
  keys: string;
  className?: string;
}

/**
 * Displays a keyboard shortcut with proper key styling
 */
export function KeyCombo({ keys, className }: KeyComboProps) {
  const displayKeys = parseKeysForDisplay(keys);

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {displayKeys.map((group, groupIndex) => (
        <span key={groupIndex} className="inline-flex items-center gap-0.5">
          {groupIndex > 0 && (
            <span className="text-[var(--text-muted)] mx-1 text-xs">then</span>
          )}
          {group.map((key, keyIndex) => (
            <Kbd key={keyIndex}>{key}</Kbd>
          ))}
        </span>
      ))}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT: KeyboardShortcutsDialog
   ═══════════════════════════════════════════════════════════════════════════ */

interface ShortcutRowProps {
  shortcut: Shortcut;
}

function ShortcutRow({ shortcut }: ShortcutRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1">
        <span className="text-sm text-[var(--text-primary)]">
          {shortcut.label}
        </span>
        {shortcut.description && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {shortcut.description}
          </p>
        )}
      </div>
      <KeyCombo keys={shortcut.keys} />
    </div>
  );
}

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: Shortcut[];
}

export function KeyboardShortcutsDialog({
  isOpen,
  onClose,
  shortcuts,
}: KeyboardShortcutsDialogProps) {
  // Group shortcuts by category
  const groupedShortcuts = SHORTCUT_CATEGORIES.map(category => ({
    ...category,
    shortcuts: shortcuts.filter(s => s.category === category.id && s.enabled !== false),
  })).filter(category => category.shortcuts.length > 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      size="md"
      closeOnEscape={true}
      closeOnOverlayClick={true}
    >
      <div className="space-y-6 -mt-2">
        {groupedShortcuts.map(category => (
          <div key={category.id}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
              {category.label}
            </h3>
            <div className="divide-y divide-[var(--border-color)]">
              {category.shortcuts.map(shortcut => (
                <ShortcutRow key={shortcut.id} shortcut={shortcut} />
              ))}
            </div>
          </div>
        ))}

        {groupedShortcuts.length === 0 && (
          <div className="text-center py-8 text-[var(--text-muted)]">
            <p>No keyboard shortcuts available on this page.</p>
          </div>
        )}

        {/* Footer hint */}
        <div className="pt-4 border-t border-[var(--border-color)]">
          <p className="text-xs text-[var(--text-muted)] text-center">
            Press <KeyCombo keys="?" /> or <KeyCombo keys="Cmd+/" /> anytime to show this dialog
          </p>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT: KeyboardShortcutsProvider
   ═══════════════════════════════════════════════════════════════════════════ */

interface KeyboardShortcutsProviderProps {
  children: ReactNode;
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [shortcuts, setShortcuts] = useState<Map<string, Shortcut>>(new Map());

  // Track key sequence state
  const sequenceRef = useRef<string[]>([]);
  const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Default shortcuts
  useEffect(() => {
    const defaultShortcuts: Shortcut[] = [
      // Help dialog
      {
        id: 'show-help',
        label: 'Show keyboard shortcuts',
        keys: '?',
        category: 'dialogs',
        handler: () => setIsDialogOpen(true),
      },
      {
        id: 'show-help-alt',
        label: 'Show keyboard shortcuts',
        keys: 'Cmd+/',
        category: 'dialogs',
        handler: () => setIsDialogOpen(true),
      },
      // Close dialogs
      {
        id: 'close-dialog',
        label: 'Close modal/dialog',
        keys: 'Escape',
        category: 'dialogs',
        handler: () => {
          if (isDialogOpen) {
            setIsDialogOpen(false);
          }
        },
      },
      // Navigation shortcuts
      {
        id: 'go-home',
        label: 'Go to home',
        keys: 'g h',
        category: 'navigation',
        handler: () => router.push('/'),
      },
      {
        id: 'go-dashboard',
        label: 'Go to dashboard',
        keys: 'g d',
        category: 'navigation',
        handler: () => {
          // Determine dashboard based on current path or default
          if (pathname.includes('/athlete')) {
            router.push('/athlete/dashboard');
          } else if (pathname.includes('/brand')) {
            router.push('/brand/dashboard');
          } else if (pathname.includes('/director')) {
            router.push('/director/dashboard');
          } else {
            // Default to athlete dashboard
            router.push('/athlete/dashboard');
          }
        },
      },
      {
        id: 'go-opportunities',
        label: 'Go to opportunities',
        keys: 'g o',
        category: 'navigation',
        handler: () => {
          if (pathname.includes('/athlete')) {
            router.push('/athlete/opportunities');
          } else if (pathname.includes('/brand')) {
            router.push('/brand/discover');
          } else {
            router.push('/athlete/opportunities');
          }
        },
      },
      // Search
      {
        id: 'focus-search',
        label: 'Focus search input',
        keys: '/',
        category: 'search',
        handler: () => {
          // Try to find and focus a search input
          const searchInput = document.querySelector<HTMLInputElement>(
            'input[type="search"], input[placeholder*="Search"], input[aria-label*="Search"], [data-search-input]'
          );
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        },
      },
    ];

    const initialShortcuts = new Map<string, Shortcut>();
    defaultShortcuts.forEach(shortcut => {
      initialShortcuts.set(shortcut.id, shortcut);
    });

    setShortcuts(initialShortcuts);
  }, [router, pathname, isDialogOpen]);

  // Register shortcut
  const registerShortcut = useCallback((shortcut: Shortcut) => {
    setShortcuts(prev => {
      const next = new Map(prev);
      next.set(shortcut.id, shortcut);
      return next;
    });
  }, []);

  // Unregister shortcut
  const unregisterShortcut = useCallback((id: string) => {
    setShortcuts(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // Get all shortcuts
  const getShortcuts = useCallback(() => {
    return Array.from(shortcuts.values());
  }, [shortcuts]);

  // Check if a shortcut matches the current route
  const isShortcutActiveForRoute = useCallback(
    (shortcut: Shortcut): boolean => {
      // Check exclude routes first
      if (shortcut.excludeRoutes?.some(route => pathname.startsWith(route))) {
        return false;
      }

      // If no routes specified, active everywhere
      if (!shortcut.routes || shortcut.routes.length === 0) {
        return true;
      }

      // Check if current path matches any specified routes
      return shortcut.routes.some(route => pathname.startsWith(route));
    },
    [pathname]
  );

  // Handle keyboard events
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      // Skip if user is typing in an input
      if (isInputElement(document.activeElement)) {
        // Only allow Escape in inputs
        if (event.key !== 'Escape') {
          return;
        }
      }

      // Get the key
      const key = event.key.toLowerCase();

      // Build the current key combination string
      let keyCombo = '';
      if (event.metaKey) keyCombo += 'meta+';
      if (event.ctrlKey) keyCombo += 'ctrl+';
      if (event.altKey) keyCombo += 'alt+';
      if (event.shiftKey && key.length > 1) keyCombo += 'shift+';
      keyCombo += key;

      // Check each shortcut
      for (const shortcut of shortcuts.values()) {
        if (shortcut.enabled === false) continue;
        if (!isShortcutActiveForRoute(shortcut)) continue;

        const parsed = parseKeyString(shortcut.keys);

        // Handle key sequences (like 'g h')
        if (parsed.isSequence) {
          // Clear previous sequence timeout
          if (sequenceTimeoutRef.current) {
            clearTimeout(sequenceTimeoutRef.current);
          }

          // Add current key to sequence
          sequenceRef.current.push(key);

          // Check if sequence matches
          const matches = parsed.keys.every(
            (k, i) => sequenceRef.current[i] === k
          );

          if (matches && sequenceRef.current.length === parsed.keys.length) {
            event.preventDefault();
            shortcut.handler();
            sequenceRef.current = [];
            return;
          }

          // Check if we're on track for this sequence
          const isOnTrack = parsed.keys
            .slice(0, sequenceRef.current.length)
            .every((k, i) => sequenceRef.current[i] === k);

          if (isOnTrack && sequenceRef.current.length < parsed.keys.length) {
            // Wait for more keys
            event.preventDefault();
            sequenceTimeoutRef.current = setTimeout(() => {
              sequenceRef.current = [];
            }, 1500);
            return;
          }
        }

        // Handle single keys and modifier combinations
        if (!parsed.isSequence) {
          const modifiersMatch =
            event.metaKey === parsed.modifiers.meta &&
            event.ctrlKey === parsed.modifiers.ctrl &&
            event.altKey === parsed.modifiers.alt &&
            (parsed.modifiers.shift ? event.shiftKey : true);

          // Handle special case for '?' which requires shift
          const keyToMatch = shortcut.keys === '?' ? '?' : parsed.key;
          const keyMatches = key === keyToMatch || event.key === keyToMatch;

          if (modifiersMatch && keyMatches) {
            // Don't prevent default for Escape - let it bubble for modal handling
            if (shortcut.keys !== 'Escape') {
              event.preventDefault();
            }
            shortcut.handler();
            sequenceRef.current = [];
            return;
          }
        }
      }

      // Reset sequence if no match found after a delay
      if (sequenceRef.current.length > 0) {
        if (sequenceTimeoutRef.current) {
          clearTimeout(sequenceTimeoutRef.current);
        }
        sequenceTimeoutRef.current = setTimeout(() => {
          sequenceRef.current = [];
        }, 1500);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }
    };
  }, [enabled, shortcuts, isShortcutActiveForRoute]);

  const contextValue: KeyboardShortcutsContextValue = {
    isDialogOpen,
    openDialog: () => setIsDialogOpen(true),
    closeDialog: () => setIsDialogOpen(false),
    toggleDialog: () => setIsDialogOpen(prev => !prev),
    registerShortcut,
    unregisterShortcut,
    getShortcuts,
    enabled,
    setEnabled,
  };

  // Get active shortcuts for current route
  const activeShortcuts = Array.from(shortcuts.values()).filter(
    shortcut => isShortcutActiveForRoute(shortcut) && shortcut.enabled !== false
  );

  // Deduplicate shortcuts with same label (e.g., '?' and 'Cmd+/')
  const uniqueShortcuts = activeShortcuts.reduce((acc, shortcut) => {
    const existing = acc.find(s => s.label === shortcut.label);
    if (!existing) {
      acc.push(shortcut);
    }
    return acc;
  }, [] as Shortcut[]);

  return (
    <KeyboardShortcutsContext.Provider value={contextValue}>
      {children}
      <KeyboardShortcutsDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        shortcuts={uniqueShortcuts}
      />
    </KeyboardShortcutsContext.Provider>
  );
}

