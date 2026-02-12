'use client';

import { useState, useEffect } from 'react';
import { Search, Send, FileText, MoreVertical } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { DealStatus } from '@/types';

// Mock deals data
const mockDeals = [
  {
    id: '1',
    title: 'Instagram Post Campaign',
    athlete: { name: 'Marcus Johnson', school: 'Duke University', sport: 'Basketball' },
    amount: 5000,
    status: 'active' as DealStatus,
    createdAt: '2024-02-10T10:00:00Z',
  },
  {
    id: '2',
    title: 'Social Media Partnership',
    athlete: { name: 'Sarah Williams', school: 'Stanford University', sport: 'Soccer' },
    amount: 7500,
    status: 'pending' as DealStatus,
    createdAt: '2024-02-09T14:30:00Z',
  },
  {
    id: '3',
    title: 'Store Appearance',
    athlete: { name: 'Jordan Davis', school: 'Ohio State', sport: 'Football' },
    amount: 3500,
    status: 'negotiating' as DealStatus,
    createdAt: '2024-02-08T09:00:00Z',
  },
  {
    id: '4',
    title: 'Brand Ambassador',
    athlete: { name: 'Emma Chen', school: 'UCLA', sport: 'Gymnastics' },
    amount: 15000,
    status: 'completed' as DealStatus,
    createdAt: '2024-01-15T11:00:00Z',
  },
  {
    id: '5',
    title: 'Video Content Creation',
    athlete: { name: 'Tyler Brooks', school: 'Michigan', sport: 'Basketball' },
    amount: 2500,
    status: 'rejected' as DealStatus,
    createdAt: '2024-01-10T16:00:00Z',
  },
];

const statusFilters: { label: string; value: DealStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Negotiating', value: 'negotiating' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
];

function DealRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-[var(--border-color)] last:border-0 animate-pulse">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-48 mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="text-right">
        <Skeleton className="h-4 w-20 mb-1" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

function DealRow({ deal }: { deal: (typeof mockDeals)[0] }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-tertiary)] transition-colors">
      <Avatar fallback={deal.athlete.name.charAt(0)} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium text-[var(--text-primary)] truncate">
            {deal.title}
          </p>
          <StatusBadge status={deal.status} size="sm" />
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          {deal.athlete.name} • {deal.athlete.school}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-[var(--text-primary)]">
          {formatCurrency(deal.amount)}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {formatDate(deal.createdAt)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {(deal.status === 'pending' || deal.status === 'negotiating') && (
          <Button variant="outline" size="sm">
            Edit Offer
          </Button>
        )}
        {deal.status === 'active' && (
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-1" />
            Contract
          </Button>
        )}
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function BrandDealsPage() {
  const [filter, setFilter] = useState<DealStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const filteredDeals = mockDeals.filter((deal) => {
    const matchesFilter = filter === 'all' || deal.status === filter;
    const matchesSearch =
      deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.athlete.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Deals</h1>
          <p className="text-[var(--text-muted)]">
            Manage your offers and partnerships with athletes
          </p>
        </div>
        <Button variant="primary">
          <Send className="h-4 w-4 mr-2" />
          New Offer
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search deals or athletes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((status) => (
                <Button
                  key={status.value}
                  variant={filter === status.value ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(status.value)}
                >
                  {status.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deals Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Deals ({filteredDeals.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <DealRowSkeleton key={i} />
              ))}
            </>
          ) : filteredDeals.length > 0 ? (
            filteredDeals.map((deal) => <DealRow key={deal.id} deal={deal} />)
          ) : (
            <div className="p-12 text-center">
              <p className="text-[var(--text-muted)]">No deals found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
