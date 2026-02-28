'use client';

// ═══════════════════════════════════════════════════════════════════════════
// AI Suggestions Service
// Provides intelligent suggestions for pricing, athlete matching, profile
// optimization, and content recommendations.
// Uses rule-based fallback when AI API key is not configured.
// ═══════════════════════════════════════════════════════════════════════════

import type { Athlete, DealType } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

export interface ServiceResult<T = null> {
  data: T | null;
  error: Error | null;
}

export interface PricingSuggestionInput {
  dealType: DealType;
  athleteFollowers: number;
  athleteGpa: number;
  athleteSport: string;
  athleteDivision?: string;
  deliverables?: string;
  duration?: string; // e.g., "1 week", "1 month"
}

export interface PricingSuggestion {
  suggestedPrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  factors: PricingFactor[];
}

export interface PricingFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  weight: number; // 0-100
}

export interface AthleteMatchInput {
  campaignGoals: string[];
  targetAudience?: string;
  budget: number;
  preferredSports?: string[];
  preferredDivisions?: string[];
  minGpa?: number;
  minFollowers?: number;
  dealType: DealType;
}

export interface AthleteMatch {
  athleteId: string;
  athlete: Partial<Athlete>;
  matchScore: number; // 0-100
  matchReasons: string[];
  estimatedCost: number;
  potentialReach: number;
}

export interface AthleteRecommendation {
  matches: AthleteMatch[];
  insights: string[];
  budgetAnalysis: {
    canAfford: number;
    averageCost: number;
    recommendedCount: number;
  };
}

export interface ProfileTip {
  id: string;
  category: 'completeness' | 'visibility' | 'engagement' | 'verification' | 'content';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionText: string;
  actionUrl?: string;
  estimatedImpact: string;
}

export interface ProfileAnalysis {
  overallScore: number; // 0-100
  tips: ProfileTip[];
  strengths: string[];
  completionPercentage: number;
}

