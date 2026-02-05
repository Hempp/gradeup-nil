/**
 * GradeUp NIL Platform - Brand Service
 *
 * Handles brand profile CRUD operations, company information management,
 * preferences, and analytics for brand accounts.
 *
 * @module services/brand
 * @version 1.0.0
 */

import { getSupabaseClient, getCurrentUser } from './supabase.js';

/**
 * @typedef {object} BrandProfile
 * @property {string} id - Brand ID (UUID)
 * @property {string} profile_id - Associated profile ID
 * @property {string} company_name - Company name
 * @property {string} [company_type] - Type: corporation, agency, local_business, nonprofit
 * @property {string} [industry] - Industry sector
 * @property {string} [website_url] - Company website
 * @property {string} [logo_url] - Logo image URL
 * @property {string} [contact_name] - Primary contact name
 * @property {string} [contact_title] - Contact job title
 * @property {string} [contact_email] - Contact email
 * @property {string} [contact_phone] - Contact phone
 * @property {string} [address_line1] - Street address
 * @property {string} [address_line2] - Address line 2
 * @property {string} [city] - City
 * @property {string} [state] - State
 * @property {string} [zip_code] - ZIP code
 * @property {string} [country] - Country (default: USA)
 * @property {number} total_spent - Total amount spent on deals
 * @property {number} deals_completed - Number of completed deals
 * @property {number} avg_deal_rating - Average rating from athletes
 * @property {number} active_campaigns - Number of active campaigns
 * @property {string[]} [preferred_sports] - Preferred sport IDs
 * @property {string[]} [preferred_schools] - Preferred school IDs
 * @property {string[]} [preferred_divisions] - Preferred divisions (D1, D2, etc.)
 * @property {number} [min_gpa] - Minimum GPA preference
 * @property {number} [min_followers] - Minimum followers preference
 * @property {number} [budget_range_min] - Minimum budget per deal
 * @property {number} [budget_range_max] - Maximum budget per deal
 * @property {boolean} is_verified - Whether brand is verified
 * @property {string} [verified_at] - Verification timestamp
 * @property {string} created_at - Creation timestamp
 * @property {string} updated_at - Last update timestamp
 */

/**
 * @typedef {object} BrandUpdateData
 * @property {string} [company_name] - Company name
 * @property {string} [company_type] - Company type
 * @property {string} [industry] - Industry sector
 * @property {string} [website_url] - Website URL
 * @property {string} [logo_url] - Logo URL
 * @property {string} [contact_name] - Contact name
 * @property {string} [contact_title] - Contact title
 * @property {string} [contact_email] - Contact email
 * @property {string} [contact_phone] - Contact phone
 * @property {string} [address_line1] - Address line 1
 * @property {string} [address_line2] - Address line 2
 * @property {string} [city] - City
 * @property {string} [state] - State
 * @property {string} [zip_code] - ZIP code
 * @property {string} [country] - Country
 */

/**
 * @typedef {object} BrandPreferences
 * @property {string[]} [preferred_sports] - Preferred sport IDs
 * @property {string[]} [preferred_schools] - Preferred school IDs
 * @property {string[]} [preferred_divisions] - Preferred divisions
 * @property {number} [min_gpa] - Minimum GPA (0-4.0)
 * @property {number} [min_followers] - Minimum social followers
 * @property {number} [budget_range_min] - Minimum budget
 * @property {number} [budget_range_max] - Maximum budget
 */

/**
 * Get the current user's brand profile
 *
 * @returns {Promise<{brand: BrandProfile | null, error: Error | null}>}
 */
export async function getCurrentBrand() {
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { brand: null, error: userError || new Error('Not authenticated') };
  }

  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('profile_id', user.id)
    .single();

  return { brand: data, error };
}

/**
 * Get a brand by ID (public view - verified brands only by default)
 *
 * @param {string} brandId - Brand UUID
 * @param {boolean} [includeUnverified=false] - Include unverified brands (admin only)
 * @returns {Promise<{brand: BrandProfile | null, error: Error | null}>}
 */
export async function getBrandById(brandId, includeUnverified = false) {
  const supabase = await getSupabaseClient();

  let query = supabase
    .from('brands')
    .select(`
      *,
      profile:profiles(first_name, last_name, avatar_url)
    `)
    .eq('id', brandId);

  if (!includeUnverified) {
    query = query.eq('is_verified', true);
  }

  const { data, error } = await query.single();

  return { brand: data, error };
}

