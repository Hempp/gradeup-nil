/**
 * Performance Monitoring Utilities
 * Web Vitals tracking, long task observation, and memory monitoring
 */

import { createLogger } from '@/lib/utils/logger';

const log = createLogger('Performance');

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebVitalMetric {
  name: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

export interface LongTaskEntry {
  name: string;
  startTime: number;
  duration: number;
  attribution: LongTaskAttribution[];
}

export interface LongTaskAttribution {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  containerType: string;
  containerSrc: string;
  containerId: string;
  containerName: string;
}

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercentage: number;
}

export type MetricReporter = (metric: WebVitalMetric) => void;
export type LongTaskReporter = (entry: LongTaskEntry) => void;
export type MemoryReporter = (info: MemoryInfo) => void;

// ═══════════════════════════════════════════════════════════════════════════
// Internal State
// ═══════════════════════════════════════════════════════════════════════════

const metricReporters: MetricReporter[] = [];
const longTaskReporters: LongTaskReporter[] = [];
const memoryReporters: MemoryReporter[] = [];

let isObserving = false;
let longTaskObserver: PerformanceObserver | null = null;
let memoryInterval: ReturnType<typeof setInterval> | null = null;

// Store cumulative CLS value
let clsValue = 0;
const clsEntries: PerformanceEntry[] = [];

// ═══════════════════════════════════════════════════════════════════════════
// Web Vitals Rating Thresholds
// ═══════════════════════════════════════════════════════════════════════════

const thresholds = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
};

