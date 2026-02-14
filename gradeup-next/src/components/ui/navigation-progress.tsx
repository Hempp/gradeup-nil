'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// ═══════════════════════════════════════════════════════════════════════════
// GRADEUP NIL - Navigation Progress Bar
// A subtle loading bar that appears during page transitions
// ═══════════════════════════════════════════════════════════════════════════

interface NavigationProgressProps {
  /**
   * Color of the progress bar. Defaults to primary color.
   */
  color?: string;
  /**
   * Height of the progress bar in pixels. Defaults to 3.
   */
  height?: number;
  /**
   * Delay in milliseconds before showing the progress bar.
   * Helps prevent flashing for fast navigations. Defaults to 150.
   */
  showDelay?: number;
}

export function NavigationProgress({
  color = 'var(--color-primary)',
  height = 3,
  showDelay = 150,
}: NavigationProgressProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousUrl = useRef('');

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Start the progress animation
  const startProgress = useCallback(() => {
    cleanup();
    setIsLoading(true);
    setProgress(0);

    // Delay showing the bar to prevent flashing on fast navigations
    timeoutRef.current = setTimeout(() => {
      setVisible(true);

      // Animate progress incrementally
      let currentProgress = 0;
      intervalRef.current = setInterval(() => {
        // Progress slows down as it approaches 90%
        const increment = Math.random() * 10 * (1 - currentProgress / 100);
        currentProgress = Math.min(currentProgress + increment, 90);
        setProgress(currentProgress);
      }, 200);
    }, showDelay);
  }, [cleanup, showDelay]);

  // Complete the progress animation
  const completeProgress = useCallback(() => {
    cleanup();

    // Complete to 100% with a smooth finish
    setProgress(100);

    // Hide after completion animation
    timeoutRef.current = setTimeout(() => {
      setVisible(false);
      setIsLoading(false);
      setProgress(0);
    }, 300);
  }, [cleanup]);

  // Track URL changes
  useEffect(() => {
    const currentUrl = pathname + (searchParams ? searchParams.toString() : '');

    // If URL changed, complete the progress
    if (previousUrl.current && previousUrl.current !== currentUrl) {
      completeProgress();
    }

    previousUrl.current = currentUrl;
  }, [pathname, searchParams, completeProgress]);

  // Intercept link clicks to start progress
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');

      if (link) {
        const href = link.getAttribute('href');
        const isExternal = link.target === '_blank' || link.rel?.includes('external');
        const isSamePageAnchor = href?.startsWith('#');
        const isDownload = link.hasAttribute('download');

        // Only track internal navigation links
        if (href && !isExternal && !isSamePageAnchor && !isDownload && href.startsWith('/')) {
          const currentUrl = pathname + (searchParams ? searchParams.toString() : '');
          const targetUrl = new URL(href, window.location.origin);

          // Don't show progress for same-page links
          if (targetUrl.pathname + targetUrl.search !== currentUrl) {
            startProgress();
          }
        }
      }
    };

    // Handle programmatic navigation via popstate
    const handlePopState = () => {
      startProgress();
    };

    document.addEventListener('click', handleClick);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleClick);
      window.removeEventListener('popstate', handlePopState);
      cleanup();
    };
  }, [pathname, searchParams, startProgress, cleanup]);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page loading"
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
      style={{ height: `${height}px` }}
    >
      {/* Background track */}
      <div
        className="absolute inset-0 bg-[var(--bg-tertiary)] opacity-50"
      />

      {/* Progress bar */}
      <div
        className="h-full transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          background: `linear-gradient(90deg, ${color}, var(--color-secondary))`,
          boxShadow: `0 0 10px ${color}`,
        }}
      />

      {/* Animated glow at the end */}
      {isLoading && progress < 100 && (
        <div
          className="absolute top-0 h-full w-24 animate-pulse"
          style={{
            left: `calc(${progress}% - 24px)`,
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            opacity: 0.5,
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Suspense wrapper for the component (handles searchParams)
// ═══════════════════════════════════════════════════════════════════════════

import { Suspense } from 'react';

function NavigationProgressInner(props: NavigationProgressProps) {
  return <NavigationProgress {...props} />;
}

export function NavigationProgressBar(props: NavigationProgressProps = {}) {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner {...props} />
    </Suspense>
  );
}
