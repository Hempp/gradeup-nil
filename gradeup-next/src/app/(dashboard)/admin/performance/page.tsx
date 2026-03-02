'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity,
  RefreshCw,
  Download,
  Calendar,
  ChevronDown,
  Zap,
  Clock,
  AlertTriangle,
  Users,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WebVitalsCard,
  PerformanceScoreCard,
  PageLoadTimeChart,
  SlowestPagesTable,
  ApiPerformanceTable,
  ErrorTrendChart,
  ErrorBreakdown,
  SessionStatsCard,
} from '@/components/admin/PerformanceCharts';
import {
  generateMockPerformanceData,
  getOverallPerformanceScore,
  type PerformanceDashboardData,
} from '@/lib/services/performance';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: '1h', label: 'Last Hour' },
  { value: '6h', label: 'Last 6 Hours' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
];

// ═══════════════════════════════════════════════════════════════════════════
// Skeleton Components
// ═══════════════════════════════════════════════════════════════════════════

function MetricCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WebVitalsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 rounded-lg bg-[var(--bg-tertiary)] space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-8 w-24" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ title: _title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <div className="h-[280px] flex items-end gap-2 p-4">
          {[65, 85, 45, 75, 55, 90, 70].map((height, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4 border-b border-[var(--border-color)] pb-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20 ml-auto" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-16 ml-auto" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Time Range Selector Component
// ═══════════════════════════════════════════════════════════════════════════

function TimeRangeSelector({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = timeRangeOptions.find((opt) => opt.value === value);

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="min-w-[160px] justify-between"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>{selectedOption?.label}</span>
        </div>
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </Button>
      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-md)] shadow-lg z-50 py-1 animate-fade-in">
          {timeRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={cn(
                'w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] transition-colors',
                value === option.value
                  ? 'text-[var(--color-primary)] font-medium bg-[var(--color-primary)]/5'
                  : 'text-[var(--text-primary)]'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Summary Stat Card
// ═══════════════════════════════════════════════════════════════════════════

function SummaryStatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  status,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  trendLabel?: string;
  status?: 'good' | 'warning' | 'error';
}) {
  const statusColors = {
    good: 'text-[var(--color-success)]',
    warning: 'text-[var(--color-warning)]',
    error: 'text-[var(--color-error)]',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-[var(--text-muted)] mb-1">{label}</p>
            <p
              className={cn(
                'text-2xl font-bold',
                status ? statusColors[status] : 'text-[var(--text-primary)]'
              )}
            >
              {value}
            </p>
            {trend !== undefined && (
              <div
                className={cn(
                  'flex items-center gap-1 mt-2 text-xs',
                  trend >= 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'
                )}
              >
                <TrendingUp
                  className={cn('h-3 w-3', trend < 0 && 'rotate-180')}
                />
                <span>{Math.abs(trend).toFixed(1)}%</span>
                {trendLabel && (
                  <span className="text-[var(--text-muted)] ml-1">{trendLabel}</span>
                )}
              </div>
            )}
          </div>
          <div
            className={cn(
              'h-12 w-12 rounded-[var(--radius-lg)] flex items-center justify-center',
              status === 'good' && 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
              status === 'warning' && 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
              status === 'error' && 'bg-[var(--color-error)]/10 text-[var(--color-error)]',
              !status && 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Dashboard Component
// ═══════════════════════════════════════════════════════════════════════════

export default function PerformanceDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [data, setData] = useState<PerformanceDashboardData | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch performance data
  const fetchData = async (showRefreshState = true) => {
    if (showRefreshState) setIsRefreshing(true);

    // Simulate API call - in production, this would fetch real data
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Generate mock data for demonstration
    const mockData = generateMockPerformanceData();
    setData(mockData);
    setLastRefresh(new Date());

    if (showRefreshState) setIsRefreshing(false);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData(false);

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchData(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [timeRange]);

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleExport = () => {
    // In production, this would export a PDF or CSV report
    console.log('Exporting performance report...');
    alert('Export functionality would generate a detailed performance report.');
  };

  // Calculate performance score
  const performanceScore = useMemo(() => {
    if (!data) return 0;
    return getOverallPerformanceScore(data.webVitals);
  }, [data]);

  // Determine overall status
  const getOverallStatus = () => {
    if (performanceScore >= 90) return 'good';
    if (performanceScore >= 50) return 'warning';
    return 'error';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>

        {/* Web Vitals */}
        <WebVitalsSkeleton />

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          <ChartSkeleton title="Page Load Times" />
          <ChartSkeleton title="Error Trend" />
        </div>

        {/* Tables */}
        <TableSkeleton />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-[var(--color-warning)] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Unable to Load Performance Data
          </h2>
          <p className="text-[var(--text-muted)] mt-2">
            There was an error loading the performance metrics.
          </p>
          <Button variant="primary" onClick={handleRefresh} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <Activity className="h-7 w-7 text-[var(--color-primary)]" />
            Performance Monitoring
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            Real-time application performance metrics and analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-[var(--text-muted)] hidden md:block">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')}
            />
            Refresh
          </Button>
          <Button variant="primary" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryStatCard
          label="Performance Score"
          value={`${performanceScore}/100`}
          icon={Zap}
          status={getOverallStatus()}
        />
        <SummaryStatCard
          label="Avg Load Time"
          value={`${Math.round(data.webVitals.LCP.average)}ms`}
          icon={Clock}
          trend={data.webVitals.LCP.trend}
          trendLabel="vs last period"
          status={data.webVitals.LCP.average < 2500 ? 'good' : data.webVitals.LCP.average < 4000 ? 'warning' : 'error'}
        />
        <SummaryStatCard
          label="Total Errors"
          value={data.errorStats.totalErrors}
          icon={AlertTriangle}
          status={data.errorStats.totalErrors < 50 ? 'good' : data.errorStats.totalErrors < 200 ? 'warning' : 'error'}
        />
        <SummaryStatCard
          label="Active Sessions"
          value={data.sessionStats.totalSessions.toLocaleString()}
          icon={Users}
        />
      </div>

      {/* Performance Score & Web Vitals */}
      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <PerformanceScoreCard score={performanceScore} webVitals={data.webVitals} />
        <WebVitalsCard webVitals={data.webVitals} />
      </div>

      {/* Session Stats */}
      <SessionStatsCard stats={data.sessionStats} />

      {/* Page Load Times & Slowest Pages */}
      <div className="grid lg:grid-cols-2 gap-6">
        <PageLoadTimeChart data={data.pageLoadTimes.slice(0, 8)} />
        <SlowestPagesTable data={data.slowestPages} />
      </div>

      {/* API Performance */}
      <ApiPerformanceTable endpoints={data.apiEndpoints} />

      {/* Error Analysis */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ErrorTrendChart
          data={data.errorTrend}
          totalErrors={data.errorStats.totalErrors}
          errorRate={data.errorStats.errorRate}
        />
        <ErrorBreakdown stats={data.errorStats} />
      </div>

      {/* Footer Info */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm text-[var(--text-muted)]">
            <div className="flex items-center gap-4">
              <span>
                Data collected from {data.webVitals.LCP.count.toLocaleString()} page views
              </span>
              <Badge variant="outline" className="text-xs">
                Real User Monitoring
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span>Auto-refresh: Every 30 seconds</span>
              <span>|</span>
              <span>Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
