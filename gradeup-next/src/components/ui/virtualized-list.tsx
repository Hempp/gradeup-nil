'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════════════════════
   VIRTUALIZED LIST TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export interface VirtualizedListProps<T> {
  /** Array of items to render */
  items: T[];
  /** Fixed height for each item in pixels */
  itemHeight: number;
  /** Height of the container (viewport) */
  containerHeight: number;
  /** Number of items to render outside visible area (default: 3) */
  overscan?: number;
  /** Render function for each item */
  renderItem: (item: T, index: number, style: CSSProperties) => ReactNode;
  /** Key extractor for list items */
  getKey: (item: T, index: number) => string;
  /** Additional class names for container */
  className?: string;
  /** Callback when scroll position changes */
  onScroll?: (scrollTop: number) => void;
  /** Callback when visible range changes */
  onVisibleRangeChange?: (startIndex: number, endIndex: number) => void;
  /** Gap between items in pixels */
  gap?: number;
  /** Initial scroll offset */
  initialScrollOffset?: number;
}

export interface VirtualizedGridProps<T> {
  /** Array of items to render */
  items: T[];
  /** Fixed height for each item in pixels */
  itemHeight: number;
  /** Fixed width for each item in pixels */
  itemWidth: number;
  /** Height of the container (viewport) */
  containerHeight: number;
  /** Width of the container (or 'auto' for full width) */
  containerWidth?: number | 'auto';
  /** Number of rows to render outside visible area (default: 2) */
  overscan?: number;
  /** Render function for each item */
  renderItem: (item: T, index: number, style: CSSProperties) => ReactNode;
  /** Key extractor for grid items */
  getKey: (item: T, index: number) => string;
  /** Additional class names for container */
  className?: string;
  /** Gap between items in pixels */
  gap?: number;
}

/* ═══════════════════════════════════════════════════════════════════════════
   VIRTUALIZED LIST COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * High-performance virtualized list for rendering large datasets.
 *
 * Only renders items visible in the viewport plus a small overscan buffer,
 * enabling smooth scrolling through thousands of items.
 *
 * @example
 * <VirtualizedList
 *   items={athletes}
 *   itemHeight={80}
 *   containerHeight={600}
 *   getKey={(athlete) => athlete.id}
 *   renderItem={(athlete, index, style) => (
 *     <div style={style}>
 *       <AthleteRow athlete={athlete} />
 *     </div>
 *   )}
 * />
 */
function VirtualizedListInner<T>(
  {
    items,
    itemHeight,
    containerHeight,
    overscan = 3,
    renderItem,
    getKey,
    className,
    onScroll,
    onVisibleRangeChange,
    gap = 0,
    initialScrollOffset = 0,
  }: VirtualizedListProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const [scrollTop, setScrollTop] = useState(initialScrollOffset);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate total content height
  const totalHeight = items.length * (itemHeight + gap) - gap;

  // Calculate visible range
  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    const effectiveItemHeight = itemHeight + gap;
    const start = Math.max(0, Math.floor(scrollTop / effectiveItemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / effectiveItemHeight);
    const end = Math.min(items.length - 1, start + visibleCount + overscan * 2);

    return {
      startIndex: start,
      endIndex: end,
      visibleItems: items.slice(start, end + 1),
    };
  }, [items, itemHeight, gap, containerHeight, scrollTop, overscan]);

  // Handle scroll
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);
    },
    [onScroll]
  );

  // Notify visible range changes
  useEffect(() => {
    onVisibleRangeChange?.(startIndex, endIndex);
  }, [startIndex, endIndex, onVisibleRangeChange]);

  // Set initial scroll position
  useEffect(() => {
    if (containerRef.current && initialScrollOffset > 0) {
      containerRef.current.scrollTop = initialScrollOffset;
    }
  }, [initialScrollOffset]);

  // Merge refs
  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref]
  );

  return (
    <div
      ref={mergedRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Spacer for total content height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, localIndex) => {
          const actualIndex = startIndex + localIndex;
          const top = actualIndex * (itemHeight + gap);

          return renderItem(item, actualIndex, {
            position: 'absolute',
            top,
            left: 0,
            right: 0,
            height: itemHeight,
          });
        })}
      </div>
    </div>
  );
}

