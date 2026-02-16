'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Calendar,
  DollarSign,
  Users,
  Target,
  TrendingUp,
  Eye,
  BarChart3,
  Check,
  X,
  Clock,
  MessageSquare,
  Instagram,
  Video,
  Image as ImageIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate, formatCompactNumber } from '@/lib/utils';
import type { DealStatus } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface CampaignAthlete extends Record<string, unknown> {
  id: string;
  name: string;
  school: string;
  sport: string;
  avatar?: string;
  status: 'invited' | 'accepted' | 'declined' | 'completed';
  deliverables: number;
  completedDeliverables: number;
  earnings: number;
}

interface Deliverable {
  id: string;
  athleteId: string;
  athleteName: string;
  platform: string;
  contentType: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  dueDate: string;
  submittedAt?: string;
  link?: string;
}

interface CampaignData {
  id: string;
  name: string;
  description: string;
  status: DealStatus;
  budget: number;
  spent: number;
  startDate: string;
  endDate: string;
  targetSports: string[];
  athletes: CampaignAthlete[];
  deliverables: Deliverable[];
  stats: {
    totalReach: number;
    totalEngagement: number;
    avgEngagementRate: number;
    contentPieces: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════

const mockCampaign: CampaignData = {
  id: '1',
  name: 'Spring Collection Launch',
  description: 'Promote our new spring athletic wear collection featuring our latest performance materials. Athletes will create content showcasing the new products in their training and competition environments.',
  status: 'active',
  budget: 50000,
  spent: 32500,
  startDate: '2024-02-01',
  endDate: '2024-04-30',
  targetSports: ['Basketball', 'Soccer', 'Volleyball'],
  athletes: [
    { id: '1', name: 'Marcus Johnson', school: 'Duke University', sport: 'Basketball', status: 'completed', deliverables: 4, completedDeliverables: 4, earnings: 12500 },
    { id: '2', name: 'Sarah Williams', school: 'Stanford University', sport: 'Soccer', status: 'accepted', deliverables: 3, completedDeliverables: 2, earnings: 8500 },
    { id: '3', name: 'Tyler Brooks', school: 'University of Michigan', sport: 'Basketball', status: 'accepted', deliverables: 4, completedDeliverables: 1, earnings: 4000 },
    { id: '4', name: 'Mia Rodriguez', school: 'University of Texas', sport: 'Volleyball', status: 'invited', deliverables: 3, completedDeliverables: 0, earnings: 0 },
    { id: '5', name: 'Emma Chen', school: 'UCLA', sport: 'Gymnastics', status: 'declined', deliverables: 0, completedDeliverables: 0, earnings: 0 },
  ],
  deliverables: [
    { id: 'd1', athleteId: '1', athleteName: 'Marcus Johnson', platform: 'Instagram', contentType: 'Reel', status: 'approved', dueDate: '2024-02-15', submittedAt: '2024-02-14', link: 'https://instagram.com/reel/123' },
    { id: 'd2', athleteId: '1', athleteName: 'Marcus Johnson', platform: 'Instagram', contentType: 'Story', status: 'approved', dueDate: '2024-02-20', submittedAt: '2024-02-19' },
    { id: 'd3', athleteId: '1', athleteName: 'Marcus Johnson', platform: 'TikTok', contentType: 'Video', status: 'approved', dueDate: '2024-03-01', submittedAt: '2024-02-28' },
    { id: 'd4', athleteId: '1', athleteName: 'Marcus Johnson', platform: 'Instagram', contentType: 'Feed Post', status: 'approved', dueDate: '2024-03-15', submittedAt: '2024-03-14' },
    { id: 'd5', athleteId: '2', athleteName: 'Sarah Williams', platform: 'Instagram', contentType: 'Reel', status: 'approved', dueDate: '2024-02-20', submittedAt: '2024-02-19' },
    { id: 'd6', athleteId: '2', athleteName: 'Sarah Williams', platform: 'TikTok', contentType: 'Video', status: 'submitted', dueDate: '2024-03-10', submittedAt: '2024-03-09' },
    { id: 'd7', athleteId: '2', athleteName: 'Sarah Williams', platform: 'Instagram', contentType: 'Story', status: 'pending', dueDate: '2024-04-01' },
    { id: 'd8', athleteId: '3', athleteName: 'Tyler Brooks', platform: 'Instagram', contentType: 'Reel', status: 'approved', dueDate: '2024-02-25', submittedAt: '2024-02-24' },
    { id: 'd9', athleteId: '3', athleteName: 'Tyler Brooks', platform: 'TikTok', contentType: 'Video', status: 'in_progress', dueDate: '2024-03-15' },
    { id: 'd10', athleteId: '3', athleteName: 'Tyler Brooks', platform: 'Instagram', contentType: 'Feed Post', status: 'pending', dueDate: '2024-03-25' },
    { id: 'd11', athleteId: '3', athleteName: 'Tyler Brooks', platform: 'Instagram', contentType: 'Story', status: 'pending', dueDate: '2024-04-05' },
  ],
  stats: {
    totalReach: 2450000,
    totalEngagement: 185000,
    avgEngagementRate: 7.5,
    contentPieces: 7,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

type TabId = 'overview' | 'athletes' | 'deliverables' | 'analytics';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: Eye },
  { id: 'athletes', label: 'Athletes', icon: Users },
  { id: 'deliverables', label: 'Deliverables', icon: Target },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function getAthleteStatusBadge(status: CampaignAthlete['status']) {
  const config: Record<typeof status, { variant: 'success' | 'warning' | 'error' | 'default'; label: string }> = {
    invited: { variant: 'warning', label: 'Invited' },
    accepted: { variant: 'success', label: 'Active' },
    declined: { variant: 'error', label: 'Declined' },
    completed: { variant: 'success', label: 'Completed' },
  };
  const { variant, label } = config[status];
  return <Badge variant={variant} size="sm">{label}</Badge>;
}

function getDeliverableStatusBadge(status: Deliverable['status']) {
  const config: Record<typeof status, { variant: 'success' | 'warning' | 'error' | 'default' | 'primary'; label: string }> = {
    pending: { variant: 'default', label: 'Pending' },
    in_progress: { variant: 'warning', label: 'In Progress' },
    submitted: { variant: 'primary', label: 'Submitted' },
    approved: { variant: 'success', label: 'Approved' },
    rejected: { variant: 'error', label: 'Rejected' },
  };
  const { variant, label } = config[status];
  return <Badge variant={variant} size="sm">{label}</Badge>;
}

function getPlatformIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return <Instagram className="h-4 w-4 text-[#E4405F]" />;
    case 'tiktok':
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
        </svg>
      );
    case 'youtube':
      return <Video className="h-4 w-4 text-[#FF0000]" />;
    default:
      return <ImageIcon className="h-4 w-4" />;
  }
}

