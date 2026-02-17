'use client';

import { memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatCompactNumber } from '@/lib/utils/format';
import { useAnalytics, type DateRangePreset, formatDateRangeLabel } from '@/hooks/useAnalytics';
import {
  MetricCard,
  MetricCardGrid,
  MetricCardSkeleton,
} from './MetricCard';
import {
  LineTrendChart,
  MultiLineChart,
  BarChartComponent,
  PieChartComponent,
  TimePeriodSelector,
  chartColors,
  formatCompactCurrency,
} from './Charts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton, SkeletonAvatar } from '@/components/ui/skeleton';

// ═══════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════

const UsersIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const BuildingIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const HandshakeIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const CurrencyIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TrophyIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface AnalyticsDashboardProps {
  /** Title displayed at the top of the dashboard */
  title?: string;
  /** Description shown below the title */
  description?: string;
  /** Whether to show the date range selector */
  showDateSelector?: boolean;
  /** Initial date range preset */
  initialDateRange?: DateRangePreset;
  /** Custom header action (e.g., export button) */
  headerAction?: ReactNode;
  /** Additional CSS class */
  className?: string;
  /** Whether to show geographic data section */
  showGeographic?: boolean;
  /** Whether to show top performers section */
  showTopPerformers?: boolean;
  /** Whether to show distribution charts */
  showDistributions?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// TOP PERFORMERS LIST
// ═══════════════════════════════════════════════════════════════════════════

interface TopPerformerItemProps {
  rank: number;
  name: string;
  subtitle: string;
  value: string;
  avatarUrl?: string;
}

function TopPerformerItem({ rank, name, subtitle, value, avatarUrl }: TopPerformerItemProps) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[var(--border-color)] last:border-0">
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--bg-tertiary)] text-sm font-medium text-[var(--text-muted)]">
        {rank}
      </div>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[var(--color-primary-muted)] flex items-center justify-center text-[var(--color-primary)] font-medium">
            {name.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{name}</p>
          <p className="text-xs text-[var(--text-muted)] truncate">{subtitle}</p>
        </div>
      </div>
      <div className="text-sm font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function TopPerformersSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 py-3 border-b border-[var(--border-color)] last:border-0">
          <Skeleton className="w-6 h-6 rounded-full" />
          <SkeletonAvatar size="md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GEOGRAPHIC DISTRIBUTION
// ═══════════════════════════════════════════════════════════════════════════

interface GeographicItemProps {
  state: string;
  athletes: number;
  deals: number;
  revenue: number;
}

function GeographicItem({ state, athletes, deals, revenue }: GeographicItemProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--border-color)] last:border-0">
      <div className="font-medium text-sm text-[var(--text-primary)]">{state}</div>
      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
        <span>{formatCompactNumber(athletes)} athletes</span>
        <span>{deals} deals</span>
        <span className="font-medium text-[var(--text-primary)]">{formatCompactCurrency(revenue)}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analytics Dashboard component for GradeUp NIL platform
 *
 * Displays comprehensive platform analytics including:
 * - Overview metrics (athletes, brands, deals, revenue)
 * - Time-series charts for deal activity
 * - Top performing athletes and brands
 * - Geographic distribution
 * - Sport and deal type distributions
 *
 * @example
 * ```tsx
 * <AnalyticsDashboard
 *   title="Platform Analytics"
 *   showDateSelector
 *   initialDateRange="30d"
 *   showGeographic
 *   showTopPerformers
 * />
 * ```
 */
