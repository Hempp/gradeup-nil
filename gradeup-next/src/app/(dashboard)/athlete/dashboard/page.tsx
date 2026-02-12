'use client';

import { useState, useMemo } from 'react';
import {
  DollarSign,
  FileText,
  Eye,
  TrendingUp,
  ChevronDown,
  Plus,
  MessageSquare,
  User,
  Calendar,
  Clock,
  Megaphone,
  Handshake,
  Upload,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  ChartWrapper,
  chartColors,
  tooltipStyle,
  axisStyle,
  formatCurrencyValue,
  formatAxisValue,
} from '@/components/ui/chart';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatCompactNumber, formatRelativeTime, formatDate } from '@/lib/utils';
import { useRequireAuth } from '@/context';
import { useAthleteStats, useAthleteDeals, useActivity, useAthleteEarnings } from '@/lib/hooks/use-data';
import type { Activity } from '@/lib/services/activity';
import type { Deal } from '@/lib/services/deals';

// Activity type to icon mapping
const activityIcons: Record<string, typeof Handshake> = {
  deal_created: FileText,
  deal_accepted: Handshake,
  deal_completed: Handshake,
  deal_rejected: FileText,
  message: MessageSquare,
  profile_view: Eye,
  deliverable: Upload,
  payment: DollarSign,
  new_offer: Megaphone,
};

const activityColors: Record<string, string> = {
  deal_created: 'text-[var(--color-primary)]',
  deal_accepted: 'text-[var(--color-success)]',
  deal_completed: 'text-[var(--color-success)]',
  deal_rejected: 'text-[var(--color-error)]',
  message: 'text-[var(--color-primary)]',
  profile_view: 'text-[var(--text-muted)]',
  deliverable: 'text-[var(--color-warning)]',
  payment: 'text-[var(--color-success)]',
  new_offer: 'text-[var(--color-primary)]',
};

function QuickActionsDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { label: 'Update Profile', href: '/athlete/profile', icon: User },
    { label: 'View All Deals', href: '/athlete/deals', icon: FileText },
    { label: 'Check Messages', href: '/athlete/messages', icon: MessageSquare },
    { label: 'See Earnings', href: '/athlete/earnings', icon: DollarSign },
  ];

  return (
    <div className="relative">
      <Button
        variant="primary"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Quick Actions
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] z-20 py-2">
            {actions.map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <action.icon className="h-4 w-4 text-[var(--text-muted)]" />
                {action.label}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ActivityFeed({ activities, loading }: { activities: Activity[] | null; loading: boolean }) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayActivities = activities && activities.length > 0 ? activities : [];

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          <a
            href="/athlete/activity"
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            View all
          </a>
        </div>
      </CardHeader>
      <CardContent>
        {displayActivities.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">
            No recent activity yet
          </p>
        ) : (
          <div className="space-y-4">
            {displayActivities.map((activity) => {
              const Icon = activityIcons[activity.type] || FileText;
              const colorClass = activityColors[activity.type] || 'text-[var(--text-muted)]';
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 pb-4 border-b border-[var(--border-color)] last:border-0 last:pb-0"
                >
                  <div className={`mt-0.5 ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)] leading-snug">
                      {activity.description}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {formatRelativeTime(activity.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UpcomingDeadlines({ deals, loading }: { deals: Deal[] | null; loading: boolean }) {
  // Filter active deals with end dates and sort by date
  const upcomingDeals = useMemo(() => {
    if (!deals) return [];
    return deals
      .filter((deal) => deal.status === 'active' || deal.status === 'accepted')
      .filter((deal) => deal.end_date)
      .sort((a, b) => new Date(a.end_date!).getTime() - new Date(b.end_date!).getTime())
      .slice(0, 4);
  }, [deals]);

  const getDeadlineStatus = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const daysUntil = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil <= 2) return { color: 'text-[var(--color-error)]', label: 'Urgent' };
    if (daysUntil <= 5) return { color: 'text-[var(--color-warning)]', label: 'Soon' };
    return { color: 'text-[var(--text-muted)]', label: '' };
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Upcoming Deadlines</CardTitle>
            <Calendar className="h-5 w-5 text-[var(--text-muted)]" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Upcoming Deadlines</CardTitle>
          <Calendar className="h-5 w-5 text-[var(--text-muted)]" />
        </div>
      </CardHeader>
      <CardContent>
        {upcomingDeals.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">
            No upcoming deadlines
          </p>
        ) : (
          <div className="space-y-3">
            {upcomingDeals.map((deal) => {
              const status = getDeadlineStatus(deal.end_date!);
              return (
                <a
                  key={deal.id}
                  href={`/athlete/deals/${deal.id}`}
                  className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-card-hover)] transition-colors group"
                >
                  <div className="flex-shrink-0">
                    <Clock className={`h-5 w-5 ${status.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                      {deal.title}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {formatDate(deal.end_date!)}
                    </p>
                  </div>
                  {status.label && (
                    <Badge variant={status.label === 'Urgent' ? 'error' : 'warning'} size="sm">
                      {status.label}
                    </Badge>
                  )}
                </a>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface EarningsChartProps {
  earningsData: { month: string; earnings: number }[];
  loading: boolean;
  trend?: number;
}

function EarningsChart({ earningsData, loading, trend }: EarningsChartProps) {
  if (loading) {
    return (
      <ChartWrapper
        title="Earnings Overview"
        description="Your earnings over the last 6 months"
        height={300}
      >
        <div className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--text-muted)]" />
        </div>
      </ChartWrapper>
    );
  }

  const displayData = earningsData.length > 0 ? earningsData : [];

  return (
    <ChartWrapper
      title="Earnings Overview"
      description="Your earnings over the last 6 months"
      height={300}
      headerAction={
        trend !== undefined && trend > 0 ? (
          <Badge variant="success">+{trend.toFixed(1)}% this month</Badge>
        ) : undefined
      }
    >
      {displayData.length === 0 ? (
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-sm text-[var(--text-muted)]">No earnings data yet</p>
        </div>
      ) : (
        <BarChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--surface-200)"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={axisStyle.tick}
            axisLine={axisStyle.axisLine}
            tickLine={axisStyle.tickLine}
          />
          <YAxis
            tick={axisStyle.tick}
            axisLine={false}
            tickLine={axisStyle.tickLine}
            tickFormatter={formatAxisValue}
          />
          <Tooltip
            contentStyle={tooltipStyle.contentStyle}
            labelStyle={tooltipStyle.labelStyle}
            formatter={(value) => [formatCurrencyValue(value as number), 'Earnings']}
          />
          <Bar
            dataKey="earnings"
            fill={chartColors.primary}
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
          />
        </BarChart>
      )}
    </ChartWrapper>
  );
}

export default function AthleteDashboardPage() {
  // Require auth and get athlete data
  const { profile, roleData, isLoading: authLoading } = useRequireAuth({ allowedRoles: ['athlete'] });
  const athleteData = roleData as { id: string; nil_valuation: number | null } | null;

  // Fetch dashboard data
  const { data: stats, loading: statsLoading } = useAthleteStats(athleteData?.id);
  const { data: deals, loading: dealsLoading } = useAthleteDeals(athleteData?.id);
  const { data: activities, loading: activitiesLoading } = useActivity(6);
  const { data: earningsData, loading: earningsLoading } = useAthleteEarnings(athleteData?.id);

  // Transform earnings data for chart
  const chartData = useMemo(() => {
    if (!earningsData?.monthly_breakdown) return [];
    return earningsData.monthly_breakdown.map((item) => ({
      month: item.month,
      earnings: item.amount,
    }));
  }, [earningsData]);

  // Calculate trend
  const earningsTrend = useMemo(() => {
    if (chartData.length < 2) return 0;
    const current = chartData[chartData.length - 1]?.earnings || 0;
    const previous = chartData[chartData.length - 2]?.earnings || 0;
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }, [chartData]);

  // Show loading state while auth is checking
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  const athleteName = profile?.first_name || 'Athlete';
  const nilValuation = athleteData?.nil_valuation || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Welcome back, {athleteName}
          </h1>
          <p className="text-[var(--text-muted)]">
            Here's what's happening with your NIL deals
          </p>
        </div>
        <QuickActionsDropdown />
      </div>

      {/* Stats Grid - 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Earnings"
          value={statsLoading ? '...' : formatCurrency(stats?.total_earnings || 0)}
          icon={<DollarSign className="h-5 w-5" />}
          trend={earningsTrend > 0 ? earningsTrend : undefined}
          trendDirection="up"
        />
        <StatCard
          title="Active Deals"
          value={statsLoading ? '...' : (stats?.active_deals || 0).toString()}
          icon={<FileText className="h-5 w-5" />}
          subtitle={
            stats?.pending_earnings && stats.pending_earnings > 0 ? (
              <span className="text-xs text-[var(--color-success)] font-medium">
                {formatCurrency(stats.pending_earnings)} pending
              </span>
            ) : undefined
          }
        />
        <StatCard
          title="Profile Views"
          value={statsLoading ? '...' : formatCompactNumber(stats?.profile_views || 0)}
          icon={<Eye className="h-5 w-5" />}
        />
        <StatCard
          title="NIL Valuation"
          value={formatCurrency(nilValuation)}
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle={
            <span className="text-xs text-[var(--text-muted)]">
              Updated weekly
            </span>
          }
        />
      </div>

      {/* Two-column section: Activity Feed + Deadlines */}
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <ActivityFeed activities={activities} loading={activitiesLoading} />
        </div>
        <div className="lg:col-span-2">
          <UpcomingDeadlines deals={deals} loading={dealsLoading} />
        </div>
      </div>

      {/* Full-width Earnings Chart */}
      <EarningsChart
        earningsData={chartData}
        loading={earningsLoading}
        trend={earningsTrend > 0 ? earningsTrend : undefined}
      />
    </div>
  );
}
