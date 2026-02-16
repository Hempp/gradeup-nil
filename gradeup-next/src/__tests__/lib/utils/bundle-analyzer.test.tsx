/**
 * Tests for bundle-analyzer utilities
 * @module __tests__/lib/utils/bundle-analyzer.test
 */

import React from 'react';
import { render, renderHook } from '@testing-library/react';
import {
  useRenderTiming,
  useRenderCount,
  useWhyDidYouRender,
  useProfileCallback,
  withRenderTiming,
  getAllRenderTimings,
  getRenderTiming,
  clearRenderTimings,
  getSlowComponents,
  type RenderTiming,
} from '@/lib/utils/bundle-analyzer';

describe('getAllRenderTimings', () => {
  beforeEach(() => {
    clearRenderTimings();
  });

  it('returns a Map', () => {
    const timings = getAllRenderTimings();
    expect(timings instanceof Map).toBe(true);
  });

  it('starts empty after clearing', () => {
    const timings = getAllRenderTimings();
    expect(timings.size).toBe(0);
  });
});

describe('getRenderTiming', () => {
  beforeEach(() => {
    clearRenderTimings();
  });

  it('returns undefined for non-existent component', () => {
    const timing = getRenderTiming('NonExistentComponent');
    expect(timing).toBeUndefined();
  });
});

describe('clearRenderTimings', () => {
  it('clears all timings', () => {
    clearRenderTimings();
    const timings = getAllRenderTimings();
    expect(timings.size).toBe(0);
  });
});

describe('getSlowComponents', () => {
  beforeEach(() => {
    clearRenderTimings();
  });

  it('returns empty array when no timings', () => {
    const slow = getSlowComponents();
    expect(slow).toEqual([]);
  });

  it('accepts custom threshold', () => {
    const slow = getSlowComponents(100);
    expect(Array.isArray(slow)).toBe(true);
  });
});

describe('useRenderTiming', () => {
  beforeEach(() => {
    clearRenderTimings();
  });

  it('does not throw when used in component', () => {
    function TestComponent() {
      useRenderTiming({ componentName: 'TestComponent' });
      return <div>Test</div>;
    }

    expect(() => render(<TestComponent />)).not.toThrow();
  });

  it('accepts options', () => {
    function TestComponent() {
      useRenderTiming({
        componentName: 'TestWithOptions',
        logRenders: false,
        warnThreshold: 32,
      });
      return <div>Test</div>;
    }

    expect(() => render(<TestComponent />)).not.toThrow();
  });

  it('uses default component name when not provided', () => {
    function TestComponent() {
      useRenderTiming();
      return <div>Test</div>;
    }

    expect(() => render(<TestComponent />)).not.toThrow();
  });
});

describe('useRenderCount', () => {
  it('returns a number', () => {
    const { result } = renderHook(() => useRenderCount('TestComponent'));

    expect(typeof result.current).toBe('number');
  });

  it('works without component name', () => {
    const { result } = renderHook(() => useRenderCount());

    expect(typeof result.current).toBe('number');
  });
});

describe('useWhyDidYouRender', () => {
  it('does not throw on first render', () => {
    function TestComponent({ value }: { value: string }) {
      useWhyDidYouRender('TestComponent', { value });
      return <div>{value}</div>;
    }

    expect(() => render(<TestComponent value="test" />)).not.toThrow();
  });

  it('does not throw on re-render', () => {
    function TestComponent({ value }: { value: string }) {
      useWhyDidYouRender('TestComponent', { value });
      return <div>{value}</div>;
    }

    const { rerender } = render(<TestComponent value="test" />);

    expect(() => rerender(<TestComponent value="updated" />)).not.toThrow();
  });
});

describe('useProfileCallback', () => {
  it('returns a function', () => {
    const { result } = renderHook(() =>
      useProfileCallback(() => 'result', 'testCallback')
    );

    expect(typeof result.current).toBe('function');
  });

  it('executes the callback', () => {
    const callback = jest.fn().mockReturnValue('result');
    const { result } = renderHook(() =>
      useProfileCallback(callback, 'testCallback')
    );

    const returnValue = result.current();

    expect(callback).toHaveBeenCalled();
    expect(returnValue).toBe('result');
  });

  it('passes arguments to callback', () => {
    const callback = jest.fn((a: unknown, b: unknown) => `${a}-${b}`);
    const { result } = renderHook(() =>
      useProfileCallback(callback, 'testCallback')
    );

    result.current('test', 42);

    expect(callback).toHaveBeenCalledWith('test', 42);
  });

  it('handles async callbacks', async () => {
    const callback = jest.fn().mockResolvedValue('async result');
    const { result } = renderHook(() =>
      useProfileCallback(callback, 'asyncCallback')
    );

    const returnValue = await result.current();

    expect(returnValue).toBe('async result');
  });
});

describe('withRenderTiming HOC', () => {
  beforeEach(() => {
    clearRenderTimings();
  });

  it('wraps component', () => {
    function OriginalComponent({ text }: { text: string }) {
      return <div>{text}</div>;
    }

    const WrappedComponent = withRenderTiming(OriginalComponent, 'OriginalComponent');

    const { getByText } = render(<WrappedComponent text="Hello" />);

    expect(getByText('Hello')).toBeInTheDocument();
  });

  it('uses component displayName when name not provided', () => {
    function MyComponent({ text }: { text: string }) {
      return <div>{text}</div>;
    }
    MyComponent.displayName = 'MyDisplayName';

    const WrappedComponent = withRenderTiming(MyComponent);

    const { getByText } = render(<WrappedComponent text="Hello" />);

    expect(getByText('Hello')).toBeInTheDocument();
  });
});

describe('RenderTiming type', () => {
  it('has correct structure', () => {
    const timing: RenderTiming = {
      componentName: 'TestComponent',
      renderCount: 5,
      lastRenderTime: 10,
      totalRenderTime: 50,
      averageRenderTime: 10,
      minRenderTime: 5,
      maxRenderTime: 15,
      timestamps: [100, 200, 300],
    };

    expect(timing.componentName).toBe('TestComponent');
    expect(timing.renderCount).toBe(5);
    expect(timing.averageRenderTime).toBe(10);
    expect(timing.timestamps.length).toBe(3);
  });
});
