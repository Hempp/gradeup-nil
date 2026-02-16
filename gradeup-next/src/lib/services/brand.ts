'use client';

import { createClient } from '@/lib/supabase/client';
import { Athlete } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

export type CompanyType = 'corporation' | 'llc' | 'partnership' | 'sole_proprietor' | 'nonprofit';

export type Industry =
  | 'sports'
  | 'fashion'
  | 'food_beverage'
  | 'technology'
  | 'entertainment'
  | 'health_wellness'
  | 'automotive'
  | 'finance'
  | 'retail'
  | 'other';

export interface Brand {
  id: string;
  profile_id: string;
  company_name: string;
  company_type: CompanyType | null;
  industry: Industry | null;
  website_url: string | null;
  logo_url: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
  contact_name: string | null;
  contact_title: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_verified: boolean;
  subscription_tier: 'free' | 'pro' | 'enterprise';
}

export interface Campaign {
  id: string;
  brand_id: string;
  title: string;
  description: string | null;
  budget: number;
  start_date: string;
  end_date: string | null;
  status: 'draft' | 'active' | 'paused' | 'completed';
  target_sports?: string[];
  target_divisions?: string[];
}

export interface BrandAnalytics {
  total_spent: number;
  total_deals: number;
  active_deals: number;
  total_impressions: number;
  total_engagements: number;
  avg_roi: number;
}

export interface ServiceResult<T = null> {
  data: T | null;
  error: Error | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the current user's brand ID from their profile
 */
async function getCurrentBrandId(): Promise<string | null> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  if (brandError || !brand) {
    return null;
  }

  return brand.id;
}

// ═══════════════════════════════════════════════════════════════════════════
// Brand Profile Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the current user's brand profile
 */
