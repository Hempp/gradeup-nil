/**
 * HS-NIL Alumni Mentor Network — Service Layer
 * ----------------------------------------------------------------------------
 * Phase 11. Verified HS-to-college transition alumni opt in as mentors.
 * HS athletes browse them, request sessions, and exchange messages. Sync
 * scheduling (calendar sync, live video handoff) is Phase 12+.
 *
 * Durable contracts:
 *
 *   1. Mentor profile eligibility is enforced at the DB layer via a BEFORE
 *      trigger on alumni_mentor_profiles. Every write path — including this
 *      service's service-role client — goes through the trigger. If the
 *      caller's athlete_bracket_transitions row is not status='verified'
 *      the INSERT raises check_violation, which we map to `not_eligible`.
 *
 *   2. The denormalized mentor_user_id on mentor_session_requests mirrors
 *      the profile's user_id at the moment of the request. It never drifts
 *      because a mentor can't change their own user_id (the table's trigger
 *      guards UPDATE OF user_id) and session requests carry a FK to the
 *      profile.
 *
 *   3. Email notifications are fire-and-forget at the route layer. This
 *      service never awaits email sends — it returns once the DB write
 *      commits.
 *
 *   4. The "new message" email throttle is derived, not stored: before
 *      enqueuing the email we scan the thread for messages that arrived in
 *      the last 60 minutes authored by the sender role; if ≥1 exists we
 *      assume the recipient was already notified and suppress. No
 *      last_emailed_at column required.
 */

import {
  createClient as createServiceClient,
  type SupabaseClient,
} from '@supabase/supabase-js';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type MentorAvailability = 'weekly' | 'biweekly' | 'monthly' | 'paused';
export type NcaaDivision = 'D1' | 'D2' | 'D3' | 'NAIA' | 'JUCO' | 'other';
export type MentorSessionStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'completed'
  | 'cancelled'
  | 'expired';
export type MentorSessionFormat = 'message' | 'video_call';
export type MentorMessageSenderRole = 'mentor' | 'athlete';

