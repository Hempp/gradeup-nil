/**
 * GradeUp NIL Platform - Athlete Service
 * Handles athlete profile operations, verification, and StatTaq integration.
 *
 * @module services/athlete
 */

import { getSupabaseClient, getCurrentUser, invokeFunction, uploadFile, STORAGE_BUCKETS } from './supabase.js';
import { getMyAthleteId, ACADEMIC_YEARS } from './helpers.js';

export { ACADEMIC_YEARS };

export const DIVISIONS = {
  D1: 'D1',
  D2: 'D2',
  D3: 'D3',
  NAIA: 'NAIA',
  JUCO: 'JUCO',
  OTHER: 'other',
};

export const VERIFICATION_TYPES = {
  ENROLLMENT: 'enrollment',
  SPORT: 'sport',
  GRADES: 'grades',
  IDENTITY: 'identity',
};

export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
};

const ATHLETE_SELECT = `
  *,
  profile:profiles!inner(first_name, last_name, email, avatar_url, bio, phone),
  school:schools(id, name, short_name, city, state, division, conference, logo_url, primary_color, secondary_color),
  sport:sports(id, name, category, gender, icon_name)
`;

const ATHLETE_SELECT_PUBLIC = `
  *,
  profile:profiles!inner(first_name, last_name, avatar_url, bio),
  school:schools(id, name, short_name, city, state, division, conference, logo_url, primary_color),
  sport:sports(id, name, category, gender, icon_name)
`;

export async function createAthleteProfile(data) {
  const result = await invokeFunction('create-athlete', data);
  if (result.error) return { athlete: null, error: result.error };
  return { athlete: result.data?.athlete || null, error: null };
}

export async function getMyAthleteProfile() {
  const supabase = await getSupabaseClient();
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { athlete: null, error: userError || new Error('Not authenticated') };
  }

  const { data, error } = await supabase
    .from('athletes')
    .select(ATHLETE_SELECT)
    .eq('profile_id', user.id)
    .single();

  return { athlete: data, error };
}

export async function getAthleteById(athleteId) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('athletes')
    .select(ATHLETE_SELECT_PUBLIC)
    .eq('id', athleteId)
    .eq('is_searchable', true)
    .single();

  return { athlete: data, error };
}

export async function updateAthleteProfile(updates) {
  const supabase = await getSupabaseClient();
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { athlete: null, error: userError || new Error('Not authenticated') };
  }

  // Remove read-only fields
  const readOnlyFields = [
    'id', 'profile_id', 'total_followers', 'gradeup_score',
    'enrollment_verified', 'enrollment_verified_at',
    'sport_verified', 'sport_verified_at',
    'grades_verified', 'grades_verified_at',
    'identity_verified', 'identity_verified_at',
    'created_at', 'updated_at'
  ];

  const safeUpdates = { ...updates };
  readOnlyFields.forEach(field => delete safeUpdates[field]);

  const { data, error } = await supabase
    .from('athletes')
    .update(safeUpdates)
    .eq('profile_id', user.id)
    .select(ATHLETE_SELECT)
    .single();

  return { athlete: data, error };
}

export function updateSocialHandles(socials) {
  return updateAthleteProfile({
    instagram_handle: socials.instagram_handle,
    twitter_handle: socials.twitter_handle,
    tiktok_handle: socials.tiktok_handle,
  });
}

export function updateAvailabilitySettings(settings) {
  return updateAthleteProfile(settings);
}

export async function uploadAvatar(file) {
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { avatarUrl: null, error: userError || new Error('Not authenticated') };
  }

  const ext = file.name.split('.').pop();
  const filename = `${user.id}/avatar-${Date.now()}.${ext}`;

  const { publicUrl } = await uploadFile(STORAGE_BUCKETS.AVATARS, filename, file, {
    contentType: file.type,
    upsert: true,
  });

  const supabase = await getSupabaseClient();
  await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);

  return { avatarUrl: publicUrl, error: null };
}

/**
 * Calculate GradeUp Score for an athlete (legacy v1 endpoint)
 * @deprecated Use calculateGradeUpScore() instead for v2.0 scoring
 * @param {string} [athleteId] - Athlete ID (optional, defaults to current user)
 * @returns {Promise<{score: object | null, error: Error | null}>}
 */
