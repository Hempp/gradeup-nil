'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutGrid,
  List,
  Clock,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { FilterBar, type Filter } from '@/components/ui/filter-bar';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useRequireAuth } from '@/context';
import { useAthleteDeals } from '@/lib/hooks/use-data';
import type { Deal, DealStatus } from '@/lib/services/deals';
import { DEAL_STATUS_CONFIG, KANBAN_COLUMNS } from '@/lib/constants/deal-status';

type ViewMode = 'table' | 'kanban';

// Build kanban column configuration from centralized config
const kanbanColumns = KANBAN_COLUMNS.map((status) => ({
  status,
  label: DEAL_STATUS_CONFIG[status].label,
  color: DEAL_STATUS_CONFIG[status].color,
}));

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

const dealTypeOptions = [
  { value: 'social_post', label: 'Social Post' },
  { value: 'appearance', label: 'Appearance' },
  { value: 'endorsement', label: 'Endorsement' },
  { value: 'autograph', label: 'Autograph' },
  { value: 'camp', label: 'Camp' },
  { value: 'merchandise', label: 'Merchandise' },
];

interface KanbanCardProps {
  deal: Deal;
  onClick: () => void;
}

function KanbanCard({ deal, onClick }: KanbanCardProps) {
  const brandName = deal.brand?.company_name || 'Unknown Brand';
  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`View deal: ${deal.title} with ${brandName}`}
      className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-4 cursor-pointer hover:border-[var(--border-color-hover)] hover:shadow-[var(--shadow-md)] transition-all group min-h-[44px] touch-manipulation"
    >
      {/* Brand */}
      <div className="flex items-center gap-2 mb-3">
        <Avatar src={deal.brand?.logo_url || undefined} fallback={brandName.charAt(0)} size="sm" />
        <span className="text-xs text-[var(--text-muted)]">{brandName}</span>
      </div>

      {/* Title */}
      <h4 className="font-medium text-[var(--text-primary)] text-sm mb-2 group-hover:text-[var(--color-primary)] transition-colors line-clamp-2">
        {deal.title}
      </h4>

      {/* Amount & Deadline */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-[var(--color-primary)]">
          {formatCurrency(deal.compensation_amount)}
        </span>
        {deal.end_date && (
          <span className="text-[var(--text-muted)] flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(deal.end_date)}
          </span>
        )}
      </div>

      {/* Status Badge */}
      <div className="mt-3">
        <StatusBadge status={deal.status} size="sm" />
      </div>
    </div>
  );
}

interface KanbanColumnProps {
  label: string;
  color: string;
  deals: Deal[];
  onDealClick: (dealId: string) => void;
}

