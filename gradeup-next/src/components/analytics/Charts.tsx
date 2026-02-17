'use client';

import { forwardRef, useState, useEffect, lazy, Suspense, type ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// LAZY LOAD RECHARTS COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// Lazy load all recharts components to avoid server-side rendering issues
const LineChart = lazy(() => import('recharts').then((mod) => ({ default: mod.LineChart })));
const BarChart = lazy(() => import('recharts').then((mod) => ({ default: mod.BarChart })));
const PieChart = lazy(() => import('recharts').then((mod) => ({ default: mod.PieChart })));
const AreaChart = lazy(() => import('recharts').then((mod) => ({ default: mod.AreaChart })));

const Line = lazy(() => import('recharts').then((mod) => ({ default: mod.Line })));
const Bar = lazy(() => import('recharts').then((mod) => ({ default: mod.Bar })));
const Pie = lazy(() => import('recharts').then((mod) => ({ default: mod.Pie })));
const Area = lazy(() => import('recharts').then((mod) => ({ default: mod.Area })));
const Cell = lazy(() => import('recharts').then((mod) => ({ default: mod.Cell })));

const XAxis = lazy(() => import('recharts').then((mod) => ({ default: mod.XAxis })));
const YAxis = lazy(() => import('recharts').then((mod) => ({ default: mod.YAxis })));
const CartesianGrid = lazy(() => import('recharts').then((mod) => ({ default: mod.CartesianGrid })));
const Tooltip = lazy(() => import('recharts').then((mod) => ({ default: mod.Tooltip })));
const Legend = lazy(() => import('recharts').then((mod) => ({ default: mod.Legend })));
const ResponsiveContainer = lazy(() => import('recharts').then((mod) => ({ default: mod.ResponsiveContainer })));

// ═══════════════════════════════════════════════════════════════════════════
// CHART STYLING
// ═══════════════════════════════════════════════════════════════════════════

export const chartColors = {
  primary: '#00B8D9',
  primaryLight: 'rgba(0, 184, 217, 0.1)',
  secondary: '#5243AA',
  secondaryLight: 'rgba(82, 67, 170, 0.1)',
  success: '#36B37E',
  warning: '#FFAB00',
  error: '#FF5630',
  info: '#0065FF',
  // Extended palette for multi-series
  series: [
    '#00B8D9', // Cyan
    '#5243AA', // Purple
    '#36B37E', // Green
    '#FFAB00', // Amber
    '#FF5630', // Red
    '#0065FF', // Blue
    '#FF7ED4', // Pink
    '#00875A', // Teal
  ],
};

export const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)',
    color: 'var(--text-primary)',
    boxShadow: 'var(--shadow-lg)',
    padding: '12px 16px',
    fontSize: '14px',
  },
  labelStyle: {
    color: 'var(--text-primary)',
    fontWeight: 600,
    marginBottom: '8px',
  },
  itemStyle: {
    color: 'var(--text-secondary)',
    padding: '2px 0',
  },
};

