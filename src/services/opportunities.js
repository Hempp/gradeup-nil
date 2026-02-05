/**
 * GradeUp NIL Platform - Opportunities Service
 *
 * Handles creation, management, and tracking of NIL opportunities
 * that brands post for athletes to discover and apply to.
 *
 * @module services/opportunities
 * @version 1.0.0
 */

import { getSupabaseClient, getCurrentUser, invokeFunction } from './supabase.js';

/**
 * @typedef {'social_post' | 'appearance' | 'endorsement' | 'autograph' | 'camp' | 'merchandise' | 'other'} DealType
 */

/**
 * @typedef {'D1' | 'D2' | 'D3' | 'NAIA' | 'JUCO' | 'other'} AthleticDivision
 */

/**
 * @typedef {'freshman' | 'sophomore' | 'junior' | 'senior' | 'graduate' | 'other'} AcademicYear
 */

/**
 * @typedef {object} Opportunity
 * @property {string} id - Opportunity UUID
 * @property {string} brand_id - Brand UUID
 * @property {string} title - Opportunity title
 * @property {string} [description] - Detailed description
 * @property {DealType} deal_type - Type of deal
 * @property {number} [compensation_amount] - Compensation amount
 * @property {string} [compensation_type] - Type: fixed, hourly, per_post, revenue_share
 * @property {string} [compensation_details] - Additional compensation info
 * @property {string[]} [required_sports] - Required sport UUIDs
 * @property {string[]} [required_schools] - Required school UUIDs
 * @property {AthleticDivision[]} [required_divisions] - Required divisions
 * @property {number} [min_gpa] - Minimum GPA requirement
 * @property {number} [min_followers] - Minimum followers requirement
 * @property {number} [min_gradeup_score] - Minimum GradeUp Score
 * @property {AcademicYear[]} [required_academic_years] - Required academic years
 * @property {object[]} [deliverables] - Required deliverables
 * @property {string} [start_date] - Opportunity start date
 * @property {string} [end_date] - Opportunity end date
 * @property {string} [application_deadline] - Deadline to apply
 * @property {number} [max_athletes] - Maximum athletes to select
 * @property {number} athletes_selected - Number of athletes selected
 * @property {string} status - Status: draft, active, paused, closed, completed
 * @property {boolean} is_featured - Whether opportunity is featured
 * @property {string} created_at - Creation timestamp
 * @property {string} updated_at - Last update timestamp
 */

/**
 * @typedef {object} OpportunityCreateData
 * @property {string} title - Opportunity title (required)
 * @property {string} [description] - Detailed description
 * @property {DealType} deal_type - Type of deal (required)
 * @property {number} [compensation_amount] - Compensation amount
 * @property {string} [compensation_type] - Compensation type
 * @property {string} [compensation_details] - Additional details
 * @property {string[]} [required_sports] - Required sport IDs
 * @property {string[]} [required_schools] - Required school IDs
 * @property {AthleticDivision[]} [required_divisions] - Required divisions
 * @property {number} [min_gpa] - Minimum GPA (0-4.0)
 * @property {number} [min_followers] - Minimum followers
 * @property {number} [min_gradeup_score] - Minimum GradeUp Score
 * @property {AcademicYear[]} [required_academic_years] - Required years
 * @property {object[]} [deliverables] - Deliverables array
 * @property {string} [start_date] - Start date
 * @property {string} [end_date] - End date
 * @property {string} [application_deadline] - Application deadline
 * @property {number} [max_athletes] - Maximum athletes
 */

/**
 * @typedef {object} Deliverable
 * @property {string} type - Deliverable type (post, story, video, appearance, etc.)
 * @property {string} description - Description of what's required
 * @property {string} [deadline] - Deadline for this deliverable
 * @property {string} [platform] - Platform (instagram, twitter, tiktok, etc.)
 */

/**
 * Valid deal types
 * @constant
 */
export const DEAL_TYPES = [
  'social_post',
  'appearance',
  'endorsement',
  'autograph',
  'camp',
  'merchandise',
  'other',
];

/**
 * Valid compensation types
 * @constant
 */
