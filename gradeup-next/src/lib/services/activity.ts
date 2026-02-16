'use client';

import { createClient } from '@/lib/supabase/client';

// ═══════════════════════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

export type ActivityType =
  | 'deal_created'
  | 'deal_accepted'
  | 'deal_completed'
  | 'deal_rejected'
  | 'message'
  | 'profile_view'
  | 'deliverable'
  | 'payment'
  | 'new_offer';

export interface Activity {
  id: string;
  profile_id: string;
  type: ActivityType;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Activity Service Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get recent activity for the currently authenticated user
 *
 * Fetches the most recent activity log entries for the current user,
 * ordered by creation date (newest first).
 *
 * @param limit - Maximum number of activities to return (default: 10)
 * @returns Promise resolving to ServiceResult with Activity array or an error
 * @example
 * const { data: activities, error } = await getMyActivity(20);
 * if (activities) {
 *   activities.forEach(activity => {
 *     console.log(`${activity.type}: ${activity.description}`);
 *   });
 * }
 */
export async function getMyActivity(limit: number = 10): Promise<ServiceResult<Activity[]>> {
  const supabase = createClient();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: userError || new Error('Not authenticated') };
    }

    const { data: activities, error: activityError } = await supabase
      .from('activity_log')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (activityError) {
      return { data: null, error: new Error(`Failed to fetch activity: ${activityError.message}`) };
    }

    return { data: activities as Activity[], error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Get recent activity for a specific athlete by their athlete ID
 *
 * Looks up the athlete's profile_id and fetches their activity log entries,
 * ordered by creation date (newest first).
 *
 * @param athleteId - The unique athlete ID (not profile_id)
 * @param limit - Maximum number of activities to return (default: 10)
 * @returns Promise resolving to ServiceResult with Activity array or an error
 * @example
 * const { data: activities, error } = await getAthleteActivity('athlete-uuid', 15);
 */
export async function getAthleteActivity(
  athleteId: string,
  limit: number = 10
): Promise<ServiceResult<Activity[]>> {
  const supabase = createClient();

  try {
    // First get the profile_id for this athlete
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('profile_id')
      .eq('id', athleteId)
      .single();

    if (athleteError || !athlete) {
      return { data: null, error: new Error('Athlete not found') };
    }

    const { data: activities, error: activityError } = await supabase
      .from('activity_log')
      .select('*')
      .eq('profile_id', athlete.profile_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (activityError) {
      return { data: null, error: new Error(`Failed to fetch activity: ${activityError.message}`) };
    }

    return { data: activities as Activity[], error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Log a new activity entry for the current authenticated user
 *
 * Creates an activity log record for tracking user actions such as
 * deals, messages, payments, and profile interactions.
 *
 * @param type - The type of activity (e.g., 'deal_created', 'message', 'payment')
 * @param description - Human-readable description of the activity
 * @param metadata - Optional additional data to store with the activity
 * @returns Promise resolving to ServiceResult with the created Activity or an error
 * @example
 * const { data, error } = await logActivity(
 *   'deal_completed',
 *   'Completed endorsement deal with Nike',
 *   { dealId: 'deal-123', amount: 5000 }
 * );
 */
export async function logActivity(
  type: ActivityType,
  description: string,
  metadata?: Record<string, unknown>
): Promise<ServiceResult<Activity>> {
  const supabase = createClient();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: userError || new Error('Not authenticated') };
    }

    const { data: activity, error: insertError } = await supabase
      .from('activity_log')
      .insert({
        profile_id: user.id,
        type,
        description,
        metadata: metadata || null,
      })
      .select()
      .single();

    if (insertError) {
      return { data: null, error: new Error(`Failed to log activity: ${insertError.message}`) };
    }

    return { data: activity as Activity, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}
