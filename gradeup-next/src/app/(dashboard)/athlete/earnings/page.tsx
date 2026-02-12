'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Download,
  Calendar,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ChartWrapper,
  TimePeriodSelector,
  type TimePeriod,
  chartColors,
  tooltipStyle,
  axisStyle,
  formatCurrencyValue,
  formatAxisValue,
} from '@/components/ui/chart';

// Mock earnings data
const mockEarningsStats = {
  totalEarnings: 45250,
  pendingPayouts: 12500,
  thisMonth: 8750,
  lastMonth: 11200,
};

const mockPayouts = [
  {
    id: '1',
    dealTitle: 'Instagram Post Campaign',
    brandName: 'Nike',
    amount: 5000,
    status: 'completed' as const,
    paidAt: '2024-02-01T10:00:00Z',
  },
  {
    id: '2',
    dealTitle: 'Youth Basketball Camp',
    brandName: 'Duke Athletics',
    amount: 3000,
    status: 'completed' as const,
    paidAt: '2024-01-20T14:30:00Z',
  },
  {
    id: '3',
    dealTitle: 'Store Opening Appearance',
    brandName: 'Foot Locker',
    amount: 2500,
    status: 'pending' as const,
    paidAt: null,
  },
  {
    id: '4',
    dealTitle: 'Social Media Endorsement',
    brandName: 'Gatorade',
    amount: 7500,
    status: 'pending' as const,
    paidAt: null,
  },
];

// Extended earnings data for different time periods
const mockEarningsDataAll = [
  { month: 'Mar 24', amount: 2200 },
  { month: 'Apr 24', amount: 3100 },
  { month: 'May 24', amount: 2800 },
  { month: 'Jun 24', amount: 3500 },
  { month: 'Jul 24', amount: 4200 },
  { month: 'Aug 24', amount: 3900 },
  { month: 'Sep 24', amount: 4500 },
  { month: 'Oct 24', amount: 6200 },
  { month: 'Nov 24', amount: 8100 },
  { month: 'Dec 24', amount: 9800 },
  { month: 'Jan 25', amount: 11200 },
  { month: 'Feb 25', amount: 8750 },
];

const mockMonthlyEarnings = mockEarningsDataAll.slice(-6);

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down';
  trendLabel?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-[var(--text-muted)] mb-1">{title}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
            {trendLabel && (
              <p
                className={`text-sm mt-1 ${
                  trend === 'up' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                }`}
              >
                {trend === 'up' ? '↑' : '↓'} {trendLabel}
              </p>
            )}
          </div>
          <div className="h-12 w-12 rounded-[var(--radius-lg)] bg-[var(--color-primary-muted)] flex items-center justify-center">
            <Icon className="h-6 w-6 text-[var(--color-primary)]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EarningsChart() {
  const [period, setPeriod] = useState<TimePeriod>('6M');

  // Filter data based on selected period
  const getFilteredData = () => {
    switch (period) {
      case '3M':
        return mockEarningsDataAll.slice(-3);
      case '6M':
        return mockEarningsDataAll.slice(-6);
      case '1Y':
        return mockEarningsDataAll;
      case 'All':
        return mockEarningsDataAll;
      default:
        return mockEarningsDataAll.slice(-6);
    }
  };

  const chartData = getFilteredData();

  return (
    <ChartWrapper
      title="Earnings Trend"
      description="Track your earnings growth over time"
      height={300}
      headerAction={
        <TimePeriodSelector value={period} onChange={setPeriod} />
      }
    >
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
            <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-200)" vertical={false} />
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
        <Area
          type="monotone"
          dataKey="amount"
          stroke={chartColors.primary}
          strokeWidth={2}
          fill="url(#earningsGradient)"
        />
      </AreaChart>
    </ChartWrapper>
  );
}

function PayoutHistory() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Payout History</CardTitle>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockPayouts.map((payout) => (
            <div
              key={payout.id}
              className="flex items-center gap-4 p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]"
            >
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  payout.status === 'completed'
                    ? 'bg-[var(--color-success-muted)] text-[var(--color-success)]'
                    : 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]'
                }`}
              >
                {payout.status === 'completed' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <Clock className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--text-primary)] truncate">
                  {payout.dealTitle}
                </p>
                <p className="text-sm text-[var(--text-muted)]">{payout.brandName}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-[var(--text-primary)]">
                  {formatCurrency(payout.amount)}
                </p>
                <Badge
                  variant={payout.status === 'completed' ? 'success' : 'warning'}
                  size="sm"
                >
                  {payout.status === 'completed'
                    ? `Paid ${formatDate(payout.paidAt!)}`
                    : 'Pending'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AthleteEarningsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Earnings</h1>
          <p className="text-[var(--text-muted)]">
            Track your NIL income and payouts
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download Tax Report
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Earnings"
          value={formatCurrency(mockEarningsStats.totalEarnings)}
          icon={DollarSign}
        />
        <StatCard
          title="Pending Payouts"
          value={formatCurrency(mockEarningsStats.pendingPayouts)}
          icon={Clock}
        />
        <StatCard
          title="This Month"
          value={formatCurrency(mockEarningsStats.thisMonth)}
          icon={TrendingUp}
          trend="down"
          trendLabel="22% from last month"
        />
        <StatCard
          title="Last Month"
          value={formatCurrency(mockEarningsStats.lastMonth)}
          icon={CheckCircle}
        />
      </div>

      {/* Chart */}
      <EarningsChart />

      {/* Payout History */}
      <PayoutHistory />
    </div>
  );
}
