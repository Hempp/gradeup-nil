/**
 * GradeUp NIL Platform - Brand Matching Service
 *
 * Intelligent brand-athlete matching based on major/industry alignment,
 * academic performance, and other compatibility factors.
 *
 * @module services/matching
 * @version 1.0.0
 */

import { getSupabaseClient, getCurrentUser, invokeFunction } from './supabase.js';
import { getMyAthleteId } from './helpers.js';

/**
 * @typedef {object} MatchScore
 * @property {string} id - Match record ID
 * @property {string} athlete_id - Athlete UUID
 * @property {string} brand_id - Brand UUID
 * @property {number} match_score - Score 0-100
 * @property {boolean} major_match - Whether major/industry match exists
 * @property {boolean} industry_match - Whether industry match exists
 * @property {boolean} values_match - Whether values align
 * @property {string} calculated_at - When score was calculated
 */

/**
 * @typedef {object} MajorCategory
 * @property {string} id - Category UUID
 * @property {string} name - Category name
 * @property {string} [description] - Category description
 * @property {string[]} industries - Related industries
 */

/**
 * @typedef {object} BrandIndustry
 * @property {string} id - Record UUID
 * @property {string} brand_id - Brand UUID
 * @property {string} industry - Industry name
 * @property {boolean} is_primary - Whether this is the primary industry
 */

/**
 * Major to industry mapping for reference
 * @readonly
 */
export const MAJOR_INDUSTRY_MAP = {
  'Business & Finance': ['finance', 'banking', 'insurance', 'consulting', 'real_estate', 'investment'],
  'Computer Science & IT': ['technology', 'software', 'gaming', 'cybersecurity', 'ai_ml', 'data_science'],
  'Engineering': ['technology', 'automotive', 'aerospace', 'manufacturing', 'energy', 'construction'],
  'Communications & Media': ['media', 'entertainment', 'advertising', 'marketing', 'broadcasting', 'social_media'],
  'Health & Medicine': ['healthcare', 'pharmaceutical', 'fitness', 'nutrition', 'wellness', 'medical_devices'],
  'Education': ['education', 'edtech', 'tutoring', 'youth_development', 'nonprofit'],
  'Arts & Design': ['fashion', 'design', 'entertainment', 'media', 'luxury', 'retail'],
  'Sciences': ['pharmaceutical', 'biotech', 'research', 'environmental', 'energy', 'agriculture'],
  'Social Sciences': ['nonprofit', 'government', 'consulting', 'research', 'hr', 'social_services'],
  'Sports & Recreation': ['sports', 'fitness', 'entertainment', 'apparel', 'equipment', 'media'],
  'Hospitality & Tourism': ['hospitality', 'travel', 'food_beverage', 'entertainment', 'luxury', 'retail'],
  'Agriculture': ['agriculture', 'food_beverage', 'environmental', 'retail', 'manufacturing'],
};

/**
 * Common industries list
 * @readonly
 */
export const INDUSTRIES = [
  'sports', 'fitness', 'apparel', 'technology', 'software', 'gaming',
  'finance', 'banking', 'insurance', 'healthcare', 'pharmaceutical',
  'food_beverage', 'retail', 'automotive', 'media', 'entertainment',
  'fashion', 'luxury', 'education', 'nonprofit', 'energy', 'real_estate',
  'hospitality', 'travel', 'agriculture', 'manufacturing', 'consulting',
];

/**
 * Calculate match score between an athlete and brand
 * Uses the database function for consistent scoring
 *
 * @param {string} athleteId - Athlete UUID
 * @param {string} brandId - Brand UUID
 * @returns {Promise<{score: number | null, error: Error | null}>}
 */
export async function calculateMatchScore(athleteId, brandId) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .rpc('calculate_brand_match', {
      p_athlete_id: athleteId,
      p_brand_id: brandId,
    });

  if (error) {
    return { score: null, error };
  }

  return { score: data, error: null };
}

/**
 * Get top brand matches for the current athlete
 *
 * @param {number} [limit=10] - Maximum number of matches to return
 * @param {object} [filters] - Optional filters
 * @param {number} [filters.minScore] - Minimum match score (0-100)
 * @param {string[]} [filters.industries] - Filter by industries
 * @returns {Promise<{matches: object[] | null, error: Error | null}>}
 */
