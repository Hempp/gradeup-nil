'use client';

import { useState } from 'react';
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

const mockMonthlyEarnings = [
  { month: 'Sep', amount: 4500 },
  { month: 'Oct', amount: 6200 },
  { month: 'Nov', amount: 8100 },
  { month: 'Dec', amount: 9800 },
  { month: 'Jan', amount: 11200 },
  { month: 'Feb', amount: 8750 },
];

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
  const maxAmount = Math.max(...mockMonthlyEarnings.map((e) => e.amount));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Monthly Earnings</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-1" />
              Last 6 Months
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-end gap-4">
          {mockMonthlyEarnings.map((item) => (
            <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full bg-gradient-to-t from-[var(--color-primary)] to-[var(--color-primary)]/50 rounded-t-[var(--radius-sm)] transition-all duration-500 hover:opacity-80"
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
