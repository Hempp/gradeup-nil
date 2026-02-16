'use client';

import { memo, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Users, DollarSign, Calendar, MoreVertical, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { ErrorState } from '@/components/ui/error-state';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useBrandCampaigns, type EnrichedCampaign } from '@/lib/hooks/use-campaigns-data';

// Memoized to prevent re-renders when parent state changes (e.g., filtering)
const CampaignCard = memo(function CampaignCard({ campaign }: { campaign: EnrichedCampaign }) {
  const progress = campaign.budget > 0 ? (campaign.spent / campaign.budget) * 100 : 0;

  return (
    <Card hover className="group">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                {campaign.name}
              </h3>
              <StatusBadge status={campaign.status} size="sm" />
            </div>
            <p className="text-sm text-[var(--text-muted)] line-clamp-2">
              {campaign.description}
            </p>
          </div>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-[var(--radius-sm)] bg-[var(--bg-tertiary)] flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-[var(--color-primary)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Budget</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {formatCurrency(campaign.budget)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-[var(--radius-sm)] bg-[var(--bg-tertiary)] flex items-center justify-center">
              <Users className="h-4 w-4 text-[var(--color-secondary)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Athletes</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {campaign.athletes}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-[var(--radius-sm)] bg-[var(--bg-tertiary)] flex items-center justify-center">
              <Calendar className="h-4 w-4 text-[var(--color-warning)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">End Date</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {campaign.endDate ? formatDate(campaign.endDate) : 'Ongoing'}
              </p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-[var(--text-muted)]">Spent</span>
            <span className="text-[var(--text-primary)]">
              {formatCurrency(campaign.spent)} / {formatCurrency(campaign.budget)}
            </span>
          </div>
          <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-magenta)] rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Target Sports */}
        <div className="flex flex-wrap gap-2 mb-4">
          {campaign.targetSports.map((sport) => (
            <Badge key={sport} variant="outline" size="sm">
              {sport}
            </Badge>
          ))}
        </div>

        {/* View Details Link */}
        <Link
          href={`/brand/campaigns/${campaign.id}`}
          className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
        >
          <Eye className="h-4 w-4" />
          View Details
        </Link>
      </CardContent>
    </Card>
  );
});

function CampaignSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="pt-6">
        <div className="h-6 w-48 bg-[var(--bg-tertiary)] rounded mb-2" />
        <div className="h-4 w-64 bg-[var(--bg-tertiary)] rounded mb-4" />
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-[var(--bg-tertiary)] rounded" />
          ))}
        </div>
        <div className="h-2 w-full bg-[var(--bg-tertiary)] rounded mb-4" />
        <div className="flex gap-2 mb-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-6 w-20 bg-[var(--bg-tertiary)] rounded-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BrandCampaignsPage() {
  const { data: campaigns, isLoading, error: campaignsError, refetch } = useBrandCampaigns();
  const [isRetrying, setIsRetrying] = useState(false);

  const activeCampaigns = campaigns.filter((c) => c.status === 'active');
  const draftCampaigns = campaigns.filter((c) => c.status === 'draft' || c.status === 'pending');
  const completedCampaigns = campaigns.filter((c) => c.status === 'completed');

  // Handle retry
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    console.error('Campaigns fetch error:', campaignsError);
    try {
      refetch();
    } finally {
      setIsRetrying(false);
    }
  }, [campaignsError, refetch]);

  // Show error state if data fetch failed
  if (campaignsError && !isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Campaigns</h1>
            <p className="text-[var(--text-muted)]">
              Manage your NIL marketing campaigns
            </p>
          </div>
          <Link href="/brand/campaigns/new">
            <Button variant="primary">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </Link>
        </div>
        <Card>
          <ErrorState
            errorType="data"
            title="Failed to load campaigns"
            description={campaignsError.message || 'We could not load your campaigns. Please try again.'}
            onRetry={handleRetry}
            isRetrying={isRetrying}
          />
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Campaigns</h1>
            <p className="text-[var(--text-muted)]">
              Manage your NIL marketing campaigns
            </p>
          </div>
          <Link href="/brand/campaigns/new">
            <Button variant="primary">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </Link>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <CampaignSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Campaigns</h1>
          <p className="text-[var(--text-muted)]">
            Manage your NIL marketing campaigns
          </p>
        </div>
        <Link href="/brand/campaigns/new">
          <Button variant="primary">
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </Link>
      </div>

      {/* Active Campaigns */}
      {activeCampaigns.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Active Campaigns ({activeCampaigns.length})
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {activeCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        </section>
      )}

      {/* Draft Campaigns */}
      {draftCampaigns.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Drafts ({draftCampaigns.length})
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {draftCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        </section>
      )}

      {/* Completed Campaigns */}
      {completedCampaigns.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Completed ({completedCampaigns.length})
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {completedCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
