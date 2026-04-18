import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { DealType } from '@/types';
import { enforceRateLimit } from '@/lib/rate-limit';

// ═══════════════════════════════════════════════════════════════════════════
// Type Definitions & Validation Schemas
// ═══════════════════════════════════════════════════════════════════════════

const pricingSuggestionSchema = z.object({
  type: z.literal('pricing'),
  dealType: z.enum(['social_post', 'appearance', 'endorsement', 'autograph', 'camp', 'merchandise', 'other']),
  athleteFollowers: z.number().min(0),
  athleteGpa: z.number().min(0).max(4),
  athleteSport: z.string(),
  athleteDivision: z.string().optional(),
  deliverables: z.string().optional(),
  duration: z.string().optional(),
});

const athleteMatchSchema = z.object({
  type: z.literal('athlete-match'),
  campaignGoals: z.array(z.string()),
  targetAudience: z.string().optional(),
  budget: z.number().min(0),
  preferredSports: z.array(z.string()).optional(),
  preferredDivisions: z.array(z.string()).optional(),
  minGpa: z.number().min(0).max(4).optional(),
  minFollowers: z.number().min(0).optional(),
  dealType: z.enum(['social_post', 'appearance', 'endorsement', 'autograph', 'camp', 'merchandise', 'other']),
});

const profileAnalysisSchema = z.object({
  type: z.literal('profile-analysis'),
  athleteId: z.string().uuid(),
});

const contentSuggestionSchema = z.object({
  type: z.literal('content'),
  platform: z.enum(['instagram', 'tiktok', 'twitter', 'youtube']),
  dealType: z.enum(['social_post', 'appearance', 'endorsement', 'autograph', 'camp', 'merchandise', 'other']),
  brandName: z.string(),
  productCategory: z.string().optional(),
});

const suggestionRequestSchema = z.discriminatedUnion('type', [
  pricingSuggestionSchema,
  athleteMatchSchema,
  profileAnalysisSchema,
  contentSuggestionSchema,
]);

// ═══════════════════════════════════════════════════════════════════════════
// Constants & Configuration (same as client-side service)
// ═══════════════════════════════════════════════════════════════════════════

const DEAL_TYPE_BASE_RATES: Record<DealType, number> = {
  social_post: 50,
  appearance: 500,
  endorsement: 1000,
  autograph: 100,
  camp: 300,
  merchandise: 200,
  other: 150,
};

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

const DIVISION_MULTIPLIERS: Record<string, number> = {
  D1: 1.5,
  D2: 1.2,
  D3: 1.0,
  NAIA: 0.9,
  JUCO: 0.8,
  other: 0.8,
};

const GPA_BONUSES = [
  { threshold: 3.9, bonus: 1.3 },
  { threshold: 3.5, bonus: 1.15 },
  { threshold: 3.0, bonus: 1.0 },
  { threshold: 0, bonus: 0.9 },
];

// ═══════════════════════════════════════════════════════════════════════════
// Pricing Calculation Functions
// ═══════════════════════════════════════════════════════════════════════════

interface PricingInput {
  dealType: DealType;
  athleteFollowers: number;
  athleteGpa: number;
  athleteSport: string;
  athleteDivision?: string;
  deliverables?: string;
}

interface PricingFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  weight: number;
}

