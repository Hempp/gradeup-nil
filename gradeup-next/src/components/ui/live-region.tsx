'use client';

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   LIVE REGION TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export type LiveRegionPoliteness = 'off' | 'polite' | 'assertive';
export type LiveRegionRelevant = 'additions' | 'removals' | 'text' | 'all';

export interface Announcement {
  /** Unique ID for this announcement */
  id: string;
  /** The message to announce */
  message: string;
  /** Politeness level */
  politeness: LiveRegionPoliteness;
  /** Optional timeout to clear (ms) */
  clearAfter?: number;
  /** Timestamp when created */
  timestamp: number;
}

export interface LiveRegionContextValue {
  /** Announce a message to screen readers */
  announce: (message: string, politeness?: LiveRegionPoliteness) => void;
  /** Clear all announcements */
  clear: () => void;
  /** Polite announcement (for non-urgent updates) */
  announcePolite: (message: string) => void;
  /** Assertive announcement (for urgent updates) */
  announceAssertive: (message: string) => void;
}

export interface LiveRegionProviderProps {
  children: ReactNode;
  /** Default clear delay in ms (default: 7000) */
  defaultClearDelay?: number;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LIVE REGION CONTEXT
   ═══════════════════════════════════════════════════════════════════════════ */

const LiveRegionContext = createContext<LiveRegionContextValue | null>(null);

/**
 * Hook to access live region announcement functions.
 *
 * @example
 * const { announce, announcePolite, announceAssertive } = useLiveRegion();
 *
 * // Non-urgent status update
 * announcePolite('3 items selected');
 *
 * // Urgent error message
 * announceAssertive('Error: Failed to save. Please try again.');
 */
export function useLiveRegion(): LiveRegionContextValue {
  const context = useContext(LiveRegionContext);
  if (!context) {
    throw new Error('useLiveRegion must be used within a LiveRegionProvider');
  }
  return context;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LIVE REGION PROVIDER
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Provider component that manages screen reader announcements.
 *
 * Place at the root of your app to enable announcements anywhere.
 *
 * @example
 * // In your root layout
 * <LiveRegionProvider>
 *   <App />
 * </LiveRegionProvider>
 *
 * // Then in any component
 * const { announce } = useLiveRegion();
 * announce('Form submitted successfully');
 */
export function LiveRegionProvider({
  children,
  defaultClearDelay = 7000,
}: LiveRegionProviderProps) {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');
  const clearTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messageIdRef = useRef(0);

  // Generate unique message ID
  const getMessageId = useCallback(() => {
    messageIdRef.current += 1;
    return `announcement-${messageIdRef.current}`;
  }, []);

  // Main announce function
  const announce = useCallback(
    (message: string, politeness: LiveRegionPoliteness = 'polite') => {
      if (politeness === 'off' || !message.trim()) return;

      // Clear any existing timer
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }

      // Set message based on politeness
      if (politeness === 'assertive') {
        // For assertive, we briefly clear then set to ensure re-announcement
        setAssertiveMessage('');
        requestAnimationFrame(() => {
          setAssertiveMessage(message);
        });
      } else {
        // For polite, we briefly clear then set to ensure re-announcement
        setPoliteMessage('');
        requestAnimationFrame(() => {
          setPoliteMessage(message);
        });
      }

      // Auto-clear after delay
      clearTimerRef.current = setTimeout(() => {
        setPoliteMessage('');
        setAssertiveMessage('');
      }, defaultClearDelay);
    },
    [defaultClearDelay]
  );

  // Convenience methods
  const announcePolite = useCallback(
    (message: string) => announce(message, 'polite'),
    [announce]
  );

  const announceAssertive = useCallback(
    (message: string) => announce(message, 'assertive'),
    [announce]
  );

  // Clear all announcements
  const clear = useCallback(() => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }
    setPoliteMessage('');
    setAssertiveMessage('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }
    };
  }, []);

  const value: LiveRegionContextValue = {
    announce,
    clear,
    announcePolite,
    announceAssertive,
  };

  return (
    <LiveRegionContext.Provider value={value}>
      {children}
      {/* Visually hidden live regions */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </LiveRegionContext.Provider>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STANDALONE LIVE REGION COMPONENT
   For use without the provider pattern
   ═══════════════════════════════════════════════════════════════════════════ */

export interface LiveRegionProps {
  /** The message to announce */
  message?: string;
  /** Politeness level */
  politeness?: LiveRegionPoliteness;
  /** ARIA relevant attribute */
  relevant?: LiveRegionRelevant;
  /** Whether to announce atomic updates */
  atomic?: boolean;
  /** Children as alternative to message prop */
  children?: ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * Standalone live region component for one-off announcements.
 *
 * Prefer LiveRegionProvider for app-wide announcements.
 *
 * @example
 * // Announce search results count
 * <LiveRegion politeness="polite" message={`${results.length} results found`} />
 *
 * // Announce form errors
 * {errors.length > 0 && (
 *   <LiveRegion politeness="assertive">
 *     Form has {errors.length} error(s). Please review and correct.
 *   </LiveRegion>
 * )}
 */
export function LiveRegion({
  message,
  politeness = 'polite',
  relevant = 'additions',
  atomic = true,
  children,
  className = 'sr-only',
}: LiveRegionProps) {
  if (politeness === 'off') return null;

  const role = politeness === 'assertive' ? 'alert' : 'status';
  const content = message || children;

  return (
    <div
      role={role}
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={className}
    >
      {content}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ROUTE ANNOUNCER
   Announces page changes for SPAs
   ═══════════════════════════════════════════════════════════════════════════ */

export interface RouteAnnouncerProps {
  /** Current page title */
  title: string;
  /** Announcement template (use {title} placeholder) */
  template?: string;
}

/**
 * Announces route changes for single-page applications.
 *
 * Screen readers need to be informed when the page changes in SPAs
 * since there's no full page reload that would normally trigger announcement.
 *
 * @example
 * // In your layout
 * <RouteAnnouncer title={pageTitle} />
 *
 * // With custom template
 * <RouteAnnouncer title="Settings" template="Navigated to {title} page" />
 */
export function RouteAnnouncer({
  title,
  template = 'Navigated to {title}',
}: RouteAnnouncerProps) {
  const [announcement, setAnnouncement] = useState('');
  const previousTitleRef = useRef(title);

  useEffect(() => {
    // Only announce when title changes (not on initial mount)
    if (previousTitleRef.current !== title && title) {
      const message = template.replace('{title}', title);
      setAnnouncement(''); // Clear first to trigger re-announcement
      requestAnimationFrame(() => {
        setAnnouncement(message);
      });
    }
    previousTitleRef.current = title;
  }, [title, template]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOADING ANNOUNCER
   Announces loading states
   ═══════════════════════════════════════════════════════════════════════════ */

export interface LoadingAnnouncerProps {
  /** Whether loading is in progress */
  isLoading: boolean;
  /** Message when loading starts */
  loadingMessage?: string;
  /** Message when loading completes */
  completeMessage?: string;
  /** Delay before announcing loading (prevents flash for fast loads) */
  delay?: number;
}

/**
 * Announces loading state changes to screen readers.
 *
 * Includes a delay to prevent announcing very fast operations.
 *
 * @example
 * <LoadingAnnouncer
 *   isLoading={isSubmitting}
 *   loadingMessage="Saving your changes..."
 *   completeMessage="Changes saved successfully"
 * />
 */
export function LoadingAnnouncer({
  isLoading,
  loadingMessage = 'Loading...',
  completeMessage = 'Content loaded',
  delay = 150,
}: LoadingAnnouncerProps) {
  const [announcement, setAnnouncement] = useState('');
  const wasLoadingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (isLoading && !wasLoadingRef.current) {
      // Started loading - delay announcement
      timeoutRef.current = setTimeout(() => {
        setAnnouncement(loadingMessage);
      }, delay);
    } else if (!isLoading && wasLoadingRef.current) {
      // Finished loading
      setAnnouncement(completeMessage);
    }

    wasLoadingRef.current = isLoading;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, loadingMessage, completeMessage, delay]);

  if (!announcement) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SELECTION ANNOUNCER
   Announces selection changes in lists/tables
   ═══════════════════════════════════════════════════════════════════════════ */

export interface SelectionAnnouncerProps {
  /** Number of selected items */
  selectedCount: number;
  /** Total number of items */
  totalCount: number;
  /** Item type singular (e.g., "athlete") */
  itemType?: string;
  /** Item type plural (e.g., "athletes") */
  itemTypePlural?: string;
}

/**
 * Announces selection changes in lists or tables.
 *
 * @example
 * <SelectionAnnouncer
 *   selectedCount={selectedAthletes.length}
 *   totalCount={athletes.length}
 *   itemType="athlete"
 *   itemTypePlural="athletes"
 * />
 */
export function SelectionAnnouncer({
  selectedCount,
  totalCount,
  itemType = 'item',
  itemTypePlural = 'items',
}: SelectionAnnouncerProps) {
  const [announcement, setAnnouncement] = useState('');
  const previousCountRef = useRef(selectedCount);

  useEffect(() => {
    if (previousCountRef.current !== selectedCount) {
      let message: string;
      if (selectedCount === 0) {
        message = 'Selection cleared';
      } else if (selectedCount === totalCount) {
        message = `All ${totalCount} ${itemTypePlural} selected`;
      } else {
        const type = selectedCount === 1 ? itemType : itemTypePlural;
        message = `${selectedCount} ${type} selected`;
      }

      setAnnouncement('');
      requestAnimationFrame(() => {
        setAnnouncement(message);
      });
    }
    previousCountRef.current = selectedCount;
  }, [selectedCount, totalCount, itemType, itemTypePlural]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ERROR ANNOUNCER
   Announces form errors for screen readers
   ═══════════════════════════════════════════════════════════════════════════ */

export interface ErrorAnnouncerProps {
  /** Array of error messages or single error string */
  errors: string[] | string | null;
  /** Whether to announce immediately (assertive) vs politely */
  immediate?: boolean;
}

/**
 * Announces form errors to screen readers.
 *
 * @example
 * <ErrorAnnouncer errors={form.errors} />
 *
 * // Or with single error
 * <ErrorAnnouncer errors={submitError} immediate />
 */
export function ErrorAnnouncer({ errors, immediate = false }: ErrorAnnouncerProps) {
  const [announcement, setAnnouncement] = useState('');
  const previousErrorsRef = useRef<string | null>(null);

  useEffect(() => {
    const errorArray = errors
      ? Array.isArray(errors)
        ? errors.filter(Boolean)
        : [errors]
      : [];
    const errorString = errorArray.join('. ');

    // Only announce when errors change
    if (errorString !== previousErrorsRef.current && errorString) {
      const message =
        errorArray.length === 1
          ? `Error: ${errorArray[0]}`
          : `${errorArray.length} errors: ${errorString}`;

      setAnnouncement('');
      requestAnimationFrame(() => {
        setAnnouncement(message);
      });
    }

    previousErrorsRef.current = errorString;
  }, [errors]);

  if (!announcement) return null;

  return (
    <div
      role="alert"
      aria-live={immediate ? 'assertive' : 'polite'}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}
