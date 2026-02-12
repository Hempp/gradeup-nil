'use client';

import { useEffect, useRef } from 'react';
import {
  startPerformanceMonitoring,
  onWebVital,
  onLongTask,
  onMemoryUsage,
  createConsoleReporter,
  formatMetricValue,
  formatMemorySize,
  type WebVitalMetric,
  type LongTaskEntry,
  type MemoryInfo,
} from '@/lib/utils/performance';

/* ═══════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════ */

export interface WebVitalsReporterProps {
  /**
   * Custom handler for Web Vital metrics
   * Use this to send metrics to your analytics service in production
   */
  onMetric?: (metric: WebVitalMetric) => void;

  /**
   * Custom handler for long task entries
   */
  onLongTaskDetected?: (entry: LongTaskEntry) => void;

  /**
   * Custom handler for memory usage reports
   */
  onMemoryReport?: (info: MemoryInfo) => void;

  /**
   * Enable console logging in development mode
   * @default true
   */
  enableDevLogs?: boolean;

  /**
   * Enable Web Vitals tracking
   * @default true
   */
  trackWebVitals?: boolean;

  /**
   * Enable long task detection
   * @default true
   */
  trackLongTasks?: boolean;

  /**
   * Enable memory usage monitoring
   * @default false (only available in Chrome)
   */
  trackMemory?: boolean;

  /**
   * Memory monitoring interval in milliseconds
   * @default 10000
   */
  memoryIntervalMs?: number;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════════ */

export function WebVitalsReporter({
  onMetric,
  onLongTaskDetected,
  onMemoryReport,
  enableDevLogs = true,
  trackWebVitals = true,
  trackLongTasks = true,
  trackMemory = false,
  memoryIntervalMs = 10000,
}: WebVitalsReporterProps) {
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const isDev = process.env.NODE_ENV === 'development';
    const cleanupFns: (() => void)[] = [];

    // Create console reporter for development
    const consoleReporter = isDev && enableDevLogs ? createConsoleReporter() : null;

    // Register Web Vitals reporter
    if (trackWebVitals) {
      const unsubscribeMetric = onWebVital((metric) => {
        // Log in development
        if (consoleReporter) {
          consoleReporter.metricReporter(metric);
        }

        // Call custom handler
        onMetric?.(metric);

        // Production analytics integration example:
        // sendToAnalytics('web-vital', {
        //   name: metric.name,
        //   value: metric.value,
        //   rating: metric.rating,
        //   id: metric.id,
        //   navigationType: metric.navigationType,
        // });
      });
      cleanupFns.push(unsubscribeMetric);
    }

    // Register long task reporter
    if (trackLongTasks) {
      const unsubscribeLongTask = onLongTask((entry) => {
        // Log in development
        if (consoleReporter) {
          consoleReporter.longTaskReporter(entry);
        }

        // Call custom handler
        onLongTaskDetected?.(entry);
      });
      cleanupFns.push(unsubscribeLongTask);
    }

    // Register memory reporter
    if (trackMemory) {
      const unsubscribeMemory = onMemoryUsage((info) => {
        // Log in development
        if (consoleReporter) {
          consoleReporter.memoryReporter(info);
        }

        // Call custom handler
        onMemoryReport?.(info);
      });
      cleanupFns.push(unsubscribeMemory);
    }

    // Start monitoring
    const stopMonitoring = startPerformanceMonitoring({
      webVitals: trackWebVitals,
      longTasks: trackLongTasks,
      memory: trackMemory,
      memoryIntervalMs,
    });
    cleanupFns.push(stopMonitoring);

    // Log initialization in development
    if (isDev && enableDevLogs) {
      console.log('[WebVitalsReporter] Initialized', {
        trackWebVitals,
        trackLongTasks,
        trackMemory,
      });
    }

    return () => {
      cleanupFns.forEach((fn) => fn());
    };
  }, [
    onMetric,
    onLongTaskDetected,
    onMemoryReport,
    enableDevLogs,
    trackWebVitals,
    trackLongTasks,
    trackMemory,
    memoryIntervalMs,
  ]);

  // This component doesn't render anything
  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Utility Exports (for use in custom reporters)
   ═══════════════════════════════════════════════════════════════════════════ */

export { formatMetricValue, formatMemorySize };
export type { WebVitalMetric, LongTaskEntry, MemoryInfo };