export interface MentorProfile {
  id: string;
  userId: string;
  collegeName: string;
  collegeState: string;
  ncaaDivision: NcaaDivision;
  currentSport: string;
  bio: string;
  availability: MentorAvailability;
  specialties: string[];
  acceptsMessageOnly: boolean;
  acceptsVideoCall: boolean;
  hourlyRateCents: number | null;
  verifiedAt: string | null;
  visibleToHs: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MentorSessionRequest {
  id: string;
  requesterUserId: string;
  mentorProfileId: string;
  mentorUserId: string;
  requestedTopic: string;
  requestedFormat: MentorSessionFormat;
  athleteNote: string | null;
  status: MentorSessionStatus;
  declinedReason: string | null;
  createdAt: string;
  respondedAt: string | null;
  completedAt: string | null;
}

export interface MentorMessage {
  id: string;
  sessionRequestId: string;
  senderUserId: string;
  senderRole: MentorMessageSenderRole;
  body: string;
  createdAt: string;
}

export interface OkResult<T> {
  ok: true;
  data: T;
}

export interface ErrResult {
  ok: false;
  error: string;
  code:
    | 'not_found'
    | 'not_eligible'
    | 'forbidden'
    | 'invalid_state'
    | 'conflict'
    | 'db_error'
    | 'internal';
}

export type ServiceResult<T> = OkResult<T> | ErrResult;

// ----------------------------------------------------------------------------
// Service-role client
// ----------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil mentors] Supabase service role not configured (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ----------------------------------------------------------------------------
// Row mappers
// ----------------------------------------------------------------------------

interface MentorProfileRow {
  id: string;
  user_id: string;
  college_name: string;
  college_state: string;
  ncaa_division: NcaaDivision;
  current_sport: string;
  bio: string;
  availability: MentorAvailability;
  specialties: string[] | null;
  accepts_message_only: boolean;
  accepts_video_call: boolean;
  hourly_rate_cents: number | null;
  verified_at: string | null;
  visible_to_hs: boolean;
  created_at: string;
  updated_at: string;
}

function mapMentorProfile(row: MentorProfileRow): MentorProfile {
  return {
    id: row.id,
    userId: row.user_id,
    collegeName: row.college_name,
    collegeState: row.college_state,
    ncaaDivision: row.ncaa_division,
    currentSport: row.current_sport,
    bio: row.bio,
    availability: row.availability,
    specialties: Array.isArray(row.specialties) ? row.specialties : [],
    acceptsMessageOnly: row.accepts_message_only,
    acceptsVideoCall: row.accepts_video_call,
    hourlyRateCents: row.hourly_rate_cents,
    verifiedAt: row.verified_at,
    visibleToHs: row.visible_to_hs,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface MentorSessionRow {
  id: string;
  requester_user_id: string;
  mentor_profile_id: string;
  mentor_user_id: string;
  requested_topic: string;
  requested_format: MentorSessionFormat;
  athlete_note: string | null;
  status: MentorSessionStatus;
  declined_reason: string | null;
  created_at: string;
  responded_at: string | null;
  completed_at: string | null;
}

function mapSession(row: MentorSessionRow): MentorSessionRequest {
  return {
    id: row.id,
    requesterUserId: row.requester_user_id,
    mentorProfileId: row.mentor_profile_id,
    mentorUserId: row.mentor_user_id,
    requestedTopic: row.requested_topic,
    requestedFormat: row.requested_format,
    athleteNote: row.athlete_note,
    status: row.status,
    declinedReason: row.declined_reason,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
    completedAt: row.completed_at,
  };
}

interface MentorMessageRow {
  id: string;
  session_request_id: string;
  sender_user_id: string;
  sender_role: MentorMessageSenderRole;
  body: string;
  created_at: string;
}

function mapMessage(row: MentorMessageRow): MentorMessage {
  return {
    id: row.id,
    sessionRequestId: row.session_request_id,
    senderUserId: row.sender_user_id,
    senderRole: row.sender_role,
    body: row.body,
    createdAt: row.created_at,
  };
}

// ----------------------------------------------------------------------------
// Eligibility
// ----------------------------------------------------------------------------

/**
 * Returns true when the athlete has a verified bracket transition. The DB
 * trigger will also enforce this at write time — this helper exists so the
 * UI can avoid showing the setup form to ineligible users.
 */
export async function isMentorEligible(userId: string): Promise<boolean> {
  if (!userId) return false;
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('athlete_bracket_transitions')
    .select('id')
    .eq('athlete_user_id', userId)
    .eq('status', 'verified')
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

// ----------------------------------------------------------------------------
// Profile CRUD
// ----------------------------------------------------------------------------

export interface MentorProfileFields {
  collegeName: string;
  collegeState: string;
  ncaaDivision: NcaaDivision;
  currentSport: string;
  bio: string;
  availability: MentorAvailability;
  specialties: string[];
  acceptsMessageOnly: boolean;
  acceptsVideoCall: boolean;
  hourlyRateCents: number | null;
  visibleToHs?: boolean;
}

function normalizeFields(fields: MentorProfileFields) {
  const specialties = Array.isArray(fields.specialties)
    ? fields.specialties
        .map((s) => String(s).trim().slice(0, 40))
        .filter((s) => s.length > 0)
        .slice(0, 12)
    : [];
  return {
    college_name: fields.collegeName.trim().slice(0, 200),
    college_state: fields.collegeState.toUpperCase().slice(0, 2),
    ncaa_division: fields.ncaaDivision,
    current_sport: fields.currentSport.trim().slice(0, 80),
    bio: fields.bio.trim().slice(0, 2000),
    availability: fields.availability,
    specialties,
    accepts_message_only: fields.acceptsMessageOnly,
    accepts_video_call: fields.acceptsVideoCall,
    hourly_rate_cents:
      typeof fields.hourlyRateCents === 'number' && fields.hourlyRateCents >= 0
        ? Math.round(fields.hourlyRateCents)
        : null,
    visible_to_hs: fields.visibleToHs ?? true,
  };
}

export async function createMentorProfile(input: {
  userId: string;
  fields: MentorProfileFields;
}): Promise<ServiceResult<MentorProfile>> {
  if (!input.userId) {
    return { ok: false, error: 'userId required.', code: 'invalid_state' };
  }
  const sb = getServiceRoleClient();

  // Pre-check gives a clean "not_eligible" error before the trigger fires —
  // lets the route return 403 with a readable message instead of 500-ish.
  const eligible = await isMentorEligible(input.userId);
  if (!eligible) {
    return {
      ok: false,
      error:
        'Mentor profiles are only available to athletes whose HS-to-college transition is verified.',
      code: 'not_eligible',
    };
  }

  const payload = {
    user_id: input.userId,
    ...normalizeFields(input.fields),
    // verified_at is ops-assigned; never set from the create path.
    verified_at: null,
  };

  const { data, error } = await sb
    .from('alumni_mentor_profiles')
    .insert(payload)
    .select(
      'id, user_id, college_name, college_state, ncaa_division, current_sport, bio, availability, specialties, accepts_message_only, accepts_video_call, hourly_rate_cents, verified_at, visible_to_hs, created_at, updated_at'
    )
    .single<MentorProfileRow>();

  if (error || !data) {
    if (error?.code === '23505') {
      return {
        ok: false,
        error: 'You already have a mentor profile.',
        code: 'conflict',
      };
    }
    if (
      error?.code === '23514' ||
      /requires a verified HS-to-college transition/i.test(error?.message ?? '')
    ) {
      return {
        ok: false,
        error:
          'Mentor profiles are only available to athletes whose HS-to-college transition is verified.',
        code: 'not_eligible',
      };
    }
    return {
      ok: false,
      error: error?.message ?? 'Failed to create mentor profile.',
      code: 'db_error',
    };
  }

  return { ok: true, data: mapMentorProfile(data) };
}

export async function updateMentorProfile(
  userId: string,
  fields: Partial<MentorProfileFields>
): Promise<ServiceResult<MentorProfile>> {
  if (!userId) {
    return { ok: false, error: 'userId required.', code: 'invalid_state' };
  }
  const sb = getServiceRoleClient();

  const patch: Record<string, unknown> = {};
  if (fields.collegeName !== undefined)
    patch.college_name = fields.collegeName.trim().slice(0, 200);
  if (fields.collegeState !== undefined)
    patch.college_state = fields.collegeState.toUpperCase().slice(0, 2);
  if (fields.ncaaDivision !== undefined)
    patch.ncaa_division = fields.ncaaDivision;
  if (fields.currentSport !== undefined)
    patch.current_sport = fields.currentSport.trim().slice(0, 80);
  if (fields.bio !== undefined) patch.bio = fields.bio.trim().slice(0, 2000);
  if (fields.availability !== undefined)
    patch.availability = fields.availability;
  if (fields.specialties !== undefined) {
    patch.specialties = fields.specialties
      .map((s) => String(s).trim().slice(0, 40))
      .filter((s) => s.length > 0)
      .slice(0, 12);
  }
  if (fields.acceptsMessageOnly !== undefined)
    patch.accepts_message_only = fields.acceptsMessageOnly;
  if (fields.acceptsVideoCall !== undefined)
    patch.accepts_video_call = fields.acceptsVideoCall;
  if (fields.hourlyRateCents !== undefined) {
    patch.hourly_rate_cents =
      typeof fields.hourlyRateCents === 'number' && fields.hourlyRateCents >= 0
        ? Math.round(fields.hourlyRateCents)
        : null;
  }
  if (fields.visibleToHs !== undefined) patch.visible_to_hs = fields.visibleToHs;

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: 'No fields to update.', code: 'invalid_state' };
  }

  const { data, error } = await sb
    .from('alumni_mentor_profiles')
    .update(patch)
    .eq('user_id', userId)
    .select(
      'id, user_id, college_name, college_state, ncaa_division, current_sport, bio, availability, specialties, accepts_message_only, accepts_video_call, hourly_rate_cents, verified_at, visible_to_hs, created_at, updated_at'
    )
    .maybeSingle<MentorProfileRow>();

  if (error) {
    return { ok: false, error: error.message, code: 'db_error' };
  }
  if (!data) {
    return { ok: false, error: 'Mentor profile not found.', code: 'not_found' };
  }
  return { ok: true, data: mapMentorProfile(data) };
}

export async function getMentorProfileByUserId(
  userId: string
): Promise<MentorProfile | null> {
  if (!userId) return null;
  const sb = getServiceRoleClient();
  const { data } = await sb
    .from('alumni_mentor_profiles')
    .select(
      'id, user_id, college_name, college_state, ncaa_division, current_sport, bio, availability, specialties, accepts_message_only, accepts_video_call, hourly_rate_cents, verified_at, visible_to_hs, created_at, updated_at'
    )
    .eq('user_id', userId)
    .maybeSingle<MentorProfileRow>();
  return data ? mapMentorProfile(data) : null;
}

export async function getMentorProfileById(
  mentorProfileId: string
): Promise<MentorProfile | null> {
  if (!mentorProfileId) return null;
  const sb = getServiceRoleClient();
  const { data } = await sb
    .from('alumni_mentor_profiles')
    .select(
      'id, user_id, college_name, college_state, ncaa_division, current_sport, bio, availability, specialties, accepts_message_only, accepts_video_call, hourly_rate_cents, verified_at, visible_to_hs, created_at, updated_at'
    )
    .eq('id', mentorProfileId)
    .maybeSingle<MentorProfileRow>();
  return data ? mapMentorProfile(data) : null;
}

// ----------------------------------------------------------------------------
// Search / listing
// ----------------------------------------------------------------------------

export interface MentorSearchFilters {
  sport?: string | null;
  state?: string | null;
  specialties?: string[] | null;
}

export interface MentorSearchInput {
  athleteUserId: string;
  filters?: MentorSearchFilters;
  page?: number;
  pageSize?: number;
}

export interface MentorSearchResult {
  mentors: MentorProfile[];
  total: number;
  page: number;
  pageSize: number;
  defaultsApplied: { sport?: string | null; state?: string | null };
}

/**
 * Default filter behavior: when the caller does NOT specify sport / state,
 * we derive them from the athlete's hs_athlete_profiles row. This surfaces
 * the most-relevant mentors first. Callers can pass explicit nulls to
 * widen — an explicit null disables the defaulting for that field.
 */
export async function listMentorsForAthlete(
  input: MentorSearchInput
): Promise<MentorSearchResult> {
  const sb = getServiceRoleClient();
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Math.floor(input.pageSize ?? 12)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Resolve defaults when filters are undefined (but honor explicit null).
  const filters = input.filters ?? {};
  const defaults: { sport?: string | null; state?: string | null } = {};

  let sportFilter: string | null | undefined = filters.sport;
  let stateFilter: string | null | undefined = filters.state;

  if (sportFilter === undefined || stateFilter === undefined) {
    const { data: profile } = await sb
      .from('hs_athlete_profiles')
      .select('sport, state_code')
      .eq('user_id', input.athleteUserId)
      .maybeSingle<{ sport: string | null; state_code: string | null }>();
    if (sportFilter === undefined) {
      sportFilter = profile?.sport ?? null;
      defaults.sport = sportFilter;
    }
    if (stateFilter === undefined) {
      stateFilter = profile?.state_code ?? null;
      defaults.state = stateFilter;
    }
  }

  let query = sb
    .from('alumni_mentor_profiles')
    .select(
      'id, user_id, college_name, college_state, ncaa_division, current_sport, bio, availability, specialties, accepts_message_only, accepts_video_call, hourly_rate_cents, verified_at, visible_to_hs, created_at, updated_at',
      { count: 'exact' }
    )
    .eq('visible_to_hs', true)
    .neq('availability', 'paused');

  if (sportFilter) {
    query = query.ilike('current_sport', sportFilter);
  }
  if (stateFilter) {
    query = query.eq('college_state', stateFilter.toUpperCase());
  }
  if (filters.specialties && filters.specialties.length > 0) {
    // overlap — any requested specialty appears on the mentor.
    query = query.overlaps('specialties', filters.specialties);
  }

  const { data, count, error } = await query
    .order('verified_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return {
      mentors: [],
      total: 0,
      page,
      pageSize,
      defaultsApplied: defaults,
    };
  }

  return {
    mentors: (data ?? []).map((r) => mapMentorProfile(r as MentorProfileRow)),
    total: count ?? 0,
    page,
    pageSize,
    defaultsApplied: defaults,
  };
}

// ----------------------------------------------------------------------------
// Session requests
// ----------------------------------------------------------------------------

export interface RequestSessionInput {
  requesterUserId: string;
  mentorProfileId: string;
  topic: string;
  format: MentorSessionFormat;
  athleteNote?: string | null;
}

export async function requestSession(
  input: RequestSessionInput
): Promise<ServiceResult<MentorSessionRequest>> {
  if (!input.requesterUserId || !input.mentorProfileId) {
    return { ok: false, error: 'requester + mentor required.', code: 'invalid_state' };
  }
  const topic = input.topic.trim();
  if (topic.length < 1 || topic.length > 200) {
    return { ok: false, error: 'Topic is required (max 200 chars).', code: 'invalid_state' };
  }

  const mentor = await getMentorProfileById(input.mentorProfileId);
  if (!mentor) {
    return { ok: false, error: 'Mentor not found.', code: 'not_found' };
  }
  if (!mentor.visibleToHs || mentor.availability === 'paused') {
    return {
      ok: false,
      error: 'This mentor is not accepting new requests.',
      code: 'forbidden',
    };
  }
  if (input.format === 'message' && !mentor.acceptsMessageOnly) {
    return {
      ok: false,
      error: 'This mentor does not accept message-only sessions.',
      code: 'invalid_state',
    };
  }
  if (input.format === 'video_call' && !mentor.acceptsVideoCall) {
    return {
      ok: false,
      error: 'This mentor does not accept video-call sessions yet.',
      code: 'invalid_state',
    };
  }
  if (input.requesterUserId === mentor.userId) {
    return {
      ok: false,
      error: 'You cannot request a session with yourself.',
      code: 'invalid_state',
    };
  }

  const sb = getServiceRoleClient();
  const note =
    typeof input.athleteNote === 'string' && input.athleteNote.trim().length > 0
      ? input.athleteNote.trim().slice(0, 2000)
      : null;

  const { data, error } = await sb
    .from('mentor_session_requests')
    .insert({
      requester_user_id: input.requesterUserId,
      mentor_profile_id: mentor.id,
      mentor_user_id: mentor.userId,
      requested_topic: topic,
      requested_format: input.format,
      athlete_note: note,
      status: 'pending',
    })
    .select(
      'id, requester_user_id, mentor_profile_id, mentor_user_id, requested_topic, requested_format, athlete_note, status, declined_reason, created_at, responded_at, completed_at'
    )
    .single<MentorSessionRow>();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? 'Failed to create session request.',
      code: 'db_error',
    };
  }
  return { ok: true, data: mapSession(data) };
}

