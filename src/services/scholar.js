/**
 * GradeUp NIL Platform - Scholar Service
 * Handles Scholar Sponsors Program functionality.
 *
 * @module services/scholar
 */

import { getSupabaseClient, getCurrentUser } from './supabase.js';
import { getMyAthleteId } from './helpers.js';

/**
 * Scholar tier names
 * @readonly
 */
export const SCHOLAR_TIERS = {
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum',
};

/**
 * Tier benefits by tier name
 * @readonly
 */
export const TIER_BENEFITS = {
  bronze: {
    priorityMatching: false,
    premiumBrands: false,
    rateBoost: 1.0,
  },
  silver: {
    priorityMatching: true,
    premiumBrands: false,
    rateBoost: 1.1,
  },
  gold: {
    priorityMatching: true,
    premiumBrands: true,
    rateBoost: 1.25,
  },
  platinum: {
    priorityMatching: true,
    premiumBrands: true,
    rateBoost: 1.5,
    guaranteedMinimum: 5000,
  },
};

/**
 * Get all scholar tiers with their requirements and benefits
 * @returns {Promise<{tiers: Array, error: Error|null}>}
 */
export async function getScholarTiers() {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('scholar_tiers')
    .select('*')
    .order('min_gpa');

  return { tiers: data, error };
}

/**
 * Get a specific tier by name
 * @param {string} tierName - Tier name (bronze, silver, gold, platinum)
 * @returns {Promise<{tier: object|null, error: Error|null}>}
 */
export async function getScholarTierByName(tierName) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('scholar_tiers')
    .select('*')
    .eq('name', tierName)
    .single();

  return { tier: data, error };
}

/**
 * Get current athlete's scholar status
 * @returns {Promise<{status: object|null, error: Error|null}>}
 */
export async function getMyScholarStatus() {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { status: null, error: null };
  }

  const { data, error } = await supabase
    .from('athlete_scholar_status')
    .select(`
      *,
      tier:scholar_tiers(*)
    `)
    .eq('athlete_id', athleteId)
    .single();

  if (error && error.code === 'PGRST116') {
    // No scholar status - athlete not qualified for any tier
    return { status: null, error: null };
  }

  return { status: data, error };
}

/**
 * Get scholar status for a specific athlete
 * @param {string} athleteId - Athlete ID
 * @returns {Promise<{status: object|null, error: Error|null}>}
 */
export async function getAthleteScholarStatus(athleteId) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('athlete_scholar_status')
    .select(`
      *,
      tier:scholar_tiers(*)
    `)
    .eq('athlete_id', athleteId)
    .eq('is_active', true)
    .single();

  if (error && error.code === 'PGRST116') {
    return { status: null, error: null };
  }

  return { status: data, error };
}

/**
 * Check if athlete qualifies for a specific tier
 * @param {number} gpa - Athlete's GPA
 * @param {number} gradeupScore - Athlete's GradeUp score
 * @param {string} tierName - Target tier name
 * @returns {Promise<{qualifies: boolean, error: Error|null}>}
 */
export async function checkTierQualification(gpa, gradeupScore, tierName) {
  const { tier, error } = await getScholarTierByName(tierName);

  if (error || !tier) {
    return { qualifies: false, error: error || new Error('Tier not found') };
  }

  const qualifies = gpa >= tier.min_gpa &&
    (!tier.min_gradeup_score || gradeupScore >= tier.min_gradeup_score);

  return { qualifies, error: null };
}

/**
 * Get the highest tier an athlete qualifies for
 * @param {number} gpa - Athlete's GPA
 * @param {number} gradeupScore - Athlete's GradeUp score
 * @returns {Promise<{tier: object|null, error: Error|null}>}
 */
export async function getQualifyingTier(gpa, gradeupScore) {
  const { tiers, error } = await getScholarTiers();

  if (error || !tiers) {
    return { tier: null, error };
  }

  // Sort by min_gpa descending to find highest qualifying tier
  const sortedTiers = [...tiers].sort((a, b) => b.min_gpa - a.min_gpa);

  for (const tier of sortedTiers) {
    if (gpa >= tier.min_gpa &&
        (!tier.min_gradeup_score || gradeupScore >= tier.min_gradeup_score)) {
      return { tier, error: null };
    }
  }

  return { tier: null, error: null };
}

