'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Shield,
  AlertCircle,
  Trophy,
} from 'lucide-react';
import {
  fetchStatsTaqProfile,
  formatStatLabel,
  formatStatValue,
  getKeyStatsForSport,
} from '@/lib/services/statstaq';
import type { StatsTaqProfile, StatHighlight } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// ATHLETE STATS CARD — StatsTaq Integration
// Displays athletic performance data on athlete profiles and discovery cards
// ═══════════════════════════════════════════════════════════════════════════

interface AthleteStatsCardProps {
  athleteId: string;
  sport?: string;
  variant?: 'full' | 'compact' | 'inline';
  className?: string;
  showConnectButton?: boolean;
}

// Trend indicator icon
function TrendIcon({ trend }: { trend?: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="h-3 w-3 text-[var(--color-success)]" />;
  if (trend === 'down') return <TrendingDown className="h-3 w-3 text-[var(--color-error)]" />;
  return <Minus className="h-3 w-3 text-[var(--text-muted)]" />;
}

// Percentile bar
function PercentileBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden', className)}>
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500',
          value >= 80 ? 'bg-[var(--color-success)]'
            : value >= 60 ? 'bg-[var(--accent-primary)]'
            : value >= 40 ? 'bg-[var(--color-warning)]'
            : 'bg-[var(--color-error)]'
        )}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

// Stat highlight pill
function StatPill({ highlight }: { highlight: StatHighlight }) {
  return (
    <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] sm:text-xs text-[var(--text-muted)] uppercase tracking-wider truncate">
          {highlight.label}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
            {typeof highlight.value === 'number' ? highlight.value.toFixed(1) : highlight.value}
          </span>
          {highlight.unit && (
            <span className="text-[10px] text-[var(--text-muted)]">{highlight.unit}</span>
          )}
          <TrendIcon trend={highlight.trend} />
        </div>
        {highlight.percentile && (
          <PercentileBar value={highlight.percentile} className="mt-1.5" />
        )}
      </div>
      {highlight.percentile && (
        <div className="ml-2 text-right flex-shrink-0">
          <span className="text-xs font-medium text-[var(--text-muted)]">
            Top {100 - highlight.percentile}%
          </span>
        </div>
      )}
    </div>
  );
}

