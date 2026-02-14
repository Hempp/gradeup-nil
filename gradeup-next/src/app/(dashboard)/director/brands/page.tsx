'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  CheckCircle,
  Building,
  Eye,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Calendar,
  Filter,
  ChevronDown,
  Briefcase,
  Target,
  Clock,
  XCircle,
  Star,
  Award,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

// Types
interface Brand {
  id: string;
  name: string;
  industry: string;
  logo?: string;
  totalSpent: number;
  activeDeals: number;
  completedDeals: number;
  verified: boolean;
  joinedAt: string;
  partnershipStatus: 'active' | 'paused' | 'pending' | 'churned';
  tier: 'platinum' | 'gold' | 'silver' | 'bronze';
  activeCampaigns: Campaign[];
  athleteCount: number;
  avgDealSize: number;
  lastActivity: string;
  contactEmail: string;
  renewalDate?: string;
}

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'scheduled' | 'paused';
  startDate: string;
  endDate?: string;
  budget: number;
  spent: number;
  athleteCount: number;
}

// Filter options
const industryFilters = ['All Industries', 'Sports & Athletics', 'Beverages', 'Retail', 'Technology', 'Fitness', 'Financial Services', 'Automotive', 'Food & Dining'];
const statusFilters = ['All Status', 'Active', 'Paused', 'Pending', 'Churned'];
const tierFilters = ['All Tiers', 'Platinum', 'Gold', 'Silver', 'Bronze'];

