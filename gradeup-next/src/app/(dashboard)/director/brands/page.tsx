'use client';

import { useState } from 'react';
import { Search, CheckCircle, Building, MoreVertical } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { formatCurrency, formatDate } from '@/lib/utils';

// Mock brands data
const mockBrands = [
  {
    id: '1',
    name: 'Nike',
    industry: 'Sports & Athletics',
    totalSpent: 125000,
    activeDeals: 12,
    verified: true,
    joinedAt: '2023-06-15',
  },
  {
    id: '2',
    name: 'Gatorade',
    industry: 'Beverages',
    totalSpent: 85000,
    activeDeals: 8,
    verified: true,
    joinedAt: '2023-08-20',
  },
  {
    id: '3',
    name: 'Foot Locker',
    industry: 'Retail',
    totalSpent: 45000,
    activeDeals: 5,
    verified: true,
    joinedAt: '2023-10-01',
  },
  {
    id: '4',
    name: 'Local Gym Chain',
    industry: 'Fitness',
    totalSpent: 15000,
    activeDeals: 3,
    verified: false,
    joinedAt: '2024-01-15',
  },
  {
    id: '5',
    name: 'Sports Memorabilia Inc',
    industry: 'Collectibles',
    totalSpent: 8500,
    activeDeals: 2,
    verified: true,
    joinedAt: '2024-02-01',
  },
];

function BrandRow({ brand }: { brand: (typeof mockBrands)[0] }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-tertiary)] transition-colors">
      <Avatar fallback={brand.name.charAt(0)} size="lg" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium text-[var(--text-primary)]">{brand.name}</p>
          {brand.verified && (
            <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
          )}
        </div>
        <p className="text-sm text-[var(--text-muted)]">{brand.industry}</p>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-[var(--color-success)]">
          {formatCurrency(brand.totalSpent)}
        </p>
        <p className="text-xs text-[var(--text-muted)]">Total Spent</p>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {brand.activeDeals}
        </p>
        <p className="text-xs text-[var(--text-muted)]">Active Deals</p>
      </div>
      <div>
        <p className="text-sm text-[var(--text-muted)]">
          Joined {formatDate(brand.joinedAt)}
        </p>
      </div>
      <div>
        {brand.verified ? (
          <Badge variant="success" size="sm">Verified</Badge>
        ) : (
          <Badge variant="warning" size="sm">Pending</Badge>
        )}
      </div>
      <Button variant="ghost" size="sm">
        <MoreVertical className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function DirectorBrandsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBrands = mockBrands.filter((brand) =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    brand.industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSpent = mockBrands.reduce((sum, b) => sum + b.totalSpent, 0);
  const totalDeals = mockBrands.reduce((sum, b) => sum + b.activeDeals, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Brands</h1>
        <p className="text-[var(--text-muted)]">
          Brands partnering with your program's athletes
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-[var(--text-muted)]">Total Brands</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {mockBrands.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-[var(--text-muted)]">Verified</p>
            <p className="text-2xl font-bold text-[var(--color-success)]">
              {mockBrands.filter((b) => b.verified).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-[var(--text-muted)]">Total Spent</p>
            <p className="text-2xl font-bold text-[var(--color-primary)]">
              {formatCurrency(totalSpent)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-[var(--text-muted)]">Active Deals</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {totalDeals}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <Input
            placeholder="Search brands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </CardContent>
      </Card>

      {/* Brands Table */}
      <Card>
        <CardHeader>
          <CardTitle>Partner Brands ({filteredBrands.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredBrands.length > 0 ? (
            filteredBrands.map((brand) => (
              <BrandRow key={brand.id} brand={brand} />
            ))
          ) : (
            <div className="p-12 text-center">
              <p className="text-[var(--text-muted)]">No brands found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
