import { createClient } from '@/lib/supabase/client';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type DealStatus = 'draft' | 'pending' | 'negotiating' | 'accepted' | 'active' | 'completed' | 'cancelled' | 'expired' | 'rejected' | 'paused';
export type DealType = 'social_post' | 'appearance' | 'endorsement' | 'autograph' | 'camp' | 'merchandise' | 'other';

// Deliverable types
export type DeliverableStatus = 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'revision';
export type ContentPlatform = 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'facebook' | 'linkedin' | 'other';
export type ContentType = 'reel' | 'story' | 'feed_post' | 'video' | 'short' | 'live' | 'carousel' | 'blog' | 'other';

// Service result type for consistent error handling
export interface ServiceResult<T = null> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

export interface Deliverable {
  id: string;
  deal_id: string;
  athlete_id: string;
  campaign_id: string | null;
  platform: ContentPlatform;
  content_type: ContentType;
  title: string | null;
  description: string | null;
  requirements: string | null;
  status: DeliverableStatus;
  due_date: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  content_url: string | null;
  draft_url: string | null;
  feedback: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  athlete?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
}

export interface Deal {
  id: string;
  athlete_id: string;
  brand_id: string;
  opportunity_id: string | null;
  title: string;
  description: string | null;
  deal_type: DealType;
  status: DealStatus;
  compensation_amount: number;
  compensation_type: 'fixed' | 'hourly' | 'performance';
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  brand?: { company_name: string; logo_url: string | null };
}

export interface Opportunity {
  id: string;
  brand_id: string;
  title: string;
  description: string;
  deal_type: DealType;
  compensation_amount: number;
  status: 'active' | 'closed' | 'draft';
  brand?: { company_name: string; logo_url: string | null };
}

export interface DealFilters {
  status?: DealStatus[];
  deal_types?: DealType[];
  page?: number;
  page_size?: number;
}

// Service functions

/**
 * Get deals for a specific athlete with optional filters
 */
export async function getAthleteDeals(athleteId: string, filters?: DealFilters) {
  const supabase = createClient();
  const page = filters?.page ?? 1;
  const pageSize = filters?.page_size ?? 10;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('deals')
    .select(`
      *,
      brand:brands(company_name, logo_url)
    `, { count: 'exact' })
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  if (filters?.deal_types && filters.deal_types.length > 0) {
    query = query.in('deal_type', filters.deal_types);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch athlete deals: ${error.message}`);
  }

  return {
    deals: data as Deal[],
    total: count ?? 0,
    page,
    page_size: pageSize,
    total_pages: Math.ceil((count ?? 0) / pageSize),
  };
}

/**
 * Get deals for a specific brand with optional filters
 */
export async function getBrandDeals(brandId: string, filters?: DealFilters) {
  const supabase = createClient();
  const page = filters?.page ?? 1;
  const pageSize = filters?.page_size ?? 10;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('deals')
    .select(`
      *,
      brand:brands(company_name, logo_url)
    `, { count: 'exact' })
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  if (filters?.deal_types && filters.deal_types.length > 0) {
    query = query.in('deal_type', filters.deal_types);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch brand deals: ${error.message}`);
  }

  return {
    deals: data as Deal[],
    total: count ?? 0,
    page,
    page_size: pageSize,
    total_pages: Math.ceil((count ?? 0) / pageSize),
  };
}

/**
 * Get a single deal by ID
 */
export async function getDealById(dealId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('deals')
    .select(`
      *,
      brand:brands(company_name, logo_url)
    `)
    .eq('id', dealId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch deal: ${error.message}`);
  }

  return data as Deal;
}

/**
 * Update the status of a deal
 */
export async function updateDealStatus(dealId: string, status: DealStatus) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('deals')
    .update({ status })
    .eq('id', dealId)
    .select(`
      *,
      brand:brands(company_name, logo_url)
    `)
    .single();

  if (error) {
    throw new Error(`Failed to update deal status: ${error.message}`);
  }

  return data as Deal;
}

/**
 * Get opportunities with optional filters
 */
export async function getOpportunities(filters?: DealFilters) {
  const supabase = createClient();
  const page = filters?.page ?? 1;
  const pageSize = filters?.page_size ?? 10;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('opportunities')
    .select(`
      *,
      brand:brands(company_name, logo_url)
    `, { count: 'exact' })
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (filters?.deal_types && filters.deal_types.length > 0) {
    query = query.in('deal_type', filters.deal_types);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch opportunities: ${error.message}`);
  }

  return {
    opportunities: data as Opportunity[],
    total: count ?? 0,
    page,
    page_size: pageSize,
    total_pages: Math.ceil((count ?? 0) / pageSize),
  };
}

