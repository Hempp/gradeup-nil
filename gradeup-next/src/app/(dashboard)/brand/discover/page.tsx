'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Heart, MapPin, Users, TrendingUp, X, Loader2, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Modal } from '@/components/ui/modal';
import { formatCompactNumber, formatCurrency, formatPercentage } from '@/lib/utils';
import { useRequireAuth } from '@/context';
import { searchAthletes, type AthleteFilters, type Athlete as ServiceAthlete } from '@/lib/services/athlete';
import { addToShortlist, removeFromShortlist } from '@/lib/services/brand';
import { useBrandShortlist } from '@/lib/hooks/use-data';
import { useToastActions } from '@/components/ui/toast';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { InstagramIcon, TikTokIcon, SOCIAL_BRAND_COLORS } from '@/components/ui/social-icons';
import { getSportGradient } from '@/lib/utils/sport-theme';
import { MOCK_ATHLETES, SPORTS, SCHOOLS } from '@/lib/mock-data/athletes';
import { AthleteDiscoveryCard } from '@/components/brand/AthleteDiscoveryCard';
import type { HighlightUrl } from '@/types';
import { HighlightTapeView } from '@/components/athlete/HighlightTapeSection';
import { MultiSelectDropdown, RangeSlider, FilterPanel, type FilterTag } from '@/components/filters';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS - Design System Compliance & Magic Number Prevention
// ═══════════════════════════════════════════════════════════════════════════

const FILTER_DEFAULTS = {
  FOLLOWER_MIN: 0,
  FOLLOWER_MAX: 500000,
  ENGAGEMENT_MIN: 0,
  ENGAGEMENT_MAX: 10,
  ENGAGEMENT_STEP: 0.5,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// SORT OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

type SortOption = 'relevance' | 'followers' | 'engagement' | 'nilValue';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'followers', label: 'Followers (High to Low)' },
  { value: 'engagement', label: 'Engagement Rate' },
  { value: 'nilValue', label: 'NIL Value' },
];

// ═══════════════════════════════════════════════════════════════════════════
// DEMO MODE DETECTION
// ═══════════════════════════════════════════════════════════════════════════

const isDemoMode = () => process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Athlete {
  id: string;
  name: string;
  school: string;
  sport: string;
  position: string;
  gpa: number;
  instagramFollowers: number;
  tiktokFollowers: number;
  twitterFollowers?: number;
  engagementRate: number;
  nilValue: number;
  verified: boolean;
  saved: boolean;
  coverImage?: string | null;
  avatarUrl?: string | null;
  highlightUrls?: HighlightUrl[];
  bio?: string;
  major?: string;
  academicYear?: string;
  hometown?: string;
}

interface Filters {
  sports: string[];
  followerMin: number;
  followerMax: number;
  engagementMin: number;
  school: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function AthleteSkeletonCard() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Cover skeleton */}
        <Skeleton className="h-28 w-full rounded-none" />

        {/* Avatar section skeleton - centered */}
        <div className="-mt-10 flex justify-center">
          <Skeleton className="h-20 w-20 rounded-full border-4 border-[var(--bg-card)]" />
        </div>

        {/* Content skeleton - centered */}
        <div className="p-4 pt-3 space-y-4">
          <div className="text-center">
            <Skeleton className="h-6 w-32 mx-auto mb-2" />
            <Skeleton className="h-4 w-40 mx-auto" />
          </div>

          {/* Stats skeleton - 2x2 grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-6 w-16" />
            </div>
            <div className="col-span-2 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
              <div className="flex justify-between">
                <div>
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-7 w-24" />
                </div>
                <div className="text-right">
                  <Skeleton className="h-3 w-8 mb-2 ml-auto" />
                  <Skeleton className="h-5 w-10 ml-auto" />
                </div>
              </div>
            </div>
          </div>

          {/* Buttons skeleton */}
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-12" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// AthleteDiscoveryCard component is imported from @/components/brand/AthleteDiscoveryCard
// Filter components are imported from @/components/filters

/**
 * DiscoverFilterPanel - Wraps the generic FilterPanel with discover-specific filter controls
 */
