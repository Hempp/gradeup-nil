'use client';

import { useMemo } from 'react';
import {
  LazyBarChart as BarChart,
  LazyAreaChart as AreaChart,
} from '@/components/ui/lazy-chart';
import { Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChartWrapper,
  ChartLegend,
  chartColors,
  tooltipStyle,
  axisStyle,
} from '@/components/ui/chart';
import {
  Activity,
  Zap,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Timer,
  Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  WebVitalsAggregated,
  MetricStats,
  PageLoadStats,
  ApiEndpointStats,
  TimeSeriesDataPoint,
  ErrorStats,
} from '@/lib/services/performance';
import { WEB_VITAL_THRESHOLDS } from '@/lib/services/performance';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface WebVitalsCardProps {
  webVitals: WebVitalsAggregated;
}

interface PageLoadChartProps {
  data: PageLoadStats[];
}

interface ApiPerformanceTableProps {
  endpoints: ApiEndpointStats[];
}

interface ErrorTrendChartProps {
  data: TimeSeriesDataPoint[];
  totalErrors: number;
  errorRate: number;
}

interface ErrorBreakdownProps {
  stats: ErrorStats;
}

interface PerformanceScoreProps {
  score: number;
  webVitals: WebVitalsAggregated;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

function getRatingColor(rating: 'good' | 'needs-improvement' | 'poor'): string {
  switch (rating) {
    case 'good':
      return 'var(--color-success)';
    case 'needs-improvement':
      return 'var(--color-warning)';
    case 'poor':
      return 'var(--color-error)';
  }
}

function _getRatingBgColor(rating: 'good' | 'needs-improvement' | 'poor'): string {
  switch (rating) {
    case 'good':
      return 'bg-[var(--color-success)]/10';
    case 'needs-improvement':
      return 'bg-[var(--color-warning)]/10';
    case 'poor':
      return 'bg-[var(--color-error)]/10';
  }
}

function formatMetricValue(name: string, value: number): string {
  if (name === 'CLS') {
    return value.toFixed(3);
  }
  return `${Math.round(value)}ms`;
}

function getMetricRating(
  name: keyof typeof WEB_VITAL_THRESHOLDS,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = WEB_VITAL_THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Web Vitals Card Component
// ═══════════════════════════════════════════════════════════════════════════

interface WebVitalItemProps {
  name: string;
  stats: MetricStats;
  threshold: { good: number; poor: number; unit: string };
}

function WebVitalItem({ name, stats, threshold }: WebVitalItemProps) {
  const rating = getMetricRating(name as keyof typeof WEB_VITAL_THRESHOLDS, stats.average);
  const ratingColor = getRatingColor(rating);
  const trendIsPositive = stats.trend < 0; // Lower is better for all metrics

  return (
    <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{name}</span>
          <Badge
            variant="outline"
            className={cn(
              'text-xs capitalize',
              rating === 'good' && 'border-[var(--color-success)] text-[var(--color-success)]',
              rating === 'needs-improvement' &&
                'border-[var(--color-warning)] text-[var(--color-warning)]',
              rating === 'poor' && 'border-[var(--color-error)] text-[var(--color-error)]'
            )}
          >
            {rating.replace('-', ' ')}
          </Badge>
        </div>
        {stats.trend !== 0 && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs',
              trendIsPositive ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
            )}
          >
            {trendIsPositive ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <TrendingUp className="h-3 w-3" />
            )}
            <span>{Math.abs(stats.trend).toFixed(1)}%</span>
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className="text-2xl font-bold"
          style={{ color: ratingColor }}
        >
          {formatMetricValue(name, stats.average)}
        </span>
        <span className="text-xs text-[var(--text-muted)]">avg</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-[var(--text-muted)]">p75: </span>
          <span className="text-[var(--text-secondary)] font-medium">
            {formatMetricValue(name, stats.p75)}
          </span>
        </div>
        <div>
          <span className="text-[var(--text-muted)]">p95: </span>
          <span className="text-[var(--text-secondary)] font-medium">
            {formatMetricValue(name, stats.p95)}
          </span>
        </div>
      </div>

      {/* Rating Distribution Bar */}
      <div className="space-y-1">
        <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
          <div
            className="bg-[var(--color-success)] transition-all"
            style={{ width: `${stats.goodPercentage}%` }}
          />
          <div
            className="bg-[var(--color-warning)] transition-all"
            style={{ width: `${stats.needsImprovementPercentage}%` }}
          />
          <div
            className="bg-[var(--color-error)] transition-all"
            style={{ width: `${stats.poorPercentage}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
          <span>Good: {stats.goodPercentage.toFixed(0)}%</span>
          <span>Needs Work: {stats.needsImprovementPercentage.toFixed(0)}%</span>
          <span>Poor: {stats.poorPercentage.toFixed(0)}%</span>
        </div>
      </div>

      {/* Threshold Guide */}
      <div className="text-[10px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-color)]">
        Good: &le;{threshold.good}
        {threshold.unit} | Poor: &gt;{threshold.poor}
        {threshold.unit}
      </div>
    </div>
  );
}

export function WebVitalsCard({ webVitals }: WebVitalsCardProps) {
  const vitals = [
    { name: 'LCP', label: 'Largest Contentful Paint', icon: Timer },
    { name: 'FID', label: 'First Input Delay', icon: Zap },
    { name: 'CLS', label: 'Cumulative Layout Shift', icon: Activity },
    { name: 'TTFB', label: 'Time to First Byte', icon: Clock },
    { name: 'INP', label: 'Interaction to Next Paint', icon: Gauge },
  ] as const;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Core Web Vitals</CardTitle>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Real-time performance metrics based on user experience
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {webVitals.LCP.count} samples
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {vitals.map(({ name }) => (
            <WebVitalItem
              key={name}
              name={name}
              stats={webVitals[name]}
              threshold={WEB_VITAL_THRESHOLDS[name]}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Performance Score Component
// ═══════════════════════════════════════════════════════════════════════════

export function PerformanceScoreCard({ score, webVitals }: PerformanceScoreProps) {
  const getScoreColor = (s: number) => {
    if (s >= 90) return 'var(--color-success)';
    if (s >= 50) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 90) return 'Excellent';
    if (s >= 70) return 'Good';
    if (s >= 50) return 'Needs Improvement';
    return 'Poor';
  };

  const scoreColor = getScoreColor(score);

  // Calculate individual vital scores for the breakdown
  const vitalScores = Object.entries(webVitals).map(([name, stats]) => ({
    name,
    score: stats.goodPercentage,
  }));

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-6">
          {/* Score Circle */}
          <div className="relative">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="var(--surface-200)"
                strokeWidth="8"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke={scoreColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 351.86} 351.86`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="text-3xl font-bold"
                style={{ color: scoreColor }}
              >
                {score}
              </span>
              <span className="text-xs text-[var(--text-muted)]">/ 100</span>
            </div>
          </div>

          {/* Score Details */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Performance Score
            </h3>
            <p
              className="text-sm font-medium mt-1"
              style={{ color: scoreColor }}
            >
              {getScoreLabel(score)}
            </p>
            <div className="mt-3 space-y-2">
              {vitalScores.map(({ name, score: vitalScore }) => (
                <div key={name} className="flex items-center gap-2 text-xs">
                  <span className="w-10 text-[var(--text-muted)]">{name}</span>
                  <div className="flex-1 h-1.5 bg-[var(--surface-100)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${vitalScore}%`,
                        backgroundColor: getScoreColor(vitalScore),
                      }}
                    />
                  </div>
                  <span className="w-8 text-right text-[var(--text-secondary)]">
                    {vitalScore.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Page Load Time Chart
// ═══════════════════════════════════════════════════════════════════════════

export function PageLoadTimeChart({ data }: PageLoadChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      route: item.route.replace(/^\//, '').replace(/\//g, ' / ') || 'Home',
    }));
  }, [data]);

  return (
    <ChartWrapper
      title="Page Load Times"
      description="Average load time by route"
      height={320}
      headerAction={
        <ChartLegend
          items={[
            { name: 'Average', color: chartColors.primary },
            { name: 'p75', color: chartColors.secondary },
          ]}
        />
      }
    >
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 120, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--surface-200)"
          horizontal={true}
          vertical={false}
        />
        <XAxis
          type="number"
          tick={axisStyle.tick}
          axisLine={axisStyle.axisLine}
          tickLine={axisStyle.tickLine}
          tickFormatter={(value) => formatDuration(value)}
        />
        <YAxis
          type="category"
          dataKey="route"
          tick={axisStyle.tick}
          axisLine={false}
          tickLine={axisStyle.tickLine}
          width={110}
        />
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          labelStyle={tooltipStyle.labelStyle}
          formatter={(value, name) => {
            const label = name === 'avgLoadTime' ? 'Average' : String(name);
            return [formatDuration(value as number), label];
          }}
        />
        <Bar dataKey="avgLoadTime" name="Average" fill={chartColors.primary} radius={[0, 4, 4, 0]} />
        <Bar dataKey="p75LoadTime" name="p75" fill={chartColors.secondary} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartWrapper>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Slowest Pages Table
// ═══════════════════════════════════════════════════════════════════════════

export function SlowestPagesTable({ data }: PageLoadChartProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[var(--color-warning)]" />
              Slowest Pages
            </CardTitle>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Pages that need performance optimization
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  Route
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  Avg Load
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  p95 Load
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  Requests
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 5).map((page) => {
                const status =
                  page.avgLoadTime < 2000
                    ? 'good'
                    : page.avgLoadTime < 4000
                    ? 'needs-improvement'
                    : 'poor';
                return (
                  <tr
                    key={page.route}
                    className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="font-medium text-[var(--text-primary)]">
                        {page.route || '/'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className="font-semibold"
                        style={{ color: getRatingColor(status) }}
                      >
                        {formatDuration(page.avgLoadTime)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--text-secondary)]">
                      {formatDuration(page.p95LoadTime)}
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--text-secondary)]">
                      {page.count.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs capitalize',
                          status === 'good' &&
                            'border-[var(--color-success)] text-[var(--color-success)]',
                          status === 'needs-improvement' &&
                            'border-[var(--color-warning)] text-[var(--color-warning)]',
                          status === 'poor' &&
                            'border-[var(--color-error)] text-[var(--color-error)]'
                        )}
                      >
                        {status === 'needs-improvement' ? 'Slow' : status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// API Performance Table
// ═══════════════════════════════════════════════════════════════════════════

export function ApiPerformanceTable({ endpoints }: ApiPerformanceTableProps) {
  const sortedEndpoints = useMemo(() => {
    return [...endpoints].sort((a, b) => b.avgResponseTime - a.avgResponseTime);
  }, [endpoints]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>API Endpoint Performance</CardTitle>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Response times and success rates by endpoint
            </p>
          </div>
          <Badge variant="outline">{endpoints.length} endpoints</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  Endpoint
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  Method
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  Avg Response
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  p95
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  Success Rate
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  Requests
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedEndpoints.map((endpoint) => {
                const isSlowEndpoint = endpoint.avgResponseTime > 500;
                const hasLowSuccessRate = endpoint.successRate < 99;

                return (
                  <tr
                    key={`${endpoint.method}:${endpoint.endpoint}`}
                    className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm text-[var(--text-primary)]">
                        {endpoint.endpoint}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs font-mono',
                          endpoint.method === 'GET' && 'text-[var(--color-success)]',
                          endpoint.method === 'POST' && 'text-[var(--color-primary)]',
                          endpoint.method === 'PATCH' && 'text-[var(--color-warning)]',
                          endpoint.method === 'DELETE' && 'text-[var(--color-error)]'
                        )}
                      >
                        {endpoint.method}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={cn(
                          'font-medium',
                          isSlowEndpoint
                            ? 'text-[var(--color-warning)]'
                            : 'text-[var(--text-primary)]'
                        )}
                      >
                        {formatDuration(endpoint.avgResponseTime)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--text-secondary)]">
                      {formatDuration(endpoint.p95ResponseTime)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {hasLowSuccessRate ? (
                          <XCircle className="h-4 w-4 text-[var(--color-error)]" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
                        )}
                        <span
                          className={cn(
                            'font-medium',
                            hasLowSuccessRate
                              ? 'text-[var(--color-error)]'
                              : 'text-[var(--color-success)]'
                          )}
                        >
                          {endpoint.successRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--text-secondary)]">
                      {endpoint.requestCount.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Error Trend Chart
// ═══════════════════════════════════════════════════════════════════════════

export function ErrorTrendChart({ data, totalErrors, errorRate }: ErrorTrendChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      time: new Date(item.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));
  }, [data]);

  return (
    <ChartWrapper
      title="Error Rate Over Time"
      description={`${totalErrors} total errors | ${errorRate.toFixed(1)} per 1,000 requests`}
      height={250}
    >
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColors.error} stopOpacity={0.3} />
            <stop offset="95%" stopColor={chartColors.error} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-200)" vertical={false} />
        <XAxis
          dataKey="time"
          tick={axisStyle.tick}
          axisLine={axisStyle.axisLine}
          tickLine={axisStyle.tickLine}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={axisStyle.tick}
          axisLine={false}
          tickLine={axisStyle.tickLine}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          labelStyle={tooltipStyle.labelStyle}
          formatter={(value) => [value as number, 'Errors']}
        />
        <Area
          type="monotone"
          dataKey="value"
          name="Errors"
          stroke={chartColors.error}
          strokeWidth={2}
          fill="url(#errorGradient)"
        />
      </AreaChart>
    </ChartWrapper>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Error Breakdown Component
// ═══════════════════════════════════════════════════════════════════════════

export function ErrorBreakdown({ stats }: ErrorBreakdownProps) {
  const errorTypeColors: Record<string, string> = {
    javascript: chartColors.primary,
    api: chartColors.secondary,
    network: chartColors.warning,
    other: chartColors.info,
  };

  const totalByType = Object.values(stats.errorsByType).reduce((sum, count) => sum + count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-[var(--color-error)]" />
          Error Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Types Distribution */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-[var(--text-primary)]">By Type</h4>
          {Object.entries(stats.errorsByType).map(([type, count]) => {
            const percentage = totalByType > 0 ? (count / totalByType) * 100 : 0;
            return (
              <div key={type} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize text-[var(--text-secondary)]">{type}</span>
                  <span className="font-medium text-[var(--text-primary)]">{count}</span>
                </div>
                <div className="h-2 bg-[var(--surface-100)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: errorTypeColors[type] || chartColors.info,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Top Errors */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-[var(--text-primary)]">Top Errors</h4>
          <div className="space-y-2">
            {stats.topErrors.map((error, index) => (
              <div
                key={index}
                className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] space-y-1"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {error.count} occurrences
                  </Badge>
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(error.lastOccurred).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-primary)] font-mono truncate">
                  {error.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Session Stats Card
// ═══════════════════════════════════════════════════════════════════════════

interface SessionStatsProps {
  stats: {
    totalSessions: number;
    avgDuration: number;
    avgPageViews: number;
    bounceRate: number;
  };
}

export function SessionStatsCard({ stats }: SessionStatsProps) {
  const formatSessionDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m ${seconds}s`;
  };

  const statItems = [
    {
      label: 'Total Sessions',
      value: stats.totalSessions.toLocaleString(),
      icon: Activity,
    },
    {
      label: 'Avg Duration',
      value: formatSessionDuration(stats.avgDuration),
      icon: Clock,
    },
    {
      label: 'Avg Page Views',
      value: stats.avgPageViews.toFixed(1),
      icon: Activity,
    },
    {
      label: 'Bounce Rate',
      value: `${stats.bounceRate.toFixed(1)}%`,
      icon: TrendingDown,
      isNegative: stats.bounceRate > 50,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Session Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statItems.map((item) => (
            <div
              key={item.label}
              className="p-4 rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)] text-center"
            >
              <div className="flex justify-center mb-2">
                <item.icon
                  className={cn(
                    'h-5 w-5',
                    item.isNegative
                      ? 'text-[var(--color-error)]'
                      : 'text-[var(--color-primary)]'
                  )}
                />
              </div>
              <p
                className={cn(
                  'text-xl font-bold',
                  item.isNegative
                    ? 'text-[var(--color-error)]'
                    : 'text-[var(--text-primary)]'
                )}
              >
                {item.value}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