function getRating(name: keyof typeof thresholds, value: number): WebVitalMetric['rating'] {
  const threshold = thresholds[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

function generateId(): string {
  return `v${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Reporter Registration
// ═══════════════════════════════════════════════════════════════════════════

export function onWebVital(reporter: MetricReporter): () => void {
  metricReporters.push(reporter);
  return () => {
    const index = metricReporters.indexOf(reporter);
    if (index > -1) metricReporters.splice(index, 1);
  };
}

export function onLongTask(reporter: LongTaskReporter): () => void {
  longTaskReporters.push(reporter);
  return () => {
    const index = longTaskReporters.indexOf(reporter);
    if (index > -1) longTaskReporters.splice(index, 1);
  };
}

export function onMemoryUsage(reporter: MemoryReporter): () => void {
  memoryReporters.push(reporter);
  return () => {
    const index = memoryReporters.indexOf(reporter);
    if (index > -1) memoryReporters.splice(index, 1);
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Metric Reporting
// ═══════════════════════════════════════════════════════════════════════════

function reportMetric(metric: WebVitalMetric): void {
  metricReporters.forEach((reporter) => {
    try {
      reporter(metric);
    } catch (error) {
      log.error('Reporter error', error instanceof Error ? error : new Error(String(error)));
    }
  });
}

function reportLongTask(entry: LongTaskEntry): void {
  longTaskReporters.forEach((reporter) => {
    try {
      reporter(entry);
    } catch (error) {
      log.error('Long task reporter error', error instanceof Error ? error : new Error(String(error)));
    }
  });
}

function reportMemory(info: MemoryInfo): void {
  memoryReporters.forEach((reporter) => {
    try {
      reporter(info);
    } catch (error) {
      log.error('Memory reporter error', error instanceof Error ? error : new Error(String(error)));
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Web Vitals Observers
// ═══════════════════════════════════════════════════════════════════════════

function getNavigationType(): string {
  if (typeof window === 'undefined') return 'unknown';

  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  return nav?.type || 'unknown';
}

function observeLCP(): void {
  if (typeof PerformanceObserver === 'undefined') return;

  try {
    let lastValue = 0;
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      const value = lastEntry.startTime;

      reportMetric({
        name: 'LCP',
        value,
        rating: getRating('LCP', value),
        delta: value - lastValue,
        id: generateId(),
        navigationType: getNavigationType(),
      });

      lastValue = value;
    });

    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // LCP not supported
  }
}

function observeFID(): void {
  if (typeof PerformanceObserver === 'undefined') return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const fidEntry = entry as PerformanceEventTiming;
        const value = fidEntry.processingStart - fidEntry.startTime;

        reportMetric({
          name: 'FID',
          value,
          rating: getRating('FID', value),
          delta: value,
          id: generateId(),
          navigationType: getNavigationType(),
        });
      });
    });

    observer.observe({ type: 'first-input', buffered: true });
  } catch {
    // FID not supported
  }
}

function observeCLS(): void {
  if (typeof PerformanceObserver === 'undefined') return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as LayoutShift;
        if (!layoutShift.hadRecentInput) {
          const previousValue = clsValue;
          clsValue += layoutShift.value;
          clsEntries.push(entry);

          reportMetric({
            name: 'CLS',
            value: clsValue,
            rating: getRating('CLS', clsValue),
            delta: clsValue - previousValue,
            id: generateId(),
            navigationType: getNavigationType(),
          });
        }
      }
    });

    observer.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // CLS not supported
  }
}

interface LayoutShift extends PerformanceEntry {
  hadRecentInput: boolean;
  value: number;
}

function observeTTFB(): void {
  if (typeof window === 'undefined') return;

  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      const value = nav.responseStart - nav.requestStart;

      reportMetric({
        name: 'TTFB',
        value,
        rating: getRating('TTFB', value),
        delta: value,
        id: generateId(),
        navigationType: nav.type,
      });
    }
  } catch {
    // TTFB not supported
  }
}

function observeINP(): void {
  if (typeof PerformanceObserver === 'undefined') return;

  try {
    let maxINP = 0;
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const eventEntry = entry as PerformanceEventTiming;
        const duration = eventEntry.duration;

        if (duration > maxINP) {
          const previousValue = maxINP;
          maxINP = duration;

          reportMetric({
            name: 'INP',
            value: duration,
            rating: getRating('INP', duration),
            delta: duration - previousValue,
            id: generateId(),
            navigationType: getNavigationType(),
          });
        }
      });
    });

    observer.observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
  } catch {
    // INP not supported
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Long Task Observer
// ═══════════════════════════════════════════════════════════════════════════

function observeLongTasks(): void {
  if (typeof PerformanceObserver === 'undefined') return;

  try {
    longTaskObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const taskEntry = entry as PerformanceLongTaskTiming;

        reportLongTask({
          name: taskEntry.name,
          startTime: taskEntry.startTime,
          duration: taskEntry.duration,
          attribution: (taskEntry.attribution || []).map((attr: TaskAttributionTiming) => ({
            name: attr.name,
            entryType: attr.entryType,
            startTime: attr.startTime,
            duration: attr.duration,
            containerType: attr.containerType,
            containerSrc: attr.containerSrc,
            containerId: attr.containerId,
            containerName: attr.containerName,
          })),
        });
      });
    });

    longTaskObserver.observe({ type: 'longtask', buffered: true });
  } catch {
    // Long tasks not supported
  }
}

interface PerformanceLongTaskTiming extends PerformanceEntry {
  attribution: TaskAttributionTiming[];
}

interface TaskAttributionTiming {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  containerType: string;
  containerSrc: string;
  containerId: string;
  containerName: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Memory Usage Monitoring
// ═══════════════════════════════════════════════════════════════════════════

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: PerformanceMemory;
}

export function getMemoryUsage(): MemoryInfo | null {
  if (typeof window === 'undefined') return null;

  const perf = performance as PerformanceWithMemory;
  if (!perf.memory) return null;

  const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = perf.memory;

  return {
    usedJSHeapSize,
    totalJSHeapSize,
    jsHeapSizeLimit,
    usagePercentage: (usedJSHeapSize / jsHeapSizeLimit) * 100,
  };
}

function startMemoryMonitoring(intervalMs: number = 10000): void {
  if (typeof window === 'undefined') return;

  const checkMemory = () => {
    const info = getMemoryUsage();
    if (info) {
      reportMemory(info);
    }
  };

  // Initial check
  checkMemory();

  // Periodic checks
  memoryInterval = setInterval(checkMemory, intervalMs);
}

// ═══════════════════════════════════════════════════════════════════════════
// Main API
// ═══════════════════════════════════════════════════════════════════════════

export interface PerformanceMonitorOptions {
  webVitals?: boolean;
  longTasks?: boolean;
  memory?: boolean;
  memoryIntervalMs?: number;
}

export function startPerformanceMonitoring(options: PerformanceMonitorOptions = {}): () => void {
  if (typeof window === 'undefined') return () => {};
  if (isObserving) return () => {};

  const {
    webVitals = true,
    longTasks = true,
    memory = true,
    memoryIntervalMs = 10000,
  } = options;

  isObserving = true;

  if (webVitals) {
    observeLCP();
    observeFID();
    observeCLS();
    observeTTFB();
    observeINP();
  }

  if (longTasks) {
    observeLongTasks();
  }

  if (memory) {
    startMemoryMonitoring(memoryIntervalMs);
  }

  // Return cleanup function
  return () => {
    stopPerformanceMonitoring();
  };
}

export function stopPerformanceMonitoring(): void {
  isObserving = false;

  if (longTaskObserver) {
    longTaskObserver.disconnect();
    longTaskObserver = null;
  }

  if (memoryInterval) {
    clearInterval(memoryInterval);
    memoryInterval = null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════

export function getCLSValue(): number {
  return clsValue;
}

export function getCLSEntries(): PerformanceEntry[] {
  return [...clsEntries];
}

export function formatMetricValue(metric: WebVitalMetric): string {
  switch (metric.name) {
    case 'CLS':
      return metric.value.toFixed(3);
    case 'LCP':
    case 'FID':
    case 'TTFB':
    case 'INP':
      return `${Math.round(metric.value)}ms`;
    default:
      return String(metric.value);
  }
}

export function formatMemorySize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Console Reporter (Development)
// ═══════════════════════════════════════════════════════════════════════════

export function createConsoleReporter(): {
  metricReporter: MetricReporter;
  longTaskReporter: LongTaskReporter;
  memoryReporter: MemoryReporter;
} {
  return {
    metricReporter: (metric) => {
      log.debug(`Web Vital ${metric.name}: ${formatMetricValue(metric)}`, {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
      });
    },
    longTaskReporter: (entry) => {
      log.warn('Long task detected', {
        name: entry.name,
        duration: entry.duration,
        startTime: entry.startTime,
      });
    },
    memoryReporter: (info) => {
      log.debug('Memory usage', {
        usedJSHeapSize: formatMemorySize(info.usedJSHeapSize),
        jsHeapSizeLimit: formatMemorySize(info.jsHeapSizeLimit),
        usagePercentage: `${info.usagePercentage.toFixed(1)}%`,
      });
    },
  };
}