/**
 * Update the current brand's profile
 *
 * @param {BrandUpdateData} data - Fields to update
 * @returns {Promise<{brand: BrandProfile | null, error: Error | null}>}
 */
export async function updateBrandProfile(data) {
  const { brand: currentBrand, error: brandError } = await getCurrentBrand();

  if (brandError || !currentBrand) {
    return { brand: null, error: brandError || new Error('Brand profile not found') };
  }

  const supabase = await getSupabaseClient();

  // Sanitize data - only allow specific fields
  const allowedFields = [
    'company_name',
    'company_type',
    'industry',
    'website_url',
    'logo_url',
    'contact_name',
    'contact_title',
    'contact_email',
    'contact_phone',
    'address_line1',
    'address_line2',
    'city',
    'state',
    'zip_code',
    'country',
  ];

  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }

  const { data: updated, error } = await supabase
    .from('brands')
    .update(updateData)
    .eq('id', currentBrand.id)
    .select()
    .single();

  return { brand: updated, error };
}

/**
 * Update brand preferences for athlete matching
 *
 * @param {BrandPreferences} preferences - Preference settings
 * @returns {Promise<{brand: BrandProfile | null, error: Error | null}>}
 */
export async function updateBrandPreferences(preferences) {
  const { brand: currentBrand, error: brandError } = await getCurrentBrand();

  if (brandError || !currentBrand) {
    return { brand: null, error: brandError || new Error('Brand profile not found') };
  }

  const supabase = await getSupabaseClient();

  // Validate GPA range
  if (preferences.min_gpa !== undefined && (preferences.min_gpa < 0 || preferences.min_gpa > 4.0)) {
    return { brand: null, error: new Error('GPA must be between 0 and 4.0') };
  }

  // Validate budget range
  if (
    preferences.budget_range_min !== undefined &&
    preferences.budget_range_max !== undefined &&
    preferences.budget_range_min > preferences.budget_range_max
  ) {
    return { brand: null, error: new Error('Minimum budget cannot exceed maximum budget') };
  }

  const preferenceFields = [
    'preferred_sports',
    'preferred_schools',
    'preferred_divisions',
    'min_gpa',
    'min_followers',
    'budget_range_min',
    'budget_range_max',
  ];

  const updateData = {};
  for (const field of preferenceFields) {
    if (preferences[field] !== undefined) {
      updateData[field] = preferences[field];
    }
  }

  const { data, error } = await supabase
    .from('brands')
    .update(updateData)
    .eq('id', currentBrand.id)
    .select()
    .single();

  return { brand: data, error };
}

/**
 * Upload brand logo
 *
 * @param {File} file - Image file to upload
 * @returns {Promise<{url: string | null, error: Error | null}>}
 */