export const COMPENSATION_TYPES = ['fixed', 'hourly', 'per_post', 'revenue_share'];

/**
 * Valid opportunity statuses
 * @constant
 */
export const OPPORTUNITY_STATUSES = ['draft', 'active', 'paused', 'closed', 'completed'];

/**
 * Get current brand's ID (helper)
 *
 * @returns {Promise<{brandId: string | null, error: Error | null}>}
 */
async function getCurrentBrandId() {
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { brandId: null, error: userError || new Error('Not authenticated') };
  }

  const supabase = await getSupabaseClient();

  const { data: brand, error } = await supabase
    .from('brands')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  return { brandId: brand?.id || null, error };
}

/**
 * Create a new opportunity
 *
 * @param {OpportunityCreateData} data - Opportunity data
 * @returns {Promise<{opportunity: Opportunity | null, error: Error | null}>}
 */
export async function createOpportunity(data) {
  const { brandId, error: brandError } = await getCurrentBrandId();

  if (brandError || !brandId) {
    return { opportunity: null, error: brandError || new Error('Brand profile not found') };
  }

  const supabase = await getSupabaseClient();

  // Validate required fields
  if (!data.title || !data.deal_type) {
    return { opportunity: null, error: new Error('Title and deal_type are required') };
  }

  // Validate deal type
  if (!DEAL_TYPES.includes(data.deal_type)) {
    return {
      opportunity: null,
      error: new Error(`Invalid deal_type. Must be one of: ${DEAL_TYPES.join(', ')}`),
    };
  }

  if (data.min_gpa !== undefined && (data.min_gpa < 0 || data.min_gpa > 4.0)) {
    return { opportunity: null, error: new Error('min_gpa must be between 0 and 4.0') };
  }

  if (data.start_date && data.end_date && new Date(data.end_date) <= new Date(data.start_date)) {
    return { opportunity: null, error: new Error('end_date must be after start_date') };
  }

  const opportunity = {
    brand_id: brandId,
    title: data.title,
    description: data.description || null,
    deal_type: data.deal_type,
    compensation_amount: data.compensation_amount || null,
    compensation_type: data.compensation_type || null,
    compensation_details: data.compensation_details || null,
    required_sports: data.required_sports || null,
    required_schools: data.required_schools || null,
    required_divisions: data.required_divisions || null,
    min_gpa: data.min_gpa || null,
    min_followers: data.min_followers || null,
    min_gradeup_score: data.min_gradeup_score || null,
    required_academic_years: data.required_academic_years || null,
    deliverables: data.deliverables || null,
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    application_deadline: data.application_deadline || null,
    max_athletes: data.max_athletes || null,
    status: 'draft',
  };

  const { data: created, error } = await supabase
    .from('opportunities')
    .insert(opportunity)
    .select()
    .single();

  return { opportunity: created, error };
}

/**
 * Get an opportunity by ID
 *
 * @param {string} opportunityId - Opportunity UUID
 * @returns {Promise<{opportunity: Opportunity | null, error: Error | null}>}
 */
export async function getOpportunityById(opportunityId) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('opportunities')
    .select(`
      *,
      brand:brands(
        id,
        company_name,
        logo_url,
        industry,
        is_verified,
        profile:profiles(avatar_url)
      )
    `)
    .eq('id', opportunityId)
    .single();

  return { opportunity: data, error };
}

/**
 * Get all opportunities for current brand
 *
 * @param {object} [options] - Query options
 * @param {string} [options.status] - Filter by status
 * @param {DealType} [options.deal_type] - Filter by deal type
 * @param {number} [options.limit=50] - Maximum results
 * @param {number} [options.offset=0] - Offset for pagination
 * @returns {Promise<{opportunities: Opportunity[] | null, error: Error | null}>}
 */
export async function getMyOpportunities(options = {}) {
  const { brandId, error: brandError } = await getCurrentBrandId();

  if (brandError || !brandId) {
    return { opportunities: null, error: brandError || new Error('Brand profile not found') };
  }

  const supabase = await getSupabaseClient();
  const { status, deal_type, limit = 50, offset = 0 } = options;

  let query = supabase
    .from('opportunities')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  if (deal_type) {
    query = query.eq('deal_type', deal_type);
  }

  const { data, error } = await query;

  return { opportunities: data, error };
}

