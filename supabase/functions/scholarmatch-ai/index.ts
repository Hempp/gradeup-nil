import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase.ts';

/**
 * ScholarMatch AI Agent Edge Function
 *
 * A comprehensive AI advisor for college athletes on the GradeUp NIL platform.
 * Provides intelligent recommendations for deal analysis, brand matching,
 * scheduling, career guidance, and general NIL Q&A.
 *
 * Capabilities:
 * 1. Deal Analysis - Analyze offers, compare against typical rates, flag issues
 * 2. Brand Matching - Recommend brands based on major, interests, values
 * 3. Scheduling Intelligence - Suggest optimal times avoiding academic conflicts
 * 4. Career Guidance - Tips for improving GradeUp Score and earnings
 * 5. General NIL Q&A - Rules, compliance, tax guidance
 */

// =============================================================================
// TYPES
// =============================================================================

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AIRequest {
  action: 'chat' | 'analyze_deal' | 'recommend_brands' | 'schedule_advice' | 'score_tips' | 'career_guidance';
  athlete_id: string;
  message?: string;
  deal_id?: string;
  brand_id?: string;
  context?: Record<string, unknown>;
  conversation_history?: ChatMessage[];
}

interface AIResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  suggestions?: string[];
  action_items?: ActionItem[];
  confidence?: number;
}