// Forward ref with generics
export const VirtualizedList = forwardRef(VirtualizedListInner) as <T>(
  props: VirtualizedListProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => ReturnType<typeof VirtualizedListInner>;

/* ═══════════════════════════════════════════════════════════════════════════
   VIRTUALIZED GRID COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * High-performance virtualized grid for rendering large card layouts.
 *
 * Automatically calculates columns based on container width and item dimensions.
 *
 * @example
 * <VirtualizedGrid
 *   items={athletes}
 *   itemHeight={280}
 *   itemWidth={300}
 *   containerHeight={800}
 *   gap={16}
 *   getKey={(athlete) => athlete.id}
 *   renderItem={(athlete, index, style) => (
 *     <div style={style}>
 *       <AthleteCard athlete={athlete} />
 *     </div>
 *   )}
 * />
 */
function VirtualizedGridInner<T>(
  {
    items,
    itemHeight,
    itemWidth,
    containerHeight,
    containerWidth = 'auto',
    overscan = 2,
    renderItem,
    getKey,
    className,
    gap = 0,
  }: VirtualizedGridProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [actualWidth, setActualWidth] = useState(containerWidth === 'auto' ? 0 : containerWidth);

  // Track container width
  useEffect(() => {
    if (containerWidth !== 'auto' || !containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setActualWidth(width);
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerWidth]);

  // Calculate columns
  const columns = useMemo(() => {
    if (actualWidth === 0) return 1;
    return Math.max(1, Math.floor((actualWidth + gap) / (itemWidth + gap)));
  }, [actualWidth, itemWidth, gap]);

  // Calculate rows
  const rows = Math.ceil(items.length / columns);
  const rowHeight = itemHeight + gap;
  const totalHeight = rows * rowHeight - gap;

  // Calculate visible range
  const { startRow, endRow, visibleItems } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleRowCount = Math.ceil(containerHeight / rowHeight);
    const end = Math.min(rows - 1, start + visibleRowCount + overscan * 2);

    const startIdx = start * columns;
    const endIdx = Math.min(items.length, (end + 1) * columns);

    return {
      startRow: start,
      endRow: end,
      visibleItems: items.slice(startIdx, endIdx).map((item, i) => ({
        item,
        index: startIdx + i,
      })),
    };
  }, [items, columns, rows, rowHeight, containerHeight, scrollTop, overscan]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Merge refs
  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref]
  );

  return (
    <div
      ref={mergedRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index }) => {
          const row = Math.floor(index / columns);
          const col = index % columns;
          const top = row * rowHeight;
          const left = col * (itemWidth + gap);

          return renderItem(item, index, {
            position: 'absolute',
            top,
            left,
            width: itemWidth,
            height: itemHeight,
          });
        })}
      </div>
    </div>
  );
}

// Forward ref with generics
export const VirtualizedGrid = forwardRef(VirtualizedGridInner) as <T>(
  props: VirtualizedGridProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => ReturnType<typeof VirtualizedGridInner>;

/* ═══════════════════════════════════════════════════════════════════════════
   VIRTUALIZED LIST UTILITIES
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Hook for scroll-to-item functionality in virtualized lists.
 */
export function useScrollToItem(
  containerRef: React.RefObject<HTMLDivElement>,
  itemHeight: number,
  gap: number = 0
) {
  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      if (!containerRef.current) return;

      const targetTop = index * (itemHeight + gap);
      containerRef.current.scrollTo({
        top: targetTop,
        behavior,
      });
    },
    [containerRef, itemHeight, gap]
  );

  const scrollToTop = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      containerRef.current?.scrollTo({ top: 0, behavior });
    },
    [containerRef]
  );

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      if (!containerRef.current) return;
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior,
      });
    },
    [containerRef]
  );

  return { scrollToIndex, scrollToTop, scrollToBottom };
}

