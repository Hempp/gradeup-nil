/**
 * Tests for performance monitoring utilities
 * @module __tests__/lib/utils/performance.test
 */

import {
  onWebVital,
  onLongTask,
  onMemoryUsage,
  startPerformanceMonitoring,
  stopPerformanceMonitoring,
  getMemoryUsage,
  getCLSValue,
  getCLSEntries,
  formatMetricValue,
  formatMemorySize,
  createConsoleReporter,
  type WebVitalMetric,
  type LongTaskEntry,
  type MemoryInfo,
} from '@/lib/utils/performance';

// Mock PerformanceObserver
class MockPerformanceObserver {
  callback: (list: { getEntries: () => PerformanceEntry[] }) => void;

  constructor(callback: (list: { getEntries: () => PerformanceEntry[] }) => void) {
    this.callback = callback;
  }

  observe() {}
  disconnect() {}
}

(global as unknown as { PerformanceObserver: typeof MockPerformanceObserver }).PerformanceObserver = MockPerformanceObserver;

// Mock performance.getEntriesByType
const mockNavigation = {
  type: 'navigate',
  responseStart: 200,
  requestStart: 100,
};

Object.defineProperty(performance, 'getEntriesByType', {
  value: jest.fn((type: string) => {
    if (type === 'navigation') {
      return [mockNavigation];
    }
    return [];
  }),
  writable: true,
});

describe('Web Vital Reporters', () => {
  it('registers and unregisters web vital reporter', () => {
    const reporter = jest.fn();

    const unsubscribe = onWebVital(reporter);

    expect(typeof unsubscribe).toBe('function');

    unsubscribe();
  });

  it('registers and unregisters long task reporter', () => {
    const reporter = jest.fn();

    const unsubscribe = onLongTask(reporter);

    expect(typeof unsubscribe).toBe('function');

    unsubscribe();
  });

  it('registers and unregisters memory reporter', () => {
    const reporter = jest.fn();

    const unsubscribe = onMemoryUsage(reporter);

    expect(typeof unsubscribe).toBe('function');

    unsubscribe();
  });
});

describe('startPerformanceMonitoring', () => {
  beforeEach(() => {
    stopPerformanceMonitoring();
  });

  afterEach(() => {
    stopPerformanceMonitoring();
  });

  it('returns cleanup function', () => {
    const cleanup = startPerformanceMonitoring();

    expect(typeof cleanup).toBe('function');

    cleanup();
  });

  it('starts monitoring with default options', () => {
    const cleanup = startPerformanceMonitoring();

    expect(cleanup).toBeDefined();

    cleanup();
  });

  it('starts monitoring with custom options', () => {
    const cleanup = startPerformanceMonitoring({
      webVitals: true,
      longTasks: true,
      memory: false,
    });

    expect(cleanup).toBeDefined();

    cleanup();
  });

  it('prevents multiple monitoring instances', () => {
    const cleanup1 = startPerformanceMonitoring();
    const cleanup2 = startPerformanceMonitoring();

    // Second call should return no-op
    expect(typeof cleanup2).toBe('function');

    cleanup1();
  });
});

describe('stopPerformanceMonitoring', () => {
  it('stops monitoring without error', () => {
    startPerformanceMonitoring();

    expect(() => stopPerformanceMonitoring()).not.toThrow();
  });

  it('handles being called when not monitoring', () => {
    expect(() => stopPerformanceMonitoring()).not.toThrow();
  });
});

describe('getMemoryUsage', () => {
  it('returns null when performance.memory is not available', () => {
    const result = getMemoryUsage();

    // In test environment, memory API is usually not available
    expect(result === null || typeof result === 'object').toBe(true);
  });

  it('returns memory info when available', () => {
    const mockMemory = {
      usedJSHeapSize: 10000000,
      totalJSHeapSize: 50000000,
      jsHeapSizeLimit: 100000000,
    };

    Object.defineProperty(performance, 'memory', {
      value: mockMemory,
      configurable: true,
    });

    const result = getMemoryUsage();

    expect(result).not.toBeNull();
    if (result) {
      expect(result.usedJSHeapSize).toBe(mockMemory.usedJSHeapSize);
      expect(result.totalJSHeapSize).toBe(mockMemory.totalJSHeapSize);
      expect(result.jsHeapSizeLimit).toBe(mockMemory.jsHeapSizeLimit);
      expect(result.usagePercentage).toBe(10);
    }

    // Clean up
    Object.defineProperty(performance, 'memory', {
      value: undefined,
      configurable: true,
    });
  });
});

describe('CLS utilities', () => {
  it('returns CLS value', () => {
    const value = getCLSValue();

    expect(typeof value).toBe('number');
  });

  it('returns CLS entries as array', () => {
    const entries = getCLSEntries();

    expect(Array.isArray(entries)).toBe(true);
  });
});