/**
 * Update an opportunity
 *
 * @param {string} opportunityId - Opportunity UUID
 * @param {Partial<OpportunityCreateData>} updates - Fields to update
 * @returns {Promise<{opportunity: Opportunity | null, error: Error | null}>}
 */
export async function updateOpportunity(opportunityId, updates) {
  const { brandId, error: brandError } = await getCurrentBrandId();

  if (brandError || !brandId) {
    return { opportunity: null, error: brandError || new Error('Brand profile not found') };
  }

  const supabase = await getSupabaseClient();

  // Validate ownership
  const { data: existing, error: fetchError } = await supabase
    .from('opportunities')
    .select('id, brand_id, status')
    .eq('id', opportunityId)
    .single();

  if (fetchError || !existing) {
    return { opportunity: null, error: fetchError || new Error('Opportunity not found') };
  }

  if (existing.brand_id !== brandId) {
    return { opportunity: null, error: new Error('Not authorized to update this opportunity') };
  }

  // Don't allow updates to completed opportunities
  if (existing.status === 'completed') {
    return { opportunity: null, error: new Error('Cannot update completed opportunities') };
  }

  // Validate deal type if provided
  if (updates.deal_type && !DEAL_TYPES.includes(updates.deal_type)) {
    return {
      opportunity: null,
      error: new Error(`Invalid deal_type. Must be one of: ${DEAL_TYPES.join(', ')}`),
    };
  }

  // Validate GPA if provided
  if (updates.min_gpa !== undefined && (updates.min_gpa < 0 || updates.min_gpa > 4.0)) {
    return { opportunity: null, error: new Error('min_gpa must be between 0 and 4.0') };
  }

  // Build update object
  const allowedFields = [
    'title',
    'description',
    'deal_type',
    'compensation_amount',
    'compensation_type',
    'compensation_details',
    'required_sports',
    'required_schools',
    'required_divisions',
    'min_gpa',
    'min_followers',
    'min_gradeup_score',
    'required_academic_years',
    'deliverables',
    'start_date',
    'end_date',
    'application_deadline',
    'max_athletes',
  ];

  const updateData = {};
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateData[field] = updates[field];
    }
  }

  const { data, error } = await supabase
    .from('opportunities')
    .update(updateData)
    .eq('id', opportunityId)
    .select()
    .single();

  return { opportunity: data, error };
}

/**
 * Update opportunity status
 *
 * @param {string} opportunityId - Opportunity UUID
 * @param {'draft' | 'active' | 'paused' | 'closed' | 'completed'} status - New status
 * @returns {Promise<{opportunity: Opportunity | null, error: Error | null}>}
 */
export async function updateOpportunityStatus(opportunityId, status) {
  if (!OPPORTUNITY_STATUSES.includes(status)) {
    return {
      opportunity: null,
      error: new Error(`Invalid status. Must be one of: ${OPPORTUNITY_STATUSES.join(', ')}`),
    };
  }

  const { brandId, error: brandError } = await getCurrentBrandId();

  if (brandError || !brandId) {
    return { opportunity: null, error: brandError || new Error('Brand profile not found') };
  }

  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('opportunities')
    .update({ status })
    .eq('id', opportunityId)
    .eq('brand_id', brandId)
    .select()
    .single();

  if (error) {
    return { opportunity: null, error };
  }

  // Update brand's active campaigns count if needed
  if (status === 'active' || status === 'closed' || status === 'completed') {
    const { count } = await supabase
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .eq('status', 'active');

    await supabase
      .from('brands')
      .update({ active_campaigns: count || 0 })
      .eq('id', brandId);
  }

  return { opportunity: data, error: null };
}

/**
 * Publish an opportunity (set to active)
 *
 * @param {string} opportunityId - Opportunity UUID
 * @returns {Promise<{opportunity: Opportunity | null, error: Error | null}>}
 */
export async function publishOpportunity(opportunityId) {
  return updateOpportunityStatus(opportunityId, 'active');
}