export async function getGradeUpScore(athleteId) {
  const body = athleteId ? { athlete_id: athleteId } : {};
  const result = await invokeFunction('calculate-score', body);
  if (result.error) return { score: null, error: result.error };
  return { score: result.data, error: null };
}

// ============================================================================
// GRADEUP SCORE ENGINE v2.0
// ============================================================================

/**
 * Calculate comprehensive GradeUp Score (0-1000) for an athlete
 *
 * Components:
 * - Athletic Score (0-400): Sport tier, rating, deals, reviews
 * - Social Score (0-300): Follower count with logarithmic scaling
 * - Academic Score (0-300): GPA with multipliers for excellence and consistency
 *
 * @param {string} [athleteId] - Athlete ID (optional, defaults to current user)
 * @returns {Promise<{data: object | null, error: Error | null}>}
 */
export async function calculateGradeUpScore(athleteId) {
  const body = athleteId ? { athlete_id: athleteId } : {};
  const result = await invokeFunction('calculate-gradeup-score', body);

  if (result.error) {
    return { data: null, error: result.error };
  }

  return { data: result.data, error: null };
}

/**
 * Get detailed breakdown of an athlete's GradeUp Score
 * @param {string} [athleteId] - Athlete ID (optional, defaults to current user)
 * @returns {Promise<{breakdown: object | null, error: Error | null}>}
 */
export async function getScoreBreakdown(athleteId) {
  const body = athleteId ? { athlete_id: athleteId } : {};
  const result = await invokeFunction('calculate-gradeup-score?action=breakdown', body);

  if (result.error) {
    return { breakdown: null, error: result.error };
  }

  return { breakdown: result.data, error: null };
}

/**
 * Get score history for an athlete (for trend analysis)
 * @param {string} [athleteId] - Athlete ID (optional, defaults to current user)
 * @param {number} [limit=10] - Maximum number of history entries to return
 * @returns {Promise<{history: object | null, error: Error | null}>}
 */
export async function getScoreHistory(athleteId, limit = 10) {
  const body = { limit };
  if (athleteId) body.athlete_id = athleteId;

  const result = await invokeFunction('calculate-gradeup-score?action=history', body);

  if (result.error) {
    return { history: null, error: result.error };
  }

  return { history: result.data, error: null };
}

/**
 * Batch calculate GradeUp Scores for multiple athletes
 * @param {string[]} athleteIds - Array of athlete IDs
 * @returns {Promise<{results: object | null, error: Error | null}>}
 */
export async function batchCalculateScores(athleteIds) {
  if (!Array.isArray(athleteIds) || athleteIds.length === 0) {
    return { results: null, error: new Error('athleteIds array is required') };
  }

  const result = await invokeFunction('calculate-gradeup-score?action=batch', {
    athlete_ids: athleteIds,
  });

  if (result.error) {
    return { results: null, error: result.error };
  }

  return { results: result.data, error: null };
}

// ============================================================================
// ACADEMIC RECORDS MANAGEMENT
// ============================================================================

/**
 * Add an academic record for the current athlete
 * @param {object} record - Academic record data
 * @param {string} record.semester - 'fall', 'spring', 'summer', or 'winter'
 * @param {number} record.year - Academic year (e.g., 2024)
 * @param {number} record.gpa - Semester GPA (0.0-4.0)
 * @param {number} [record.credits] - Credits taken
 * @param {boolean} [record.deans_list] - Dean's List status
 * @param {boolean} [record.honor_roll] - Honor Roll status
 * @returns {Promise<{record: object | null, error: Error | null}>}
 */
export async function addAcademicRecord(record) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { record: null, error: new Error('Athlete profile not found') };
  }

  // Validate required fields
  if (!record.semester || !record.year || record.gpa === undefined) {
    return { record: null, error: new Error('semester, year, and gpa are required') };
  }

  // Validate GPA range
  if (record.gpa < 0 || record.gpa > 4.0) {
    return { record: null, error: new Error('GPA must be between 0.0 and 4.0') };
  }

  const { data, error } = await supabase
    .from('academic_records')
    .insert({
      athlete_id: athleteId,
      semester: record.semester,
      year: record.year,
      gpa: record.gpa,
      credits: record.credits || null,
      deans_list: record.deans_list || false,
      honor_roll: record.honor_roll || false,
      academic_all_american: record.academic_all_american || false,
    })
    .select()
    .single();

  return { record: data, error };
}

/**
 * Update an existing academic record
 * @param {string} recordId - Academic record ID
 * @param {object} updates - Fields to update
 * @returns {Promise<{record: object | null, error: Error | null}>}
 */
