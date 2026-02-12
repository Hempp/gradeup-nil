'use client';

import { useState } from 'react';
import { Filter, Search, ArrowUpDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { DealStatus } from '@/types';

// Mock deals data
const mockDeals = [
  {
    id: '1',
    title: 'Instagram Post Campaign',
    description: 'Create 3 Instagram posts featuring Nike products over 2 weeks',
    brand: { name: 'Nike', logo: null },
    amount: 5000,
    status: 'active' as DealStatus,
    dealType: 'social_post',
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
    dealType: 'appearance',
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
    dealType: 'endorsement',
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
    dealType: 'autograph',
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
    dealType: 'camp',
    deliverables: '3-day camp, coaching sessions',
    createdAt: '2024-01-15T09:00:00Z',
    expiresAt: '2024-01-18T17:00:00Z',
  },
];

const statusFilters: { label: string; value: DealStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Negotiating', value: 'negotiating' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
];

function DealCard({ deal }: { deal: (typeof mockDeals)[0] }) {
  return (
    <Card hover className="group">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar fallback={deal.brand.name.charAt(0)} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                  {deal.title}
                </h3>
                <p className="text-sm text-[var(--text-muted)]">{deal.brand.name}</p>
              </div>
              <StatusBadge status={deal.status} />
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">
              {deal.description}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold text-[var(--color-primary)]">
                {formatCurrency(deal.amount)}
              </span>
              <Badge variant="outline">{deal.dealType.replace('_', ' ')}</Badge>
              <span className="text-[var(--text-muted)]">
                Created {formatDate(deal.createdAt)}
              </span>
            </div>
          </div>
        </div>
        {/* Actions */}
        {(deal.status === 'pending' || deal.status === 'negotiating') && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--border-color)]">
            <Button variant="primary" size="sm" className="flex-1">
              Accept Deal
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              Counter Offer
            </Button>
            <Button variant="ghost" size="sm">
              Decline
            </Button>
          </div>
        )}
        {deal.status === 'active' && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--border-color)]">
            <Button variant="primary" size="sm" className="flex-1">
              View Contract
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              Message Brand
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AthleteDealsPage() {
  const [filter, setFilter] = useState<DealStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDeals = mockDeals.filter((deal) => {
    const matchesFilter = filter === 'all' || deal.status === filter;
    const matchesSearch =
      deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.brand.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const dealCounts = {
    all: mockDeals.length,
    pending: mockDeals.filter((d) => d.status === 'pending').length,
    negotiating: mockDeals.filter((d) => d.status === 'negotiating').length,
    active: mockDeals.filter((d) => d.status === 'active').length,
    completed: mockDeals.filter((d) => d.status === 'completed').length,
  };

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
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <Input
                placeholder="Search deals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>
            {/* Status Filter */}
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((status) => (
                <Button
                  key={status.value}
                  variant={filter === status.value ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(status.value)}
                >
                  {status.label}
                  <span className="ml-1 opacity-60">
                    ({dealCounts[status.value as keyof typeof dealCounts] || 0})
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deals List */}
      <div className="space-y-4">
        {filteredDeals.length > 0 ? (
          filteredDeals.map((deal) => <DealCard key={deal.id} deal={deal} />)
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-[var(--text-muted)]">No deals found</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