/**
 * Pause an opportunity
 *
 * @param {string} opportunityId - Opportunity UUID
 * @returns {Promise<{opportunity: Opportunity | null, error: Error | null}>}
 */
export async function pauseOpportunity(opportunityId) {
  return updateOpportunityStatus(opportunityId, 'paused');
}

/**
 * Close an opportunity (stop accepting applications)
 *
 * @param {string} opportunityId - Opportunity UUID
 * @returns {Promise<{opportunity: Opportunity | null, error: Error | null}>}
 */
export async function closeOpportunity(opportunityId) {
  return updateOpportunityStatus(opportunityId, 'closed');
}

/**
 * Mark opportunity as completed
 *
 * @param {string} opportunityId - Opportunity UUID
 * @returns {Promise<{opportunity: Opportunity | null, error: Error | null}>}
 */
export async function completeOpportunity(opportunityId) {
  return updateOpportunityStatus(opportunityId, 'completed');
}

/**
 * Delete an opportunity (only drafts can be deleted)
 *
 * @param {string} opportunityId - Opportunity UUID
 * @returns {Promise<{success: boolean, error: Error | null}>}
 */
export async function deleteOpportunity(opportunityId) {
  const { brandId, error: brandError } = await getCurrentBrandId();

  if (brandError || !brandId) {
    return { success: false, error: brandError || new Error('Brand profile not found') };
  }

  const supabase = await getSupabaseClient();

  // Only allow deleting drafts
  const { data: existing, error: fetchError } = await supabase
    .from('opportunities')
    .select('status')
    .eq('id', opportunityId)
    .eq('brand_id', brandId)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: fetchError || new Error('Opportunity not found') };
  }

  if (existing.status !== 'draft') {
    return {
      success: false,
      error: new Error('Only draft opportunities can be deleted. Close or complete instead.'),
    };
  }

  const { error } = await supabase
    .from('opportunities')
    .delete()
    .eq('id', opportunityId)
    .eq('brand_id', brandId);

  return { success: !error, error };
}

/**
 * Get deals/applications for an opportunity
 *
 * @param {string} opportunityId - Opportunity UUID
 * @param {object} [options] - Query options
 * @param {string} [options.status] - Filter by deal status
 * @returns {Promise<{deals: object[] | null, error: Error | null}>}
 */
export async function getOpportunityDeals(opportunityId, options = {}) {
  const { brandId, error: brandError } = await getCurrentBrandId();

  if (brandError || !brandId) {
    return { deals: null, error: brandError || new Error('Brand profile not found') };
  }

  const supabase = await getSupabaseClient();
  const { status } = options;

  let query = supabase
    .from('deals')
    .select(`
      *,
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
    `)
    .eq('opportunity_id', opportunityId)
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  return { deals: data, error };
}

/**
 * Create a deal/offer from an opportunity to an athlete
 *
 * @param {string} opportunityId - Opportunity UUID
 * @param {string} athleteId - Athlete UUID
 * @param {object} [dealData] - Additional deal customization
 * @returns {Promise<{deal: object | null, error: Error | null}>}
 */