function calculatePricing(input: PricingInput) {
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

  // Calculate confidence
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

  const suggestedPrice = Math.round(basePrice / 25) * 25;
  const variance = confidence === 'high' ? 0.15 : confidence === 'medium' ? 0.25 : 0.35;

  const topFactors = factors
    .filter((f) => f.impact === 'positive')
    .slice(0, 2)
    .map((f) => f.name.toLowerCase());

  const reasoning = topFactors.length > 0
    ? `Based on ${topFactors.join(' and ')}, this athlete commands strong market value for ${input.dealType.replace('_', ' ')} deals.`
    : `Standard market rate for ${input.dealType.replace('_', ' ')} deals with similar athlete profiles.`;

  return {
    suggestedPrice,
    priceRange: {
      min: Math.round((suggestedPrice * (1 - variance)) / 25) * 25,
      max: Math.round((suggestedPrice * (1 + variance)) / 25) * 25,
    },
    confidence,
    reasoning,
    factors,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// API Route Handler
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await enforceRateLimit(request, 'ai', user.id);
    if (rateLimited) return rateLimited;

    // Parse and validate request body
    const body = await request.json();
    const parseResult = suggestionRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const requestData = parseResult.data;

    // Handle different suggestion types
    switch (requestData.type) {
      case 'pricing': {
        const pricing = calculatePricing({
          dealType: requestData.dealType,
          athleteFollowers: requestData.athleteFollowers,
          athleteGpa: requestData.athleteGpa,
          athleteSport: requestData.athleteSport,
          athleteDivision: requestData.athleteDivision,
          deliverables: requestData.deliverables,
        });

        return NextResponse.json({
          success: true,
          data: pricing,
        });
      }

      case 'athlete-match': {
        // Fetch athletes from database based on criteria
        let query = supabase
          .from('athletes')
          .select(`
            id,
            profile_id,
            first_name,
            last_name,
            gpa,
            total_followers,
            bio,
            avatar_url,
            enrollment_verified,
            sport_verified,
            grades_verified,
            identity_verified,
            school:schools(id, name, division),
            sport:sports(id, name)
          `)
          .eq('is_searchable', true)
          .limit(50);

        // Apply filters
        if (requestData.minGpa) {
          query = query.gte('gpa', requestData.minGpa);
        }

        if (requestData.minFollowers) {
          query = query.gte('total_followers', requestData.minFollowers);
        }

        const { data: athletes, error: athletesError } = await query;

        if (athletesError) {
          return NextResponse.json(
            { error: 'Failed to fetch athletes', details: athletesError.message },
            { status: 500 }
          );
        }

        // Calculate match scores for each athlete
        const matches = (athletes || []).map((athlete) => {
          let score = 50;
          const reasons: string[] = [];

          // Handle Supabase relation arrays - extract single objects
          const sport = Array.isArray(athlete.sport) ? athlete.sport[0] : athlete.sport;
          const school = Array.isArray(athlete.school) ? athlete.school[0] : athlete.school;

          // Sport match
          if (requestData.preferredSports && requestData.preferredSports.length > 0) {
            const sportMatch = requestData.preferredSports.some(
              (s) => s.toLowerCase() === sport?.name?.toLowerCase()
            );
            if (sportMatch) {
              score += 20;
              reasons.push(`Plays ${sport?.name}`);
            }
          }

          // Division match
          if (requestData.preferredDivisions && requestData.preferredDivisions.length > 0) {
            const divisionMatch = requestData.preferredDivisions.some(
              (d) => d === school?.division
            );
            if (divisionMatch) {
              score += 15;
              reasons.push(`${school?.division} athlete`);
            }
          }

          // GPA check
          if (requestData.minGpa && athlete.gpa && athlete.gpa >= requestData.minGpa) {
            score += 15;
            if (athlete.gpa >= 3.5) {
              reasons.push(`Scholar athlete (${athlete.gpa} GPA)`);
            }
          }

          // Followers check
          const followers = athlete.total_followers || 0;
          if (followers >= 50000) {
            score += 10;
            reasons.push(`Large following (${(followers / 1000).toFixed(0)}K)`);
          }

          // Verification bonus
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

          // Calculate estimated cost
          const pricing = calculatePricing({
            dealType: requestData.dealType,
            athleteFollowers: followers,
            athleteGpa: athlete.gpa || 0,
            athleteSport: sport?.name || 'other',
            athleteDivision: school?.division,
          });

          return {
            athleteId: athlete.id,
            athlete: {
              id: athlete.id,
              profile_id: athlete.profile_id,
              first_name: athlete.first_name,
              last_name: athlete.last_name,
              gpa: athlete.gpa,
              total_followers: athlete.total_followers,
              avatar_url: athlete.avatar_url,
              school: school,
              sport: sport,
            },
            matchScore: Math.max(0, Math.min(100, score)),
            matchReasons: reasons,
            estimatedCost: pricing.suggestedPrice,
            potentialReach: followers * 0.1,
          };
        });

        // Sort by match score
        matches.sort((a, b) => b.matchScore - a.matchScore);

        // Calculate budget analysis
        const affordableAthletes = matches.filter((m) => m.estimatedCost <= requestData.budget);
        const averageCost = matches.length > 0
          ? matches.reduce((sum, m) => sum + m.estimatedCost, 0) / matches.length
          : 0;

        // Generate insights
        const insights: string[] = [];
        if (affordableAthletes.length === 0) {
          insights.push(
            `Your budget of $${requestData.budget.toLocaleString()} may need to be increased. The average athlete cost is $${Math.round(averageCost).toLocaleString()}.`
          );
        } else if (affordableAthletes.length >= 5) {
          insights.push(
            `Great budget! You can afford ${affordableAthletes.length} athletes within your $${requestData.budget.toLocaleString()} budget.`
          );
        }

        const topMatches = matches.slice(0, 3);
        if (topMatches.length > 0 && topMatches[0].matchScore >= 80) {
          insights.push(
            `Strong matches found! ${topMatches.filter((m) => m.matchScore >= 80).length} athletes have 80%+ compatibility with your campaign.`
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            matches: matches.slice(0, 20),
            insights,
            budgetAnalysis: {
              canAfford: affordableAthletes.length,
              averageCost: Math.round(averageCost),
              recommendedCount: Math.min(3, affordableAthletes.length),
            },
          },
        });
      }

      case 'profile-analysis': {
        // Fetch the athlete profile
        const { data: athlete, error: athleteError } = await supabase
          .from('athletes')
          .select(`
            *,
            school:schools(*),
            sport:sports(*)
          `)
          .eq('id', requestData.athleteId)
          .single();

        if (athleteError) {
          return NextResponse.json(
            { error: 'Athlete not found', details: athleteError.message },
            { status: 404 }
          );
        }

        // Analyze profile (same logic as client-side)
        const tips: Array<{
          id: string;
          category: string;
          priority: 'high' | 'medium' | 'low';
          title: string;
          description: string;
          actionText: string;
          actionUrl?: string;
          estimatedImpact: string;
        }> = [];
        const strengths: string[] = [];
        let completionPoints = 0;

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
            description: 'Profiles with photos get 3x more views from brands.',
            actionText: 'Upload Photo',
            actionUrl: '/athlete/profile/edit',
            estimatedImpact: '+300% profile views',
          });
        }

        // Check bio
        if (athlete.bio && athlete.bio.length >= 100) {
          completionPoints += 15;
          strengths.push('Detailed bio');
        } else {
          tips.push({
            id: 'bio',
            category: 'completeness',
            priority: athlete.bio ? 'medium' : 'high',
            title: athlete.bio ? 'Expand Your Bio' : 'Add a Bio',
            description: 'Tell brands about yourself and your achievements.',
            actionText: athlete.bio ? 'Edit Bio' : 'Add Bio',
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
        } else {
          tips.push({
            id: 'social',
            category: 'visibility',
            priority: socialHandles === 0 ? 'high' : 'medium',
            title: socialHandles === 0 ? 'Connect Social Media' : 'Link More Social Accounts',
            description: 'Link your social media to showcase your reach.',
            actionText: 'Connect Accounts',
            actionUrl: '/athlete/profile/edit',
            estimatedImpact: '+150% deal opportunities',
          });
        }

        // Check followers
        const followers = athlete.total_followers || 0;
        if (followers >= 10000) {
          completionPoints += 15;
          strengths.push(`Strong social presence (${(followers / 1000).toFixed(0)}K followers)`);
        }

        // Check verifications
        const verificationCount = [
          athlete.enrollment_verified,
          athlete.sport_verified,
          athlete.grades_verified,
          athlete.identity_verified,
        ].filter(Boolean).length;

        if (verificationCount === 4) {
          completionPoints += 20;
          strengths.push('Fully verified athlete');
        } else if (verificationCount < 3) {
          tips.push({
            id: 'verification',
            category: 'verification',
            priority: 'high',
            title: verificationCount === 0 ? 'Get Verified' : 'Complete Verification',
            description: 'Verified athletes earn 40% more on average.',
            actionText: 'Request Verification',
            actionUrl: '/athlete/profile/verification',
            estimatedImpact: '+40% earnings',
          });
        }

        // Check GPA
        if (athlete.gpa && athlete.gpa >= 3.5) {
          completionPoints += 10;
          strengths.push(`Scholar athlete (${athlete.gpa.toFixed(2)} GPA)`);
        }

        // Check highlights
        const highlights = athlete.highlight_urls || [];
        if (highlights.length >= 3) {
          completionPoints += 15;
          strengths.push(`${highlights.length} highlight videos`);
        } else {
          tips.push({
            id: 'highlights',
            category: 'content',
            priority: highlights.length === 0 ? 'high' : 'medium',
            title: highlights.length === 0 ? 'Add Highlight Videos' : 'Add More Highlight Videos',
            description: 'Upload videos showing your best plays.',
            actionText: 'Add Videos',
            actionUrl: '/athlete/profile/highlights',
            estimatedImpact: '+150% brand interest',
          });
        }

        const overallScore = Math.min(completionPoints, 100);

        return NextResponse.json({
          success: true,
          data: {
            overallScore,
            tips,
            strengths,
            completionPercentage: Math.round((completionPoints / 100) * 100),
          },
        });
      }

      case 'content': {
        // Generate content suggestions based on platform and deal type
        const suggestions = [];
        const platform = requestData.platform;
        const brandName = requestData.brandName;

        if (platform === 'instagram') {
          suggestions.push(
            {
              id: 'ig-1',
              platform: 'instagram',
              contentType: 'Reel',
              title: 'Day-in-the-Life Feature',
              description: `Create a Reel showing your training routine featuring ${brandName}.`,
              hashtags: ['#NILAthlete', '#CollegeAthlete', `#${brandName.replace(/\s/g, '')}Partner`],
              bestTimeToPost: 'Weekdays 11am-1pm or 7-9pm',
              estimatedEngagement: 'high',
            },
            {
              id: 'ig-2',
              platform: 'instagram',
              contentType: 'Story Series',
              title: 'Behind-the-Scenes Unboxing',
              description: `Share an authentic unboxing of ${brandName} products.`,
              hashtags: ['#Unboxing', '#PartnershipGoals', '#GiftedPartner'],
              bestTimeToPost: 'Weekends 10am-12pm',
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
              description: `Use a trending sound to showcase ${brandName} in your athletic life.`,
              hashtags: ['#NIL', '#CollegeAthlete', '#fyp'],
              bestTimeToPost: 'Evenings 7-10pm',
              estimatedEngagement: 'high',
            },
            {
              id: 'tt-2',
              platform: 'tiktok',
              contentType: 'Tutorial',
              title: 'Quick Tips Video',
              description: `Share tips related to your sport while featuring ${brandName}.`,
              hashtags: ['#Tips', '#AthleteSecrets', '#LearnOnTikTok'],
              bestTimeToPost: 'Weekdays 5-7pm',
              estimatedEngagement: 'medium',
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
              description: `Share a thread about your journey with ${brandName}.`,
              hashtags: ['#NIL', '#StudentAthlete'],
              bestTimeToPost: 'Weekdays 9am or 5pm',
              estimatedEngagement: 'medium',
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
              description: `Create a vlog with ${brandName} products integrated naturally.`,
              hashtags: ['#CollegeAthlete', '#DayInMyLife', '#NIL'],
              bestTimeToPost: 'Sundays 4-6pm',
              estimatedEngagement: 'medium',
            },
            {
              id: 'yt-2',
              platform: 'youtube',
              contentType: 'Short',
              title: 'Quick Highlight Short',
              description: `Create a YouTube Short with your best plays featuring ${brandName}.`,
              hashtags: ['#Shorts', '#Highlights', '#CollegeSports'],
              bestTimeToPost: 'Any day 12-3pm',
              estimatedEngagement: 'high',
            }
          );
        }

        return NextResponse.json({
          success: true,
          data: suggestions,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid suggestion type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('AI suggestions API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET endpoint for simple queries
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await enforceRateLimit(request, 'ai', user.id);
    if (rateLimited) return rateLimited;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'pricing-ranges') {
      // Return base pricing ranges for reference
      return NextResponse.json({
        success: true,
        data: {
          dealTypes: DEAL_TYPE_BASE_RATES,
          sportMultipliers: SPORT_MULTIPLIERS,
          divisionMultipliers: DIVISION_MULTIPLIERS,
          gpaBonuses: GPA_BONUSES,
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid type parameter. Use: pricing-ranges' },
      { status: 400 }
    );
  } catch (error) {
    console.error('AI suggestions API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
