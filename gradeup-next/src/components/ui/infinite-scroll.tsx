'use client';

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  forwardRef,
  type ReactNode,
  type ComponentPropsWithoutRef,
} from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   INFINITE SCROLL TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export interface InfiniteScrollProps extends ComponentPropsWithoutRef<'div'> {
  /** Callback when more data should be loaded */
  onLoadMore: () => void | Promise<void>;
  /** Whether more data is currently loading */
  isLoading?: boolean;
  /** Whether there is more data to load */
  hasMore?: boolean;
  /** Distance from bottom to trigger load (in pixels) */
  threshold?: number;
  /** Custom loading indicator */
  loadingIndicator?: ReactNode;
  /** Custom end message */
  endMessage?: ReactNode;
  /** Inverse scroll (load more at top, like chat) */
  inverse?: boolean;
  /** Disable infinite scroll */
  disabled?: boolean;
  /** Error state */
  error?: Error | null;
  /** Custom error message */
  errorMessage?: ReactNode;
  /** Retry callback for error state */
  onRetry?: () => void;
  /** Children to render */
  children: ReactNode;
}

export interface UseInfiniteScrollOptions {
  /** Callback when more data should be loaded */
  onLoadMore: () => void | Promise<void>;
  /** Whether more data is currently loading */
  isLoading?: boolean;
  /** Whether there is more data to load */
  hasMore?: boolean;
  /** Distance from viewport edge to trigger (pixels) */
  rootMargin?: string;
  /** Minimum time between load calls (ms) */
  throttleMs?: number;
  /** Whether the scroll is disabled */
  disabled?: boolean;
}

export interface UseInfiniteScrollResult {
  /** Ref to attach to the sentinel element */
  sentinelRef: (node: HTMLElement | null) => void;
  /** Whether the sentinel is visible */
  isIntersecting: boolean;
  /** Reset the scroll state */
  reset: () => void;
}

/* ═══════════════════════════════════════════════════════════════════════════
   USE INFINITE SCROLL HOOK
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Hook for implementing infinite scroll with Intersection Observer.
 *
 * @example
 * const { sentinelRef } = useInfiniteScroll({
 *   onLoadMore: fetchNextPage,
 *   isLoading,
 *   hasMore,
 * });
 *
 * return (
 *   <div>
 *     {items.map(item => <Item key={item.id} {...item} />)}
 *     <div ref={sentinelRef} /> {/* Trigger element *\/}
 *     {isLoading && <Spinner />}
 *   </div>
 * );
 */
