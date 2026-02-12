'use client';

import { useState } from 'react';
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
  CheckCircle2,
  AlertCircle,
  Megaphone,
  Handshake,
  Upload,
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
import { Avatar } from '@/components/ui/avatar';
import { formatCurrency, formatCompactNumber, formatRelativeTime, formatDate } from '@/lib/utils';

// Mock data - will be replaced with real data from Supabase
const mockStats = {
  totalEarnings: 45250,
  earningsTrend: 12.5,
  activeDeals: 4,
  newDeals: 2,
  profileViews: 1847,
  viewsTrend: 18,
  nilValuation: 125000,
};

const mockActivityFeed = [
  {
    id: '1',
    type: 'deal_accepted' as const,
    description: 'Nike accepted your counter offer for Instagram Campaign',
    timestamp: '2024-02-11T09:30:00Z',
  },
  {
    id: '2',
    type: 'message' as const,
    description: 'New message from Gatorade about partnership terms',
    timestamp: '2024-02-11T08:15:00Z',
  },
  {
    id: '3',
    type: 'profile_view' as const,
    description: 'Your profile was viewed by Foot Locker',
    timestamp: '2024-02-10T16:45:00Z',
  },
  {
    id: '4',
    type: 'deliverable' as const,
    description: 'Submitted Instagram post for Nike campaign - Awaiting approval',
    timestamp: '2024-02-10T14:20:00Z',
  },
  {
    id: '5',
    type: 'payment' as const,
    description: 'Received payment of $2,500 from Sports Memorabilia Inc',
    timestamp: '2024-02-09T11:00:00Z',
  },
  {
    id: '6',
    type: 'new_offer' as const,
    description: 'New deal offer from Under Armour - $3,500 social media campaign',
    timestamp: '2024-02-09T09:30:00Z',
  },
];

const mockDeadlines = [
  {
    id: '1',
    title: 'Nike Instagram Post #2',
    dealId: 'deal-1',
    deadline: '2024-02-14T23:59:00Z',
    status: 'upcoming' as const,
  },
  {
    id: '2',
    title: 'Foot Locker Store Appearance',
    dealId: 'deal-2',
    deadline: '2024-02-16T10:00:00Z',
    status: 'upcoming' as const,
  },
  {
    id: '3',
    title: 'Gatorade Contract Response',
    dealId: 'deal-3',
    deadline: '2024-02-18T17:00:00Z',
    status: 'pending' as const,
  },
  {
    id: '4',
    title: 'Nike Instagram Post #3',
    dealId: 'deal-1',
    deadline: '2024-02-21T23:59:00Z',
    status: 'upcoming' as const,
  },
];

const mockEarningsData = [
  { month: 'Sep', earnings: 8500 },
  { month: 'Oct', earnings: 12000 },
  { month: 'Nov', earnings: 9500 },
  { month: 'Dec', earnings: 15000 },
  { month: 'Jan', earnings: 18500 },
  { month: 'Feb', earnings: 45250 },
];

const activityIcons = {
  deal_accepted: Handshake,
  message: MessageSquare,
  profile_view: Eye,
  deliverable: Upload,
  payment: DollarSign,
  new_offer: Megaphone,
};

const activityColors = {
  deal_accepted: 'text-[var(--color-success)]',
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

function ActivityFeed() {
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
        <div className="space-y-4">
          {mockActivityFeed.map((activity) => {
            const Icon = activityIcons[activity.type];
            const colorClass = activityColors[activity.type];
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
                    {formatRelativeTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function UpcomingDeadlines() {
  const sortedDeadlines = [...mockDeadlines].sort(
    (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  );

  const getDeadlineStatus = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const daysUntil = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil <= 2) return { color: 'text-[var(--color-error)]', label: 'Urgent' };
    if (daysUntil <= 5) return { color: 'text-[var(--color-warning)]', label: 'Soon' };
    return { color: 'text-[var(--text-muted)]', label: '' };
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Upcoming Deadlines</CardTitle>
          <Calendar className="h-5 w-5 text-[var(--text-muted)]" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedDeadlines.map((item) => {
            const status = getDeadlineStatus(item.deadline);
            return (
              <a
                key={item.id}
                href={`/athlete/deals/${item.dealId}`}
                className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-card-hover)] transition-colors group"
              >
                <div className="flex-shrink-0">
                  <Clock className={`h-5 w-5 ${status.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                    {item.title}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {formatDate(item.deadline)}
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
      </CardContent>
    </Card>
  );
}

function EarningsChart() {
  return (
    <ChartWrapper
      title="Earnings Overview"
      description="Your earnings over the last 6 months"
      height={300}
      headerAction={
        <Badge variant="success">
          +{mockStats.earningsTrend}% this month
        </Badge>
      }
    >
      <BarChart data={mockEarningsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
    </ChartWrapper>
  );
}

export default function AthleteDashboardPage() {
  // In a real app, this would come from auth context
  const athleteName = 'Marcus';

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
          value={formatCurrency(mockStats.totalEarnings)}
          icon={<DollarSign className="h-5 w-5" />}
          trend={mockStats.earningsTrend}
          trendDirection="up"
        />
        <StatCard
          title="Active Deals"
          value={mockStats.activeDeals.toString()}
          icon={<FileText className="h-5 w-5" />}
          subtitle={
            <span className="text-xs text-[var(--color-success)] font-medium">
              +{mockStats.newDeals} new
            </span>
          }
        />
        <StatCard
          title="Profile Views"
          value={formatCompactNumber(mockStats.profileViews)}
          icon={<Eye className="h-5 w-5" />}
          trend={mockStats.viewsTrend}
          trendDirection="up"
        />
        <StatCard
          title="NIL Valuation"
          value={formatCurrency(mockStats.nilValuation)}
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
          <ActivityFeed />
        </div>
        <div className="lg:col-span-2">
          <UpcomingDeadlines />
        </div>
      </div>

      {/* Full-width Earnings Chart */}
      <EarningsChart />
    </div>
  );
}