const AnalyticsDashboard = memo(function AnalyticsDashboard({
  title = 'Platform Analytics',
  description,
  showDateSelector = true,
  initialDateRange = '30d',
  headerAction,
  className,
  showGeographic = true,
  showTopPerformers = true,
  showDistributions = true,
}: AnalyticsDashboardProps) {
  const {
    data,
    loading,
    error,
    dateRange,
    setDateRange,
  } = useAnalytics({ dateRange: initialDateRange });

  // Error state
  if (error) {
    return (
      <div className={cn('space-y-6', className)}>
        <Card className="p-8 text-center">
          <div className="text-[var(--color-error)] mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Failed to load analytics
          </h3>
          <p className="text-[var(--text-muted)]">{error.message}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h1>
          {description && (
            <p className="text-sm text-[var(--text-muted)] mt-1">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {showDateSelector && (
            <TimePeriodSelector
              value={dateRange}
              onChange={setDateRange}
            />
          )}
          {headerAction}
        </div>
      </div>

      {/* Date range indicator */}
      {showDateSelector && (
        <Badge variant="outline" className="w-fit">
          Showing data for {formatDateRangeLabel(dateRange)}
        </Badge>
      )}

      {/* Overview Metrics */}
      <section aria-label="Overview metrics">
        {loading ? (
          <MetricCardGrid columns={4}>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </MetricCardGrid>
        ) : data ? (
          <MetricCardGrid columns={4}>
            <MetricCard
              label="Total Athletes"
              value={formatCompactNumber(data.overview.totalAthletes)}
              trend={data.overview.athletesTrend}
              icon={<UsersIcon />}
              variant="primary"
            />
            <MetricCard
              label="Total Brands"
              value={formatCompactNumber(data.overview.totalBrands)}
              trend={data.overview.brandsTrend}
              icon={<BuildingIcon />}
              variant="default"
            />
            <MetricCard
              label="Total Deals"
              value={formatCompactNumber(data.overview.totalDeals)}
              trend={data.overview.dealsTrend}
              icon={<HandshakeIcon />}
              variant="success"
            />
            <MetricCard
              label="Total Revenue"
              value={formatCurrency(data.overview.totalRevenue)}
              trend={data.overview.revenueTrend}
              icon={<CurrencyIcon />}
              variant="primary"
              premium
            />
          </MetricCardGrid>
        ) : null}
      </section>

      {/* Deal Activity Charts */}
      <section aria-label="Deal activity charts" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <>
            <Card className="p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-[300px] w-full" />
            </Card>
            <Card className="p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-[300px] w-full" />
            </Card>
          </>
        ) : data ? (
          <>
            <MultiLineChart
              data={data.dealActivity}
              lines={[
                { dataKey: 'deals', name: 'Deals', color: chartColors.primary },
              ]}
              title="Deal Activity"
              description="Number of deals over time"
              height={300}
            />
            <LineTrendChart
              data={data.dealActivity}
              dataKey="revenue"
              title="Revenue Trend"
              description="Total revenue generated over time"
              height={300}
              color={chartColors.success}
              valueFormatter={formatCompactCurrency}
            />
          </>
        ) : null}
      </section>

      {/* Top Performers */}
      {showTopPerformers && (
        <section aria-label="Top performers" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Athletes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrophyIcon />
                Top Athletes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <TopPerformersSkeleton />
              ) : data ? (
                <div>
                  {data.topAthletes.map((athlete, index) => (
                    <TopPerformerItem
                      key={athlete.id}
                      rank={index + 1}
                      name={athlete.name}
                      subtitle={`${athlete.sport} - ${athlete.school}`}
                      value={formatCurrency(athlete.totalEarnings)}
                      avatarUrl={athlete.avatarUrl}
                    />
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Top Brands */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BuildingIcon />
                Top Brands
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <TopPerformersSkeleton />
              ) : data ? (
                <div>
                  {data.topBrands.map((brand, index) => (
                    <TopPerformerItem
                      key={brand.id}
                      rank={index + 1}
                      name={brand.name}
                      subtitle={`${brand.industry} - ${brand.dealsCompleted} deals`}
                      value={formatCurrency(brand.totalSpent)}
                      avatarUrl={brand.logoUrl}
                    />
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Distribution Charts */}
      {showDistributions && (
        <section aria-label="Distribution charts" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loading ? (
            <>
              <Card className="p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-[300px] w-full rounded-full mx-auto" style={{ maxWidth: '300px' }} />
              </Card>
              <Card className="p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-[300px] w-full rounded-full mx-auto" style={{ maxWidth: '300px' }} />
              </Card>
            </>
          ) : data ? (
            <>
              <PieChartComponent
                data={data.sportDistribution.slice(0, 6).map(item => ({
                  name: item.sport,
                  value: item.athletes,
                }))}
                title="Athletes by Sport"
                description="Distribution of athletes across sports"
                height={300}
              />
              <PieChartComponent
                data={data.dealTypeDistribution.map(item => ({
                  name: item.type,
                  value: item.count,
                }))}
                title="Deals by Type"
                description="Distribution of deal types"
                height={300}
              />
            </>
          ) : null}
        </section>
      )}

      {/* Geographic Distribution */}
      {showGeographic && (
        <section aria-label="Geographic distribution">
          <Card>
            <CardHeader>
              <CardTitle>Geographic Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border-color)]">
                      <Skeleton className="h-4 w-24" />
                      <div className="flex gap-4">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : data ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  {data.geographicData.map((item) => (
                    <GeographicItem
                      key={item.state}
                      state={item.state}
                      athletes={item.athletes}
                      deals={item.deals}
                      revenue={item.revenue}
                    />
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Sports Distribution Bar Chart */}
      {showDistributions && !loading && data && (
        <section aria-label="Sports distribution chart">
          <BarChartComponent
            data={data.sportDistribution.map(item => ({
              name: item.sport,
              athletes: item.athletes,
              deals: item.deals,
            }))}
            dataKey="athletes"
            title="Athletes by Sport"
            description="Number of athletes registered in each sport"
            height={350}
            color={chartColors.primary}
            layout="horizontal"
          />
        </section>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// COMPACT DASHBOARD VARIANT
// ═══════════════════════════════════════════════════════════════════════════

export interface CompactAnalyticsDashboardProps {
  className?: string;
}

/**
 * Compact version of the analytics dashboard showing only key metrics
 * Useful for embedding in other pages or sidebars
 */
export function CompactAnalyticsDashboard({ className }: CompactAnalyticsDashboardProps) {
  const { data, loading, error } = useAnalytics({ dateRange: '30d' });

  if (error) {
    return (
      <Card className={cn('p-4', className)}>
        <p className="text-sm text-[var(--color-error)]">Failed to load analytics</p>
      </Card>
    );
  }

  return (
    <Card className={cn('p-4', className)}>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Quick Stats</h3>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-muted)]">Athletes</span>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {formatCompactNumber(data.overview.totalAthletes)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-muted)]">Brands</span>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {formatCompactNumber(data.overview.totalBrands)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-muted)]">Deals</span>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {formatCompactNumber(data.overview.totalDeals)}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-3 mt-3">
            <span className="text-sm text-[var(--text-muted)]">Revenue</span>
            <span className="text-sm font-semibold text-[var(--color-primary)]">
              {formatCurrency(data.overview.totalRevenue)}
            </span>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export { AnalyticsDashboard };
export default AnalyticsDashboard;
