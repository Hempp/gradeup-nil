/**
 * GradeUp NIL Platform - Deals Service
 * Handles deal operations, opportunities, and deal messaging.
 *
 * @module services/deals
 */

import { getSupabaseClient, getCurrentUser, subscribeToTable } from './supabase.js';
import { getMyAthleteId, ensureAthleteId } from './helpers.js';

/**
 * Enum of all possible deal status values
 * @constant {Object.<string, string>}
 */
export const DEAL_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  NEGOTIATING: 'negotiating',
  ACCEPTED: 'accepted',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
};

/**
 * Enum of all possible deal type values
 * @constant {Object.<string, string>}
 */
export const DEAL_TYPES = {
  SOCIAL_POST: 'social_post',
  APPEARANCE: 'appearance',
  ENDORSEMENT: 'endorsement',
  AUTOGRAPH: 'autograph',
  CAMP: 'camp',
  MERCHANDISE: 'merchandise',
  OTHER: 'other',
};

const DEAL_SELECT = `
  *,
  brand:brands!inner(id, company_name, logo_url, industry, is_verified),
  opportunity:opportunities(id, title, compensation_type)
`;

const DEAL_SELECT_FULL = `
  *,
  brand:brands!inner(id, company_name, logo_url, industry, is_verified, website_url, contact_name, contact_email),
  opportunity:opportunities(id, title, description, compensation_type, compensation_details, deliverables)
`;

const OPPORTUNITY_SELECT = `
  *,
  brand:brands!inner(id, company_name, logo_url, industry, is_verified)
`;

const OPPORTUNITY_SELECT_FULL = `
  *,
  brand:brands!inner(id, company_name, logo_url, industry, is_verified, website_url, city, state)
`;

/**
 * Fetches active opportunities with optional filtering and pagination
 * @param {Object} [filters={}] - Filter options
 * @param {string[]} [filters.deal_types] - Filter by deal types
 * @param {number} [filters.min_compensation] - Minimum compensation amount
 * @param {number} [filters.max_compensation] - Maximum compensation amount
 * @param {boolean} [filters.featured_only] - Only return featured opportunities
 * @param {string} [filters.sort_by='created_at'] - Field to sort by
 * @param {string} [filters.sort_order='desc'] - Sort order ('asc' or 'desc')
 * @param {number} [filters.page=1] - Page number for pagination
 * @param {number} [filters.page_size=20] - Number of results per page
 * @returns {Promise<{opportunities: Object[]|null, pagination: Object, error: Error|null}>}
 */
export async function getOpportunities(filters = {}) {
  const supabase = await getSupabaseClient();

  const {
    deal_types,
    min_compensation,
    max_compensation,
    featured_only,
    sort_by = 'created_at',
    sort_order = 'desc',
    page = 1,
    page_size = 20,
  } = filters;

  let query = supabase
    .from('opportunities')
    .select(OPPORTUNITY_SELECT, { count: 'exact' })
    .eq('status', 'active');

  if (deal_types?.length) query = query.in('deal_type', deal_types);
  if (min_compensation !== undefined) query = query.gte('compensation_amount', min_compensation);
  if (max_compensation !== undefined) query = query.lte('compensation_amount', max_compensation);
  if (featured_only) query = query.eq('is_featured', true);

  query = query.order(sort_by, { ascending: sort_order === 'asc' });

  const from = (page - 1) * page_size;
  query = query.range(from, from + page_size - 1);

  const { data, error, count } = await query;

  return {
    opportunities: data,
    pagination: {
      page,
      page_size,
      total: count,
      total_pages: count ? Math.ceil(count / page_size) : 0,
    },
    error,
  };
}

/**
 * Fetches a single active opportunity by ID with full brand details
 * @param {string} opportunityId - The opportunity UUID
 * @returns {Promise<{opportunity: Object|null, error: Error|null}>}
 */
export async function getOpportunityById(opportunityId) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('opportunities')
    .select(OPPORTUNITY_SELECT_FULL)
    .eq('id', opportunityId)
    .eq('status', 'active')
    .single();

  return { opportunity: data, error };
}