export async function updateAcademicRecord(recordId, updates) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { record: null, error: new Error('Athlete profile not found') };
  }

  // Remove fields that shouldn't be updated
  const safeUpdates = { ...updates };
  delete safeUpdates.id;
  delete safeUpdates.athlete_id;
  delete safeUpdates.verified;
  delete safeUpdates.verified_at;
  delete safeUpdates.verified_by;
  delete safeUpdates.created_at;

  const { data, error } = await supabase
    .from('academic_records')
    .update(safeUpdates)
    .eq('id', recordId)
    .eq('athlete_id', athleteId)
    .eq('verified', false) // Can only update unverified records
    .select()
    .single();

  return { record: data, error };
}

/**
 * Get all academic records for the current athlete
 * @returns {Promise<{records: object[] | null, error: Error | null}>}
 */
export async function getAcademicRecords() {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { records: null, error: new Error('Athlete profile not found') };
  }

  const { data, error } = await supabase
    .from('academic_records')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('year', { ascending: false })
    .order('semester', { ascending: false });

  return { records: data, error };
}

/**
 * Delete an unverified academic record
 * @param {string} recordId - Academic record ID
 * @returns {Promise<{error: Error | null}>}
 */
export async function deleteAcademicRecord(recordId) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { error: new Error('Athlete profile not found') };
  }

  const { error } = await supabase
    .from('academic_records')
    .delete()
    .eq('id', recordId)
    .eq('athlete_id', athleteId)
    .eq('verified', false); // Can only delete unverified records

  return { error };
}

// ============================================================================
// MAJOR CATEGORIES
// ============================================================================

/**
 * Get all available major categories for industry matching
 * @returns {Promise<{categories: object[] | null, error: Error | null}>}
 */
export async function getMajorCategories() {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('major_categories')
    .select('*')
    .eq('is_active', true)
    .order('name');

  return { categories: data, error };
}

/**
 * Update athlete's major category for brand matching
 * @param {string} majorCategoryId - Major category ID
 * @returns {Promise<{athlete: object | null, error: Error | null}>}
 */
export async function updateMajorCategory(majorCategoryId) {
  return updateAthleteProfile({ major_category_id: majorCategoryId });
}

export async function getVerificationStatus() {
  const { athlete, error } = await getMyAthleteProfile();

  if (error || !athlete) {
    return { verification: null, error };
  }

  return {
    verification: {
      enrollment: { verified: athlete.enrollment_verified, verified_at: athlete.enrollment_verified_at },
      sport: { verified: athlete.sport_verified, verified_at: athlete.sport_verified_at },
      grades: { verified: athlete.grades_verified, verified_at: athlete.grades_verified_at },
      identity: { verified: athlete.identity_verified, verified_at: athlete.identity_verified_at },
      is_fully_verified: athlete.enrollment_verified && athlete.sport_verified && athlete.grades_verified && athlete.identity_verified,
    },
    error: null,
  };
}

export async function submitVerificationRequest(verificationType, data = {}) {
  const supabase = await getSupabaseClient();
  const { athlete, error: athleteError } = await getMyAthleteProfile();

  if (athleteError || !athlete) {
    return { request: null, error: athleteError || new Error('Athlete profile not found') };
  }

  const { data: existing } = await supabase
    .from('verification_requests')
    .select('id, status')
    .eq('athlete_id', athlete.id)
    .eq('verification_type', verificationType)
    .eq('status', VERIFICATION_STATUS.PENDING)
    .single();

  if (existing) {
    return { request: null, error: new Error('A pending verification request already exists') };
  }

  const { data: request, error } = await supabase
    .from('verification_requests')
    .insert({
      athlete_id: athlete.id,
      verification_type: verificationType,
      document_urls: data.document_urls || [],
      document_type: data.document_type,
    })
    .select()
    .single();

  return { request, error };
}

export async function getVerificationRequests() {
  const supabase = await getSupabaseClient();
  const { athlete, error: athleteError } = await getMyAthleteProfile();

  if (athleteError || !athlete) {
    return { requests: null, error: athleteError || new Error('Athlete profile not found') };
  }

  const { data, error } = await supabase
    .from('verification_requests')
    .select('*')
    .eq('athlete_id', athlete.id)
    .order('created_at', { ascending: false });

  return { requests: data, error };
}

