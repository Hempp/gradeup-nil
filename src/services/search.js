/**
 * GradeUp NIL Platform - Athlete Search Service
 *
 * Provides comprehensive athlete search functionality with filtering,
 * sorting, and pagination for brand discovery.
 *
 * @module services/search
 * @version 1.0.0
 */

import { getSupabaseClient, getCurrentUser, invokeFunction } from './supabase.js';

/**
 * @typedef {object} SearchFilters
 * @property {string[]} [sport_ids] - Filter by sport UUIDs
 * @property {string[]} [school_ids] - Filter by school UUIDs
 * @property {string[]} [divisions] - Filter by divisions (D1, D2, D3, NAIA, JUCO)
 * @property {number} [min_gpa] - Minimum GPA (0-4.0)
 * @property {number} [max_gpa] - Maximum GPA (0-4.0)
 * @property {number} [min_followers] - Minimum total followers
 * @property {number} [max_followers] - Maximum total followers
 * @property {number} [min_gradeup_score] - Minimum GradeUp Score (0-100)
 * @property {string[]} [academic_years] - Filter by academic year (freshman, sophomore, etc.)
 * @property {boolean} [verified_only] - Only show fully verified athletes
 * @property {boolean} [accepting_deals] - Only show athletes accepting deals (default: true)
 * @property {string} [search_query] - Text search query (name, school, sport)
 * @property {'gradeup_score' | 'total_followers' | 'gpa' | 'nil_valuation'} [sort_by] - Sort field
 * @property {'asc' | 'desc'} [sort_order] - Sort direction
 * @property {number} [page] - Page number (1-based)
 * @property {number} [page_size] - Results per page (max 100)
 */

/**
 * @typedef {object} AthleteResult
 * @property {string} id - Athlete UUID
 * @property {object} profile - Profile data (first_name, last_name, avatar_url)
 * @property {object} school - School data (name, short_name, city, state, division)
 * @property {object} sport - Sport data (name, category)
 * @property {number} gpa - Grade point average
 * @property {string} major - Academic major
 * @property {string} academic_year - Current year
 * @property {string} position - Athletic position
 * @property {number} total_followers - Total social media followers
 * @property {number} gradeup_score - Calculated GradeUp Score
 * @property {number} nil_valuation - Estimated NIL value
 * @property {boolean} enrollment_verified - Enrollment verification status
 * @property {boolean} sport_verified - Sport verification status
 * @property {boolean} grades_verified - Grades verification status
 */

/**
 * @typedef {object} SearchResponse
 * @property {AthleteResult[]} athletes - Array of athlete results
 * @property {object} pagination - Pagination info
 * @property {number} pagination.page - Current page
 * @property {number} pagination.page_size - Results per page
 * @property {number} pagination.total - Total matching athletes
 * @property {number} pagination.total_pages - Total pages
 */

/**
 * Search for athletes with filters (uses Edge Function)
 *
 * @param {SearchFilters} filters - Search filters
 * @returns {Promise<{data: SearchResponse | null, error: Error | null}>}
 */
export async function searchAthletes(filters = {}) {
  const { data, error } = await invokeFunction('search-athletes', filters);
  return { data: error ? null : data, error: error || null };
}

/**
 * Search for athletes using client-side query (fallback/direct access)
 * This bypasses the Edge Function for simpler queries
 *
 * @param {SearchFilters} filters - Search filters
 * @returns {Promise<{data: SearchResponse | null, error: Error | null}>}
 */