/**
 * Applies to an opportunity by creating a new pending deal
 * @param {string} opportunityId - The opportunity UUID to apply to
 * @param {Object} [application={}] - Application data
 * @param {number} [application.proposed_amount] - Counter-proposed compensation amount
 * @param {string} [application.message] - Application message to brand
 * @returns {Promise<{deal: Object|null, error: Error|null}>}
 */
export async function applyToOpportunity(opportunityId, application = {}) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  const athleteCheck = ensureAthleteId(athleteId);
  if (!athleteCheck.valid) {
    return { deal: null, error: athleteCheck.error };
  }

  const { data: opportunity, error: oppError } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', opportunityId)
    .eq('status', 'active')
    .single();

  if (oppError || !opportunity) {
    return { deal: null, error: oppError || new Error('Opportunity not found or not active') };
  }

  const { data: existingDeal } = await supabase
    .from('deals')
    .select('id, status')
    .eq('opportunity_id', opportunityId)
    .eq('athlete_id', athleteId)
    .not('status', 'in', '("cancelled","expired")')
    .single();

  if (existingDeal) {
    return { deal: null, error: new Error('You have already applied to this opportunity') };
  }

  const { data: deal, error } = await supabase
    .from('deals')
    .insert({
      opportunity_id: opportunityId,
      athlete_id: athleteId,
      brand_id: opportunity.brand_id,
      title: opportunity.title,
      description: opportunity.description,
      deal_type: opportunity.deal_type,
      status: DEAL_STATUS.PENDING,
      amount: application.proposed_amount || opportunity.compensation_amount,
      deliverables: opportunity.deliverables,
      start_date: opportunity.start_date,
      end_date: opportunity.end_date,
    })
    .select(`*, brand:brands(id, company_name, logo_url)`)
    .single();

  if (!error && deal && application.message) {
    const { user } = await getCurrentUser();
    await supabase.from('deal_messages').insert({
      deal_id: deal.id,
      sender_id: user.id,
      message: application.message,
    });
  }

  return { deal, error };
}

/**
 * Fetches all deals for the current athlete with optional filtering
 * @param {Object} [filters={}] - Filter options
 * @param {string[]} [filters.status] - Filter by deal status(es)
 * @param {string[]} [filters.deal_types] - Filter by deal type(s)
 * @param {string} [filters.sort_by='created_at'] - Field to sort by
 * @param {string} [filters.sort_order='desc'] - Sort order ('asc' or 'desc')
 * @returns {Promise<{deals: Object[]|null, error: Error|null}>}
 */
export async function getMyDeals(filters = {}) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  const athleteCheck = ensureAthleteId(athleteId);
  if (!athleteCheck.valid) {
    return { deals: null, error: athleteCheck.error };
  }

  const { status, deal_types, sort_by = 'created_at', sort_order = 'desc' } = filters;

  let query = supabase.from('deals').select(DEAL_SELECT).eq('athlete_id', athleteId);

  if (status?.length) query = query.in('status', status);
  if (deal_types?.length) query = query.in('deal_type', deal_types);
  query = query.order(sort_by, { ascending: sort_order === 'asc' });

  const { data, error } = await query;
  return { deals: data, error };
}

/**
 * Organizes deals into categories: active, pending, and completed
 * @returns {Promise<{active: Object[], pending: Object[], completed: Object[], error: Error|null}>}
 */
export async function getDealsByCategory() {
  const { deals, error } = await getMyDeals();

  if (error || !deals) {
    return { active: [], pending: [], completed: [], error };
  }

  const activeStatuses = [DEAL_STATUS.ACCEPTED, DEAL_STATUS.ACTIVE];
  const pendingStatuses = [DEAL_STATUS.PENDING, DEAL_STATUS.NEGOTIATING];

  return {
    active: deals.filter(d => activeStatuses.includes(d.status)),
    pending: deals.filter(d => pendingStatuses.includes(d.status)),
    completed: deals.filter(d => d.status === DEAL_STATUS.COMPLETED),
    error: null,
  };
}

