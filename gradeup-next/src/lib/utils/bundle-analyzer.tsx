'use client';

/**
 * Bundle Analyzer & Component Render Time Utilities
 * Development-only utilities for tracking component performance
 */

import { useEffect, useLayoutEffect, useRef, useCallback, useId, type ComponentType } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface RenderTiming {
  componentName: string;
  renderCount: number;
  lastRenderTime: number;
  totalRenderTime: number;
  averageRenderTime: number;
  minRenderTime: number;
  maxRenderTime: number;
  timestamps: number[];
}

export interface RenderTimingOptions {
  /**
   * Component name for logging purposes
   */
  componentName?: string;

  /**
   * Log each render to console
   * @default true in development
   */
  logRenders?: boolean;

  /**
   * Warn when render time exceeds this threshold (ms)
   * @default 16 (one frame at 60fps)
   */
  warnThreshold?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Internal State
// ═══════════════════════════════════════════════════════════════════════════

const renderTimings = new Map<string, RenderTiming>();
const isDev = process.env.NODE_ENV === 'development';

// ═══════════════════════════════════════════════════════════════════════════
// Hook: useRenderTiming
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook to track component render times in development mode
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useRenderTiming({ componentName: 'MyComponent' });
 *   return <div>Content</div>;
 * }
 * ```
 */
export function useRenderTiming(options: RenderTimingOptions = {}): void {
  const {
    componentName = 'UnnamedComponent',
    logRenders = isDev,
    warnThreshold = 16,
  } = options;

  const renderStartRef = useRef<number>(0);
  const isFirstRender = useRef(true);

  // Initialize render start time before effects run
  useLayoutEffect(() => {
    renderStartRef.current = performance.now();
  });

  useEffect(() => {
    if (!isDev) return;

    const renderEnd = performance.now();
    const renderTime = renderEnd - renderStartRef.current;

    // Update timing data
    let timing = renderTimings.get(componentName);
    if (!timing) {
      timing = {
        componentName,
        renderCount: 0,
        lastRenderTime: 0,
        totalRenderTime: 0,
        averageRenderTime: 0,
        minRenderTime: Infinity,
        maxRenderTime: 0,
        timestamps: [],
      };
      renderTimings.set(componentName, timing);
    }

    timing.renderCount++;
    timing.lastRenderTime = renderTime;
    timing.totalRenderTime += renderTime;
    timing.averageRenderTime = timing.totalRenderTime / timing.renderCount;
    timing.minRenderTime = Math.min(timing.minRenderTime, renderTime);
    timing.maxRenderTime = Math.max(timing.maxRenderTime, renderTime);
    timing.timestamps.push(renderEnd);

    // Keep only last 100 timestamps to prevent memory leaks
    if (timing.timestamps.length > 100) {
      timing.timestamps.shift();
    }

    // Log render
    if (logRenders) {
      const renderType = isFirstRender.current ? 'mount' : 'update';
      const timeFormatted = renderTime.toFixed(2);

      if (renderTime > warnThreshold) {
        console.warn(
          `[Render] ${componentName} (${renderType}): ${timeFormatted}ms (slow - exceeds ${warnThreshold}ms threshold)`
        );
      } else {
        console.log(`[Render] ${componentName} (${renderType}): ${timeFormatted}ms`);
      }
    }

    isFirstRender.current = false;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// HOC: withRenderTiming
// ═══════════════════════════════════════════════════════════════════════════

/**
 * HOC to wrap a component with render timing tracking
 *
 * @example
 * ```tsx
 * const TrackedComponent = withRenderTiming(MyComponent, 'MyComponent');
 * ```
 */
export function withRenderTiming<P extends object>(
  WrappedComponent: ComponentType<P>,
  componentName?: string
): ComponentType<P> {
  if (!isDev) return WrappedComponent;

  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';

  function WithRenderTiming(props: P) {
    useRenderTiming({ componentName: displayName });

    return <WrappedComponent {...props} />;
  }

  WithRenderTiming.displayName = `WithRenderTiming(${displayName})`;

  return WithRenderTiming;
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook: useRenderCount
// ═══════════════════════════════════════════════════════════════════════════

// Module-level render counts for React 19 Compiler compliance
const renderCounts = new Map<string, number>();

/**
 * Hook to track and return the current render count
 * Useful for debugging unnecessary re-renders
 *
 * Note: Uses module-level tracking to comply with React 19 Compiler
 * which prohibits ref access during render.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const renderCount = useRenderCount('MyComponent');
 *   console.log(`Rendered ${renderCount} times`);
 *   return <div>Content</div>;
 * }
 * ```
 */
