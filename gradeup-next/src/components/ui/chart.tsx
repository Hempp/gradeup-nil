'use client';

import { forwardRef, type ReactNode, useState, useEffect, lazy, Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Lazy load ResponsiveContainer to avoid bundling recharts on pages that don't use charts
const ResponsiveContainer = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.ResponsiveContainer }))
);

// Design system chart colors
export const chartColors = {
  primary: 'var(--primary-500)',
  primaryDark: 'var(--primary-700)',
  primaryLight: 'var(--primary-100)',
  secondary: 'var(--secondary-700)',
  secondaryLight: 'var(--secondary-100)',
  success: 'var(--success-600)',
  warning: 'var(--warning-600)',
  error: 'var(--error-600)',
  info: 'var(--info-600)',
  // Extended palette for multi-series charts
  series: [
    'var(--primary-500)',
    'var(--secondary-700)',
    'var(--success-600)',
    'var(--info-600)',
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#f97316', // orange
    '#14b8a6', // teal
  ],
};

// Common tooltip styles matching design system
export const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'var(--surface-white)',
    border: '1px solid var(--surface-200)',
    borderRadius: 'var(--radius-lg)',
    color: 'var(--neutral-900)',
    boxShadow: 'var(--shadow-md)',
    padding: '12px 16px',
  },
  labelStyle: {
    color: 'var(--neutral-900)',
    fontWeight: 600,
    marginBottom: '4px',
  },
  itemStyle: {
    color: 'var(--neutral-600)',
    padding: '2px 0',
  },
};

// Common axis styles
export const axisStyle = {
  tick: {
    fill: 'var(--neutral-400)',
    fontSize: 12,
  },
  axisLine: {
    stroke: 'var(--surface-200)',
  },
  tickLine: false as const,
};

// Currency formatter for tooltips
export const formatCurrencyValue = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Compact number formatter for axis labels
export const formatAxisValue = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
};

// Number formatter without currency
export const formatNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

// Loading skeleton for lazy-loaded chart container
function ChartLoadingSkeleton() {
  return (
    <div
      className="w-full h-full flex items-end gap-2 p-4"
      role="status"
      aria-label="Loading chart"
    >
      {[45, 70, 35, 80, 55, 65].map((height, i) => (
        <div
          key={i}
          className="flex-1 bg-[var(--surface-100)] rounded-t animate-pulse"
          style={{ height: `${height}%` }}
          aria-hidden="true"
        />
      ))}
      <span className="sr-only">Loading chart...</span>
    </div>
  );
}

export interface ChartWrapperProps {
  title?: string;
  description?: string;
  children: ReactNode;
  height?: number;
  className?: string;
  headerAction?: ReactNode;
  loading?: boolean;
  /** Accessible label describing the chart data for screen readers */
  ariaLabel?: string;
  /** Detailed description of chart data for screen readers */
  ariaDescription?: string;
}

/**
 * Chart wrapper component that handles:
 * - SSR safety with client-side rendering check
 * - Responsive container with proper sizing
 * - Consistent card styling with design system
 * - Optional title, description, and header actions
 */
export const ChartWrapper = forwardRef<HTMLDivElement, ChartWrapperProps>(
  (
    {
      title,
      description,
      children,
      height = 300,
      className,
      headerAction,
      loading = false,
      ariaLabel,
      ariaDescription,
    },
    ref
  ) => {
    // Handle SSR - only render chart after hydration
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
      // Setting mounted state for hydration is a valid pattern
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsMounted(true);
    }, []);

    return (
      <Card ref={ref} className={cn('overflow-hidden', className)}>
        {(title || headerAction) && (
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                {title && <CardTitle>{title}</CardTitle>}
                {description && <CardDescription className="mt-1">{description}</CardDescription>}
              </div>
              {headerAction}
            </div>
          </CardHeader>
        )}
        <CardContent className={cn(!title && 'pt-6')}>
          <div
            style={{ height: `${height}px` }}
            className="w-full"
            role="img"
            aria-label={ariaLabel || title || 'Chart visualization'}
            aria-describedby={ariaDescription ? `chart-desc-${title?.replace(/\s+/g, '-').toLowerCase() || 'default'}` : undefined}
          >
            {ariaDescription && (
              <span
                id={`chart-desc-${title?.replace(/\s+/g, '-').toLowerCase() || 'default'}`}
                className="sr-only"
              >
                {ariaDescription}
              </span>
            )}
            {isMounted && !loading ? (
              <Suspense fallback={<ChartLoadingSkeleton />}>
                <ResponsiveContainer width="100%" height="100%">
                  {children as React.ReactElement}
                </ResponsiveContainer>
              </Suspense>
            ) : (
              // Loading skeleton
              <div
                className="w-full h-full flex items-end gap-2 p-4"
                role="status"
                aria-label="Loading chart data"
              >
                {[45, 70, 35, 80, 55, 65].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-[var(--surface-100)] rounded-t animate-pulse"
                    style={{ height: `${height}%` }}
                    aria-hidden="true"
                  />
                ))}
                <span className="sr-only">Loading chart...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

ChartWrapper.displayName = 'ChartWrapper';

// Time period selector for chart controls
export type TimePeriod = '3M' | '6M' | '1Y' | 'All';

interface TimePeriodSelectorProps {
  value: TimePeriod;
  onChange: (period: TimePeriod) => void;
  className?: string;
}

export function TimePeriodSelector({ value, onChange, className }: TimePeriodSelectorProps) {
  const periods: TimePeriod[] = ['3M', '6M', '1Y', 'All'];

  return (
    <div className={cn('flex gap-1 p-1 bg-[var(--surface-100)] rounded-[var(--radius-md)]', className)}>
      {periods.map((period) => (
        <button
          key={period}
          onClick={() => onChange(period)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] transition-all',
            value === period
              ? 'bg-[var(--surface-white)] text-[var(--primary-700)] shadow-sm'
              : 'text-[var(--neutral-600)] hover:text-[var(--neutral-900)]'
          )}
        >
          {period}
        </button>
      ))}
    </div>
  );
}

// Chart legend component
interface ChartLegendItem {
  name: string;
  color: string;
}

interface ChartLegendProps {
  items: ChartLegendItem[];
  className?: string;
}

export function ChartLegend({ items, className }: ChartLegendProps) {
  return (
    <div className={cn('flex items-center gap-4 flex-wrap', className)}>
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-[var(--neutral-600)]">{item.name}</span>
        </div>
      ))}
    </div>
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