// Mock brands data with enhanced details
const mockBrands: Brand[] = [
  {
    id: '1',
    name: 'Nike',
    industry: 'Sports & Athletics',
    totalSpent: 285000,
    activeDeals: 18,
    completedDeals: 34,
    verified: true,
    joinedAt: '2023-06-15',
    partnershipStatus: 'active',
    tier: 'platinum',
    athleteCount: 24,
    avgDealSize: 8500,
    lastActivity: '2026-02-12T14:30:00Z',
    contactEmail: 'partnerships@nike.com',
    renewalDate: '2026-06-15',
    activeCampaigns: [
      { id: 'c1', name: 'Spring Collection Launch', status: 'active', startDate: '2026-02-01', endDate: '2026-04-30', budget: 75000, spent: 32000, athleteCount: 8 },
      { id: 'c2', name: 'March Madness Promo', status: 'scheduled', startDate: '2026-03-15', endDate: '2026-04-05', budget: 45000, spent: 0, athleteCount: 12 },
      { id: 'c3', name: 'Women\'s Athletics Feature', status: 'active', startDate: '2026-01-15', endDate: '2026-03-15', budget: 35000, spent: 28000, athleteCount: 6 },
    ],
  },
  {
    id: '2',
    name: 'Gatorade',
    industry: 'Beverages',
    totalSpent: 165000,
    activeDeals: 14,
    completedDeals: 22,
    verified: true,
    joinedAt: '2023-08-20',
    partnershipStatus: 'active',
    tier: 'gold',
    athleteCount: 18,
    avgDealSize: 6200,
    lastActivity: '2026-02-11T10:15:00Z',
    contactEmail: 'nil@gatorade.com',
    renewalDate: '2026-08-20',
    activeCampaigns: [
      { id: 'c4', name: 'Hydration Heroes', status: 'active', startDate: '2026-01-01', endDate: '2026-06-30', budget: 60000, spent: 18500, athleteCount: 14 },
      { id: 'c5', name: 'Training Series', status: 'active', startDate: '2026-02-01', endDate: '2026-05-31', budget: 40000, spent: 12000, athleteCount: 8 },
    ],
  },
  {
    id: '3',
    name: 'State Farm',
    industry: 'Financial Services',
    totalSpent: 125000,
    activeDeals: 8,
    completedDeals: 15,
    verified: true,
    joinedAt: '2023-09-10',
    partnershipStatus: 'active',
    tier: 'gold',
    athleteCount: 12,
    avgDealSize: 8750,
    lastActivity: '2026-02-10T16:45:00Z',
    contactEmail: 'sponsorships@statefarm.com',
    renewalDate: '2026-09-10',
    activeCampaigns: [
      { id: 'c6', name: 'Good Neighbor Athletes', status: 'active', startDate: '2026-01-15', endDate: '2026-12-31', budget: 85000, spent: 28000, athleteCount: 8 },
    ],
  },
  {
    id: '4',
    name: 'Foot Locker',
    industry: 'Retail',
    totalSpent: 78000,
    activeDeals: 6,
    completedDeals: 12,
    verified: true,
    joinedAt: '2023-10-01',
    partnershipStatus: 'active',
    tier: 'silver',
    athleteCount: 9,
    avgDealSize: 5200,
    lastActivity: '2026-02-09T11:20:00Z',
    contactEmail: 'nil@footlocker.com',
    activeCampaigns: [
      { id: 'c7', name: 'Sneaker Culture', status: 'active', startDate: '2026-01-01', endDate: '2026-03-31', budget: 25000, spent: 18000, athleteCount: 6 },
    ],
  },
  {
    id: '5',
    name: 'Chipotle',
    industry: 'Food & Dining',
    totalSpent: 52000,
    activeDeals: 5,
    completedDeals: 8,
    verified: true,
    joinedAt: '2024-01-08',
    partnershipStatus: 'active',
    tier: 'silver',
    athleteCount: 7,
    avgDealSize: 4800,
    lastActivity: '2026-02-08T09:30:00Z',
    contactEmail: 'athletes@chipotle.com',
    activeCampaigns: [
      { id: 'c8', name: 'Fuel Your Performance', status: 'active', startDate: '2026-02-01', endDate: '2026-04-30', budget: 20000, spent: 5200, athleteCount: 5 },
    ],
  },
  {
    id: '6',
    name: 'Tesla Motors',
    industry: 'Automotive',
    totalSpent: 45000,
    activeDeals: 3,
    completedDeals: 4,
    verified: true,
    joinedAt: '2024-06-15',
    partnershipStatus: 'pending',
    tier: 'silver',
    athleteCount: 4,
    avgDealSize: 11250,
    lastActivity: '2026-02-05T14:00:00Z',
    contactEmail: 'partnerships@tesla.com',
    activeCampaigns: [
      { id: 'c9', name: 'Electric Athletes', status: 'paused', startDate: '2026-01-15', budget: 35000, spent: 8000, athleteCount: 3 },
    ],
  },
  {
    id: '7',
    name: 'Local Gym Chain',
    industry: 'Fitness',
    totalSpent: 22000,
    activeDeals: 4,
    completedDeals: 6,
    verified: false,
    joinedAt: '2024-09-15',
    partnershipStatus: 'active',
    tier: 'bronze',
    athleteCount: 5,
    avgDealSize: 2200,
    lastActivity: '2026-02-06T10:15:00Z',
    contactEmail: 'marketing@localgym.com',
    activeCampaigns: [
      { id: 'c10', name: 'Train With Champions', status: 'active', startDate: '2026-01-01', endDate: '2026-06-30', budget: 15000, spent: 4500, athleteCount: 4 },
    ],
  },
  {
    id: '8',
    name: 'Sports Memorabilia Inc',
    industry: 'Retail',
    totalSpent: 18500,
    activeDeals: 3,
    completedDeals: 5,
    verified: true,
    joinedAt: '2024-02-01',
    partnershipStatus: 'active',
    tier: 'bronze',
    athleteCount: 6,
    avgDealSize: 2300,
    lastActivity: '2026-02-07T15:30:00Z',
    contactEmail: 'nil@sportsmemo.com',
    activeCampaigns: [
      { id: 'c11', name: 'Autograph Sessions', status: 'active', startDate: '2026-02-01', endDate: '2026-05-31', budget: 12000, spent: 3200, athleteCount: 3 },
    ],
  },
  {
    id: '9',
    name: 'Tech Startup Pro',
    industry: 'Technology',
    totalSpent: 15000,
    activeDeals: 2,
    completedDeals: 3,
    verified: false,
    joinedAt: '2025-06-01',
    partnershipStatus: 'paused',
    tier: 'bronze',
    athleteCount: 2,
    avgDealSize: 3000,
    lastActivity: '2026-01-15T11:00:00Z',
    contactEmail: 'partnerships@techstartuppro.com',
    activeCampaigns: [],
  },
  {
    id: '10',
    name: 'Former Partner Corp',
    industry: 'Financial Services',
    totalSpent: 35000,
    activeDeals: 0,
    completedDeals: 8,
    verified: true,
    joinedAt: '2023-11-15',
    partnershipStatus: 'churned',
    tier: 'silver',
    athleteCount: 0,
    avgDealSize: 4375,
    lastActivity: '2025-08-20T09:00:00Z',
    contactEmail: 'nil@formercorp.com',
    activeCampaigns: [],
  },
];

