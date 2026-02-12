'use client';

import { Suspense, useState } from 'react';
import {
  Users,
  Building,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  UserPlus,
  Handshake,
  Flag,
  Shield,
  Eye,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { StatCard } from '@/components/ui/stat-card';
import { SkeletonStats, SkeletonCard } from '@/components/ui/skeleton';
import { formatCurrency, formatCompactNumber, formatRelativeTime, formatPercentage } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA - Director Dashboard
// ═══════════════════════════════════════════════════════════════════════════

const mockStats = {
  totalAthletes: 247,
  totalBrands: 45,
  totalActiveDeals: 156,
  platformRevenue: 892500,
  monthlyGrowth: 18.5,
  complianceScore: 94,
};

// Platform Activity Feed - Real-time events
const mockActivityFeed = [
  {
    id: '1',
    type: 'new_signup',
    category: 'athlete',
    name: 'Tyler Martinez',
    details: 'Basketball, Duke University',
    createdAt: '2026-02-11T10:45:00Z',
  },
  {
    id: '2',
    type: 'deal_completed',
    athlete: 'Marcus Johnson',
    brand: 'Nike',
    amount: 5000,
    createdAt: '2026-02-11T10:30:00Z',
  },
  {
    id: '3',
    type: 'new_signup',
    category: 'brand',
    name: 'SportsFuel Energy',
    details: 'Sports Nutrition',
    createdAt: '2026-02-11T09:45:00Z',
  },
  {
    id: '4',
    type: 'flag_raised',
    athlete: 'Jordan Davis',
    reason: 'Contract terms under review',
    severity: 'high',
    createdAt: '2026-02-11T09:15:00Z',
  },
  {
    id: '5',
    type: 'athlete_verified',
    athlete: 'Sarah Williams',
    createdAt: '2026-02-11T09:00:00Z',
  },
  {
    id: '6',
    type: 'deal_completed',
    athlete: 'Emma Chen',
    brand: 'Gatorade',
    amount: 3500,
    createdAt: '2026-02-11T08:30:00Z',
  },
  {
    id: '7',
    type: 'new_signup',
    category: 'athlete',
    name: 'Alex Thompson',
    details: 'Soccer, Duke University',
    createdAt: '2026-02-10T16:45:00Z',
  },
  {
    id: '8',
    type: 'flag_raised',
    athlete: 'Emma Chen',
    reason: 'Missing documentation',
    severity: 'medium',
    createdAt: '2026-02-10T14:00:00Z',
  },
];

// Growth chart data - athletes and brands over time
const mockGrowthData = [
  { month: 'Sep', athletes: 180, brands: 28 },
  { month: 'Oct', athletes: 195, brands: 32 },
  { month: 'Nov', athletes: 210, brands: 36 },
  { month: 'Dec', athletes: 225, brands: 40 },
  { month: 'Jan', athletes: 238, brands: 42 },
  { month: 'Feb', athletes: 247, brands: 45 },
];

// Compliance alerts with severity
const mockAlerts = [
  {
    id: '1',
    athlete: 'Jordan Davis',
    reason: 'Contract terms exceed NCAA guidelines',
    severity: 'high',
    brand: 'Nike',
    createdAt: '2026-02-11T09:15:00Z',
    actionRequired: true,
  },
  {
    id: '2',
    athlete: 'Emma Chen',
    reason: 'Missing tax documentation (W-9)',
    severity: 'medium',
    brand: null,
    createdAt: '2026-02-10T14:00:00Z',
    actionRequired: true,
  },
  {
    id: '3',
    athlete: 'Tyler Brooks',
    reason: 'Social post missing #ad disclosure',
    severity: 'low',
    brand: 'Gatorade',
    createdAt: '2026-02-09T11:00:00Z',
    actionRequired: false,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function ActivityFeedCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Platform Activity Feed</CardTitle>
          <Badge variant="outline" size="sm">Live</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {mockActivityFeed.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-card)] transition-colors"
            >
              {/* Activity Icon */}
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  activity.type === 'deal_completed'
                    ? 'bg-[var(--color-success-muted)] text-[var(--color-success)]'
                    : activity.type === 'flag_raised'
                    ? activity.severity === 'high'
                      ? 'bg-[var(--color-error-muted)] text-[var(--color-error)]'
                      : 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]'
                    : activity.type === 'athlete_verified'
                    ? 'bg-[var(--color-primary-muted)] text-[var(--color-primary)]'
                    : activity.type === 'new_signup' && activity.category === 'athlete'
                    ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                    : 'bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]'
                }`}
              >
                {activity.type === 'deal_completed' && <Handshake className="h-4 w-4" />}
                {activity.type === 'flag_raised' && <Flag className="h-4 w-4" />}
                {activity.type === 'athlete_verified' && <CheckCircle className="h-4 w-4" />}
                {activity.type === 'new_signup' && activity.category === 'athlete' && (
                  <UserPlus className="h-4 w-4" />
                )}
                {activity.type === 'new_signup' && activity.category === 'brand' && (
                  <Building className="h-4 w-4" />
                )}
              </div>

              {/* Activity Content */}
              <div className="flex-1 min-w-0">
                {activity.type === 'deal_completed' && (
                  <p className="text-sm text-[var(--text-primary)]">
                    <span className="font-medium">{activity.athlete}</span> completed a{' '}
                    <span className="text-[var(--color-success)] font-semibold">
                      {formatCurrency(activity.amount!)}
                    </span>{' '}
                    deal with <span className="font-medium">{activity.brand}</span>
                  </p>
                )}
                {activity.type === 'athlete_verified' && (
                  <p className="text-sm text-[var(--text-primary)]">
                    <span className="font-medium">{activity.athlete}</span> was verified
                  </p>
                )}
                {activity.type === 'flag_raised' && (
                  <p className="text-sm text-[var(--text-primary)]">
                    <span className="font-medium">{activity.athlete}</span>:{' '}
                    <span className={activity.severity === 'high' ? 'text-[var(--color-error)]' : 'text-[var(--color-warning)]'}>
                      {activity.reason}
                    </span>
                  </p>
                )}
                {activity.type === 'new_signup' && (
                  <p className="text-sm text-[var(--text-primary)]">
                    <span className="font-medium">{activity.name}</span> joined as{' '}
                    {activity.category === 'athlete' ? 'an athlete' : 'a brand partner'}
                    <span className="text-[var(--text-muted)]"> - {activity.details}</span>
                  </p>
                )}
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {formatRelativeTime(activity.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function GrowthChartCard() {
  const maxAthletes = Math.max(...mockGrowthData.map((d) => d.athletes));
  const maxBrands = Math.max(...mockGrowthData.map((d) => d.brands));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Platform Growth</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--color-primary)]" />
              <span className="text-xs text-[var(--text-muted)]">Athletes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--color-secondary)]" />
              <span className="text-xs text-[var(--text-muted)]">Brands</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] flex items-end justify-between gap-4 pt-4">
          {mockGrowthData.map((data, index) => (
            <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
              {/* Bars container */}
              <div className="w-full flex items-end justify-center gap-1 h-[160px]">
                {/* Athletes bar */}
                <div
                  className="w-5 bg-[var(--color-primary)] rounded-t-sm transition-all duration-300 hover:opacity-80"
                  style={{ height: `${(data.athletes / maxAthletes) * 140}px` }}
                  title={`Athletes: ${data.athletes}`}
                />
                {/* Brands bar (scaled differently for visibility) */}
                <div
                  className="w-5 bg-[var(--color-secondary)] rounded-t-sm transition-all duration-300 hover:opacity-80"
                  style={{ height: `${(data.brands / maxBrands) * 140}px` }}
                  title={`Brands: ${data.brands}`}
                />
              </div>
              {/* Month label */}
              <span className="text-xs text-[var(--text-muted)]">{data.month}</span>
            </div>
          ))}
        </div>
        {/* Growth summary */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-[var(--color-success)]" />
            <span className="text-sm text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--color-success)]">+37%</span> athlete growth (6mo)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-[var(--color-success)]" />
            <span className="text-sm text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--color-success)]">+61%</span> brand growth (6mo)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertsPanelCard() {
  const severityColors = {
    high: {
      bg: 'bg-[var(--color-error-muted)]',
      border: 'border-[var(--color-error)]',
      text: 'text-[var(--color-error)]',
      badge: 'error' as const,
    },
    medium: {
      bg: 'bg-[var(--color-warning-muted)]',
      border: 'border-[var(--color-warning)]',
      text: 'text-[var(--color-warning)]',
      badge: 'warning' as const,
    },
    low: {
      bg: 'bg-[var(--color-primary-muted)]',
      border: 'border-[var(--color-primary)]',
      text: 'text-[var(--color-primary)]',
      badge: 'primary' as const,
    },
  };

  return (
    <Card className="border-l-4 border-l-[var(--color-warning)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[var(--color-warning)]" />
            <CardTitle>Compliance Alerts</CardTitle>
          </div>
          <Badge variant="warning">{mockAlerts.length} Active</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockAlerts.map((alert) => {
            const colors = severityColors[alert.severity as keyof typeof severityColors];
            return (
              <div
                key={alert.id}
                className={`p-3 rounded-[var(--radius-md)] ${colors.bg} border ${colors.border}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-[var(--text-primary)]">
                        {alert.athlete}
                      </span>
                      <Badge variant={colors.badge} size="sm">
                        {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">{alert.reason}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {alert.brand && `${alert.brand} • `}
                      {formatRelativeTime(alert.createdAt)}
                    </p>
                  </div>
                  {alert.actionRequired && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button variant="primary" size="sm">
                        Review
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
          <a
            href="/director/compliance"
            className="text-sm text-[var(--color-primary)] hover:underline flex items-center gap-1"
          >
            View all compliance issues
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function DirectorDashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Program Overview
          </h1>
          <p className="text-[var(--text-muted)]">
            Duke University Athletics NIL Program
          </p>
        </div>
        <Badge variant="primary">Athletic Director</Badge>
      </div>

      {/* Stats Grid - 3x2 layout */}
      <Suspense fallback={<SkeletonStats />}>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Row 1 */}
          <StatCard
            title="Total Athletes"
            value={mockStats.totalAthletes.toString()}
            icon={<Users className="h-5 w-5" />}
            trend={12}
            trendDirection="up"
          />
          <StatCard
            title="Total Brands"
            value={mockStats.totalBrands.toString()}
            icon={<Building className="h-5 w-5" />}
            trend={8}
            trendDirection="up"
          />
          <StatCard
            title="Total Active Deals"
            value={mockStats.totalActiveDeals.toString()}
            icon={<Handshake className="h-5 w-5" />}
            trend={15}
            trendDirection="up"
          />
          {/* Row 2 */}
          <StatCard
            title="Platform Revenue"
            value={formatCurrency(mockStats.platformRevenue)}
            icon={<DollarSign className="h-5 w-5" />}
            trend={22}
            trendDirection="up"
          />
          <StatCard
            title="Monthly Growth"
            value={formatPercentage(mockStats.monthlyGrowth)}
            icon={<TrendingUp className="h-5 w-5" />}
            trend={3}
            trendDirection="up"
          />
          <StatCard
            title="Compliance Score"
            value={`${mockStats.complianceScore}%`}
            icon={<Shield className="h-5 w-5" />}
            trend={2}
            trendDirection="down"
          />
        </div>
      </Suspense>

      {/* Main Content - Activity Feed + Growth Chart */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Suspense fallback={<SkeletonCard />}>
          <ActivityFeedCard />
        </Suspense>
        <Suspense fallback={<SkeletonCard />}>
          <GrowthChartCard />
        </Suspense>
      </div>

      {/* Alerts Panel - Full Width */}
      <Suspense fallback={<SkeletonCard />}>
        <AlertsPanelCard />
      </Suspense>
    </div>
  );
}