/**
 * Hook for tracking scroll position and direction in virtualized lists.
 */
export function useScrollPosition(containerRef: React.RefObject<HTMLDivElement>) {
  const [scrollPosition, setScrollPosition] = useState({
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
    isAtTop: true,
    isAtBottom: false,
    scrollDirection: 'down' as 'up' | 'down',
  });

  const previousScrollTop = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const direction = scrollTop > previousScrollTop.current ? 'down' : 'up';
      previousScrollTop.current = scrollTop;

      setScrollPosition({
        scrollTop,
        scrollHeight,
        clientHeight,
        isAtTop: scrollTop === 0,
        isAtBottom: scrollTop + clientHeight >= scrollHeight - 1,
        scrollDirection: direction,
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef]);

  return scrollPosition;
}

/* ═══════════════════════════════════════════════════════════════════════════
   VARIABLE HEIGHT VIRTUALIZED LIST
   For items with dynamic heights
   ═══════════════════════════════════════════════════════════════════════════ */

export interface VariableHeightItem {
  height: number;
}

export interface VariableVirtualizedListProps<T extends VariableHeightItem> {
  items: T[];
  containerHeight: number;
  overscan?: number;
  renderItem: (item: T, index: number, style: CSSProperties) => ReactNode;
  getKey: (item: T, index: number) => string;
  className?: string;
  estimatedItemHeight?: number;
}

/**
 * Virtualized list supporting variable height items.
 *
 * Items must include a `height` property for proper positioning.
 *
 * @example
 * const items = messages.map(m => ({ ...m, height: estimateHeight(m) }));
 *
 * <VariableVirtualizedList
 *   items={items}
 *   containerHeight={500}
 *   getKey={(item) => item.id}
 *   renderItem={(item, index, style) => (
 *     <div style={style}>
 *       <MessageBubble message={item} />
 *     </div>
 *   )}
 * />
 */
export function VariableVirtualizedList<T extends VariableHeightItem>({
  items,
  containerHeight,
  overscan = 3,
  renderItem,
  getKey,
  className,
  estimatedItemHeight = 50,
}: VariableVirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pre-calculate cumulative heights
  const itemPositions = useMemo(() => {
    const positions: { top: number; height: number }[] = [];
    let currentTop = 0;

    for (const item of items) {
      positions.push({ top: currentTop, height: item.height || estimatedItemHeight });
      currentTop += item.height || estimatedItemHeight;
    }

    return positions;
  }, [items, estimatedItemHeight]);

  const totalHeight = itemPositions.length > 0
    ? itemPositions[itemPositions.length - 1].top + itemPositions[itemPositions.length - 1].height
    : 0;

  // Binary search to find start index
  const findStartIndex = useCallback(
    (scrollTop: number): number => {
      let low = 0;
      let high = itemPositions.length - 1;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const pos = itemPositions[mid];

        if (pos.top + pos.height < scrollTop) {
          low = mid + 1;
        } else if (pos.top > scrollTop) {
          high = mid - 1;
        } else {
          return mid;
        }
      }

      return Math.max(0, low - overscan);
    },
    [itemPositions, overscan]
  );

  // Calculate visible range
  const { startIndex, visibleItems } = useMemo(() => {
    const start = findStartIndex(scrollTop);
    const viewportBottom = scrollTop + containerHeight;

    const visible: { item: T; index: number; position: { top: number; height: number } }[] = [];
    for (let i = Math.max(0, start - overscan); i < items.length; i++) {
      const pos = itemPositions[i];
      if (pos.top > viewportBottom + overscan * estimatedItemHeight) break;
      visible.push({ item: items[i], index: i, position: pos });
    }

    return { startIndex: start, visibleItems: visible };
  }, [items, itemPositions, scrollTop, containerHeight, overscan, estimatedItemHeight, findStartIndex]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, position }) =>
          renderItem(item, index, {
            position: 'absolute',
            top: position.top,
            left: 0,
            right: 0,
            height: position.height,
          })
        )}
      </div>
    </div>
  );
}
