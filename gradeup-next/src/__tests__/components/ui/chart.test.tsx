/**
 * Tests for chart utility components and functions
 * @module __tests__/components/ui/chart.test
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  chartColors,
  tooltipStyle,
  axisStyle,
  formatCurrencyValue,
  formatAxisValue,
  formatNumber,
  ChartWrapper,
  ChartLegend,
} from '@/components/ui/chart';

describe('chart utilities', () => {
  describe('chartColors', () => {
    it('has primary colors defined', () => {
      expect(chartColors.primary).toBeDefined();
      expect(chartColors.primaryDark).toBeDefined();
      expect(chartColors.primaryLight).toBeDefined();
    });

    it('has secondary colors defined', () => {
      expect(chartColors.secondary).toBeDefined();
      expect(chartColors.secondaryLight).toBeDefined();
    });

    it('has semantic colors defined', () => {
      expect(chartColors.success).toBeDefined();
      expect(chartColors.warning).toBeDefined();
      expect(chartColors.error).toBeDefined();
      expect(chartColors.info).toBeDefined();
    });

    it('has series colors for multi-series charts', () => {
      expect(Array.isArray(chartColors.series)).toBe(true);
      expect(chartColors.series.length).toBeGreaterThan(0);
    });
  });

  describe('tooltipStyle', () => {
    it('has content style defined', () => {
      expect(tooltipStyle.contentStyle).toBeDefined();
      expect(tooltipStyle.contentStyle.backgroundColor).toBeDefined();
      expect(tooltipStyle.contentStyle.borderRadius).toBeDefined();
    });

    it('has label style defined', () => {
      expect(tooltipStyle.labelStyle).toBeDefined();
      expect(tooltipStyle.labelStyle.fontWeight).toBe(600);
    });

    it('has item style defined', () => {
      expect(tooltipStyle.itemStyle).toBeDefined();
    });
  });

  describe('axisStyle', () => {
    it('has tick style defined', () => {
      expect(axisStyle.tick).toBeDefined();
      expect(axisStyle.tick.fontSize).toBe(12);
    });

    it('has axis line style defined', () => {
      expect(axisStyle.axisLine).toBeDefined();
      expect(axisStyle.axisLine.stroke).toBeDefined();
    });

    it('has tickLine set to false', () => {
      expect(axisStyle.tickLine).toBe(false);
    });
  });

  describe('formatCurrencyValue', () => {
    it('formats positive amounts correctly', () => {
      expect(formatCurrencyValue(1000)).toBe('$1,000');
      expect(formatCurrencyValue(50000)).toBe('$50,000');
      expect(formatCurrencyValue(1000000)).toBe('$1,000,000');
    });

    it('formats zero correctly', () => {
      expect(formatCurrencyValue(0)).toBe('$0');
    });

    it('formats small amounts correctly', () => {
      expect(formatCurrencyValue(99)).toBe('$99');
      expect(formatCurrencyValue(1)).toBe('$1');
    });
  });

  describe('formatAxisValue', () => {
    it('formats millions with M suffix', () => {
      expect(formatAxisValue(1000000)).toBe('$1.0M');
      expect(formatAxisValue(2500000)).toBe('$2.5M');
    });

    it('formats thousands with K suffix', () => {
      expect(formatAxisValue(1000)).toBe('$1K');
      expect(formatAxisValue(50000)).toBe('$50K');
    });

    it('formats small values without suffix', () => {
      expect(formatAxisValue(500)).toBe('$500');
      expect(formatAxisValue(0)).toBe('$0');
    });
  });

  describe('formatNumber', () => {
    it('formats millions with M suffix', () => {
      expect(formatNumber(1000000)).toBe('1.0M');
      expect(formatNumber(2500000)).toBe('2.5M');
    });

    it('formats thousands with K suffix', () => {
      expect(formatNumber(1000)).toBe('1.0K');
      expect(formatNumber(5500)).toBe('5.5K');
    });

    it('formats small values as is', () => {
      expect(formatNumber(500)).toBe('500');
      expect(formatNumber(0)).toBe('0');
    });
  });
});

describe('ChartWrapper', () => {
  it('renders with title', () => {
    render(
      <ChartWrapper title="Test Chart">
        <div>Chart content</div>
      </ChartWrapper>
    );

    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });

  it('renders with title and description', () => {
    render(
      <ChartWrapper title="Test Chart" description="Chart description">
        <div>Chart content</div>
      </ChartWrapper>
    );

    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    expect(screen.getByText('Chart description')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ChartWrapper className="custom-class">
        <div>Chart content</div>
      </ChartWrapper>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows loading state initially', () => {
    render(
      <ChartWrapper loading={true}>
        <div>Chart content</div>
      </ChartWrapper>
    );

    // Should show loading skeleton
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('ChartLegend', () => {
  it('renders with items', () => {
    const items = [
      { name: 'Series 1', color: '#ff0000' },
      { name: 'Series 2', color: '#00ff00' },
    ];
    render(<ChartLegend items={items} />);

    expect(screen.getByText('Series 1')).toBeInTheDocument();
    expect(screen.getByText('Series 2')).toBeInTheDocument();
  });

  it('applies color to indicator', () => {
    const items = [{ name: 'Test', color: '#ff0000' }];
    const { container } = render(<ChartLegend items={items} />);

    const indicator = container.querySelector('[style*="background"]');
    expect(indicator).toBeInTheDocument();
  });

  it('renders multiple items', () => {
    const items = [
      { name: 'Item 1', color: '#ff0000' },
      { name: 'Item 2', color: '#00ff00' },
      { name: 'Item 3', color: '#0000ff' },
    ];
    render(<ChartLegend items={items} />);

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });
});