export async function uploadVerificationDocument(verificationType, file) {
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { url: null, error: userError || new Error('Not authenticated') };
  }

  const ext = file.name.split('.').pop();
  const filename = `${user.id}/${verificationType}/${Date.now()}.${ext}`;

  const { publicUrl } = await uploadFile(STORAGE_BUCKETS.DOCUMENTS, filename, file, {
    contentType: file.type,
  });

  return { url: publicUrl, error: null };
}

export async function connectStatTaq() {
  const result = await invokeFunction('stattaq-connect', {});
  if (result.error) return { authUrl: null, error: result.error };
  return { authUrl: result.data?.auth_url || null, error: null };
}

export async function syncStatTaqData(syncType = 'full') {
  const result = await invokeFunction('stattaq-sync', { sync_type: syncType });
  if (result.error) return { result: null, error: result.error };
  return { result: result.data, error: null };
}

export async function getStatTaqConnection() {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) return { connection: null, error: null };

  const { data, error } = await supabase
    .from('stattaq_accounts')
    .select('id, stattaq_user_id, sync_enabled, last_sync_at, last_sync_status, is_active')
    .eq('athlete_id', athleteId)
    .eq('is_active', true)
    .single();

  return { connection: data, error: error?.code === 'PGRST116' ? null : error };
}

export async function getStatTaqData() {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) return { data: null, error: null };

  const { data, error } = await supabase
    .from('stattaq_data')
    .select('*')
    .eq('athlete_id', athleteId)
    .single();

  return { data, error: error?.code === 'PGRST116' ? null : error };
}

export async function disconnectStatTaq() {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { error: new Error('Athlete profile not found') };
  }

  const { error } = await supabase
    .from('stattaq_accounts')
    .update({ is_active: false, disconnected_at: new Date().toISOString() })
    .eq('athlete_id', athleteId);

  return { error };
}

export async function getSchools(filters = {}) {
  const supabase = await getSupabaseClient();

  let query = supabase.from('schools').select('*').eq('is_active', true).order('name');

  if (filters.division) query = query.eq('division', filters.division);
  if (filters.state) query = query.eq('state', filters.state);
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,short_name.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  return { schools: data, error };
}

export async function getSports(filters = {}) {
  const supabase = await getSupabaseClient();

  let query = supabase.from('sports').select('*').eq('is_active', true).order('name');

  if (filters.category) query = query.eq('category', filters.category);
  if (filters.gender) query = query.eq('gender', filters.gender);

  const { data, error } = await query;
  return { sports: data, error };
}

export async function getNotifications(options = {}) {
  const supabase = await getSupabaseClient();
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { notifications: null, error: userError };
  }

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (options.unreadOnly) query = query.is('read_at', null);
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  return { notifications: data, error };
}

export async function markNotificationsAsRead(notificationIds) {
  const supabase = await getSupabaseClient();
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { error: userError || new Error('Not authenticated') };
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .in('id', notificationIds);

  return { error };
}

export async function markAllNotificationsAsRead() {
  const supabase = await getSupabaseClient();
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { error: userError || new Error('Not authenticated') };
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null);

  return { error };
}

export default {
  // Profile management
  createAthleteProfile,
  getMyAthleteProfile,
  getAthleteById,
  updateAthleteProfile,
  updateSocialHandles,
  updateAvailabilitySettings,
  uploadAvatar,

  // GradeUp Score Engine v2.0
  calculateGradeUpScore,
  getScoreBreakdown,
  getScoreHistory,
  batchCalculateScores,
  getGradeUpScore, // Legacy v1

  // Academic records
  addAcademicRecord,
  updateAcademicRecord,
  getAcademicRecords,
  deleteAcademicRecord,

  // Major categories
  getMajorCategories,
  updateMajorCategory,

  // Verification
  getVerificationStatus,
  submitVerificationRequest,
  getVerificationRequests,
  uploadVerificationDocument,

  // StatTaq integration
  connectStatTaq,
  syncStatTaqData,
  getStatTaqConnection,
  getStatTaqData,
  disconnectStatTaq,

  // Reference data
  getSchools,
  getSports,

  // Notifications
  getNotifications,
  markNotificationsAsRead,
  markAllNotificationsAsRead,

  // Constants
  DIVISIONS,
  ACADEMIC_YEARS,
  VERIFICATION_TYPES,
  VERIFICATION_STATUS,
};