export interface RespondInput {
  requestId: string;
  mentorUserId: string;
  decision: 'accepted' | 'declined';
  declinedReason?: string | null;
}

export async function respondToRequest(
  input: RespondInput
): Promise<ServiceResult<MentorSessionRequest>> {
  const sb = getServiceRoleClient();

  const { data: row, error: fetchErr } = await sb
    .from('mentor_session_requests')
    .select('id, mentor_user_id, status')
    .eq('id', input.requestId)
    .maybeSingle<Pick<MentorSessionRow, 'id' | 'mentor_user_id' | 'status'>>();

  if (fetchErr) return { ok: false, error: fetchErr.message, code: 'db_error' };
  if (!row) return { ok: false, error: 'Session request not found.', code: 'not_found' };
  if (row.mentor_user_id !== input.mentorUserId) {
    return {
      ok: false,
      error: 'Only the mentor on this request can respond.',
      code: 'forbidden',
    };
  }
  if (row.status !== 'pending') {
    return {
      ok: false,
      error: `Request is ${row.status}; only pending requests can be responded to.`,
      code: 'invalid_state',
    };
  }

  const declinedReason =
    input.decision === 'declined'
      ? (input.declinedReason?.trim() || null)
      : null;

  const { data: updated, error: updateErr } = await sb
    .from('mentor_session_requests')
    .update({
      status: input.decision,
      declined_reason: declinedReason,
      responded_at: new Date().toISOString(),
    })
    .eq('id', input.requestId)
    .eq('status', 'pending')
    .select(
      'id, requester_user_id, mentor_profile_id, mentor_user_id, requested_topic, requested_format, athlete_note, status, declined_reason, created_at, responded_at, completed_at'
    )
    .maybeSingle<MentorSessionRow>();

  if (updateErr) return { ok: false, error: updateErr.message, code: 'db_error' };
  if (!updated)
    return {
      ok: false,
      error: 'Request was modified by another write.',
      code: 'conflict',
    };

  return { ok: true, data: mapSession(updated) };
}