function OverviewTab({ campaign }: { campaign: CampaignData }) {
  const progress = (campaign.spent / campaign.budget) * 100;
  const acceptedAthletes = campaign.athletes.filter(a => a.status === 'accepted' || a.status === 'completed').length;
  const completedDeliverables = campaign.deliverables.filter(d => d.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Budget"
          value={formatCurrency(campaign.budget)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="Amount Spent"
          value={formatCurrency(campaign.spent)}
          trend={65}
          trendDirection="up"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Active Athletes"
          value={acceptedAthletes}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Approved Content"
          value={completedDeliverables}
          icon={<Check className="h-5 w-5" />}
        />
      </div>

      {/* Campaign Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-[var(--text-muted)] mb-1">Description</h4>
                <p className="text-[var(--text-secondary)]">{campaign.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border-color)]">
                <div>
                  <h4 className="text-sm font-medium text-[var(--text-muted)] mb-1">Start Date</h4>
                  <p className="text-[var(--text-primary)] font-medium">{formatDate(campaign.startDate)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-[var(--text-muted)] mb-1">End Date</h4>
                  <p className="text-[var(--text-primary)] font-medium">{formatDate(campaign.endDate)}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border-color)]">
                <h4 className="text-sm font-medium text-[var(--text-muted)] mb-2">Target Sports</h4>
                <div className="flex flex-wrap gap-2">
                  {campaign.targetSports.map((sport) => (
                    <Badge key={sport} variant="outline">{sport}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-[var(--color-primary)]">
                  {Math.round(progress)}%
                </div>
                <p className="text-sm text-[var(--text-muted)]">of budget used</p>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[var(--text-muted)]">Spent</span>
                  <span className="font-medium text-[var(--text-primary)]">{formatCurrency(campaign.spent)}</span>
                </div>
                <div className="h-3 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-magenta)] rounded-full transition-all"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-[var(--text-muted)]">Remaining</span>
                  <span className="font-medium text-[var(--color-success)]">{formatCurrency(campaign.budget - campaign.spent)}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border-color)]">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{campaign.athletes.length}</p>
                    <p className="text-xs text-[var(--text-muted)]">Total Athletes</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{campaign.deliverables.length}</p>
                    <p className="text-xs text-[var(--text-muted)]">Deliverables</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaign.deliverables
              .filter(d => d.submittedAt)
              .sort((a, b) => new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime())
              .slice(0, 5)
              .map((deliverable) => (
                <div key={deliverable.id} className="flex items-center gap-4 p-3 bg-[var(--bg-tertiary)] rounded-[var(--radius-md)]">
                  <div className="h-10 w-10 rounded-full bg-[var(--color-primary-muted)] flex items-center justify-center">
                    {getPlatformIcon(deliverable.platform)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[var(--text-primary)]">
                      {deliverable.athleteName} submitted a {deliverable.contentType}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {deliverable.platform} - {formatDate(deliverable.submittedAt!)}
                    </p>
                  </div>
                  {getDeliverableStatusBadge(deliverable.status)}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AthletesTab({ campaign }: { campaign: CampaignData }) {
  const columns: DataTableColumn<CampaignAthlete>[] = [
    {
      key: 'name',
      header: 'Athlete',
      render: (_, athlete) => (
        <div className="flex items-center gap-3">
          <Avatar fallback={athlete.name.split(' ').map(n => n[0]).join('')} size="sm" />
          <div>
            <p className="font-medium text-[var(--text-primary)]">{athlete.name}</p>
            <p className="text-sm text-[var(--text-muted)]">{athlete.school}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'sport',
      header: 'Sport',
      render: (_, athlete) => <Badge variant="outline">{athlete.sport}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, athlete) => getAthleteStatusBadge(athlete.status),
    },
    {
      key: 'deliverables',
      header: 'Progress',
      render: (_, athlete) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden w-24">
            <div
              className="h-full bg-[var(--color-success)] rounded-full"
              style={{ width: `${athlete.deliverables > 0 ? (athlete.completedDeliverables / athlete.deliverables) * 100 : 0}%` }}
            />
          </div>
          <span className="text-sm text-[var(--text-muted)]">
            {athlete.completedDeliverables}/{athlete.deliverables}
          </span>
        </div>
      ),
    },
    {
      key: 'earnings',
      header: 'Earnings',
      render: (_, athlete) => (
        <span className="font-medium text-[var(--color-primary)]">
          {formatCurrency(athlete.earnings)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (_, athlete) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            View
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[var(--color-success-muted)] flex items-center justify-center">
              <Check className="h-5 w-5 text-[var(--color-success)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {campaign.athletes.filter(a => a.status === 'accepted' || a.status === 'completed').length}
              </p>
              <p className="text-sm text-[var(--text-muted)]">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[var(--color-warning-muted)] flex items-center justify-center">
              <Clock className="h-5 w-5 text-[var(--color-warning)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {campaign.athletes.filter(a => a.status === 'invited').length}
              </p>
              <p className="text-sm text-[var(--text-muted)]">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[var(--color-primary-muted)] flex items-center justify-center">
              <Users className="h-5 w-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {campaign.athletes.filter(a => a.status === 'completed').length}
              </p>
              <p className="text-sm text-[var(--text-muted)]">Completed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[var(--color-error-muted)] flex items-center justify-center">
              <X className="h-5 w-5 text-[var(--color-error)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {campaign.athletes.filter(a => a.status === 'declined').length}
              </p>
              <p className="text-sm text-[var(--text-muted)]">Declined</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Athletes Table */}
      <DataTable
        columns={columns}
        data={campaign.athletes}
        keyExtractor={(athlete) => athlete.id}
      />
    </div>
  );
}

function DeliverablesTab({ campaign }: { campaign: CampaignData }) {
  // Group deliverables by athlete
  const groupedByAthlete = campaign.athletes
    .filter(a => a.status !== 'declined')
    .map((athlete) => ({
      athlete,
      deliverables: campaign.deliverables.filter(d => d.athleteId === athlete.id),
    }));

  const handleApprove = (_deliverableId: string) => {
    // TODO: Implement deliverable approval via API
  };

  const handleReject = (_deliverableId: string) => {
    // TODO: Implement deliverable rejection via API
  };

  return (
    <div className="space-y-6">
      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {(['pending', 'in_progress', 'submitted', 'approved', 'rejected'] as const).map((status) => {
          const count = campaign.deliverables.filter(d => d.status === status).length;
          return (
            <Card key={status} className="p-4 text-center">
              <p className="text-2xl font-bold text-[var(--text-primary)]">{count}</p>
              <p className="text-sm text-[var(--text-muted)] capitalize">{status.replace('_', ' ')}</p>
            </Card>
          );
        })}
      </div>

      {/* Grouped Deliverables */}
      {groupedByAthlete.map(({ athlete, deliverables }) => (
        <Card key={athlete.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar fallback={athlete.name.split(' ').map(n => n[0]).join('')} size="md" />
                <div>
                  <CardTitle className="text-base">{athlete.name}</CardTitle>
                  <p className="text-sm text-[var(--text-muted)]">{athlete.school} - {athlete.sport}</p>
                </div>
              </div>
              <Badge variant="outline">
                {deliverables.filter(d => d.status === 'approved').length}/{deliverables.length} completed
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {deliverables.length > 0 ? (
              <div className="space-y-3">
                {deliverables.map((deliverable) => (
                  <div
                    key={deliverable.id}
                    className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-[var(--radius-md)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] flex items-center justify-center">
                        {getPlatformIcon(deliverable.platform)}
                      </div>
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{deliverable.contentType}</p>
                        <p className="text-sm text-[var(--text-muted)]">
                          {deliverable.platform} - Due: {formatDate(deliverable.dueDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {getDeliverableStatusBadge(deliverable.status)}

                      {deliverable.status === 'submitted' && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApprove(deliverable.id)}
                            className="text-[var(--color-success)] hover:bg-[var(--color-success-muted)]"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(deliverable.id)}
                            className="text-[var(--color-error)] hover:bg-[var(--color-error-muted)]"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {deliverable.link && (
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-[var(--text-muted)] py-4">No deliverables assigned</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AnalyticsTab({ campaign }: { campaign: CampaignData }) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Reach"
          value={formatCompactNumber(campaign.stats.totalReach)}
          trend={23}
          trendDirection="up"
          icon={<Eye className="h-5 w-5" />}
        />
        <StatCard
          title="Total Engagement"
          value={formatCompactNumber(campaign.stats.totalEngagement)}
          trend={18}
          trendDirection="up"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Avg. Engagement Rate"
          value={`${campaign.stats.avgEngagementRate}%`}
          trend={2.3}
          trendDirection="up"
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <StatCard
          title="Content Pieces"
          value={campaign.stats.contentPieces}
          icon={<ImageIcon className="h-5 w-5" />}
        />
      </div>

      {/* Placeholder Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Reach Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-[var(--bg-tertiary)] rounded-[var(--radius-md)] flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-2" />
                <p className="text-[var(--text-muted)]">Chart coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engagement by Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-[var(--bg-tertiary)] rounded-[var(--radius-md)] flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-2" />
                <p className="text-[var(--text-muted)]">Chart coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { platform: 'Instagram', reach: 1500000, engagement: 120000, rate: 8.0 },
              { platform: 'TikTok', reach: 800000, engagement: 55000, rate: 6.9 },
              { platform: 'Twitter/X', reach: 150000, engagement: 10000, rate: 6.7 },
            ].map((item) => (
              <div key={item.platform} className="flex items-center gap-4 p-4 bg-[var(--bg-tertiary)] rounded-[var(--radius-md)]">
                <div className="h-12 w-12 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] flex items-center justify-center">
                  {getPlatformIcon(item.platform)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--text-primary)]">{item.platform}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-[var(--text-muted)]">
                      Reach: <span className="text-[var(--text-primary)]">{formatCompactNumber(item.reach)}</span>
                    </span>
                    <span className="text-sm text-[var(--text-muted)]">
                      Engagement: <span className="text-[var(--text-primary)]">{formatCompactNumber(item.engagement)}</span>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[var(--color-success)]">{item.rate}%</p>
                  <p className="text-xs text-[var(--text-muted)]">Engagement Rate</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════════════════

function CampaignDetailSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-[var(--radius-md)]" />
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Tabs Skeleton */}
      <div className="border-b border-[var(--border-color)]">
        <div className="flex gap-4 -mb-px">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-28 rounded-t-[var(--radius-md)]" />
          ))}
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-10 w-10 rounded-[var(--radius-md)]" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Cards Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border-color)]">
              <div>
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-5 w-28" />
              </div>
              <div>
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-5 w-28" />
              </div>
            </div>
            <div className="pt-4 border-t border-[var(--border-color)]">
              <Skeleton className="h-4 w-24 mb-2" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <Skeleton className="h-12 w-16 mx-auto mb-2" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-3 w-full rounded-full" />
              <div className="flex justify-between mt-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-[var(--bg-tertiary)] rounded-[var(--radius-md)]">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-48 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [campaign, setCampaign] = useState<CampaignData | null>(null);

  // Simulate fetching campaign data based on params.campaignId
  useEffect(() => {
    const fetchCampaign = async () => {
      setIsLoading(true);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      // In a real app, fetch campaign data based on params.campaignId
      setCampaign(mockCampaign);
      setIsLoading(false);
    };
    fetchCampaign();
  }, [params.campaignId]);

  // Show loading skeleton while fetching
  if (isLoading || !campaign) {
    return <CampaignDetailSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{campaign.name}</h1>
              <StatusBadge status={campaign.status} />
            </div>
            <p className="text-[var(--text-muted)]">
              {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
            </p>
          </div>
        </div>
        <Button variant="outline">
          <Edit className="h-4 w-4 mr-2" />
          Edit Campaign
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border-color)]">
        <nav className="flex gap-1 -mb-px">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium
                  border-b-2 transition-colors
                  ${isActive
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <OverviewTab campaign={campaign} />}
        {activeTab === 'athletes' && <AthletesTab campaign={campaign} />}
        {activeTab === 'deliverables' && <DeliverablesTab campaign={campaign} />}
        {activeTab === 'analytics' && <AnalyticsTab campaign={campaign} />}
      </div>
    </div>
  );
}
