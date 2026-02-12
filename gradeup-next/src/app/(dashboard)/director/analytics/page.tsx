'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Users,
  TrendingUp,
  Download,
  ArrowUpRight,
} from 'lucide-react';
import { formatCurrency, formatCompactNumber } from '@/lib/utils';
import {
  ChartWrapper,
  ChartLegend,
  chartColors,
  tooltipStyle,
  axisStyle,
  formatCurrencyValue,
  formatAxisValue,
} from '@/components/ui/chart';

// Mock analytics data
const mockStats = {
  totalRevenue: 892500,
  revenueGrowth: 24.5,
  avgDealSize: 5720,
  athleteParticipation: 80.2,
};

const mockMonthlyRevenue = [
  { month: 'Sep', amount: 85000 },
  { month: 'Oct', amount: 112000 },
  { month: 'Nov', amount: 145000 },
  { month: 'Dec', amount: 168000 },
  { month: 'Jan', amount: 195000 },
  { month: 'Feb', amount: 187500 },
];

const mockSportBreakdown = [
  { sport: 'Basketball', athletes: 45, revenue: 285000, deals: 52 },
  { sport: 'Football', athletes: 85, revenue: 312000, deals: 48 },
  { sport: 'Soccer', athletes: 32, revenue: 125000, deals: 28 },
  { sport: 'Volleyball', athletes: 24, revenue: 85000, deals: 18 },
  { sport: 'Other', athletes: 61, revenue: 85500, deals: 22 },
];

// User growth data (athletes + brands over time)
const mockUserGrowthData = [
  { month: 'Sep', athletes: 180, brands: 28 },
  { month: 'Oct', athletes: 195, brands: 32 },
  { month: 'Nov', athletes: 210, brands: 36 },
  { month: 'Dec', athletes: 225, brands: 40 },
  { month: 'Jan', athletes: 238, brands: 42 },
  { month: 'Feb', athletes: 247, brands: 45 },
];

// Revenue breakdown for donut chart
const mockRevenueBreakdown = [
  { name: 'Social Media', value: 385000, color: chartColors.primary },
  { name: 'Appearances', value: 225000, color: chartColors.secondary },
  { name: 'Endorsements', value: 182500, color: chartColors.success },
  { name: 'Other', value: 100000, color: chartColors.info },
];

function MetricCard({
  title,
  value,
  trend,
  icon: Icon,
}: {
  title: string;
  value: string;
  trend?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-[var(--text-muted)] mb-1">{title}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
            {trend && (
              <div className="flex items-center gap-1 mt-2 text-[var(--color-success)]">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-sm">{trend}</span>
              </div>
            )}
          </div>
          <div className="h-12 w-12 rounded-[var(--radius-lg)] bg-[var(--color-accent)]/10 flex items-center justify-center text-[var(--color-accent)]">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UserGrowthChart() {
  return (
    <ChartWrapper
      title="User Growth"
      description="Athletes and brands over the last 6 months"
      height={280}
      headerAction={
        <ChartLegend
          items={[
            { name: 'Athletes', color: chartColors.primary },
            { name: 'Brands', color: chartColors.secondary },
          ]}
        />
      }
    >
      <LineChart data={mockUserGrowthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
        />
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          labelStyle={tooltipStyle.labelStyle}
        />
        <Line
          type="monotone"
          dataKey="athletes"
          name="Athletes"
          stroke={chartColors.primary}
          strokeWidth={2}
          dot={{ fill: chartColors.primary, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="brands"
          name="Brands"
          stroke={chartColors.secondary}
          strokeWidth={2}
          dot={{ fill: chartColors.secondary, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ChartWrapper>
  );
}

function RevenueBreakdownChart() {
  const total = mockRevenueBreakdown.reduce((sum, item) => sum + item.value, 0);

  return (
    <ChartWrapper
      title="Revenue Breakdown"
      description="Revenue by deal type"
      height={280}
    >
      <PieChart>
        <Pie
          data={mockRevenueBreakdown}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
        >
          {mockRevenueBreakdown.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          labelStyle={tooltipStyle.labelStyle}
          formatter={(value, name) => [formatCurrency(value as number), name]}
        />
        <Legend
          verticalAlign="middle"
          align="right"
          layout="vertical"
          wrapperStyle={{ paddingLeft: '20px' }}
          formatter={(value, entry) => {
            const item = mockRevenueBreakdown.find((d) => d.name === value);
            const percent = item ? ((item.value / total) * 100).toFixed(1) : 0;
            return (
              <span style={{ color: 'var(--neutral-900)', fontSize: '12px' }}>
                {value} ({percent}%)
              </span>
            );
          }}
        />
      </PieChart>
    </ChartWrapper>
  );
}

function SportBreakdownTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by Sport</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  Sport
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  Athletes
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  Deals
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {mockSportBreakdown.map((sport) => (
                <tr
                  key={sport.sport}
                  className="border-b border-[var(--border-color)] last:border-0"
                >
                  <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                    {sport.sport}
                  </td>
                  <td className="py-3 px-4 text-right text-[var(--text-secondary)]">
                    {sport.athletes}
                  </td>
                  <td className="py-3 px-4 text-right text-[var(--text-secondary)]">
                    {sport.deals}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-[var(--color-success)]">
                    {formatCurrency(sport.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[var(--bg-tertiary)]">
                <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                  Total
                </td>
                <td className="py-3 px-4 text-right font-semibold text-[var(--text-primary)]">
                  247
                </td>
                <td className="py-3 px-4 text-right font-semibold text-[var(--text-primary)]">
                  168
                </td>
                <td className="py-3 px-4 text-right font-semibold text-[var(--color-success)]">
                  {formatCurrency(mockStats.totalRevenue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DirectorAnalyticsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Program Analytics
          </h1>
          <p className="text-[var(--text-muted)]">
            Track your program&apos;s NIL performance
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(mockStats.totalRevenue)}
          trend={`+${mockStats.revenueGrowth}%`}
          icon={DollarSign}
        />
        <MetricCard
          title="Avg Deal Size"
          value={formatCurrency(mockStats.avgDealSize)}
          trend="+8.3%"
          icon={TrendingUp}
        />
        <MetricCard
          title="Athlete Participation"
          value={`${mockStats.athleteParticipation}%`}
          trend="+5.2%"
          icon={Users}
        />
        <MetricCard
          title="Active Deals"
          value="156"
          trend="+12"
          icon={TrendingUp}
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <UserGrowthChart />
        <RevenueBreakdownChart />
      </div>

      {/* Sport Breakdown */}
      <SportBreakdownTable />
    </div>
  );
}