function KanbanColumn({ label, color, deals, onDealClick }: KanbanColumnProps) {
  return (
    <div className="w-full md:flex-1 md:min-w-[280px] md:max-w-[320px] snap-start shrink-0">
      {/* Column Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b-2" style={{ borderColor: color }}>
        <span className="font-semibold text-[var(--text-primary)]">{label}</span>
        <span className="h-5 w-5 rounded-full bg-[var(--bg-tertiary)] text-xs flex items-center justify-center text-[var(--text-muted)]">
          {deals.length}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {deals.length > 0 ? (
          deals.map((deal) => (
            <KanbanCard
              key={deal.id}
              deal={deal}
              onClick={() => onDealClick(deal.id)}
            />
          ))
        ) : (
          <div className="text-center py-8 text-sm text-[var(--text-muted)]">
            No deals
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full max-w-md" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AthleteDealsPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dealTypeFilter, setDealTypeFilter] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);

  // Require auth and get athlete data
  const { roleData, isLoading: authLoading } = useRequireAuth({ allowedRoles: ['athlete'] });
  const athleteData = roleData as { id: string } | null;

  // Fetch deals from Supabase
  const { data: deals, loading: dealsLoading, error: dealsError, refetch: refetchDeals } = useAthleteDeals(athleteData?.id);
  const isLoading = authLoading || dealsLoading;
  // Memoize to provide stable reference when deals is null/undefined
  const allDeals = useMemo(() => deals || [], [deals]);

  // Handle retry
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    console.error('Deals fetch error:', dealsError);
    try {
      await refetchDeals();
    } catch (err) {
      console.error('Error during retry:', err);
    } finally {
      setIsRetrying(false);
    }
  }, [dealsError, refetchDeals]);

  // Filter deals based on search and filters
  const filteredDeals = useMemo(() => {
    return allDeals.filter((deal) => {
      const brandName = deal.brand?.company_name || '';
      const matchesSearch =
        searchQuery === '' ||
        deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brandName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === '' || deal.status === statusFilter;
      const matchesDealType = dealTypeFilter === '' || deal.deal_type === dealTypeFilter;

      return matchesSearch && matchesStatus && matchesDealType;
    });
  }, [allDeals, searchQuery, statusFilter, dealTypeFilter]);

  // Deal counts for badges
  const dealCounts = useMemo(() => ({
    total: allDeals.length,
    pending: allDeals.filter((d) => d.status === 'pending').length,
    negotiating: allDeals.filter((d) => d.status === 'negotiating').length,
    active: allDeals.filter((d) => d.status === 'active' || d.status === 'accepted').length,
    completed: allDeals.filter((d) => d.status === 'completed').length,
  }), [allDeals]);

  const handleDealClick = (dealId: string) => {
    router.push(`/athlete/deals/${dealId}`);
  };

  // Filters configuration
  const filters: Filter[] = [
    {
      id: 'status',
      label: 'Status',
      options: statusOptions,
      value: statusFilter,
      onChange: setStatusFilter,
    },
    {
      id: 'dealType',
      label: 'Deal Type',
      options: dealTypeOptions,
      value: dealTypeFilter,
      onChange: setDealTypeFilter,
    },
  ];

  // Table columns
  const tableColumns: DataTableColumn<Deal>[] = [
    {
      key: 'brand',
      header: 'Brand',
      render: (_, row) => {
        const brandName = row.brand?.company_name || 'Unknown Brand';
        return (
          <div className="flex items-center gap-3">
            <Avatar src={row.brand?.logo_url || undefined} fallback={brandName.charAt(0)} size="md" />
            <div>
              <p className="font-medium text-[var(--text-primary)]">{row.title}</p>
              <p className="text-sm text-[var(--text-muted)]">{brandName}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'deal_type',
      header: 'Type',
      render: (value) => (
        <Badge variant="outline">
          {String(value).replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'compensation_amount',
      header: 'Amount',
      render: (value) => (
        <span className="font-semibold text-[var(--color-primary)]">
          {formatCurrency(value as number)}
        </span>
      ),
    },
    {
      key: 'end_date',
      header: 'Deadline',
      render: (value) => (
        <span className="text-[var(--text-secondary)]">
          {value ? formatDate(value as string) : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => <StatusBadge status={value as DealStatus} />,
    },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleDealClick(row.id);
          }}
        >
          View
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      ),
    },
  ];

  // Show loading state while auth is checking
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  // Show error state if data fetch failed
  if (dealsError && !dealsLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Deals</h1>
          <p className="text-[var(--text-muted)]">
            Manage your NIL partnerships and opportunities
          </p>
        </div>
        <Card>
          <ErrorState
            errorType="data"
            title="Failed to load deals"
            description={dealsError.message || 'We could not load your deals. Please try again.'}
            onRetry={handleRetry}
            isRetrying={isRetrying}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Deals</h1>
          <p className="text-[var(--text-muted)]">
            Manage your NIL partnerships and opportunities
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] p-1 rounded-[var(--radius-lg)]">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <List className="h-4 w-4" />
            Table
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${
              viewMode === 'kanban'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Kanban
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-[var(--text-muted)]">Incoming</p>
          <p className="text-2xl font-bold text-[var(--color-warning)]">{dealCounts.pending}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-[var(--text-muted)]">Negotiating</p>
          <p className="text-2xl font-bold text-[var(--color-gold)]">{dealCounts.negotiating}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-[var(--text-muted)]">Active</p>
          <p className="text-2xl font-bold text-[var(--color-success)]">{dealCounts.active}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-[var(--text-muted)]">Completed</p>
          <p className="text-2xl font-bold text-[var(--color-info)]">{dealCounts.completed}</p>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <FilterBar
          filters={filters}
          searchValue={searchQuery}
          searchPlaceholder="Search deals..."
          onSearchChange={setSearchQuery}
        />
      </Card>

      {/* Content Area */}
      {isLoading ? (
        <LoadingState />
      ) : filteredDeals.length === 0 ? (
        <Card>
          <EmptyState
            title="No deals found"
            description={
              searchQuery || statusFilter || dealTypeFilter
                ? 'Try adjusting your filters to see more deals.'
                : 'You do not have any deals yet. When brands send you offers, they will appear here.'
            }
            action={
              searchQuery || statusFilter || dealTypeFilter
                ? {
                    label: 'Clear filters',
                    onClick: () => {
                      setSearchQuery('');
                      setStatusFilter('');
                      setDealTypeFilter('');
                    },
                  }
                : undefined
            }
          />
        </Card>
      ) : viewMode === 'table' ? (
        <DataTable
          columns={tableColumns as unknown as DataTableColumn<Record<string, unknown>>[]}
          data={filteredDeals as unknown as Record<string, unknown>[]}
          onRowClick={(row) => handleDealClick((row as unknown as Deal).id)}
        />
      ) : (
        /* Mobile: Stack columns vertically or scroll horizontally with snap */
        <div className="flex flex-col gap-6 md:flex-row md:gap-4 md:overflow-x-auto md:pb-4 md:snap-x md:snap-mandatory md:-mx-6 md:px-6">
          {kanbanColumns.map((column) => (
            <KanbanColumn
              key={column.status}
              label={column.label}
              color={column.color}
              deals={filteredDeals.filter((d) => d.status === column.status)}
              onDealClick={handleDealClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