export async function getSessionRequest(
  requestId: string,
  viewerUserId: string
): Promise<ServiceResult<MentorSessionRequest>> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('mentor_session_requests')
    .select(
      'id, requester_user_id, mentor_profile_id, mentor_user_id, requested_topic, requested_format, athlete_note, status, declined_reason, created_at, responded_at, completed_at'
    )
    .eq('id', requestId)
    .maybeSingle<MentorSessionRow>();

  if (error) return { ok: false, error: error.message, code: 'db_error' };
  if (!data) return { ok: false, error: 'Not found.', code: 'not_found' };
  if (data.requester_user_id !== viewerUserId && data.mentor_user_id !== viewerUserId) {
    return { ok: false, error: 'Forbidden.', code: 'forbidden' };
  }
  return { ok: true, data: mapSession(data) };
}

export async function listSessionsForUser(
  userId: string,
  role: 'mentor' | 'athlete'
): Promise<MentorSessionRequest[]> {
  const sb = getServiceRoleClient();
  const column = role === 'mentor' ? 'mentor_user_id' : 'requester_user_id';
  const { data, error } = await sb
    .from('mentor_session_requests')
    .select(
      'id, requester_user_id, mentor_profile_id, mentor_user_id, requested_topic, requested_format, athlete_note, status, declined_reason, created_at, responded_at, completed_at'
    )
    .eq(column, userId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return (data as MentorSessionRow[]).map(mapSession);
}

export async function markSessionCompleted(
  requestId: string,
  userId: string
): Promise<ServiceResult<MentorSessionRequest>> {
  const sb = getServiceRoleClient();

  const { data: row, error: fetchErr } = await sb
    .from('mentor_session_requests')
    .select('id, requester_user_id, mentor_user_id, status')
    .eq('id', requestId)
    .maybeSingle<Pick<MentorSessionRow, 'id' | 'requester_user_id' | 'mentor_user_id' | 'status'>>();

  if (fetchErr) return { ok: false, error: fetchErr.message, code: 'db_error' };
  if (!row) return { ok: false, error: 'Not found.', code: 'not_found' };
  if (row.requester_user_id !== userId && row.mentor_user_id !== userId) {
    return { ok: false, error: 'Forbidden.', code: 'forbidden' };
  }
  if (row.status !== 'accepted') {
    return {
      ok: false,
      error: `Can only complete accepted sessions (current: ${row.status}).`,
      code: 'invalid_state',
    };
  }

  const { data: updated, error: updateErr } = await sb
    .from('mentor_session_requests')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'accepted')
    .select(
      'id, requester_user_id, mentor_profile_id, mentor_user_id, requested_topic, requested_format, athlete_note, status, declined_reason, created_at, responded_at, completed_at'
    )
    .maybeSingle<MentorSessionRow>();

  if (updateErr) return { ok: false, error: updateErr.message, code: 'db_error' };
  if (!updated)
    return {
      ok: false,
      error: 'Session was modified by another write.',
      code: 'conflict',
    };
  return { ok: true, data: mapSession(updated) };
}

