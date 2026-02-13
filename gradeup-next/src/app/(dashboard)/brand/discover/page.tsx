'use client';

import { useState, useMemo, useEffect, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Heart, MapPin, Users, TrendingUp, DollarSign, SlidersHorizontal, X, Loader2, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
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
import type { HighlightUrl } from '@/types';
import { HighlightTapeView } from '@/components/athlete/HighlightTapeSection';

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

const ANIMATION_DURATION = {
  FAST: 150,    // Buttons, toggles
  NORMAL: 200,  // Cards, panels
  SLOW: 300,    // Modals, page transitions
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
// MOCK DATA - Diverse Athlete Profiles for Brand Discovery
// ═══════════════════════════════════════════════════════════════════════════

const mockAthletes = [
  // ─────────────────────────────────────────────────────────────────────────
  // HIGH-VALUE ATHLETES - Top NIL Prospects
  // ─────────────────────────────────────────────────────────────────────────
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
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=256&h=256&fit=crop&crop=face',
    highlightUrls: [
      {
        id: 'h1-1',
        platform: 'youtube' as const,
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'Game-Winning Buzzer Beater vs UNC',
        added_at: '2024-01-15T10:00:00Z',
      },
      {
        id: 'h1-2',
        platform: 'tiktok' as const,
        url: 'https://www.tiktok.com/@marcusjohnson/video/123456789',
        title: 'Behind the scenes at practice',
        added_at: '2024-01-20T15:30:00Z',
      },
    ],
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
    saved: false,
    coverImage: null,
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&h=256&fit=crop&crop=face',
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
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=face',
    highlightUrls: [
      {
        id: 'h3-1',
        platform: 'youtube' as const,
        url: 'https://www.youtube.com/watch?v=abc123xyz',
        title: 'Season Highlights 2024',
        added_at: '2024-02-01T12:00:00Z',
      },
    ],
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
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '5',
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
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&h=256&fit=crop&crop=face',
  },
  // ─────────────────────────────────────────────────────────────────────────
  // MID-TIER ATHLETES - Solid Engagement & Growing Audience
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: '6',
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
    saved: false,
    coverImage: null,
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '7',
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
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '8',
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
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '9',
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
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '10',
    name: 'Aisha Patel',
    school: 'University of Texas',
    sport: 'Tennis',
    position: 'Singles/Doubles',
    gpa: 3.98,
    instagramFollowers: 85000,
    tiktokFollowers: 62000,
    engagementRate: 6.8,
    nilValue: 92000,
    verified: true,
    saved: false,
    coverImage: null,
    avatarUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=256&h=256&fit=crop&crop=face',
  },
  // ─────────────────────────────────────────────────────────────────────────
  // EMERGING ATHLETES - High Engagement, Growing Platforms
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: '11',
    name: 'Kenji Nakamura',
    school: 'UCLA',
    sport: 'Baseball',
    position: 'Pitcher',
    gpa: 3.58,
    instagramFollowers: 42000,
    tiktokFollowers: 78000,
    engagementRate: 8.1,
    nilValue: 48000,
    verified: true,
    saved: false,
    coverImage: null,
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '12',
    name: 'Brittany Foster',
    school: 'University of Oregon',
    sport: 'Track & Field',
    position: 'Sprinter',
    gpa: 3.41,
    instagramFollowers: 55000,
    tiktokFollowers: 125000,
    engagementRate: 9.2,
    nilValue: 68000,
    verified: true,
    saved: false,
    coverImage: null,
    avatarUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '13',
    name: 'Carlos Mendez',
    school: 'University of Miami',
    sport: 'Soccer',
    position: 'Midfielder',
    gpa: 3.29,
    instagramFollowers: 38000,
    tiktokFollowers: 52000,
    engagementRate: 5.8,
    nilValue: 42000,
    verified: true,
    saved: false,
    coverImage: null,
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '14',
    name: 'Zoe Thompson',
    school: 'University of Connecticut',
    sport: 'Basketball',
    position: 'Center',
    gpa: 3.75,
    instagramFollowers: 28000,
    tiktokFollowers: 45000,
    engagementRate: 7.5,
    nilValue: 35000,
    verified: true,
    saved: false,
    coverImage: null,
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '15',
    name: 'Andre Washington',
    school: 'Georgia Tech',
    sport: 'Football',
    position: 'Linebacker',
    gpa: 3.62,
    instagramFollowers: 48000,
    tiktokFollowers: 35000,
    engagementRate: 4.1,
    nilValue: 52000,
    verified: true,
    saved: false,
    coverImage: null,
    avatarUrl: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=256&h=256&fit=crop&crop=face',
  },
  // ─────────────────────────────────────────────────────────────────────────
  // NICHE SPORTS - Specialized Audiences
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: '16',
    name: 'Sophia Kim',
    school: 'Penn State',
    sport: 'Volleyball',
    position: 'Outside Hitter',
    gpa: 3.89,
    instagramFollowers: 92000,
    tiktokFollowers: 145000,
    engagementRate: 8.4,
    nilValue: 115000,
    verified: true,
    saved: false,
    coverImage: null,
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '17',
    name: 'Michael Chen',
    school: 'University of California',
    sport: 'Swimming',
    position: 'Butterfly',
    gpa: 3.94,
    instagramFollowers: 72000,
    tiktokFollowers: 98000,
    engagementRate: 6.1,
    nilValue: 82000,
    verified: true,
    saved: false,
    coverImage: null,
    avatarUrl: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '18',
    name: 'Jessica Brown',
    school: 'University of North Carolina',
    sport: 'Soccer',
    position: 'Goalkeeper',
    gpa: 3.78,
    instagramFollowers: 68000,
    tiktokFollowers: 85000,
    engagementRate: 5.4,
    nilValue: 78000,
    verified: true,
    saved: false,
    coverImage: null,
    avatarUrl: 'https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '19',
    name: 'David Park',
    school: 'USC',
    sport: 'Tennis',
    position: 'Singles',
    gpa: 3.82,
    instagramFollowers: 35000,
    tiktokFollowers: 28000,
    engagementRate: 7.8,
    nilValue: 45000,
    verified: true,
    saved: false,
    coverImage: null,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=face',
  },
  {
    id: '20',
    name: 'Rachel Adams',
    school: 'University of Florida',
    sport: 'Softball',
    position: 'Pitcher',
    avatarUrl: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=256&h=256&fit=crop&crop=face',
    gpa: 3.67,
    instagramFollowers: 58000,
    tiktokFollowers: 72000,
    engagementRate: 6.9,
    nilValue: 62000,
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
  avatarUrl?: string | null;
  highlightUrls?: HighlightUrl[];
}

