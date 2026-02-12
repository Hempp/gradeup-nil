'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import {
  DollarSign,
  TrendingUp,
  Eye,
  Users,
  Target,
  ArrowUpRight,
  Download,
} from 'lucide-react';
import { formatCurrency, formatCompactNumber } from '@/lib/utils';
import {
  ChartWrapper,
  ChartLegend,
  chartColors,
  tooltipStyle,
  axisStyle,
  formatNumber,
} from '@/components/ui/chart';

// Mock analytics data
const mockOverview = {
  totalSpent: 125000,
  totalImpressions: 2500000,
  totalEngagements: 185000,
  avgROI: 3.2,
  athletesReached: 45,
};

const mockCampaignPerformance = [
  { name: 'Spring Collection', impressions: 850000, engagements: 62000, roi: 3.8 },
  { name: 'Summer Sports', impressions: 720000, engagements: 54000, roi: 3.4 },
  { name: 'Holiday Push', impressions: 930000, engagements: 69000, roi: 2.9 },
];

const mockTopAthletes = [
  { name: 'Marcus Johnson', engagementRate: 8.2, impressions: 450000, roi: 4.2 },
  { name: 'Sarah Williams', engagementRate: 7.8, impressions: 380000, roi: 3.9 },
  { name: 'Emma Chen', engagementRate: 7.5, impressions: 320000, roi: 3.5 },
];

const mockMonthlySpend = [
  { month: 'Sep', amount: 15000 },
  { month: 'Oct', amount: 18500 },
  { month: 'Nov', amount: 22000 },
  { month: 'Dec', amount: 28000 },
  { month: 'Jan', amount: 21500 },
  { month: 'Feb', amount: 20000 },
];

// Reach/impressions over time data
const mockReachData = [
  { month: 'Sep', reach: 320000, engagements: 24000 },
  { month: 'Oct', reach: 450000, engagements: 36000 },
  { month: 'Nov', reach: 520000, engagements: 42000 },
  { month: 'Dec', reach: 680000, engagements: 52000 },
  { month: 'Jan', reach: 590000, engagements: 45000 },
  { month: 'Feb', reach: 620000, engagements: 48000 },
];

// Engagement by platform
const mockPlatformData = [
  { platform: 'Instagram', engagements: 85000 },
  { platform: 'TikTok', engagements: 52000 },
  { platform: 'Twitter', engagements: 28000 },
  { platform: 'YouTube', engagements: 15000 },
  { platform: 'LinkedIn', engagements: 5000 },
];

function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'primary',
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  color?: 'primary' | 'secondary' | 'success';
}) {
  const colors = {
    primary: 'bg-[var(--color-primary-muted)] text-[var(--color-primary)]',
    secondary: 'bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]',
    success: 'bg-[var(--color-success-muted)] text-[var(--color-success)]',
  };

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
          <div className={`h-12 w-12 rounded-[var(--radius-lg)] flex items-center justify-center ${colors[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReachChart() {
  return (
    <ChartWrapper
      title="Reach & Engagement Over Time"
      height={280}
      headerAction={
        <ChartLegend
          items={[
            { name: 'Reach', color: chartColors.primary },
            { name: 'Engagements', color: chartColors.secondary },
          ]}
        />
      }
    >
      <LineChart data={mockReachData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          tickFormatter={formatNumber}
        />
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          labelStyle={tooltipStyle.labelStyle}
          formatter={(value, name) => [
            formatCompactNumber(value as number),
            name === 'reach' ? 'Reach' : 'Engagements',
          ]}
        />
        <Line
          type="monotone"
          dataKey="reach"
          stroke={chartColors.primary}
          strokeWidth={2}
          dot={{ fill: chartColors.primary, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="engagements"
          stroke={chartColors.secondary}
          strokeWidth={2}
          dot={{ fill: chartColors.secondary, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ChartWrapper>
  );
}

function PlatformEngagementChart() {
  return (
    <ChartWrapper
      title="Engagement by Platform"
      height={280}
    >
      <BarChart
        data={mockPlatformData}
        layout="vertical"
        margin={{ top: 10, right: 10, left: 60, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-200)" horizontal={false} />
        <XAxis
          type="number"
          tick={axisStyle.tick}
          axisLine={axisStyle.axisLine}
          tickLine={axisStyle.tickLine}
          tickFormatter={formatNumber}
        />
        <YAxis
          type="category"
          dataKey="platform"
          tick={axisStyle.tick}
          axisLine={false}
          tickLine={axisStyle.tickLine}
          width={55}
        />
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          labelStyle={tooltipStyle.labelStyle}
          formatter={(value) => [formatCompactNumber(value as number), 'Engagements']}
        />
        <Bar
          dataKey="engagements"
          fill={chartColors.secondary}
          radius={[0, 4, 4, 0]}
          maxBarSize={32}
        />
      </BarChart>
    </ChartWrapper>
  );
}

function CampaignPerformanceTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  Campaign
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  Impressions
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  Engagements
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  ROI
                </th>
              </tr>
            </thead>
            <tbody>
              {mockCampaignPerformance.map((campaign) => (
                <tr
                  key={campaign.name}
                  className="border-b border-[var(--border-color)] last:border-0"
                >
                  <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                    {campaign.name}
                  </td>
                  <td className="py-3 px-4 text-right text-[var(--text-secondary)]">
                    {formatCompactNumber(campaign.impressions)}
                  </td>
                  <td className="py-3 px-4 text-right text-[var(--text-secondary)]">
                    {formatCompactNumber(campaign.engagements)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Badge variant="success">{campaign.roi}x</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function TopAthletesCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performing Athletes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockTopAthletes.map((athlete, index) => (
            <div
              key={athlete.name}
              className="flex items-center gap-4 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]"
            >
              <span className="text-lg font-bold text-[var(--color-primary)]">
                #{index + 1}
              </span>
              <Avatar fallback={athlete.name.charAt(0)} size="md" />
              <div className="flex-1">
                <p className="font-medium text-[var(--text-primary)]">
                  {athlete.name}
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  {formatCompactNumber(athlete.impressions)} impressions
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-[var(--color-success)]">
                  {athlete.roi}x ROI
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {athlete.engagementRate}% engagement
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BrandAnalyticsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Analytics</h1>
          <p className="text-[var(--text-muted)]">
            Track your campaign performance and ROI
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Spent"
          value={formatCurrency(mockOverview.totalSpent)}
          icon={DollarSign}
          trend="+15.3%"
          color="primary"
        />
        <MetricCard
          title="Impressions"
          value={formatCompactNumber(mockOverview.totalImpressions)}
          icon={Eye}
          trend="+22.1%"
          color="secondary"
        />
        <MetricCard
          title="Engagements"
          value={formatCompactNumber(mockOverview.totalEngagements)}
          icon={Target}
          trend="+18.5%"
          color="secondary"
        />
        <MetricCard
          title="Average ROI"
          value={`${mockOverview.avgROI}x`}
          icon={TrendingUp}
          trend="+0.5x"
          color="success"
        />
        <MetricCard
          title="Athletes"
          value={mockOverview.athletesReached.toString()}
          icon={Users}
          color="primary"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ReachChart />
        <PlatformEngagementChart />
      </div>

      {/* Top Athletes Card */}
      <TopAthletesCard />

      {/* Campaign Table */}
      <CampaignPerformanceTable />
    </div>
  );
}
