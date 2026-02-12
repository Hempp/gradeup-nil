'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Heart, MapPin, Users, TrendingUp, DollarSign, SlidersHorizontal, X, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCompactNumber, formatCurrency, formatPercentage } from '@/lib/utils';
import { useRequireAuth } from '@/context';
import { searchAthletes, type AthleteFilters, type Athlete as ServiceAthlete } from '@/lib/services/athlete';
import { addToShortlist, removeFromShortlist } from '@/lib/services/brand';
import { useBrandShortlist } from '@/lib/hooks/use-data';
import { useToastActions } from '@/components/ui/toast';
import type { Athlete as AthleteType } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════

const mockAthletes = [
  {
    id: '1',
    name: 'Marcus Johnson',
    school: 'Duke University',
    sport: 'Basketball',
    position: 'Point Guard',
    gpa: 3.87,
    instagramFollowers: 125000,
    tiktokFollowers: 89000,
    engagementRate: 4.2,
    nilValue: 125000,
    verified: true,
    saved: false,
    coverImage: null,
  },
  {
    id: '2',
    name: 'Sarah Williams',
    school: 'Stanford University',
    sport: 'Soccer',
    position: 'Forward',
    gpa: 3.92,
    instagramFollowers: 89000,
    tiktokFollowers: 120000,
    engagementRate: 5.1,
    nilValue: 95000,
    verified: true,
    saved: true,
    coverImage: null,
  },
  {
    id: '3',
    name: 'Jordan Davis',
    school: 'Ohio State University',
    sport: 'Football',
    position: 'Quarterback',
    gpa: 3.65,
    instagramFollowers: 210000,
    tiktokFollowers: 180000,
    engagementRate: 3.8,
    nilValue: 250000,
    verified: true,
    saved: false,
    coverImage: null,
  },
  {
    id: '4',
    name: 'Emma Chen',
    school: 'UCLA',
    sport: 'Gymnastics',
    position: 'All-Around',
    gpa: 3.95,
    instagramFollowers: 150000,
    tiktokFollowers: 250000,
    engagementRate: 6.3,
    nilValue: 180000,
    verified: true,
    saved: false,
    coverImage: null,
  },
  {
    id: '5',
    name: 'Tyler Brooks',
    school: 'University of Michigan',
    sport: 'Basketball',
    position: 'Shooting Guard',
    gpa: 3.72,
    instagramFollowers: 95000,
    tiktokFollowers: 75000,
    engagementRate: 4.8,
    nilValue: 110000,
    verified: true,
    saved: true,
    coverImage: null,
  },
  {
    id: '6',
    name: 'Mia Rodriguez',
    school: 'University of Texas',
    sport: 'Volleyball',
    position: 'Setter',
    gpa: 3.88,
    instagramFollowers: 78000,
    tiktokFollowers: 95000,
    engagementRate: 5.5,
    nilValue: 85000,
    verified: true,
    saved: false,
    coverImage: null,
  },
  {
    id: '7',
    name: 'Jaylen Thomas',
    school: 'USC',
    sport: 'Football',
    position: 'Wide Receiver',
    gpa: 3.45,
    instagramFollowers: 175000,
    tiktokFollowers: 140000,
    engagementRate: 3.2,
    nilValue: 195000,
    verified: true,
    saved: false,
    coverImage: null,
  },
  {
    id: '8',
    name: 'Olivia Martinez',
    school: 'Florida State University',
    sport: 'Swimming',
    position: 'Freestyle',
    gpa: 3.91,
    instagramFollowers: 65000,
    tiktokFollowers: 110000,
    engagementRate: 7.2,
    nilValue: 72000,
    verified: true,
    saved: false,
    coverImage: null,
  },
  {
    id: '9',
    name: 'DeShawn Williams',
    school: 'University of Alabama',
    sport: 'Football',
    position: 'Running Back',
    gpa: 3.52,
    instagramFollowers: 320000,
    tiktokFollowers: 280000,
    engagementRate: 4.5,
    nilValue: 420000,
    verified: true,
    saved: false,
    coverImage: null,
  },
];

const sports = [
  'Basketball',
  'Football',
  'Soccer',
  'Volleyball',
  'Gymnastics',
  'Swimming',
  'Tennis',
  'Track & Field',
  'Baseball',
  'Softball',
];