export async function getTopMatches(limit = 10, filters = {}) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { matches: null, error: new Error('Athlete profile not found') };
  }

  let query = supabase
    .from('athlete_brand_matches')
    .select(`
      *,
      brand:brands(
        id,
        company_name,
        industry,
        logo_url,
        website_url,
        is_verified,
        city,
        state
      )
    `)
    .eq('athlete_id', athleteId)
    .order('match_score', { ascending: false })
    .limit(limit);

  if (filters.minScore) {
    query = query.gte('match_score', filters.minScore);
  }

  const { data, error } = await query;

  if (error) {
    return { matches: null, error };
  }

  // Filter by industries if specified (post-query filter since it's a join)
  let matches = data || [];
  if (filters.industries && filters.industries.length > 0) {
    matches = matches.filter((m) =>
      m.brand?.industry && filters.industries.some((ind) =>
        m.brand.industry.toLowerCase().includes(ind.toLowerCase())
      )
    );
  }

  return { matches, error: null };
}

/**
 * Get top matches for an athlete by ID (for brands viewing athletes)
 *
 * @param {string} athleteId - Athlete UUID
 * @param {number} [limit=10] - Maximum matches to return
 * @returns {Promise<{matches: object[] | null, error: Error | null}>}
 */
export async function getTopMatchesForAthlete(athleteId, limit = 10) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('athlete_brand_matches')
    .select(`
      *,
      brand:brands(
        id,
        company_name,
        industry,
        logo_url,
        is_verified
      )
    `)
    .eq('athlete_id', athleteId)
    .order('match_score', { ascending: false })
    .limit(limit);

  return { matches: data, error };
}

/**
 * Get athletes matching a brand's profile and preferences
 *
 * @param {string} brandId - Brand UUID
 * @param {object} [filters] - Optional filters
 * @param {number} [filters.minScore] - Minimum match score
 * @param {number} [filters.minGpa] - Minimum GPA
 * @param {string[]} [filters.sports] - Filter by sport IDs
 * @param {string[]} [filters.schools] - Filter by school IDs
 * @param {string[]} [filters.divisions] - Filter by divisions
 * @param {number} [filters.limit=20] - Maximum results
 * @param {number} [filters.offset=0] - Offset for pagination
 * @returns {Promise<{athletes: object[] | null, total: number, error: Error | null}>}
 */
export async function getMatchingAthletes(brandId, filters = {}) {
  const supabase = await getSupabaseClient();
  const { limit = 20, offset = 0, minScore, minGpa, sports, schools, divisions } = filters;

  // First get existing matches
  let matchQuery = supabase
    .from('athlete_brand_matches')
    .select(`
      *,
      athlete:athletes(
        id,
        gpa,
        cumulative_gpa,
        gradeup_score,
        total_followers,
        major,
        academic_year,
        position,
        scholar_tier,
        verified,
        enrollment_verified,
        sport_verified,
        grades_verified,
        accepting_deals,
        is_searchable,
        profile:profiles(first_name, last_name, avatar_url),
        school:schools(id, name, short_name, city, state, division),
        sport:sports(id, name)
      )
    `)
    .eq('brand_id', brandId)
    .eq('athlete.is_searchable', true)
    .eq('athlete.accepting_deals', true)
    .order('match_score', { ascending: false });

  if (minScore) {
    matchQuery = matchQuery.gte('match_score', minScore);
  }

  const { data: matchedAthletes, error: matchError } = await matchQuery;

  if (matchError) {
    return { athletes: null, total: 0, error: matchError };
  }

  // Apply additional filters
  let filtered = (matchedAthletes || []).filter((m) => m.athlete !== null);

  if (minGpa) {
    filtered = filtered.filter((m) => {
      const gpa = m.athlete.cumulative_gpa || m.athlete.gpa;
      return gpa && gpa >= minGpa;
    });
  }

  if (sports && sports.length > 0) {
    filtered = filtered.filter((m) =>
      m.athlete.sport?.id && sports.includes(m.athlete.sport.id)
    );
  }

  if (schools && schools.length > 0) {
    filtered = filtered.filter((m) =>
      m.athlete.school?.id && schools.includes(m.athlete.school.id)
    );
  }

  if (divisions && divisions.length > 0) {
    filtered = filtered.filter((m) =>
      m.athlete.school?.division && divisions.includes(m.athlete.school.division)
    );
  }

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    athletes: paginated,
    total,
    error: null,
  };
}

