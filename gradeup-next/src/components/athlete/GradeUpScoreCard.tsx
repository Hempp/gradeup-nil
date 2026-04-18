'use client';

import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Trophy, GraduationCap, Users, Dumbbell, Star } from 'lucide-react';
import {
  calculateNILValuation,
  getTierDisplay,
  type NILValuationInput,
  type NILValuation,
} from '@/lib/services/pricing';

// ═══════════════════════════════════════════════════════════════════════════
// GRADEUP SCORE CARD
// Shows the athlete's GPA-weighted NIL valuation score with component breakdown
// ═══════════════════════════════════════════════════════════════════════════

interface GradeUpScoreCardProps {
  gpa: number;
  sport: string;
  totalFollowers: number;
  engagementRate?: number;
  division?: string;
  isVerified?: boolean;
  dealsCompleted?: number;
  avgDealRating?: number;
  variant?: 'full' | 'compact';
  className?: string;
}

// Circular score ring
function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color = score >= 90 ? 'var(--accent-tertiary)'
    : score >= 75 ? 'var(--accent-gold)'
    : score >= 60 ? 'var(--accent-primary)'
    : score >= 40 ? 'var(--accent-success)'
    : 'var(--text-muted)';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth="6"
        />
        {/* Score ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">{score}</span>
        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Score</span>
      </div>
    </div>
  );
}

// Component score bar
function ComponentBar({
  icon: Icon,
  label,
  score,
  maxScore,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  score: number;
  maxScore: number;
  color: string;
}) {
  const percentage = (score / maxScore) * 100;

  return (
    <div className="flex items-center gap-3">
      <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
          <span className="text-xs font-bold text-[var(--text-primary)]">{score}/{maxScore}</span>
        </div>
        <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${percentage}%`,
              backgroundColor: percentage >= 80 ? 'var(--color-success)'
                : percentage >= 60 ? 'var(--accent-primary)'
                : percentage >= 40 ? 'var(--color-warning)'
                : 'var(--color-error)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function GradeUpScoreCard({
  gpa,
  sport,
  totalFollowers,
  engagementRate,
  division,
  isVerified,
  dealsCompleted,
  avgDealRating,
  variant = 'full',
  className,
}: GradeUpScoreCardProps) {
  const valuation = useMemo<NILValuation>(() => {
    const input: NILValuationInput = {
      gpa,
      sport,
      totalFollowers,
      engagementRate,
      division,
      isVerified,
      dealsCompleted,
      avgDealRating,
    };
    return calculateNILValuation(input);
  }, [gpa, sport, totalFollowers, engagementRate, division, isVerified, dealsCompleted, avgDealRating]);

  const tierDisplay = getTierDisplay(valuation.tier);

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <ScoreRing score={valuation.gradeUpScore} size={56} />
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            GradeUp Score
          </p>
          <p className={cn('text-xs font-medium', tierDisplay.color)}>
            {tierDisplay.label}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[var(--accent-gold)]" />
            GradeUp Score
          </CardTitle>
          <Badge variant="outline" className={cn('font-semibold', tierDisplay.color)}>
            {tierDisplay.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Score Ring + Value */}
        <div className="flex items-center justify-between">
          <ScoreRing score={valuation.gradeUpScore} />
          <div className="text-right">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
              Estimated NIL Value
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              ${valuation.estimatedValue.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Range: ${valuation.dealRange.min.toLocaleString()} – ${valuation.dealRange.max.toLocaleString()}
            </p>
            <p className={cn('text-xs mt-2', tierDisplay.color)}>
              {tierDisplay.description}
            </p>
          </div>
        </div>

        {/* Component Breakdown */}
        <div className="space-y-3 pt-3 border-t border-[var(--border-color)]">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Score Breakdown
          </p>
          <ComponentBar
            icon={GraduationCap}
            label="Academic"
            score={valuation.components.academic}
            maxScore={30}
            color="bg-[var(--accent-success)]/10 text-[var(--accent-success)]"
          />
          <ComponentBar
            icon={Users}
            label="Social Reach"
            score={valuation.components.social}
            maxScore={25}
            color="bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
          />
          <ComponentBar
            icon={Dumbbell}
            label="Athletic"
            score={valuation.components.athletic}
            maxScore={25}
            color="bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]"
          />
          <ComponentBar
            icon={Star}
            label="Reputation"
            score={valuation.components.reputation}
            maxScore={20}
            color="bg-[var(--accent-tertiary)]/10 text-[var(--accent-tertiary)]"
          />
        </div>
      </CardContent>
    </Card>
  );
}