function DiscoverFilterPanel({
  filters,
  onFiltersChange,
  onClear,
}: {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onClear: () => void;
}) {
  const hasActiveFilters =
    filters.sports.length > 0 ||
    filters.followerMin > FILTER_DEFAULTS.FOLLOWER_MIN ||
    filters.followerMax < FILTER_DEFAULTS.FOLLOWER_MAX ||
    filters.engagementMin > FILTER_DEFAULTS.ENGAGEMENT_MIN ||
    filters.school !== '';

  const activeFilterCount = [
    filters.sports.length > 0,
    filters.followerMin > FILTER_DEFAULTS.FOLLOWER_MIN,
    filters.followerMax < FILTER_DEFAULTS.FOLLOWER_MAX,
    filters.engagementMin > FILTER_DEFAULTS.ENGAGEMENT_MIN,
    filters.school !== '',
  ].filter(Boolean).length;

  // Build filter tags for display
  const filterTags: FilterTag[] = [
    ...filters.sports.map((sport) => ({
      id: `sport-${sport}`,
      label: sport,
      onRemove: () => onFiltersChange({ ...filters, sports: filters.sports.filter(s => s !== sport) }),
    })),
    ...(filters.followerMin > FILTER_DEFAULTS.FOLLOWER_MIN ? [{
      id: 'follower-min',
      label: `Min: ${formatCompactNumber(filters.followerMin)} followers`,
      onRemove: () => onFiltersChange({ ...filters, followerMin: FILTER_DEFAULTS.FOLLOWER_MIN }),
    }] : []),
    ...(filters.followerMax < FILTER_DEFAULTS.FOLLOWER_MAX ? [{
      id: 'follower-max',
      label: `Max: ${formatCompactNumber(filters.followerMax)} followers`,
      onRemove: () => onFiltersChange({ ...filters, followerMax: FILTER_DEFAULTS.FOLLOWER_MAX }),
    }] : []),
    ...(filters.engagementMin > FILTER_DEFAULTS.ENGAGEMENT_MIN ? [{
      id: 'engagement-min',
      label: `${filters.engagementMin}%+ engagement`,
      onRemove: () => onFiltersChange({ ...filters, engagementMin: FILTER_DEFAULTS.ENGAGEMENT_MIN }),
    }] : []),
    ...(filters.school ? [{
      id: 'school',
      label: filters.school,
      onRemove: () => onFiltersChange({ ...filters, school: '' }),
    }] : []),
  ];

  return (
    <FilterPanel
      hasActiveFilters={hasActiveFilters}
      activeFilterCount={activeFilterCount}
      onClearAll={onClear}
      filterTags={filterTags}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Sport Multi-select */}
        <MultiSelectDropdown
          label="Sport"
          options={SPORTS}
          selected={filters.sports}
          onChange={(newSports) => onFiltersChange({ ...filters, sports: newSports })}
          placeholder="All sports"
        />

        {/* Follower Range */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Followers (min)</label>
          <Input
            type="number"
            placeholder="Min followers"
            value={filters.followerMin || ''}
            onChange={(e) => onFiltersChange({ ...filters, followerMin: Number(e.target.value) || 0 })}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Followers (max)</label>
          <Input
            type="number"
            placeholder="Max followers"
            value={filters.followerMax === 500000 ? '' : filters.followerMax}
            onChange={(e) => onFiltersChange({ ...filters, followerMax: Number(e.target.value) || 500000 })}
          />
        </div>

        {/* Engagement Rate */}
        <RangeSlider
          label="Min Engagement Rate"
          min={0}
          max={10}
          step={0.5}
          value={filters.engagementMin}
          onChange={(engagementMin) => onFiltersChange({ ...filters, engagementMin })}
          formatValue={(v) => `${v}%+`}
        />

        {/* School Search */}
        <div>
          <label htmlFor="school-filter" className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">School</label>
          <select
            id="school-filter"
            value={filters.school}
            onChange={(e) => onFiltersChange({ ...filters, school: e.target.value })}
            className="w-full h-10 px-3 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] transition-colors duration-150 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          >
            <option value="">All schools</option>
            {SCHOOLS.map((school) => (
              <option key={school} value={school}>{school}</option>
            ))}
          </select>
        </div>
      </div>
    </FilterPanel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function BrandDiscoverPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [athletes, setAthletes] = useState<ServiceAthlete[]>([]);
  const [fetchError, setFetchError] = useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    sports: [],
    followerMin: FILTER_DEFAULTS.FOLLOWER_MIN,
    followerMax: FILTER_DEFAULTS.FOLLOWER_MAX,
    engagementMin: FILTER_DEFAULTS.ENGAGEMENT_MIN,
    school: '',
  });
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set()); // Track save operations
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [showShortlistModal, setShowShortlistModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);

  // Auth and brand data
  const { roleData, isLoading: authLoading } = useRequireAuth({ allowedRoles: ['brand'] });
  const brandData = roleData as { id: string } | null;
  const { data: shortlist, refetch: refetchShortlist } = useBrandShortlist(brandData?.id);
  const toast = useToastActions();

  // Update shortlistedIds when shortlist changes
  useEffect(() => {
    if (shortlist) {
      setShortlistedIds(new Set(shortlist.map(a => a.id)));
    }
  }, [shortlist]);

  // Fetch athletes from Supabase (or use mock data in demo mode)
  const fetchAthletes = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      // In demo mode, skip Supabase and use mock data
      if (isDemoMode()) {
        // Simulate network delay for realism
        await new Promise(resolve => setTimeout(resolve, 300));
        setAthletes([]); // Clear Supabase athletes, we'll use displayAthletes which falls back to mock
        setIsLoading(false);
        return;
      }

      const apiFilters: AthleteFilters = {
        search: searchQuery || undefined,
        min_gpa: filters.engagementMin > 0 ? filters.engagementMin : undefined,
        page_size: 50,
      };
      const result = await searchAthletes(apiFilters);
      if (result.data) {
        setAthletes(result.data.athletes);
      }
    } catch (err) {
      console.error('Error fetching athletes:', err);
      setFetchError(err instanceof Error ? err : new Error('Failed to fetch athletes'));
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filters.engagementMin]);

  // Handle retry
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      await fetchAthletes();
    } finally {
      setIsRetrying(false);
    }
  }, [fetchAthletes]);

  // Fetch athletes on mount and when search changes
  useEffect(() => {
    if (!authLoading) {
      fetchAthletes();
    }
  }, [fetchAthletes, authLoading]);

  // Convert Supabase athlete to local Athlete format for display
  // In demo mode or when no Supabase data, use mock athletes
  const displayAthletes = useMemo(() => {
    // Use mock data in demo mode or when no athletes from Supabase
    if (isDemoMode() || athletes.length === 0) {
      return MOCK_ATHLETES.map((athlete) => ({
        ...athlete,
        saved: shortlistedIds.has(athlete.id),
      }));
    }

    // Transform Supabase data
    return athletes.map((athlete): Athlete => ({
      id: athlete.id,
      name: athlete.profile
        ? `${athlete.profile.first_name || ''} ${athlete.profile.last_name || ''}`.trim()
        : 'Unknown Athlete',
      school: athlete.school?.name || 'Unknown School',
      sport: athlete.sport?.name || 'Unknown Sport',
      position: athlete.position || '',
      gpa: athlete.gpa || 0,
      instagramFollowers: 0, // Would come from social integration
      tiktokFollowers: 0,
      engagementRate: 0,
      nilValue: athlete.nil_valuation || 0,
      verified: true,
      saved: shortlistedIds.has(athlete.id),
      coverImage: null,
    }));
  }, [athletes, shortlistedIds]);

  // Filter and sort athletes based on local filters
  const filteredAthletes = useMemo(() => {
    const filtered = displayAthletes.filter((athlete) => {
      // Sport filter
      const matchesSport = filters.sports.length === 0 || filters.sports.includes(athlete.sport);

      // School filter
      const matchesSchool = filters.school === '' || athlete.school === filters.school;

      return matchesSport && matchesSchool;
    });

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'followers':
          return (b.instagramFollowers + b.tiktokFollowers) - (a.instagramFollowers + a.tiktokFollowers);
        case 'engagement':
          return b.engagementRate - a.engagementRate;
        case 'nilValue':
          return b.nilValue - a.nilValue;
        case 'relevance':
        default:
          // For relevance, prioritize verified athletes with higher engagement
          const scoreA = (a.verified ? 1000 : 0) + a.engagementRate * 100 + a.nilValue / 1000;
          const scoreB = (b.verified ? 1000 : 0) + b.engagementRate * 100 + b.nilValue / 1000;
          return scoreB - scoreA;
      }
    });
  }, [displayAthletes, filters, sortBy]);

  // Toggle save/shortlist - Optimistic update with rollback on error
  const handleToggleSave = useCallback(async (athleteId: string) => {
    // Prevent double-clicks
    if (savingIds.has(athleteId)) return;

    const isSaved = shortlistedIds.has(athleteId);
    const previousState = new Set(shortlistedIds);

    // Mark as saving
    setSavingIds(prev => new Set([...prev, athleteId]));

    // Optimistic update
    setShortlistedIds(prev => {
      const next = new Set(prev);
      if (isSaved) {
        next.delete(athleteId);
      } else {
        next.add(athleteId);
      }
      return next;
    });

    try {
      const result = isSaved
        ? await removeFromShortlist(athleteId)
        : await addToShortlist(athleteId);

      if (result.error) {
        // Rollback on error
        setShortlistedIds(previousState);
        toast.error('Error', result.error.message);
        return;
      }

      toast.success(
        isSaved ? 'Removed' : 'Added',
        isSaved ? 'Athlete removed from shortlist' : 'Athlete added to shortlist'
      );
      refetchShortlist();
    } catch {
      // Rollback on exception
      setShortlistedIds(previousState);
      toast.error('Error', 'Failed to update shortlist');
    } finally {
      // Clear saving state
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(athleteId);
        return next;
      });
    }
  }, [shortlistedIds, savingIds, toast, refetchShortlist]);

  // Clear all filters - Uses constants for default values
  const handleClearFilters = useCallback(() => {
    setFilters({
      sports: [],
      followerMin: FILTER_DEFAULTS.FOLLOWER_MIN,
      followerMax: FILTER_DEFAULTS.FOLLOWER_MAX,
      engagementMin: FILTER_DEFAULTS.ENGAGEMENT_MIN,
      school: '',
    });
    setSearchQuery('');
  }, []);

  // Count saved athletes
  const savedCount = shortlistedIds.size;

  // Handle view profile - Memoized to prevent unnecessary re-renders
  const handleViewProfile = useCallback((athlete: Athlete) => {
    setSelectedAthlete(athlete);
    setShowProfileModal(true);
  }, []);

  // Handle view shortlist
  const handleViewShortlist = useCallback(() => {
    setShowShortlistModal(true);
  }, []);

  // Get shortlisted athletes
  const shortlistedAthletes = useMemo(() => {
    return displayAthletes.filter(athlete => shortlistedIds.has(athlete.id));
  }, [displayAthletes, shortlistedIds]);

  // Show loading state while auth is checking
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  // Show error state if data fetch failed (and not in demo mode with fallback data)
  if (fetchError && !isLoading && !isDemoMode()) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Discover Athletes</h1>
          <p className="text-[var(--text-muted)]">
            Find and connect with top student-athletes
          </p>
        </div>
        <Card>
          <ErrorState
            errorType="data"
            title="Failed to load athletes"
            description={fetchError.message || 'We could not load athlete data. Please try again.'}
            onRetry={handleRetry}
            isRetrying={isRetrying}
          />
        </Card>
      </div>
    );
  }

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalFollowers = displayAthletes.reduce((sum, a) => sum + a.instagramFollowers + a.tiktokFollowers, 0);
    const avgEngagement = displayAthletes.reduce((sum, a) => sum + a.engagementRate, 0) / displayAthletes.length;
    const totalNilValue = displayAthletes.reduce((sum, a) => sum + a.nilValue, 0);
    const verifiedCount = displayAthletes.filter(a => a.verified).length;
    return { totalFollowers, avgEngagement, totalNilValue, verifiedCount };
  }, [displayAthletes]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header with Hero Section */}
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-secondary)] to-[var(--color-magenta)] p-6 md:p-8">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Discover Athletes
              </h1>
              <p className="text-white/80 max-w-md">
                Find and connect with top student-athletes for your brand campaigns. Browse verified profiles with real engagement metrics.
              </p>
            </div>
            {savedCount > 0 && (
              <Button
                variant="secondary"
                onClick={handleViewShortlist}
                className="bg-white text-[var(--color-primary)] hover:bg-white/90 shadow-lg"
              >
                <Heart className="h-4 w-4 mr-2 fill-current" />
                View Shortlist ({savedCount})
              </Button>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-[var(--radius-md)] p-3">
              <p className="text-xs text-white/70 uppercase tracking-wider">Athletes</p>
              <p className="text-2xl font-bold text-white">{displayAthletes.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-[var(--radius-md)] p-3">
              <p className="text-xs text-white/70 uppercase tracking-wider">Total Reach</p>
              <p className="text-2xl font-bold text-white">{formatCompactNumber(summaryStats.totalFollowers)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-[var(--radius-md)] p-3">
              <p className="text-xs text-white/70 uppercase tracking-wider">Avg. Engagement</p>
              <p className="text-2xl font-bold text-white">{summaryStats.avgEngagement.toFixed(1)}%</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-[var(--radius-md)] p-3">
              <p className="text-xs text-white/70 uppercase tracking-wider">Verified</p>
              <p className="text-2xl font-bold text-white">{summaryStats.verifiedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar - Enhanced with Accessibility */}
      <div className="relative" role="search">
        <label htmlFor="athlete-search" className="sr-only">
          Search athletes by name, school, sport, or position
        </label>
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none" aria-hidden="true">
          <Search className="h-5 w-5 text-[var(--text-muted)]" />
        </div>
        <input
          id="athlete-search"
          type="search"
          placeholder="Search by name, school, sport, or position..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search athletes"
          className="w-full h-14 pl-12 pr-12 rounded-[var(--radius-lg)] bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] text-base placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all duration-150 shadow-sm motion-reduce:transition-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Filter Panel */}
      <DiscoverFilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        onClear={handleClearFilters}
      />

      {/* Results Info - Live region for screen readers */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
          )}
          <p
            className="text-sm text-[var(--text-muted)]"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {isLoading ? (
              <span>Searching athletes...</span>
            ) : (
              <>
                Showing <span className="font-medium text-[var(--text-primary)]">{filteredAthletes.length}</span> athletes
                {(searchQuery || filters.sports.length > 0 || filters.school) && (
                  <span> matching your criteria</span>
                )}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-sm text-[var(--text-muted)]">Sort by:</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="h-8 px-2 rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-colors duration-150"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <AthleteSkeletonCard key={i} />
          ))}
        </div>
      ) : filteredAthletes.length > 0 ? (
        <div className="relative">
          {/* Filter loading overlay - shows briefly when filters change */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 transition-opacity duration-200"
            style={{ opacity: 1 }}
          >
            {filteredAthletes.map((athlete) => (
              <AthleteDiscoveryCard
                key={athlete.id}
                athlete={athlete}
                onToggleSave={handleToggleSave}
                onViewProfile={handleViewProfile}
              />
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={Users}
            title="No athletes found"
            description="Try adjusting your filters or search criteria to find more athletes."
            action={{ label: 'Clear Filters', onClick: handleClearFilters }}
          />
        </Card>
      )}

      {/* Athlete Profile Modal */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title=""
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowProfileModal(false)}>
              Close
            </Button>
            {selectedAthlete && (
              <>
                <Button
                  variant={selectedAthlete.saved ? 'secondary' : 'outline'}
                  onClick={() => {
                    handleToggleSave(selectedAthlete.id);
                  }}
                  aria-label={`${selectedAthlete.saved ? 'Remove' : 'Add'} ${selectedAthlete.name} ${selectedAthlete.saved ? 'from' : 'to'} shortlist`}
                >
                  <Heart className={`h-4 w-4 mr-2 ${selectedAthlete.saved ? 'fill-current' : ''}`} />
                  {selectedAthlete.saved ? 'Saved' : 'Save'}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    const athleteId = selectedAthlete.id;
                    setShowProfileModal(false);
                    setSelectedAthlete(null);
                    router.push(`/brand/athletes/${athleteId}`);
                  }}
                  aria-label={`View full profile for ${selectedAthlete.name}`}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  View Full Profile
                </Button>
              </>
            )}
          </>
        }
      >
        {selectedAthlete && (
          <div className="space-y-6 -mt-4">
            {/* Profile Header with Gradient Banner */}
            <div className="relative">
              {/* Banner */}
              <div className={`h-32 bg-gradient-to-br ${getSportGradient(selectedAthlete.sport)} rounded-t-[var(--radius-lg)] relative overflow-hidden -mx-6 -mt-2`}>
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: 'radial-gradient(circle at 25% 25%, white 2%, transparent 2%), radial-gradient(circle at 75% 75%, white 2%, transparent 2%)',
                  backgroundSize: '24px 24px'
                }} />
                {/* Sport & Position tags */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <Badge variant="default" size="sm" className="bg-black/40 backdrop-blur-sm text-white border-0 font-medium">
                    {selectedAthlete.sport}
                  </Badge>
                  <Badge variant="default" size="sm" className="bg-white/20 backdrop-blur-sm text-white border-0">
                    {selectedAthlete.position}
                  </Badge>
                </div>
              </div>

              {/* Avatar overlapping banner */}
              <div className="absolute -bottom-12 left-6">
                <div className="relative">
                  <Avatar
                    src={selectedAthlete.avatarUrl || undefined}
                    fallback={selectedAthlete.name.split(' ').map(n => n[0]).join('')}
                    size="xl"
                    className="h-24 w-24 text-2xl border-4 border-[var(--bg-card)] shadow-xl ring-2 ring-[var(--color-primary)]/30"
                  />
                  {selectedAthlete.verified && (
                    <VerifiedBadge className="absolute -bottom-1 -right-1 h-6 w-6 border-2 border-[var(--bg-card)]" />
                  )}
                </div>
              </div>
            </div>

            {/* Name & School - with offset for avatar */}
            <div className="pt-8 pl-32">
              <h3 className="text-2xl font-bold text-[var(--text-primary)]">
                {selectedAthlete.name}
              </h3>
              <p className="text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                <MapPin className="h-4 w-4" />
                {selectedAthlete.school}
              </p>
            </div>

            {/* NIL Valuation Highlight */}
            <div className="p-4 rounded-[var(--radius-lg)] bg-gradient-to-r from-[var(--color-primary)]/15 via-[var(--color-primary)]/10 to-transparent border border-[var(--color-primary)]/20">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-medium">Estimated NIL Valuation</span>
                  <p className="font-bold text-3xl text-[var(--color-primary)]">
                    {formatCurrency(selectedAthlete.nilValue)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Academic GPA</span>
                  <p className="font-bold text-2xl text-[var(--text-primary)]">{selectedAthlete.gpa.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Social Stats Grid - 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)] hover:from-[var(--bg-secondary)] hover:to-[var(--bg-tertiary)] transition-colors motion-reduce:transition-none">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center"
                    style={{ background: `linear-gradient(to bottom right, ${SOCIAL_BRAND_COLORS.INSTAGRAM.from}, ${SOCIAL_BRAND_COLORS.INSTAGRAM.to})` }}
                    aria-hidden="true"
                  >
                    <InstagramIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Instagram</p>
                    <p className="font-bold text-xl text-[var(--text-primary)]">
                      {formatCompactNumber(selectedAthlete.instagramFollowers)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)] hover:from-[var(--bg-secondary)] hover:to-[var(--bg-tertiary)] transition-colors motion-reduce:transition-none">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: SOCIAL_BRAND_COLORS.TIKTOK.bg }}
                    aria-hidden="true"
                  >
                    <TikTokIcon />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">TikTok</p>
                    <p className="font-bold text-xl text-[var(--text-primary)]">
                      {formatCompactNumber(selectedAthlete.tiktokFollowers)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)] hover:from-[var(--bg-secondary)] hover:to-[var(--bg-tertiary)] transition-colors motion-reduce:transition-none">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-full bg-[var(--color-success)]/20 flex items-center justify-center" aria-hidden="true">
                    <TrendingUp className="h-5 w-5 text-[var(--color-success)]" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Engagement Rate</p>
                    <p className="font-bold text-xl text-[var(--color-success)]">
                      {formatPercentage(selectedAthlete.engagementRate)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)] hover:from-[var(--bg-secondary)] hover:to-[var(--bg-tertiary)] transition-colors motion-reduce:transition-none">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center" aria-hidden="true">
                    <Users className="h-5 w-5 text-[var(--color-primary)]" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Total Reach</p>
                    <p className="font-bold text-xl text-[var(--text-primary)]">
                      {formatCompactNumber(selectedAthlete.instagramFollowers + selectedAthlete.tiktokFollowers)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Status */}
            <div className="flex items-center justify-between p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
              <div className="flex items-center gap-3">
                {selectedAthlete.verified ? (
                  <div className="h-10 w-10 rounded-full bg-[var(--color-success)]/20 flex items-center justify-center">
                    <svg className="h-5 w-5 text-[var(--color-success)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-[var(--color-warning)]/20 flex items-center justify-center">
                    <svg className="h-5 w-5 text-[var(--color-warning)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
                <div>
                  <p className="font-medium text-[var(--text-primary)]">
                    {selectedAthlete.verified ? 'Verified Athlete' : 'Verification Pending'}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {selectedAthlete.verified
                      ? 'Identity, enrollment, and athletic status confirmed'
                      : 'Verification in progress'}
                  </p>
                </div>
              </div>
              <Badge variant={selectedAthlete.verified ? 'success' : 'warning'}>
                {selectedAthlete.verified ? 'Verified' : 'Pending'}
              </Badge>
            </div>

            {/* Highlight Videos */}
            {selectedAthlete.highlightUrls && selectedAthlete.highlightUrls.length > 0 && (
              <div className="border-t border-[var(--border-color)] pt-6">
                <HighlightTapeView
                  highlights={selectedAthlete.highlightUrls}
                  title="Highlight Videos"
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Shortlist Modal - Enhanced */}
      <Modal
        isOpen={showShortlistModal}
        onClose={() => setShowShortlistModal(false)}
        title=""
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setShowShortlistModal(false)}>
            Close
          </Button>
        }
      >
        {shortlistedAthletes.length > 0 ? (
          <div className="space-y-4 -mt-2">
            {/* Shortlist Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[var(--color-gold)]/20 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-[var(--color-gold)] fill-current" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Your Shortlist</h3>
                  <p className="text-sm text-[var(--text-muted)]">{shortlistedAthletes.length} athlete{shortlistedAthletes.length !== 1 ? 's' : ''} saved</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Total NIL Value</p>
                <p className="text-xl font-bold text-[var(--color-primary)]">
                  {formatCurrency(shortlistedAthletes.reduce((sum, a) => sum + a.nilValue, 0))}
                </p>
              </div>
            </div>

            {/* Shortlist Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] text-center">
                <p className="text-xs text-[var(--text-muted)]">Total Reach</p>
                <p className="font-semibold text-[var(--text-primary)]">
                  {formatCompactNumber(shortlistedAthletes.reduce((sum, a) => sum + a.instagramFollowers + a.tiktokFollowers, 0))}
                </p>
              </div>
              <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] text-center">
                <p className="text-xs text-[var(--text-muted)]">Avg. Engagement</p>
                <p className="font-semibold text-[var(--color-success)]">
                  {(shortlistedAthletes.reduce((sum, a) => sum + a.engagementRate, 0) / shortlistedAthletes.length).toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] text-center">
                <p className="text-xs text-[var(--text-muted)]">Sports</p>
                <p className="font-semibold text-[var(--text-primary)]">
                  {new Set(shortlistedAthletes.map(a => a.sport)).size}
                </p>
              </div>
            </div>

            {/* Athlete List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {shortlistedAthletes.map((athlete) => (
                <div
                  key={athlete.id}
                  className="flex items-center gap-4 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors motion-reduce:transition-none group"
                >
                  <div className="relative">
                    <Avatar
                      src={athlete.avatarUrl || undefined}
                      fallback={athlete.name.split(' ').map(n => n[0]).join('')}
                      size="md"
                      className="ring-2 ring-[var(--color-primary)]/20"
                    />
                    {athlete.verified && (
                      <VerifiedBadge className="absolute -bottom-0.5 -right-0.5 h-4 w-4 border border-[var(--bg-tertiary)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                      {athlete.name}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                      <Badge variant="outline" size="sm" className="text-[10px]">{athlete.sport}</Badge>
                      <span className="truncate">{athlete.school}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="font-semibold text-[var(--color-primary)]">
                        {formatCurrency(athlete.nilValue)}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {formatCompactNumber(athlete.instagramFollowers + athlete.tiktokFollowers)} reach
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedAthlete(athlete);
                          setShowShortlistModal(false);
                          setShowProfileModal(true);
                        }}
                        className="px-3"
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleSave(athlete.id)}
                        className="px-2 text-[var(--text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-8">
            <EmptyState
              icon={Heart}
              title="No athletes shortlisted"
              description="Start browsing athletes and add them to your shortlist by clicking the heart icon."
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
