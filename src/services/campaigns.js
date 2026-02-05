/**
 * GradeUp NIL Platform - Campaign Management Service
 *
 * Handles campaign creation, management, and ROI tracking for brands.
 * Campaigns are collections of opportunities and deals with unified reporting.
 *
 * @module services/campaigns
 * @version 1.0.0
 */

import { getSupabaseClient, getCurrentUser } from './supabase.js';

/**
 * @typedef {object} Campaign
 * @property {string} id - Campaign UUID
 * @property {string} brand_id - Brand UUID
 * @property {string} name - Campaign name
 * @property {string} [description] - Campaign description
 * @property {number} budget - Total budget
 * @property {number} spent - Amount spent
 * @property {string} start_date - Campaign start date
 * @property {string} end_date - Campaign end date
 * @property {string} status - Status (draft, active, paused, completed, cancelled)
 * @property {string[]} opportunity_ids - Associated opportunity IDs
 * @property {object} [goals] - Campaign goals and KPIs
 * @property {object} [targeting] - Target audience criteria
 * @property {string} created_at - Creation timestamp
 * @property {string} updated_at - Last update timestamp
 */

/**
 * @typedef {object} CampaignCreateData
 * @property {string} name - Campaign name
 * @property {string} [description] - Campaign description
 * @property {number} budget - Total budget allocation
 * @property {string} start_date - Start date (ISO string)
 * @property {string} end_date - End date (ISO string)
 * @property {object} [goals] - Campaign goals
 * @property {number} [goals.reach] - Target reach
 * @property {number} [goals.engagements] - Target engagements
 * @property {number} [goals.conversions] - Target conversions
 * @property {object} [targeting] - Targeting criteria
 * @property {string[]} [targeting.sports] - Target sports
 * @property {string[]} [targeting.schools] - Target schools
 * @property {string[]} [targeting.divisions] - Target divisions
 * @property {number} [targeting.min_gpa] - Minimum GPA
 * @property {number} [targeting.min_followers] - Minimum followers
 */

/**
 * @typedef {object} CampaignMetrics
 * @property {number} total_opportunities - Total opportunities created
 * @property {number} active_opportunities - Currently active opportunities
 * @property {number} total_deals - Total deals made
 * @property {number} active_deals - Currently active deals
 * @property {number} completed_deals - Completed deals
 * @property {number} total_athletes - Total unique athletes engaged
 * @property {number} budget_utilized - Percentage of budget used
 * @property {number} total_reach - Total social reach
 * @property {number} avg_engagement_rate - Average engagement rate
 * @property {number} cost_per_engagement - Cost per engagement
 * @property {number} roi_estimate - Estimated ROI percentage
 */

/**
 * Note: Campaigns are a logical grouping in this implementation.
 * They aggregate data from opportunities and deals.
 * A dedicated campaigns table could be added for more complex scenarios.
 */

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
 * Create a new campaign (group of opportunities)
 * Note: This creates tagged opportunities that share campaign metadata
 *
 * @param {CampaignCreateData} data - Campaign data
 * @returns {Promise<{campaign: object | null, error: Error | null}>}
 */
export async function createCampaign(data) {
  const { brandId, error: brandError } = await getCurrentBrandId();

  if (brandError || !brandId) {
    return { campaign: null, error: brandError || new Error('Brand profile not found') };
  }

  const supabase = await getSupabaseClient();

  // Validate required fields
  if (!data.name || !data.budget || !data.start_date || !data.end_date) {
    return { campaign: null, error: new Error('Name, budget, start_date, and end_date are required') };
  }

  // Validate dates
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);

  if (endDate <= startDate) {
    return { campaign: null, error: new Error('End date must be after start date') };
  }

  // Create a campaign record using activity log as metadata store
  // In a full implementation, this would be a dedicated campaigns table
  const campaignId = crypto.randomUUID();
  const campaign = {
    id: campaignId,
    brand_id: brandId,
    name: data.name,
    description: data.description || null,
    budget: data.budget,
    spent: 0,
    start_date: data.start_date,
    end_date: data.end_date,
    status: 'draft',
    goals: data.goals || {},
    targeting: data.targeting || {},
    opportunity_ids: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Store campaign in activity log with metadata
  const { error: logError } = await supabase.from('activity_log').insert({
    user_id: (await getCurrentUser()).user?.id,
    action: 'campaign_created',
    entity_type: 'campaign',
    entity_id: campaignId,
    metadata: campaign,
  });

  if (logError) {
    return { campaign: null, error: logError };
  }

  return { campaign, error: null };
}

/**
 * Get all campaigns for current brand
 *
 * @param {object} [options] - Query options
 * @param {string} [options.status] - Filter by status
 * @param {number} [options.limit=50] - Maximum results
 * @param {number} [options.offset=0] - Offset for pagination
 * @returns {Promise<{campaigns: Campaign[] | null, error: Error | null}>}
 */