export async function uploadBrandLogo(file) {
  const { brand, error: brandError } = await getCurrentBrand();

  if (brandError || !brand) {
    return { url: null, error: brandError || new Error('Brand profile not found') };
  }

  const supabase = await getSupabaseClient();

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { url: null, error: new Error('Invalid file type. Please upload JPEG, PNG, GIF, or WebP.') };
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { url: null, error: new Error('File too large. Maximum size is 5MB.') };
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `brand_${brand.id}_${Date.now()}.${fileExt}`;
  const filePath = `brands/${fileName}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    return { url: null, error: uploadError };
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  // Update brand profile with new logo URL
  const { error: updateError } = await supabase
    .from('brands')
    .update({ logo_url: publicUrl })
    .eq('id', brand.id);

  if (updateError) {
    return { url: publicUrl, error: updateError };
  }

  return { url: publicUrl, error: null };
}

/**
 * Get brand dashboard statistics
 *
 * @returns {Promise<{stats: object | null, error: Error | null}>}
 */
export async function getBrandStats() {
  const { brand, error: brandError } = await getCurrentBrand();

  if (brandError || !brand) {
    return { stats: null, error: brandError || new Error('Brand profile not found') };
  }

  const supabase = await getSupabaseClient();

  // Get deal statistics
  const { data: deals, error: dealsError } = await supabase
    .from('deals')
    .select('id, status, amount, created_at')
    .eq('brand_id', brand.id);

  if (dealsError) {
    return { stats: null, error: dealsError };
  }

  // Get opportunity statistics
  const { data: opportunities, error: oppsError } = await supabase
    .from('opportunities')
    .select('id, status, athletes_selected, max_athletes')
    .eq('brand_id', brand.id);

  if (oppsError) {
    return { stats: null, error: oppsError };
  }

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const activeStatuses = ['active', 'pending', 'negotiating'];

  const stats = {
    total_deals: deals?.length || 0,
    active_deals: deals?.filter((d) => activeStatuses.includes(d.status)).length || 0,
    completed_deals: deals?.filter((d) => d.status === 'completed').length || 0,
    total_spent: brand.total_spent || 0,
    avg_deal_value: deals?.length > 0
      ? deals.reduce((sum, d) => sum + (d.amount || 0), 0) / deals.length
      : 0,
    total_opportunities: opportunities?.length || 0,
    active_opportunities: opportunities?.filter((o) => o.status === 'active').length || 0,
    total_athletes_engaged: opportunities?.reduce((sum, o) => sum + (o.athletes_selected || 0), 0) || 0,
    deals_last_30_days: deals?.filter((d) => new Date(d.created_at).getTime() > thirtyDaysAgo).length || 0,
    avg_rating: brand.avg_deal_rating || 0,
  };

  return { stats, error: null };
}

/**
 * Get brand activity history
 *
 * @param {object} [options] - Query options
 * @param {number} [options.limit=50] - Maximum number of records
 * @param {number} [options.offset=0] - Offset for pagination
 * @returns {Promise<{activities: object[] | null, error: Error | null}>}
 */
export async function getBrandActivity(options = {}) {
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { activities: null, error: userError || new Error('Not authenticated') };
  }

  const supabase = await getSupabaseClient();
  const { limit = 50, offset = 0 } = options;

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { activities: data, error };
}

/**
 * Get profile views for brand's viewed athletes
 * (Athletes the brand has viewed)
 *
 * @param {object} [options] - Query options
 * @param {number} [options.days=30] - Number of days to look back
 * @returns {Promise<{views: object[] | null, error: Error | null}>}
 */
export async function getViewedAthletes(options = {}) {
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { views: null, error: userError || new Error('Not authenticated') };
  }

  const supabase = await getSupabaseClient();
  const { days = 30 } = options;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data, error } = await supabase
    .from('profile_views')
    .select(`
      athlete_id,
      created_at,
      athlete:athletes(
        id,
        gpa,
        gradeup_score,
        total_followers,
        profile:profiles(first_name, last_name, avatar_url),
        school:schools(name, short_name),
        sport:sports(name)
      )
    `)
    .eq('viewer_id', user.id)
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false });

  return { views: data, error };
}

/**
 * Record a profile view when brand views an athlete
 *
 * @param {string} athleteId - Athlete UUID
 * @param {string} [source='direct'] - View source (search, featured, opportunity, direct)
 * @returns {Promise<{success: boolean, error: Error | null}>}
 */
export async function recordProfileView(athleteId, source = 'direct') {
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { success: false, error: userError || new Error('Not authenticated') };
  }

  const supabase = await getSupabaseClient();

  const { error } = await supabase.from('profile_views').insert({
    athlete_id: athleteId,
    viewer_id: user.id,
    viewer_type: 'brand',
    source,
  });

  return { success: !error, error };
}

/**
 * Get all sports (for preference selection)
 *
 * @returns {Promise<{sports: object[] | null, error: Error | null}>}
 */
export async function getSports() {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('sports')
    .select('*')
    .eq('is_active', true)
    .order('name');

  return { sports: data, error };
}

/**
 * Get all schools (for preference selection)
 *
 * @param {object} [filters] - Filter options
 * @param {string} [filters.division] - Filter by division (D1, D2, etc.)
 * @param {string} [filters.state] - Filter by state
 * @param {string} [filters.conference] - Filter by conference
 * @returns {Promise<{schools: object[] | null, error: Error | null}>}
 */
export async function getSchools(filters = {}) {
  const supabase = await getSupabaseClient();

  let query = supabase
    .from('schools')
    .select('*')
    .eq('is_active', true);

  if (filters.division) {
    query = query.eq('division', filters.division);
  }

  if (filters.state) {
    query = query.eq('state', filters.state);
  }

  if (filters.conference) {
    query = query.eq('conference', filters.conference);
  }

  const { data, error } = await query.order('name');

  return { schools: data, error };
}

export default {
  getCurrentBrand,
  getBrandById,
  updateBrandProfile,
  updateBrandPreferences,
  uploadBrandLogo,
  getBrandStats,
  getBrandActivity,
  getViewedAthletes,
  recordProfileView,
  getSports,
  getSchools,
};