export function useInfiniteScroll(options: UseInfiniteScrollOptions): UseInfiniteScrollResult {
  const {
    onLoadMore,
    isLoading = false,
    hasMore = true,
    rootMargin = '200px',
    throttleMs = 100,
    disabled = false,
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const sentinelRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastCallRef = useRef<number>(0);
  const mountedRef = useRef(true);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Handle intersection
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0];
      if (!entry) return;

      setIsIntersecting(entry.isIntersecting);

      // Trigger load if intersecting and conditions are met
      if (
        entry.isIntersecting &&
        hasMore &&
        !isLoading &&
        !disabled &&
        mountedRef.current
      ) {
        const now = Date.now();
        if (now - lastCallRef.current >= throttleMs) {
          lastCallRef.current = now;
          onLoadMore();
        }
      }
    },
    [hasMore, isLoading, disabled, throttleMs, onLoadMore]
  );

  // Ref callback for sentinel
  const setSentinelRef = useCallback(
    (node: HTMLElement | null) => {
      // Disconnect existing observer
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      sentinelRef.current = node;

      // Create new observer if node exists
      if (node && !disabled) {
        observerRef.current = new IntersectionObserver(handleIntersection, {
          rootMargin,
          threshold: 0,
        });
        observerRef.current.observe(node);
      }
    },
    [handleIntersection, rootMargin, disabled]
  );

  // Reset function
  const reset = useCallback(() => {
    lastCallRef.current = 0;
    setIsIntersecting(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    sentinelRef: setSentinelRef,
    isIntersecting,
    reset,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   INFINITE SCROLL COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Infinite scroll container component.
 *
 * Automatically loads more content when scrolling near the bottom.
 *
 * @example
 * <InfiniteScroll
 *   onLoadMore={fetchNextPage}
 *   isLoading={isFetching}
 *   hasMore={hasNextPage}
 *   endMessage={<p>No more athletes to show</p>}
 * >
 *   {athletes.map(athlete => (
 *     <AthleteCard key={athlete.id} athlete={athlete} />
 *   ))}
 * </InfiniteScroll>
 */
export const InfiniteScroll = forwardRef<HTMLDivElement, InfiniteScrollProps>(
  function InfiniteScroll(
    {
      onLoadMore,
      isLoading = false,
      hasMore = true,
      threshold = 200,
      loadingIndicator,
      endMessage,
      inverse = false,
      disabled = false,
      error,
      errorMessage,
      onRetry,
      children,
      className,
      ...props
    },
    ref
  ) {
    const { sentinelRef } = useInfiniteScroll({
      onLoadMore,
      isLoading,
      hasMore: hasMore && !error,
      rootMargin: `${threshold}px`,
      disabled,
    });

    // Default loading indicator
    const defaultLoadingIndicator = (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading more...</span>
      </div>
    );

    // Default end message
    const defaultEndMessage = (
      <div className="py-4 text-center text-sm text-muted-foreground">
        No more items to load
      </div>
    );

    // Default error message
    const defaultErrorMessage = (
      <div className="flex flex-col items-center gap-2 py-4">
        <p className="text-sm text-destructive">
          {error?.message || 'Failed to load more items'}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-sm font-medium text-primary hover:underline"
          >
            Try again
          </button>
        )}
      </div>
    );

    return (
      <div ref={ref} className={cn('relative', className)} {...props}>
        {/* Content */}
        {inverse ? (
          <>
            {/* Sentinel at top for inverse scroll */}
            <div ref={sentinelRef} aria-hidden="true" />
            {isLoading && (loadingIndicator || defaultLoadingIndicator)}
            {children}
          </>
        ) : (
          <>
            {children}
            {/* Sentinel at bottom for normal scroll */}
            <div ref={sentinelRef} aria-hidden="true" />
          </>
        )}

        {/* Loading state */}
        {!inverse && isLoading && (loadingIndicator || defaultLoadingIndicator)}

        {/* Error state */}
        {error && (errorMessage || defaultErrorMessage)}

        {/* End message */}
        {!hasMore && !isLoading && !error && (endMessage || defaultEndMessage)}

        {/* Screen reader announcement */}
        {isLoading && (
          <div role="status" aria-live="polite" className="sr-only">
            Loading more content...
          </div>
        )}
      </div>
    );
  }
);

/* ═══════════════════════════════════════════════════════════════════════════
   INFINITE SCROLL LIST
   Pre-built list with infinite scroll
   ═══════════════════════════════════════════════════════════════════════════ */

export interface InfiniteScrollListProps<T> {
  /** Items to render */
  items: T[];
  /** Render function for each item */
  renderItem: (item: T, index: number) => ReactNode;
  /** Key extractor */
  getKey: (item: T, index: number) => string;
  /** Load more callback */
  onLoadMore: () => void | Promise<void>;
  /** Whether more data is loading */
  isLoading?: boolean;
  /** Whether there is more data */
  hasMore?: boolean;
  /** Threshold in pixels */
  threshold?: number;
  /** Gap between items */
  gap?: number;
  /** Container className */
  className?: string;
  /** Item wrapper className */
  itemClassName?: string;
  /** Empty state component */
  emptyState?: ReactNode;
  /** Loading skeleton count */
  skeletonCount?: number;
  /** Skeleton component */
  skeleton?: ReactNode;
  /** Error state */
  error?: Error | null;
  /** Retry callback */
  onRetry?: () => void;
}

/**
 * Infinite scroll list component with built-in empty and loading states.
 *
 * @example
 * <InfiniteScrollList
 *   items={athletes}
 *   renderItem={(athlete) => <AthleteCard athlete={athlete} />}
 *   getKey={(athlete) => athlete.id}
 *   onLoadMore={fetchNextPage}
 *   isLoading={isFetching}
 *   hasMore={hasNextPage}
 *   skeleton={<AthleteCardSkeleton />}
 *   skeletonCount={3}
 *   emptyState={<EmptyAthleteList />}
 * />
 */
export function InfiniteScrollList<T>({
  items,
  renderItem,
  getKey,
  onLoadMore,
  isLoading = false,
  hasMore = true,
  threshold = 200,
  gap = 16,
  className,
  itemClassName,
  emptyState,
  skeletonCount = 3,
  skeleton,
  error,
  onRetry,
}: InfiniteScrollListProps<T>) {
  // Show empty state if no items and not loading
  if (items.length === 0 && !isLoading) {
    return (
      <div className={className}>
        {emptyState || (
          <div className="py-12 text-center text-muted-foreground">
            No items found
          </div>
        )}
      </div>
    );
  }

  return (
    <InfiniteScroll
      onLoadMore={onLoadMore}
      isLoading={isLoading}
      hasMore={hasMore}
      threshold={threshold}
      error={error}
      onRetry={onRetry}
      className={className}
      loadingIndicator={
        skeleton ? (
          <div className="flex flex-col" style={{ gap }}>
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <div key={`skeleton-${i}`} className={itemClassName}>
                {skeleton}
              </div>
            ))}
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col" style={{ gap }}>
        {items.map((item, index) => (
          <div key={getKey(item, index)} className={itemClassName}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </InfiniteScroll>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   INFINITE SCROLL GRID
   Grid layout with infinite scroll
   ═══════════════════════════════════════════════════════════════════════════ */

export interface InfiniteScrollGridProps<T> extends Omit<InfiniteScrollListProps<T>, 'gap'> {
  /** Number of columns (or 'auto' for responsive) */
  columns?: number | 'auto';
  /** Minimum item width for auto columns */
  minItemWidth?: number;
  /** Gap between items */
  gap?: number;
}

/**
 * Infinite scroll grid component.
 *
 * @example
 * <InfiniteScrollGrid
 *   items={athletes}
 *   renderItem={(athlete) => <AthleteCard athlete={athlete} />}
 *   getKey={(athlete) => athlete.id}
 *   onLoadMore={fetchNextPage}
 *   columns="auto"
 *   minItemWidth={280}
 *   gap={24}
 * />
 */
export function InfiniteScrollGrid<T>({
  items,
  renderItem,
  getKey,
  onLoadMore,
  isLoading = false,
  hasMore = true,
  threshold = 200,
  columns = 'auto',
  minItemWidth = 280,
  gap = 16,
  className,
  itemClassName,
  emptyState,
  skeletonCount = 6,
  skeleton,
  error,
  onRetry,
}: InfiniteScrollGridProps<T>) {
  // Grid styles
  const gridStyle =
    columns === 'auto'
      ? {
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${minItemWidth}px, 1fr))`,
          gap,
        }
      : {
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap,
        };

  // Show empty state if no items and not loading
  if (items.length === 0 && !isLoading) {
    return (
      <div className={className}>
        {emptyState || (
          <div className="py-12 text-center text-muted-foreground">
            No items found
          </div>
        )}
      </div>
    );
  }

  return (
    <InfiniteScroll
      onLoadMore={onLoadMore}
      isLoading={isLoading}
      hasMore={hasMore}
      threshold={threshold}
      error={error}
      onRetry={onRetry}
      className={className}
      loadingIndicator={
        skeleton ? (
          <div style={gridStyle}>
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <div key={`skeleton-${i}`} className={itemClassName}>
                {skeleton}
              </div>
            ))}
          </div>
        ) : undefined
      }
    >
      <div style={gridStyle}>
        {items.map((item, index) => (
          <div key={getKey(item, index)} className={itemClassName}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </InfiniteScroll>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOAD MORE BUTTON
   Alternative to infinite scroll - manual pagination
   ═══════════════════════════════════════════════════════════════════════════ */

export interface LoadMoreButtonProps {
  /** Click handler */
  onClick: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Button text */
  children?: ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * Manual load more button as alternative to auto-scroll.
 *
 * @example
 * {hasMore && (
 *   <LoadMoreButton
 *     onClick={fetchNextPage}
 *     isLoading={isFetching}
 *   >
 *     Load more athletes
 *   </LoadMoreButton>
 * )}
 */
export function LoadMoreButton({
  onClick,
  isLoading = false,
  disabled = false,
  children = 'Load more',
  className,
}: LoadMoreButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading || disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 px-4 py-2',
        'rounded-md border border-input bg-background text-sm font-medium',
        'hover:bg-accent hover:text-accent-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'transition-colors',
        className
      )}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {isLoading ? 'Loading...' : children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SCROLL RESTORATION HOOK
   Preserves scroll position across navigations
   ═══════════════════════════════════════════════════════════════════════════ */

export interface UseScrollRestorationOptions {
  /** Unique key for this scroll position */
  key: string;
  /** Ref to the scrollable element (or null for window) */
  scrollableRef?: React.RefObject<HTMLElement>;
  /** Whether to restore on mount */
  restoreOnMount?: boolean;
}

/**
 * Hook for preserving and restoring scroll position.
 *
 * @example
 * const scrollRef = useRef<HTMLDivElement>(null);
 * const { savePosition, restorePosition } = useScrollRestoration({
 *   key: 'athlete-list',
 *   scrollableRef: scrollRef,
 *   restoreOnMount: true,
 * });
 *
 * // Save before navigating away
 * const handleAthleteClick = (id: string) => {
 *   savePosition();
 *   router.push(`/athletes/${id}`);
 * };
 */
export function useScrollRestoration(options: UseScrollRestorationOptions) {
  const { key, scrollableRef, restoreOnMount = false } = options;
  const storageKey = `scroll-position-${key}`;

  // Save current position
  const savePosition = useCallback(() => {
    const element = scrollableRef?.current;
    const scrollTop = element ? element.scrollTop : window.scrollY;

    try {
      sessionStorage.setItem(storageKey, String(scrollTop));
    } catch {
      // sessionStorage might be unavailable
    }
  }, [scrollableRef, storageKey]);

  // Restore saved position
  const restorePosition = useCallback(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const scrollTop = parseInt(saved, 10);
        const element = scrollableRef?.current;

        if (element) {
          element.scrollTop = scrollTop;
        } else {
          window.scrollTo(0, scrollTop);
        }
      }
    } catch {
      // sessionStorage might be unavailable
    }
  }, [scrollableRef, storageKey]);

  // Clear saved position
  const clearPosition = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // sessionStorage might be unavailable
    }
  }, [storageKey]);

  // Restore on mount if enabled
  useEffect(() => {
    if (restoreOnMount) {
      // Small delay to ensure content is rendered
      requestAnimationFrame(() => {
        restorePosition();
      });
    }
  }, [restoreOnMount, restorePosition]);

  return { savePosition, restorePosition, clearPosition };
}