// ----------------------------------------------------------------------------
// Messages
// ----------------------------------------------------------------------------

export interface PostMessageInput {
  requestId: string;
  senderUserId: string;
  body: string;
}

export async function postMessage(
  input: PostMessageInput
): Promise<ServiceResult<MentorMessage>> {
  const body = input.body.trim();
  if (body.length === 0) {
    return { ok: false, error: 'Message body required.', code: 'invalid_state' };
  }
  if (body.length > 5000) {
    return { ok: false, error: 'Message too long (5000 chars max).', code: 'invalid_state' };
  }

  const sb = getServiceRoleClient();

  // Load the session to determine role + authorize.
  const { data: session, error: sessionErr } = await sb
    .from('mentor_session_requests')
    .select('id, requester_user_id, mentor_user_id, status')
    .eq('id', input.requestId)
    .maybeSingle<Pick<MentorSessionRow, 'id' | 'requester_user_id' | 'mentor_user_id' | 'status'>>();

  if (sessionErr) return { ok: false, error: sessionErr.message, code: 'db_error' };
  if (!session) return { ok: false, error: 'Session not found.', code: 'not_found' };
  if (
    input.senderUserId !== session.requester_user_id &&
    input.senderUserId !== session.mentor_user_id
  ) {
    return { ok: false, error: 'Forbidden.', code: 'forbidden' };
  }
  if (session.status === 'declined' || session.status === 'expired') {
    return {
      ok: false,
      error: `Session is ${session.status}; messaging disabled.`,
      code: 'invalid_state',
    };
  }

  const senderRole: MentorMessageSenderRole =
    input.senderUserId === session.mentor_user_id ? 'mentor' : 'athlete';

  const { data, error } = await sb
    .from('mentor_messages')
    .insert({
      session_request_id: input.requestId,
      sender_user_id: input.senderUserId,
      sender_role: senderRole,
      body,
    })
    .select('id, session_request_id, sender_user_id, sender_role, body, created_at')
    .single<MentorMessageRow>();

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Failed to post message.', code: 'db_error' };
  }
  return { ok: true, data: mapMessage(data) };
}