/**
 * Get opportunities exclusive to scholars of a certain tier
 * @param {object} options - Filter options
 * @param {string} [options.tierName] - Minimum tier requirement
 * @param {number} [options.limit=20] - Number of results
 * @param {number} [options.offset=0] - Offset for pagination
 * @returns {Promise<{opportunities: Array, error: Error|null}>}
 */
export async function getScholarOpportunities(options = {}) {
  const supabase = await getSupabaseClient();
  const { tierName, limit = 20, offset = 0 } = options;

  // Get current athlete's tier if not specified
  let targetTier = tierName;
  if (!targetTier) {
    const { status } = await getMyScholarStatus();
    targetTier = status?.tier?.name;
  }

  if (!targetTier) {
    return { opportunities: [], error: null };
  }

  // Get tier-exclusive opportunities
  // These are opportunities where min_gpa matches scholar tier requirements
  const { tier: tierData } = await getScholarTierByName(targetTier);

  if (!tierData) {
    return { opportunities: [], error: new Error('Tier not found') };
  }

  const { data, error } = await supabase
    .from('opportunities')
    .select(`
      *,
      brand:brands(
        id,
        company_name,
        logo_url,
        industry,
        is_verified
      )
    `)
    .gte('min_gpa', tierData.min_gpa)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { opportunities: data, error };
}

/**
 * Get premium brands available to scholars
 * @param {object} options - Filter options
 * @param {string} [options.tierName] - Filter by minimum tier
 * @param {string[]} [options.industries] - Filter by industries
 * @param {boolean} [options.exclusiveOnly=false] - Only show exclusive sponsors
 * @returns {Promise<{brands: Array, error: Error|null}>}
 */
export async function getScholarBrands(options = {}) {
  const supabase = await getSupabaseClient();
  const { tierName, industries, exclusiveOnly = false } = options;

  // Get current athlete's tier if not specified
  let targetTier = tierName;
  if (!targetTier) {
    const { status } = await getMyScholarStatus();
    targetTier = status?.tier?.name;
  }

  if (!targetTier) {
    return { brands: [], error: null };
  }

  // Determine eligible tiers (current tier and all lower tiers)
  const tierOrder = ['bronze', 'silver', 'gold', 'platinum'];
  const tierIndex = tierOrder.indexOf(targetTier);
  const eligibleTiers = tierOrder.slice(0, tierIndex + 1);

  let query = supabase
    .from('scholar_sponsors')
    .select(`
      id,
      tier_requirement,
      exclusive,
      premium_rate_multiplier,
      industries,
      brand:brands(
        id,
        company_name,
        logo_url,
        industry,
        website_url,
        is_verified,
        total_spent,
        deals_completed,
        avg_deal_rating
      )
    `)
    .in('tier_requirement', eligibleTiers)
    .eq('is_active', true);

  if (exclusiveOnly) {
    query = query.eq('exclusive', true);
  }

  if (industries && industries.length > 0) {
    query = query.overlaps('industries', industries);
  }

  const { data, error } = await query;

  // Transform data to include rate multiplier
  const brands = data?.map(sponsor => ({
    ...sponsor.brand,
    sponsorInfo: {
      tierRequirement: sponsor.tier_requirement,
      exclusive: sponsor.exclusive,
      rateMultiplier: sponsor.premium_rate_multiplier,
      industries: sponsor.industries,
    },
  })) || [];

  return { brands, error };
}

/**
 * Get scholar program statistics
 * @returns {Promise<{stats: object, error: Error|null}>}
 */
export async function getScholarStats() {
  const supabase = await getSupabaseClient();

  // Get counts by tier
  const { data: tierCounts, error: tierError } = await supabase
    .from('athlete_scholar_status')
    .select(`
      tier:scholar_tiers(name)
    `)
    .eq('is_active', true);

  if (tierError) {
    return { stats: null, error: tierError };
  }

  // Count by tier
  const byTier = {
    bronze: 0,
    silver: 0,
    gold: 0,
    platinum: 0,
  };

  tierCounts?.forEach(item => {
    const tierName = item.tier?.name;
    if (tierName && byTier.hasOwnProperty(tierName)) {
      byTier[tierName]++;
    }
  });

  // Get total scholar sponsors
  const { count: sponsorCount, error: sponsorError } = await supabase
    .from('scholar_sponsors')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  return {
    stats: {
      totalScholars: tierCounts?.length || 0,
      byTier,
      totalSponsors: sponsorCount || 0,
    },
    error: sponsorError,
  };
}