export const axisStyle = {
  tick: {
    fill: 'var(--text-muted)',
    fontSize: 12,
  },
  axisLine: {
    stroke: 'var(--border-color)',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// FORMATTERS
// ═══════════════════════════════════════════════════════════════════════════

export function formatCurrencyValue(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
}

export function formatCompactNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

// ═══════════════════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════════════════

function ChartLoadingSkeleton({ type = 'line' }: { type?: 'line' | 'bar' | 'pie' }) {
  if (type === 'pie') {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        role="status"
        aria-label="Loading chart"
      >
        <div
          className="w-48 h-48 rounded-full bg-[var(--surface-100)] animate-pulse"
          aria-hidden="true"
        />
        <span className="sr-only">Loading chart...</span>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full flex items-end gap-2 p-4"
      role="status"
      aria-label="Loading chart"
    >
      {type === 'bar' ? (
        [45, 70, 35, 80, 55, 65, 40, 75].map((height, i) => (
          <div
            key={i}
            className="flex-1 bg-[var(--surface-100)] rounded-t animate-pulse"
            style={{ height: `${height}%` }}
            aria-hidden="true"
          />
        ))
      ) : (
        <div
          className="w-full h-full bg-[var(--surface-100)] rounded animate-pulse"
          aria-hidden="true"
        />
      )}
      <span className="sr-only">Loading chart...</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CHART WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

export interface ChartWrapperProps {
  title?: string;
  description?: string;
  children: ReactNode;
  height?: number;
  className?: string;
  headerAction?: ReactNode;
  loading?: boolean;
  ariaLabel?: string;
  ariaDescription?: string;
}

export const ChartWrapper = forwardRef<HTMLDivElement, ChartWrapperProps>(
  ({
    title,
    description,
    children,
    height = 300,
    className,
    headerAction,
    loading = false,
    ariaLabel,
    ariaDescription,
  }, ref) => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
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
                {children}
              </Suspense>
            ) : (
              <ChartLoadingSkeleton />
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

ChartWrapper.displayName = 'ChartWrapper';

// ═══════════════════════════════════════════════════════════════════════════
// TIME PERIOD SELECTOR
// ═══════════════════════════════════════════════════════════════════════════

export type TimePeriod = '7d' | '30d' | '90d' | '12m' | 'all';

export interface TimePeriodSelectorProps {
  value: TimePeriod;
  onChange: (period: TimePeriod) => void;
  className?: string;
}

export function TimePeriodSelector({ value, onChange, className }: TimePeriodSelectorProps) {
  const periods: { value: TimePeriod; label: string }[] = [
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' },
    { value: '12m', label: '1Y' },
    { value: 'all', label: 'All' },
  ];

  return (
    <div
      className={cn(
        'flex gap-1 p-1 bg-[var(--bg-tertiary)] rounded-[var(--radius-md)]',
        className
      )}
      role="tablist"
      aria-label="Select time period"
    >
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          role="tab"
          aria-selected={value === period.value}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] transition-all',
            value === period.value
              ? 'bg-[var(--bg-card)] text-[var(--color-primary)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          )}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LINE TREND CHART
// ═══════════════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ChartDataItem = Record<string, any>;

export interface LineTrendChartProps {
  data: ChartDataItem[];
  dataKey: string;
  xAxisKey?: string;
  title?: string;
  description?: string;
  height?: number;
  color?: string;
  showGrid?: boolean;
  showArea?: boolean;
  valueFormatter?: (value: number) => string;
  headerAction?: ReactNode;
  className?: string;
}

export function LineTrendChart({
  data,
  dataKey,
  xAxisKey = 'date',
  title,
  description,
  height = 300,
  color = chartColors.primary,
  showGrid = true,
  showArea = true,
  valueFormatter = formatCompactNumber,
  headerAction,
  className,
}: LineTrendChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <ChartWrapper
      title={title}
      description={description}
      height={height}
      headerAction={headerAction}
      className={className}
      ariaLabel={`${title || 'Line chart'} showing ${dataKey} over time`}
    >
      {isMounted && (
        <Suspense fallback={<ChartLoadingSkeleton type="line" />}>
          <ResponsiveContainer width="100%" height="100%">
            {showArea ? (
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                {showGrid && (
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                )}
                <XAxis
                  dataKey={xAxisKey}
                  {...axisStyle}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-color)' }}
                />
                <YAxis
                  {...axisStyle}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={valueFormatter}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value) => [valueFormatter(Number(value)), dataKey]}
                />
                <defs>
                  <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey={dataKey}
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#gradient-${dataKey})`}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--bg-card)' }}
                />
              </AreaChart>
            ) : (
              <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                {showGrid && (
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                )}
                <XAxis
                  dataKey={xAxisKey}
                  {...axisStyle}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-color)' }}
                />
                <YAxis
                  {...axisStyle}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={valueFormatter}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value) => [valueFormatter(Number(value)), dataKey]}
                />
                <Line
                  type="monotone"
                  dataKey={dataKey}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--bg-card)' }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </Suspense>
      )}
    </ChartWrapper>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MULTI-LINE CHART
// ═══════════════════════════════════════════════════════════════════════════

export interface MultiLineChartProps {
  data: ChartDataItem[];
  lines: Array<{
    dataKey: string;
    name: string;
    color?: string;
  }>;
  xAxisKey?: string;
  title?: string;
  description?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  valueFormatter?: (value: number) => string;
  headerAction?: ReactNode;
  className?: string;
}

export function MultiLineChart({
  data,
  lines,
  xAxisKey = 'date',
  title,
  description,
  height = 300,
  showGrid = true,
  showLegend = true,
  valueFormatter = formatCompactNumber,
  headerAction,
  className,
}: MultiLineChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <ChartWrapper
      title={title}
      description={description}
      height={height}
      headerAction={headerAction}
      className={className}
    >
      {isMounted && (
        <Suspense fallback={<ChartLoadingSkeleton type="line" />}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              {showGrid && (
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              )}
              <XAxis
                dataKey={xAxisKey}
                {...axisStyle}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-color)' }}
              />
              <YAxis
                {...axisStyle}
                tickLine={false}
                axisLine={false}
                tickFormatter={valueFormatter}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value, name) => [valueFormatter(Number(value)), String(name)]}
              />
              {showLegend && (
                <Legend
                  wrapperStyle={{
                    paddingTop: '16px',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                  }}
                />
              )}
              {lines.map((line, index) => (
                <Line
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  name={line.name}
                  stroke={line.color || chartColors.series[index % chartColors.series.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--bg-card)' }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Suspense>
      )}
    </ChartWrapper>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BAR CHART
// ═══════════════════════════════════════════════════════════════════════════

export interface BarChartComponentProps {
  data: ChartDataItem[];
  dataKey: string;
  xAxisKey?: string;
  title?: string;
  description?: string;
  height?: number;
  color?: string;
  showGrid?: boolean;
  valueFormatter?: (value: number) => string;
  headerAction?: ReactNode;
  className?: string;
  layout?: 'horizontal' | 'vertical';
}

export function BarChartComponent({
  data,
  dataKey,
  xAxisKey = 'name',
  title,
  description,
  height = 300,
  color = chartColors.primary,
  showGrid = true,
  valueFormatter = formatCompactNumber,
  headerAction,
  className,
  layout = 'horizontal',
}: BarChartComponentProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <ChartWrapper
      title={title}
      description={description}
      height={height}
      headerAction={headerAction}
      className={className}
    >
      {isMounted && (
        <Suspense fallback={<ChartLoadingSkeleton type="bar" />}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout={layout === 'vertical' ? 'vertical' : 'horizontal'}
              margin={{ top: 10, right: 10, left: layout === 'vertical' ? 60 : 0, bottom: 0 }}
            >
              {showGrid && (
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-color)"
                  vertical={layout !== 'vertical'}
                  horizontal={layout === 'vertical'}
                />
              )}
              {layout === 'vertical' ? (
                <>
                  <XAxis type="number" {...axisStyle} tickLine={false} tickFormatter={valueFormatter} />
                  <YAxis
                    type="category"
                    dataKey={xAxisKey}
                    {...axisStyle}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                </>
              ) : (
                <>
                  <XAxis
                    dataKey={xAxisKey}
                    {...axisStyle}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border-color)' }}
                  />
                  <YAxis
                    {...axisStyle}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={valueFormatter}
                  />
                </>
              )}
              <Tooltip
                {...tooltipStyle}
                formatter={(value) => [valueFormatter(Number(value)), dataKey]}
              />
              <Bar
                dataKey={dataKey}
                fill={color}
                radius={layout === 'vertical' ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </Suspense>
      )}
    </ChartWrapper>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PIE / DONUT CHART
// ═══════════════════════════════════════════════════════════════════════════

export interface PieChartDataItem {
  name: string;
  value: number;
  color?: string;
}

export interface PieChartComponentProps {
  data: PieChartDataItem[];
  title?: string;
  description?: string;
  height?: number;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  valueFormatter?: (value: number) => string;
  headerAction?: ReactNode;
  className?: string;
}

export function PieChartComponent({
  data,
  title,
  description,
  height = 300,
  showLegend = true,
  innerRadius = 60,
  outerRadius = 100,
  valueFormatter = formatCompactNumber,
  headerAction,
  className,
}: PieChartComponentProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const dataWithColors = data.map((item, index) => ({
    ...item,
    color: item.color || chartColors.series[index % chartColors.series.length],
  }));

  return (
    <ChartWrapper
      title={title}
      description={description}
      height={height}
      headerAction={headerAction}
      className={className}
    >
      {isMounted && (
        <Suspense fallback={<ChartLoadingSkeleton type="pie" />}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <Pie
                data={dataWithColors}
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {dataWithColors.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                {...tooltipStyle}
                formatter={(value, name) => [valueFormatter(Number(value)), String(name)]}
              />
              {showLegend && (
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{
                    paddingTop: '16px',
                    fontSize: '12px',
                  }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </Suspense>
      )}
    </ChartWrapper>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CHART LEGEND
// ═══════════════════════════════════════════════════════════════════════════

export interface ChartLegendItem {
  name: string;
  color: string;
}

export interface ChartLegendProps {
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
          <span className="text-xs text-[var(--text-muted)]">{item.name}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export {
  ChartWrapper as AnalyticsChartWrapper,
  LineTrendChart as AnalyticsLineChart,
  MultiLineChart as AnalyticsMultiLineChart,
  BarChartComponent as AnalyticsBarChart,
  PieChartComponent as AnalyticsPieChart,
};
