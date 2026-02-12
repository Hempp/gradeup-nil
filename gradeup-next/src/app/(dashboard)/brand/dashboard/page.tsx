import { Suspense } from 'react';
import {
  DollarSign,
  Users,
  Target,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { SkeletonStats, SkeletonCard } from '@/components/ui/skeleton';
import { formatCurrency, formatCompactNumber, formatRelativeTime } from '@/lib/utils';

// Mock data
const mockStats = {
  totalSpent: 125000,
  activePartnerships: 12,
  activeCampaigns: 4,
  avgROI: 3.2,
};

const mockRecentMatches = [
  {
    id: '1',
    name: 'Marcus Johnson',
    school: 'Duke University',
    sport: 'Basketball',
    gpa: 3.87,
    followers: 125000,
    matchScore: 95,
  },
  {
    id: '2',
    name: 'Sarah Williams',
    school: 'Stanford University',
    sport: 'Soccer',
    gpa: 3.92,
    followers: 89000,
    matchScore: 92,
  },
  {
    id: '3',
    name: 'Jordan Davis',
    school: 'Ohio State',
    sport: 'Football',
    gpa: 3.65,
    followers: 210000,
    matchScore: 88,
  },
];

const mockActiveCampaigns = [
  {
    id: '1',
    name: 'Spring Collection Launch',
    budget: 50000,
    spent: 32500,
    athletes: 5,
    status: 'active' as const,
  },
  {
    id: '2',
    name: 'Summer Sports Partnership',
    budget: 75000,
    spent: 15000,
    athletes: 8,
    status: 'active' as const,
  },
];

function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down';
  trendValue?: string;
}) {
  return (
    <Card hover>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-[var(--text-muted)] mb-1">{title}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
            {trend && trendValue && (
              <div className="flex items-center gap-1 mt-2">
                <ArrowUpRight className="h-4 w-4 text-[var(--color-success)]" />
                <span className="text-sm text-[var(--color-success)]">{trendValue}</span>
              </div>
            )}
          </div>
          <div className="h-12 w-12 rounded-[var(--radius-lg)] bg-[var(--color-secondary)]/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-[var(--color-secondary)]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentMatchesCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recommended Athletes</CardTitle>
          <a
            href="/brand/discover"
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            View all
          </a>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockRecentMatches.map((athlete) => (
            <div
              key={athlete.id}
              className="flex items-center gap-4 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
            >
              <Avatar fallback={athlete.name.charAt(0)} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--text-primary)] truncate">
                  {athlete.name}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {athlete.school} • {athlete.sport}
                </p>
              </div>
              <div className="text-right">
                <Badge variant="success" size="sm">
                  {athlete.matchScore}% Match
                </Badge>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {formatCompactNumber(athlete.followers)} followers
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ActiveCampaignsCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Active Campaigns</CardTitle>
          <a
            href="/brand/campaigns"
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            View all
          </a>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockActiveCampaigns.map((campaign) => {
            const progress = (campaign.spent / campaign.budget) * 100;
            return (
              <div
                key={campaign.id}
                className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-[var(--text-primary)]">
                    {campaign.name}
                  </h4>
                  <StatusBadge status={campaign.status} size="sm" />
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--text-muted)]">Budget Used</span>
                    <span className="text-[var(--text-primary)]">
                      {formatCurrency(campaign.spent)} / {formatCurrency(campaign.budget)}
                    </span>
                  </div>
                  <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-magenta)] rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <p className="text-sm text-[var(--text-muted)]">
                  {campaign.athletes} athletes partnered
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BrandDashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Welcome back, Nike! 👋
          </h1>
          <p className="text-[var(--text-muted)]">
            Here's an overview of your NIL partnerships
          </p>
        </div>
        <Badge variant="success">Verified Brand</Badge>
      </div>

      {/* Stats Grid */}
      <Suspense fallback={<SkeletonStats />}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Spent"
            value={formatCurrency(mockStats.totalSpent)}
            icon={DollarSign}
            trend="up"
            trendValue="+15.3%"
          />
          <StatsCard
            title="Active Partnerships"
            value={mockStats.activePartnerships.toString()}
            icon={Users}
            trend="up"
            trendValue="+4"
          />
          <StatsCard
            title="Active Campaigns"
            value={mockStats.activeCampaigns.toString()}
            icon={Target}
          />
          <StatsCard
            title="Average ROI"
            value={`${mockStats.avgROI}x`}
            icon={TrendingUp}
            trend="up"
            trendValue="+0.5x"
          />
        </div>
      </Suspense>

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Suspense fallback={<SkeletonCard />}>
          <RecentMatchesCard />
        </Suspense>
        <Suspense fallback={<SkeletonCard />}>
          <ActiveCampaignsCard />
        </Suspense>
      </div>
    </div>
  );
}