/**
 * Fetches a single deal by ID with full details
 * @param {string} dealId - The deal UUID
 * @returns {Promise<{deal: Object|null, error: Error|null}>}
 */
export async function getDealById(dealId) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  const athleteCheck = ensureAthleteId(athleteId);
  if (!athleteCheck.valid) {
    return { deal: null, error: athleteCheck.error };
  }

  const { data, error } = await supabase
    .from('deals')
    .select(DEAL_SELECT_FULL)
    .eq('id', dealId)
    .eq('athlete_id', athleteId)
    .single();

  return { deal: data, error };
}

/**
 * Accepts a pending or negotiating deal
 * @param {string} dealId - The deal UUID to accept
 * @returns {Promise<{deal: Object|null, error: Error|null}>}
 */
export async function acceptDeal(dealId) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  const athleteCheck = ensureAthleteId(athleteId);
  if (!athleteCheck.valid) {
    return { deal: null, error: athleteCheck.error };
  }

  const { data: existing, error: checkError } = await supabase
    .from('deals')
    .select('id, status')
    .eq('id', dealId)
    .eq('athlete_id', athleteId)
    .single();

  if (checkError || !existing) {
    return { deal: null, error: checkError || new Error('Deal not found') };
  }

  const acceptableStatuses = [DEAL_STATUS.PENDING, DEAL_STATUS.NEGOTIATING];
  if (!acceptableStatuses.includes(existing.status)) {
    return { deal: null, error: new Error('Deal cannot be accepted in current status') };
  }

  const { data, error } = await supabase
    .from('deals')
    .update({ status: DEAL_STATUS.ACCEPTED })
    .eq('id', dealId)
    .eq('athlete_id', athleteId)
    .select(`*, brand:brands(id, company_name, logo_url)`)
    .single();

  return { deal: data, error };
}

/**
 * Rejects a pending or negotiating deal
 * @param {string} dealId - The deal UUID to reject
 * @param {string} [reason] - Optional reason for rejection (sent as message)
 * @returns {Promise<{error: Error|null}>}
 */
export async function rejectDeal(dealId, reason) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  const athleteCheck = ensureAthleteId(athleteId);
  if (!athleteCheck.valid) {
    return { error: athleteCheck.error };
  }

  if (reason) {
    const { user } = await getCurrentUser();
    await supabase.from('deal_messages').insert({
      deal_id: dealId,
      sender_id: user.id,
      message: `Deal declined: ${reason}`,
    });
  }

  const { error } = await supabase
    .from('deals')
    .update({ status: DEAL_STATUS.CANCELLED })
    .eq('id', dealId)
    .eq('athlete_id', athleteId)
    .in('status', [DEAL_STATUS.PENDING, DEAL_STATUS.NEGOTIATING]);

  return { error };
}

/**
 * Submits a counter-offer for a pending or negotiating deal
 * @param {string} dealId - The deal UUID
 * @param {Object} counterOffer - Counter-offer details
 * @param {number} counterOffer.amount - Proposed new amount
 * @param {string} [counterOffer.message] - Optional message with the counter-offer
 * @returns {Promise<{deal: Object|null, error: Error|null}>}
 */
export async function counterOfferDeal(dealId, counterOffer) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  const athleteCheck = ensureAthleteId(athleteId);
  if (!athleteCheck.valid) {
    return { deal: null, error: athleteCheck.error };
  }

  const { data, error } = await supabase
    .from('deals')
    .update({ status: DEAL_STATUS.NEGOTIATING, amount: counterOffer.amount })
    .eq('id', dealId)
    .eq('athlete_id', athleteId)
    .in('status', [DEAL_STATUS.PENDING, DEAL_STATUS.NEGOTIATING])
    .select()
    .single();

  if (error) return { deal: null, error };

  if (counterOffer.message) {
    const { user } = await getCurrentUser();
    await supabase.from('deal_messages').insert({
      deal_id: dealId,
      sender_id: user.id,
      message: `Counter-offer: $${counterOffer.amount}\n\n${counterOffer.message}`,
    });
  }

  return { deal: data, error: null };
}