export async function searchAthletesLocal(filters = {}) {
  const supabase = await getSupabaseClient();

  // Build base query with joins
  let query = supabase
      .from('athletes')
      .select(
        `
        id,
        gpa,
        major,
        academic_year,
        position,
        jersey_number,
        total_followers,
        instagram_followers,
        twitter_followers,
        tiktok_followers,
        instagram_handle,
        twitter_handle,
        tiktok_handle,
        gradeup_score,
        nil_valuation,
        deals_completed,
        avg_deal_rating,
        enrollment_verified,
        sport_verified,
        grades_verified,
        accepting_deals,
        min_deal_amount,
        featured,
        profile:profiles!inner(id, first_name, last_name, avatar_url, bio),
        school:schools(id, name, short_name, city, state, division, conference, primary_color),
        sport:sports(id, name, category, gender, icon_name)
      `,
        { count: 'exact' }
      )
      .eq('is_searchable', true);

    // Apply accepting_deals filter (default true)
    if (filters.accepting_deals !== false) {
      query = query.eq('accepting_deals', true);
    }

    // Apply sport filter
    if (filters.sport_ids?.length) {
      query = query.in('sport_id', filters.sport_ids);
    }

    // Apply school filter
    if (filters.school_ids?.length) {
      query = query.in('school_id', filters.school_ids);
    }

    // Apply division filter via school
    if (filters.divisions?.length) {
      // Note: This requires the school join to be inner if filtering by division
      query = query.in('school.division', filters.divisions);
    }

    // Apply GPA filters
    if (filters.min_gpa !== undefined) {
      query = query.gte('gpa', filters.min_gpa);
    }
    if (filters.max_gpa !== undefined) {
      query = query.lte('gpa', filters.max_gpa);
    }

    // Apply follower filters
    if (filters.min_followers !== undefined) {
      query = query.gte('total_followers', filters.min_followers);
    }
    if (filters.max_followers !== undefined) {
      query = query.lte('total_followers', filters.max_followers);
    }

    // Apply GradeUp Score filter
    if (filters.min_gradeup_score !== undefined) {
      query = query.gte('gradeup_score', filters.min_gradeup_score);
    }

    // Apply academic year filter
    if (filters.academic_years?.length) {
      query = query.in('academic_year', filters.academic_years);
    }

    // Apply verified filter
    if (filters.verified_only) {
      query = query
        .eq('enrollment_verified', true)
        .eq('sport_verified', true)
        .eq('grades_verified', true);
    }

    // Apply sorting
    const sortBy = filters.sort_by || 'gradeup_score';
    const sortOrder = filters.sort_order === 'asc';
    query = query.order(sortBy, { ascending: sortOrder });

    // Apply pagination
    const page = filters.page || 1;
    const pageSize = Math.min(filters.page_size || 20, 100);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

  const { data: athletes, error, count } = await query;

  if (error) {
    return { data: null, error };
  }

  // Log search for analytics (fire and forget)
  getCurrentUser().then(({ user }) => {
    if (user) {
      supabase.from('search_analytics').insert({
        user_id: user.id,
        search_query: filters.search_query || null,
        filters,
        results_count: athletes?.length || 0,
      });
    }
  });

  return {
    data: {
      success: true,
      athletes: athletes || [],
      pagination: {
        page,
        page_size: pageSize,
        total: count || 0,
        total_pages: count ? Math.ceil(count / pageSize) : 0,
      },
    },
    error: null,
  };
}

/**
 * Get featured athletes for homepage/landing display
 *
 * @param {number} [limit=10] - Number of athletes to return
 * @returns {Promise<{athletes: AthleteResult[] | null, error: Error | null}>}
 */
export async function getFeaturedAthletes(limit = 10) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('athletes')
    .select(
      `
      id,
      gpa,
      gradeup_score,
      total_followers,
      nil_valuation,
      position,
      enrollment_verified,
      sport_verified,
      grades_verified,
      featured_order,
      profile:profiles!inner(first_name, last_name, avatar_url),
      school:schools(name, short_name, primary_color),
      sport:sports(name, icon_name)
    `
    )
    .eq('is_searchable', true)
    .eq('featured', true)
    .eq('enrollment_verified', true)
    .order('featured_order', { ascending: true, nullsFirst: false })
    .order('gradeup_score', { ascending: false })
    .limit(limit);

  return { athletes: data, error };
}

/**
 * Get top athletes by GradeUp Score
 *
 * @param {object} [options] - Query options
 * @param {number} [options.limit=20] - Number of athletes
 * @param {string} [options.sport_id] - Filter by sport
 * @param {string} [options.division] - Filter by division
 * @returns {Promise<{athletes: AthleteResult[] | null, error: Error | null}>}
 */