export async function getCampaigns(options = {}) {
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { campaigns: null, error: userError || new Error('Not authenticated') };
  }

  const supabase = await getSupabaseClient();
  const { status, limit = 50, offset = 0 } = options;

  const { data, error } = await supabase
    .from('activity_log')
    .select('metadata')
    .eq('user_id', user.id)
    .eq('action', 'campaign_created')
    .eq('entity_type', 'campaign')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return { campaigns: null, error };
  }

  // Extract campaigns from activity log
  let campaigns = data?.map((d) => d.metadata).filter(Boolean) || [];

  // Apply status filter
  if (status) {
    campaigns = campaigns.filter((c) => c.status === status);
  }

  return { campaigns, error: null };
}

/**
 * Get a campaign by ID
 *
 * @param {string} campaignId - Campaign UUID
 * @returns {Promise<{campaign: Campaign | null, error: Error | null}>}
 */
export async function getCampaignById(campaignId) {
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { campaign: null, error: userError || new Error('Not authenticated') };
  }

  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('activity_log')
    .select('metadata')
    .eq('user_id', user.id)
    .eq('entity_type', 'campaign')
    .eq('entity_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return { campaign: null, error };
  }

  return { campaign: data?.metadata || null, error: null };
}

/**
 * Update a campaign
 *
 * @param {string} campaignId - Campaign UUID
 * @param {Partial<CampaignCreateData>} updates - Fields to update
 * @returns {Promise<{campaign: Campaign | null, error: Error | null}>}
 */