/**
 * Accept a deal (update status to 'accepted')
 */
export async function acceptDeal(dealId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('deals')
    .update({ status: 'accepted' as DealStatus })
    .eq('id', dealId)
    .select(`
      *,
      brand:brands(company_name, logo_url)
    `)
    .single();

  if (error) {
    throw new Error(`Failed to accept deal: ${error.message}`);
  }

  return data as Deal;
}

/**
 * Reject a deal (update status to 'cancelled' with optional reason)
 */
export async function rejectDeal(dealId: string, reason?: string) {
  const supabase = createClient();

  const updateData: { status: DealStatus; rejection_reason?: string } = {
    status: 'cancelled',
  };

  if (reason) {
    updateData.rejection_reason = reason;
  }

  const { data, error } = await supabase
    .from('deals')
    .update(updateData)
    .eq('id', dealId)
    .select(`
      *,
      brand:brands(company_name, logo_url)
    `)
    .single();

  if (error) {
    throw new Error(`Failed to reject deal: ${error.message}`);
  }

  return data as Deal;
}

// Input type for creating a new deal
export interface CreateDealInput {
  athlete_id: string;
  brand_id: string;
  opportunity_id?: string;
  title: string;
  description?: string;
  deal_type: DealType;
  compensation_amount: number;
  compensation_type: 'fixed' | 'hourly' | 'performance';
  start_date?: string;
  end_date?: string;
  deliverables?: string;
}

// Input type for counter offer
export interface CounterOfferInput {
  compensation_amount?: number;
  compensation_type?: 'fixed' | 'hourly' | 'performance';
  start_date?: string;
  end_date?: string;
  deliverables?: string;
  counter_notes?: string;
}

/**
 * Create a new deal
 */
export async function createDeal(data: CreateDealInput): Promise<{ data: Deal | null; error: Error | null }> {
  const supabase = createClient();

  const { data: deal, error } = await supabase
    .from('deals')
    .insert({
      ...data,
      status: 'pending' as DealStatus,
    })
    .select(`
      *,
      brand:brands(company_name, logo_url)
    `)
    .single();

  if (error) {
    return { data: null, error: new Error(`Failed to create deal: ${error.message}`) };
  }

  return { data: deal as Deal, error: null };
}

/**
 * Submit a counter offer for a deal
 */
export async function submitCounterOffer(
  dealId: string,
  newTerms: CounterOfferInput
): Promise<{ data: Deal | null; error: Error | null }> {
  const supabase = createClient();

  // First, log the counter offer to deal_history for audit trail
  const { error: historyError } = await supabase
    .from('deal_history')
    .insert({
      deal_id: dealId,
      action: 'counter_offer',
      changes: newTerms,
      created_at: new Date().toISOString(),
    });

  if (historyError && process.env.NODE_ENV === 'development') {
    console.warn('Failed to log counter offer to history:', historyError.message);
    // Continue with the update even if history logging fails
  }

  // Update the deal with new terms and set status to negotiating
  const updateData = {
    ...newTerms,
    status: 'negotiating' as DealStatus,
    updated_at: new Date().toISOString(),
  };

  const { data: deal, error } = await supabase
    .from('deals')
    .update(updateData)
    .eq('id', dealId)
    .select(`
      *,
      brand:brands(company_name, logo_url)
    `)
    .single();

  if (error) {
    return { data: null, error: new Error(`Failed to submit counter offer: ${error.message}`) };
  }

  return { data: deal as Deal, error: null };
}

/**
 * Mark a deal as completed
 */
export async function completeDeal(
  dealId: string
): Promise<{ data: Deal | null; error: Error | null }> {
  const supabase = createClient();

  const { data: deal, error } = await supabase
    .from('deals')
    .update({
      status: 'completed' as DealStatus,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', dealId)
    .select(`
      *,
      brand:brands(company_name, logo_url)
    `)
    .single();

  if (error) {
    return { data: null, error: new Error(`Failed to complete deal: ${error.message}`) };
  }

  return { data: deal as Deal, error: null };
}

/**
 * Cancel a deal with a reason
 */
export async function cancelDeal(
  dealId: string,
  reason: string
): Promise<{ data: null; error: Error | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('deals')
    .update({
      status: 'cancelled' as DealStatus,
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', dealId);

  if (error) {
    return { data: null, error: new Error(`Failed to cancel deal: ${error.message}`) };
  }

  return { data: null, error: null };
}

/**
 * Get deal history (all changes and counter offers)
 */
export async function getDealHistory(dealId: string): Promise<{
  data: Array<{ id: string; action: string; changes: Record<string, unknown>; created_at: string }> | null;
  error: Error | null
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('deal_history')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: new Error(`Failed to fetch deal history: ${error.message}`) };
  }

  return { data, error: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// DELIVERABLE SERVICE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all deliverables for a specific deal
 */
export async function getDealDeliverables(dealId: string): Promise<ServiceResult<Deliverable[]>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('deliverables')
    .select(`
      *,
      athlete:athletes(id, first_name, last_name, avatar_url)
    `)
    .eq('deal_id', dealId)
    .order('due_date', { ascending: true });

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } };
  }

  return { data: data as Deliverable[], error: null };
}