/**
 * Get the major to industry mapping from the database
 *
 * @returns {Promise<{map: object | null, error: Error | null}>}
 */
export async function getMajorIndustryMap() {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('major_categories')
    .select('*')
    .order('name');

  if (error) {
    return { map: null, error };
  }

  // Convert to map format
  const map = {};
  for (const category of data || []) {
    map[category.name] = category.industries || [];
  }

  return { map, error: null };
}

/**
 * Get all major categories
 *
 * @returns {Promise<{categories: MajorCategory[] | null, error: Error | null}>}
 */
export async function getMajorCategories() {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('major_categories')
    .select('*')
    .order('name');

  return { categories: data, error };
}

/**
 * Get a brand's industries
 *
 * @param {string} brandId - Brand UUID
 * @returns {Promise<{industries: BrandIndustry[] | null, error: Error | null}>}
 */
export async function getBrandIndustries(brandId) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('brand_industries')
    .select('*')
    .eq('brand_id', brandId)
    .order('is_primary', { ascending: false });

  return { industries: data, error };
}

/**
 * Set industries for the current user's brand
 *
 * @param {object[]} industries - Array of {industry: string, is_primary: boolean}
 * @returns {Promise<{industries: BrandIndustry[] | null, error: Error | null}>}
 */
export async function setBrandIndustries(industries) {
  const supabase = await getSupabaseClient();
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { industries: null, error: userError || new Error('Not authenticated') };
  }

  // Get brand ID
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  if (brandError || !brand) {
    return { industries: null, error: brandError || new Error('Brand profile not found') };
  }

  // Delete existing industries
  await supabase
    .from('brand_industries')
    .delete()
    .eq('brand_id', brand.id);

  // Ensure only one primary
  let hasPrimary = false;
  const toInsert = industries.map((ind) => {
    const isPrimary = !hasPrimary && ind.is_primary;
    if (isPrimary) hasPrimary = true;
    return {
      brand_id: brand.id,
      industry: ind.industry,
      is_primary: isPrimary,
    };
  });

  // Insert new industries
  const { data, error } = await supabase
    .from('brand_industries')
    .insert(toInsert)
    .select();

  return { industries: data, error };
}

/**
 * Add an industry to a brand
 *
 * @param {string} industry - Industry name
 * @param {boolean} [isPrimary=false] - Whether this is the primary industry
 * @returns {Promise<{industry: BrandIndustry | null, error: Error | null}>}
 */
export async function addBrandIndustry(industry, isPrimary = false) {
  const supabase = await getSupabaseClient();
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { industry: null, error: userError || new Error('Not authenticated') };
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  if (!brand) {
    return { industry: null, error: new Error('Brand profile not found') };
  }

  // If setting as primary, unset existing primary
  if (isPrimary) {
    await supabase
      .from('brand_industries')
      .update({ is_primary: false })
      .eq('brand_id', brand.id)
      .eq('is_primary', true);
  }

  const { data, error } = await supabase
    .from('brand_industries')
    .insert({
      brand_id: brand.id,
      industry,
      is_primary: isPrimary,
    })
    .select()
    .single();

  return { industry: data, error };
}

/**
 * Remove an industry from a brand
 *
 * @param {string} industryId - Industry record UUID
 * @returns {Promise<{success: boolean, error: Error | null}>}
 */
export async function removeBrandIndustry(industryId) {
  const supabase = await getSupabaseClient();
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { success: false, error: userError || new Error('Not authenticated') };
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  if (!brand) {
    return { success: false, error: new Error('Brand profile not found') };
  }

  const { error } = await supabase
    .from('brand_industries')
    .delete()
    .eq('id', industryId)
    .eq('brand_id', brand.id);

  return { success: !error, error };
}

/**
 * Recalculate match scores for an athlete with all brands
 *
 * @param {string} athleteId - Athlete UUID
 * @returns {Promise<{count: number, error: Error | null}>}
 */