export async function listMessagesForSession(
  requestId: string,
  viewerUserId: string
): Promise<MentorMessage[]> {
  const sb = getServiceRoleClient();

  // Authorization via session lookup.
  const { data: session } = await sb
    .from('mentor_session_requests')
    .select('requester_user_id, mentor_user_id')
    .eq('id', requestId)
    .maybeSingle<Pick<MentorSessionRow, 'requester_user_id' | 'mentor_user_id'>>();
  if (!session) return [];
  if (
    session.requester_user_id !== viewerUserId &&
    session.mentor_user_id !== viewerUserId
  ) {
    return [];
  }

  const { data } = await sb
    .from('mentor_messages')
    .select('id, session_request_id, sender_user_id, sender_role, body, created_at')
    .eq('session_request_id', requestId)
    .order('created_at', { ascending: true })
    .limit(500);
  return (data ?? []).map((r) => mapMessage(r as MentorMessageRow));
}

/**
 * Email-throttle helper. Returns true when we should SUPPRESS a notification
 * because the recipient already received one in the last windowMinutes.
 *
 * Heuristic: if the sender authored ≥1 message in the prior window, we assume
 * the previous message's email was already emitted to the counterparty, and
 * we skip this one. Scanning actual mentor_messages created_at is the "derive
 * from data" discipline required by the spec — no last_emailed_at column.
 */