/**
 * Get tier progression info for current athlete
 * Shows progress to next tier
 * @returns {Promise<{progression: object|null, error: Error|null}>}
 */
export async function getMyTierProgression() {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { progression: null, error: null };
  }

  // Get athlete's current GPA and score
  const { data: athlete, error: athleteError } = await supabase
    .from('athletes')
    .select('gpa, cumulative_gpa, gradeup_score, scholar_tier')
    .eq('id', athleteId)
    .single();

  if (athleteError) {
    return { progression: null, error: athleteError };
  }

  const currentGpa = athlete.cumulative_gpa || athlete.gpa;
  const currentScore = athlete.gradeup_score;
  const currentTierName = athlete.scholar_tier;

  // Get all tiers
  const { tiers, error: tiersError } = await getScholarTiers();

  if (tiersError) {
    return { progression: null, error: tiersError };
  }

  // Find current tier and next tier
  const tierOrder = ['bronze', 'silver', 'gold', 'platinum'];
  const currentIndex = currentTierName ? tierOrder.indexOf(currentTierName) : -1;
  const nextIndex = currentIndex + 1;

  let currentTier = null;
  let nextTier = null;

  if (currentIndex >= 0) {
    currentTier = tiers.find(t => t.name === tierOrder[currentIndex]);
  }

  if (nextIndex < tierOrder.length) {
    nextTier = tiers.find(t => t.name === tierOrder[nextIndex]);
  }

  // Calculate progress to next tier
  let gpaProgress = null;
  let scoreProgress = null;

  if (nextTier) {
    gpaProgress = {
      current: currentGpa,
      required: nextTier.min_gpa,
      difference: Math.max(0, nextTier.min_gpa - currentGpa),
      percentage: Math.min(100, Math.round((currentGpa / nextTier.min_gpa) * 100)),
    };

    if (nextTier.min_gradeup_score) {
      scoreProgress = {
        current: currentScore,
        required: nextTier.min_gradeup_score,
        difference: Math.max(0, nextTier.min_gradeup_score - currentScore),
        percentage: Math.min(100, Math.round((currentScore / nextTier.min_gradeup_score) * 100)),
      };
    }
  }

  return {
    progression: {
      currentTier,
      nextTier,
      gpaProgress,
      scoreProgress,
      isMaxTier: currentTierName === 'platinum',
    },
    error: null,
  };
}

/**
 * Calculate potential earnings boost based on scholar tier
 * @param {number} baseAmount - Base deal amount
 * @param {string} tierName - Scholar tier name
 * @returns {{boostedAmount: number, multiplier: number}}
 */
export function calculateScholarBoost(baseAmount, tierName) {
  const benefits = TIER_BENEFITS[tierName];

  if (!benefits) {
    return { boostedAmount: baseAmount, multiplier: 1.0 };
  }

  const multiplier = benefits.rateBoost;
  const boostedAmount = baseAmount * multiplier;

  return { boostedAmount, multiplier };
}

/**
 * Get scholars by tier for public display
 * @param {string} tierName - Tier name
 * @param {object} options - Filter options
 * @param {number} [options.limit=20] - Number of results
 * @param {number} [options.offset=0] - Offset for pagination
 * @returns {Promise<{scholars: Array, error: Error|null}>}
 */
export async function getScholarsByTier(tierName, options = {}) {
  const supabase = await getSupabaseClient();
  const { limit = 20, offset = 0 } = options;

  const { data, error } = await supabase
    .from('athlete_scholar_status')
    .select(`
      *,
      tier:scholar_tiers(*),
      athlete:athletes(
        id,
        gradeup_score,
        total_followers,
        profile:profiles(first_name, last_name, avatar_url),
        school:schools(name, short_name, logo_url),
        sport:sports(name)
      )
    `)
    .eq('tier:scholar_tiers.name', tierName)
    .eq('is_active', true)
    .order('qualified_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { scholars: data, error };
}

export default {
  // Constants
  SCHOLAR_TIERS,
  TIER_BENEFITS,
  // Tier functions
  getScholarTiers,
  getScholarTierByName,
  checkTierQualification,
  getQualifyingTier,
  // Status functions
  getMyScholarStatus,
  getAthleteScholarStatus,
  getMyTierProgression,
  // Opportunities and brands
  getScholarOpportunities,
  getScholarBrands,
  // Statistics
  getScholarStats,
  getScholarsByTier,
  // Utility functions
  calculateScholarBoost,
};
