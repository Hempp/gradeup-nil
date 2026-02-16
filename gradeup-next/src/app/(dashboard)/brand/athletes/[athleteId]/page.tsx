'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Share2,
  MapPin,
  GraduationCap,
  Trophy,
  TrendingUp,
  Users,
  DollarSign,
  ExternalLink,
  CheckCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useRequireAuth } from '@/context';
import { useToastActions } from '@/components/ui/toast';
import { addToShortlist, removeFromShortlist } from '@/lib/services/brand';
import { useBrandShortlist } from '@/lib/hooks/use-data';
import { formatCompactNumber, formatCurrency, formatPercentage } from '@/lib/utils';
import { HighlightTapeView } from '@/components/athlete/HighlightTapeSection';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { InstagramIcon, TikTokIcon, TwitterIcon } from '@/components/ui/social-icons';
import { getSportGradient } from '@/lib/utils/sport-theme';
import type { HighlightUrl } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface AthleteProfile {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  bio?: string;
  school: {
    name: string;
    city?: string;
    state?: string;
    division?: string;
    conference?: string;
    logoUrl?: string | null;
  };
  sport: string;
  position?: string;
  jerseyNumber?: string;
  academicYear?: string;
  major?: string;
  gpa: number;
  hometown?: string;
  height?: string;
  weight?: string;

  // Social Media
  instagramHandle?: string;
  instagramFollowers: number;
  tiktokHandle?: string;
  tiktokFollowers: number;
  twitterHandle?: string;
  engagementRate: number;

  // NIL Data
  nilValuation: number;
  totalEarnings?: number;
  activeDeals?: number;
  completedDeals?: number;

  // Verification
  verified: boolean;
  enrollmentVerified: boolean;
  sportVerified: boolean;
  gradesVerified: boolean;
  identityVerified: boolean;

  // Content
  highlightUrls?: HighlightUrl[];

  // Stats
  profileViews?: number;
  searchAppearances?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Mock Data - Extended athlete profiles for full page view
// ═══════════════════════════════════════════════════════════════════════════

const mockAthleteProfiles: Record<string, AthleteProfile> = {
  '1': {
    id: '1',
    name: 'Marcus Johnson',
    firstName: 'Marcus',
    lastName: 'Johnson',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=256&h=256&fit=crop&crop=face',
    bio: 'Junior point guard at Duke University with a passion for both academics and athletics. Business Administration major with aspirations to work in sports management after my playing career. I believe education is just as important as athletic performance.',
    school: {
      name: 'Duke University',
      city: 'Durham',
      state: 'NC',
      division: 'NCAA Division I',
      conference: 'ACC',
    },
    sport: 'Basketball',
    position: 'Point Guard',
    jerseyNumber: '23',
    academicYear: 'Junior',
    major: 'Business Administration',
    gpa: 3.87,
    hometown: 'Atlanta, GA',
    height: "6'2\"",
    weight: '185 lbs',
    instagramHandle: '@marcusjohnson',
    instagramFollowers: 125000,
    tiktokHandle: '@marcusj_hoops',
    tiktokFollowers: 89000,
    twitterHandle: '@MarcusJ_Duke',
    engagementRate: 4.2,
    nilValuation: 125000,
    totalEarnings: 45000,
    activeDeals: 3,
    completedDeals: 7,
    verified: true,
    enrollmentVerified: true,
    sportVerified: true,
    gradesVerified: true,
    identityVerified: true,
    profileViews: 12500,
    searchAppearances: 8700,
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
  '2': {
    id: '2',
    name: 'Sarah Williams',
    firstName: 'Sarah',
    lastName: 'Williams',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&h=256&fit=crop&crop=face',
    bio: 'Stanford Soccer forward and Communications major. Two-time All-American with a dream to inspire the next generation of female athletes. Passionate about media, storytelling, and breaking barriers in women\'s sports.',
    school: {
      name: 'Stanford University',
      city: 'Stanford',
      state: 'CA',
      division: 'NCAA Division I',
      conference: 'Pac-12',
    },
    sport: 'Soccer',
    position: 'Forward',
    jerseyNumber: '10',
    academicYear: 'Senior',
    major: 'Communications',
    gpa: 3.92,
    hometown: 'Los Angeles, CA',
    height: "5'8\"",
    weight: '145 lbs',
    instagramHandle: '@sarahwilliams',
    instagramFollowers: 89000,
    tiktokHandle: '@sarah_soccer',
    tiktokFollowers: 120000,
    twitterHandle: '@SarahW_Stanford',
    engagementRate: 5.1,
    nilValuation: 95000,
    totalEarnings: 32000,
    activeDeals: 2,
    completedDeals: 5,
    verified: true,
    enrollmentVerified: true,
    sportVerified: true,
    gradesVerified: true,
    identityVerified: true,
    profileViews: 9800,
    searchAppearances: 6500,
  },
  '3': {
    id: '3',
    name: 'Jordan Davis',
    firstName: 'Jordan',
    lastName: 'Davis',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=face',
    bio: 'Ohio State quarterback and Sports Management major. Led the team to a conference championship and focused on building a brand that represents hard work, dedication, and community involvement.',
    school: {
      name: 'Ohio State University',
      city: 'Columbus',
      state: 'OH',
      division: 'NCAA Division I',
      conference: 'Big Ten',
    },
    sport: 'Football',
    position: 'Quarterback',
    jerseyNumber: '7',
    academicYear: 'Junior',
    major: 'Sports Management',
    gpa: 3.65,
    hometown: 'Cleveland, OH',
    height: "6'4\"",
    weight: '220 lbs',
    instagramHandle: '@jordandavis',
    instagramFollowers: 210000,
    tiktokHandle: '@jd_qb7',
    tiktokFollowers: 180000,
    twitterHandle: '@JordanD_OSU',
    engagementRate: 3.8,
    nilValuation: 250000,
    totalEarnings: 85000,
    activeDeals: 5,
    completedDeals: 12,
    verified: true,
    enrollmentVerified: true,
    sportVerified: true,
    gradesVerified: true,
    identityVerified: true,
    profileViews: 25000,
    searchAppearances: 18000,
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
};

// ═══════════════════════════════════════════════════════════════════════════
// Loading Skeleton
// ═══════════════════════════════════════════════════════════════════════════

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="relative">
        <Skeleton className="h-48 w-full rounded-[var(--radius-lg)]" />
        <div className="absolute -bottom-16 left-8">
          <Skeleton className="h-32 w-32 rounded-full border-4 border-[var(--bg-primary)]" />
        </div>
      </div>

      <div className="pt-20 px-8">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-5 w-48" />
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-[var(--radius-md)]" />
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Skeleton className="h-64 rounded-[var(--radius-lg)]" />
        </div>
        <div>
          <Skeleton className="h-64 rounded-[var(--radius-lg)]" />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Page Component
// ═══════════════════════════════════════════════════════════════════════════

export default function BrandAthleteProfilePage() {
  const params = useParams();
  const router = useRouter();
  const athleteId = params.athleteId as string;
  const toast = useToastActions();

  const [athlete, setAthlete] = useState<AthleteProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isShortlisted, setIsShortlisted] = useState(false);

  // Auth
  const { roleData, isLoading: authLoading } = useRequireAuth({ allowedRoles: ['brand'] });
  const brandData = roleData as { id: string } | null;
  const { data: shortlist, refetch: refetchShortlist } = useBrandShortlist(brandData?.id);

  // Check shortlist status
  useEffect(() => {
    if (shortlist && athleteId) {
      setIsShortlisted(shortlist.some(a => a.id === athleteId));
    }
  }, [shortlist, athleteId]);

  // Fetch athlete data
  useEffect(() => {
    const fetchAthlete = async () => {
      setIsLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      const profile = mockAthleteProfiles[athleteId];
      setAthlete(profile || null);
      setIsLoading(false);
    };

    if (athleteId && !authLoading) {
      fetchAthlete();
    }
  }, [athleteId, authLoading]);

  // Ref to prevent race condition on rapid clicks
  const isSavingRef = useRef(false);

  // Handle shortlist toggle
  const handleToggleShortlist = useCallback(async () => {
    if (!athlete || isSavingRef.current) return;

    isSavingRef.current = true;
    setIsSaving(true);
    const previousState = isShortlisted;

    // Optimistic update
    setIsShortlisted(!previousState);

    try {
      const result = previousState
        ? await removeFromShortlist(athlete.id)
        : await addToShortlist(athlete.id);

      if (result.error) {
        setIsShortlisted(previousState);
        toast.error('Error', result.error.message);
        return;
      }

      toast.success(
        previousState ? 'Removed' : 'Added',
        previousState ? 'Athlete removed from shortlist' : 'Athlete added to shortlist'
      );
      refetchShortlist();
    } catch {
      setIsShortlisted(previousState);
      toast.error('Error', 'Failed to update shortlist');
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [athlete, isShortlisted, toast, refetchShortlist]);

  // Handle share
  const handleShare = useCallback(async () => {
    if (!athlete) return;

    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${athlete.name} - GradeUp NIL Profile`,
          text: `Check out ${athlete.name}'s NIL profile on GradeUp`,
          url,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      toast.success('Link Copied', 'Profile link copied to clipboard');
    }
  }, [athlete, toast]);

  // Computed values
  const totalFollowers = useMemo(() => {
    if (!athlete) return 0;
    return athlete.instagramFollowers + athlete.tiktokFollowers;
  }, [athlete]);

  const verificationCount = useMemo(() => {
    if (!athlete) return 0;
    return [
      athlete.enrollmentVerified,
      athlete.sportVerified,
      athlete.gradesVerified,
      athlete.identityVerified,
    ].filter(Boolean).length;
  }, [athlete]);

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" disabled>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <ProfileSkeleton />
      </div>
    );
  }

  // Not found
  if (!athlete) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="p-4 rounded-full bg-[var(--bg-tertiary)] mb-4">
          <Users className="h-8 w-8 text-[var(--text-muted)]" />
        </div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          Athlete Not Found
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          This athlete profile doesn&apos;t exist or has been removed.
        </p>
        <Button variant="outline" onClick={() => router.push('/brand/discover')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Discover
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in motion-reduce:animate-none">
      {/* Back Navigation */}
      <Button variant="ghost" onClick={() => router.back()} className="motion-reduce:transition-none">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Discover
      </Button>

      {/* Hero Header with Sport Gradient */}
      <div className="relative overflow-hidden rounded-[var(--radius-lg)]">
        {/* Banner */}
        <div className={`h-48 md:h-56 bg-gradient-to-br ${getSportGradient(athlete.sport)} relative overflow-hidden`}>
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle at 25% 25%, white 2%, transparent 2%), radial-gradient(circle at 75% 75%, white 2%, transparent 2%)',
              backgroundSize: '32px 32px'
            }}
            aria-hidden="true"
          />

          {/* Sport & Position tags */}
          <div className="absolute top-4 right-4 flex gap-2">
            <Badge variant="default" className="bg-black/40 backdrop-blur-sm text-white border-0 font-medium">
              {athlete.sport}
            </Badge>
            {athlete.position && (
              <Badge variant="default" className="bg-white/20 backdrop-blur-sm text-white border-0">
                {athlete.position}
              </Badge>
            )}
            {athlete.jerseyNumber && (
              <Badge variant="default" className="bg-white/20 backdrop-blur-sm text-white border-0">
                #{athlete.jerseyNumber}
              </Badge>
            )}
          </div>
        </div>

        {/* Profile Info Overlay */}
        <div className="bg-[var(--bg-card)] px-6 pb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-16 md:-mt-20">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <Avatar
                src={athlete.avatarUrl || undefined}
                fallback={athlete.name.split(' ').map(n => n[0]).join('')}
                size="xl"
                className="h-32 w-32 md:h-40 md:w-40 text-3xl border-4 border-[var(--bg-card)] shadow-xl ring-2 ring-[var(--color-primary)]/30"
              />
              {athlete.verified && (
                <div className="absolute -bottom-2 -right-2 border-4 border-[var(--bg-card)] rounded-full">
                  <VerifiedBadge size="lg" />
                </div>
              )}
            </div>

            {/* Name & Info */}
            <div className="flex-1 pt-4 md:pt-0 md:pb-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">
                  {athlete.name}
                </h1>
                {athlete.verified && (
                  <Badge variant="success" size="sm">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {athlete.school.name}
                </span>
                {athlete.hometown && (
                  <span className="flex items-center gap-1">
                    From {athlete.hometown}
                  </span>
                )}
                {athlete.academicYear && (
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-4 w-4" />
                    {athlete.academicYear}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-shrink-0">
              <Button
                variant={isShortlisted ? 'secondary' : 'outline'}
                onClick={handleToggleShortlist}
                disabled={isSaving}
                className="motion-reduce:transition-none"
                aria-label={`${isShortlisted ? 'Remove' : 'Add'} ${athlete.name} ${isShortlisted ? 'from' : 'to'} shortlist`}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin motion-reduce:animate-none" />
                ) : (
                  <Heart className={`h-4 w-4 mr-2 ${isShortlisted ? 'fill-current' : ''}`} />
                )}
                {isShortlisted ? 'Saved' : 'Save'}
              </Button>
              <Button
                variant="outline"
                onClick={handleShare}
                aria-label={`Share ${athlete.name}'s profile`}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button
                variant="primary"
                aria-label={`Contact ${athlete.name}`}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* NIL Valuation */}
        <Card className="bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent border-[var(--color-primary)]/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-[var(--color-primary)]" />
              <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">NIL Value</span>
            </div>
            <p className="text-2xl font-bold text-[var(--color-primary)]">
              {formatCurrency(athlete.nilValuation)}
            </p>
          </CardContent>
        </Card>

        {/* Total Reach */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-[var(--text-muted)]" />
              <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Total Reach</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {formatCompactNumber(totalFollowers)}
            </p>
          </CardContent>
        </Card>

        {/* Engagement */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-[var(--color-success)]" />
              <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Engagement</span>
            </div>
            <p className="text-2xl font-bold text-[var(--color-success)]">
              {formatPercentage(athlete.engagementRate)}
            </p>
          </CardContent>
        </Card>

        {/* GPA */}
        <Card className="bg-gradient-to-br from-[var(--gpa-gold)]/10 to-transparent border-[var(--gpa-gold)]/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="h-4 w-4 text-[var(--gpa-gold)]" />
              <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">GPA</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {athlete.gpa.toFixed(2)}
              </p>
              {athlete.gpa >= 3.5 && (
                <Badge variant="warning" size="sm">Dean&apos;s List</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bio */}
          {athlete.bio && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  {athlete.bio}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Social Media Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Social Media</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Instagram */}
                <div className="p-4 rounded-[var(--radius-md)] bg-gradient-to-br from-[#E4405F]/10 to-[#F77737]/10 border border-[#E4405F]/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#E4405F] to-[#F77737] flex items-center justify-center">
                      <InstagramIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Instagram</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{athlete.instagramHandle}</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {formatCompactNumber(athlete.instagramFollowers)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">followers</p>
                </div>

                {/* TikTok */}
                <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-black flex items-center justify-center">
                      <TikTokIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">TikTok</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{athlete.tiktokHandle}</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {formatCompactNumber(athlete.tiktokFollowers)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">followers</p>
                </div>

                {/* Twitter/X */}
                {athlete.twitterHandle && (
                  <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-black flex items-center justify-center">
                        <TwitterIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">X (Twitter)</p>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{athlete.twitterHandle}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      <ExternalLink className="h-3 w-3 mr-2" />
                      View Profile
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Highlight Videos */}
          {athlete.highlightUrls && athlete.highlightUrls.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <HighlightTapeView
                  highlights={athlete.highlightUrls}
                  title="Highlight Videos"
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Academic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Academic Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {athlete.major && (
                <div>
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Major</p>
                  <p className="font-medium text-[var(--text-primary)]">{athlete.major}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">School</p>
                <p className="font-medium text-[var(--text-primary)]">{athlete.school.name}</p>
                {athlete.school.division && (
                  <p className="text-sm text-[var(--text-muted)]">{athlete.school.division}</p>
                )}
              </div>
              {athlete.school.conference && (
                <div>
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Conference</p>
                  <p className="font-medium text-[var(--text-primary)]">{athlete.school.conference}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Athletic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Athletic Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {athlete.height && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Height</p>
                    <p className="font-medium text-[var(--text-primary)]">{athlete.height}</p>
                  </div>
                )}
                {athlete.weight && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Weight</p>
                    <p className="font-medium text-[var(--text-primary)]">{athlete.weight}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Position</p>
                <p className="font-medium text-[var(--text-primary)]">{athlete.position}</p>
              </div>
            </CardContent>
          </Card>

          {/* Verification Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Verification ({verificationCount}/4)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Identity Verified', verified: athlete.identityVerified },
                { label: 'Enrollment Verified', verified: athlete.enrollmentVerified },
                { label: 'Sport Verified', verified: athlete.sportVerified },
                { label: 'Grades Verified', verified: athlete.gradesVerified },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">{item.label}</span>
                  {item.verified ? (
                    <CheckCircle className="h-5 w-5 text-[var(--color-success)]" />
                  ) : (
                    <Clock className="h-5 w-5 text-[var(--text-muted)]" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Deal Stats */}
          {(athlete.activeDeals !== undefined || athlete.completedDeals !== undefined) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Deal History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
                    <p className="text-2xl font-bold text-[var(--color-primary)]">{athlete.activeDeals || 0}</p>
                    <p className="text-xs text-[var(--text-muted)]">Active Deals</p>
                  </div>
                  <div className="text-center p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{athlete.completedDeals || 0}</p>
                    <p className="text-xs text-[var(--text-muted)]">Completed</p>
                  </div>
                </div>
                {athlete.totalEarnings !== undefined && (
                  <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Total Earnings</p>
                    <p className="text-xl font-bold text-[var(--color-success)]">
                      {formatCurrency(athlete.totalEarnings)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
