/**
 * AI Components Index
 * Export all AI-powered suggestion components
 */

export { PricingSuggestion, CompactPricingSuggestion } from './PricingSuggestion';
export { AthleteRecommendations } from './AthleteRecommendations';
export { ProfileTips, CompactProfileTips } from './ProfileTips';

// Re-export types from the service for convenience
export type {
  PricingSuggestionInput,
  PricingSuggestion as PricingSuggestionData,
  PricingFactor,
  AthleteMatchInput,
  AthleteMatch,
  AthleteRecommendation,
  ProfileTip,
  ProfileAnalysis,
  ContentSuggestion,
} from '@/lib/services/ai-suggestions';