export async function createDealFromOpportunity(opportunityId, athleteId, dealData = {}) {
  const { brandId, error: brandError } = await getCurrentBrandId();

  if (brandError || !brandId) {
    return { deal: null, error: brandError || new Error('Brand profile not found') };
  }

  const supabase = await getSupabaseClient();

  // Get opportunity details
  const { data: opportunity, error: oppError } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', opportunityId)
    .eq('brand_id', brandId)
    .single();

  if (oppError || !opportunity) {
    return { deal: null, error: oppError || new Error('Opportunity not found') };
  }

  // Check if opportunity can accept more athletes
  if (
    opportunity.max_athletes &&
    opportunity.athletes_selected >= opportunity.max_athletes
  ) {
    return { deal: null, error: new Error('Opportunity has reached maximum athletes') };
  }

  // Check if athlete already has a deal for this opportunity
  const { data: existingDeal } = await supabase
    .from('deals')
    .select('id')
    .eq('opportunity_id', opportunityId)
    .eq('athlete_id', athleteId)
    .single();

  if (existingDeal) {
    return { deal: null, error: new Error('Athlete already has a deal for this opportunity') };
  }

  // Create deal from opportunity
  const deal = {
    opportunity_id: opportunityId,
    athlete_id: athleteId,
    brand_id: brandId,
    title: dealData.title || opportunity.title,
    description: dealData.description || opportunity.description,
    deal_type: opportunity.deal_type,
    amount: dealData.amount || opportunity.compensation_amount || 0,
    payment_terms: dealData.payment_terms || opportunity.compensation_details,
    deliverables: dealData.deliverables || opportunity.deliverables,
    start_date: dealData.start_date || opportunity.start_date,
    end_date: dealData.end_date || opportunity.end_date,
    status: 'pending',
  };

  const { data: createdDeal, error: createError } = await supabase
    .from('deals')
    .insert(deal)
    .select()
    .single();

  if (createError) {
    return { deal: null, error: createError };
  }

  // Update athletes_selected count
  await supabase
    .from('opportunities')
    .update({ athletes_selected: opportunity.athletes_selected + 1 })
    .eq('id', opportunityId);

  // Send notification to athlete
  try {
    const { data: athlete } = await supabase
      .from('athletes')
      .select('profile_id')
      .eq('id', athleteId)
      .single();

    if (athlete?.profile_id) {
      await invokeFunction('send-notification', {
        user_ids: [athlete.profile_id],
        type: 'deal_offer',
        title: 'New NIL Opportunity',
        body: `You've received an offer for "${opportunity.title}"`,
        related_type: 'deal',
        related_id: createdDeal.id,
        action_url: `/deals/${createdDeal.id}`,
        action_label: 'View Offer',
      });
    }
  } catch (notifyError) {
    console.error('Failed to send notification:', notifyError);
  }

  return { deal: createdDeal, error: null };
}

/**
 * Get opportunity statistics
 *
 * @param {string} opportunityId - Opportunity UUID
 * @returns {Promise<{stats: object | null, error: Error | null}>}
 */
export async function getOpportunityStats(opportunityId) {
  const { brandId, error: brandError } = await getCurrentBrandId();

  if (brandError || !brandId) {
    return { stats: null, error: brandError || new Error('Brand profile not found') };
  }

  const supabase = await getSupabaseClient();

  // Verify ownership
  const { data: opportunity, error: oppError } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', opportunityId)
    .eq('brand_id', brandId)
    .single();

  if (oppError || !opportunity) {
    return { stats: null, error: oppError || new Error('Opportunity not found') };
  }

  // Get deal statistics
  const { data: deals, error: dealsError } = await supabase
    .from('deals')
    .select(`
      id,
      status,
      amount,
      athlete:athletes(total_followers)
    `)
    .eq('opportunity_id', opportunityId);

  if (dealsError) {
    return { stats: null, error: dealsError };
  }

  const activeStatuses = ['active', 'negotiating'];
  const declinedStatuses = ['cancelled', 'expired'];

  const totalDeals = deals?.length || 0;
  const pendingDeals = deals?.filter((d) => d.status === 'pending').length || 0;
  const activeDeals = deals?.filter((d) => activeStatuses.includes(d.status)).length || 0;
  const completedDeals = deals?.filter((d) => d.status === 'completed').length || 0;
  const declinedDeals = deals?.filter((d) => declinedStatuses.includes(d.status)).length || 0;
  const totalAmount = deals?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
  const totalReach = deals?.reduce((sum, d) => sum + (d.athlete?.total_followers || 0), 0) || 0;

  const stats = {
    opportunity_id: opportunityId,
    status: opportunity.status,
    max_athletes: opportunity.max_athletes,
    athletes_selected: opportunity.athletes_selected,
    slots_remaining: opportunity.max_athletes ? opportunity.max_athletes - opportunity.athletes_selected : null,
    total_deals: totalDeals,
    pending_deals: pendingDeals,
    active_deals: activeDeals,
    completed_deals: completedDeals,
    declined_deals: declinedDeals,
    acceptance_rate: totalDeals > 0 ? Math.round(((activeDeals + completedDeals) / totalDeals) * 100) : 0,
    total_amount_committed: totalAmount,
    total_reach: totalReach,
    avg_cost_per_reach: totalReach > 0 ? Math.round((totalAmount / totalReach) * 1000000) / 1000000 : 0,
  };

  return { stats, error: null };
}