export async function recalculateAthleteMatches(athleteId) {
  const supabase = await getSupabaseClient();

  // Get all verified brands
  const { data: brands, error: brandsError } = await supabase
    .from('brands')
    .select('id')
    .eq('is_verified', true);

  if (brandsError) {
    return { count: 0, error: brandsError };
  }

  let successCount = 0;
  for (const brand of brands || []) {
    const { error } = await supabase.rpc('calculate_brand_match', {
      p_athlete_id: athleteId,
      p_brand_id: brand.id,
    });
    if (!error) successCount++;
  }

  return { count: successCount, error: null };
}

/**
 * Recalculate match scores for a brand with all athletes
 *
 * @param {string} brandId - Brand UUID
 * @returns {Promise<{count: number, error: Error | null}>}
 */
export async function recalculateBrandMatches(brandId) {
  const supabase = await getSupabaseClient();

  // Get all searchable athletes
  const { data: athletes, error: athletesError } = await supabase
    .from('athletes')
    .select('id')
    .eq('is_searchable', true)
    .eq('accepting_deals', true);

  if (athletesError) {
    return { count: 0, error: athletesError };
  }

  let successCount = 0;
  for (const athlete of athletes || []) {
    const { error } = await supabase.rpc('calculate_brand_match', {
      p_athlete_id: athlete.id,
      p_brand_id: brandId,
    });
    if (!error) successCount++;
  }

  return { count: successCount, error: null };
}

/**
 * Get match statistics for an athlete
 *
 * @param {string} [athleteId] - Athlete UUID (defaults to current user)
 * @returns {Promise<{stats: object | null, error: Error | null}>}
 */
export async function getMatchStats(athleteId) {
  const supabase = await getSupabaseClient();

  const targetAthleteId = athleteId || await getMyAthleteId();
  if (!targetAthleteId) {
    return { stats: null, error: new Error('Athlete not found') };
  }

  const { data, error } = await supabase
    .from('athlete_brand_matches')
    .select('match_score, major_match, industry_match, values_match')
    .eq('athlete_id', targetAthleteId);

  if (error) {
    return { stats: null, error };
  }

  const matches = data || [];
  const stats = {
    total_matches: matches.length,
    average_score: matches.length > 0
      ? Math.round(matches.reduce((sum, m) => sum + m.match_score, 0) / matches.length)
      : 0,
    high_matches: matches.filter((m) => m.match_score >= 80).length,
    medium_matches: matches.filter((m) => m.match_score >= 60 && m.match_score < 80).length,
    low_matches: matches.filter((m) => m.match_score < 60).length,
    major_matches: matches.filter((m) => m.major_match).length,
    industry_matches: matches.filter((m) => m.industry_match).length,
  };

  return { stats, error: null };
}

/**
 * Find athletes by industry alignment
 *
 * @param {string[]} industries - Industries to match
 * @param {object} [options] - Search options
 * @param {number} [options.limit=20] - Maximum results
 * @param {number} [options.minGpa] - Minimum GPA
 * @returns {Promise<{athletes: object[] | null, error: Error | null}>}
 */
export async function findAthletesByIndustry(industries, options = {}) {
  const supabase = await getSupabaseClient();
  const { limit = 20, minGpa } = options;

  // Get major categories that match these industries
  const { data: categories } = await supabase
    .from('major_categories')
    .select('id, industries')
    .overlaps('industries', industries);

  if (!categories || categories.length === 0) {
    return { athletes: [], error: null };
  }

  const categoryIds = categories.map((c) => c.id);

  let query = supabase
    .from('athletes')
    .select(`
      *,
      profile:profiles(first_name, last_name, avatar_url),
      school:schools(id, name, short_name, division),
      sport:sports(id, name),
      major_category:major_categories(id, name, industries)
    `)
    .in('major_category_id', categoryIds)
    .eq('is_searchable', true)
    .eq('accepting_deals', true)
    .order('gradeup_score', { ascending: false })
    .limit(limit);

  if (minGpa) {
    query = query.gte('gpa', minGpa);
  }

  const { data, error } = await query;

  return { athletes: data, error };
}

export default {
  calculateMatchScore,
  getTopMatches,
  getTopMatchesForAthlete,
  getMatchingAthletes,
  getMajorIndustryMap,
  getMajorCategories,
  getBrandIndustries,
  setBrandIndustries,
  addBrandIndustry,
  removeBrandIndustry,
  recalculateAthleteMatches,
  recalculateBrandMatches,
  getMatchStats,
  findAthletesByIndustry,
  MAJOR_INDUSTRY_MAP,
  INDUSTRIES,
};