// ═══════════════════════════════════════════════════════════════════════════
// AVATAR GENERATION - Uses UI Avatars for realistic placeholder images
// ═══════════════════════════════════════════════════════════════════════════

function generateAvatarUrl(name: string, seed?: string): string {
  // Use a combination of placeholder services for variety
  const encodedName = encodeURIComponent(name);
  const hash = seed
    ? seed.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    : name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);

  // Alternate between different avatar styles for variety
  if (hash % 3 === 0) {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodedName}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
  } else if (hash % 3 === 1) {
    return `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodedName}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
  } else {
    return `https://ui-avatars.com/api/?name=${encodedName}&background=6366f1&color=fff&size=256&bold=true`;
  }
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

// ═══════════════════════════════════════════════════════════════════════════
// Athlete Discovery Card - Enhanced Design
// ═══════════════════════════════════════════════════════════════════════════

function AthleteDiscoveryCard({
  athlete,
  onToggleSave,
  onViewProfile
}: {
  athlete: Athlete;
  onToggleSave: (id: string) => void;
  onViewProfile: (athlete: Athlete) => void;
}) {
  const totalFollowers = athlete.instagramFollowers + athlete.tiktokFollowers;

  return (
    <Card
      hover
      className="group overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-[var(--color-primary)]/10 hover:-translate-y-1 motion-reduce:hover:translate-y-0 motion-reduce:transition-none cursor-pointer focus-within:ring-2 focus-within:ring-[var(--color-primary)] active:scale-[0.98] motion-reduce:active:scale-100"
      onClick={() => onViewProfile(athlete)}
      role="article"
      aria-label={`${athlete.name}, ${athlete.sport} at ${athlete.school}`}
    >
      <CardContent className="p-0">
        {/* Cover Photo / Sport Gradient with mesh overlay */}
        <div className={`h-28 bg-gradient-to-br ${getSportGradient(athlete.sport)} relative overflow-hidden`}>
          {/* Decorative mesh pattern */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle at 25% 25%, white 2%, transparent 2%), radial-gradient(circle at 75% 75%, white 2%, transparent 2%)',
              backgroundSize: '24px 24px'
            }}
            aria-hidden="true"
          />

          {/* Shortlist Heart Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(athlete.id);
            }}
            className={`
              absolute top-3 right-3 h-11 w-11 rounded-full
              flex items-center justify-center
              transition-all duration-150 backdrop-blur-sm
              motion-reduce:transition-none
              focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent
              ${athlete.saved
                ? 'bg-[var(--color-gold)] text-[var(--text-inverse)] shadow-lg scale-110 motion-reduce:scale-100'
                : 'bg-black/30 text-white hover:bg-black/50 hover:scale-110 motion-reduce:hover:scale-100'
              }
            `}
            aria-label={athlete.saved ? `Remove ${athlete.name} from shortlist` : `Add ${athlete.name} to shortlist`}
            aria-pressed={athlete.saved}
          >
            <Heart className={`h-5 w-5 ${athlete.saved ? 'fill-current' : ''}`} aria-hidden="true" />
          </button>

          {/* Sport & Position labels */}
          <div className="absolute bottom-3 left-3 flex gap-2">
            <Badge variant="default" size="sm" className="bg-black/40 backdrop-blur-sm text-white border-0 font-medium">
              {athlete.sport}
            </Badge>
            <Badge variant="default" size="sm" className="bg-white/20 backdrop-blur-sm text-white border-0">
              {athlete.position}
            </Badge>
          </div>
        </div>

        {/* Avatar Section - Centered with verified badge */}
        <div className="relative -mt-10 flex justify-center">
          <div className="relative">
            <Avatar
              src={athlete.avatarUrl || undefined}
              fallback={athlete.name.split(' ').map(n => n[0]).join('')}
              size="xl"
              className="h-20 w-20 text-xl border-4 border-[var(--bg-card)] shadow-lg ring-2 ring-[var(--color-primary)]/30"
            />
            {athlete.verified && (
              <VerifiedBadge className="absolute -bottom-1 -right-1 border-2 border-[var(--bg-card)]" />
            )}
          </div>
        </div>

        {/* Name & School - Centered */}
        <div className="px-4 pt-3 text-center">
          <h3 className="font-bold text-lg text-[var(--text-primary)] group-hover:text-[var(--color-primary)] transition-colors duration-150 motion-reduce:transition-none">
            {athlete.name}
          </h3>
          <p className="text-sm text-[var(--text-muted)] flex items-center justify-center gap-1 mt-0.5">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {athlete.school}
          </p>
        </div>

        {/* Stats Grid - 2x2 layout for better readability */}
        <div className="px-4 pt-4 pb-4">
          <div className="grid grid-cols-2 gap-2 mb-4">
            {/* Social Reach */}
            <div className="p-3 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)] hover:from-[var(--bg-secondary)] hover:to-[var(--bg-tertiary)] transition-all motion-reduce:transition-none">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex -space-x-1">
                  <div
                    className="h-5 w-5 rounded-full flex items-center justify-center"
                    style={{ background: `linear-gradient(to bottom right, ${SOCIAL_BRAND_COLORS.INSTAGRAM.from}, ${SOCIAL_BRAND_COLORS.INSTAGRAM.to})` }}
                  >
                    <InstagramIcon className="h-2.5 w-2.5 text-white" />
                  </div>
                  <div
                    className="h-5 w-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: SOCIAL_BRAND_COLORS.TIKTOK.bg }}
                  >
                    <TikTokIcon />
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">Reach</span>
              </div>
              <p className="font-bold text-lg text-[var(--text-primary)]">
                {formatCompactNumber(totalFollowers)}
              </p>
            </div>

            {/* Engagement Rate */}
            <div className="p-3 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)] hover:from-[var(--bg-secondary)] hover:to-[var(--bg-tertiary)] transition-all motion-reduce:transition-none">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-5 w-5 rounded-full bg-[var(--color-success)]/20 flex items-center justify-center">
                  <TrendingUp className="h-3 w-3 text-[var(--color-success)]" aria-hidden="true" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">Engagement</span>
              </div>
              <p className="font-bold text-lg text-[var(--color-success)]">
                {formatPercentage(athlete.engagementRate)}
              </p>
            </div>

            {/* NIL Value - Full width, prominent */}
            <div className="col-span-2 p-3 rounded-[var(--radius-md)] bg-gradient-to-r from-[var(--color-primary)]/10 via-[var(--color-primary)]/5 to-transparent border border-[var(--color-primary)]/20">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">NIL Valuation</span>
                  <p className="font-bold text-xl text-[var(--color-primary)]">
                    {formatCurrency(athlete.nilValue)}
                  </p>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">GPA</span>
                  <span className="font-semibold text-[var(--text-primary)]">{athlete.gpa.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              className="flex-1 font-medium"
              onClick={(e) => {
                e.stopPropagation();
                onViewProfile(athlete);
              }}
            >
              View Profile
            </Button>
            <Button
              variant={athlete.saved ? 'secondary' : 'outline'}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(athlete.id);
              }}
              className="px-4"
            >
              <Heart className={`h-4 w-4 ${athlete.saved ? 'fill-current' : ''}`} />
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
  const sliderId = useId();

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor={sliderId}
          className="text-xs font-medium text-[var(--text-muted)]"
        >
          {label}
        </label>
        <span
          className="text-xs font-medium text-[var(--color-primary)]"
          aria-live="polite"
        >
          {formatValue(value)}
        </span>
      </div>
      <input
        id={sliderId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={formatValue(value)}
        className="w-full h-2 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)] transition-opacity duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-card)]"
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
  const [isExpanded, setIsExpanded] = useState(false);
  const filterPanelId = useId();

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

  // Handle keyboard navigation for collapsible panel
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <Card className="overflow-hidden border-[var(--border-color)]">
      <CardContent className="p-0">
        {/* Collapsible Header - Accessible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          onKeyDown={handleKeyDown}
          aria-expanded={isExpanded}
          aria-controls={filterPanelId}
          className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-tertiary)] transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)]"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 flex items-center justify-center" aria-hidden="true">
              <SlidersHorizontal className="h-4 w-4 text-[var(--color-primary)]" />
            </div>
            <div className="text-left">
              <span className="font-medium text-[var(--text-primary)]">Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--color-primary)] text-[var(--text-inverse)]">
                  {activeFilterCount} active
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                className="text-[var(--text-muted)] hover:text-[var(--color-error)]"
                aria-label="Clear all filters"
              >
                <X className="h-4 w-4 mr-1" aria-hidden="true" />
                Clear
              </Button>
            )}
            <svg
              className={`h-5 w-5 text-[var(--text-muted)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Expandable Filter Controls - CSS Grid for smooth animation */}
        <div
          id={filterPanelId}
          className={`grid transition-all duration-300 ease-out motion-reduce:transition-none ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
        >
          <div className="overflow-hidden">
          <div className="p-4 pt-0 border-t border-[var(--border-color)]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4">
              {/* Sport Multi-select */}
              <MultiSelectDropdown
                label="Sport"
                options={sports}
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
                  {schools.map((school) => (
                    <option key={school} value={school}>{school}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Active filter tags - Accessible with keyboard support */}
        {hasActiveFilters && (
          <div
            className="flex flex-wrap gap-2 px-4 pb-4 pt-2 border-t border-[var(--border-color)]"
            role="list"
            aria-label="Active filters"
          >
            {filters.sports.map((sport) => (
              <button
                key={sport}
                onClick={() => onFiltersChange({ ...filters, sports: filters.sports.filter(s => s !== sport) })}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--color-primary)] text-[var(--text-inverse)] hover:bg-[var(--color-primary)]/80 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 transition-colors duration-150"
                aria-label={`Remove ${sport} filter`}
                role="listitem"
              >
                {sport}
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            ))}
            {filters.followerMin > FILTER_DEFAULTS.FOLLOWER_MIN && (
              <button
                onClick={() => onFiltersChange({ ...filters, followerMin: FILTER_DEFAULTS.FOLLOWER_MIN })}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--color-primary)] text-[var(--text-inverse)] hover:bg-[var(--color-primary)]/80 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 transition-colors duration-150"
                aria-label="Remove minimum followers filter"
                role="listitem"
              >
                Min: {formatCompactNumber(filters.followerMin)} followers
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
            {filters.followerMax < FILTER_DEFAULTS.FOLLOWER_MAX && (
              <button
                onClick={() => onFiltersChange({ ...filters, followerMax: FILTER_DEFAULTS.FOLLOWER_MAX })}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--color-primary)] text-[var(--text-inverse)] hover:bg-[var(--color-primary)]/80 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 transition-colors duration-150"
                aria-label="Remove maximum followers filter"
                role="listitem"
              >
                Max: {formatCompactNumber(filters.followerMax)} followers
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
            {filters.engagementMin > FILTER_DEFAULTS.ENGAGEMENT_MIN && (
              <button
                onClick={() => onFiltersChange({ ...filters, engagementMin: FILTER_DEFAULTS.ENGAGEMENT_MIN })}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--color-primary)] text-[var(--text-inverse)] hover:bg-[var(--color-primary)]/80 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 transition-colors duration-150"
                aria-label="Remove engagement rate filter"
                role="listitem"
              >
                {filters.engagementMin}%+ engagement
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
            {filters.school && (
              <button
                onClick={() => onFiltersChange({ ...filters, school: '' })}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--color-primary)] text-[var(--text-inverse)] hover:bg-[var(--color-primary)]/80 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 transition-colors duration-150"
                aria-label={`Remove ${filters.school} filter`}
                role="listitem"
              >
                {filters.school}
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
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
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [athletes, setAthletes] = useState<ServiceAthlete[]>([]);
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
  // In demo mode or when no Supabase data, use mock athletes
  const displayAthletes = useMemo(() => {
    // Use mock data in demo mode or when no athletes from Supabase
    if (isDemoMode() || athletes.length === 0) {
      return mockAthletes.map((athlete) => ({
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
      <FilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        onClear={handleClearFilters}
      />

      {/* Results Info - Live region for screen readers */}
      <div className="flex items-center justify-between">
        <p
          className="text-sm text-[var(--text-muted)]"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          Showing <span className="font-medium text-[var(--text-primary)]">{filteredAthletes.length}</span> athletes
          {(searchQuery || filters.sports.length > 0 || filters.school) && (
            <span> matching your criteria</span>
          )}
        </p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAthletes.map((athlete) => (
            <AthleteDiscoveryCard
              key={athlete.id}
              athlete={athlete}
              onToggleSave={handleToggleSave}
              onViewProfile={handleViewProfile}
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
