'use client';

import { useState } from 'react';
import { Search, Filter, MoreVertical } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { DealStatus } from '@/types';

// Mock deals data
const mockDeals = [
  {
    id: '1',
    title: 'Instagram Campaign',
    athlete: { name: 'Marcus Johnson', sport: 'Basketball' },
    brand: { name: 'Nike' },
    amount: 5000,
    status: 'active' as DealStatus,
    createdAt: '2024-02-10',
  },
  {
    id: '2',
    title: 'Social Partnership',
    athlete: { name: 'Sarah Williams', sport: 'Soccer' },
    brand: { name: 'Gatorade' },
    amount: 7500,
    status: 'pending' as DealStatus,
    createdAt: '2024-02-09',
  },
  {
    id: '3',
    title: 'Store Appearance',
    athlete: { name: 'Jordan Davis', sport: 'Football' },
    brand: { name: 'Foot Locker' },
    amount: 3500,
    status: 'negotiating' as DealStatus,
    createdAt: '2024-02-08',
  },
  {
    id: '4',
    title: 'Brand Ambassador',
    athlete: { name: 'Emma Chen', sport: 'Gymnastics' },
    brand: { name: 'Nike' },
    amount: 15000,
    status: 'completed' as DealStatus,
    createdAt: '2024-01-15',
  },
  {
    id: '5',
    title: 'Video Content',
    athlete: { name: 'Tyler Brooks', sport: 'Basketball' },
    brand: { name: 'Local Gym' },
    amount: 2500,
    status: 'completed' as DealStatus,
    createdAt: '2024-01-10',
  },
];

const statusFilters: { label: string; value: DealStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Pending', value: 'pending' },
  { label: 'Completed', value: 'completed' },
];

function DealRow({ deal }: { deal: (typeof mockDeals)[0] }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-tertiary)] transition-colors">
      <div className="flex -space-x-2">
        <Avatar fallback={deal.athlete.name.charAt(0)} size="sm" />
        <Avatar fallback={deal.brand.name.charAt(0)} size="sm" className="border-2 border-[var(--bg-card)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[var(--text-primary)] truncate">{deal.title}</p>
        <p className="text-sm text-[var(--text-muted)]">
          {deal.athlete.name} × {deal.brand.name}
        </p>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-[var(--color-success)]">
          {formatCurrency(deal.amount)}
        </p>
      </div>
      <div className="text-center">
        <p className="text-sm text-[var(--text-muted)]">{formatDate(deal.createdAt)}</p>
      </div>
      <StatusBadge status={deal.status} size="sm" />
      <Button variant="ghost" size="sm">
        <MoreVertical className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function DirectorDealsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<DealStatus | 'all'>('all');

  const filteredDeals = mockDeals.filter((deal) => {
    const matchesSearch =
      deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.athlete.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.brand.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || deal.status === filter;
    return matchesSearch && matchesFilter;
  });

  const totalValue = mockDeals.reduce((sum, d) => sum + d.amount, 0);
  const activeValue = mockDeals
    .filter((d) => d.status === 'active')
    .reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Deals</h1>
        <p className="text-[var(--text-muted)]">
          Monitor all NIL deals in your program
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-[var(--text-muted)]">Total Deals</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {mockDeals.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-[var(--text-muted)]">Active</p>
            <p className="text-2xl font-bold text-[var(--color-success)]">
              {mockDeals.filter((d) => d.status === 'active').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-[var(--text-muted)]">Total Value</p>
            <p className="text-2xl font-bold text-[var(--color-primary)]">
              {formatCurrency(totalValue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-[var(--text-muted)]">Active Value</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {formatCurrency(activeValue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search deals, athletes, or brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="flex gap-2">
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
          {filteredDeals.length > 0 ? (
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
