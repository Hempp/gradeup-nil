'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Users,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { ErrorState } from '@/components/ui/error-state';
import { NoCampaigns, NoAthletes, NoRecommendations } from '@/components/ui/empty-state';
import { SkeletonList, SkeletonStatCard } from '@/components/ui/skeleton';
import { GPABadge } from '@/components/ui/gpa-ring';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader, StatsGrid, ContentGrid } from '@/components/ui/section-header';
import { formatCurrency } from '@/lib/utils';
import { useRequireAuth } from '@/context';
import { useBrandAnalytics, useBrandCampaigns, useBrandShortlist, useBrandDeals } from '@/lib/hooks/use-data';
import type { Campaign } from '@/lib/services/brand';
import type { Athlete } from '@/types';
import { AthleteRecommendations } from '@/components/ai';

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
          <SkeletonList items={5} />
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
          <Link
            href="/brand/discover"
            className="text-sm text-[var(--color-primary)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-sm"
          >
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {displayAthletes.length === 0 ? (
          <NoAthletes onInvite={() => window.location.href = '/brand/discover'} />
        ) : (
          <div className="space-y-4">
            {displayAthletes.map((athlete) => {
              const name = `${athlete.first_name || ''} ${athlete.last_name || ''}`.trim() || 'Unknown Athlete';
              const schoolName = athlete.school?.name || 'School';
              const sportName = athlete.sport?.name || 'Sport';
              return (
                <Link
                  key={athlete.id}
                  href={`/brand/athletes/${athlete.id}`}
                  className="flex items-center gap-4 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-card-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] transition-colors"
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
                      <GPABadge gpa={athlete.gpa} size="sm" />
                    )}
                  </div>
                </Link>
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
          <SkeletonList items={3} />
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
          <Link
            href="/brand/campaigns"
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {activeCampaigns.length === 0 ? (
          <NoCampaigns onCreate={() => window.location.href = '/brand/campaigns/new'} />
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
  const [isRetrying, setIsRetrying] = useState(false);

  // Require auth and get brand data
  const { roleData, isLoading: authLoading } = useRequireAuth({ allowedRoles: ['brand'] });
  const brandData = roleData as { id: string; company_name: string; is_verified: boolean } | null;

  // Fetch dashboard data
  const { data: analytics, loading: analyticsLoading, error: analyticsError, refetch: refetchAnalytics } = useBrandAnalytics(brandData?.id);
  const { data: campaigns, loading: campaignsLoading, error: campaignsError, refetch: refetchCampaigns } = useBrandCampaigns(brandData?.id);
  const { data: shortlist, loading: shortlistLoading, error: shortlistError, refetch: refetchShortlist } = useBrandShortlist(brandData?.id);
  const { data: deals, loading: dealsLoading, error: dealsError, refetch: refetchDeals } = useBrandDeals(brandData?.id);

  // Aggregate errors
  const hasError = analyticsError || campaignsError || shortlistError || dealsError;
  const errorMessage = analyticsError?.message || campaignsError?.message || shortlistError?.message || dealsError?.message;

  // Handle retry
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    console.error('Brand dashboard data fetch error:', { analyticsError, campaignsError, shortlistError, dealsError });
    try {
      await Promise.all([
        refetchAnalytics(),
        refetchCampaigns(),
        refetchShortlist(),
        refetchDeals(),
      ]);
    } catch (err) {
      console.error('Error during retry:', err);
    } finally {
      setIsRetrying(false);
    }
  }, [analyticsError, campaignsError, shortlistError, dealsError, refetchAnalytics, refetchCampaigns, refetchShortlist, refetchDeals]);

  // Show loading state while auth is checking
  if (authLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-72 bg-[var(--bg-tertiary)] rounded-[var(--radius-md)] animate-shimmer" />
            <div className="h-4 w-56 bg-[var(--bg-tertiary)] rounded-[var(--radius-sm)] animate-shimmer" />
          </div>
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Show error state if data fetch failed
  if (hasError && !analyticsLoading && !campaignsLoading && !shortlistLoading && !dealsLoading) {
    return (
      <Card className="animate-fade-in">
        <ErrorState
          errorType="data"
          title="Failed to load dashboard"
          description={errorMessage || 'We could not load your dashboard data. Please try again.'}
          onRetry={handleRetry}
          isRetrying={isRetrying}
        />
      </Card>
    );
  }

  const companyName = brandData?.company_name || 'Brand';
  const isVerified = brandData?.is_verified ?? false;
  const activeCampaignsCount = campaigns?.filter(c => c.status === 'active').length || 0;
  const activeDealsCount = deals?.filter(d => d.status === 'active' || d.status === 'accepted').length || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title={`Welcome back, ${companyName}!`}
        description="Here's an overview of your NIL partnerships"
        badge={isVerified && <Badge variant="success">Verified Brand</Badge>}
      />

      {/* Stats Grid */}
      <StatsGrid cols={4}>
        <StatCard
          title="Total Spent"
          value={analyticsLoading ? '...' : formatCurrency(analytics?.total_spent || 0)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="Active Partnerships"
          value={dealsLoading ? '...' : activeDealsCount.toString()}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Active Campaigns"
          value={campaignsLoading ? '...' : activeCampaignsCount.toString()}
          icon={<Target className="h-5 w-5" />}
        />
        <StatCard
          title="Average ROI"
          value={analyticsLoading ? '...' : `${(analytics?.avg_roi || 0).toFixed(1)}x`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </StatsGrid>

      {/* AI Athlete Recommendations */}
      <AthleteRecommendations
        athletes={[]}
        criteria={{
          campaignGoals: ['brand_awareness', 'social_engagement'],
          budget: 10000,
          dealType: 'social_post',
          preferredSports: ['Football', 'Basketball'],
          minGpa: 3.0,
        }}
        maxResults={6}
        showBudgetAnalysis={true}
      />

      {/* Main Content */}
      <ContentGrid ratio="1:1">
        <RecentMatchesCard athletes={shortlist} loading={shortlistLoading} />
        <ActiveCampaignsCard campaigns={campaigns} loading={campaignsLoading} />
      </ContentGrid>
    </div>
  );
}