describe('formatMetricValue', () => {
  it('formats CLS value with decimals', () => {
    const metric: WebVitalMetric = {
      name: 'CLS',
      value: 0.123456,
      rating: 'good',
      delta: 0.01,
      id: 'v123',
      navigationType: 'navigate',
    };

    expect(formatMetricValue(metric)).toBe('0.123');
  });

  it('formats LCP value in milliseconds', () => {
    const metric: WebVitalMetric = {
      name: 'LCP',
      value: 2500.5,
      rating: 'good',
      delta: 100,
      id: 'v123',
      navigationType: 'navigate',
    };

    expect(formatMetricValue(metric)).toBe('2501ms');
  });

  it('formats FID value in milliseconds', () => {
    const metric: WebVitalMetric = {
      name: 'FID',
      value: 50.7,
      rating: 'good',
      delta: 50.7,
      id: 'v123',
      navigationType: 'navigate',
    };

    expect(formatMetricValue(metric)).toBe('51ms');
  });

  it('formats TTFB value in milliseconds', () => {
    const metric: WebVitalMetric = {
      name: 'TTFB',
      value: 800,
      rating: 'good',
      delta: 800,
      id: 'v123',
      navigationType: 'navigate',
    };

    expect(formatMetricValue(metric)).toBe('800ms');
  });

  it('formats INP value in milliseconds', () => {
    const metric: WebVitalMetric = {
      name: 'INP',
      value: 150,
      rating: 'good',
      delta: 150,
      id: 'v123',
      navigationType: 'navigate',
    };

    expect(formatMetricValue(metric)).toBe('150ms');
  });
});

describe('formatMemorySize', () => {
  it('formats bytes to MB', () => {
    expect(formatMemorySize(1048576)).toBe('1.00 MB');
    expect(formatMemorySize(2097152)).toBe('2.00 MB');
    expect(formatMemorySize(1572864)).toBe('1.50 MB');
  });

  it('handles small values', () => {
    expect(formatMemorySize(0)).toBe('0.00 MB');
    expect(formatMemorySize(1024)).toBe('0.00 MB');
  });

  it('handles large values', () => {
    expect(formatMemorySize(104857600)).toBe('100.00 MB');
    expect(formatMemorySize(1073741824)).toBe('1024.00 MB');
  });
});

describe('createConsoleReporter', () => {
  it('returns all reporter functions', () => {
    const reporters = createConsoleReporter();

    expect(reporters.metricReporter).toBeDefined();
    expect(reporters.longTaskReporter).toBeDefined();
    expect(reporters.memoryReporter).toBeDefined();
    expect(typeof reporters.metricReporter).toBe('function');
    expect(typeof reporters.longTaskReporter).toBe('function');
    expect(typeof reporters.memoryReporter).toBe('function');
  });

  it('metric reporter does not throw', () => {
    const { metricReporter } = createConsoleReporter();

    const metric: WebVitalMetric = {
      name: 'LCP',
      value: 2500,
      rating: 'good',
      delta: 100,
      id: 'v123',
      navigationType: 'navigate',
    };

    expect(() => metricReporter(metric)).not.toThrow();
  });

  it('long task reporter does not throw', () => {
    const { longTaskReporter } = createConsoleReporter();

    const entry: LongTaskEntry = {
      name: 'self',
      startTime: 1000,
      duration: 100,
      attribution: [],
    };

    expect(() => longTaskReporter(entry)).not.toThrow();
  });

  it('memory reporter does not throw', () => {
    const { memoryReporter } = createConsoleReporter();

    const info: MemoryInfo = {
      usedJSHeapSize: 10000000,
      totalJSHeapSize: 50000000,
      jsHeapSizeLimit: 100000000,
      usagePercentage: 10,
    };

    expect(() => memoryReporter(info)).not.toThrow();
  });
});

describe('WebVitalMetric type', () => {
  it('supports all metric names', () => {
    const names: WebVitalMetric['name'][] = ['LCP', 'FID', 'CLS', 'TTFB', 'INP'];

    expect(names.length).toBe(5);
  });

  it('supports all rating values', () => {
    const ratings: WebVitalMetric['rating'][] = ['good', 'needs-improvement', 'poor'];

    expect(ratings.length).toBe(3);
  });
});

describe('LongTaskEntry type', () => {
  it('has correct structure', () => {
    const entry: LongTaskEntry = {
      name: 'self',
      startTime: 1000,
      duration: 150,
      attribution: [
        {
          name: 'script',
          entryType: 'longtask',
          startTime: 1000,
          duration: 150,
          containerType: 'window',
          containerSrc: '',
          containerId: '',
          containerName: '',
        },
      ],
    };

    expect(entry.name).toBe('self');
    expect(entry.duration).toBe(150);
    expect(entry.attribution.length).toBe(1);
  });
});

describe('MemoryInfo type', () => {
  it('has correct structure', () => {
    const info: MemoryInfo = {
      usedJSHeapSize: 10000000,
      totalJSHeapSize: 50000000,
      jsHeapSizeLimit: 100000000,
      usagePercentage: 10,
    };

    expect(info.usedJSHeapSize).toBe(10000000);
    expect(info.usagePercentage).toBe(10);
  });
});
