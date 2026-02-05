/**
 * GradeUp NIL Platform - Gamification Service
 * Handles achievements, XP, levels, and leaderboards.
 *
 * @module services/gamification
 */

import { getSupabaseClient, getCurrentUser, invokeFunction } from './supabase.js';
import { getMyAthleteId } from './helpers.js';

/**
 * Achievement rarity levels
 * @readonly
 */
export const RARITY = {
  COMMON: 'common',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
};

/**
 * Achievement categories
 * @readonly
 */
export const ACHIEVEMENT_CATEGORIES = {
  ACADEMIC: 'academic',
  NIL: 'nil',
  SOCIAL: 'social',
  MILESTONE: 'milestone',
};

/**
 * XP calculation constants
 * @readonly
 */
export const XP_CONSTANTS = {
  BASE_XP_PER_LEVEL: 100,
};

/**
 * Calculate level from XP
 * @param {number} xp - Total XP
 * @returns {number} Level
 */
export function calculateLevel(xp) {
  // Level formula: Each level requires (level * 100) XP
  // Level 1: 0-99, Level 2: 100-299, Level 3: 300-599, etc.
  return Math.max(1, Math.floor((-1 + Math.sqrt(1 + 8 * xp / 100)) / 2) + 1);
}

/**
 * Calculate XP required for next level
 * @param {number} currentLevel - Current level
 * @returns {number} XP required for next level
 */
export function xpForNextLevel(currentLevel) {
  // Sum of arithmetic series: n * (n + 1) / 2 * 100
  return Math.floor(currentLevel * (currentLevel + 1) / 2 * 100);
}

/**
 * Calculate XP progress within current level
 * @param {number} totalXp - Total XP
 * @param {number} currentLevel - Current level
 * @returns {{current: number, required: number, percentage: number}}
 */
export function getXpProgress(totalXp, currentLevel) {
  const xpForCurrent = xpForNextLevel(currentLevel - 1);
  const xpForNext = xpForNextLevel(currentLevel);
  const currentProgress = totalXp - xpForCurrent;
  const required = xpForNext - xpForCurrent;
  const percentage = Math.min(100, Math.round((currentProgress / required) * 100));

  return {
    current: currentProgress,
    required,
    percentage,
  };
}

/**
 * Get all available achievements
 * @param {object} options - Filter options
 * @param {string} [options.category] - Filter by category
 * @param {string} [options.rarity] - Filter by rarity
 * @returns {Promise<{achievements: Array, error: Error|null}>}
 */
export async function getAchievements(options = {}) {
  const supabase = await getSupabaseClient();

  let query = supabase
    .from('achievements')
    .select('*')
    .order('category')
    .order('points', { ascending: false });

  if (options.category) {
    query = query.eq('category', options.category);
  }

  if (options.rarity) {
    query = query.eq('rarity', options.rarity);
  }

  const { data, error } = await query;
  return { achievements: data, error };
}

/**
 * Get achievements earned by the current athlete
 * @returns {Promise<{achievements: Array, error: Error|null}>}
 */
export async function getMyAchievements() {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { achievements: [], error: null };
  }

  const { data, error } = await supabase
    .from('athlete_achievements')
    .select(`
      id,
      earned_at,
      metadata,
      achievement:achievements(*)
    `)
    .eq('athlete_id', athleteId)
    .order('earned_at', { ascending: false });

  return { achievements: data, error };
}

/**
 * Get achievements earned by a specific athlete
 * @param {string} athleteId - Athlete ID
 * @returns {Promise<{achievements: Array, error: Error|null}>}
 */
export async function getAthleteAchievements(athleteId) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('athlete_achievements')
    .select(`
      id,
      earned_at,
      metadata,
      achievement:achievements(*)
    `)
    .eq('athlete_id', athleteId)
    .order('earned_at', { ascending: false });

  return { achievements: data, error };
}

/**
 * Check and award new achievements for the current athlete
 * @returns {Promise<{newAchievements: Array, error: Error|null}>}
 */
export async function checkAchievements() {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { newAchievements: [], error: new Error('Athlete profile not found') };
  }

  const { data, error } = await supabase
    .rpc('check_athlete_achievements', { p_athlete_id: athleteId });

  return { newAchievements: data || [], error };
}

/**
 * Get the XP leaderboard
 * @param {object} options - Leaderboard options
 * @param {number} [options.limit=50] - Number of results
 * @param {number} [options.offset=0] - Offset for pagination
 * @param {string} [options.schoolId] - Filter by school
 * @param {string} [options.sportId] - Filter by sport
 * @returns {Promise<{leaderboard: Array, error: Error|null}>}
 */
export async function getLeaderboard(options = {}) {
  const supabase = await getSupabaseClient();
  const { limit = 50, offset = 0, schoolId, sportId } = options;

  let query = supabase
    .from('xp_leaderboard')
    .select('*')
    .range(offset, offset + limit - 1);

  if (schoolId) {
    query = query.eq('school_id', schoolId);
  }

  if (sportId) {
    query = query.eq('sport_id', sportId);
  }

  const { data, error } = await query;
  return { leaderboard: data, error };
}

/**
 * Get leaderboard position for current athlete
 * @returns {Promise<{position: number|null, totalPlayers: number, error: Error|null}>}
 */