interface ActionItem {
  type: 'accept' | 'negotiate' | 'decline' | 'schedule' | 'research' | 'improve';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

interface AthleteContext {
  id: string;
  profile: {
    first_name: string;
    last_name: string;
    email: string;
  };
  school: { name: string; short_name: string; division: string } | null;
  sport: { name: string; category: string } | null;
  major_category: { name: string; industries: string[] } | null;
  major: string | null;
  gpa: number | null;
  cumulative_gpa: number | null;
  academic_year: string | null;
  gradeup_score: number;
  total_followers: number;
  instagram_followers: number;
  twitter_followers: number;
  tiktok_followers: number;
  total_earnings: number;
  deals_completed: number;
  avg_deal_rating: number;
  nil_valuation: number;
  scholar_tier: string | null;
  enrollment_verified: boolean;
  sport_verified: boolean;
  grades_verified: boolean;
  accepting_deals: boolean;
  min_deal_amount: number | null;
  academic_records: Array<{
    gpa: number;
    semester: string;
    year: number;
    deans_list: boolean;
  }>;
  deals: Array<{
    id: string;
    title: string;
    amount: number;
    status: string;
    deal_type: string;
    brand: { company_name: string; industry: string } | null;
    start_date: string | null;
    end_date: string | null;
  }>;
  availability: {
    blocked_periods: Array<{ start_date: string; end_date: string; name: string }>;
    max_deals_per_month: number;
    no_finals_deals: boolean;
    no_midterms_deals: boolean;
    preferred_deal_days: string[];
    min_notice_days: number;
    max_hours_per_week: number;
  } | null;
  blocked_periods: Array<{
    period_type: string;
    name: string;
    start_date: string;
    end_date: string;
    source: string;
  }>;
}

interface DealContext {
  id: string;
  title: string;
  description: string;
  deal_type: string;
  amount: number;
  status: string;
  payment_terms: string | null;
  deliverables: Array<{ type: string; description: string; deadline: string }> | null;
  start_date: string | null;
  end_date: string | null;
  brand: {
    company_name: string;
    industry: string;
    is_verified: boolean;
    total_spent: number;
    deals_completed: number;
    avg_deal_rating: number;
  } | null;
  opportunity: {
    title: string;
    compensation_type: string;
    min_gpa: number | null;
    min_followers: number | null;
  } | null;
}

interface BrandRecommendation {
  brand_id: string;
  company_name: string;
  industry: string;
  match_score: number;
  match_reasons: string[];
  potential_deal_value: { min: number; max: number };
  is_verified: boolean;
}

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

const SYSTEM_PROMPTS = {
  general: `You are ScholarMatch, an AI advisor for college athletes on the GradeUp NIL platform.

Your role is to help student-athletes navigate NIL (Name, Image, and Likeness) opportunities while maintaining their academic excellence. You prioritize:

1. Academic Success - Always encourage maintaining GPA and academic standing
2. Smart Business Decisions - Help athletes make informed choices about deals
3. NCAA Compliance - Ensure all advice follows current NIL regulations
4. Long-term Career Building - Focus on building sustainable personal brands
5. Work-Life Balance - Help athletes balance NIL activities with academics and sports

You speak in a friendly, professional tone that resonates with college students. You're knowledgeable about NIL rules, tax implications, and brand partnerships.

Key Facts:
- NIL became legal nationwide in July 2021
- Athletes can profit from their name, image, and likeness
- Pay-for-play (paying athletes for athletic performance) is still prohibited
- Athletes must disclose NIL deals to their schools
- State laws and school policies may have additional requirements`,

  deal_analysis: `You are analyzing an NIL deal for a college athlete. Evaluate the deal considering:

1. Fair Market Value - Is the compensation appropriate for the deliverables?
2. Time Commitment - Is it reasonable given their academic and athletic schedule?
3. Brand Alignment - Does the brand fit the athlete's values and image?
4. Contract Terms - Are there any red flags or concerning clauses?
5. Long-term Impact - Will this deal benefit their career trajectory?

Provide clear, actionable advice with specific reasons for your recommendations.`,

  brand_matching: `You are recommending brand partnerships based on an athlete's profile. Consider:

1. Major/Industry Alignment - Brands in related industries are more authentic
2. Values Match - Brands that share the athlete's values
3. Target Audience - Brands whose audience overlaps with the athlete's followers
4. Deal History - What types of deals have been successful for similar athletes
5. Growth Potential - Brands that could lead to long-term partnerships

Explain WHY each brand is a good match to help athletes make informed decisions.`,

  scheduling: `You are advising on NIL deal timing for a college athlete. Consider:

1. Academic Calendar - Avoid finals, midterms, and heavy coursework periods
2. Athletic Season - Consider game schedules and training intensity
3. Deal Pacing - Don't overcommit; quality over quantity
4. Recovery Time - Leave buffer between deal activities
5. Personal Time - Athletes need rest and social time too

Help athletes maintain balance while maximizing their NIL potential.`,

  career_guidance: `You are providing career guidance to help athletes improve their GradeUp Score and NIL potential. Focus on:

1. GPA Improvement - Specific, actionable academic advice
2. Social Media Growth - Authentic content strategies
3. Personal Branding - Building a memorable, marketable identity
4. Deal Selection - Choosing deals that build long-term value
5. Skill Development - Soft skills that make athletes more marketable

Be encouraging but realistic. Help athletes see the connection between academics and NIL success.`,

  compliance: `You are explaining NIL compliance rules. Key points:

1. NCAA Rules - Athletes can earn NIL income without affecting eligibility
2. Disclosure - Athletes must report NIL activities to their school
3. Prohibited Activities - No pay-for-play, no use of school marks without permission
4. State Laws - Vary by state; athletes should know their state's specific rules
5. Tax Obligations - NIL income is taxable; athletes should track expenses

Always recommend consulting with the school's compliance office for specific situations.`,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get comprehensive athlete context from database
 */
async function getAthleteContext(
  adminClient: ReturnType<typeof createAdminClient>,
  athleteId: string
): Promise<AthleteContext | null> {
  // Get athlete with all related data
  const { data: athlete, error } = await adminClient
    .from('athletes')
    .select(`
      *,
      profile:profiles!inner(first_name, last_name, email),
      school:schools(name, short_name, division),
      sport:sports(name, category),
      major_category:major_categories(name, industries)
    `)
    .eq('id', athleteId)
    .single();

  if (error || !athlete) {
    return null;
  }

  // Get academic records
  const { data: academicRecords } = await adminClient
    .from('academic_records')
    .select('gpa, semester, year, deans_list')
    .eq('athlete_id', athleteId)
    .order('year', { ascending: false })
    .order('semester', { ascending: false })
    .limit(8);

  // Get recent deals
  const { data: deals } = await adminClient
    .from('deals')
    .select(`
      id, title, amount, status, deal_type, start_date, end_date,
      brand:brands(company_name, industry)
    `)
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get availability preferences
  const { data: availability } = await adminClient
    .from('athlete_availability')
    .select('*')
    .eq('athlete_id', athleteId)
    .single();

  // Get blocked periods (academic calendar + custom)
  const { data: blockedPeriods } = await adminClient
    .rpc('get_athlete_blocked_periods', {
      p_athlete_id: athleteId,
      p_start_date: new Date().toISOString().split('T')[0],
      p_end_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });

  return {
    id: athlete.id,
    profile: athlete.profile,
    school: athlete.school,
    sport: athlete.sport,
    major_category: athlete.major_category,
    major: athlete.major,
    gpa: athlete.gpa,
    cumulative_gpa: athlete.cumulative_gpa,
    academic_year: athlete.academic_year,
    gradeup_score: athlete.gradeup_score || 0,
    total_followers: athlete.total_followers || 0,
    instagram_followers: athlete.instagram_followers || 0,
    twitter_followers: athlete.twitter_followers || 0,
    tiktok_followers: athlete.tiktok_followers || 0,
    total_earnings: athlete.total_earnings || 0,
    deals_completed: athlete.deals_completed || 0,
    avg_deal_rating: athlete.avg_deal_rating || 0,
    nil_valuation: athlete.nil_valuation || 0,
    scholar_tier: athlete.scholar_tier,
    enrollment_verified: athlete.enrollment_verified || false,
    sport_verified: athlete.sport_verified || false,
    grades_verified: athlete.grades_verified || false,
    accepting_deals: athlete.accepting_deals !== false,
    min_deal_amount: athlete.min_deal_amount,
    academic_records: academicRecords || [],
    deals: deals || [],
    availability: availability ? {
      blocked_periods: availability.blocked_periods || [],
      max_deals_per_month: availability.max_deals_per_month || 5,
      no_finals_deals: availability.no_finals_deals !== false,
      no_midterms_deals: availability.no_midterms_deals !== false,
      preferred_deal_days: availability.preferred_deal_days || ['friday', 'saturday', 'sunday'],
      min_notice_days: availability.min_notice_days || 3,
      max_hours_per_week: availability.max_hours_per_week || 10,
    } : null,
    blocked_periods: blockedPeriods || [],
  };
}

/**
 * Get deal context from database
 */
async function getDealContext(
  adminClient: ReturnType<typeof createAdminClient>,
  dealId: string
): Promise<DealContext | null> {
  const { data: deal, error } = await adminClient
    .from('deals')
    .select(`
      *,
      brand:brands(company_name, industry, is_verified, total_spent, deals_completed, avg_deal_rating),
      opportunity:opportunities(title, compensation_type, min_gpa, min_followers)
    `)
    .eq('id', dealId)
    .single();

  if (error || !deal) {
    return null;
  }

  return {
    id: deal.id,
    title: deal.title,
    description: deal.description,
    deal_type: deal.deal_type,
    amount: deal.amount,
    status: deal.status,
    payment_terms: deal.payment_terms,
    deliverables: deal.deliverables as DealContext['deliverables'],
    start_date: deal.start_date,
    end_date: deal.end_date,
    brand: deal.brand,
    opportunity: deal.opportunity,
  };
}

/**
 * Calculate fair market value for a deal based on athlete metrics
 */
function calculateFairMarketValue(athlete: AthleteContext, dealType: string): { min: number; max: number; typical: number } {
  const baseRates: Record<string, { base: number; followerMultiplier: number; gpaBonus: number }> = {
    social_post: { base: 50, followerMultiplier: 0.001, gpaBonus: 50 },
    appearance: { base: 200, followerMultiplier: 0.002, gpaBonus: 100 },
    endorsement: { base: 500, followerMultiplier: 0.005, gpaBonus: 200 },
    autograph: { base: 25, followerMultiplier: 0.0005, gpaBonus: 25 },
    camp: { base: 150, followerMultiplier: 0.001, gpaBonus: 75 },
    merchandise: { base: 100, followerMultiplier: 0.002, gpaBonus: 100 },
    other: { base: 100, followerMultiplier: 0.001, gpaBonus: 50 },
  };

  const rates = baseRates[dealType] || baseRates.other;

  // Base calculation
  let typical = rates.base + (athlete.total_followers * rates.followerMultiplier);

  // GPA bonus (3.5+ GPA gets bonus)
  const gpa = athlete.cumulative_gpa || athlete.gpa || 0;
  if (gpa >= 3.5) {
    typical += rates.gpaBonus * (gpa / 4.0);
  }

  // Scholar tier bonus
  const tierMultipliers: Record<string, number> = {
    platinum: 1.5,
    gold: 1.3,
    silver: 1.15,
    bronze: 1.05,
  };
  if (athlete.scholar_tier) {
    typical *= tierMultipliers[athlete.scholar_tier] || 1;
  }

  // Sport premium (major revenue sports)
  const premiumSports = ['football', 'mens basketball', 'womens basketball'];
  if (athlete.sport?.name && premiumSports.includes(athlete.sport.name.toLowerCase())) {
    typical *= 1.25;
  }

  // Verification bonus
  if (athlete.enrollment_verified && athlete.sport_verified && athlete.grades_verified) {
    typical *= 1.1;
  }

  // Deal experience adjustment
  if (athlete.deals_completed >= 10) {
    typical *= 1.15;
  } else if (athlete.deals_completed >= 5) {
    typical *= 1.05;
  }

  typical = Math.round(typical);

  return {
    min: Math.round(typical * 0.7),
    max: Math.round(typical * 1.4),
    typical,
  };
}

/**
 * Analyze a deal and provide recommendations
 */
function analyzeDealOffer(athlete: AthleteContext, deal: DealContext): {
  recommendation: 'accept' | 'negotiate' | 'decline' | 'review';
  score: number;
  analysis: {
    compensation: { score: number; analysis: string };
    timing: { score: number; analysis: string };
    brand: { score: number; analysis: string };
    workload: { score: number; analysis: string };
    overall: string;
  };
  suggestedCounterOffer: number | null;
  redFlags: string[];
  greenFlags: string[];
} {
  const fairValue = calculateFairMarketValue(athlete, deal.deal_type);
  const redFlags: string[] = [];
  const greenFlags: string[] = [];

  // Compensation analysis
  let compensationScore = 50;
  let compensationAnalysis = '';

  if (deal.amount >= fairValue.typical) {
    compensationScore = 80 + Math.min(20, ((deal.amount - fairValue.typical) / fairValue.typical) * 50);
    compensationAnalysis = `The offer of $${deal.amount.toLocaleString()} is ${deal.amount > fairValue.typical ? 'above' : 'at'} your typical rate of $${fairValue.typical.toLocaleString()}.`;
    greenFlags.push('Compensation meets or exceeds market rate');
  } else if (deal.amount >= fairValue.min) {
    compensationScore = 40 + ((deal.amount - fairValue.min) / (fairValue.typical - fairValue.min)) * 40;
    compensationAnalysis = `The offer of $${deal.amount.toLocaleString()} is below your typical rate of $${fairValue.typical.toLocaleString()}, but within acceptable range.`;
  } else {
    compensationScore = Math.max(10, (deal.amount / fairValue.min) * 40);
    compensationAnalysis = `The offer of $${deal.amount.toLocaleString()} is significantly below your minimum expected rate of $${fairValue.min.toLocaleString()}.`;
    redFlags.push('Compensation below market rate');
  }

  // Timing analysis
  let timingScore = 70;
  let timingAnalysis = 'Timing appears suitable based on your schedule.';

  if (deal.start_date) {
    const dealDate = new Date(deal.start_date);
    const isBlocked = athlete.blocked_periods.some(period => {
      const start = new Date(period.start_date);
      const end = new Date(period.end_date);
      return dealDate >= start && dealDate <= end;
    });

    if (isBlocked) {
      timingScore = 20;
      timingAnalysis = 'This deal conflicts with a blocked period (finals, midterms, or custom block).';
      redFlags.push('Conflicts with blocked period');
    }

    // Check notice period
    const daysUntilDeal = Math.ceil((dealDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const minNotice = athlete.availability?.min_notice_days || 3;

    if (daysUntilDeal < minNotice) {
      timingScore = Math.max(timingScore - 30, 10);
      timingAnalysis += ` Short notice (${daysUntilDeal} days vs your ${minNotice}-day minimum).`;
      redFlags.push('Insufficient notice period');
    }
  }

  // Brand analysis
  let brandScore = 50;
  let brandAnalysis = 'No brand verification data available.';

  if (deal.brand) {
    if (deal.brand.is_verified) {
      brandScore += 20;
      greenFlags.push('Brand is verified on GradeUp');
    }

    if (deal.brand.deals_completed >= 10) {
      brandScore += 15;
      greenFlags.push('Brand has extensive deal history');
    }

    if (deal.brand.avg_deal_rating >= 4.5) {
      brandScore += 15;
      greenFlags.push('Brand has excellent athlete ratings');
    } else if (deal.brand.avg_deal_rating >= 4.0) {
      brandScore += 10;
    } else if (deal.brand.avg_deal_rating > 0 && deal.brand.avg_deal_rating < 3.5) {
      brandScore -= 20;
      redFlags.push('Brand has below-average athlete ratings');
    }

    // Industry match with major
    if (athlete.major_category?.industries && deal.brand.industry) {
      const industries = athlete.major_category.industries.map(i => i.toLowerCase());
      if (industries.includes(deal.brand.industry.toLowerCase())) {
        brandScore += 15;
        greenFlags.push('Brand industry aligns with your major');
      }
    }

    brandAnalysis = `${deal.brand.company_name} is ${deal.brand.is_verified ? 'verified' : 'not yet verified'} with ${deal.brand.deals_completed} completed deals and a ${deal.brand.avg_deal_rating.toFixed(1)} average rating.`;
  }

  // Workload analysis
  let workloadScore = 70;
  let workloadAnalysis = 'Workload appears manageable.';

  // Check current deal count this month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const dealsThisMonth = athlete.deals.filter(d => {
    if (d.status !== 'active' && d.status !== 'accepted') return false;
    if (!d.start_date) return false;
    const date = new Date(d.start_date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  }).length;

  const maxDeals = athlete.availability?.max_deals_per_month || 5;
  if (dealsThisMonth >= maxDeals) {
    workloadScore = 30;
    workloadAnalysis = `You already have ${dealsThisMonth} deals this month (your limit is ${maxDeals}).`;
    redFlags.push('At or over monthly deal limit');
  } else if (dealsThisMonth >= maxDeals - 1) {
    workloadScore = 50;
    workloadAnalysis = `You have ${dealsThisMonth} deals this month. This would put you at your limit of ${maxDeals}.`;
  }

  // Calculate overall score
  const overallScore = Math.round(
    (compensationScore * 0.35) +
    (timingScore * 0.25) +
    (brandScore * 0.25) +
    (workloadScore * 0.15)
  );

  // Determine recommendation
  let recommendation: 'accept' | 'negotiate' | 'decline' | 'review';
  if (overallScore >= 75 && redFlags.length === 0) {
    recommendation = 'accept';
  } else if (overallScore >= 50 || (overallScore >= 40 && greenFlags.length >= 2)) {
    recommendation = redFlags.length > 0 ? 'negotiate' : 'accept';
  } else if (overallScore >= 35) {
    recommendation = 'negotiate';
  } else {
    recommendation = redFlags.length >= 3 ? 'decline' : 'review';
  }

  // Calculate suggested counter-offer
  let suggestedCounterOffer: number | null = null;
  if (recommendation === 'negotiate' && deal.amount < fairValue.typical) {
    suggestedCounterOffer = Math.round((fairValue.typical + deal.amount) / 2);
    if (suggestedCounterOffer < fairValue.min) {
      suggestedCounterOffer = fairValue.min;
    }
  }

  // Generate overall analysis
  const overallAnalysis = generateOverallAnalysis(recommendation, overallScore, redFlags, greenFlags);

  return {
    recommendation,
    score: overallScore,
    analysis: {
      compensation: { score: Math.round(compensationScore), analysis: compensationAnalysis },
      timing: { score: Math.round(timingScore), analysis: timingAnalysis },
      brand: { score: Math.round(brandScore), analysis: brandAnalysis },
      workload: { score: Math.round(workloadScore), analysis: workloadAnalysis },
      overall: overallAnalysis,
    },
    suggestedCounterOffer,
    redFlags,
    greenFlags,
  };
}

function generateOverallAnalysis(
  recommendation: string,
  score: number,
  redFlags: string[],
  greenFlags: string[]
): string {
  let analysis = '';

  switch (recommendation) {
    case 'accept':
      analysis = `This deal scores ${score}/100 and looks like a great opportunity. `;
      if (greenFlags.length > 0) {
        analysis += `Key positives: ${greenFlags.slice(0, 2).join(', ')}. `;
      }
      analysis += 'I recommend accepting this deal.';
      break;
    case 'negotiate':
      analysis = `This deal scores ${score}/100 and has potential, but there are some concerns. `;
      if (redFlags.length > 0) {
        analysis += `Issues to address: ${redFlags.join(', ')}. `;
      }
      analysis += 'I recommend negotiating better terms before accepting.';
      break;
    case 'decline':
      analysis = `This deal scores ${score}/100 and raises significant concerns. `;
      if (redFlags.length > 0) {
        analysis += `Major issues: ${redFlags.join(', ')}. `;
      }
      analysis += 'I recommend declining this deal or requesting substantial changes.';
      break;
    case 'review':
      analysis = `This deal scores ${score}/100. There are both positives and concerns to consider. `;
      analysis += 'I recommend taking more time to review the details and possibly consulting with your compliance office.';
      break;
  }

  return analysis;
}

/**
 * Get brand recommendations for an athlete
 */
async function getBrandRecommendations(
  adminClient: ReturnType<typeof createAdminClient>,
  athlete: AthleteContext,
  limit = 10
): Promise<BrandRecommendation[]> {
  // Get brands with match scores
  const { data: matches } = await adminClient
    .from('athlete_brand_matches')
    .select(`
      brand_id,
      match_score,
      major_match,
      industry_match,
      values_match,
      brand:brands(id, company_name, industry, is_verified, budget_range_min, budget_range_max)
    `)
    .eq('athlete_id', athlete.id)
    .order('match_score', { ascending: false })
    .limit(limit);

  // If no pre-calculated matches, calculate on the fly
  if (!matches || matches.length === 0) {
    // Get brands that match basic criteria
    const { data: brands } = await adminClient
      .from('brands')
      .select('id, company_name, industry, is_verified, budget_range_min, budget_range_max, min_gpa, min_followers')
      .eq('is_verified', true)
      .limit(20);

    if (!brands) return [];

    const recommendations: BrandRecommendation[] = [];
    const athleteIndustries = athlete.major_category?.industries || [];

    for (const brand of brands) {
      // Skip if athlete doesn't meet brand requirements
      if (brand.min_gpa && (athlete.cumulative_gpa || athlete.gpa || 0) < brand.min_gpa) continue;
      if (brand.min_followers && athlete.total_followers < brand.min_followers) continue;

      const matchReasons: string[] = [];
      let score = 50;

      // Industry match
      if (brand.industry && athleteIndustries.includes(brand.industry.toLowerCase())) {
        score += 25;
        matchReasons.push(`Your ${athlete.major_category?.name} major aligns with their ${brand.industry} industry`);
      }

      // GPA bonus
      if ((athlete.cumulative_gpa || athlete.gpa || 0) >= 3.5) {
        score += 10;
        matchReasons.push('Your strong GPA makes you attractive to quality brands');
      }

      // Verification bonus
      if (athlete.enrollment_verified && athlete.sport_verified) {
        score += 10;
        matchReasons.push('Your verified status builds trust with brands');
      }

      // Follower bonus
      if (athlete.total_followers >= 10000) {
        score += 10;
        matchReasons.push('Your social media reach expands their audience');
      }

      recommendations.push({
        brand_id: brand.id,
        company_name: brand.company_name,
        industry: brand.industry || 'General',
        match_score: Math.min(score, 100),
        match_reasons: matchReasons.length > 0 ? matchReasons : ['General brand partnership opportunity'],
        potential_deal_value: {
          min: brand.budget_range_min || calculateFairMarketValue(athlete, 'social_post').min,
          max: brand.budget_range_max || calculateFairMarketValue(athlete, 'endorsement').max,
        },
        is_verified: brand.is_verified,
      });
    }

    return recommendations.sort((a, b) => b.match_score - a.match_score).slice(0, limit);
  }

  // Map pre-calculated matches
  return matches.map(match => {
    const brand = match.brand as { id: string; company_name: string; industry: string; is_verified: boolean; budget_range_min: number; budget_range_max: number };
    const matchReasons: string[] = [];

    if (match.major_match) {
      matchReasons.push(`Industry alignment with your ${athlete.major_category?.name || 'major'}`);
    }
    if (match.industry_match) {
      matchReasons.push('Direct industry match');
    }
    if (match.values_match) {
      matchReasons.push('Shared values and mission');
    }
    if (matchReasons.length === 0) {
      matchReasons.push('General partnership potential');
    }

    return {
      brand_id: brand.id,
      company_name: brand.company_name,
      industry: brand.industry || 'General',
      match_score: match.match_score,
      match_reasons: matchReasons,
      potential_deal_value: {
        min: brand.budget_range_min || calculateFairMarketValue(athlete, 'social_post').min,
        max: brand.budget_range_max || calculateFairMarketValue(athlete, 'endorsement').max,
      },
      is_verified: brand.is_verified,
    };
  });
}

/**
 * Generate schedule advice for an athlete
 */
function generateScheduleAdvice(athlete: AthleteContext): {
  currentStatus: string;
  upcomingBlockedPeriods: Array<{ name: string; dates: string; reason: string }>;
  suggestedDealWindows: Array<{ period: string; reason: string; score: number }>;
  pacingAdvice: string;
  recommendations: string[];
} {
  const now = new Date();
  const threeMonthsOut = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  // Current status
  const activeDeals = athlete.deals.filter(d => d.status === 'active').length;
  const pendingDeals = athlete.deals.filter(d => d.status === 'pending' || d.status === 'negotiating').length;
  const maxDeals = athlete.availability?.max_deals_per_month || 5;

  let currentStatus = '';
  if (activeDeals === 0 && pendingDeals === 0) {
    currentStatus = 'Your schedule is clear. Great time to take on new opportunities!';
  } else if (activeDeals + pendingDeals >= maxDeals) {
    currentStatus = `You're at capacity with ${activeDeals} active and ${pendingDeals} pending deals. Focus on completing current commitments.`;
  } else {
    currentStatus = `You have ${activeDeals} active and ${pendingDeals} pending deals. Room for ${maxDeals - activeDeals - pendingDeals} more this month.`;
  }

  // Upcoming blocked periods
  const upcomingBlockedPeriods = athlete.blocked_periods
    .filter(period => new Date(period.end_date) >= now)
    .map(period => ({
      name: period.name,
      dates: `${new Date(period.start_date).toLocaleDateString()} - ${new Date(period.end_date).toLocaleDateString()}`,
      reason: period.source === 'academic_calendar' ? 'Academic calendar' : 'Personal preference',
    }));

  // Suggested deal windows
  const suggestedDealWindows: Array<{ period: string; reason: string; score: number }> = [];
  const preferredDays = athlete.availability?.preferred_deal_days || ['friday', 'saturday', 'sunday'];

  // Find good windows in next 90 days
  let currentDate = new Date(now);
  let windowStart: Date | null = null;
  let consecutiveGoodDays = 0;

  while (currentDate <= threeMonthsOut) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    const isBlocked = athlete.blocked_periods.some(period =>
      dateStr >= period.start_date && dateStr <= period.end_date
    );

    const isPreferred = preferredDays.includes(dayName);

    if (!isBlocked && isPreferred) {
      if (!windowStart) windowStart = new Date(currentDate);
      consecutiveGoodDays++;
    } else {
      if (windowStart && consecutiveGoodDays >= 2) {
        const score = Math.min(100, 50 + consecutiveGoodDays * 10);
        suggestedDealWindows.push({
          period: `${windowStart.toLocaleDateString()} - ${new Date(currentDate.getTime() - 24 * 60 * 60 * 1000).toLocaleDateString()}`,
          reason: `${consecutiveGoodDays} consecutive preferred days with no conflicts`,
          score,
        });
      }
      windowStart = null;
      consecutiveGoodDays = 0;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Pacing advice
  let pacingAdvice = '';
  const dealsThisMonth = athlete.deals.filter(d => {
    if (!d.start_date) return false;
    const date = new Date(d.start_date);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  if (dealsThisMonth === 0) {
    pacingAdvice = 'You have no deals scheduled this month. Consider taking on 2-3 quality opportunities.';
  } else if (dealsThisMonth <= maxDeals / 2) {
    pacingAdvice = `Good pacing! You have room for ${Math.floor(maxDeals / 2)} more deals this month without overcommitting.`;
  } else if (dealsThisMonth < maxDeals) {
    pacingAdvice = 'Be selective with additional deals this month. Quality over quantity.';
  } else {
    pacingAdvice = 'Focus on your current commitments. Wait until next month to take on more deals.';
  }

  // Recommendations
  const recommendations: string[] = [];

  if (athlete.availability?.no_finals_deals) {
    recommendations.push('Your finals periods are blocked - smart choice for academic success!');
  } else {
    recommendations.push('Consider blocking finals periods to protect your GPA.');
  }

  if (preferredDays.includes('saturday') || preferredDays.includes('sunday')) {
    recommendations.push('Weekends are good for NIL activities that don\'t conflict with classes.');
  }

  if (athlete.availability?.min_notice_days && athlete.availability.min_notice_days < 3) {
    recommendations.push('Consider increasing your minimum notice days to reduce last-minute stress.');
  }

  if (activeDeals >= 3) {
    recommendations.push('With multiple active deals, make sure to track deliverables and deadlines carefully.');
  }

  return {
    currentStatus,
    upcomingBlockedPeriods,
    suggestedDealWindows: suggestedDealWindows.slice(0, 5),
    pacingAdvice,
    recommendations,
  };
}

/**
 * Generate score improvement tips
 */
function generateScoreTips(athlete: AthleteContext): {
  currentScore: number;
  tier: string;
  improvementPotential: number;
  tips: Array<{
    category: 'academic' | 'social' | 'experience' | 'verification';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    actionable: boolean;
  }>;
  quickWins: string[];
  longTermStrategies: string[];
} {
  const tips: Array<{
    category: 'academic' | 'social' | 'experience' | 'verification';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    actionable: boolean;
  }> = [];

  const quickWins: string[] = [];
  const longTermStrategies: string[] = [];

  const gpa = athlete.cumulative_gpa || athlete.gpa || 0;

  // Academic tips
  if (gpa < 3.0) {
    tips.push({
      category: 'academic',
      title: 'Improve Your GPA',
      description: 'Your GPA is below 3.0. This significantly impacts your GradeUp Score and brand appeal. Consider tutoring services and office hours.',
      impact: 'high',
      actionable: true,
    });
    longTermStrategies.push('Focus on improving GPA to 3.0+ through study groups and tutoring');
  } else if (gpa < 3.5) {
    tips.push({
      category: 'academic',
      title: 'Push for Dean\'s List',
      description: 'You\'re close to 3.5 GPA! Reaching Dean\'s List status unlocks premium brand opportunities.',
      impact: 'medium',
      actionable: true,
    });
    longTermStrategies.push('Target Dean\'s List status (3.5+ GPA) for premium brand access');
  } else if (gpa >= 3.5) {
    tips.push({
      category: 'academic',
      title: 'Maintain Excellence',
      description: 'Your strong GPA is a major asset. Keep it up and highlight it in your profile!',
      impact: 'low',
      actionable: false,
    });
  }

  // Verification tips
  if (!athlete.enrollment_verified) {
    tips.push({
      category: 'verification',
      title: 'Verify Enrollment',
      description: 'Verified athletes get 15% more deal offers. Complete enrollment verification in your settings.',
      impact: 'high',
      actionable: true,
    });
    quickWins.push('Complete enrollment verification (+5-10 points)');
  }

  if (!athlete.sport_verified) {
    tips.push({
      category: 'verification',
      title: 'Verify Sport Participation',
      description: 'Sport verification confirms you\'re an active athlete. Contact your athletic department to verify.',
      impact: 'high',
      actionable: true,
    });
    quickWins.push('Complete sport verification (+5-10 points)');
  }

  if (!athlete.grades_verified) {
    tips.push({
      category: 'verification',
      title: 'Verify Grades',
      description: 'Grade verification shows brands your academic commitment is real. Upload your transcript to verify.',
      impact: 'high',
      actionable: true,
    });
    quickWins.push('Complete grades verification (+5-10 points)');
  }

  // Social media tips
  if (athlete.total_followers < 1000) {
    tips.push({
      category: 'social',
      title: 'Build Your Following',
      description: 'Your social media presence is your platform. Post consistently and engage with your school\'s sports community.',
      impact: 'high',
      actionable: true,
    });
    longTermStrategies.push('Grow social following to 1,000+ through consistent, authentic content');
  } else if (athlete.total_followers < 10000) {
    tips.push({
      category: 'social',
      title: 'Expand Your Reach',
      description: 'You\'re building momentum! Collaborate with teammates and create content around your sport and studies.',
      impact: 'medium',
      actionable: true,
    });
    longTermStrategies.push('Reach 10K followers through collaborations and viral content');
  } else {
    tips.push({
      category: 'social',
      title: 'Leverage Your Platform',
      description: 'With 10K+ followers, you have real influence. Focus on engagement rate and brand-friendly content.',
      impact: 'low',
      actionable: true,
    });
  }

  // Experience tips
  if (athlete.deals_completed === 0) {
    tips.push({
      category: 'experience',
      title: 'Complete Your First Deal',
      description: 'Every journey starts with one step. Accept a smaller deal to build your track record and get ratings.',
      impact: 'high',
      actionable: true,
    });
    quickWins.push('Complete your first deal to establish credibility');
  } else if (athlete.deals_completed < 5) {
    tips.push({
      category: 'experience',
      title: 'Build Deal History',
      description: `You've completed ${athlete.deals_completed} deals. Getting to 5+ shows brands you're reliable and professional.`,
      impact: 'medium',
      actionable: true,
    });
  } else {
    tips.push({
      category: 'experience',
      title: 'Maintain Excellence',
      description: `With ${athlete.deals_completed} completed deals, focus on getting 5-star ratings and testimonials.`,
      impact: 'low',
      actionable: true,
    });
  }

  // Calculate improvement potential
  let improvementPotential = 0;
  if (!athlete.enrollment_verified) improvementPotential += 10;
  if (!athlete.sport_verified) improvementPotential += 10;
  if (!athlete.grades_verified) improvementPotential += 10;
  if (gpa < 3.5 && gpa >= 3.0) improvementPotential += 15;
  if (athlete.total_followers < 10000) improvementPotential += 20;
  if (athlete.deals_completed < 5) improvementPotential += 15;

  // Determine tier
  let tier = 'Bronze';
  if (athlete.gradeup_score >= 800) tier = 'Platinum';
  else if (athlete.gradeup_score >= 600) tier = 'Gold';
  else if (athlete.gradeup_score >= 400) tier = 'Silver';

  return {
    currentScore: athlete.gradeup_score,
    tier,
    improvementPotential,
    tips,
    quickWins,
    longTermStrategies,
  };
}

/**
 * Generate career guidance based on athlete profile
 */
function generateCareerGuidance(athlete: AthleteContext): {
  careerSummary: string;
  earningsPotential: { current: number; optimized: number; factors: string[] };
  contentStrategy: {
    pillars: string[];
    frequency: string;
    platforms: Array<{ platform: string; priority: string; reason: string }>;
  };
  brandingTips: string[];
  nextSteps: Array<{ action: string; timeline: string; impact: string }>;
} {
  const gpa = athlete.cumulative_gpa || athlete.gpa || 0;
  const majorName = athlete.major_category?.name || 'General Studies';
  const sportName = athlete.sport?.name || 'Athletics';

  // Career summary
  let careerSummary = `As a ${athlete.academic_year || 'student'} ${majorName} major playing ${sportName}`;
  if (gpa >= 3.5) {
    careerSummary += ' with an impressive GPA';
  }
  careerSummary += `, you have strong NIL potential. `;

  if (athlete.total_followers >= 10000) {
    careerSummary += 'Your established social media presence opens doors to major brand deals. ';
  } else if (athlete.total_followers >= 1000) {
    careerSummary += 'Your growing social media presence is building a foundation for brand partnerships. ';
  } else {
    careerSummary += 'Building your social media presence will unlock more opportunities. ';
  }

  if (athlete.deals_completed >= 5) {
    careerSummary += 'Your deal experience makes you attractive to quality brands.';
  } else {
    careerSummary += 'Focus on building your track record with successful deals.';
  }

  // Earnings potential
  const currentMonthlyPotential = calculateFairMarketValue(athlete, 'social_post').typical * 3;
  const optimizedFactors: string[] = [];

  let optimizedMultiplier = 1;
  if (!athlete.enrollment_verified || !athlete.sport_verified || !athlete.grades_verified) {
    optimizedMultiplier *= 1.15;
    optimizedFactors.push('Complete all verifications');
  }
  if (gpa < 3.5) {
    optimizedMultiplier *= 1.2;
    optimizedFactors.push('Improve GPA to 3.5+');
  }
  if (athlete.total_followers < 10000) {
    optimizedMultiplier *= 1.3;
    optimizedFactors.push('Grow social following to 10K+');
  }
  if (athlete.deals_completed < 5) {
    optimizedMultiplier *= 1.1;
    optimizedFactors.push('Complete 5+ deals with excellent ratings');
  }

  // Content strategy
  const contentPillars = [
    `${sportName} training and game highlights`,
    `Academic life and study tips for athletes`,
    `Behind-the-scenes team content`,
  ];

  if (majorName !== 'General Studies') {
    contentPillars.push(`${majorName}-related insights and career goals`);
  }

  const platforms: Array<{ platform: string; priority: string; reason: string }> = [];

  if (athlete.instagram_followers > 0 || athlete.instagram_followers === 0) {
    platforms.push({
      platform: 'Instagram',
      priority: 'High',
      reason: 'Best for visual content, stories, and brand partnerships',
    });
  }

  if (athlete.tiktok_followers > 0 || athlete.tiktok_followers === 0) {
    platforms.push({
      platform: 'TikTok',
      priority: athlete.tiktok_followers > athlete.instagram_followers ? 'High' : 'Medium',
      reason: 'High growth potential with short-form video content',
    });
  }

  platforms.push({
    platform: 'Twitter/X',
    priority: 'Medium',
    reason: 'Good for real-time engagement and sports commentary',
  });

  // Branding tips
  const brandingTips = [
    `Lead with your "scholar-athlete" identity - ${gpa >= 3.5 ? 'your strong GPA is a differentiator' : 'focus on improving academics'}`,
    `Be authentic - share real moments from training, studying, and campus life`,
    `Stay consistent - your personal brand should be recognizable across all platforms`,
    `Engage genuinely - respond to comments and build community`,
    `Think long-term - avoid deals that could hurt your reputation`,
  ];

  // Next steps
  const nextSteps: Array<{ action: string; timeline: string; impact: string }> = [];

  if (!athlete.enrollment_verified || !athlete.sport_verified || !athlete.grades_verified) {
    nextSteps.push({
      action: 'Complete all profile verifications',
      timeline: 'This week',
      impact: 'Increases trust and visibility to brands',
    });
  }

  if (athlete.deals_completed < 3) {
    nextSteps.push({
      action: 'Accept 1-2 smaller deals to build track record',
      timeline: 'Next 30 days',
      impact: 'Establishes credibility for larger opportunities',
    });
  }

  if (athlete.total_followers < 5000) {
    nextSteps.push({
      action: 'Post consistently (3-4x/week) to grow following',
      timeline: 'Ongoing',
      impact: 'Increases deal value and brand interest',
    });
  }

  nextSteps.push({
    action: 'Research and reach out to 3 aligned brands',
    timeline: 'Next 2 weeks',
    impact: 'Proactive outreach often leads to better deals',
  });

  return {
    careerSummary,
    earningsPotential: {
      current: currentMonthlyPotential,
      optimized: Math.round(currentMonthlyPotential * optimizedMultiplier),
      factors: optimizedFactors,
    },
    contentStrategy: {
      pillars: contentPillars,
      frequency: 'Aim for 3-4 posts per week, with at least 1 story/day',
      platforms,
    },
    brandingTips,
    nextSteps,
  };
}

/**
 * Handle general chat messages with intelligent responses
 */
function handleGeneralChat(message: string, athlete: AthleteContext): AIResponse {
  const lowerMessage = message.toLowerCase();

  // NIL Rules Q&A
  if (lowerMessage.includes('rule') || lowerMessage.includes('ncaa') || lowerMessage.includes('compliance') || lowerMessage.includes('legal')) {
    return {
      success: true,
      message: `Great question about NIL rules! Here's what you need to know:

**Key NIL Rules:**
1. You CAN earn money from your name, image, and likeness
2. You MUST disclose all NIL activities to ${athlete.school?.name || 'your school'}
3. You CANNOT be paid for athletic performance (pay-for-play)
4. You CANNOT use school logos/marks without permission
5. State laws vary - know your state's specific requirements

**Your Responsibilities:**
- Report all deals to your compliance office
- Keep records of all NIL income for taxes
- Review contracts carefully before signing
- Avoid conflicts with team sponsors

For specific situations, always consult with your school's compliance office. They're there to help you, not punish you!`,
      suggestions: [
        'Would you like me to explain tax obligations for NIL income?',
        'Want to know about disclosure requirements at your school?',
        'Should I help you understand what types of deals are allowed?',
      ],
    };
  }

  // Tax questions
  if (lowerMessage.includes('tax') || lowerMessage.includes('taxes') || lowerMessage.includes('irs') || lowerMessage.includes('1099')) {
    return {
      success: true,
      message: `NIL income is taxable income. Here's what you need to know:

**Tax Basics for NIL:**
1. NIL income is considered self-employment income
2. You'll likely receive 1099 forms from brands paying $600+
3. You may need to make quarterly estimated tax payments
4. You can deduct legitimate business expenses

**Deductible Expenses May Include:**
- Agent/manager fees (if applicable)
- Professional photos for your profile
- Travel for NIL appearances (if not reimbursed)
- Equipment used primarily for NIL content

**Your Estimated Tax Impact:**
Based on your total earnings of $${athlete.total_earnings.toLocaleString()}, you should set aside approximately $${Math.round(athlete.total_earnings * 0.25).toLocaleString()} for taxes (varies by state and total income).

**Important:** I recommend consulting with a tax professional who understands NIL income. Many schools offer tax guidance for athletes!`,
      suggestions: [
        'Would you like tips on tracking NIL expenses?',
        'Should I explain quarterly tax payments?',
        'Want to know more about deductible expenses?',
      ],
    };
  }

  // Earnings/Money questions
  if (lowerMessage.includes('earn') || lowerMessage.includes('money') || lowerMessage.includes('worth') || lowerMessage.includes('value') || lowerMessage.includes('rate')) {
    const fairValue = calculateFairMarketValue(athlete, 'social_post');

    return {
      success: true,
      message: `Let me break down your NIL earning potential:

**Your Current Metrics:**
- GradeUp Score: ${athlete.gradeup_score}/1000 ${athlete.scholar_tier ? `(${athlete.scholar_tier} tier)` : ''}
- Total Followers: ${athlete.total_followers.toLocaleString()}
- Deals Completed: ${athlete.deals_completed}
- Average Rating: ${athlete.avg_deal_rating > 0 ? athlete.avg_deal_rating.toFixed(1) + '/5.0' : 'Not yet rated'}

**Estimated Deal Values:**
- Social Media Post: $${fairValue.min.toLocaleString()} - $${fairValue.max.toLocaleString()}
- Appearance: $${(fairValue.typical * 3).toLocaleString()} - $${(fairValue.typical * 5).toLocaleString()}
- Endorsement: $${(fairValue.typical * 5).toLocaleString()} - $${(fairValue.typical * 10).toLocaleString()}

**Total Earnings to Date:** $${athlete.total_earnings.toLocaleString()}

Your ${athlete.cumulative_gpa || athlete.gpa || 0 >= 3.5 ? 'strong GPA gives you a premium - brands love scholar-athletes!' : 'GPA affects your rates - improving it would unlock higher-paying opportunities.'}`,
      suggestions: [
        'Want tips on increasing your deal value?',
        'Should I find brands that match your profile?',
        'Would you like to see score improvement strategies?',
      ],
      data: {
        fair_value: fairValue,
        current_earnings: athlete.total_earnings,
        gradeup_score: athlete.gradeup_score,
      },
    };
  }

  // Brand/Deal questions
  if (lowerMessage.includes('brand') || lowerMessage.includes('deal') || lowerMessage.includes('sponsor') || lowerMessage.includes('partner')) {
    const majorIndustries = athlete.major_category?.industries || [];

    return {
      success: true,
      message: `Let's talk about brand partnerships for you!

**Your Profile Strengths:**
- Sport: ${athlete.sport?.name || 'Athletics'} at ${athlete.school?.name || 'your school'}
- Major: ${athlete.major || athlete.major_category?.name || 'Not specified'}
- GPA: ${athlete.cumulative_gpa || athlete.gpa || 'Not listed'}
- Followers: ${athlete.total_followers.toLocaleString()}

**Best Brand Matches for You:**
Based on your ${athlete.major_category?.name || 'studies'}, these industries align well:
${majorIndustries.length > 0 ? majorIndustries.slice(0, 5).map(i => `- ${i.charAt(0).toUpperCase() + i.slice(1).replace('_', ' ')}`).join('\n') : '- General consumer brands\n- Sports and fitness\n- Local businesses'}

**Deal Types to Consider:**
1. Social media posts (quick, flexible)
2. Local business appearances (build community ties)
3. Product endorsements (if you genuinely use the product)
4. Camp/clinic appearances (great for athletes who want to coach)

Want me to find specific brand recommendations for you?`,
      suggestions: [
        'Show me brand recommendations',
        'How do I negotiate better deal terms?',
        'What brands should I avoid?',
      ],
    };
  }

  // Schedule/Time questions
  if (lowerMessage.includes('schedule') || lowerMessage.includes('time') || lowerMessage.includes('busy') || lowerMessage.includes('available')) {
    const scheduleAdvice = generateScheduleAdvice(athlete);

    return {
      success: true,
      message: `Here's your current schedule status:

**${scheduleAdvice.currentStatus}**

**Upcoming Blocked Periods:**
${scheduleAdvice.upcomingBlockedPeriods.length > 0
  ? scheduleAdvice.upcomingBlockedPeriods.slice(0, 3).map(p => `- ${p.name}: ${p.dates}`).join('\n')
  : 'No blocked periods in the next 3 months.'}

**${scheduleAdvice.pacingAdvice}**

**Recommended Deal Windows:**
${scheduleAdvice.suggestedDealWindows.slice(0, 3).map(w => `- ${w.period} (${w.reason})`).join('\n')}

Remember: ${scheduleAdvice.recommendations[0]}`,
      suggestions: [
        'How many deals should I take per month?',
        'When are the best times for appearances?',
        'Help me block off study time',
      ],
      data: scheduleAdvice,
    };
  }

  // GPA/Academic questions
  if (lowerMessage.includes('gpa') || lowerMessage.includes('grade') || lowerMessage.includes('academic') || lowerMessage.includes('school') || lowerMessage.includes('study')) {
    const gpa = athlete.cumulative_gpa || athlete.gpa || 0;

    return {
      success: true,
      message: `Academics are central to your NIL success! Here's the breakdown:

**Your Academic Profile:**
- Current GPA: ${gpa > 0 ? gpa.toFixed(2) : 'Not listed'}
- Major: ${athlete.major || athlete.major_category?.name || 'Not specified'}
- Year: ${athlete.academic_year || 'Not specified'}
- Grades Verified: ${athlete.grades_verified ? 'Yes' : 'Not yet - verify to boost your score!'}

**Why GPA Matters for NIL:**
1. Brands trust scholar-athletes more
2. Higher GPA = higher deal values (+10-20%)
3. Dean's List status (3.5+) unlocks premium opportunities
4. Academic excellence is YOUR differentiator

**Academic Tips for Athletes:**
- Use your athletic department's tutoring resources
- Block study time like you block practice time
- Build relationships with professors during office hours
- Consider your NIL activities when choosing course loads

${gpa >= 3.5 ? 'Your strong GPA is a competitive advantage - make sure brands know about it!' : gpa >= 3.0 ? 'You\'re doing well! Push for that 3.5 to unlock premium brand opportunities.' : 'Focus on academics first - a stronger GPA will significantly boost your NIL potential.'}`,
      suggestions: [
        'How do I balance NIL with studying?',
        'What brands value academic excellence?',
        'Show me my score improvement tips',
      ],
    };
  }

  // Default helpful response
  return {
    success: true,
    message: `Hey ${athlete.profile.first_name}! I'm ScholarMatch, your AI NIL advisor. I can help you with:

**Deal Analysis** - Evaluate offers and suggest counter-offers
**Brand Matching** - Find brands that fit your profile and values
**Schedule Planning** - Balance NIL with academics and athletics
**Score Improvement** - Tips to boost your GradeUp Score
**NIL Rules & Taxes** - Navigate compliance and financial questions

**Your Quick Stats:**
- GradeUp Score: ${athlete.gradeup_score}/1000
- Total Earnings: $${athlete.total_earnings.toLocaleString()}
- Deals Completed: ${athlete.deals_completed}
- Followers: ${athlete.total_followers.toLocaleString()}

What would you like help with today?`,
    suggestions: [
      'Analyze my pending deals',
      'Find brands that match my profile',
      'How can I improve my score?',
      'What are the NIL rules I should know?',
    ],
  };
}

// =============================================================================
// MAIN HANDLERS
// =============================================================================

async function handleChat(
  message: string | undefined,
  athlete: AthleteContext,
  context?: Record<string, unknown>
): Promise<AIResponse> {
  if (!message) {
    return handleGeneralChat('', athlete);
  }

  return handleGeneralChat(message, athlete);
}

async function handleAnalyzeDeal(
  dealId: string | undefined,
  athlete: AthleteContext,
  adminClient: ReturnType<typeof createAdminClient>
): Promise<AIResponse> {
  if (!dealId) {
    // Analyze all pending deals
    const pendingDeals = athlete.deals.filter(d =>
      d.status === 'pending' || d.status === 'negotiating'
    );

    if (pendingDeals.length === 0) {
      return {
        success: true,
        message: `You don't have any pending deals to analyze right now.

**Your Recent Deal Activity:**
${athlete.deals.slice(0, 3).map(d => `- ${d.title}: $${d.amount.toLocaleString()} (${d.status})`).join('\n') || 'No recent deals'}

Would you like me to help you find new opportunities that match your profile?`,
        suggestions: [
          'Find brand recommendations for me',
          'What deal types should I look for?',
          'How do I get more deal offers?',
        ],
      };
    }

    // Analyze first pending deal
    const deal = await getDealContext(adminClient, pendingDeals[0].id);
    if (!deal) {
      return {
        success: false,
        message: 'Could not load deal details. Please try again.',
      };
    }

    const analysis = analyzeDealOffer(athlete, deal);

    return {
      success: true,
      message: `**Deal Analysis: ${deal.title}**

**Recommendation: ${analysis.recommendation.toUpperCase()}** (Score: ${analysis.score}/100)

${analysis.analysis.overall}

**Breakdown:**
- Compensation: ${analysis.analysis.compensation.score}/100 - ${analysis.analysis.compensation.analysis}
- Timing: ${analysis.analysis.timing.score}/100 - ${analysis.analysis.timing.analysis}
- Brand: ${analysis.analysis.brand.score}/100 - ${analysis.analysis.brand.analysis}
- Workload: ${analysis.analysis.workload.score}/100 - ${analysis.analysis.workload.analysis}

${analysis.greenFlags.length > 0 ? `**Positives:** ${analysis.greenFlags.join(', ')}` : ''}
${analysis.redFlags.length > 0 ? `**Concerns:** ${analysis.redFlags.join(', ')}` : ''}
${analysis.suggestedCounterOffer ? `\n**Suggested Counter-Offer:** $${analysis.suggestedCounterOffer.toLocaleString()}` : ''}`,
      data: {
        deal_id: deal.id,
        analysis,
        deal_summary: {
          title: deal.title,
          brand: deal.brand?.company_name,
          amount: deal.amount,
          type: deal.deal_type,
        },
      },
      action_items: [
        {
          type: analysis.recommendation,
          title: `${analysis.recommendation.charAt(0).toUpperCase() + analysis.recommendation.slice(1)} this deal`,
          description: analysis.analysis.overall,
          priority: analysis.score >= 70 ? 'high' : analysis.score >= 50 ? 'medium' : 'low',
        },
      ],
      confidence: analysis.score / 100,
    };
  }

  // Analyze specific deal
  const deal = await getDealContext(adminClient, dealId);
  if (!deal) {
    return {
      success: false,
      message: 'Could not find that deal. Please check the deal ID and try again.',
    };
  }

  const analysis = analyzeDealOffer(athlete, deal);

  return {
    success: true,
    message: `**Deal Analysis: ${deal.title}**

**Recommendation: ${analysis.recommendation.toUpperCase()}** (Score: ${analysis.score}/100)

${analysis.analysis.overall}

**Detailed Breakdown:**

**Compensation (${analysis.analysis.compensation.score}/100)**
${analysis.analysis.compensation.analysis}

**Timing (${analysis.analysis.timing.score}/100)**
${analysis.analysis.timing.analysis}

**Brand (${analysis.analysis.brand.score}/100)**
${analysis.analysis.brand.analysis}

**Workload (${analysis.analysis.workload.score}/100)**
${analysis.analysis.workload.analysis}

${analysis.greenFlags.length > 0 ? `\n**Green Flags:**\n${analysis.greenFlags.map(f => `- ${f}`).join('\n')}` : ''}
${analysis.redFlags.length > 0 ? `\n**Red Flags:**\n${analysis.redFlags.map(f => `- ${f}`).join('\n')}` : ''}
${analysis.suggestedCounterOffer ? `\n**Suggested Counter-Offer:** $${analysis.suggestedCounterOffer.toLocaleString()}\nThis brings the offer closer to your typical market rate while still being reasonable for the brand.` : ''}`,
    data: {
      deal_id: deal.id,
      analysis,
    },
    action_items: [
      {
        type: analysis.recommendation,
        title: `${analysis.recommendation.charAt(0).toUpperCase() + analysis.recommendation.slice(1)} this deal`,
        description: analysis.analysis.overall,
        priority: analysis.score >= 70 ? 'high' : analysis.score >= 50 ? 'medium' : 'low',
      },
    ],
    confidence: analysis.score / 100,
  };
}

async function handleRecommendBrands(
  athlete: AthleteContext,
  adminClient: ReturnType<typeof createAdminClient>
): Promise<AIResponse> {
  const recommendations = await getBrandRecommendations(adminClient, athlete);

  if (recommendations.length === 0) {
    return {
      success: true,
      message: `I couldn't find specific brand matches right now, but here's what you should look for:

**Ideal Brand Types for You:**
Based on your ${athlete.major_category?.name || 'studies'} major and ${athlete.sport?.name || 'athletic'} background:

${athlete.major_category?.industries?.slice(0, 5).map(i => `- ${i.charAt(0).toUpperCase() + i.slice(1).replace('_', ' ')} companies`).join('\n') || '- Consumer brands\n- Sports equipment\n- Local businesses'}

**Tips for Finding Brands:**
1. Look for brands you already use and love
2. Check what brands sponsor athletes at your school
3. Consider local businesses in your college town
4. Look at what brands your sport's professionals endorse

Would you like help reaching out to specific types of brands?`,
      suggestions: [
        'How do I reach out to brands?',
        'What should I include in my pitch?',
        'Show me my score improvement tips',
      ],
    };
  }

  const topRecs = recommendations.slice(0, 5);

  return {
    success: true,
    message: `**Top Brand Matches for You:**

${topRecs.map((rec, i) => `**${i + 1}. ${rec.company_name}** ${rec.is_verified ? '(Verified)' : ''}
   Match Score: ${rec.match_score}/100 | Industry: ${rec.industry}
   Potential Value: $${rec.potential_deal_value.min.toLocaleString()} - $${rec.potential_deal_value.max.toLocaleString()}
   Why: ${rec.match_reasons[0]}`).join('\n\n')}

**Why These Brands?**
I matched you based on:
- Your ${athlete.major_category?.name || 'academic'} major and related industries
- Your ${athlete.sport?.name || 'sport'} and athletic profile
- Your ${athlete.total_followers.toLocaleString()} followers
- Your ${athlete.gradeup_score}/1000 GradeUp Score

Ready to reach out to any of these brands?`,
    data: {
      recommendations: topRecs,
      total_matches: recommendations.length,
    },
    suggestions: [
      'How do I pitch to these brands?',
      'What deal types work best with each?',
      'Are there any brands I should avoid?',
    ],
  };
}

async function handleScheduleAdvice(
  athlete: AthleteContext,
  adminClient: ReturnType<typeof createAdminClient>
): Promise<AIResponse> {
  const advice = generateScheduleAdvice(athlete);

  return {
    success: true,
    message: `**Your NIL Schedule Analysis**

**Current Status:**
${advice.currentStatus}

**Pacing Advice:**
${advice.pacingAdvice}

**Upcoming Blocked Periods:**
${advice.upcomingBlockedPeriods.length > 0
  ? advice.upcomingBlockedPeriods.map(p => `- **${p.name}**: ${p.dates} (${p.reason})`).join('\n')
  : 'No blocked periods in the next 6 months.'}

**Best Windows for Deals:**
${advice.suggestedDealWindows.length > 0
  ? advice.suggestedDealWindows.map(w => `- ${w.period}: ${w.reason} (Score: ${w.score}/100)`).join('\n')
  : 'All upcoming dates appear available!'}

**Recommendations:**
${advice.recommendations.map(r => `- ${r}`).join('\n')}

Remember: Quality over quantity. One great deal is better than three mediocre ones!`,
    data: advice,
    suggestions: [
      'Help me set up my availability preferences',
      'How many deals should I do per month?',
      'Block my finals period',
    ],
  };
}

async function handleScoreTips(athlete: AthleteContext): Promise<AIResponse> {
  const tips = generateScoreTips(athlete);

  return {
    success: true,
    message: `**GradeUp Score Improvement Plan**

**Current Score:** ${tips.currentScore}/1000 (${tips.tier} Tier)
**Improvement Potential:** +${tips.improvementPotential} points

**Quick Wins (This Week):**
${tips.quickWins.length > 0 ? tips.quickWins.map(w => `- ${w}`).join('\n') : 'You\'ve already captured the quick wins!'}

**Priority Improvements:**
${tips.tips.filter(t => t.impact === 'high').map(t => `
**${t.title}** (${t.category})
${t.description}`).join('\n')}

**Long-Term Strategies:**
${tips.longTermStrategies.map(s => `- ${s}`).join('\n')}

**Score Breakdown:**
Your GradeUp Score combines:
- Athletic Score (40%): Based on sport tier, deals, and ratings
- Social Score (30%): Based on follower count and engagement
- Academic Score (30%): GPA-weighted with bonuses for excellence

Focus on the areas where you have the most room to grow!`,
    data: tips,
    action_items: tips.tips.filter(t => t.actionable).map(t => ({
      type: 'improve' as const,
      title: t.title,
      description: t.description,
      priority: t.impact,
    })),
    suggestions: [
      'How do I improve my academic score?',
      'Tips for growing my social following',
      'Help me get verified',
    ],
  };
}

async function handleCareerGuidance(athlete: AthleteContext): Promise<AIResponse> {
  const guidance = generateCareerGuidance(athlete);

  return {
    success: true,
    message: `**Your NIL Career Roadmap**

${guidance.careerSummary}

**Earnings Potential:**
- Current Monthly Estimate: $${guidance.earningsPotential.current.toLocaleString()}
- Optimized Potential: $${guidance.earningsPotential.optimized.toLocaleString()}
${guidance.earningsPotential.factors.length > 0 ? `- Key Improvements: ${guidance.earningsPotential.factors.join(', ')}` : ''}

**Content Strategy:**

*Content Pillars:*
${guidance.contentStrategy.pillars.map(p => `- ${p}`).join('\n')}

*Posting Frequency:*
${guidance.contentStrategy.frequency}

*Platform Priorities:*
${guidance.contentStrategy.platforms.map(p => `- **${p.platform}** (${p.priority}): ${p.reason}`).join('\n')}

**Personal Branding Tips:**
${guidance.brandingTips.map(t => `- ${t}`).join('\n')}

**Your Next Steps:**
${guidance.nextSteps.map(s => `
**${s.action}**
Timeline: ${s.timeline} | Impact: ${s.impact}`).join('\n')}

Remember: Your NIL journey is a marathon, not a sprint. Build your brand authentically!`,
    data: guidance,
    action_items: guidance.nextSteps.map(s => ({
      type: 'improve' as const,
      title: s.action,
      description: s.impact,
      priority: s.timeline.includes('week') ? 'high' as const : 'medium' as const,
    })),
    suggestions: [
      'Help me create a content calendar',
      'What brands should I target first?',
      'How do I stand out from other athletes?',
    ],
  };
}

// =============================================================================
// MAIN SERVER
// =============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, athlete_id, message, deal_id, context } = await req.json() as AIRequest;

    if (!athlete_id) {
      throw new Error('athlete_id is required');
    }

    const adminClient = createAdminClient();

    // Get comprehensive athlete context
    const athlete = await getAthleteContext(adminClient, athlete_id);

    if (!athlete) {
      throw new Error('Athlete not found');
    }

    // Route to appropriate handler
    let response: AIResponse;

    switch (action) {
      case 'chat':
        response = await handleChat(message, athlete, context);
        break;

      case 'analyze_deal':
        response = await handleAnalyzeDeal(deal_id, athlete, adminClient);
        break;

      case 'recommend_brands':
        response = await handleRecommendBrands(athlete, adminClient);
        break;

      case 'schedule_advice':
        response = await handleScheduleAdvice(athlete, adminClient);
        break;

      case 'score_tips':
        response = await handleScoreTips(athlete);
        break;

      case 'career_guidance':
        response = await handleCareerGuidance(athlete);
        break;

      default:
        // Default to chat handler for unrecognized actions
        response = await handleChat(message, athlete, context);
    }

    // Log the interaction (optional - for analytics)
    try {
      await adminClient.from('activity_log').insert({
        user_id: athlete.profile.email ? undefined : undefined, // Would need profile_id
        action: `scholarmatch_${action}`,
        entity_type: 'athlete',
        entity_id: athlete_id,
        metadata: {
          action,
          has_message: !!message,
          deal_id,
          response_success: response.success,
        },
      });
    } catch {
      // Logging failure shouldn't break the response
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return new Response(
      JSON.stringify({
        success: false,
        message: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
        error: errorMessage,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
