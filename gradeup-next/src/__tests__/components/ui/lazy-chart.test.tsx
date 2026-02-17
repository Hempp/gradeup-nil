/**
 * Tests for lazy-loaded chart components
 * @module __tests__/components/ui/lazy-chart.test
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock next/dynamic
jest.mock('next/dynamic', () => {
  return jest.fn().mockImplementation((loader, options) => {
    // Return a simple component that shows the loading state
    const MockComponent = (props: Record<string, unknown>) => {
      // If we want to test the loading state, return the loading component
      if (options?.loading) {
        return options.loading();
      }
      return <div data-testid="mock-chart" {...props} />;
    };
    return MockComponent;
  });
});

import {
  LazyLineChart,
  LazyBarChart,
  LazyAreaChart,
  LazyPieChart,
  ChartLoadingPlaceholder,
} from '@/components/ui/lazy-chart';

describe('ChartLoadingPlaceholder', () => {
  it('renders with default height', () => {
    render(<ChartLoadingPlaceholder />);

    const placeholder = screen.getByRole('status');
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toHaveAttribute('aria-label', 'Loading chart');
    expect(placeholder).toHaveStyle({ height: '300px' });
  });

  it('renders with custom height', () => {
    render(<ChartLoadingPlaceholder height={400} />);

    const placeholder = screen.getByRole('status');
    expect(placeholder).toHaveStyle({ height: '400px' });
  });

  it('has accessible loading text', () => {
    render(<ChartLoadingPlaceholder />);

    expect(screen.getByText('Loading chart data...')).toBeInTheDocument();
  });

  it('renders skeleton inside placeholder', () => {
    const { container } = render(<ChartLoadingPlaceholder />);

    // Skeleton should be present with aria-hidden
    const skeleton = container.querySelector('[aria-hidden="true"]');
    expect(skeleton).toBeInTheDocument();
  });
});

describe('LazyLineChart', () => {
  it('renders loading state initially', () => {
    render(<LazyLineChart data={[]} />);

    // The mock returns the loading component
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('LazyBarChart', () => {
  it('renders loading state initially', () => {
    render(<LazyBarChart data={[]} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('LazyAreaChart', () => {
  it('renders loading state initially', () => {
    render(<LazyAreaChart data={[]} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('LazyPieChart', () => {
  it('renders loading state initially', () => {
    render(<LazyPieChart data={[]} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('uses smaller height for pie chart loading state', () => {
    render(<LazyPieChart data={[]} />);

    const placeholder = screen.getByRole('status');
    expect(placeholder).toHaveStyle({ height: '200px' });
  });
});

describe('lazy-chart exports', () => {
  it('exports ChartLoadingPlaceholder', () => {
    expect(ChartLoadingPlaceholder).toBeDefined();
    expect(typeof ChartLoadingPlaceholder).toBe('function');
  });

  it('exports LazyLineChart', () => {
    expect(LazyLineChart).toBeDefined();
  });

  it('exports LazyBarChart', () => {
    expect(LazyBarChart).toBeDefined();
  });

  it('exports LazyAreaChart', () => {
    expect(LazyAreaChart).toBeDefined();
  });

  it('exports LazyPieChart', () => {
    expect(LazyPieChart).toBeDefined();
  });
});