export async function getTopAthletes(options = {}) {
  const supabase = await getSupabaseClient();
  const { limit = 20, sport_id, division } = options;

  let query = supabase
    .from('athletes')
    .select(
      `
      id,
      gpa,
      gradeup_score,
      total_followers,
      nil_valuation,
      position,
      academic_year,
      enrollment_verified,
      sport_verified,
      grades_verified,
      profile:profiles!inner(first_name, last_name, avatar_url),
      school:schools(name, short_name, division, primary_color),
      sport:sports(name, icon_name)
    `
    )
    .eq('is_searchable', true)
    .eq('accepting_deals', true)
    .eq('enrollment_verified', true);

  if (sport_id) {
    query = query.eq('sport_id', sport_id);
  }

  if (division) {
    query = query.eq('school.division', division);
  }

  const { data, error } = await query
    .order('gradeup_score', { ascending: false })
    .limit(limit);

  return { athletes: data, error };
}

/**
 * Get athletes similar to a given athlete
 * (Same sport, similar GPA/followers/score)
 *
 * @param {string} athleteId - Reference athlete UUID
 * @param {number} [limit=6] - Number of similar athletes
 * @returns {Promise<{athletes: AthleteResult[] | null, error: Error | null}>}
 */
export async function getSimilarAthletes(athleteId, limit = 6) {
  const supabase = await getSupabaseClient();

  // First get the reference athlete
  const { data: reference, error: refError } = await supabase
    .from('athletes')
    .select('sport_id, gpa, total_followers, gradeup_score')
    .eq('id', athleteId)
    .single();

  if (refError || !reference) {
    return { athletes: null, error: refError || new Error('Athlete not found') };
  }

  // Find similar athletes
  const gpaRange = 0.5;
  const scoreRange = 15;

  let query = supabase
    .from('athletes')
    .select(
      `
      id,
      gpa,
      gradeup_score,
      total_followers,
      position,
      enrollment_verified,
      sport_verified,
      grades_verified,
      profile:profiles!inner(first_name, last_name, avatar_url),
      school:schools(name, short_name),
      sport:sports(name)
    `
    )
    .eq('is_searchable', true)
    .eq('accepting_deals', true)
    .eq('sport_id', reference.sport_id)
    .neq('id', athleteId);

  // GPA similarity
  if (reference.gpa) {
    query = query
      .gte('gpa', Math.max(0, reference.gpa - gpaRange))
      .lte('gpa', Math.min(4.0, reference.gpa + gpaRange));
  }

  // GradeUp Score similarity
  if (reference.gradeup_score) {
    query = query
      .gte('gradeup_score', Math.max(0, reference.gradeup_score - scoreRange))
      .lte('gradeup_score', Math.min(100, reference.gradeup_score + scoreRange));
  }

  const { data, error } = await query
    .order('gradeup_score', { ascending: false })
    .limit(limit);

  return { athletes: data, error };
}

/**
 * Get athlete details by ID
 *
 * @param {string} athleteId - Athlete UUID
 * @returns {Promise<{athlete: AthleteResult | null, error: Error | null}>}
 */
export async function getAthleteById(athleteId) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('athletes')
    .select(
      `
      *,
      profile:profiles!inner(
        id,
        first_name,
        last_name,
        avatar_url,
        bio,
        email,
        phone
      ),
      school:schools(
        id,
        name,
        short_name,
        city,
        state,
        division,
        conference,
        primary_color,
        secondary_color,
        logo_url
      ),
      sport:sports(
        id,
        name,
        category,
        gender,
        icon_name
      )
    `
    )
    .eq('id', athleteId)
    .eq('is_searchable', true)
    .single();

  return { athlete: data, error };
}

/**
 * Get recent/trending athletes (most viewed in last X days)
 *
 * @param {object} [options] - Query options
 * @param {number} [options.days=7] - Time window in days
 * @param {number} [options.limit=10] - Number of athletes
 * @returns {Promise<{athletes: object[] | null, error: Error | null}>}
 */
