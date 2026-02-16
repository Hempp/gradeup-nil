'use client';

import { memo, useCallback } from 'react';
import { Heart, MapPin, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { InstagramIcon, TikTokIcon, SOCIAL_BRAND_COLORS } from '@/components/ui/social-icons';
import { getSportGradient } from '@/lib/utils/sport-theme';
import { formatCompactNumber, formatCurrency, formatPercentage } from '@/lib/utils';
import type { HighlightUrl } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface DiscoverableAthlete {
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

interface AthleteDiscoveryCardProps {
  /** The athlete data to display */
  athlete: DiscoverableAthlete;
  /** Callback when the save/shortlist button is clicked */
  onToggleSave: (id: string) => void;
  /** Callback when the card or "View Profile" button is clicked */
  onViewProfile: (athlete: DiscoverableAthlete) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A discovery card for displaying athlete profiles in a grid layout.
 * Features sport-specific gradients, social stats, and save/view actions.
 * Memoized to prevent unnecessary re-renders in grid layouts.
 *
 * @example
 * ```tsx
 * <AthleteDiscoveryCard
 *   athlete={athlete}
 *   onToggleSave={(id) => handleToggleSave(id)}
 *   onViewProfile={(athlete) => handleViewProfile(athlete)}
 * />
 * ```
 */
export const AthleteDiscoveryCard = memo(function AthleteDiscoveryCard({
  athlete,
  onToggleSave,
  onViewProfile,
}: AthleteDiscoveryCardProps) {
  const totalFollowers = athlete.instagramFollowers + athlete.tiktokFollowers;

  // Memoized handlers to prevent child re-renders
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onViewProfile(athlete);
    }
  }, [onViewProfile, athlete]);

  const handleCardClick = useCallback(() => {
    onViewProfile(athlete);
  }, [onViewProfile, athlete]);

  const handleToggleSaveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSave(athlete.id);
  }, [onToggleSave, athlete.id]);

  const handleViewProfileClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onViewProfile(athlete);
  }, [onViewProfile, athlete]);

  return (
    <Card
      hover
      tabIndex={0}
      className="group overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-[var(--color-primary)]/10 hover:-translate-y-1 motion-reduce:hover:translate-y-0 motion-reduce:transition-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 active:scale-[0.98] motion-reduce:active:scale-100"
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role="article"
      aria-label={`${athlete.name}, ${athlete.sport} at ${athlete.school}. Press Enter to view profile.`}
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
            onClick={handleToggleSaveClick}
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
                    <TikTokIcon className="h-3.5 w-3.5 text-white" />
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
              onClick={handleViewProfileClick}
            >
              View Profile
            </Button>
            <Button
              variant={athlete.saved ? 'secondary' : 'outline'}
              size="sm"
              onClick={handleToggleSaveClick}
              className="px-4"
              aria-label={athlete.saved ? `Remove ${athlete.name} from shortlist` : `Add ${athlete.name} to shortlist`}
            >
              <Heart className={`h-4 w-4 ${athlete.saved ? 'fill-current' : ''}`} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
