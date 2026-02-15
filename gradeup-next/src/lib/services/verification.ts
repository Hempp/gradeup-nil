import { createClient } from '@/lib/supabase/client';

// Types
export type VerificationType =
  | 'enrollment'
  | 'sport'
  | 'grades'
  | 'identity'
  | 'stats'
  | 'ncaa_eligibility';

export type VerificationStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'revoked';

export interface VerificationRequest {
  id: string;
  athlete_id: string;
  type: VerificationType;
  status: VerificationStatus;
  notes?: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  documents?: string[];
  rejection_reason?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface VerificationHistory {
  id: string;
  athlete_id: string;
  type: VerificationType;
  action: 'submitted' | 'approved' | 'rejected' | 'revoked' | 'expired';
  actor_id?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// Service functions

/**
 * Submit a verification request for an athlete
 */
export async function submitVerificationRequest(
  athleteId: string,
  type: VerificationType,
  notes?: string
): Promise<{ data: VerificationRequest | null; error: Error | null }> {
  const supabase = createClient();

  // Check if there's already a pending request of this type
  const { data: existing, error: checkError } = await supabase
    .from('verification_requests')
    .select('id, status')
    .eq('athlete_id', athleteId)
    .eq('type', type)
    .in('status', ['pending', 'in_review'])
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which is expected
    return { data: null, error: new Error(`Failed to check existing requests: ${checkError.message}`) };
  }

  if (existing) {
    return { data: null, error: new Error(`A ${type} verification request is already pending`) };
  }

  // Create the verification request
  const { data, error } = await supabase
    .from('verification_requests')
    .insert({
      athlete_id: athleteId,
      type,
      status: 'pending' as VerificationStatus,
      notes,
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(`Failed to submit verification request: ${error.message}`) };
  }

  // Log to verification history
  await supabase.from('verification_history').insert({
    athlete_id: athleteId,
    type,
    action: 'submitted',
    notes,
    created_at: new Date().toISOString(),
  });

  return { data: data as VerificationRequest, error: null };
}

/**
 * Approve a verification request (director action)
 */
export async function approveVerification(
  athleteId: string,
  type: VerificationType,
  directorId: string
): Promise<{ data: null; error: Error | null }> {
  const supabase = createClient();

  // Update the verification request
  const { error: requestError } = await supabase
    .from('verification_requests')
    .update({
      status: 'approved' as VerificationStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: directorId,
      updated_at: new Date().toISOString(),
    })
    .eq('athlete_id', athleteId)
    .eq('type', type)
    .in('status', ['pending', 'in_review']);

  if (requestError) {
    return { data: null, error: new Error(`Failed to approve verification request: ${requestError.message}`) };
  }

  // Update the athlete's verification status
  const verificationField = getVerificationField(type);
  if (verificationField) {
    const { error: athleteError } = await supabase
      .from('athletes')
      .update({
        [verificationField]: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', athleteId);

    if (athleteError) {
      console.warn(`Failed to update athlete verification status: ${athleteError.message}`);
    }
  }

  // Log to verification history
  await supabase.from('verification_history').insert({
    athlete_id: athleteId,
    type,
    action: 'approved',
    actor_id: directorId,
    created_at: new Date().toISOString(),
  });

  return { data: null, error: null };
}

/**
 * Revoke a verification (director action)
 */
export async function revokeVerification(
  athleteId: string,
  type: VerificationType,
  reason: string
): Promise<{ data: null; error: Error | null }> {
  const supabase = createClient();

  // Update the verification request
  const { error: requestError } = await supabase
    .from('verification_requests')
    .update({
      status: 'revoked' as VerificationStatus,
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('athlete_id', athleteId)
    .eq('type', type)
    .eq('status', 'approved');

  if (requestError) {
    return { data: null, error: new Error(`Failed to revoke verification: ${requestError.message}`) };
  }

  // Update the athlete's verification status
  const verificationField = getVerificationField(type);
  if (verificationField) {
    const { error: athleteError } = await supabase
      .from('athletes')
      .update({
        [verificationField]: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', athleteId);

    if (athleteError) {
      console.warn(`Failed to update athlete verification status: ${athleteError.message}`);
    }
  }

  // Log to verification history
  await supabase.from('verification_history').insert({
    athlete_id: athleteId,
    type,
    action: 'revoked',
    notes: reason,
    created_at: new Date().toISOString(),
  });

  return { data: null, error: null };
}

/**
 * Get verification history for an athlete
 */
export async function getVerificationHistory(
  athleteId: string
): Promise<{ data: VerificationHistory[] | null; error: Error | null }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('verification_history')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: new Error(`Failed to fetch verification history: ${error.message}`) };
  }

  return { data: data as VerificationHistory[], error: null };
}

/**
 * Get pending verification requests for a director's school
 */
export async function getPendingVerifications(
  schoolId?: string
): Promise<{ data: VerificationRequest[] | null; error: Error | null }> {
  const supabase = createClient();

  let query = supabase
    .from('verification_requests')
    .select(`
      *,
      athlete:athletes(id, first_name, last_name, school_id)
    `)
    .in('status', ['pending', 'in_review'])
    .order('submitted_at', { ascending: true });

  // If schoolId is provided, filter by athletes from that school
  if (schoolId) {
    query = query.eq('athletes.school_id', schoolId);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: new Error(`Failed to fetch pending verifications: ${error.message}`) };
  }

  return { data: data as VerificationRequest[], error: null };
}

/**
 * Reject a verification request
 */
export async function rejectVerification(
  athleteId: string,
  type: VerificationType,
  directorId: string,
  reason: string
): Promise<{ data: null; error: Error | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('verification_requests')
    .update({
      status: 'rejected' as VerificationStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: directorId,
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('athlete_id', athleteId)
    .eq('type', type)
    .in('status', ['pending', 'in_review']);

  if (error) {
    return { data: null, error: new Error(`Failed to reject verification: ${error.message}`) };
  }

  // Log to verification history
  await supabase.from('verification_history').insert({
    athlete_id: athleteId,
    type,
    action: 'rejected',
    actor_id: directorId,
    notes: reason,
    created_at: new Date().toISOString(),
  });

  return { data: null, error: null };
}

/**
 * Get the current verification status for an athlete
 */
export async function getAthleteVerificationStatus(
  athleteId: string
): Promise<{
  data: {
    enrollment_verified: boolean;
    sport_verified: boolean;
    grades_verified: boolean;
    identity_verified: boolean;
    pending_requests: VerificationRequest[];
  } | null;
  error: Error | null;
}> {
  const supabase = createClient();

  // Get athlete verification fields
  const { data: athlete, error: athleteError } = await supabase
    .from('athletes')
    .select('enrollment_verified, sport_verified, grades_verified, identity_verified')
    .eq('id', athleteId)
    .single();

  if (athleteError) {
    return { data: null, error: new Error(`Failed to fetch athlete: ${athleteError.message}`) };
  }

  // Get pending requests
  const { data: pendingRequests, error: requestsError } = await supabase
    .from('verification_requests')
    .select('*')
    .eq('athlete_id', athleteId)
    .in('status', ['pending', 'in_review']);

  if (requestsError) {
    return { data: null, error: new Error(`Failed to fetch pending requests: ${requestsError.message}`) };
  }

  return {
    data: {
      enrollment_verified: athlete.enrollment_verified ?? false,
      sport_verified: athlete.sport_verified ?? false,
      grades_verified: athlete.grades_verified ?? false,
      identity_verified: athlete.identity_verified ?? false,
      pending_requests: pendingRequests as VerificationRequest[],
    },
    error: null,
  };
}

// Helper function to map verification type to athlete field
function getVerificationField(type: VerificationType): string | null {
  const fieldMap: Record<VerificationType, string | null> = {
    enrollment: 'enrollment_verified',
    sport: 'sport_verified',
    grades: 'grades_verified',
    identity: 'identity_verified',
    stats: 'stats_verified',
    ncaa_eligibility: null, // May need separate handling
  };
  return fieldMap[type];
}

/**
 * Bulk approve multiple verification requests
 */
export async function bulkApproveVerifications(
  requestIds: string[],
  directorId: string
): Promise<{ data: { approved: number; failed: number }; error: Error | null }> {
  const supabase = createClient();
  let approved = 0;
  let failed = 0;

  // Get all requests to approve
  const { data: requests, error: fetchError } = await supabase
    .from('verification_requests')
    .select('id, athlete_id, type')
    .in('id', requestIds)
    .in('status', ['pending', 'in_review']);

  if (fetchError) {
    return { data: { approved: 0, failed: requestIds.length }, error: new Error(fetchError.message) };
  }

  // Approve each request
  for (const request of requests || []) {
    const result = await approveVerification(request.athlete_id, request.type, directorId);
    if (result.error) {
      failed++;
    } else {
      approved++;
    }
  }

  return { data: { approved, failed }, error: null };
}

/**
 * Get pending verification count for a director's school
 */
export async function getPendingVerificationCount(
  schoolId: string
): Promise<{ data: number; error: Error | null }> {
  const supabase = createClient();

  // Get athletes from the school
  const { data: athletes, error: athleteError } = await supabase
    .from('athletes')
    .select('id')
    .eq('school_id', schoolId);

  if (athleteError) {
    return { data: 0, error: new Error(athleteError.message) };
  }

  const athleteIds = athletes?.map(a => a.id) || [];
  if (athleteIds.length === 0) {
    return { data: 0, error: null };
  }

  // Count pending requests
  const { count, error } = await supabase
    .from('verification_requests')
    .select('id', { count: 'exact', head: true })
    .in('athlete_id', athleteIds)
    .in('status', ['pending', 'in_review']);

  if (error) {
    return { data: 0, error: new Error(error.message) };
  }

  return { data: count || 0, error: null };
}

/**
 * Get detailed pending verifications for a director's school
 */
export async function getSchoolPendingVerifications(
  schoolId: string
): Promise<{ data: (VerificationRequest & { athlete: { id: string; first_name: string; last_name: string; gpa: number; sport?: { name: string } } })[] | null; error: Error | null }> {
  const supabase = createClient();

  // Get athletes from the school
  const { data: athletes, error: athleteError } = await supabase
    .from('athletes')
    .select('id')
    .eq('school_id', schoolId);

  if (athleteError) {
    return { data: null, error: new Error(athleteError.message) };
  }

  const athleteIds = athletes?.map(a => a.id) || [];
  if (athleteIds.length === 0) {
    return { data: [], error: null };
  }

  // Get pending requests with athlete details
  const { data, error } = await supabase
    .from('verification_requests')
    .select(`
      *,
      athlete:athletes(
        id,
        first_name,
        last_name,
        gpa,
        sport:sports(name)
      )
    `)
    .in('athlete_id', athleteIds)
    .in('status', ['pending', 'in_review'])
    .order('submitted_at', { ascending: true });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as any, error: null };
}