export async function getTrendingAthletes(options = {}) {
  const supabase = await getSupabaseClient();
  const { days = 7, limit = 10 } = options;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  // Get view counts per athlete
  const { data: views, error: viewsError } = await supabase
    .from('profile_views')
    .select('athlete_id')
    .gte('created_at', cutoffDate.toISOString())
    .eq('viewer_type', 'brand');

  if (viewsError) {
    return { athletes: null, error: viewsError };
  }

  // Count views per athlete
  const viewCounts = {};
  views?.forEach((v) => {
    viewCounts[v.athlete_id] = (viewCounts[v.athlete_id] || 0) + 1;
  });

  // Get top viewed athlete IDs
  const topAthleteIds = Object.entries(viewCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  if (topAthleteIds.length === 0) {
    return { athletes: [], error: null };
  }

  // Fetch athlete details
  const { data: athletes, error } = await supabase
    .from('athletes')
    .select(
      `
      id,
      gpa,
      gradeup_score,
      total_followers,
      position,
      enrollment_verified,
      sport_verified,
      grades_verified,
      profile:profiles!inner(first_name, last_name, avatar_url),
      school:schools(name, short_name),
      sport:sports(name)
    `
    )
    .in('id', topAthleteIds)
    .eq('is_searchable', true);

  if (error) {
    return { athletes: null, error };
  }

  // Sort by view count and add view count to results
  const sortedAthletes = athletes
    ?.map((a) => ({ ...a, view_count: viewCounts[a.id] || 0 }))
    .sort((a, b) => b.view_count - a.view_count);

  return { athletes: sortedAthletes, error: null };
}

/**
 * Get saved/bookmarked athletes for current brand
 * Note: Requires a saved_athletes table (could be added)
 * For now, this uses recent views as a proxy
 *
 * @returns {Promise<{athletes: AthleteResult[] | null, error: Error | null}>}
 */
export async function getSavedAthletes() {
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { athletes: null, error: userError || new Error('Not authenticated') };
  }

  const supabase = await getSupabaseClient();

  // Get recently viewed athletes as "saved" proxy
  // A full implementation would use a dedicated saved_athletes table
  const { data: views, error: viewsError } = await supabase
    .from('profile_views')
    .select(
      `
      athlete:athletes(
        id,
        gpa,
        gradeup_score,
        total_followers,
        position,
        enrollment_verified,
        sport_verified,
        grades_verified,
        profile:profiles(first_name, last_name, avatar_url),
        school:schools(name, short_name),
        sport:sports(name)
      )
    `
    )
    .eq('viewer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (viewsError) {
    return { athletes: null, error: viewsError };
  }

  // Deduplicate by athlete ID
  const seen = new Set();
  const athletes = views
    ?.filter((v) => {
      if (!v.athlete || seen.has(v.athlete.id)) return false;
      seen.add(v.athlete.id);
      return true;
    })
    .map((v) => v.athlete);

  return { athletes, error: null };
}

/**
 * Quick search by name (typeahead)
 *
 * @param {string} query - Search query (name fragment)
 * @param {number} [limit=10] - Maximum results
 * @returns {Promise<{results: object[] | null, error: Error | null}>}
 */
export async function quickSearchByName(query, limit = 10) {
  if (!query || query.length < 2) {
    return { results: [], error: null };
  }

  const supabase = await getSupabaseClient();

  // Search profiles by name
  const { data, error } = await supabase
    .from('athletes')
    .select(
      `
      id,
      gradeup_score,
      profile:profiles!inner(first_name, last_name, avatar_url),
      school:schools(short_name),
      sport:sports(name)
    `
    )
    .eq('is_searchable', true)
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`, {
      referencedTable: 'profiles',
    })
    .limit(limit);

  return { results: data, error };
}

export default {
  searchAthletes,
  searchAthletesLocal,
  getFeaturedAthletes,
  getTopAthletes,
  getSimilarAthletes,
  getAthleteById,
  getTrendingAthletes,
  getSavedAthletes,
  quickSearchByName,
};
