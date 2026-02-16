'use client';

import { createClient } from '@/lib/supabase/client';
import type { Athlete } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

export interface DirectorStats {
  total_athletes: number;
  active_deals: number;
  total_earnings: number;
  avg_gpa: number;
  verified_athletes: number;
  pending_verifications: number;
}

export interface ComplianceAlert {
  id: string;
  athlete_id: string;
  athlete_name: string;
  type: 'gpa_drop' | 'deal_review' | 'verification_expired' | 'policy_violation';
  severity: 'low' | 'medium' | 'high';
  message: string;
  created_at: string;
}

export interface ServiceResult<T = null> {
  data: T | null;
  error: Error | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the current user's school ID from their athletic director profile
 */
async function getCurrentSchoolId(): Promise<string | null> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: director, error: directorError } = await supabase
    .from('athletic_directors')
    .select('school_id')
    .eq('profile_id', user.id)
    .single();

  if (directorError || !director) {
    return null;
  }

  return director.school_id;
}

// ═══════════════════════════════════════════════════════════════════════════
// Director Service Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get statistics for the director's school
 */
export async function getDirectorStats(): Promise<ServiceResult<DirectorStats>> {
  const supabase = createClient();

  try {
    const schoolId = await getCurrentSchoolId();

    if (!schoolId) {
      return { data: null, error: new Error('School not found') };
    }

    // Get athletes at this school
    const { data: athletes, error: athletesError } = await supabase
      .from('athletes')
      .select('id, gpa')
      .eq('school_id', schoolId);

    if (athletesError) {
      return { data: null, error: new Error(`Failed to fetch athletes: ${athletesError.message}`) };
    }

    const athleteIds = athletes?.map(a => a.id) || [];
    const totalAthletes = athleteIds.length;

    // Calculate average GPA
    const gpas = athletes?.filter(a => a.gpa !== null).map(a => a.gpa!) || [];
    const avgGpa = gpas.length > 0
      ? gpas.reduce((sum, gpa) => sum + gpa, 0) / gpas.length
      : 0;

    // Get deals for these athletes
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select('id, status, compensation_amount')
      .in('athlete_id', athleteIds.length > 0 ? athleteIds : ['none']);

    if (dealsError && process.env.NODE_ENV === 'development') {
      console.warn('Error fetching deals:', dealsError);
    }

    const activeDeals = deals?.filter(d => d.status === 'active' || d.status === 'accepted').length || 0;
    const completedDeals = deals?.filter(d => d.status === 'completed') || [];
    const totalEarnings = completedDeals.reduce((sum, d) => sum + (d.compensation_amount || 0), 0);

    // For now, use placeholders for verification counts
    const stats: DirectorStats = {
      total_athletes: totalAthletes,
      active_deals: activeDeals,
      total_earnings: totalEarnings,
      avg_gpa: avgGpa,
      verified_athletes: totalAthletes, // Assume all verified for now
      pending_verifications: 0,
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
 * Get athletes at the director's school
 */
export async function getSchoolAthletes(
  page: number = 1,
  pageSize: number = 20
): Promise<ServiceResult<{ athletes: Athlete[]; total: number }>> {
  const supabase = createClient();

  try {
    const schoolId = await getCurrentSchoolId();

    if (!schoolId) {
      return { data: null, error: new Error('School not found') };
    }

    const offset = (page - 1) * pageSize;

    const { data: athletes, error: athletesError, count } = await supabase
      .from('athletes')
      .select(`
        *,
        profile:profiles(first_name, last_name, avatar_url, bio),
        school:schools(*),
        sport:sports(*)
      `, { count: 'exact' })
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (athletesError) {
      return { data: null, error: new Error(`Failed to fetch athletes: ${athletesError.message}`) };
    }

    return {
      data: {
        athletes: athletes as unknown as Athlete[],
        total: count || 0,
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
 * Get compliance alerts for the director's school
 */
export async function getComplianceAlerts(): Promise<ServiceResult<ComplianceAlert[]>> {
  const supabase = createClient();

  try {
    const schoolId = await getCurrentSchoolId();

    if (!schoolId) {
      return { data: null, error: new Error('School not found') };
    }

    // Get athletes with low GPA (below 2.5) as potential compliance issues
    const { data: lowGpaAthletes, error: athletesError } = await supabase
      .from('athletes')
      .select(`
        id,
        gpa,
        profile:profiles(first_name, last_name)
      `)
      .eq('school_id', schoolId)
      .lt('gpa', 2.5)
      .not('gpa', 'is', null);

    if (athletesError && process.env.NODE_ENV === 'development') {
      console.warn('Error fetching low GPA athletes:', athletesError);
    }

    // Generate alerts from low GPA athletes
    const alerts: ComplianceAlert[] = (lowGpaAthletes || []).map(athlete => {
      // Profile can be returned as array or object depending on Supabase config
      const profile = Array.isArray(athlete.profile) ? athlete.profile[0] : athlete.profile;
      return {
        id: `gpa-${athlete.id}`,
        athlete_id: athlete.id,
        athlete_name: profile
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
          : 'Unknown Athlete',
        type: 'gpa_drop' as const,
        severity: athlete.gpa && athlete.gpa < 2.0 ? 'high' : 'medium',
        message: `GPA dropped to ${athlete.gpa?.toFixed(2)} - may affect NIL eligibility`,
        created_at: new Date().toISOString(),
      };
    });

    return { data: alerts, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Get recent deals for the director's school athletes
 */
export async function getSchoolDeals(
  limit: number = 10
): Promise<ServiceResult<{ id: string; title: string; athlete_name: string; amount: number; status: string }[]>> {
  const supabase = createClient();

  try {
    const schoolId = await getCurrentSchoolId();

    if (!schoolId) {
      return { data: null, error: new Error('School not found') };
    }

    // Get athlete IDs at this school
    const { data: athletes, error: athletesError } = await supabase
      .from('athletes')
      .select('id, profile:profiles(first_name, last_name)')
      .eq('school_id', schoolId);

    if (athletesError) {
      return { data: null, error: new Error(`Failed to fetch athletes: ${athletesError.message}`) };
    }

    const athleteIds = athletes?.map(a => a.id) || [];
    const athleteMap = new Map(athletes?.map(a => {
      const profile = Array.isArray(a.profile) ? a.profile[0] : a.profile;
      return [
        a.id,
        profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Unknown'
      ];
    }) || []);

    if (athleteIds.length === 0) {
      return { data: [], error: null };
    }

    // Get deals for these athletes
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select('id, title, athlete_id, compensation_amount, status')
      .in('athlete_id', athleteIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (dealsError) {
      return { data: null, error: new Error(`Failed to fetch deals: ${dealsError.message}`) };
    }

    const formattedDeals = deals?.map(deal => ({
      id: deal.id,
      title: deal.title,
      athlete_name: athleteMap.get(deal.athlete_id) || 'Unknown',
      amount: deal.compensation_amount,
      status: deal.status,
    })) || [];

    return { data: formattedDeals, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}