/**
 * Get all deliverables for a campaign
 */
export async function getCampaignDeliverables(campaignId: string): Promise<ServiceResult<Deliverable[]>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('deliverables')
    .select(`
      *,
      athlete:athletes(id, first_name, last_name, avatar_url)
    `)
    .eq('campaign_id', campaignId)
    .order('due_date', { ascending: true });

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } };
  }

  return { data: data as Deliverable[], error: null };
}

/**
 * Get a single deliverable by ID
 */
export async function getDeliverableById(deliverableId: string): Promise<ServiceResult<Deliverable>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('deliverables')
    .select(`
      *,
      athlete:athletes(id, first_name, last_name, avatar_url)
    `)
    .eq('id', deliverableId)
    .single();

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } };
  }

  return { data: data as Deliverable, error: null };
}

/**
 * Update deliverable status (approve/reject)
 * Used by brands to review submitted deliverables
 */
export async function updateDeliverableStatus(
  dealId: string,
  deliverableId: string,
  status: 'approved' | 'rejected',
  feedback?: string
): Promise<ServiceResult<Deliverable>> {
  const supabase = createClient();

  const updateData: {
    status: DeliverableStatus;
    feedback?: string;
    reviewed_at: string;
  } = {
    status,
    reviewed_at: new Date().toISOString(),
  };

  if (feedback) {
    updateData.feedback = feedback;
  }

  const { data, error } = await supabase
    .from('deliverables')
    .update(updateData)
    .eq('id', deliverableId)
    .eq('deal_id', dealId)
    .select(`
      *,
      athlete:athletes(id, first_name, last_name, avatar_url)
    `)
    .single();

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } };
  }

  return { data: data as Deliverable, error: null };
}

/**
 * Submit a deliverable (athlete submits their content)
 */
export async function submitDeliverable(
  deliverableId: string,
  contentUrl: string,
  draftUrl?: string
): Promise<ServiceResult<Deliverable>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('deliverables')
    .update({
      status: 'submitted' as DeliverableStatus,
      content_url: contentUrl,
      draft_url: draftUrl || null,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', deliverableId)
    .select(`
      *,
      athlete:athletes(id, first_name, last_name, avatar_url)
    `)
    .single();

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } };
  }

  return { data: data as Deliverable, error: null };
}

/**
 * Request revision on a deliverable
 */
export async function requestDeliverableRevision(
  deliverableId: string,
  feedback: string
): Promise<ServiceResult<Deliverable>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('deliverables')
    .update({
      status: 'revision' as DeliverableStatus,
      feedback,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', deliverableId)
    .select(`
      *,
      athlete:athletes(id, first_name, last_name, avatar_url)
    `)
    .single();

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } };
  }

  return { data: data as Deliverable, error: null };
}

/**
 * Create a new deliverable for a deal
 */
export interface CreateDeliverableInput {
  deal_id: string;
  athlete_id: string;
  campaign_id?: string;
  platform: ContentPlatform;
  content_type: ContentType;
  title?: string;
  description?: string;
  requirements?: string;
  due_date?: string;
}

export async function createDeliverable(
  input: CreateDeliverableInput
): Promise<ServiceResult<Deliverable>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('deliverables')
    .insert({
      ...input,
      status: 'pending' as DeliverableStatus,
    })
    .select(`
      *,
      athlete:athletes(id, first_name, last_name, avatar_url)
    `)
    .single();

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } };
  }

  return { data: data as Deliverable, error: null };
}

/**
 * Delete a deliverable
 */
export async function deleteDeliverable(deliverableId: string): Promise<ServiceResult> {
  const supabase = createClient();

  const { error } = await supabase
    .from('deliverables')
    .delete()
    .eq('id', deliverableId);

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } };
  }

  return { data: null, error: null };
}