export async function getMyBrandProfile(): Promise<ServiceResult<Brand>> {
  const supabase = createClient();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: userError || new Error('Not authenticated') };
    }

    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select(
        `
        id,
        profile_id,
        company_name,
        company_type,
        industry,
        website_url,
        logo_url,
        description,
        city,
        state,
        contact_name,
        contact_title,
        contact_email,
        contact_phone,
        is_verified,
        subscription_tier
      `
      )
      .eq('profile_id', user.id)
      .single();

    if (brandError) {
      return { data: null, error: brandError };
    }

    return { data: brand as Brand, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Update the current user's brand profile
 */
export async function updateBrandProfile(
  updates: Partial<Brand>
): Promise<ServiceResult<Brand>> {
  const supabase = createClient();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: userError || new Error('Not authenticated') };
    }

    // Remove id and profile_id from updates to prevent changing them
    const { id: _id, profile_id: _profile_id, ...safeUpdates } = updates;

    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .update(safeUpdates)
      .eq('profile_id', user.id)
      .select(
        `
        id,
        profile_id,
        company_name,
        company_type,
        industry,
        website_url,
        logo_url,
        description,
        city,
        state,
        contact_name,
        contact_title,
        contact_email,
        contact_phone,
        is_verified,
        subscription_tier
      `
      )
      .single();

    if (brandError) {
      return { data: null, error: brandError };
    }

    return { data: brand as Brand, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Campaign Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get campaigns for a brand (defaults to current user's brand)
 */
export async function getBrandCampaigns(
  brandId?: string
): Promise<ServiceResult<Campaign[]>> {
  const supabase = createClient();

  try {
    const targetBrandId = brandId || (await getCurrentBrandId());

    if (!targetBrandId) {
      return { data: null, error: new Error('Brand not found') };
    }

    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select(
        `
        id,
        brand_id,
        title,
        description,
        budget,
        start_date,
        end_date,
        status,
        target_sports,
        target_divisions
      `
      )
      .eq('brand_id', targetBrandId)
      .order('created_at', { ascending: false });

    if (campaignsError) {
      return { data: null, error: campaignsError };
    }

    return { data: campaigns as Campaign[], error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Create a new campaign for the current user's brand
 */
export async function createCampaign(
  data: Omit<Campaign, 'id' | 'brand_id'>
): Promise<ServiceResult<Campaign>> {
  const supabase = createClient();

  try {
    const brandId = await getCurrentBrandId();

    if (!brandId) {
      return { data: null, error: new Error('Brand not found') };
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        brand_id: brandId,
        title: data.title,
        description: data.description,
        budget: data.budget,
        start_date: data.start_date,
        end_date: data.end_date,
        status: data.status,
        target_sports: data.target_sports,
        target_divisions: data.target_divisions,
      })
      .select(
        `
        id,
        brand_id,
        title,
        description,
        budget,
        start_date,
        end_date,
        status,
        target_sports,
        target_divisions
      `
      )
      .single();

    if (campaignError) {
      return { data: null, error: campaignError };
    }

    return { data: campaign as Campaign, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Update an existing campaign
 */
export async function updateCampaign(
  campaignId: string,
  updates: Partial<Campaign>
): Promise<ServiceResult<Campaign>> {
  const supabase = createClient();

  try {
    const brandId = await getCurrentBrandId();

    if (!brandId) {
      return { data: null, error: new Error('Brand not found') };
    }

    // Remove id and brand_id from updates to prevent changing them
    const { id: _id, brand_id: _brand_id, ...safeUpdates } = updates;

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .update(safeUpdates)
      .eq('id', campaignId)
      .eq('brand_id', brandId) // Ensure user can only update their own campaigns
      .select(
        `
        id,
        brand_id,
        title,
        description,
        budget,
        start_date,
        end_date,
        status,
        target_sports,
        target_divisions
      `
      )
      .single();

    if (campaignError) {
      return { data: null, error: campaignError };
    }

    return { data: campaign as Campaign, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Analytics Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get analytics for a brand (defaults to current user's brand)
 */
export async function getBrandAnalytics(
  brandId?: string
): Promise<ServiceResult<BrandAnalytics>> {
  const supabase = createClient();

  try {
    const targetBrandId = brandId || (await getCurrentBrandId());

    if (!targetBrandId) {
      return { data: null, error: new Error('Brand not found') };
    }

    // Get deals data for analytics
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select('id, status, compensation_amount')
      .eq('brand_id', targetBrandId);

    if (dealsError) {
      return { data: null, error: dealsError };
    }

    // Calculate analytics from deals
    const totalDeals = deals?.length || 0;
    const activeDeals = deals?.filter(
      (d) => d.status === 'active' || d.status === 'accepted'
    ).length || 0;
    const completedDeals = deals?.filter((d) => d.status === 'completed') || [];
    const totalSpent = completedDeals.reduce(
      (sum, d) => sum + (d.compensation_amount || 0),
      0
    );

    // Get brand analytics from analytics table if it exists
    const { data: analyticsData } = await supabase
      .from('brand_analytics')
      .select('total_impressions, total_engagements, avg_roi')
      .eq('brand_id', targetBrandId)
      .single();

    const analytics: BrandAnalytics = {
      total_spent: totalSpent,
      total_deals: totalDeals,
      active_deals: activeDeals,
      total_impressions: analyticsData?.total_impressions || 0,
      total_engagements: analyticsData?.total_engagements || 0,
      avg_roi: analyticsData?.avg_roi || 0,
    };

    return { data: analytics, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Shortlist Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get shortlisted athletes for a brand (defaults to current user's brand)
 */
export async function getShortlistedAthletes(
  brandId?: string
): Promise<ServiceResult<Athlete[]>> {
  const supabase = createClient();

  try {
    const targetBrandId = brandId || (await getCurrentBrandId());

    if (!targetBrandId) {
      return { data: null, error: new Error('Brand not found') };
    }

    const { data: shortlist, error: shortlistError } = await supabase
      .from('brand_shortlist')
      .select(
        `
        athlete:athletes(
          id,
          profile_id,
          first_name,
          last_name,
          email,
          phone,
          gpa,
          school_id,
          sport_id,
          major,
          minor,
          position,
          gender,
          jersey_number,
          height,
          weight,
          hometown,
          expected_graduation,
          academic_year,
          avatar_url,
          bio,
          instagram_handle,
          twitter_handle,
          tiktok_handle,
          total_followers,
          enrollment_verified,
          sport_verified,
          grades_verified,
          identity_verified,
          created_at,
          updated_at,
          school:schools(*),
          sport:sports(*)
        )
      `
      )
      .eq('brand_id', targetBrandId);

    if (shortlistError) {
      return { data: null, error: shortlistError };
    }

    // Extract athletes from the shortlist join (athlete is an array from the join)
    const athletes = (shortlist
      ?.flatMap((item) => item.athlete || [])
      .filter((a) => a !== null) || []) as unknown as Athlete[];

    // Add computed name field to each athlete
    const athletesWithName = athletes.map((a) => ({
      ...a,
      name: `${a.first_name} ${a.last_name}`,
    }));

    return { data: athletesWithName as Athlete[], error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Add an athlete to the current user's shortlist
 */
export async function addToShortlist(
  athleteId: string
): Promise<ServiceResult> {
  const supabase = createClient();

  try {
    const brandId = await getCurrentBrandId();

    if (!brandId) {
      return { data: null, error: new Error('Brand not found') };
    }

    const { error: insertError } = await supabase.from('brand_shortlist').insert({
      brand_id: brandId,
      athlete_id: athleteId,
    });

    if (insertError) {
      // Check for unique constraint violation (athlete already shortlisted)
      if (insertError.code === '23505') {
        return { data: null, error: new Error('Athlete is already in your shortlist') };
      }
      return { data: null, error: insertError };
    }

    return { data: null, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Remove an athlete from the current user's shortlist
 */
export async function removeFromShortlist(
  athleteId: string
): Promise<ServiceResult> {
  const supabase = createClient();

  try {
    const brandId = await getCurrentBrandId();

    if (!brandId) {
      return { data: null, error: new Error('Brand not found') };
    }

    const { error: deleteError } = await supabase
      .from('brand_shortlist')
      .delete()
      .eq('brand_id', brandId)
      .eq('athlete_id', athleteId);

    if (deleteError) {
      return { data: null, error: deleteError };
    }

    return { data: null, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}