/**
 * Duplicate an opportunity
 *
 * @param {string} opportunityId - Opportunity UUID to duplicate
 * @param {string} [newTitle] - New title for the duplicate
 * @returns {Promise<{opportunity: Opportunity | null, error: Error | null}>}
 */
export async function duplicateOpportunity(opportunityId, newTitle) {
  const { opportunity, error: fetchError } = await getOpportunityById(opportunityId);

  if (fetchError || !opportunity) {
    return { opportunity: null, error: fetchError || new Error('Opportunity not found') };
  }

  const { id, brand_id, athletes_selected, status, created_at, updated_at, brand, ...oppData } = opportunity;

  return createOpportunity({
    ...oppData,
    title: newTitle || `${opportunity.title} (Copy)`,
  });
}

/**
 * Get matched athletes for an opportunity based on its requirements
 *
 * @param {string} opportunityId - Opportunity UUID
 * @param {object} [options] - Query options
 * @param {number} [options.limit=20] - Maximum results
 * @returns {Promise<{athletes: object[] | null, error: Error | null}>}
 */
export async function getMatchedAthletes(opportunityId, options = {}) {
  const { brandId, error: brandError } = await getCurrentBrandId();

  if (brandError || !brandId) {
    return { athletes: null, error: brandError || new Error('Brand profile not found') };
  }

  const supabase = await getSupabaseClient();
  const { limit = 20 } = options;

  // Get opportunity requirements
  const { data: opportunity, error: oppError } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', opportunityId)
    .eq('brand_id', brandId)
    .single();

  if (oppError || !opportunity) {
    return { athletes: null, error: oppError || new Error('Opportunity not found') };
  }

  // Build query based on requirements
  let query = supabase
    .from('athletes')
    .select(`
      id,
      gpa,
      gradeup_score,
      total_followers,
      position,
      academic_year,
      enrollment_verified,
      sport_verified,
      grades_verified,
      profile:profiles!inner(first_name, last_name, avatar_url),
      school:schools(name, short_name, division),
      sport:sports(name)
    `)
    .eq('is_searchable', true)
    .eq('accepting_deals', true);

  // Apply requirements
  if (opportunity.required_sports?.length) {
    query = query.in('sport_id', opportunity.required_sports);
  }

  if (opportunity.required_schools?.length) {
    query = query.in('school_id', opportunity.required_schools);
  }

  if (opportunity.required_divisions?.length) {
    query = query.in('school.division', opportunity.required_divisions);
  }

  if (opportunity.min_gpa) {
    query = query.gte('gpa', opportunity.min_gpa);
  }

  if (opportunity.min_followers) {
    query = query.gte('total_followers', opportunity.min_followers);
  }

  if (opportunity.min_gradeup_score) {
    query = query.gte('gradeup_score', opportunity.min_gradeup_score);
  }

  if (opportunity.required_academic_years?.length) {
    query = query.in('academic_year', opportunity.required_academic_years);
  }

  // Get athletes who don't already have a deal for this opportunity
  const { data: existingDeals } = await supabase
    .from('deals')
    .select('athlete_id')
    .eq('opportunity_id', opportunityId);

  const excludeIds = existingDeals?.map((d) => d.athlete_id) || [];

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data, error } = await query
    .order('gradeup_score', { ascending: false })
    .limit(limit);

  return { athletes: data, error };
}

export default {
  DEAL_TYPES,
  COMPENSATION_TYPES,
  OPPORTUNITY_STATUSES,
  createOpportunity,
  getOpportunityById,
  getMyOpportunities,
  updateOpportunity,
  updateOpportunityStatus,
  publishOpportunity,
  pauseOpportunity,
  closeOpportunity,
  completeOpportunity,
  deleteOpportunity,
  getOpportunityDeals,
  createDealFromOpportunity,
  getOpportunityStats,
  duplicateOpportunity,
  getMatchedAthletes,
};