export async function updateCampaign(campaignId, updates) {
  const { campaign, error: fetchError } = await getCampaignById(campaignId);

  if (fetchError || !campaign) {
    return { campaign: null, error: fetchError || new Error('Campaign not found') };
  }

  const { user } = await getCurrentUser();
  const supabase = await getSupabaseClient();

  // Merge updates
  const updatedCampaign = {
    ...campaign,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  // Record update in activity log
  const { error } = await supabase.from('activity_log').insert({
    user_id: user?.id,
    action: 'campaign_updated',
    entity_type: 'campaign',
    entity_id: campaignId,
    metadata: updatedCampaign,
  });

  if (error) {
    return { campaign: null, error };
  }

  return { campaign: updatedCampaign, error: null };
}

/**
 * Update campaign status
 *
 * @param {string} campaignId - Campaign UUID
 * @param {'draft' | 'active' | 'paused' | 'completed' | 'cancelled'} status - New status
 * @returns {Promise<{campaign: Campaign | null, error: Error | null}>}
 */
export async function updateCampaignStatus(campaignId, status) {
  const validStatuses = ['draft', 'active', 'paused', 'completed', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return { campaign: null, error: new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`) };
  }

  return updateCampaign(campaignId, { status });
}

/**
 * Add opportunity to campaign
 *
 * @param {string} campaignId - Campaign UUID
 * @param {string} opportunityId - Opportunity UUID to add
 * @returns {Promise<{campaign: Campaign | null, error: Error | null}>}
 */
export async function addOpportunityToCampaign(campaignId, opportunityId) {
  const { campaign, error: fetchError } = await getCampaignById(campaignId);

  if (fetchError || !campaign) {
    return { campaign: null, error: fetchError || new Error('Campaign not found') };
  }

  const opportunityIds = campaign.opportunity_ids || [];

  if (opportunityIds.includes(opportunityId)) {
    return { campaign, error: null }; // Already added
  }

  return updateCampaign(campaignId, {
    opportunity_ids: [...opportunityIds, opportunityId],
  });
}

/**
 * Remove opportunity from campaign
 *
 * @param {string} campaignId - Campaign UUID
 * @param {string} opportunityId - Opportunity UUID to remove
 * @returns {Promise<{campaign: Campaign | null, error: Error | null}>}
 */
export async function removeOpportunityFromCampaign(campaignId, opportunityId) {
  const { campaign, error: fetchError } = await getCampaignById(campaignId);

  if (fetchError || !campaign) {
    return { campaign: null, error: fetchError || new Error('Campaign not found') };
  }

  const opportunityIds = (campaign.opportunity_ids || []).filter((id) => id !== opportunityId);

  return updateCampaign(campaignId, { opportunity_ids: opportunityIds });
}

/**
 * Get campaign metrics and ROI data
 *
 * @param {string} campaignId - Campaign UUID
 * @returns {Promise<{metrics: CampaignMetrics | null, error: Error | null}>}
 */
export async function getCampaignMetrics(campaignId) {
  const { campaign, error: campaignError } = await getCampaignById(campaignId);

  if (campaignError || !campaign) {
    return { metrics: null, error: campaignError || new Error('Campaign not found') };
  }

  const { brandId, error: brandError } = await getCurrentBrandId();

  if (brandError || !brandId) {
    return { metrics: null, error: brandError };
  }

  const supabase = await getSupabaseClient();

  // Get opportunities in this campaign
  const opportunityIds = campaign.opportunity_ids || [];

  const emptyMetrics = {
    total_opportunities: 0,
    active_opportunities: 0,
    total_deals: 0,
    active_deals: 0,
    completed_deals: 0,
    total_athletes: 0,
    budget_utilized: 0,
    total_reach: 0,
    avg_engagement_rate: 0,
    cost_per_engagement: 0,
    roi_estimate: 0,
  };

  if (opportunityIds.length === 0) {
    return { metrics: emptyMetrics, error: null };
  }

  // Fetch opportunities
  const { data: opportunities, error: oppsError } = await supabase
    .from('opportunities')
    .select('*')
    .in('id', opportunityIds)
    .eq('brand_id', brandId);

  if (oppsError) {
    return { metrics: null, error: oppsError };
  }

  // Fetch deals for these opportunities
  const { data: deals, error: dealsError } = await supabase
    .from('deals')
    .select(`
      id,
      status,
      amount,
      athlete_id,
      athlete:athletes(total_followers)
    `)
    .in('opportunity_id', opportunityIds)
    .eq('brand_id', brandId);

  if (dealsError) {
    return { metrics: null, error: dealsError };
  }

  const activeStatuses = ['active', 'pending', 'negotiating'];
  const spentStatuses = ['active', 'completed'];

  const totalOpportunities = opportunities?.length || 0;
  const activeOpportunities = opportunities?.filter((o) => o.status === 'active').length || 0;
  const totalDeals = deals?.length || 0;
  const activeDeals = deals?.filter((d) => activeStatuses.includes(d.status)).length || 0;
  const completedDeals = deals?.filter((d) => d.status === 'completed').length || 0;
  const uniqueAthletes = new Set(deals?.map((d) => d.athlete_id)).size;
  const totalSpent = deals?.filter((d) => spentStatuses.includes(d.status)).reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
  const budgetUtilized = campaign.budget > 0 ? (totalSpent / campaign.budget) * 100 : 0;
  const totalReach = deals?.reduce((sum, d) => sum + (d.athlete?.total_followers || 0), 0) || 0;

  const estimatedEngagementRate = 0.03;
  const estimatedEngagements = Math.round(totalReach * estimatedEngagementRate);
  const costPerEngagement = estimatedEngagements > 0 ? totalSpent / estimatedEngagements : 0;

  const avgCPM = 5;
  const estimatedValue = (totalReach * avgCPM) / 1000;
  const roiEstimate = totalSpent > 0 ? ((estimatedValue - totalSpent) / totalSpent) * 100 : 0;

  const metrics = {
    total_opportunities: totalOpportunities,
    active_opportunities: activeOpportunities,
    total_deals: totalDeals,
    active_deals: activeDeals,
    completed_deals: completedDeals,
    total_athletes: uniqueAthletes,
    budget_utilized: Math.round(budgetUtilized * 100) / 100,
    total_reach: totalReach,
    avg_engagement_rate: estimatedEngagementRate * 100,
    cost_per_engagement: Math.round(costPerEngagement * 100) / 100,
    roi_estimate: Math.round(roiEstimate * 100) / 100,
  };

  return { metrics, error: null };
}

/**
 * Get campaign performance over time
 *
 * @param {string} campaignId - Campaign UUID
 * @param {object} [options] - Query options
 * @param {'day' | 'week' | 'month'} [options.granularity='day'] - Time granularity
 * @returns {Promise<{timeline: object[] | null, error: Error | null}>}
 */
export async function getCampaignTimeline(campaignId, options = {}) {
  const { campaign, error: campaignError } = await getCampaignById(campaignId);

  if (campaignError || !campaign) {
    return { timeline: null, error: campaignError || new Error('Campaign not found') };
  }

  const { brandId, error: brandError } = await getCurrentBrandId();

  if (brandError || !brandId) {
    return { timeline: null, error: brandError };
  }

  const supabase = await getSupabaseClient();
  const opportunityIds = campaign.opportunity_ids || [];

  if (opportunityIds.length === 0) {
    return { timeline: [], error: null };
  }

  // Get all deals with timestamps
  const { data: deals, error: dealsError } = await supabase
    .from('deals')
    .select('id, status, amount, created_at, completed_at')
    .in('opportunity_id', opportunityIds)
    .eq('brand_id', brandId)
    .order('created_at', { ascending: true });

  if (dealsError) {
    return { timeline: null, error: dealsError };
  }

  const { granularity = 'day' } = options;
  const dateGroups = {};

  function getDateKey(date, granularity) {
    if (granularity === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return weekStart.toISOString().split('T')[0];
    }
    if (granularity === 'month') {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    }
    return date.toISOString().split('T')[0];
  }

  for (const deal of deals || []) {
    const dateKey = getDateKey(new Date(deal.created_at), granularity);

    if (!dateGroups[dateKey]) {
      dateGroups[dateKey] = {
        date: dateKey,
        deals_created: 0,
        deals_completed: 0,
        amount_committed: 0,
        amount_paid: 0,
      };
    }

    dateGroups[dateKey].deals_created++;
    dateGroups[dateKey].amount_committed += deal.amount || 0;

    if (deal.status === 'completed') {
      dateGroups[dateKey].deals_completed++;
      dateGroups[dateKey].amount_paid += deal.amount || 0;
    }
  }

  // Convert to array and sort
  const timeline = Object.values(dateGroups).sort((a, b) => a.date.localeCompare(b.date));

  return { timeline, error: null };
}

/**
 * Get brand-wide campaign summary
 *
 * @returns {Promise<{summary: object | null, error: Error | null}>}
 */
export async function getCampaignsSummary() {
  const { campaigns, error: campaignsError } = await getCampaigns();

  if (campaignsError) {
    return { summary: null, error: campaignsError };
  }

  const { brandId, error: brandError } = await getCurrentBrandId();

  if (brandError || !brandId) {
    return { summary: null, error: brandError };
  }

  const supabase = await getSupabaseClient();

  // Get all opportunities and deals for the brand
  const { data: opportunities, error: oppsError } = await supabase
    .from('opportunities')
    .select('id, status, compensation_amount, athletes_selected')
    .eq('brand_id', brandId);

  if (oppsError) {
    return { summary: null, error: oppsError };
  }

  const { data: deals, error: dealsError } = await supabase
    .from('deals')
    .select('id, status, amount')
    .eq('brand_id', brandId);

  if (dealsError) {
    return { summary: null, error: dealsError };
  }

  const now = Date.now();
  const activeCampaigns = campaigns?.filter((c) =>
    c.status === 'active' &&
    new Date(c.start_date).getTime() <= now &&
    new Date(c.end_date).getTime() >= now
  ) || [];

  const totalBudget = campaigns?.reduce((sum, c) => sum + (c.budget || 0), 0) || 0;
  const spentStatuses = ['active', 'completed'];
  const totalSpent = deals?.filter((d) => spentStatuses.includes(d.status)).reduce((sum, d) => sum + (d.amount || 0), 0) || 0;

  const summary = {
    total_campaigns: campaigns?.length || 0,
    active_campaigns: activeCampaigns.length,
    draft_campaigns: campaigns?.filter((c) => c.status === 'draft').length || 0,
    completed_campaigns: campaigns?.filter((c) => c.status === 'completed').length || 0,
    total_budget: totalBudget,
    total_spent: totalSpent,
    budget_remaining: totalBudget - totalSpent,
    total_opportunities: opportunities?.length || 0,
    active_opportunities: opportunities?.filter((o) => o.status === 'active').length || 0,
    total_deals: deals?.length || 0,
    active_deals: deals?.filter((d) => ['active', 'pending', 'negotiating'].includes(d.status)).length || 0,
    completed_deals: deals?.filter((d) => d.status === 'completed').length || 0,
    total_athletes_engaged: opportunities?.reduce((sum, o) => sum + (o.athletes_selected || 0), 0) || 0,
  };

  return { summary, error: null };
}

/**
 * Delete a campaign (soft delete - marks as cancelled)
 *
 * @param {string} campaignId - Campaign UUID
 * @returns {Promise<{success: boolean, error: Error | null}>}
 */
export async function deleteCampaign(campaignId) {
  const { campaign, error } = await updateCampaignStatus(campaignId, 'cancelled');

  return {
    success: !error && campaign !== null,
    error,
  };
}

/**
 * Duplicate a campaign
 *
 * @param {string} campaignId - Campaign UUID to duplicate
 * @param {string} [newName] - Name for the new campaign
 * @returns {Promise<{campaign: Campaign | null, error: Error | null}>}
 */
export async function duplicateCampaign(campaignId, newName) {
  const { campaign, error: fetchError } = await getCampaignById(campaignId);

  if (fetchError || !campaign) {
    return { campaign: null, error: fetchError || new Error('Campaign not found') };
  }

  // Create new campaign with same settings but fresh IDs and dates
  const newCampaign = {
    name: newName || `${campaign.name} (Copy)`,
    description: campaign.description,
    budget: campaign.budget,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    goals: campaign.goals,
    targeting: campaign.targeting,
  };

  return createCampaign(newCampaign);
}

export default {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  updateCampaignStatus,
  addOpportunityToCampaign,
  removeOpportunityFromCampaign,
  getCampaignMetrics,
  getCampaignTimeline,
  getCampaignsSummary,
  deleteCampaign,
  duplicateCampaign,
};
