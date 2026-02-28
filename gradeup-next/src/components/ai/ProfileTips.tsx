'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  TrendingUp,
  Shield,
  Eye,
  MessageSquare,
  FileCheck,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  analyzeProfile,
  type ProfileAnalysis,
  type ProfileTip,
} from '@/lib/services/ai-suggestions';
import type { Athlete } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

interface ProfileTipsProps {
  /** The athlete profile to analyze */
  athlete: Partial<Athlete>;
  /** Callback when a tip action is clicked */
  onTipAction?: (tip: ProfileTip) => void;
  /** Whether to show the progress ring */
  showProgress?: boolean;
  /** Whether to show strengths section */
  showStrengths?: boolean;
  /** Maximum number of tips to show initially */
  initialTipsCount?: number;
  /** Additional CSS classes */
  className?: string;
}

interface ProfileScoreRingProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface TipCardProps {
  tip: ProfileTip;
  onAction?: () => void;
  onDismiss?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper Components
// ═══════════════════════════════════════════════════════════════════════════

function CategoryIcon({ category }: { category: ProfileTip['category'] }) {
  const icons = {
    completeness: FileCheck,
    visibility: Eye,
    engagement: MessageSquare,
    verification: Shield,
    content: TrendingUp,
  };

  const Icon = icons[category] || Lightbulb;
  return <Icon className="h-5 w-5" />;
}

function ProfileScoreRing({ score, size = 'md', className }: ProfileScoreRingProps) {
  const sizes = {
    sm: { ring: 60, stroke: 6 },
    md: { ring: 100, stroke: 8 },
    lg: { ring: 140, stroke: 10 },
  };

  const { ring, stroke } = sizes[size];
  const radius = (ring - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  // Determine color based on score
  let strokeColor = 'var(--color-error)';
  if (score >= 80) {
    strokeColor = 'var(--color-success, #22c55e)';
  } else if (score >= 60) {
    strokeColor = 'var(--color-secondary)';
  } else if (score >= 40) {
    strokeColor = 'var(--color-warning, #f59e0b)';
  }

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={ring}
        height={ring}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={ring / 2}
          cy={ring / 2}
          r={radius}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth={stroke}
        />
        {/* Progress circle */}
        <circle
          cx={ring / 2}
          cy={ring / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-[var(--text-primary)]">{score}</span>
        <span className="text-xs text-[var(--text-muted)]">score</span>
      </div>
    </div>
  );
}

function TipCard({ tip, onAction, onDismiss }: TipCardProps) {
  const priorityColors = {
    high: 'border-l-[var(--color-error)] bg-[var(--color-error)]/5',
    medium: 'border-l-[var(--color-warning,#f59e0b)] bg-[var(--color-warning,#f59e0b)]/5',
    low: 'border-l-[var(--color-info,#3b82f6)] bg-[var(--color-info,#3b82f6)]/5',
  };

  const categoryColors = {
    completeness: 'text-blue-400 bg-blue-500/10',
    visibility: 'text-purple-400 bg-purple-500/10',
    engagement: 'text-pink-400 bg-pink-500/10',
    verification: 'text-green-400 bg-green-500/10',
    content: 'text-orange-400 bg-orange-500/10',
  };

  return (
    <div
      className={cn(
        'relative p-4 rounded-lg border-l-4 border border-[var(--border-color)]',
        priorityColors[tip.priority]
      )}
    >
      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
          aria-label="Dismiss tip"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="flex items-start gap-3">
        {/* Category Icon */}
        <div className={cn('p-2 rounded-lg flex-shrink-0', categoryColors[tip.category])}>
          <CategoryIcon category={tip.category} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-[var(--text-primary)]">{tip.title}</h4>
            <Badge
              variant={tip.priority === 'high' ? 'error' : tip.priority === 'medium' ? 'warning' : 'default'}
              size="sm"
            >
              {tip.priority}
            </Badge>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            {tip.description}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-primary)] font-medium">
              {tip.estimatedImpact}
            </span>

            {onAction && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAction}
                className="gap-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
              >
                {tip.actionText}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StrengthsList({ strengths }: { strengths: string[] }) {
  if (strengths.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        Your Strengths
      </h4>
      <ul className="space-y-1">
        {strengths.map((strength, index) => (
          <li
            key={index}
            className="text-sm text-[var(--text-secondary)] flex items-center gap-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
            {strength}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AI-powered profile optimization tips for athletes
 *
 * Analyzes an athlete's profile and provides actionable suggestions
 * to improve visibility, engagement, and earning potential.
 *
 * @example
 * <ProfileTips
 *   athlete={currentAthlete}
 *   onTipAction={(tip) => router.push(tip.actionUrl)}
 *   showProgress
 *   showStrengths
 * />
 */
export function ProfileTips({
  athlete,
  onTipAction,
  showProgress = true,
  showStrengths = true,
  initialTipsCount = 3,
  className,
}: ProfileTipsProps) {
  const [analysis, setAnalysis] = useState<ProfileAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedTips, setDismissedTips] = useState<Set<string>>(new Set());
  const [showAllTips, setShowAllTips] = useState(false);

  const fetchAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await analyzeProfile(athlete);

    if (result.error) {
      setError(result.error.message);
    } else {
      setAnalysis(result.data);
    }

    setIsLoading(false);
  }, [athlete]);

  useEffect(() => {
    if (athlete.id || athlete.profile_id) {
      fetchAnalysis();
    }
  }, [athlete.id, athlete.profile_id, fetchAnalysis]);

  const handleDismissTip = (tipId: string) => {
    setDismissedTips((prev) => new Set([...prev, tipId]));
  };

  const handleTipAction = (tip: ProfileTip) => {
    if (onTipAction) {
      onTipAction(tip);
    }
  };

  // Filter out dismissed tips
  const visibleTips = analysis?.tips.filter((tip) => !dismissedTips.has(tip.id)) || [];
  const displayedTips = showAllTips ? visibleTips : visibleTips.slice(0, initialTipsCount);
  const hasMoreTips = visibleTips.length > initialTipsCount;

  if (error) {
    return (
      <Card className={cn('border-[var(--color-error)]/30', className)}>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2 text-[var(--color-error)]">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">Unable to analyze profile</span>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchAnalysis}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass" className={cn('overflow-hidden', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-primary)]/10">
              <Lightbulb className="h-5 w-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <CardTitle className="text-base">Profile Optimization</CardTitle>
              <p className="text-sm text-[var(--text-muted)]">
                AI-powered tips to boost your profile
              </p>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={fetchAnalysis} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-24 w-24 rounded-full bg-[var(--bg-card)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/2 bg-[var(--bg-card)] rounded" />
                <div className="h-4 w-1/3 bg-[var(--bg-card)] rounded" />
              </div>
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-[var(--bg-card)] rounded-lg" />
            ))}
          </div>
        ) : analysis ? (
          <>
            {/* Score & Completion */}
            {showProgress && (
              <div className="flex items-center gap-6 p-4 bg-[var(--bg-card)] rounded-lg">
                <ProfileScoreRing score={analysis.overallScore} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[var(--text-muted)]">Profile Completion</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {analysis.completionPercentage}%
                    </span>
                  </div>
                  <div className="h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500"
                      style={{ width: `${analysis.completionPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    {analysis.tips.length === 0
                      ? 'Your profile is fully optimized!'
                      : `${analysis.tips.length} tip${analysis.tips.length > 1 ? 's' : ''} to improve`}
                  </p>
                </div>
              </div>
            )}

            {/* Strengths */}
            {showStrengths && analysis.strengths.length > 0 && (
              <StrengthsList strengths={analysis.strengths} />
            )}

            {/* Tips */}
            {displayedTips.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[var(--color-secondary)]" />
                  Improvement Tips
                </h4>

                {displayedTips.map((tip) => (
                  <TipCard
                    key={tip.id}
                    tip={tip}
                    onAction={() => handleTipAction(tip)}
                    onDismiss={() => handleDismissTip(tip.id)}
                  />
                ))}

                {/* Show More/Less */}
                {hasMoreTips && (
                  <button
                    onClick={() => setShowAllTips(!showAllTips)}
                    className="flex items-center gap-1 w-full justify-center py-2 text-sm text-[var(--color-primary)] hover:underline"
                  >
                    {showAllTips ? (
                      <>
                        Show less <ChevronUp className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Show {visibleTips.length - initialTipsCount} more tips{' '}
                        <ChevronDown className="h-4 w-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* All Complete */}
            {displayedTips.length === 0 && (
              <div className="text-center py-6">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
                <h4 className="font-medium text-[var(--text-primary)]">
                  Great job!
                </h4>
                <p className="text-sm text-[var(--text-muted)]">
                  Your profile is fully optimized for maximum visibility.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6 text-[var(--text-muted)]">
            <p className="text-sm">Loading profile analysis...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Compact Variant
// ═══════════════════════════════════════════════════════════════════════════

interface CompactProfileTipsProps {
  athlete: Partial<Athlete>;
  onViewAll?: () => void;
  className?: string;
}

/**
 * Compact version of profile tips for dashboard widgets
 */
export function CompactProfileTips({
  athlete,
  onViewAll,
  className,
}: CompactProfileTipsProps) {
  const [analysis, setAnalysis] = useState<ProfileAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysis = async () => {
      const result = await analyzeProfile(athlete);
      if (result.data) {
        setAnalysis(result.data);
      }
      setIsLoading(false);
    };

    if (athlete.id || athlete.profile_id) {
      fetchAnalysis();
    }
  }, [athlete]);

  if (isLoading) {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="h-20 bg-[var(--bg-card)] rounded-lg" />
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const topTip = analysis.tips[0];

  return (
    <Card className={className}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ProfileScoreRing score={analysis.overallScore} size="sm" />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Profile Score
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {analysis.tips.length} tips available
              </p>
            </div>
          </div>
        </div>

        {topTip && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-card)]">
            <Lightbulb className="h-4 w-4 text-[var(--color-primary)] flex-shrink-0" />
            <p className="text-sm text-[var(--text-secondary)] truncate flex-1">
              {topTip.title}
            </p>
            <Badge variant={topTip.priority === 'high' ? 'error' : topTip.priority === 'medium' ? 'warning' : 'default'} size="sm">
              {topTip.priority}
            </Badge>
          </div>
        )}

        {onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="w-full mt-3 gap-1"
          >
            View all tips
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default ProfileTips;