// Tier badge component
function TierBadge({ tier }: { tier: Brand['tier'] }) {
  const config = {
    platinum: { variant: 'primary' as const, icon: <Star className="h-3 w-3" /> },
    gold: { variant: 'warning' as const, icon: <Award className="h-3 w-3" /> },
    silver: { variant: 'outline' as const, icon: null },
    bronze: { variant: 'outline' as const, icon: null },
  };
  const { variant, icon } = config[tier];

  return (
    <Badge variant={variant} size="sm" className="capitalize gap-1">
      {icon}
      {tier}
    </Badge>
  );
}

// Status badge component
function StatusBadge({ status }: { status: Brand['partnershipStatus'] }) {
  const config = {
    active: { variant: 'success' as const, label: 'Active' },
    paused: { variant: 'warning' as const, label: 'Paused' },
    pending: { variant: 'primary' as const, label: 'Pending' },
    churned: { variant: 'error' as const, label: 'Churned' },
  };
  const { variant, label } = config[status];

  return <Badge variant={variant} size="sm">{label}</Badge>;
}

// Campaign mini card
function CampaignMiniCard({ campaign }: { campaign: Campaign }) {
  const progress = campaign.budget > 0 ? (campaign.spent / campaign.budget) * 100 : 0;
  const statusColors = {
    active: 'bg-[var(--color-success)]',
    completed: 'bg-[var(--color-primary)]',
    scheduled: 'bg-[var(--color-accent)]',
    paused: 'bg-[var(--color-warning)]',
  };

  return (
    <div className="flex items-center gap-3 p-2 rounded-[var(--radius-sm)] bg-[var(--bg-secondary)]">
      <div className={cn('w-2 h-2 rounded-full', statusColors[campaign.status])} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{campaign.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex-1 h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-primary)] rounded-full"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <span className="text-xs text-[var(--text-muted)]">{progress.toFixed(0)}%</span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-[var(--text-muted)]">{campaign.athleteCount} athletes</p>
      </div>
    </div>
  );
}