export interface ContentSuggestion {
  id: string;
  platform: 'instagram' | 'tiktok' | 'twitter' | 'youtube';
  contentType: string;
  title: string;
  description: string;
  hashtags: string[];
  bestTimeToPost?: string;
  estimatedEngagement: 'high' | 'medium' | 'low';
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants & Configuration
// ═══════════════════════════════════════════════════════════════════════════

// Base pricing multipliers by deal type
const DEAL_TYPE_BASE_RATES: Record<DealType, number> = {
  social_post: 50, // Base rate per 1000 followers
  appearance: 500, // Base flat rate
  endorsement: 1000, // Base rate
  autograph: 100, // Base rate
  camp: 300, // Per session
  merchandise: 200, // Base rate
  other: 150, // Average
};

// Sport popularity multipliers (affects pricing)
const SPORT_MULTIPLIERS: Record<string, number> = {
  football: 1.5,
  basketball: 1.4,
  soccer: 1.2,
  baseball: 1.2,
  volleyball: 1.1,
  track: 1.0,
  swimming: 1.0,
  tennis: 1.1,
  golf: 1.2,
  gymnastics: 1.1,
  wrestling: 0.9,
  lacrosse: 1.0,
  softball: 1.0,
  hockey: 1.1,
  other: 0.9,
};

// Division multipliers
const DIVISION_MULTIPLIERS: Record<string, number> = {
  D1: 1.5,
  D2: 1.2,
  D3: 1.0,
  NAIA: 0.9,
  JUCO: 0.8,
  other: 0.8,
};

// GPA bonus thresholds
const GPA_BONUSES = [
  { threshold: 3.9, bonus: 1.3 },
  { threshold: 3.5, bonus: 1.15 },
  { threshold: 3.0, bonus: 1.0 },
  { threshold: 0, bonus: 0.9 },
];

// ═══════════════════════════════════════════════════════════════════════════
// Pricing Suggestion Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate a suggested price for a deal based on athlete metrics and deal type
 */
export async function getSuggestedPricing(
  input: PricingSuggestionInput
): Promise<ServiceResult<PricingSuggestion>> {
  try {
    const factors: PricingFactor[] = [];
    let basePrice = DEAL_TYPE_BASE_RATES[input.dealType] || 150;

    // Factor 1: Follower count impact
    const followerMultiplier = Math.min(input.athleteFollowers / 1000, 100);
    if (input.dealType === 'social_post') {
      basePrice = basePrice * followerMultiplier;
    } else {
      basePrice = basePrice + (followerMultiplier * 10);
    }

    factors.push({
      name: 'Social Following',
      impact: input.athleteFollowers > 10000 ? 'positive' : input.athleteFollowers > 1000 ? 'neutral' : 'negative',
      description: `${input.athleteFollowers.toLocaleString()} followers`,
      weight: Math.min(input.athleteFollowers / 500, 100),
    });

    // Factor 2: Sport popularity
    const sportKey = input.athleteSport.toLowerCase();
    const sportMultiplier = SPORT_MULTIPLIERS[sportKey] || SPORT_MULTIPLIERS.other;
    basePrice *= sportMultiplier;

    factors.push({
      name: 'Sport Popularity',
      impact: sportMultiplier > 1.2 ? 'positive' : sportMultiplier < 1.0 ? 'negative' : 'neutral',
      description: `${input.athleteSport} (${sportMultiplier > 1 ? '+' : ''}${Math.round((sportMultiplier - 1) * 100)}%)`,
      weight: sportMultiplier * 50,
    });

    // Factor 3: Division level
    if (input.athleteDivision) {
      const divisionMultiplier = DIVISION_MULTIPLIERS[input.athleteDivision] || DIVISION_MULTIPLIERS.other;
      basePrice *= divisionMultiplier;

      factors.push({
        name: 'Division Level',
        impact: divisionMultiplier > 1.2 ? 'positive' : divisionMultiplier < 1.0 ? 'negative' : 'neutral',
        description: `${input.athleteDivision} athlete`,
        weight: divisionMultiplier * 40,
      });
    }

    // Factor 4: Academic excellence (GPA)
    const gpaBonus = GPA_BONUSES.find((b) => input.athleteGpa >= b.threshold)?.bonus || 1.0;
    basePrice *= gpaBonus;

    factors.push({
      name: 'Academic Excellence',
      impact: gpaBonus > 1.1 ? 'positive' : gpaBonus < 1.0 ? 'negative' : 'neutral',
      description: `${input.athleteGpa.toFixed(2)} GPA${gpaBonus > 1.1 ? ' - Scholar Athlete Bonus' : ''}`,
      weight: input.athleteGpa * 25,
    });

    // Factor 5: Deliverables complexity
    if (input.deliverables) {
      const deliverableCount = input.deliverables.split(',').length;
      if (deliverableCount > 3) {
        basePrice *= 1.3;
        factors.push({
          name: 'Deliverable Complexity',
          impact: 'positive',
          description: `${deliverableCount} deliverables included`,
          weight: deliverableCount * 10,
        });
      }
    }

    // Calculate confidence based on data completeness
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    if (
      input.athleteFollowers > 0 &&
      input.athleteGpa > 0 &&
      input.athleteDivision &&
      input.deliverables
    ) {
      confidence = 'high';
    } else if (!input.athleteDivision && !input.deliverables) {
      confidence = 'low';
    }

    // Round to nearest $25
    const suggestedPrice = Math.round(basePrice / 25) * 25;

    // Calculate price range
    const variance = confidence === 'high' ? 0.15 : confidence === 'medium' ? 0.25 : 0.35;
    const priceRange = {
      min: Math.round((suggestedPrice * (1 - variance)) / 25) * 25,
      max: Math.round((suggestedPrice * (1 + variance)) / 25) * 25,
    };

    // Generate reasoning
    const topFactors = factors
      .filter((f) => f.impact === 'positive')
      .slice(0, 2)
      .map((f) => f.name.toLowerCase());

    const reasoning = topFactors.length > 0
      ? `Based on ${topFactors.join(' and ')}, this athlete commands strong market value for ${input.dealType.replace('_', ' ')} deals.`
      : `Standard market rate for ${input.dealType.replace('_', ' ')} deals with similar athlete profiles.`;

    return {
      data: {
        suggestedPrice,
        priceRange,
        confidence,
        reasoning,
        factors,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to calculate pricing suggestion'),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Athlete Matching Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate match score for an athlete based on campaign requirements
 */
function calculateAthleteMatchScore(
  athlete: Partial<Athlete>,
  input: AthleteMatchInput
): { score: number; reasons: string[] } {
  let score = 50; // Base score
  const reasons: string[] = [];

  // Sport match
  if (input.preferredSports && input.preferredSports.length > 0) {
    const sportMatch = input.preferredSports.some(
      (s) => s.toLowerCase() === athlete.sport?.name?.toLowerCase()
    );
    if (sportMatch) {
      score += 20;
      reasons.push(`Plays ${athlete.sport?.name}`);
    } else {
      score -= 10;
    }
  }

  // Division match
  if (input.preferredDivisions && input.preferredDivisions.length > 0) {
    const divisionMatch = input.preferredDivisions.some(
      (d) => d === athlete.school?.division
    );
    if (divisionMatch) {
      score += 15;
      reasons.push(`${athlete.school?.division} athlete`);
    }
  }

  // GPA requirement
  if (input.minGpa && athlete.gpa) {
    if (athlete.gpa >= input.minGpa) {
      score += 15;
      if (athlete.gpa >= 3.5) {
        reasons.push(`Scholar athlete (${athlete.gpa} GPA)`);
      }
    } else {
      score -= 15;
    }
  }

  // Follower requirement
  const followers = athlete.total_followers || 0;
  if (input.minFollowers) {
    if (followers >= input.minFollowers) {
      score += 10;
      if (followers >= 50000) {
        reasons.push(`Large following (${(followers / 1000).toFixed(0)}K)`);
      }
    } else {
      score -= 10;
    }
  }

  // Verification status bonus
  const verificationCount = [
    athlete.enrollment_verified,
    athlete.sport_verified,
    athlete.grades_verified,
    athlete.identity_verified,
  ].filter(Boolean).length;

  if (verificationCount >= 3) {
    score += 10;
    reasons.push('Fully verified profile');
  }

  // Campaign goal alignment (simplified keyword matching)
  const bio = (athlete.bio || '').toLowerCase();
  const hasGoalMatch = input.campaignGoals.some((goal) =>
    bio.includes(goal.toLowerCase())
  );
  if (hasGoalMatch) {
    score += 10;
    reasons.push('Profile aligns with campaign goals');
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reasons,
  };
}

/**
 * Get athlete recommendations for a brand based on campaign criteria
 */
export async function getAthleteRecommendations(
  athletes: Partial<Athlete>[],
  input: AthleteMatchInput
): Promise<ServiceResult<AthleteRecommendation>> {
  try {
    const matches: AthleteMatch[] = [];

    for (const athlete of athletes) {
      const { score, reasons } = calculateAthleteMatchScore(athlete, input);

      // Get estimated cost for this athlete
      const pricingResult = await getSuggestedPricing({
        dealType: input.dealType,
        athleteFollowers: athlete.total_followers || 0,
        athleteGpa: athlete.gpa || 0,
        athleteSport: athlete.sport?.name || 'other',
        athleteDivision: athlete.school?.division,
      });

      const estimatedCost = pricingResult.data?.suggestedPrice || 0;
      const potentialReach = (athlete.total_followers || 0) * 0.1; // Estimated 10% engagement

      matches.push({
        athleteId: athlete.id || '',
        athlete,
        matchScore: score,
        matchReasons: reasons,
        estimatedCost,
        potentialReach,
      });
    }

    // Sort by match score
    matches.sort((a, b) => b.matchScore - a.matchScore);

    // Calculate budget analysis
    const affordableAthletes = matches.filter((m) => m.estimatedCost <= input.budget);
    const averageCost =
      matches.length > 0
        ? matches.reduce((sum, m) => sum + m.estimatedCost, 0) / matches.length
        : 0;

    // Generate insights
    const insights: string[] = [];

    if (affordableAthletes.length === 0) {
      insights.push(
        `Your budget of $${input.budget.toLocaleString()} may need to be increased. The average athlete cost is $${Math.round(averageCost).toLocaleString()}.`
      );
    } else if (affordableAthletes.length >= 5) {
      insights.push(
        `Great budget! You can afford ${affordableAthletes.length} athletes within your $${input.budget.toLocaleString()} budget.`
      );
    }

    const topMatches = matches.slice(0, 3);
    if (topMatches.length > 0 && topMatches[0].matchScore >= 80) {
      insights.push(
        `Strong matches found! ${topMatches.filter((m) => m.matchScore >= 80).length} athletes have 80%+ compatibility with your campaign.`
      );
    }

    if (input.preferredSports && input.preferredSports.length > 0) {
      const sportMatches = matches.filter((m) =>
        input.preferredSports!.some(
          (s) => s.toLowerCase() === m.athlete.sport?.name?.toLowerCase()
        )
      );
      if (sportMatches.length > 0) {
        insights.push(
          `Found ${sportMatches.length} athletes in your preferred sports: ${input.preferredSports.join(', ')}.`
        );
      }
    }

    return {
      data: {
        matches: matches.slice(0, 20), // Return top 20
        insights,
        budgetAnalysis: {
          canAfford: affordableAthletes.length,
          averageCost: Math.round(averageCost),
          recommendedCount: Math.min(3, affordableAthletes.length),
        },
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to get athlete recommendations'),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Profile Optimization Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyze an athlete's profile and provide optimization tips
 */
export async function analyzeProfile(
  athlete: Partial<Athlete>
): Promise<ServiceResult<ProfileAnalysis>> {
  try {
    const tips: ProfileTip[] = [];
    const strengths: string[] = [];
    let completionPoints = 0;
    const maxPoints = 100;

    // Check avatar
    if (athlete.avatar_url) {
      completionPoints += 10;
      strengths.push('Profile photo uploaded');
    } else {
      tips.push({
        id: 'avatar',
        category: 'completeness',
        priority: 'high',
        title: 'Add a Profile Photo',
        description: 'Profiles with photos get 3x more views from brands. Upload a professional headshot or action shot.',
        actionText: 'Upload Photo',
        actionUrl: '/athlete/profile/edit',
        estimatedImpact: '+300% profile views',
      });
    }

    // Check bio
    if (athlete.bio && athlete.bio.length >= 100) {
      completionPoints += 15;
      strengths.push('Detailed bio');
    } else if (athlete.bio && athlete.bio.length > 0) {
      completionPoints += 5;
      tips.push({
        id: 'bio',
        category: 'completeness',
        priority: 'medium',
        title: 'Expand Your Bio',
        description: 'Your bio is a bit short. Add more about your achievements, interests, and what makes you unique. Aim for at least 100 characters.',
        actionText: 'Edit Bio',
        actionUrl: '/athlete/profile/edit',
        estimatedImpact: '+50% brand interest',
      });
    } else {
      tips.push({
        id: 'bio',
        category: 'completeness',
        priority: 'high',
        title: 'Add a Bio',
        description: 'Tell brands about yourself! Include your achievements, personality, and what kind of partnerships interest you.',
        actionText: 'Add Bio',
        actionUrl: '/athlete/profile/edit',
        estimatedImpact: '+200% profile engagement',
      });
    }

    // Check social handles
    const socialHandles = [
      athlete.instagram_handle,
      athlete.twitter_handle,
      athlete.tiktok_handle,
    ].filter(Boolean).length;

    if (socialHandles >= 2) {
      completionPoints += 15;
      strengths.push(`${socialHandles} social media accounts linked`);
    } else if (socialHandles === 1) {
      completionPoints += 8;
      tips.push({
        id: 'social',
        category: 'visibility',
        priority: 'medium',
        title: 'Link More Social Accounts',
        description: 'Add more social media handles to increase your visibility. Brands often look for multi-platform presence.',
        actionText: 'Add Social Accounts',
        actionUrl: '/athlete/profile/edit',
        estimatedImpact: '+40% brand inquiries',
      });
    } else {
      tips.push({
        id: 'social',
        category: 'visibility',
        priority: 'high',
        title: 'Connect Social Media',
        description: 'Link your Instagram, TikTok, or Twitter to showcase your reach. This is essential for social media deals.',
        actionText: 'Connect Accounts',
        actionUrl: '/athlete/profile/edit',
        estimatedImpact: '+150% deal opportunities',
      });
    }

    // Check follower count
    const followers = athlete.total_followers || 0;
    if (followers >= 10000) {
      completionPoints += 15;
      strengths.push(`Strong social presence (${(followers / 1000).toFixed(0)}K followers)`);
    } else if (followers >= 1000) {
      completionPoints += 10;
      tips.push({
        id: 'followers',
        category: 'engagement',
        priority: 'low',
        title: 'Grow Your Following',
        description: 'Post consistently and engage with your audience. Athletes with 10K+ followers get 2x more deal offers.',
        actionText: 'View Tips',
        estimatedImpact: '+100% earning potential',
      });
    } else {
      tips.push({
        id: 'followers',
        category: 'engagement',
        priority: 'medium',
        title: 'Build Your Social Following',
        description: 'Start building your social media presence. Share highlights, behind-the-scenes content, and engage with fans.',
        actionText: 'Learn More',
        estimatedImpact: 'Unlocks social media deals',
      });
    }

    // Check verifications
    const verifications = [
      { key: 'enrollment_verified', label: 'Enrollment' },
      { key: 'sport_verified', label: 'Sport' },
      { key: 'grades_verified', label: 'Grades' },
      { key: 'identity_verified', label: 'Identity' },
    ];

    const verifiedCount = verifications.filter(
      (v) => athlete[v.key as keyof Athlete]
    ).length;

    if (verifiedCount === 4) {
      completionPoints += 20;
      strengths.push('Fully verified athlete');
    } else if (verifiedCount >= 2) {
      completionPoints += verifiedCount * 5;
      const unverified = verifications
        .filter((v) => !athlete[v.key as keyof Athlete])
        .map((v) => v.label);

      tips.push({
        id: 'verification',
        category: 'verification',
        priority: 'high',
        title: 'Complete Verification',
        description: `Verify your ${unverified.join(' and ')} to unlock premium opportunities. Verified athletes earn 40% more on average.`,
        actionText: 'Request Verification',
        actionUrl: '/athlete/profile/verification',
        estimatedImpact: '+40% earnings',
      });
    } else {
      tips.push({
        id: 'verification',
        category: 'verification',
        priority: 'high',
        title: 'Get Verified',
        description: 'Submit verification requests for your enrollment, sport participation, and grades. This builds trust with brands.',
        actionText: 'Start Verification',
        actionUrl: '/athlete/profile/verification',
        estimatedImpact: 'Required for most deals',
      });
    }

    // Check GPA
    if (athlete.gpa && athlete.gpa >= 3.5) {
      completionPoints += 10;
      strengths.push(`Scholar athlete (${athlete.gpa.toFixed(2)} GPA)`);
    } else if (athlete.gpa && athlete.gpa >= 3.0) {
      completionPoints += 5;
    }

    // Check highlights
    const highlights = athlete.highlight_urls || [];
    if (highlights.length >= 3) {
      completionPoints += 15;
      strengths.push(`${highlights.length} highlight videos`);
    } else if (highlights.length > 0) {
      completionPoints += highlights.length * 3;
      tips.push({
        id: 'highlights',
        category: 'content',
        priority: 'medium',
        title: 'Add More Highlight Videos',
        description: `You have ${highlights.length} highlight video${highlights.length > 1 ? 's' : ''}. Athletes with 3+ highlights get 2x more brand attention.`,
        actionText: 'Add Highlights',
        actionUrl: '/athlete/profile/highlights',
        estimatedImpact: '+100% profile engagement',
      });
    } else {
      tips.push({
        id: 'highlights',
        category: 'content',
        priority: 'high',
        title: 'Add Highlight Videos',
        description: 'Upload YouTube or TikTok videos showing your best plays. This helps brands see your marketability.',
        actionText: 'Add Videos',
        actionUrl: '/athlete/profile/highlights',
        estimatedImpact: '+150% brand interest',
      });
    }

    // Calculate overall score
    const overallScore = Math.min(completionPoints, maxPoints);

    // Sort tips by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    tips.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return {
      data: {
        overallScore,
        tips,
        strengths,
        completionPercentage: Math.round((completionPoints / maxPoints) * 100),
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to analyze profile'),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Content Suggestion Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get content suggestions for deliverables
 */
export async function getContentSuggestions(
  platform: 'instagram' | 'tiktok' | 'twitter' | 'youtube',
  dealType: DealType,
  brandName: string,
  productCategory?: string
): Promise<ServiceResult<ContentSuggestion[]>> {
  try {
    const suggestions: ContentSuggestion[] = [];
    const _category = productCategory || 'product';

    // Platform-specific content ideas
    if (platform === 'instagram') {
      suggestions.push(
        {
          id: 'ig-1',
          platform: 'instagram',
          contentType: 'Reel',
          title: 'Day-in-the-Life Feature',
          description: `Create a Reel showing your training routine featuring ${brandName}. Show the product naturally in your day.`,
          hashtags: ['#NILAthlete', '#CollegeAthlete', `#${brandName.replace(/\s/g, '')}Partner`, '#TrainingDay'],
          bestTimeToPost: 'Weekdays 11am-1pm or 7-9pm',
          estimatedEngagement: 'high',
        },
        {
          id: 'ig-2',
          platform: 'instagram',
          contentType: 'Story Series',
          title: 'Behind-the-Scenes Unboxing',
          description: `Share an authentic unboxing of ${brandName} products with your reactions. Save to a highlight.`,
          hashtags: ['#Unboxing', '#PartnershipGoals', '#GiftedPartner'],
          bestTimeToPost: 'Weekends 10am-12pm',
          estimatedEngagement: 'medium',
        },
        {
          id: 'ig-3',
          platform: 'instagram',
          contentType: 'Carousel Post',
          title: 'Product Review Carousel',
          description: `Create a carousel with photos/videos reviewing ${brandName}. Include action shots and lifestyle images.`,
          hashtags: ['#HonestReview', '#AthleteLife', '#Sponsored'],
          bestTimeToPost: 'Tuesday-Thursday 6-8pm',
          estimatedEngagement: 'medium',
        }
      );
    }

    if (platform === 'tiktok') {
      suggestions.push(
        {
          id: 'tt-1',
          platform: 'tiktok',
          contentType: 'Trend Video',
          title: 'Trending Sound Integration',
          description: `Use a trending sound to showcase ${brandName} in your athletic life. Make it fun and authentic.`,
          hashtags: ['#NIL', '#CollegeAthlete', '#fyp', `#${brandName.replace(/\s/g, '')}`],
          bestTimeToPost: 'Evenings 7-10pm',
          estimatedEngagement: 'high',
        },
        {
          id: 'tt-2',
          platform: 'tiktok',
          contentType: 'Tutorial',
          title: 'Quick Tips Video',
          description: `Share tips related to your sport while naturally featuring ${brandName} products.`,
          hashtags: ['#Tips', '#AthleteSecrets', '#LearnOnTikTok'],
          bestTimeToPost: 'Weekdays 5-7pm',
          estimatedEngagement: 'medium',
        },
        {
          id: 'tt-3',
          platform: 'tiktok',
          contentType: 'Challenge',
          title: 'Brand Challenge',
          description: `Create a fun challenge featuring ${brandName} that your followers can participate in.`,
          hashtags: ['#Challenge', '#DuetThis', '#fyp'],
          bestTimeToPost: 'Saturdays 12-3pm',
          estimatedEngagement: 'high',
        }
      );
    }

    if (platform === 'twitter') {
      suggestions.push(
        {
          id: 'tw-1',
          platform: 'twitter',
          contentType: 'Thread',
          title: 'Story Thread',
          description: `Share a thread about your journey with ${brandName} - what the partnership means to you.`,
          hashtags: ['#NIL', '#StudentAthlete', `#${brandName.replace(/\s/g, '')}`],
          bestTimeToPost: 'Weekdays 9am or 5pm',
          estimatedEngagement: 'medium',
        },
        {
          id: 'tw-2',
          platform: 'twitter',
          contentType: 'Photo + Quote',
          title: 'Game Day Post',
          description: `Share a photo on game day featuring ${brandName} with an inspiring quote or message.`,
          hashtags: ['#GameDay', '#CollegeSports'],
          bestTimeToPost: 'Game days - 2hrs before',
          estimatedEngagement: 'high',
        }
      );
    }

    if (platform === 'youtube') {
      suggestions.push(
        {
          id: 'yt-1',
          platform: 'youtube',
          contentType: 'Vlog',
          title: 'Week in My Life Vlog',
          description: `Create a vlog showing your week with ${brandName} products naturally integrated into your routine.`,
          hashtags: ['#CollegeAthlete', '#DayInMyLife', '#NIL'],
          bestTimeToPost: 'Sundays 4-6pm',
          estimatedEngagement: 'medium',
        },
        {
          id: 'yt-2',
          platform: 'youtube',
          contentType: 'Review',
          title: 'Honest Review Video',
          description: `Film an in-depth review of ${brandName} products. Show real use cases in training.`,
          hashtags: ['#ProductReview', '#AthleteGear', '#Honest'],
          bestTimeToPost: 'Thursdays 3-5pm',
          estimatedEngagement: 'medium',
        },
        {
          id: 'yt-3',
          platform: 'youtube',
          contentType: 'Short',
          title: 'Quick Highlight Short',
          description: `Create a YouTube Short with your best plays/moments featuring ${brandName}.`,
          hashtags: ['#Shorts', '#Highlights', '#CollegeSports'],
          bestTimeToPost: 'Any day 12-3pm',
          estimatedEngagement: 'high',
        }
      );
    }

    return {
      data: suggestions,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to get content suggestions'),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Format a price range for display
 */
export function formatPriceRange(priceRange: { min: number; max: number }): string {
  return `$${priceRange.min.toLocaleString()} - $${priceRange.max.toLocaleString()}`;
}

/**
 * Get confidence level color
 */
export function getConfidenceColor(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high':
      return 'text-green-500';
    case 'medium':
      return 'text-yellow-500';
    case 'low':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}

/**
 * Get priority badge variant
 */
export function getPriorityVariant(priority: 'high' | 'medium' | 'low'): 'danger' | 'warning' | 'info' {
  switch (priority) {
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    case 'low':
      return 'info';
    default:
      return 'info';
  }
}