// Loading skeleton
function StatsCardSkeleton({ variant }: { variant: string }) {
  if (variant === 'compact') {
    return (
      <div className="flex gap-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-12 flex-1 rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 rounded-md" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── FULL VARIANT — For athlete profile pages ──────────────────────────────

function FullStatsCard({
  profile,
  sport,
  showConnectButton,
  className,
}: {
  profile: StatsTaqProfile;
  sport?: string;
  showConnectButton?: boolean;
  className?: string;
}) {
  const currentSeason = profile.seasons[0];
  const stats = currentSeason?.stats || {};
  const highlights = currentSeason?.highlights || [];
  const keyStats = getKeyStatsForSport(sport || currentSeason?.sport || 'basketball');

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-[var(--radius-lg)] bg-[var(--accent-primary)]/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-[var(--accent-primary)]" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Athletic Stats
                {currentSeason?.verified && (
                  <Shield className="h-4 w-4 text-[var(--color-success)]" />
                )}
              </CardTitle>
              <p className="text-sm text-[var(--text-muted)]">
                {currentSeason?.season || '2025-26'} Season
                {currentSeason?.source === 'statstaq' && (
                  <span className="ml-1 text-[var(--accent-primary)]">via StatsTaq</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {profile.performance_score && (
              <Badge variant="primary" className="font-mono">
                <Trophy className="h-3 w-3 mr-1" />
                {profile.performance_score}
              </Badge>
            )}
            {!currentSeason?.verified && (
              <Badge variant="outline" className="text-[10px]">
                <AlertCircle className="h-3 w-3 mr-1" />
                Unverified
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {keyStats.map(key => {
            const value = stats[key];
            if (value === undefined) return null;
            return (
              <div
                key={key}
                className="p-2.5 sm:p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-center"
              >
                <p className="text-[10px] sm:text-xs text-[var(--text-muted)] uppercase tracking-wider">
                  {formatStatLabel(key)}
                </p>
                <p className="text-lg sm:text-xl font-bold text-[var(--text-primary)] mt-0.5">
                  {formatStatValue(key, value as number)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Highlights with percentile bars */}
        {highlights.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Performance Highlights
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {highlights.map((h, i) => (
                <StatPill key={i} highlight={h} />
              ))}
            </div>
          </div>
        )}

        {/* Connect / View on StatsTaq */}
        {showConnectButton && !profile.connected && (
          <div className="pt-2 border-t border-[var(--border-color)]">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-[var(--accent-primary)] border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/10"
              onClick={() => window.open('https://statstaq.com', '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
              Connect StatsTaq for Verified Stats
            </Button>
          </div>
        )}

        {profile.connected && profile.profile_url && (
          <div className="pt-2 border-t border-[var(--border-color)]">
            <a
              href={profile.profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-[var(--accent-primary)] hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Full Stats on StatsTaq
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── COMPACT VARIANT — For discovery cards / sidebars ──────────────────────

function CompactStatsCard({
  profile,
  sport,
  className,
}: {
  profile: StatsTaqProfile;
  sport?: string;
  className?: string;
}) {
  const currentSeason = profile.seasons[0];
  const stats = currentSeason?.stats || {};
  const keyStats = getKeyStatsForSport(sport || currentSeason?.sport || 'basketball').slice(0, 3);

  return (
    <div className={cn('flex gap-1.5 sm:gap-2', className)}>
      {keyStats.map(key => {
        const value = stats[key];
        if (value === undefined) return null;
        return (
          <div
            key={key}
            className="flex-1 p-1.5 sm:p-2 rounded-[var(--radius-sm)] bg-[var(--bg-tertiary)] text-center min-w-0"
          >
            <p className="text-[9px] sm:text-[10px] text-[var(--text-muted)] uppercase truncate">
              {formatStatLabel(key)}
            </p>
            <p className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
              {formatStatValue(key, value as number)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── INLINE VARIANT — Single-line stat display ─────────────────────────────

function InlineStatsCard({
  profile,
  sport,
  className,
}: {
  profile: StatsTaqProfile;
  sport?: string;
  className?: string;
}) {
  const currentSeason = profile.seasons[0];
  const stats = currentSeason?.stats || {};
  const keyStats = getKeyStatsForSport(sport || currentSeason?.sport || 'basketball').slice(0, 4);

  return (
    <div className={cn('flex items-center gap-3 text-sm', className)}>
      <BarChart3 className="h-4 w-4 text-[var(--accent-primary)] flex-shrink-0" />
      {keyStats.map((key, i) => {
        const value = stats[key];
        if (value === undefined) return null;
        return (
          <span key={key} className="flex items-center gap-1 text-[var(--text-secondary)]">
            <span className="font-medium text-[var(--text-primary)]">
              {formatStatValue(key, value as number)}
            </span>
            <span className="text-xs text-[var(--text-muted)]">{formatStatLabel(key)}</span>
            {i < keyStats.length - 1 && <span className="text-[var(--border-color)] mx-1">·</span>}
          </span>
        );
      })}
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

export function AthleteStatsCard({
  athleteId,
  sport,
  variant = 'full',
  className,
  showConnectButton = true,
}: AthleteStatsCardProps) {
  const [profile, setProfile] = useState<StatsTaqProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const result = await fetchStatsTaqProfile(athleteId);
      if (!cancelled && result.data) {
        setProfile(result.data);
      }
      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [athleteId]);

  if (loading) return <StatsCardSkeleton variant={variant} />;
  if (!profile || profile.seasons.length === 0) return null;

  switch (variant) {
    case 'compact':
      return <CompactStatsCard profile={profile} sport={sport} className={className} />;
    case 'inline':
      return <InlineStatsCard profile={profile} sport={sport} className={className} />;
    default:
      return (
        <FullStatsCard
          profile={profile}
          sport={sport}
          showConnectButton={showConnectButton}
          className={className}
        />
      );
  }
}