/**
 * Signs the contract for an accepted deal, making it active
 * @param {string} dealId - The deal UUID
 * @returns {Promise<{deal: Object|null, error: Error|null}>}
 */
export async function signContract(dealId) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  const athleteCheck = ensureAthleteId(athleteId);
  if (!athleteCheck.valid) {
    return { deal: null, error: athleteCheck.error };
  }

  const { data, error } = await supabase
    .from('deals')
    .update({
      contract_signed_athlete_at: new Date().toISOString(),
      status: DEAL_STATUS.ACTIVE,
    })
    .eq('id', dealId)
    .eq('athlete_id', athleteId)
    .eq('status', DEAL_STATUS.ACCEPTED)
    .select()
    .single();

  return { deal: data, error };
}

/**
 * Complete a deal - requires payment to be succeeded
 * @param {string} dealId - Deal ID
 * @returns {Promise<{deal: object | null, error: Error | null}>}
 */
export async function completeDeal(dealId) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  const athleteCheck = ensureAthleteId(athleteId);
  if (!athleteCheck.valid) {
    return { deal: null, error: athleteCheck.error };
  }

  // Verify payment exists and succeeded before completing
  const { data: payment } = await supabase
    .from('payments')
    .select('id, status')
    .eq('deal_id', dealId)
    .eq('status', 'succeeded')
    .single();

  if (!payment) {
    return { deal: null, error: new Error('Deal cannot be completed - payment not received') };
  }

  const { data, error } = await supabase
    .from('deals')
    .update({ status: DEAL_STATUS.COMPLETED, completed_at: new Date().toISOString() })
    .eq('id', dealId)
    .eq('athlete_id', athleteId)
    .eq('status', DEAL_STATUS.ACTIVE)
    .select()
    .single();

  return { deal: data, error };
}

/**
 * Check if a deal has been paid
 * @param {string} dealId - Deal ID
 * @returns {Promise<{isPaid: boolean, payment: object | null, error: Error | null}>}
 */
export async function checkDealPayment(dealId) {
  const supabase = await getSupabaseClient();

  const { data: payment, error } = await supabase
    .from('payments')
    .select('id, status, amount_cents, paid_at')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    return { isPaid: false, payment: null, error };
  }

  return {
    isPaid: payment?.status === 'succeeded',
    payment: payment || null,
    error: null,
  };
}

/**
 * Submits a review for a completed deal
 * @param {string} dealId - The deal UUID
 * @param {Object} review - Review data
 * @param {number} review.rating - Rating from 1-5
 * @param {string} [review.text] - Optional review text
 * @returns {Promise<{deal: Object|null, error: Error|null}>}
 */
export async function submitDealReview(dealId, review) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  const athleteCheck = ensureAthleteId(athleteId);
  if (!athleteCheck.valid) {
    return { deal: null, error: athleteCheck.error };
  }

  if (review.rating < 1 || review.rating > 5) {
    return { deal: null, error: new Error('Rating must be between 1 and 5') };
  }

  const { data, error } = await supabase
    .from('deals')
    .update({ athlete_rating: review.rating, athlete_review: review.text })
    .eq('id', dealId)
    .eq('athlete_id', athleteId)
    .eq('status', DEAL_STATUS.COMPLETED)
    .select()
    .single();

  return { deal: data, error };
}

const MESSAGE_SELECT = `
  *,
  sender:profiles!sender_id(id, first_name, last_name, avatar_url, role)
`;

/**
 * Fetches messages for a deal conversation
 * @param {string} dealId - The deal UUID
 * @param {Object} [options={}] - Query options
 * @param {number} [options.limit] - Maximum messages to return
 * @param {string} [options.before] - Get messages before this timestamp
 * @returns {Promise<{messages: Object[]|null, error: Error|null}>}
 */