export function useRenderCount(componentName?: string): number {
  // Generate a stable key using React's useId for anonymous components
  const generatedId = useId();
  const key = componentName || generatedId;

  useEffect(() => {
    const currentCount = (renderCounts.get(key) || 0) + 1;
    renderCounts.set(key, currentCount);

    if (isDev && componentName) {
      console.log(`[RenderCount] ${componentName}: ${currentCount}`);
    }
  });

  // Return the current count from module-level storage (safe to read)
  return renderCounts.get(key) || 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook: useWhyDidYouRender
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook to log which props changed between renders
 *
 * @example
 * ```tsx
 * function MyComponent(props) {
 *   useWhyDidYouRender('MyComponent', props);
 *   return <div>Content</div>;
 * }
 * ```
 */
export function useWhyDidYouRender<T extends Record<string, unknown>>(
  componentName: string,
  props: T
): void {
  const previousProps = useRef<T>(undefined);

  useEffect(() => {
    if (!isDev) return;

    if (previousProps.current) {
      const allKeys = new Set([
        ...Object.keys(previousProps.current),
        ...Object.keys(props),
      ]);

      const changedProps: Record<string, { from: unknown; to: unknown }> = {};

      allKeys.forEach((key) => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length > 0) {
        console.log(`[WhyDidYouRender] ${componentName}:`, changedProps);
      }
    }

    previousProps.current = props;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook: useProfileCallback
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook to create a profiled callback that logs execution time
 *
 * @example
 * ```tsx
 * const handleClick = useProfileCallback(
 *   () => { heavyOperation(); },
 *   'handleClick'
 * );
 * ```
 */
export function useProfileCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  callbackName: string,
  deps: React.DependencyList = []
): T {
  return useCallback(
    ((...args: unknown[]) => {
      if (!isDev) {
        return callback(...args);
      }

      const start = performance.now();
      const result = callback(...args);

      // Handle async functions
      if (result instanceof Promise) {
        return result.finally(() => {
          const duration = performance.now() - start;
          console.log(`[Callback] ${callbackName}: ${duration.toFixed(2)}ms (async)`);
        });
      }

      const duration = performance.now() - start;
      console.log(`[Callback] ${callbackName}: ${duration.toFixed(2)}ms`);

      return result;
    }) as T,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [callback, callbackName, ...deps]
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get timing data for all tracked components
 */
export function getAllRenderTimings(): Map<string, RenderTiming> {
  return new Map(renderTimings);
}

/**
 * Get timing data for a specific component
 */
export function getRenderTiming(componentName: string): RenderTiming | undefined {
  return renderTimings.get(componentName);
}

/**
 * Clear all timing data
 */
export function clearRenderTimings(): void {
  renderTimings.clear();
}

/**
 * Print a summary of all render timings to console
 */
export function printRenderTimingSummary(): void {
  if (!isDev) return;

  console.group('[Render Timing Summary]');

  const sortedTimings = Array.from(renderTimings.values()).sort(
    (a, b) => b.averageRenderTime - a.averageRenderTime
  );

  sortedTimings.forEach((timing) => {
    console.log(
      `${timing.componentName}: ` +
      `avg=${timing.averageRenderTime.toFixed(2)}ms, ` +
      `min=${timing.minRenderTime.toFixed(2)}ms, ` +
      `max=${timing.maxRenderTime.toFixed(2)}ms, ` +
      `renders=${timing.renderCount}`
    );
  });

  console.groupEnd();
}

/**
 * Get components with slow render times
 */
export function getSlowComponents(threshold: number = 16): RenderTiming[] {
  return Array.from(renderTimings.values()).filter(
    (timing) => timing.averageRenderTime > threshold
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Browser DevTools Integration
// ═══════════════════════════════════════════════════════════════════════════

interface RenderTimingDevTools {
  getAll: typeof getAllRenderTimings;
  get: typeof getRenderTiming;
  clear: typeof clearRenderTimings;
  print: typeof printRenderTimingSummary;
  getSlow: typeof getSlowComponents;
}

/**
 * Expose timing utilities to browser console in development
 */
if (isDev && typeof window !== 'undefined') {
  (window as Window & { __renderTimings?: RenderTimingDevTools }).__renderTimings = {
    getAll: getAllRenderTimings,
    get: getRenderTiming,
    clear: clearRenderTimings,
    print: printRenderTimingSummary,
    getSlow: getSlowComponents,
  };
}