export async function shouldSuppressNewMessageEmail(
  requestId: string,
  senderRole: MentorMessageSenderRole,
  currentMessageCreatedAt: string,
  windowMinutes = 60
): Promise<boolean> {
  const sb = getServiceRoleClient();
  const windowStart = new Date(
    new Date(currentMessageCreatedAt).getTime() - windowMinutes * 60 * 1000
  ).toISOString();

  const { data, error } = await sb
    .from('mentor_messages')
    .select('id, created_at')
    .eq('session_request_id', requestId)
    .eq('sender_role', senderRole)
    .gte('created_at', windowStart)
    .lt('created_at', currentMessageCreatedAt)
    .limit(1);

  if (error) return false;
  return (data?.length ?? 0) > 0;
}

// ----------------------------------------------------------------------------
// Display helpers
// ----------------------------------------------------------------------------

export function formatAvailability(a: MentorAvailability): string {
  switch (a) {
    case 'weekly':
      return 'Weekly availability';
    case 'biweekly':
      return 'Every other week';
    case 'monthly':
      return 'Monthly';
    case 'paused':
      return 'Currently paused';
  }
}

export function sessionStatusLabel(s: MentorSessionStatus): string {
  switch (s) {
    case 'pending':
      return 'Awaiting response';
    case 'accepted':
      return 'Active';
    case 'declined':
      return 'Declined';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'expired':
      return 'Expired';
  }
}