export async function getDealMessages(dealId, options = {}) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  const athleteCheck = ensureAthleteId(athleteId);
  if (!athleteCheck.valid) {
    return { messages: null, error: athleteCheck.error };
  }

  const { data: deal } = await supabase
    .from('deals')
    .select('id')
    .eq('id', dealId)
    .eq('athlete_id', athleteId)
    .single();

  if (!deal) {
    return { messages: null, error: new Error('Deal not found') };
  }

  let query = supabase
    .from('deal_messages')
    .select(MESSAGE_SELECT)
    .eq('deal_id', dealId)
    .order('created_at', { ascending: true });

  if (options.limit) query = query.limit(options.limit);
  if (options.before) query = query.lt('created_at', options.before);

  const { data, error } = await query;
  return { messages: data, error };
}

/**
 * Sends a message in a deal conversation
 * @param {string} dealId - The deal UUID
 * @param {string} message - Message content
 * @param {string[]} [attachments=[]] - Array of attachment URLs
 * @returns {Promise<{message: Object|null, error: Error|null}>}
 */
export async function sendDealMessage(dealId, message, attachments = []) {
  const supabase = await getSupabaseClient();
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { message: null, error: userError || new Error('Not authenticated') };
  }

  const athleteId = await getMyAthleteId();

  const { data: deal } = await supabase
    .from('deals')
    .select('id')
    .eq('id', dealId)
    .eq('athlete_id', athleteId)
    .single();

  if (!deal) {
    return { message: null, error: new Error('Deal not found') };
  }

  const { data, error } = await supabase
    .from('deal_messages')
    .insert({
      deal_id: dealId,
      sender_id: user.id,
      message,
      attachments: attachments.length ? attachments : null,
    })
    .select(MESSAGE_SELECT)
    .single();

  return { message: data, error };
}

/**
 * Marks all unread messages in a deal as read
 * @param {string} dealId - The deal UUID
 * @returns {Promise<{error: Error|null}>}
 */
export async function markMessagesAsRead(dealId) {
  const supabase = await getSupabaseClient();
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { error: userError || new Error('Not authenticated') };
  }

  const { error } = await supabase
    .from('deal_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('deal_id', dealId)
    .neq('sender_id', user.id)
    .is('read_at', null);

  return { error };
}

/**
 * Subscribes to real-time message updates for a deal
 * @param {string} dealId - The deal UUID
 * @param {Function} callback - Callback function for new messages
 * @returns {Object} Supabase subscription object
 */
export function subscribeToDealMessages(dealId, callback) {
  return subscribeToTable('deal_messages', callback, {
    event: 'INSERT',
    filter: `deal_id=eq.${dealId}`,
  });
}

/**
 * Subscribes to real-time updates for all athlete's deals
 * @param {Function} callback - Callback function for deal updates
 * @returns {Promise<Object>} Supabase subscription object
 * @throws {Error} If athlete ID cannot be determined
 */
export async function subscribeToMyDeals(callback) {
  const athleteId = await getMyAthleteId();

  const athleteCheck = ensureAthleteId(athleteId);
  if (!athleteCheck.valid) {
    throw athleteCheck.error;
  }

  return subscribeToTable('deals', callback, {
    event: '*',
    filter: `athlete_id=eq.${athleteId}`,
  });
}

/**
 * Calculates deal statistics for the current athlete
 * @returns {Promise<{stats: Object|null, error: Error|null}>}
 * @example
 * // Returns stats object with:
 * // { total_deals, completed_deals, active_deals, pending_deals,
 * //   total_earnings, average_deal_value, average_rating, deals_by_type }
 */
