'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Filter, MoreVertical, Eye, CheckCircle, XCircle, MessageSquare, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useToastActions } from '@/components/ui/toast';
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

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-8 w-24" />
      </CardContent>
    </Card>
  );
}

function DealRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-[var(--border-color)] last:border-0 animate-pulse">
      <div className="flex -space-x-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-40" />
      </div>
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-6 w-16 rounded" />
      <Skeleton className="h-8 w-8 rounded" />
    </div>
  );
}

function DealRow({ deal }: { deal: (typeof mockDeals)[0] }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toast = useToastActions();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const handleAction = (action: string) => {
    setShowDropdown(false);
    switch (action) {
      case 'view':
        toast.info('View Details', `Opening details for ${deal.title}`);
        break;
      case 'approve':
        toast.success('Deal Approved', `${deal.title} has been approved.`);
        break;
      case 'reject':
        toast.error('Deal Rejected', `${deal.title} has been rejected.`);
        break;
      case 'message':
        toast.info('Message Sent', `Opening conversation for ${deal.title}`);
        break;
      case 'export':
        toast.success('Exported', `Deal contract exported successfully.`);
        break;
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-tertiary)] transition-colors">
      <div className="flex -space-x-2" aria-label={`${deal.athlete.name} and ${deal.brand.name}`}>
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
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`More options for ${deal.title}`}
          aria-expanded={showDropdown}
          aria-haspopup="menu"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
        {showDropdown && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] z-50 py-1"
          >
            <button
              role="menuitem"
              onClick={() => handleAction('view')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <Eye className="h-4 w-4 text-[var(--text-muted)]" />
              View Details
            </button>
            {(deal.status === 'pending' || deal.status === 'negotiating') && (
              <>
                <button
                  role="menuitem"
                  onClick={() => handleAction('approve')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-success)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve Deal
                </button>
                <button
                  role="menuitem"
                  onClick={() => handleAction('reject')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-error)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                  Reject Deal
                </button>
              </>
            )}
            <button
              role="menuitem"
              onClick={() => handleAction('message')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <MessageSquare className="h-4 w-4 text-[var(--text-muted)]" />
              Send Message
            </button>
            <div className="border-t border-[var(--border-color)] my-1" />
            <button
              role="menuitem"
              onClick={() => handleAction('export')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <FileText className="h-4 w-4 text-[var(--text-muted)]" />
              Export Contract
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DirectorDealsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<DealStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

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

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Deals</h1>
          <p className="text-[var(--text-muted)]">
            Monitor all NIL deals in your program
          </p>
        </div>

        {/* Stats Skeletons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        {/* Search Skeleton */}
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>

        {/* Deals Table Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="p-0">
            {[...Array(5)].map((_, i) => (
              <DealRowSkeleton key={i} />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

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
                aria-label="Search deals"
              />
            </div>
            <div className="flex gap-2" role="group" aria-label="Filter by status">
              {statusFilters.map((status) => (
                <Button
                  key={status.value}
                  variant={filter === status.value ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(status.value)}
                  aria-pressed={filter === status.value}
                  aria-label={`Filter by ${status.label} deals`}
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
