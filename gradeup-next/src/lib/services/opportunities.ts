import { createClient } from '@/lib/supabase/client';

// Types
export type ApplicationStatus =
  | 'pending'
  | 'under_review'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

export interface Application {
  id: string;
  athlete_id: string;
  opportunity_id: string;
  status: ApplicationStatus;
  cover_letter?: string;
  portfolio_url?: string;
  additional_info?: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  // Joined relations
  opportunity?: {
    id: string;
    title: string;
    description?: string;
    compensation_amount: number;
    deal_type: string;
    status: string;
    brand?: {
      id: string;
      company_name: string;
      logo_url?: string;
    };
  };
  athlete?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
    sport?: {
      name: string;
    };
    school?: {
      name: string;
    };
  };
}

export interface OpportunityFilters {
  deal_type?: string[];
  min_compensation?: number;
  max_compensation?: number;
  sport_id?: string;
  page?: number;
  page_size?: number;
}

// Service functions

/**
 * Apply to an opportunity as an athlete
 */
export async function applyToOpportunity(
  athleteId: string,
  opportunityId: string,
  applicationData?: {
    cover_letter?: string;
    portfolio_url?: string;
    additional_info?: string;
  }
): Promise<{ data: Application | null; error: Error | null }> {
  const supabase = createClient();

  // Check if athlete has already applied
  const { data: existing, error: checkError } = await supabase
    .from('opportunity_applications')
    .select('id, status')
    .eq('athlete_id', athleteId)
    .eq('opportunity_id', opportunityId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    return { data: null, error: new Error(`Failed to check existing application: ${checkError.message}`) };
  }

  if (existing && existing.status !== 'withdrawn') {
    return { data: null, error: new Error('You have already applied to this opportunity') };
  }

  // If previously withdrawn, update instead of insert
  if (existing && existing.status === 'withdrawn') {
    const { data, error } = await supabase
      .from('opportunity_applications')
      .update({
        status: 'pending' as ApplicationStatus,
        cover_letter: applicationData?.cover_letter,
        portfolio_url: applicationData?.portfolio_url,
        additional_info: applicationData?.additional_info,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select(`
        *,
        opportunity:opportunities(
          id, title, description, compensation_amount, deal_type, status,
          brand:brands(id, company_name, logo_url)
        )
      `)
      .single();

    if (error) {
      return { data: null, error: new Error(`Failed to resubmit application: ${error.message}`) };
    }

    return { data: data as Application, error: null };
  }

  // Create new application
  const { data, error } = await supabase
    .from('opportunity_applications')
    .insert({
      athlete_id: athleteId,
      opportunity_id: opportunityId,
      status: 'pending' as ApplicationStatus,
      cover_letter: applicationData?.cover_letter,
      portfolio_url: applicationData?.portfolio_url,
      additional_info: applicationData?.additional_info,
      submitted_at: new Date().toISOString(),
    })
    .select(`
      *,
      opportunity:opportunities(
        id, title, description, compensation_amount, deal_type, status,
        brand:brands(id, company_name, logo_url)
      )
    `)
    .single();

  if (error) {
    return { data: null, error: new Error(`Failed to submit application: ${error.message}`) };
  }

  return { data: data as Application, error: null };
}

/**
 * Get all applications for an athlete
 */
export async function getMyApplications(
  athleteId: string
): Promise<{ data: Application[] | null; error: Error | null }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('opportunity_applications')
    .select(`
      *,
      opportunity:opportunities(
        id, title, description, compensation_amount, deal_type, status,
        brand:brands(id, company_name, logo_url)
      )
    `)
    .eq('athlete_id', athleteId)
    .order('submitted_at', { ascending: false });

  if (error) {
    return { data: null, error: new Error(`Failed to fetch applications: ${error.message}`) };
  }

  return { data: data as Application[], error: null };
}

/**
 * Withdraw an application
 */
export async function withdrawApplication(
  applicationId: string
): Promise<{ data: null; error: Error | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('opportunity_applications')
    .update({
      status: 'withdrawn' as ApplicationStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .in('status', ['pending', 'under_review']);

  if (error) {
    return { data: null, error: new Error(`Failed to withdraw application: ${error.message}`) };
  }

  return { data: null, error: null };
}

/**
 * Get applications for an opportunity (brand view)
 */
export async function getOpportunityApplications(
  opportunityId: string
): Promise<{ data: Application[] | null; error: Error | null }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('opportunity_applications')
    .select(`
      *,
      athlete:athletes(
        id, first_name, last_name, avatar_url, gpa, total_followers,
        sport:sports(name),
        school:schools(name)
      )
    `)
    .eq('opportunity_id', opportunityId)
    .neq('status', 'withdrawn')
    .order('submitted_at', { ascending: true });

  if (error) {
    return { data: null, error: new Error(`Failed to fetch applications: ${error.message}`) };
  }

  return { data: data as Application[], error: null };
}

/**
 * Accept an application (brand action - creates a deal)
 */
export async function acceptApplication(
  applicationId: string,
  brandUserId: string
): Promise<{ data: { application: Application; dealId: string } | null; error: Error | null }> {
  const supabase = createClient();

  // Get the application with opportunity details
  const { data: application, error: fetchError } = await supabase
    .from('opportunity_applications')
    .select(`
      *,
      opportunity:opportunities(*)
    `)
    .eq('id', applicationId)
    .single();

  if (fetchError) {
    return { data: null, error: new Error(`Failed to fetch application: ${fetchError.message}`) };
  }

  // Update application status
  const { error: updateError } = await supabase
    .from('opportunity_applications')
    .update({
      status: 'accepted' as ApplicationStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: brandUserId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId);

  if (updateError) {
    return { data: null, error: new Error(`Failed to accept application: ${updateError.message}`) };
  }

  // Create a deal from the opportunity
  const opportunity = application.opportunity;
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .insert({
      athlete_id: application.athlete_id,
      brand_id: opportunity.brand_id,
      opportunity_id: opportunity.id,
      title: opportunity.title,
      description: opportunity.description,
      deal_type: opportunity.deal_type,
      compensation_amount: opportunity.compensation_amount,
      compensation_type: opportunity.compensation_type || 'fixed',
      status: 'pending',
    })
    .select('id')
    .single();

  if (dealError) {
    return { data: null, error: new Error(`Failed to create deal from application: ${dealError.message}`) };
  }

  return {
    data: {
      application: application as Application,
      dealId: deal.id,
    },
    error: null,
  };
}

/**
 * Reject an application
 */
export async function rejectApplication(
  applicationId: string,
  brandUserId: string,
  reason?: string
): Promise<{ data: null; error: Error | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('opportunity_applications')
    .update({
      status: 'rejected' as ApplicationStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: brandUserId,
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId);

  if (error) {
    return { data: null, error: new Error(`Failed to reject application: ${error.message}`) };
  }

  return { data: null, error: null };
}

/**
 * Get a single application by ID
 */
export async function getApplicationById(
  applicationId: string
): Promise<{ data: Application | null; error: Error | null }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('opportunity_applications')
    .select(`
      *,
      opportunity:opportunities(
        id, title, description, compensation_amount, deal_type, status,
        brand:brands(id, company_name, logo_url)
      ),
      athlete:athletes(
        id, first_name, last_name, avatar_url, gpa, total_followers,
        sport:sports(name),
        school:schools(name)
      )
    `)
    .eq('id', applicationId)
    .single();

  if (error) {
    return { data: null, error: new Error(`Failed to fetch application: ${error.message}`) };
  }

  return { data: data as Application, error: null };
}

/**
 * Check if an athlete has applied to an opportunity
 */
export async function hasApplied(
  athleteId: string,
  opportunityId: string
): Promise<{ data: { applied: boolean; status?: ApplicationStatus } | null; error: Error | null }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('opportunity_applications')
    .select('status')
    .eq('athlete_id', athleteId)
    .eq('opportunity_id', opportunityId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return { data: null, error: new Error(`Failed to check application status: ${error.message}`) };
  }

  if (!data) {
    return { data: { applied: false }, error: null };
  }

  return {
    data: {
      applied: data.status !== 'withdrawn',
      status: data.status as ApplicationStatus,
    },
    error: null,
  };
}
