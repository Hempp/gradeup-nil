'use client';

import { useState, useCallback } from 'react';
import { Users, TrendingUp, DollarSign, Target, Sparkles, ChevronRight, RefreshCw, Star, Filter, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  getAthleteRecommendations,
  type AthleteMatchInput,
  type AthleteRecommendation,
  type AthleteMatch,
} from '@/lib/services/ai-suggestions';
import type { Athlete } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

interface AthleteRecommendationsProps {
  /** List of available athletes to match against */
  athletes: Partial<Athlete>[];
  /** Campaign/search criteria */
  criteria: AthleteMatchInput;
  /** Callback when an athlete is selected */
  onSelectAthlete?: (athlete: Partial<Athlete>) => void;
  /** Callback when user wants to view athlete profile */
  onViewProfile?: (athleteId: string) => void;
  /** Whether to show budget analysis section */
  showBudgetAnalysis?: boolean;
  /** Maximum number of recommendations to show */
  maxResults?: number;
  /** Additional CSS classes */
  className?: string;
}

interface AthleteCardProps {
  match: AthleteMatch;
  onSelect?: () => void;
  onViewProfile?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper Components
// ═══════════════════════════════════════════════════════════════════════════

function MatchScoreBadge({ score }: { score: number }) {
  let colorClass = 'bg-red-500/20 text-red-400 border-red-500/30';
  if (score >= 80) {
    colorClass = 'bg-green-500/20 text-green-400 border-green-500/30';
  } else if (score >= 60) {
    colorClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  }

  return (
    <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium', colorClass)}>
      <Star className="h-3 w-3" />
      {score}% match
    </div>
  );
}

function AthleteRecommendationCard({ match, onSelect, onViewProfile }: AthleteCardProps) {
  const athlete = match.athlete;

  return (
    <Card hover className="relative overflow-hidden">
      {/* Match Score Badge */}
      <div className="absolute top-3 right-3">
        <MatchScoreBadge score={match.matchScore} />
      </div>

      <CardContent className="pt-6">
        <div className="flex gap-4">
          {/* Avatar */}
          <Avatar
            src={athlete.avatar_url}
            alt={`${athlete.first_name} ${athlete.last_name}`}
            size="lg"
            className="flex-shrink-0"
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-[var(--text-primary)] truncate">
              {athlete.first_name} {athlete.last_name}
            </h4>

            <div className="flex items-center gap-2 mt-1 text-sm text-[var(--text-muted)]">
              {athlete.sport?.name && (
                <span>{athlete.sport.name}</span>
              )}
              {athlete.school?.division && (
                <>
                  <span>-</span>
                  <span>{athlete.school.division}</span>
                </>
              )}
            </div>

            {athlete.school?.name && (
              <p className="text-sm text-[var(--text-muted)] mt-0.5 truncate">
                {athlete.school.name}
              </p>
            )}

            {/* Key Stats */}
            <div className="flex flex-wrap gap-2 mt-3">
              {athlete.gpa && athlete.gpa >= 3.0 && (
                <Badge variant="primary" size="sm">
                  {athlete.gpa.toFixed(1)} GPA
                </Badge>
              )}
              {athlete.total_followers && athlete.total_followers > 0 && (
                <Badge variant="outline" size="sm">
                  {(athlete.total_followers / 1000).toFixed(0)}K followers
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Match Reasons */}
        {match.matchReasons.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[var(--border-color)]">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Why they match
            </p>
            <div className="flex flex-wrap gap-1.5">
              {match.matchReasons.slice(0, 3).map((reason, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                >
                  {reason}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Estimated Cost & Reach */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-1 text-sm">
            <DollarSign className="h-4 w-4 text-[var(--text-muted)]" />
            <span className="text-[var(--text-primary)] font-medium">
              ${match.estimatedCost.toLocaleString()}
            </span>
            <span className="text-[var(--text-muted)]">est.</span>
          </div>

          <div className="flex items-center gap-1 text-sm">
            <TrendingUp className="h-4 w-4 text-[var(--text-muted)]" />
            <span className="text-[var(--text-muted)]">
              {match.potentialReach.toLocaleString()} reach
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        {onViewProfile && (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewProfile}
            className="flex-1"
          >
            View Profile
          </Button>
        )}
        {onSelect && (
          <Button
            variant="primary"
            size="sm"
            onClick={onSelect}
            className="flex-1 gap-1"
          >
            <Target className="h-4 w-4" />
            Select
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function InsightCard({ insights }: { insights: string[] }) {
  if (insights.length === 0) return null;

  return (
    <Card variant="glass" className="bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[var(--color-primary)]/10 flex-shrink-0">
            <Sparkles className="h-5 w-5 text-[var(--color-primary)]" />
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-[var(--text-primary)]">AI Insights</h4>
            <ul className="space-y-1.5">
              {insights.map((insight, index) => (
                <li key={index} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BudgetAnalysisCard({ analysis }: { analysis: AthleteRecommendation['budgetAnalysis'] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-[var(--color-secondary)]" />
          Budget Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {analysis.canAfford}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Athletes in budget</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              ${analysis.averageCost.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Average cost</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--color-primary)]">
              {analysis.recommendedCount}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Recommended</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AI-powered athlete recommendation widget for brands
 *
 * Matches athletes to campaign criteria and provides insights.
 *
 * @example
 * <AthleteRecommendations
 *   athletes={availableAthletes}
 *   criteria={{
 *     campaignGoals: ['brand awareness', 'social engagement'],
 *     budget: 5000,
 *     dealType: 'social_post',
 *     preferredSports: ['Basketball', 'Football'],
 *     minGpa: 3.0,
 *   }}
 *   onSelectAthlete={(athlete) => handleSelectAthlete(athlete)}
 * />
 */
export function AthleteRecommendations({
  athletes,
  criteria,
  onSelectAthlete,
  onViewProfile,
  showBudgetAnalysis = true,
  maxResults = 10,
  className,
}: AthleteRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<AthleteRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [filterScore, setFilterScore] = useState<number>(0);

  const fetchRecommendations = useCallback(async () => {
    if (athletes.length === 0) {
      setError('No athletes available to search');
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    const result = await getAthleteRecommendations(athletes, criteria);

    if (result.error) {
      setError(result.error.message);
    } else {
      setRecommendations(result.data);
    }

    setIsLoading(false);
  }, [athletes, criteria]);

  // Filter matches by minimum score
  const filteredMatches = recommendations?.matches.filter(
    (m) => m.matchScore >= filterScore
  ).slice(0, maxResults) || [];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--color-primary)]/10">
            <Users className="h-6 w-6 text-[var(--color-primary)]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              AI Athlete Matching
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              Find athletes that match your campaign goals
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={fetchRecommendations}
          isLoading={isLoading}
          className="gap-2"
        >
          {hasSearched ? (
            <>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Find Athletes
            </>
          )}
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-[var(--color-error)]/30">
          <CardContent className="py-4 text-center text-[var(--color-error)]">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="space-y-4 pt-6">
                <div className="flex gap-4">
                  <div className="h-16 w-16 rounded-full bg-[var(--bg-card)]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-2/3 bg-[var(--bg-card)] rounded" />
                    <div className="h-4 w-1/2 bg-[var(--bg-card)] rounded" />
                  </div>
                </div>
                <div className="h-4 w-full bg-[var(--bg-card)] rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results */}
      {!isLoading && recommendations && (
        <>
          {/* Insights */}
          {recommendations.insights.length > 0 && (
            <InsightCard insights={recommendations.insights} />
          )}

          {/* Budget Analysis */}
          {showBudgetAnalysis && (
            <BudgetAnalysisCard analysis={recommendations.budgetAnalysis} />
          )}

          {/* Filter Controls */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-muted)]">
              Showing {filteredMatches.length} of {recommendations.matches.length} athletes
            </p>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[var(--text-muted)]" />
              <select
                value={filterScore}
                onChange={(e) => setFilterScore(Number(e.target.value))}
                className="text-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md px-2 py-1 text-[var(--text-primary)]"
              >
                <option value={0}>All matches</option>
                <option value={50}>50%+ match</option>
                <option value={70}>70%+ match</option>
                <option value={80}>80%+ match</option>
              </select>
            </div>
          </div>

          {/* Athlete Grid */}
          {filteredMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMatches.map((match) => (
                <AthleteRecommendationCard
                  key={match.athleteId}
                  match={match}
                  onSelect={onSelectAthlete ? () => onSelectAthlete(match.athlete) : undefined}
                  onViewProfile={onViewProfile ? () => onViewProfile(match.athleteId) : undefined}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-3" />
                <p className="text-[var(--text-muted)]">
                  No athletes match your current criteria.
                </p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Try adjusting your filters or budget.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Initial State */}
      {!isLoading && !hasSearched && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="p-4 rounded-full bg-[var(--color-primary)]/10 w-fit mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-[var(--color-primary)]" />
            </div>
            <h4 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              Ready to Find Your Perfect Athletes
            </h4>
            <p className="text-[var(--text-muted)] max-w-md mx-auto mb-4">
              Our AI will analyze {athletes.length} athletes and match them to your campaign goals,
              budget, and preferences.
            </p>
            <Button variant="primary" onClick={fetchRecommendations} className="gap-2">
              <Search className="h-4 w-4" />
              Start Matching
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AthleteRecommendations;