function BrandRow({ brand, onView, expanded, onToggleExpand }: {
  brand: Brand;
  onView: (id: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const activeCampaignCount = brand.activeCampaigns.filter(c => c.status === 'active').length;

  return (
    <div className="border-b border-[var(--border-color)] last:border-0">
      <div
        className={cn(
          'flex items-center gap-4 p-4 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer',
          expanded && 'bg-[var(--bg-tertiary)]'
        )}
        onClick={onToggleExpand}
      >
        <Avatar fallback={brand.name.charAt(0)} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-[var(--text-primary)]">{brand.name}</p>
            {brand.verified && (
              <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
            )}
            <TierBadge tier={brand.tier} />
          </div>
          <p className="text-sm text-[var(--text-muted)]">{brand.industry}</p>
        </div>

        {/* Partnership Status */}
        <div className="hidden lg:block">
          <StatusBadge status={brand.partnershipStatus} />
        </div>

        {/* Active Campaigns */}
        <div className="text-center hidden md:block">
          <p className="text-sm font-semibold text-[var(--color-primary)]">
            {activeCampaignCount}
          </p>
          <p className="text-xs text-[var(--text-muted)]">Campaigns</p>
        </div>

        {/* Athletes */}
        <div className="text-center hidden sm:block">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {brand.athleteCount}
          </p>
          <p className="text-xs text-[var(--text-muted)]">Athletes</p>
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold text-[var(--color-success)]">
            {formatCurrency(brand.totalSpent)}
          </p>
          <p className="text-xs text-[var(--text-muted)]">Total Spent</p>
        </div>

        <div className="text-center hidden lg:block">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {brand.activeDeals}
          </p>
          <p className="text-xs text-[var(--text-muted)]">Active Deals</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onView(brand.id);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <ChevronDown className={cn(
            'h-4 w-4 text-[var(--text-muted)] transition-transform',
            expanded && 'rotate-180'
          )} />
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 bg-[var(--bg-tertiary)]">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Quick Stats */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Partnership Details</h4>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Joined</span>
                  <span className="text-[var(--text-primary)]">{formatDate(brand.joinedAt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Avg Deal Size</span>
                  <span className="text-[var(--text-primary)]">{formatCurrency(brand.avgDealSize)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Completed Deals</span>
                  <span className="text-[var(--text-primary)]">{brand.completedDeals}</span>
                </div>
                {brand.renewalDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Renewal Date</span>
                    <span className="text-[var(--color-warning)]">{formatDate(brand.renewalDate)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Active Campaigns */}
            <div className="md:col-span-2 space-y-2">
              <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Active Campaigns ({brand.activeCampaigns.length})
              </h4>
              {brand.activeCampaigns.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-2">
                  {brand.activeCampaigns.slice(0, 4).map((campaign) => (
                    <CampaignMiniCard key={campaign.id} campaign={campaign} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">No active campaigns</p>
              )}
              {brand.activeCampaigns.length > 4 && (
                <p className="text-xs text-[var(--color-primary)] cursor-pointer hover:underline">
                  +{brand.activeCampaigns.length - 4} more campaigns
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DirectorBrandsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [industryFilter, setIndustryFilter] = useState('All Industries');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [tierFilter, setTierFilter] = useState('All Tiers');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleViewBrand = (brandId: string) => {
    router.push(`/director/brands/${brandId}`);
  };

  const handleToggleExpand = (brandId: string) => {
    setExpandedBrand(expandedBrand === brandId ? null : brandId);
  };

  // Filter brands
  const filteredBrands = useMemo(() => {
    return mockBrands.filter((brand) => {
      const matchesSearch = brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brand.industry.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesIndustry = industryFilter === 'All Industries' ||
        brand.industry === industryFilter;
      const matchesStatus = statusFilter === 'All Status' ||
        brand.partnershipStatus === statusFilter.toLowerCase();
      const matchesTier = tierFilter === 'All Tiers' ||
        brand.tier === tierFilter.toLowerCase();
      return matchesSearch && matchesIndustry && matchesStatus && matchesTier;
    });
  }, [searchQuery, industryFilter, statusFilter, tierFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const activeBrands = mockBrands.filter(b => b.partnershipStatus === 'active');
    const totalSpent = mockBrands.reduce((sum, b) => sum + b.totalSpent, 0);
    const totalDeals = mockBrands.reduce((sum, b) => sum + b.activeDeals, 0);
    const totalCampaigns = mockBrands.reduce((sum, b) => sum + b.activeCampaigns.filter(c => c.status === 'active').length, 0);
    const totalAthletes = new Set(mockBrands.flatMap(b => Array(b.athleteCount).fill(0).map((_, i) => `${b.id}-${i}`))).size;

    return {
      totalBrands: mockBrands.length,
      activeBrands: activeBrands.length,
      verifiedBrands: mockBrands.filter(b => b.verified).length,
      totalSpent,
      totalDeals,
      totalCampaigns,
      uniqueAthletes: Math.min(totalAthletes, 85), // Cap at realistic number
      avgSpendPerBrand: totalSpent / mockBrands.length,
    };
  }, []);

  // Check for active filters
  const hasActiveFilters = industryFilter !== 'All Industries' || statusFilter !== 'All Status' || tierFilter !== 'All Tiers';

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Brand Partners</h1>
            <p className="text-[var(--text-muted)]">
              Manage brand partnerships and track active campaigns
            </p>
          </div>
        </div>

        {/* Stats Skeletons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between animate-pulse">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search Skeleton */}
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>

        {/* Brands Table Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="p-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b border-[var(--border-color)] last:border-0 animate-pulse">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16 rounded" />
                <div className="text-center space-y-1">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="text-center space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Brand Partners</h1>
          <p className="text-[var(--text-muted)]">
            Manage brand partnerships and track active campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" size="sm">
            {stats.totalCampaigns} Active Campaigns
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Active Partners</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.activeBrands}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                <Building className="h-5 w-5 text-[var(--color-primary)]" />
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {stats.verifiedBrands} verified
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Total Investment</p>
                <p className="text-2xl font-bold text-[var(--color-success)]">
                  {formatCurrency(stats.totalSpent)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-[var(--color-success)]/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-[var(--color-success)]" />
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Avg {formatCurrency(stats.avgSpendPerBrand)} per brand
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Active Deals</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalDeals}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-[var(--color-accent)]" />
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {stats.totalCampaigns} campaigns running
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Athletes Partnered</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.uniqueAthletes}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-[var(--color-warning)]/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-[var(--color-warning)]" />
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Working with brands
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search brands by name or industry..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<Search className="h-4 w-4" />}
                />
              </div>
              <Button
                variant={showFilters ? 'secondary' : 'outline'}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="primary" size="sm" className="ml-2">
                    {[industryFilter !== 'All Industries', statusFilter !== 'All Status', tierFilter !== 'All Tiers'].filter(Boolean).length}
                  </Badge>
                )}
                <ChevronDown className={cn('h-4 w-4 ml-2 transition-transform', showFilters && 'rotate-180')} />
              </Button>
            </div>

            {/* Filter Dropdowns */}
            {showFilters && (
              <div className="flex flex-wrap gap-4 pt-4 border-t border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--text-muted)]">Industry:</span>
                  <select
                    value={industryFilter}
                    onChange={(e) => setIndustryFilter(e.target.value)}
                    className="h-9 px-3 text-sm rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    {industryFilters.map((industry) => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--text-muted)]">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-9 px-3 text-sm rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    {statusFilters.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--text-muted)]">Tier:</span>
                  <select
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value)}
                    className="h-9 px-3 text-sm rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    {tierFilters.map((tier) => (
                      <option key={tier} value={tier}>{tier}</option>
                    ))}
                  </select>
                </div>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIndustryFilter('All Industries');
                      setStatusFilter('All Status');
                      setTierFilter('All Tiers');
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Brands List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Partner Brands ({filteredBrands.length})</CardTitle>
            {filteredBrands.length > 0 && (
              <p className="text-sm text-[var(--text-muted)]">
                Click to expand campaign details
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredBrands.length > 0 ? (
            filteredBrands.map((brand) => (
              <BrandRow
                key={brand.id}
                brand={brand}
                onView={handleViewBrand}
                expanded={expandedBrand === brand.id}
                onToggleExpand={() => handleToggleExpand(brand.id)}
              />
            ))
          ) : (
            <div className="p-12 text-center">
              <Building className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-4" />
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No brands found</h3>
              <p className="text-[var(--text-muted)] max-w-md mx-auto">
                {searchQuery || hasActiveFilters
                  ? 'Try adjusting your search or filters to find what you\'re looking for.'
                  : 'No brand partners have been added yet.'}
              </p>
              {(searchQuery || hasActiveFilters) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery('');
                    setIndustryFilter('All Industries');
                    setStatusFilter('All Status');
                    setTierFilter('All Tiers');
                  }}
                >
                  Clear all filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
