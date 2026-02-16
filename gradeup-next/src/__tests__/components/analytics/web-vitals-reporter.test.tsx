/**
 * Tests for the WebVitalsReporter component
 * @module __tests__/components/analytics/web-vitals-reporter.test
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { WebVitalsReporter } from '@/components/analytics/web-vitals-reporter';

// Mock the performance utilities
const mockOnWebVital = jest.fn((callback) => {
  // Return unsubscribe function
  return jest.fn();
});

const mockOnLongTask = jest.fn((callback) => {
  return jest.fn();
});

const mockOnMemoryUsage = jest.fn((callback) => {
  return jest.fn();
});

const mockStartPerformanceMonitoring = jest.fn(() => {
  return jest.fn(); // cleanup function
});

const mockCreateConsoleReporter = jest.fn(() => ({
  metricReporter: jest.fn(),
  longTaskReporter: jest.fn(),
  memoryReporter: jest.fn(),
}));

jest.mock('@/lib/utils/performance', () => ({
  onWebVital: (callback: unknown) => mockOnWebVital(callback),
  onLongTask: (callback: unknown) => mockOnLongTask(callback),
  onMemoryUsage: (callback: unknown) => mockOnMemoryUsage(callback),
  startPerformanceMonitoring: (options: unknown) => mockStartPerformanceMonitoring(options),
  createConsoleReporter: () => mockCreateConsoleReporter(),
  formatMetricValue: jest.fn((name: string, value: number) => `${value}ms`),
  formatMemorySize: jest.fn((bytes: number) => `${bytes / 1024}KB`),
}));

describe('WebVitalsReporter', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset NODE_ENV before each test
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true,
    });
  });

  it('renders nothing (returns null)', () => {
    const { container } = render(<WebVitalsReporter />);
    expect(container.firstChild).toBeNull();
  });

  it('initializes performance monitoring on mount', () => {
    render(<WebVitalsReporter />);

    expect(mockStartPerformanceMonitoring).toHaveBeenCalledWith({
      webVitals: true,
      longTasks: true,
      memory: false,
      memoryIntervalMs: 10000,
    });
  });

  it('registers web vital callback when trackWebVitals is true', () => {
    render(<WebVitalsReporter trackWebVitals={true} />);

    expect(mockOnWebVital).toHaveBeenCalled();
  });

  it('does not register web vital callback when trackWebVitals is false', () => {
    render(<WebVitalsReporter trackWebVitals={false} />);

    expect(mockOnWebVital).not.toHaveBeenCalled();
  });

  it('registers long task callback when trackLongTasks is true', () => {
    render(<WebVitalsReporter trackLongTasks={true} />);

    expect(mockOnLongTask).toHaveBeenCalled();
  });

  it('does not register long task callback when trackLongTasks is false', () => {
    render(<WebVitalsReporter trackLongTasks={false} />);

    expect(mockOnLongTask).not.toHaveBeenCalled();
  });

  it('registers memory callback when trackMemory is true', () => {
    render(<WebVitalsReporter trackMemory={true} />);

    expect(mockOnMemoryUsage).toHaveBeenCalled();
  });

  it('does not register memory callback when trackMemory is false', () => {
    render(<WebVitalsReporter trackMemory={false} />);

    expect(mockOnMemoryUsage).not.toHaveBeenCalled();
  });

  it('passes custom memoryIntervalMs to monitoring', () => {
    render(<WebVitalsReporter trackMemory={true} memoryIntervalMs={5000} />);

    expect(mockStartPerformanceMonitoring).toHaveBeenCalledWith(
      expect.objectContaining({
        memoryIntervalMs: 5000,
      })
    );
  });

  it('calls onMetric callback when provided', () => {
    const onMetricCallback = jest.fn();

    // Capture the callback passed to onWebVital
    let capturedCallback: ((metric: unknown) => void) | null = null;
    mockOnWebVital.mockImplementation((callback) => {
      capturedCallback = callback;
      return jest.fn();
    });

    render(<WebVitalsReporter onMetric={onMetricCallback} />);

    // Simulate a metric being reported
    const mockMetric = { name: 'LCP', value: 1000, rating: 'good' };
    if (capturedCallback) {
      capturedCallback(mockMetric);
    }

    expect(onMetricCallback).toHaveBeenCalledWith(mockMetric);
  });

  it('calls onLongTaskDetected callback when provided', () => {
    const onLongTaskCallback = jest.fn();

    let capturedCallback: ((entry: unknown) => void) | null = null;
    mockOnLongTask.mockImplementation((callback) => {
      capturedCallback = callback;
      return jest.fn();
    });

    render(<WebVitalsReporter onLongTaskDetected={onLongTaskCallback} />);

    const mockEntry = { duration: 60, startTime: 1000 };
    if (capturedCallback) {
      capturedCallback(mockEntry);
    }

    expect(onLongTaskCallback).toHaveBeenCalledWith(mockEntry);
  });

  it('calls onMemoryReport callback when provided', () => {
    const onMemoryCallback = jest.fn();

    let capturedCallback: ((info: unknown) => void) | null = null;
    mockOnMemoryUsage.mockImplementation((callback) => {
      capturedCallback = callback;
      return jest.fn();
    });

    render(<WebVitalsReporter trackMemory={true} onMemoryReport={onMemoryCallback} />);

    const mockInfo = { usedJSHeapSize: 1000000, totalJSHeapSize: 2000000 };
    if (capturedCallback) {
      capturedCallback(mockInfo);
    }

    expect(onMemoryCallback).toHaveBeenCalledWith(mockInfo);
  });

  it('creates console reporter in development mode', () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      writable: true,
    });

    render(<WebVitalsReporter enableDevLogs={true} />);

    expect(mockCreateConsoleReporter).toHaveBeenCalled();
  });

  it('does not create console reporter when enableDevLogs is false', () => {
    mockCreateConsoleReporter.mockClear();

    render(<WebVitalsReporter enableDevLogs={false} />);

    expect(mockCreateConsoleReporter).not.toHaveBeenCalled();
  });

  it('initializes only once (uses ref to prevent re-initialization)', () => {
    const { rerender } = render(<WebVitalsReporter />);

    const initialCallCount = mockStartPerformanceMonitoring.mock.calls.length;

    // Rerender with same props
    rerender(<WebVitalsReporter />);

    // Should not have been called again
    expect(mockStartPerformanceMonitoring.mock.calls.length).toBe(initialCallCount);
  });

  it('cleans up on unmount', () => {
    const mockCleanup = jest.fn();
    mockStartPerformanceMonitoring.mockReturnValue(mockCleanup);

    const { unmount } = render(<WebVitalsReporter />);
    unmount();

    expect(mockCleanup).toHaveBeenCalled();
  });
});
