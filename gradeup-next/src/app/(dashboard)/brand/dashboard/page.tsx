'use client';

import {
  DollarSign,
  Users,
  Target,
  TrendingUp,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { formatCurrency, formatCompactNumber } from '@/lib/utils';
import { useRequireAuth } from '@/context';
import { useBrandAnalytics, useBrandCampaigns, useBrandShortlist, useBrandDeals } from '@/lib/hooks/use-data';
import type { Campaign } from '@/lib/services/brand';
import type { Athlete } from '@/types';

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

interface RecentMatchesCardProps {
  athletes: Athlete[] | null;
  loading: boolean;
}

function RecentMatchesCard({ athletes, loading }: RecentMatchesCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recommended Athletes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayAthletes = athletes?.slice(0, 5) || [];

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
        {displayAthletes.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">
            No athletes in your shortlist yet
          </p>
        ) : (
          <div className="space-y-4">
            {displayAthletes.map((athlete) => {
              const name = `${athlete.first_name || ''} ${athlete.last_name || ''}`.trim() || 'Unknown Athlete';
              const schoolName = athlete.school?.name || 'School';
              const sportName = athlete.sport?.name || 'Sport';
              return (
                <div
                  key={athlete.id}
                  className="flex items-center gap-4 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
                >
                  <Avatar
                    src={athlete.avatar_url || undefined}
                    fallback={name.charAt(0)}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--text-primary)] truncate">
                      {name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {schoolName} • {sportName}
                    </p>
                  </div>
                  <div className="text-right">
                    {athlete.gpa && (
                      <Badge variant="success" size="sm">
                        {athlete.gpa.toFixed(2)} GPA
                      </Badge>
                    )}
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

interface ActiveCampaignsCardProps {
  campaigns: Campaign[] | null;
  loading: boolean;
}

function ActiveCampaignsCard({ campaigns, loading }: ActiveCampaignsCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeCampaigns = campaigns?.filter(c => c.status === 'active').slice(0, 3) || [];

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
        {activeCampaigns.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">
            No active campaigns yet
          </p>
        ) : (
          <div className="space-y-4">
            {activeCampaigns.map((campaign) => {
              // For now, we don't have spent tracking, so show budget as capacity
              return (
                <div
                  key={campaign.id}
                  className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-[var(--text-primary)]">
                      {campaign.title}
                    </h4>
                    <StatusBadge status={campaign.status} size="sm" />
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--text-muted)]">Budget</span>
                      <span className="text-[var(--text-primary)]">
                        {formatCurrency(campaign.budget)}
                      </span>
                    </div>
                  </div>
                  {campaign.description && (
                    <p className="text-sm text-[var(--text-muted)] line-clamp-2">
                      {campaign.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function BrandDashboardPage() {
  // Require auth and get brand data
  const { roleData, isLoading: authLoading } = useRequireAuth({ allowedRoles: ['brand'] });
  const brandData = roleData as { id: string; company_name: string; is_verified: boolean } | null;

  // Fetch dashboard data
  const { data: analytics, loading: analyticsLoading } = useBrandAnalytics(brandData?.id);
  const { data: campaigns, loading: campaignsLoading } = useBrandCampaigns(brandData?.id);
  const { data: shortlist, loading: shortlistLoading } = useBrandShortlist(brandData?.id);
  const { data: deals, loading: dealsLoading } = useBrandDeals(brandData?.id);

  // Show loading state while auth is checking
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  const companyName = brandData?.company_name || 'Brand';
  const isVerified = brandData?.is_verified ?? false;
  const activeCampaignsCount = campaigns?.filter(c => c.status === 'active').length || 0;
  const activeDealsCount = deals?.filter(d => d.status === 'active' || d.status === 'accepted').length || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Welcome back, {companyName}!
          </h1>
          <p className="text-[var(--text-muted)]">
            Here's an overview of your NIL partnerships
          </p>
        </div>
        {isVerified && <Badge variant="success">Verified Brand</Badge>}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Spent"
          value={analyticsLoading ? '...' : formatCurrency(analytics?.total_spent || 0)}
          icon={DollarSign}
        />
        <StatsCard
          title="Active Partnerships"
          value={dealsLoading ? '...' : activeDealsCount.toString()}
          icon={Users}
        />
        <StatsCard
          title="Active Campaigns"
          value={campaignsLoading ? '...' : activeCampaignsCount.toString()}
          icon={Target}
        />
        <StatsCard
          title="Average ROI"
          value={analyticsLoading ? '...' : `${(analytics?.avg_roi || 0).toFixed(1)}x`}
          icon={TrendingUp}
        />
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-6">
        <RecentMatchesCard athletes={shortlist} loading={shortlistLoading} />
        <ActiveCampaignsCard campaigns={campaigns} loading={campaignsLoading} />
      </div>
    </div>
  );
}
