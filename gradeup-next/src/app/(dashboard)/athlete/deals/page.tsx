'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutGrid,
  List,
  Search,
  Calendar,
  DollarSign,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { FilterBar, type Filter } from '@/components/ui/filter-bar';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';
import type { DealStatus, DealType } from '@/types';

// Mock deals data
const mockDeals = [
  {
    id: '1',
    title: 'Instagram Post Campaign',
    description: 'Create 3 Instagram posts featuring Nike products over 2 weeks',
    brand: { name: 'Nike', logo: null },
    amount: 5000,
    status: 'active' as DealStatus,
    dealType: 'social_post' as DealType,
    deliverables: '3 Instagram posts, 2 stories',
    createdAt: '2024-02-10T10:00:00Z',
    expiresAt: '2024-02-24T10:00:00Z',
  },
  {
    id: '2',
    title: 'Store Opening Appearance',
    description: 'Attend grand opening of new Foot Locker location',
    brand: { name: 'Foot Locker', logo: null },
    amount: 2500,
    status: 'pending' as DealStatus,
    dealType: 'appearance' as DealType,
    deliverables: '2-hour appearance, photos with fans',
    createdAt: '2024-02-09T14:30:00Z',
    expiresAt: '2024-02-16T14:30:00Z',
  },
  {
    id: '3',
    title: 'Social Media Endorsement',
    description: 'Long-term partnership for social media content',
    brand: { name: 'Gatorade', logo: null },
    amount: 7500,
    status: 'negotiating' as DealStatus,
    dealType: 'endorsement' as DealType,
    deliverables: 'Monthly content, brand ambassador',
    createdAt: '2024-02-08T09:00:00Z',
    expiresAt: '2024-03-08T09:00:00Z',
  },
  {
    id: '4',
    title: 'Autograph Signing Event',
    description: 'Sign merchandise at local sports memorabilia show',
    brand: { name: 'Sports Memorabilia Inc', logo: null },
    amount: 1500,
    status: 'completed' as DealStatus,
    dealType: 'autograph' as DealType,
    deliverables: '100 signatures',
    createdAt: '2024-01-20T11:00:00Z',
    expiresAt: '2024-01-20T15:00:00Z',
  },
  {
    id: '5',
    title: 'Youth Basketball Camp',
    description: 'Coach at summer basketball camp for kids',
    brand: { name: 'Duke Athletics', logo: null },
    amount: 3000,
    status: 'completed' as DealStatus,
    dealType: 'camp' as DealType,
    deliverables: '3-day camp, coaching sessions',
    createdAt: '2024-01-15T09:00:00Z',
    expiresAt: '2024-01-18T17:00:00Z',
  },
  {
    id: '6',
    title: 'TikTok Brand Partnership',
    description: 'Create viral TikTok content featuring Under Armour gear',
    brand: { name: 'Under Armour', logo: null },
    amount: 3500,
    status: 'pending' as DealStatus,
    dealType: 'social_post' as DealType,
    deliverables: '5 TikTok videos',
    createdAt: '2024-02-11T08:00:00Z',
    expiresAt: '2024-02-25T23:59:00Z',
  },
];

type ViewMode = 'table' | 'kanban';

const kanbanColumns: { status: DealStatus; label: string; color: string }[] = [
  { status: 'pending', label: 'Incoming', color: 'var(--color-warning)' },
  { status: 'negotiating', label: 'Negotiating', color: 'var(--color-gold)' },
  { status: 'active', label: 'Active', color: 'var(--color-success)' },
  { status: 'completed', label: 'Completed', color: 'var(--color-info)' },
];

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
  deal: typeof mockDeals[0];
  onClick: () => void;
}

function KanbanCard({ deal, onClick }: KanbanCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-4 cursor-pointer hover:border-[var(--border-color-hover)] hover:shadow-[var(--shadow-md)] transition-all group"
    >
      {/* Brand */}
      <div className="flex items-center gap-2 mb-3">
        <Avatar fallback={deal.brand.name.charAt(0)} size="sm" />
        <span className="text-xs text-[var(--text-muted)]">{deal.brand.name}</span>
      </div>

      {/* Title */}
      <h4 className="font-medium text-[var(--text-primary)] text-sm mb-2 group-hover:text-[var(--color-primary)] transition-colors line-clamp-2">
        {deal.title}
      </h4>

      {/* Amount & Deadline */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-[var(--color-primary)]">
          {formatCurrency(deal.amount)}
        </span>
        <span className="text-[var(--text-muted)] flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDate(deal.expiresAt)}
        </span>
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
  deals: typeof mockDeals;
  onDealClick: (dealId: string) => void;
}

function KanbanColumn({ label, color, deals, onDealClick }: KanbanColumnProps) {
  return (
    <div className="flex-1 min-w-[280px] max-w-[320px]">
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
  const [isLoading, setIsLoading] = useState(false);

  // Filter deals based on search and filters
  const filteredDeals = useMemo(() => {
    return mockDeals.filter((deal) => {
      const matchesSearch =
        searchQuery === '' ||
        deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.brand.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === '' || deal.status === statusFilter;
      const matchesDealType = dealTypeFilter === '' || deal.dealType === dealTypeFilter;

      return matchesSearch && matchesStatus && matchesDealType;
    });
  }, [searchQuery, statusFilter, dealTypeFilter]);

  // Deal counts for badges
  const dealCounts = useMemo(() => ({
    total: mockDeals.length,
    pending: mockDeals.filter((d) => d.status === 'pending').length,
    negotiating: mockDeals.filter((d) => d.status === 'negotiating').length,
    active: mockDeals.filter((d) => d.status === 'active').length,
    completed: mockDeals.filter((d) => d.status === 'completed').length,
  }), []);

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
  const tableColumns: DataTableColumn<typeof mockDeals[0]>[] = [
    {
      key: 'brand',
      header: 'Brand',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <Avatar fallback={row.brand.name.charAt(0)} size="md" />
          <div>
            <p className="font-medium text-[var(--text-primary)]">{row.title}</p>
            <p className="text-sm text-[var(--text-muted)]">{row.brand.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'dealType',
      header: 'Type',
      render: (value) => (
        <Badge variant="outline">
          {String(value).replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (value) => (
        <span className="font-semibold text-[var(--color-primary)]">
          {formatCurrency(value as number)}
        </span>
      ),
    },
    {
      key: 'expiresAt',
      header: 'Deadline',
      render: (value) => (
        <span className="text-[var(--text-secondary)]">
          {formatDate(value as string)}
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
            actionLabel={searchQuery || statusFilter || dealTypeFilter ? 'Clear filters' : undefined}
            onAction={
              searchQuery || statusFilter || dealTypeFilter
                ? () => {
                    setSearchQuery('');
                    setStatusFilter('');
                    setDealTypeFilter('');
                  }
                : undefined
            }
          />
        </Card>
      ) : viewMode === 'table' ? (
        <DataTable
          columns={tableColumns}
          data={filteredDeals}
          onRowClick={(row) => handleDealClick(row.id)}
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
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