export async function getMyLeaderboardPosition() {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { position: null, totalPlayers: 0, error: null };
  }

  // Get current athlete's position
  const { data: positionData, error: positionError } = await supabase
    .from('xp_leaderboard')
    .select('rank')
    .eq('athlete_id', athleteId)
    .single();

  if (positionError && positionError.code !== 'PGRST116') {
    return { position: null, totalPlayers: 0, error: positionError };
  }

  // Get total player count
  const { count, error: countError } = await supabase
    .from('athletes')
    .select('*', { count: 'exact', head: true })
    .eq('is_searchable', true);

  return {
    position: positionData?.rank || null,
    totalPlayers: count || 0,
    error: countError,
  };
}

/**
 * Get current athlete's XP and level info
 * @returns {Promise<{xpInfo: object|null, error: Error|null}>}
 */
export async function getMyXpInfo() {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { xpInfo: null, error: null };
  }

  const { data, error } = await supabase
    .from('athletes')
    .select('xp_total, level')
    .eq('id', athleteId)
    .single();

  if (error) {
    return { xpInfo: null, error };
  }

  const progress = getXpProgress(data.xp_total, data.level);

  return {
    xpInfo: {
      totalXp: data.xp_total,
      level: data.level,
      xpProgress: progress.current,
      xpRequired: progress.required,
      progressPercentage: progress.percentage,
    },
    error: null,
  };
}

/**
 * Get achievement statistics for an athlete
 * @param {string} [athleteId] - Athlete ID (defaults to current athlete)
 * @returns {Promise<{stats: object, error: Error|null}>}
 */
export async function getAchievementStats(athleteId = null) {
  const supabase = await getSupabaseClient();
  const targetId = athleteId || await getMyAthleteId();

  if (!targetId) {
    return { stats: null, error: new Error('Athlete not found') };
  }

  // Get earned achievements by category
  const { data: earned, error: earnedError } = await supabase
    .from('athlete_achievements')
    .select(`
      achievement:achievements(category, rarity, points)
    `)
    .eq('athlete_id', targetId);

  if (earnedError) {
    return { stats: null, error: earnedError };
  }

  // Get total achievements count
  const { count: totalCount, error: countError } = await supabase
    .from('achievements')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    return { stats: null, error: countError };
  }

  // Calculate stats
  const byCategory = {};
  const byRarity = {};
  let totalPoints = 0;

  earned.forEach(item => {
    const { category, rarity, points } = item.achievement;

    byCategory[category] = (byCategory[category] || 0) + 1;
    byRarity[rarity] = (byRarity[rarity] || 0) + 1;
    totalPoints += points;
  });

  return {
    stats: {
      earned: earned.length,
      total: totalCount,
      percentage: Math.round((earned.length / totalCount) * 100),
      totalPoints,
      byCategory,
      byRarity,
    },
    error: null,
  };
}

/**
 * Get recently earned achievements across the platform
 * @param {number} limit - Number of achievements to return
 * @returns {Promise<{achievements: Array, error: Error|null}>}
 */
export async function getRecentAchievements(limit = 20) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('athlete_achievements')
    .select(`
      id,
      earned_at,
      athlete:athletes(
        id,
        profile:profiles(first_name, last_name, avatar_url),
        school:schools(name, short_name)
      ),
      achievement:achievements(*)
    `)
    .order('earned_at', { ascending: false })
    .limit(limit);

  return { achievements: data, error };
}

/**
 * Get scholar tier for current athlete
 * @returns {Promise<{tier: object|null, error: Error|null}>}
 */
export async function getScholarTier() {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { tier: null, error: null };
  }

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
    // No scholar status found - athlete not qualified
    return { tier: null, error: null };
  }

  return { tier: data, error };
}

/**
 * Get scholar sponsor brands available for a tier
 * @param {string} tierName - Tier name (bronze, silver, gold, platinum)
 * @returns {Promise<{sponsors: Array, error: Error|null}>}
 */
export async function getScholarSponsors(tierName) {
  const supabase = await getSupabaseClient();

  const tierOrder = ['bronze', 'silver', 'gold', 'platinum'];
  const tierIndex = tierOrder.indexOf(tierName);

  if (tierIndex === -1) {
    return { sponsors: [], error: new Error('Invalid tier name') };
  }

  // Get sponsors for this tier and below
  const eligibleTiers = tierOrder.slice(0, tierIndex + 1);

  const { data, error } = await supabase
    .from('scholar_sponsors')
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
    .in('tier_requirement', eligibleTiers)
    .eq('is_active', true);

  return { sponsors: data, error };
}

export default {
  // Constants
  RARITY,
  ACHIEVEMENT_CATEGORIES,
  XP_CONSTANTS,
  // Utility functions
  calculateLevel,
  xpForNextLevel,
  getXpProgress,
  // Achievement functions
  getAchievements,
  getMyAchievements,
  getAthleteAchievements,
  checkAchievements,
  getAchievementStats,
  getRecentAchievements,
  // Leaderboard functions
  getLeaderboard,
  getMyLeaderboardPosition,
  // XP functions
  getMyXpInfo,
  // Scholar functions
  getScholarTier,
  getScholarSponsors,
};