export async function getDealStats() {
  const { deals, error } = await getMyDeals();

  if (error || !deals) {
    return { stats: null, error };
  }

  const completedDeals = deals.filter(d => d.status === DEAL_STATUS.COMPLETED);
  const activeDeals = deals.filter(d => [DEAL_STATUS.ACCEPTED, DEAL_STATUS.ACTIVE].includes(d.status));
  const pendingDeals = deals.filter(d => [DEAL_STATUS.PENDING, DEAL_STATUS.NEGOTIATING].includes(d.status));

  const totalEarnings = completedDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
  const ratedDeals = completedDeals.filter(d => d.brand_rating);
  const avgRating = ratedDeals.length > 0
    ? ratedDeals.reduce((sum, d) => sum + d.brand_rating, 0) / ratedDeals.length
    : 0;

  const dealsByType = deals.reduce((acc, d) => {
    acc[d.deal_type] = (acc[d.deal_type] || 0) + 1;
    return acc;
  }, {});

  return {
    stats: {
      total_deals: deals.length,
      completed_deals: completedDeals.length,
      active_deals: activeDeals.length,
      pending_deals: pendingDeals.length,
      total_earnings: totalEarnings,
      average_deal_value: completedDeals.length > 0 ? totalEarnings / completedDeals.length : 0,
      average_rating: avgRating,
      deals_by_type: dealsByType,
    },
    error: null,
  };
}

// ============================================================================
// ATHLETE-INITIATED PROPOSALS (Bidirectional Deal System)
// ============================================================================

/**
 * Enum of all possible proposal status values
 * @constant {Object.<string, string>}
 */
export const PROPOSAL_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  VIEWED: 'viewed',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
};

/**
 * Create a deal proposal from athlete to brand
 * @param {object} proposal - Proposal data
 * @param {string} proposal.brand_id - Target brand ID
 * @param {string} proposal.title - Proposal title
 * @param {string} proposal.description - Pitch description
 * @param {string} proposal.deal_type - Type of deal proposed
 * @param {number} proposal.proposed_amount - Proposed compensation
 * @param {object} [proposal.deliverables] - What athlete will deliver
 * @param {boolean} [proposal.is_draft] - Save as draft instead of sending
 * @returns {Promise<{proposal: object | null, error: Error | null}>}
 */
export async function createProposal(proposal) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  const athleteCheck = ensureAthleteId(athleteId);
  if (!athleteCheck.valid) {
    return { proposal: null, error: athleteCheck.error };
  }

  if (!proposal.brand_id) {
    return { proposal: null, error: new Error('Brand ID is required') };
  }

  const status = proposal.is_draft ? PROPOSAL_STATUS.DRAFT : PROPOSAL_STATUS.SENT;

  const { data, error } = await supabase
    .from('athlete_proposals')
    .insert({
      athlete_id: athleteId,
      brand_id: proposal.brand_id,
      title: proposal.title,
      description: proposal.description,
      deal_type: proposal.deal_type,
      proposed_amount: proposal.proposed_amount,
      deliverables: proposal.deliverables || null,
      status,
      sent_at: status === PROPOSAL_STATUS.SENT ? new Date().toISOString() : null,
    })
    .select(`*, brand:brands(id, company_name, logo_url, industry)`)
    .single();

  return { proposal: data, error };
}

/**
 * Update an existing draft proposal
 * @param {string} proposalId - Proposal ID
 * @param {object} updates - Fields to update
 * @returns {Promise<{proposal: object | null, error: Error | null}>}
 */
export async function updateProposal(proposalId, updates) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  const athleteCheck = ensureAthleteId(athleteId);
  if (!athleteCheck.valid) {
    return { proposal: null, error: athleteCheck.error };
  }

  // Remove read-only fields
  const safeUpdates = { ...updates };
  delete safeUpdates.id;
  delete safeUpdates.athlete_id;
  delete safeUpdates.brand_id;
  delete safeUpdates.created_at;
  delete safeUpdates.sent_at;

  const { data, error } = await supabase
    .from('athlete_proposals')
    .update(safeUpdates)
    .eq('id', proposalId)
    .eq('athlete_id', athleteId)
    .eq('status', PROPOSAL_STATUS.DRAFT)
    .select(`*, brand:brands(id, company_name, logo_url, industry)`)
    .single();

  return { proposal: data, error };
}

/**
 * Send a draft proposal to the brand
 * @param {string} proposalId - Proposal ID
 * @returns {Promise<{proposal: object | null, error: Error | null}>}
 */