const schools = [
  'Duke University',
  'Stanford University',
  'Ohio State University',
  'UCLA',
  'University of Michigan',
  'University of Texas',
  'USC',
  'Florida State University',
  'University of Alabama',
];

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
  engagementRate: number;
  nilValue: number;
  verified: boolean;
  saved: boolean;
  coverImage: string | null;
}

interface Filters {
  sports: string[];
  followerMin: number;
  followerMax: number;
  engagementMin: number;
  school: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════

const TikTokIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className || "h-3 w-3"} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function AthleteSkeletonCard() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Cover skeleton */}
        <Skeleton className="h-24 w-full rounded-none" />

        {/* Avatar section skeleton */}
        <div className="px-4 -mt-8 relative">
          <Skeleton className="h-16 w-16 rounded-full border-4 border-[var(--bg-card)]" />
        </div>

        {/* Content skeleton */}
        <div className="p-4 pt-3 space-y-3">
          <div>
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>

          {/* Stats skeleton */}
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center p-2 rounded-[var(--radius-sm)] bg-[var(--bg-tertiary)]">
                <Skeleton className="h-4 w-8 mx-auto mb-1" />
                <Skeleton className="h-3 w-10 mx-auto" />
              </div>
            ))}
          </div>

          {/* Buttons skeleton */}
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 flex-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AthleteDiscoveryCard({ athlete, onToggleSave }: { athlete: Athlete; onToggleSave: (id: string) => void }) {
  const totalFollowers = athlete.instagramFollowers + athlete.tiktokFollowers;

  return (
    <Card
      hover
      className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
    >
      <CardContent className="p-0">
        {/* Cover Photo / Sport Gradient */}
        <div className="h-24 bg-gradient-to-br from-[var(--color-secondary)] via-[var(--color-magenta)] to-[var(--color-primary)] relative">
          {/* Shortlist Heart Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(athlete.id);
            }}
            className={`
              absolute top-3 right-3 h-9 w-9 rounded-full
              flex items-center justify-center
              transition-all duration-200
              ${athlete.saved
                ? 'bg-[var(--color-gold)] text-[var(--text-inverse)] shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30 hover:scale-110'
              }
            `}
            aria-label={athlete.saved ? 'Remove from shortlist' : 'Add to shortlist'}
          >
            <Heart className={`h-4 w-4 ${athlete.saved ? 'fill-current' : ''}`} />
          </button>

          {/* Sport label */}
          <div className="absolute bottom-3 left-3">
            <Badge variant="default" size="sm" className="bg-white/20 backdrop-blur-sm text-white border-0">
              {athlete.sport}
            </Badge>
          </div>
        </div>

        {/* Avatar Section */}
        <div className="px-4 -mt-8 relative flex items-end gap-3">
          <Avatar
            fallback={athlete.name.split(' ').map(n => n[0]).join('')}
            size="xl"
            className="h-16 w-16 text-lg border-4 border-[var(--bg-card)] shadow-md"
          />
          <div className="pb-1">
            <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-primary)] transition-colors leading-tight">
              {athlete.name}
            </h3>
            <p className="text-sm text-[var(--text-muted)] flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {athlete.school}
            </p>
          </div>
        </div>

        {/* Position Badge */}
        <div className="px-4 pt-2 pb-1">
          <span className="text-xs text-[var(--text-secondary)]">
            {athlete.position}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-4 gap-2 mb-4">
            {/* Instagram */}
            <div className="text-center p-2 rounded-[var(--radius-sm)] bg-[var(--bg-tertiary)] group/stat hover:bg-[var(--bg-secondary)] transition-colors">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <InstagramIcon className="h-3 w-3 text-[#E4405F]" />
              </div>
              <p className="font-semibold text-sm text-[var(--text-primary)]">
                {formatCompactNumber(athlete.instagramFollowers)}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">IG</p>
            </div>

            {/* TikTok */}
            <div className="text-center p-2 rounded-[var(--radius-sm)] bg-[var(--bg-tertiary)] group/stat hover:bg-[var(--bg-secondary)] transition-colors">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <TikTokIcon />
              </div>
              <p className="font-semibold text-sm text-[var(--text-primary)]">
                {formatCompactNumber(athlete.tiktokFollowers)}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">TikTok</p>
            </div>

            {/* Engagement Rate */}
            <div className="text-center p-2 rounded-[var(--radius-sm)] bg-[var(--bg-tertiary)] group/stat hover:bg-[var(--bg-secondary)] transition-colors">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <TrendingUp className="h-3 w-3 text-[var(--color-success)]" />
              </div>
              <p className="font-semibold text-sm text-[var(--color-success)]">
                {formatPercentage(athlete.engagementRate)}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">Eng.</p>
            </div>

            {/* NIL Value */}
            <div className="text-center p-2 rounded-[var(--radius-sm)] bg-[var(--bg-tertiary)] group/stat hover:bg-[var(--bg-secondary)] transition-colors">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <DollarSign className="h-3 w-3 text-[var(--color-primary)]" />
              </div>
              <p className="font-semibold text-sm text-[var(--color-primary)]">
                ${formatCompactNumber(athlete.nilValue)}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">Value</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="primary" size="sm" className="flex-1">
              View Profile
            </Button>
            <Button
              variant={athlete.saved ? 'secondary' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(athlete.id);
              }}
            >
              <Heart className={`h-4 w-4 mr-1 ${athlete.saved ? 'fill-current' : ''}`} />
              {athlete.saved ? 'Saved' : 'Shortlist'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select...',
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full h-10 px-3 text-left
          rounded-[var(--radius-md)]
          bg-[var(--bg-secondary)] border border-[var(--border-color)]
          text-sm text-[var(--text-primary)]
          transition-colors duration-[var(--transition-fast)]
          focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
          flex items-center justify-between
        `}
      >
        <span className={selected.length === 0 ? 'text-[var(--text-muted)]' : ''}>
          {selected.length === 0 ? placeholder : `${selected.length} selected`}
        </span>
        <svg className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 mt-1 w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-md)] shadow-lg max-h-60 overflow-auto">
            {options.map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--bg-tertiary)] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggleOption(option)}
                  className="h-4 w-4 rounded border-[var(--border-color)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <span className="text-sm text-[var(--text-primary)]">{option}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RangeSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  formatValue,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  formatValue: (value: number) => string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-[var(--text-muted)]">{label}</label>
        <span className="text-xs font-medium text-[var(--color-primary)]">{formatValue(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
      />
    </div>
  );
}

function FilterPanel({
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
    filters.followerMin > 0 ||
    filters.followerMax < 500000 ||
    filters.engagementMin > 0 ||
    filters.school !== '';

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[var(--color-primary)]" />
            <span className="font-medium text-[var(--text-primary)]">Filters</span>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="h-4 w-4 mr-1" />
              Clear all
            </Button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Sport Multi-select */}
          <MultiSelectDropdown
            label="Sport"
            options={sports}
            selected={filters.sports}
            onChange={(sports) => onFiltersChange({ ...filters, sports })}
            placeholder="All sports"
          />

          {/* Follower Range */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Followers (min)</label>
            <Input
              type="number"
              placeholder="Min followers"
              value={filters.followerMin || ''}
              onChange={(e) => onFiltersChange({ ...filters, followerMin: Number(e.target.value) || 0 })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Followers (max)</label>
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
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">School</label>
            <select
              value={filters.school}
              onChange={(e) => onFiltersChange({ ...filters, school: e.target.value })}
              className={`
                w-full h-10 px-3
                rounded-[var(--radius-md)]
                bg-[var(--bg-secondary)] border border-[var(--border-color)]
                text-sm text-[var(--text-primary)]
                transition-colors duration-[var(--transition-fast)]
                focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
              `}
            >
              <option value="">All schools</option>
              {schools.map((school) => (
                <option key={school} value={school}>{school}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active filter tags */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[var(--border-color)]">
            {filters.sports.map((sport) => (
              <Badge key={sport} variant="primary" size="sm" className="cursor-pointer" onClick={() => onFiltersChange({ ...filters, sports: filters.sports.filter(s => s !== sport) })}>
                {sport}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
            {filters.followerMin > 0 && (
              <Badge variant="primary" size="sm" className="cursor-pointer" onClick={() => onFiltersChange({ ...filters, followerMin: 0 })}>
                Min: {formatCompactNumber(filters.followerMin)} followers
                <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
            {filters.followerMax < 500000 && (
              <Badge variant="primary" size="sm" className="cursor-pointer" onClick={() => onFiltersChange({ ...filters, followerMax: 500000 })}>
                Max: {formatCompactNumber(filters.followerMax)} followers
                <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
            {filters.engagementMin > 0 && (
              <Badge variant="primary" size="sm" className="cursor-pointer" onClick={() => onFiltersChange({ ...filters, engagementMin: 0 })}>
                {filters.engagementMin}%+ engagement
                <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
            {filters.school && (
              <Badge variant="primary" size="sm" className="cursor-pointer" onClick={() => onFiltersChange({ ...filters, school: '' })}>
                {filters.school}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function BrandDiscoverPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [athletes, setAthletes] = useState<ServiceAthlete[]>([]);
  const [filters, setFilters] = useState<Filters>({
    sports: [],
    followerMin: 0,
    followerMax: 500000,
    engagementMin: 0,
    school: '',
  });
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(new Set());

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

  // Fetch athletes from Supabase
  const fetchAthletes = useCallback(async () => {
    setIsLoading(true);
    try {
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
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filters.engagementMin]);

  // Fetch athletes on mount and when search changes
  useEffect(() => {
    if (!authLoading) {
      fetchAthletes();
    }
  }, [fetchAthletes, authLoading]);

  // Convert Supabase athlete to local Athlete format for display
  const displayAthletes = useMemo(() => {
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

  // Filter athletes based on local filters
  const filteredAthletes = useMemo(() => {
    return displayAthletes.filter((athlete) => {
      // Sport filter
      const matchesSport = filters.sports.length === 0 || filters.sports.includes(athlete.sport);

      // School filter
      const matchesSchool = filters.school === '' || athlete.school === filters.school;

      return matchesSport && matchesSchool;
    });
  }, [displayAthletes, filters]);

  // Toggle save/shortlist
  const handleToggleSave = async (athleteId: string) => {
    const isSaved = shortlistedIds.has(athleteId);
    try {
      if (isSaved) {
        const result = await removeFromShortlist(athleteId);
        if (result.error) {
          toast.error('Error', result.error.message);
          return;
        }
        setShortlistedIds(prev => {
          const next = new Set(prev);
          next.delete(athleteId);
          return next;
        });
        toast.success('Removed', 'Athlete removed from shortlist');
      } else {
        const result = await addToShortlist(athleteId);
        if (result.error) {
          toast.error('Error', result.error.message);
          return;
        }
        setShortlistedIds(prev => new Set([...prev, athleteId]));
        toast.success('Added', 'Athlete added to shortlist');
      }
      refetchShortlist();
    } catch {
      toast.error('Error', 'Failed to update shortlist');
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      sports: [],
      followerMin: 0,
      followerMax: 500000,
      engagementMin: 0,
      school: '',
    });
    setSearchQuery('');
  };

  // Count saved athletes
  const savedCount = shortlistedIds.size;

  // Show loading state while auth is checking
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Discover Athletes
          </h1>
          <p className="text-[var(--text-muted)]">
            Find and connect with student-athletes for your campaigns
          </p>
        </div>
        {savedCount > 0 && (
          <Button variant="secondary">
            <Heart className="h-4 w-4 mr-2 fill-current" />
            View Shortlist ({savedCount})
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Input
          placeholder="Search by name, school, sport, or position..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="h-4 w-4" />}
          className="h-12 text-base"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        onClear={handleClearFilters}
      />

      {/* Results Info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          Showing <span className="font-medium text-[var(--text-primary)]">{filteredAthletes.length}</span> athletes
          {(searchQuery || filters.sports.length > 0 || filters.school) && (
            <span> matching your criteria</span>
          )}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-muted)]">Sort by:</span>
          <select
            className={`
              h-8 px-2 rounded-[var(--radius-sm)]
              bg-[var(--bg-secondary)] border border-[var(--border-color)]
              text-sm text-[var(--text-primary)]
              focus:outline-none focus:border-[var(--color-primary)]
            `}
          >
            <option value="relevance">Relevance</option>
            <option value="followers">Followers (High to Low)</option>
            <option value="engagement">Engagement Rate</option>
            <option value="nilValue">NIL Value</option>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAthletes.map((athlete) => (
            <AthleteDiscoveryCard
              key={athlete.id}
              athlete={athlete}
              onToggleSave={handleToggleSave}
            />
          ))}
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
    </div>
  );
}
