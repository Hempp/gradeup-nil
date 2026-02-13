'use client';

import { createClient } from '@/lib/supabase/client';
import type { HighlightUrl, VideoPlatform } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

export type Division = 'D1' | 'D2' | 'D3' | 'NAIA' | 'JUCO' | 'other';
export type VerificationType = 'enrollment' | 'sport' | 'grades' | 'identity';
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface School {
  id: string;
  name: string;
  short_name: string;
  city: string;
  state: string;
  division: Division;
  conference: string | null;
  logo_url: string | null;
}

export interface Sport {
  id: string;
  name: string;
  category: string;
  gender: string | null;
}

export interface Athlete {
  id: string;
  profile_id: string;
  school_id: string;
  sport_id: string;
  position: string | null;
  jersey_number: string | null;
  academic_year: string;
  gpa: number | null;
  major: string | null;
  hometown: string | null;
  height_inches: number | null;
  weight_lbs: number | null;
  nil_valuation: number | null;
  is_searchable: boolean;
  profile?: { first_name: string; last_name: string; avatar_url: string | null; bio: string | null };
  school?: School;
  sport?: Sport;
}

export interface AthleteFilters {
  sport_ids?: string[];
  school_ids?: string[];
  divisions?: Division[];
  min_gpa?: number;
  min_followers?: number;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface AthleteStats {
  total_deals: number;
  active_deals: number;
  completed_deals: number;
  total_earnings: number;
  pending_earnings: number;
  profile_views: number;
  search_appearances: number;
  avg_deal_value: number;
}

export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Athlete Service Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the athlete profile for the currently authenticated user
 */
export async function getMyAthleteProfile(): Promise<ServiceResult<Athlete>> {
  const supabase = createClient();

  try {
    // Get the current authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: userError || new Error('Not authenticated') };
    }

    // Fetch the athlete record with related data
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select(`
        *,
        profile:profiles(first_name, last_name, avatar_url, bio),
        school:schools(*),
        sport:sports(*)
      `)
      .eq('profile_id', user.id)
      .single();

    if (athleteError) {
      return { data: null, error: new Error(`Failed to fetch athlete profile: ${athleteError.message}`) };
    }

    if (!athlete) {
      return { data: null, error: new Error('Athlete profile not found') };
    }

    return { data: athlete as Athlete, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Get an athlete by their ID
 */
export async function getAthleteById(athleteId: string): Promise<ServiceResult<Athlete>> {
  const supabase = createClient();

  try {
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select(`
        *,
        profile:profiles(first_name, last_name, avatar_url, bio),
        school:schools(*),
        sport:sports(*)
      `)
      .eq('id', athleteId)
      .single();

    if (athleteError) {
      return { data: null, error: new Error(`Failed to fetch athlete: ${athleteError.message}`) };
    }

    if (!athlete) {
      return { data: null, error: new Error('Athlete not found') };
    }

    return { data: athlete as Athlete, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Update the current user's athlete profile
 */
export async function updateAthleteProfile(updates: Partial<Athlete>): Promise<ServiceResult<Athlete>> {
  const supabase = createClient();

  try {
    // Get the current authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: userError || new Error('Not authenticated') };
    }

    // Remove relation fields from updates (they shouldn't be directly updated)
    const { profile, school, sport, ...athleteUpdates } = updates;

    // Update the athlete record
    const { data: athlete, error: updateError } = await supabase
      .from('athletes')
      .update(athleteUpdates)
      .eq('profile_id', user.id)
      .select(`
        *,
        profile:profiles(first_name, last_name, avatar_url, bio),
        school:schools(*),
        sport:sports(*)
      `)
      .single();

    if (updateError) {
      return { data: null, error: new Error(`Failed to update athlete profile: ${updateError.message}`) };
    }

    return { data: athlete as Athlete, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Search for athletes with optional filters and pagination
 */
export async function searchAthletes(
  filters: AthleteFilters
): Promise<ServiceResult<{ athletes: Athlete[]; pagination: Pagination }>> {
  const supabase = createClient();

  try {
    const page = filters.page ?? 1;
    const pageSize = filters.page_size ?? 10;
    const offset = (page - 1) * pageSize;

    // Build the base query
    let query = supabase
      .from('athletes')
      .select(`
        *,
        profile:profiles(first_name, last_name, avatar_url, bio),
        school:schools(*),
        sport:sports(*)
      `, { count: 'exact' })
      .eq('is_searchable', true)
      .order('nil_valuation', { ascending: false, nullsFirst: false })
      .range(offset, offset + pageSize - 1);

    // Apply sport filter
    if (filters.sport_ids && filters.sport_ids.length > 0) {
      query = query.in('sport_id', filters.sport_ids);
    }

    // Apply school filter
    if (filters.school_ids && filters.school_ids.length > 0) {
      query = query.in('school_id', filters.school_ids);
    }

    // Apply minimum GPA filter
    if (filters.min_gpa !== undefined) {
      query = query.gte('gpa', filters.min_gpa);
    }

    // Apply search filter (searches profile names)
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.trim().toLowerCase();
      // Use textSearch or ilike on profile fields through a different approach
      // Since we can't easily filter on joined tables, we'll use a stored procedure or
      // filter on athlete-level searchable fields if available
      query = query.or(`major.ilike.%${searchTerm}%,position.ilike.%${searchTerm}%,hometown.ilike.%${searchTerm}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return { data: null, error: new Error(`Failed to search athletes: ${error.message}`) };
    }

    // Additional filtering for divisions (requires school join)
    let filteredAthletes = data as Athlete[];
    if (filters.divisions && filters.divisions.length > 0) {
      filteredAthletes = filteredAthletes.filter(
        (athlete) => athlete.school && filters.divisions!.includes(athlete.school.division)
      );
    }

    const totalCount = count ?? filteredAthletes.length;

    return {
      data: {
        athletes: filteredAthletes,
        pagination: {
          page,
          page_size: pageSize,
          total: totalCount,
          total_pages: Math.ceil(totalCount / pageSize),
        },
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Get statistics for a specific athlete
 */
export async function getAthleteStats(athleteId: string): Promise<ServiceResult<AthleteStats>> {
  const supabase = createClient();

  try {
    // Fetch deals statistics
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select('id, status, compensation_amount')
      .eq('athlete_id', athleteId);

    if (dealsError) {
      return { data: null, error: new Error(`Failed to fetch athlete stats: ${dealsError.message}`) };
    }

    const totalDeals = deals?.length ?? 0;
    const activeDeals = deals?.filter((d) => d.status === 'active' || d.status === 'accepted').length ?? 0;
    const completedDeals = deals?.filter((d) => d.status === 'completed').length ?? 0;

    // Calculate earnings
    const completedDealAmounts = deals
      ?.filter((d) => d.status === 'completed')
      .map((d) => d.compensation_amount) ?? [];
    const totalEarnings = completedDealAmounts.reduce((sum, amount) => sum + (amount ?? 0), 0);

    const pendingDealAmounts = deals
      ?.filter((d) => d.status === 'active' || d.status === 'accepted')
      .map((d) => d.compensation_amount) ?? [];
    const pendingEarnings = pendingDealAmounts.reduce((sum, amount) => sum + (amount ?? 0), 0);

    const avgDealValue = totalDeals > 0
      ? deals!.reduce((sum, d) => sum + (d.compensation_amount ?? 0), 0) / totalDeals
      : 0;

    // Fetch analytics if available
    const { data: analytics } = await supabase
      .from('athlete_analytics')
      .select('profile_views, search_appearances')
      .eq('athlete_id', athleteId)
      .single();

    const stats: AthleteStats = {
      total_deals: totalDeals,
      active_deals: activeDeals,
      completed_deals: completedDeals,
      total_earnings: totalEarnings,
      pending_earnings: pendingEarnings,
      profile_views: analytics?.profile_views ?? 0,
      search_appearances: analytics?.search_appearances ?? 0,
      avg_deal_value: avgDealValue,
    };

    return { data: stats, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Upload athlete media (avatar or cover image)
 */
export async function uploadAthleteMedia(
  file: File,
  type: 'avatar' | 'cover'
): Promise<ServiceResult<{ url: string }>> {
  const supabase = createClient();

  try {
    // Get the current authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: userError || new Error('Not authenticated') };
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return { data: null, error: new Error('Invalid file type. Allowed: JPEG, PNG, WebP, GIF') };
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return { data: null, error: new Error('File too large. Maximum size is 5MB') };
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${type}-${Date.now()}.${fileExt}`;
    const bucket = type === 'avatar' ? 'avatars' : 'covers';

    // Upload the file
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      return { data: null, error: new Error(`Failed to upload file: ${uploadError.message}`) };
    }

    // Get the public URL
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);

    if (!urlData.publicUrl) {
      return { data: null, error: new Error('Failed to get public URL for uploaded file') };
    }

    // Update the profile or athlete record with the new URL
    if (type === 'avatar') {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id);

      if (updateError) {
        return { data: null, error: new Error(`Failed to update profile: ${updateError.message}`) };
      }
    } else {
      // For cover images, update the athlete record if there's a cover_url field
      const { error: updateError } = await supabase
        .from('athletes')
        .update({ cover_url: urlData.publicUrl })
        .eq('profile_id', user.id);

      if (updateError) {
        // Cover URL might not exist in the schema, so we'll just log and continue
        console.warn('Could not update cover_url on athlete record:', updateError.message);
      }
    }

    return { data: { url: urlData.publicUrl }, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Highlight URL Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get highlight URLs for the current user's athlete profile
 */
export async function getHighlightUrls(): Promise<ServiceResult<HighlightUrl[]>> {
  const supabase = createClient();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: userError || new Error('Not authenticated') };
    }

    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('highlight_urls')
      .eq('profile_id', user.id)
      .single();

    if (athleteError) {
      return { data: null, error: new Error(`Failed to fetch highlight URLs: ${athleteError.message}`) };
    }

    const highlightUrls = (athlete?.highlight_urls as HighlightUrl[]) || [];
    return { data: highlightUrls, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Add a highlight URL to the current user's athlete profile
 */
export async function addHighlightUrl(
  url: string,
  platform: VideoPlatform,
  title?: string
): Promise<ServiceResult<HighlightUrl>> {
  const supabase = createClient();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: userError || new Error('Not authenticated') };
    }

    // Get current highlight URLs
    const { data: athlete, error: fetchError } = await supabase
      .from('athletes')
      .select('highlight_urls')
      .eq('profile_id', user.id)
      .single();

    if (fetchError) {
      return { data: null, error: new Error(`Failed to fetch athlete: ${fetchError.message}`) };
    }

    const currentUrls = (athlete?.highlight_urls as HighlightUrl[]) || [];

    // Check for duplicates
    if (currentUrls.some(h => h.url === url)) {
      return { data: null, error: new Error('This video has already been added') };
    }

    // Create new highlight entry
    const newHighlight: HighlightUrl = {
      id: crypto.randomUUID(),
      platform,
      url,
      title,
      added_at: new Date().toISOString(),
    };

    // Update the athlete record with the new highlight
    const { error: updateError } = await supabase
      .from('athletes')
      .update({ highlight_urls: [...currentUrls, newHighlight] })
      .eq('profile_id', user.id);

    if (updateError) {
      return { data: null, error: new Error(`Failed to add highlight URL: ${updateError.message}`) };
    }

    return { data: newHighlight, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Remove a highlight URL from the current user's athlete profile
 */
export async function removeHighlightUrl(highlightId: string): Promise<ServiceResult<null>> {
  const supabase = createClient();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: userError || new Error('Not authenticated') };
    }

    // Get current highlight URLs
    const { data: athlete, error: fetchError } = await supabase
      .from('athletes')
      .select('highlight_urls')
      .eq('profile_id', user.id)
      .single();

    if (fetchError) {
      return { data: null, error: new Error(`Failed to fetch athlete: ${fetchError.message}`) };
    }

    const currentUrls = (athlete?.highlight_urls as HighlightUrl[]) || [];
    const updatedUrls = currentUrls.filter(h => h.id !== highlightId);

    if (updatedUrls.length === currentUrls.length) {
      return { data: null, error: new Error('Highlight not found') };
    }

    // Update the athlete record without the removed highlight
    const { error: updateError } = await supabase
      .from('athletes')
      .update({ highlight_urls: updatedUrls })
      .eq('profile_id', user.id);

    if (updateError) {
      return { data: null, error: new Error(`Failed to remove highlight URL: ${updateError.message}`) };
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
 * Update a highlight URL's title
 */
export async function updateHighlightTitle(
  highlightId: string,
  title: string
): Promise<ServiceResult<HighlightUrl>> {
  const supabase = createClient();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: userError || new Error('Not authenticated') };
    }

    // Get current highlight URLs
    const { data: athlete, error: fetchError } = await supabase
      .from('athletes')
      .select('highlight_urls')
      .eq('profile_id', user.id)
      .single();

    if (fetchError) {
      return { data: null, error: new Error(`Failed to fetch athlete: ${fetchError.message}`) };
    }

    const currentUrls = (athlete?.highlight_urls as HighlightUrl[]) || [];
    const highlightIndex = currentUrls.findIndex(h => h.id === highlightId);

    if (highlightIndex === -1) {
      return { data: null, error: new Error('Highlight not found') };
    }

    // Update the title
    const updatedHighlight = { ...currentUrls[highlightIndex], title };
    const updatedUrls = [...currentUrls];
    updatedUrls[highlightIndex] = updatedHighlight;

    // Save the updated list
    const { error: updateError } = await supabase
      .from('athletes')
      .update({ highlight_urls: updatedUrls })
      .eq('profile_id', user.id);

    if (updateError) {
      return { data: null, error: new Error(`Failed to update highlight: ${updateError.message}`) };
    }

    return { data: updatedHighlight, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}