export async function sendProposal(proposalId) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  const athleteCheck = ensureAthleteId(athleteId);
  if (!athleteCheck.valid) {
    return { proposal: null, error: athleteCheck.error };
  }

  const { data, error } = await supabase
    .from('athlete_proposals')
    .update({
      status: PROPOSAL_STATUS.SENT,
      sent_at: new Date().toISOString(),
    })
    .eq('id', proposalId)
    .eq('athlete_id', athleteId)
    .eq('status', PROPOSAL_STATUS.DRAFT)
    .select(`*, brand:brands(id, company_name, logo_url, industry)`)
    .single();

  return { proposal: data, error };
}

/**
 * Get all proposals created by the current athlete
 * @param {object} [filters] - Filter options
 * @param {string[]} [filters.status] - Filter by status
 * @returns {Promise<{proposals: object[] | null, error: Error | null}>}
 */
export async function getMyProposals(filters = {}) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  const athleteCheck = ensureAthleteId(athleteId);
  if (!athleteCheck.valid) {
    return { proposals: null, error: athleteCheck.error };
  }

  let query = supabase
    .from('athlete_proposals')
    .select(`*, brand:brands(id, company_name, logo_url, industry)`)
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false });

  if (filters.status?.length) {
    query = query.in('status', filters.status);
  }

  const { data, error } = await query;
  return { proposals: data, error };
}

/**
 * Get a specific proposal by ID
 * @param {string} proposalId - Proposal ID
 * @returns {Promise<{proposal: object | null, error: Error | null}>}
 */
export async function getProposalById(proposalId) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  const athleteCheck = ensureAthleteId(athleteId);
  if (!athleteCheck.valid) {
    return { proposal: null, error: athleteCheck.error };
  }

  const { data, error } = await supabase
    .from('athlete_proposals')
    .select(`
      *,
      brand:brands(id, company_name, logo_url, industry, website_url, contact_name, contact_email)
    `)
    .eq('id', proposalId)
    .eq('athlete_id', athleteId)
    .single();

  return { proposal: data, error };
}

/**
 * Delete a draft proposal
 * @param {string} proposalId - Proposal ID
 * @returns {Promise<{error: Error | null}>}
 */
export async function deleteProposal(proposalId) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  const athleteCheck = ensureAthleteId(athleteId);
  if (!athleteCheck.valid) {
    return { error: athleteCheck.error };
  }

  const { error } = await supabase
    .from('athlete_proposals')
    .delete()
    .eq('id', proposalId)
    .eq('athlete_id', athleteId)
    .eq('status', PROPOSAL_STATUS.DRAFT);

  return { error };
}

/**
 * Withdraw a sent proposal (before brand responds)
 * @param {string} proposalId - Proposal ID
 * @returns {Promise<{error: Error | null}>}
 */
export async function withdrawProposal(proposalId) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  const athleteCheck = ensureAthleteId(athleteId);
  if (!athleteCheck.valid) {
    return { error: athleteCheck.error };
  }

  const { error } = await supabase
    .from('athlete_proposals')
    .delete()
    .eq('id', proposalId)
    .eq('athlete_id', athleteId)
    .in('status', [PROPOSAL_STATUS.SENT, PROPOSAL_STATUS.VIEWED]);

  return { error };
}

export default {
  getOpportunities,
  getOpportunityById,
  applyToOpportunity,
  getMyDeals,
  getDealsByCategory,
  getDealById,
  acceptDeal,
  rejectDeal,
  counterOfferDeal,
  signContract,
  completeDeal,
  submitDealReview,
  getDealMessages,
  sendDealMessage,
  markMessagesAsRead,
  subscribeToDealMessages,
  subscribeToMyDeals,
  getDealStats,

  // Athlete-Initiated Proposals
  createProposal,
  updateProposal,
  sendProposal,
  getMyProposals,
  getProposalById,
  deleteProposal,
  withdrawProposal,

  DEAL_STATUS,
  DEAL_TYPES,
  PROPOSAL_STATUS,
};
