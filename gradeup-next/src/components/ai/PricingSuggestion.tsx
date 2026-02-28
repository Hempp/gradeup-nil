'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lightbulb, TrendingUp, TrendingDown, Minus, RefreshCw, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  getSuggestedPricing,
  formatPriceRange,
  getConfidenceColor,
  type PricingSuggestionInput,
  type PricingSuggestion as PricingSuggestionType,
  type PricingFactor,
} from '@/lib/services/ai-suggestions';

// ═══════════════════════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

interface PricingSuggestionProps {
  /** Input parameters for the pricing calculation */
  input: PricingSuggestionInput;
  /** Optional callback when user applies the suggested price */
  onApplyPrice?: (price: number) => void;
  /** Whether to show the detailed breakdown */
  showDetails?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper Components
// ═══════════════════════════════════════════════════════════════════════════

function FactorIcon({ impact }: { impact: PricingFactor['impact'] }) {
  switch (impact) {
    case 'positive':
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case 'negative':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    default:
      return <Minus className="h-4 w-4 text-gray-400" />;
  }
}

function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const variants = {
    high: 'bg-green-500/20 text-green-400 border-green-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        variants[confidence]
      )}
    >
      {confidence.charAt(0).toUpperCase() + confidence.slice(1)} confidence
    </span>
  );
}

function PricingFactorItem({ factor }: { factor: PricingFactor }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--border-color)] last:border-0">
      <div className="flex items-center gap-2">
        <FactorIcon impact={factor.impact} />
        <span className="text-sm text-[var(--text-primary)]">{factor.name}</span>
      </div>
      <span className="text-sm text-[var(--text-muted)]">{factor.description}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AI-powered pricing suggestion widget for deal creation
 *
 * Analyzes athlete metrics and deal parameters to suggest fair compensation.
 * Shows pricing factors and confidence level.
 *
 * @example
 * <PricingSuggestion
 *   input={{
 *     dealType: 'social_post',
 *     athleteFollowers: 15000,
 *     athleteGpa: 3.8,
 *     athleteSport: 'Basketball',
 *     athleteDivision: 'D1',
 *   }}
 *   onApplyPrice={(price) => setCompensationAmount(price)}
 * />
 */
export function PricingSuggestion({
  input,
  onApplyPrice,
  showDetails = true,
  className,
}: PricingSuggestionProps) {
  const [suggestion, setSuggestion] = useState<PricingSuggestionType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchSuggestion = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await getSuggestedPricing(input);

    if (result.error) {
      setError(result.error.message);
    } else {
      setSuggestion(result.data);
    }

    setIsLoading(false);
  }, [input]);

  useEffect(() => {
    // Only fetch if we have required inputs
    if (input.dealType && input.athleteFollowers >= 0 && input.athleteGpa >= 0) {
      fetchSuggestion();
    }
  }, [fetchSuggestion, input.dealType, input.athleteFollowers, input.athleteGpa, input.athleteSport, input.athleteDivision]);

  const handleApplyPrice = () => {
    if (suggestion && onApplyPrice) {
      onApplyPrice(suggestion.suggestedPrice);
    }
  };

  if (error) {
    return (
      <Card className={cn('border-[var(--color-error)]/30', className)}>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2 text-[var(--color-error)]">
            <Lightbulb className="h-5 w-5" />
            <span className="text-sm">Unable to calculate pricing suggestion</span>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchSuggestion}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass" className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[var(--color-primary)]/10">
              <Lightbulb className="h-5 w-5 text-[var(--color-primary)]" />
            </div>
            <CardTitle className="text-base">AI Pricing Suggestion</CardTitle>
          </div>
          {suggestion && (
            <ConfidenceBadge confidence={suggestion.confidence} />
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-10 bg-[var(--bg-card)] rounded-lg" />
            <div className="h-4 bg-[var(--bg-card)] rounded w-3/4" />
          </div>
        ) : suggestion ? (
          <div className="space-y-4">
            {/* Main Price Display */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-[var(--color-primary)]">
                    ${suggestion.suggestedPrice.toLocaleString()}
                  </span>
                  <span className="text-sm text-[var(--text-muted)]">suggested</span>
                </div>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Range: {formatPriceRange(suggestion.priceRange)}
                </p>
              </div>

              {onApplyPrice && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleApplyPrice}
                  className="gap-2"
                >
                  <DollarSign className="h-4 w-4" />
                  Apply
                </Button>
              )}
            </div>

            {/* Reasoning */}
            <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-card)] rounded-lg p-3">
              {suggestion.reasoning}
            </p>

            {/* Expandable Factors */}
            {showDetails && suggestion.factors.length > 0 && (
              <div>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center justify-between w-full py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <span>View pricing factors ({suggestion.factors.length})</span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-2 bg-[var(--bg-card)] rounded-lg p-3">
                    {suggestion.factors.map((factor, index) => (
                      <PricingFactorItem key={index} factor={factor} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Refresh Button */}
            <div className="flex justify-end pt-2 border-t border-[var(--border-color)]">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchSuggestion}
                className="gap-2 text-xs"
              >
                <RefreshCw className="h-3 w-3" />
                Recalculate
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-[var(--text-muted)]">
            <p className="text-sm">Enter athlete details to get a pricing suggestion</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Compact Variant
// ═══════════════════════════════════════════════════════════════════════════

interface CompactPricingSuggestionProps {
  input: PricingSuggestionInput;
  onApplyPrice?: (price: number) => void;
  className?: string;
}

/**
 * Compact version of pricing suggestion for inline use
 */
export function CompactPricingSuggestion({
  input,
  onApplyPrice,
  className,
}: CompactPricingSuggestionProps) {
  const [suggestion, setSuggestion] = useState<PricingSuggestionType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSuggestion = async () => {
      if (input.dealType && input.athleteFollowers >= 0 && input.athleteGpa >= 0) {
        setIsLoading(true);
        const result = await getSuggestedPricing(input);
        if (result.data) {
          setSuggestion(result.data);
        }
        setIsLoading(false);
      }
    };

    fetchSuggestion();
  }, [input]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-[var(--text-muted)]', className)}>
        <RefreshCw className="h-4 w-4 animate-spin" />
        Calculating...
      </div>
    );
  }

  if (!suggestion) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center gap-1.5 text-sm">
        <Lightbulb className="h-4 w-4 text-[var(--color-primary)]" />
        <span className="text-[var(--text-muted)]">Suggested:</span>
        <span className={cn('font-semibold', getConfidenceColor(suggestion.confidence))}>
          ${suggestion.suggestedPrice.toLocaleString()}
        </span>
      </div>

      {onApplyPrice && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onApplyPrice(suggestion.suggestedPrice)}
          className="text-xs h-7 px-2"
        >
          Use this
        </Button>
      )}
    </div>
  );
}

export default PricingSuggestion;
