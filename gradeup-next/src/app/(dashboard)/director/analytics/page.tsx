'use client';

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

function RevenueChart() {
  const maxAmount = Math.max(...mockMonthlyRevenue.map((e) => e.amount));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-end gap-4">
          {mockMonthlyRevenue.map((item) => (
            <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full bg-gradient-to-t from-[var(--color-accent)] to-[var(--color-secondary)] rounded-t-[var(--radius-sm)] transition-all duration-500 hover:opacity-80"
                style={{ height: `${(item.amount / maxAmount) * 200}px` }}
              />
              <span className="text-xs text-[var(--text-muted)]">{item.month}</span>
              <span className="text-xs font-medium text-[var(--text-primary)]">
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
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
            Track your program's NIL performance
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
      <RevenueChart />

      {/* Sport Breakdown */}
      <SportBreakdownTable />
    </div>
  );
}
