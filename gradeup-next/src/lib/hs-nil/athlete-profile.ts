/**
 * HS-NIL Athlete Public Profile Service
 * ----------------------------------------------------------------------------
 * Backs the public bio-linkable athlete profile at /athletes/[username].
 *
 * Responsibilities:
 *   - claimUsername   — first-time claim with validation + reserved check.
 *   - updateBio       — 280-char public bio editor.
 *   - setVisibility   — opt-in public visibility toggle.
 *   - getPublicProfileByUsername — all data the public page needs.
 *   - checkUsernameAvailable — fast availability check for live form.
 *   - listPublicAthletes      — directory listing + sitemap builder.
 *   - logProfileView  — coarsened view-log write.
 *
 * PII minimization contract (enforced here, relied on by /athletes pages):
 *   getPublicProfileByUsername returns first name + last initial, school,
 *   sport, state, grad year, GPA + verification tier, bio, trajectory
 *   snapshots for a mini-chart, and a completed-deal COUNT (never
 *   amounts). No email, no phone, no DOB, no parent info, no full name.
 *
 * All writes are service-role — the API layer validates the caller.
 * All reads the public page needs are service-role too (the anon client
 * could work now that RLS permits a public SELECT, but going service-
 * role keeps the code path predictable and avoids surprise RLS drift).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import type {
  GpaSnapshot,
  VerificationTier,
} from '@/lib/hs-nil/trajectory';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface AthletePublicProfileSettings {
  username: string | null;
  publicVisibility: boolean;
  publicBio: string | null;
  publicBioUpdatedAt: string | null;
  claimedUsernameAt: string | null;
}

export interface PublicAthleteProfile {
  athleteUserId: string;
  username: string;
  publicBio: string | null;
  firstName: string;
  lastInitial: string;
  school: string | null;
  sport: string | null;
  stateCode: string | null;
  stateName: string | null;
  graduationYear: number | null;
  currentGpa: number | null;
  currentTier: VerificationTier | null;
  snapshots: GpaSnapshot[];
  completedDealsCount: number;
  /** Brand logos from recent completed deals (amount intentionally NOT exposed). */
  completedDealBrands: Array<{
    brandName: string;
    brandLogoUrl: string | null;
  }>;
}

export interface DirectoryAthleteSummary {
  username: string;
  firstName: string;
  lastInitial: string;
  school: string | null;
  sport: string | null;
  stateCode: string | null;
  stateName: string | null;
  graduationYear: number | null;
  currentGpa: number | null;
  currentTier: VerificationTier | null;
  completedDealsCount: number;
  publicBio: string | null;
  compositeScore: number;
}

export interface DirectoryFilters {
  stateCode?: string | null;
  sport?: string | null;
  graduationYear?: number | null;
  limit?: number;
  offset?: number;
}

export interface ClaimResult {
  success: boolean;
  error?: string;
}

// ----------------------------------------------------------------------------
// Reserved usernames — mirror public.is_reserved_username() in SQL.
// Keep in lockstep with the migration.
// ----------------------------------------------------------------------------

export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  'admin', 'administrator', 'api', 'app', 'auth', 'login', 'logout',
  'signup', 'signin', 'register', 'dashboard', 'settings', 'account',
  'hs', 'nil', 'gradeup', 'gradeup-nil', 'gradeupnil',
  'brand', 'brands', 'parent', 'parents', 'athlete', 'athletes',
  'business', 'solutions', 'blog', 'blogs', 'discover', 'opportunities',
  'pricing', 'compare', 'help', 'support', 'privacy', 'terms',
  'subscription', 'subscription-terms', 'cookies', 'legal',
  'about', 'contact', 'press', 'careers', 'jobs',
  'ad', 'ads', 'state-ads', 'state-ad-portal',
  'trajectory', 'case-studies', 'campaigns', 'deals',
  'sitemap', 'robots', 'favicon', 'manifest', 'sw',
  'null', 'undefined', 'true', 'false',
  'root', 'system', 'webmaster', 'postmaster', 'hostmaster',
  'hempp', 'founder', 'staff', 'team', 'mod', 'moderator',
  'public', 'private', 'anonymous', 'guest', 'user', 'me', 'my', 'self',
]);

export const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const BIO_MAX = 280;

// ----------------------------------------------------------------------------
// State-name map — kept local to avoid circular deps; matches
// PublicTrajectoryView's table.
// ----------------------------------------------------------------------------

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan',
  MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota',
  OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island',
  SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas',
  UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming',
};

export function stateDisplayName(code: string | null | undefined): string | null {
  if (!code) return null;
  return STATE_NAMES[code.toUpperCase()] ?? code.toUpperCase();
}

// ----------------------------------------------------------------------------
// Service-role client
// ----------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase service role not configured (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ----------------------------------------------------------------------------
// Username validation helpers
// ----------------------------------------------------------------------------

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(normalizeUsername(username));
}

export interface UsernameValidationResult {
  ok: boolean;
  error?: string;
  normalized?: string;
}

export function validateUsername(raw: unknown): UsernameValidationResult {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'Username must be a string.' };
  }
  const normalized = normalizeUsername(raw);
  if (normalized.length < USERNAME_MIN) {
    return { ok: false, error: `Username must be at least ${USERNAME_MIN} characters.` };
  }
  if (normalized.length > USERNAME_MAX) {
    return { ok: false, error: `Username must be at most ${USERNAME_MAX} characters.` };
  }
  if (!USERNAME_REGEX.test(normalized)) {
    return {
      ok: false,
      error:
        'Username must be lowercase letters, numbers, or dashes (not starting or ending with a dash).',
    };
  }
  if (isReservedUsername(normalized)) {
    return { ok: false, error: 'That username is reserved. Try another.' };
  }
  return { ok: true, normalized };
}

// ----------------------------------------------------------------------------
// checkUsernameAvailable — fast availability probe for live form feedback.
// ----------------------------------------------------------------------------

export interface UsernameAvailability {
  available: boolean;
  reason?: 'invalid' | 'reserved' | 'taken';
  error?: string;
  normalized?: string;
}

export async function checkUsernameAvailable(
  raw: string
): Promise<UsernameAvailability> {
  const v = validateUsername(raw);
  if (!v.ok) {
    const reason = v.error?.includes('reserved') ? 'reserved' : 'invalid';
    return { available: false, reason, error: v.error };
  }
  const sb = getServiceRoleClient();
  const { data } = await sb
    .from('hs_athlete_profiles')
    .select('user_id')
    .eq('username', v.normalized!)
    .maybeSingle();

  if (data) {
    return { available: false, reason: 'taken', normalized: v.normalized };
  }
  return { available: true, normalized: v.normalized };
}

// ----------------------------------------------------------------------------
// claimUsername — first-time claim.
// ----------------------------------------------------------------------------

export interface ClaimUsernameInput {
  athleteUserId: string;
  username: string;
}

export async function claimUsername(
  input: ClaimUsernameInput
): Promise<ClaimResult> {
  const v = validateUsername(input.username);
  if (!v.ok) return { success: false, error: v.error };
  const username = v.normalized!;

  const sb = getServiceRoleClient();

  // Fetch current row to enforce claim-once + confirm profile exists.
  const { data: profile } = await sb
    .from('hs_athlete_profiles')
    .select('user_id, username, claimed_username_at')
    .eq('user_id', input.athleteUserId)
    .maybeSingle<{
      user_id: string;
      username: string | null;
      claimed_username_at: string | null;
    }>();

  if (!profile) {
    return { success: false, error: 'HS athlete profile not found.' };
  }
  if (profile.username || profile.claimed_username_at) {
    return {
      success: false,
      error:
        'A username has already been claimed on this account. Contact support to change it.',
    };
  }

  // Collision check (service-role read bypasses RLS).
  const { data: collision } = await sb
    .from('hs_athlete_profiles')
    .select('user_id')
    .eq('username', username)
    .maybeSingle();
  if (collision) {
    return { success: false, error: 'That username is already taken.' };
  }

  const nowIso = new Date().toISOString();
  const { error } = await sb
    .from('hs_athlete_profiles')
    .update({
      username,
      claimed_username_at: nowIso,
    })
    .eq('user_id', input.athleteUserId);

  if (error) {
    // Unique-index race → taken.
    if (/duplicate|unique/i.test(error.message)) {
      return { success: false, error: 'That username is already taken.' };
    }
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ----------------------------------------------------------------------------
// updateBio
// ----------------------------------------------------------------------------

export interface UpdateBioInput {
  athleteUserId: string;
  bio: string | null;
}

export async function updateBio(
  input: UpdateBioInput
): Promise<ClaimResult> {
  const bio = input.bio === null ? null : String(input.bio).trim();
  if (bio !== null && bio.length > BIO_MAX) {
    return {
      success: false,
      error: `Bio must be at most ${BIO_MAX} characters.`,
    };
  }

  // TODO: profanity / disallowed-content classifier hook.
  // For now we accept any in-range string. Moderation lives at the
  // platform layer and can be added here when the shared classifier
  // stabilizes.

  const sb = getServiceRoleClient();
  const { error } = await sb
    .from('hs_athlete_profiles')
    .update({
      public_bio: bio,
      public_bio_updated_at: new Date().toISOString(),
    })
    .eq('user_id', input.athleteUserId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ----------------------------------------------------------------------------
// setVisibility
// ----------------------------------------------------------------------------

export interface SetVisibilityInput {
  athleteUserId: string;
  visible: boolean;
}

export async function setVisibility(
  input: SetVisibilityInput
): Promise<ClaimResult> {
  const sb = getServiceRoleClient();

  // When enabling, require a claimed username.
  if (input.visible) {
    const { data: profile } = await sb
      .from('hs_athlete_profiles')
      .select('username')
      .eq('user_id', input.athleteUserId)
      .maybeSingle<{ username: string | null }>();
    if (!profile || !profile.username) {
      return {
        success: false,
        error: 'Claim a username before making your profile public.',
      };
    }
  }

  const { error } = await sb
    .from('hs_athlete_profiles')
    .update({ public_visibility: input.visible })
    .eq('user_id', input.athleteUserId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ----------------------------------------------------------------------------
// getSettingsForAthlete — feed for the settings page.
// ----------------------------------------------------------------------------

export async function getSettingsForAthlete(
  supabase: SupabaseClient,
  athleteUserId: string
): Promise<AthletePublicProfileSettings | null> {
  const { data } = await supabase
    .from('hs_athlete_profiles')
    .select(
      'username, public_visibility, public_bio, public_bio_updated_at, claimed_username_at'
    )
    .eq('user_id', athleteUserId)
    .maybeSingle<{
      username: string | null;
      public_visibility: boolean | null;
      public_bio: string | null;
      public_bio_updated_at: string | null;
      claimed_username_at: string | null;
    }>();
  if (!data) return null;
  return {
    username: data.username,
    publicVisibility: data.public_visibility === true,
    publicBio: data.public_bio,
    publicBioUpdatedAt: data.public_bio_updated_at,
    claimedUsernameAt: data.claimed_username_at,
  };
}

// ----------------------------------------------------------------------------
// getPublicProfileByUsername — feeds the public /athletes/[username] page.
// ----------------------------------------------------------------------------

interface PublicProfileRow {
  user_id: string;
  username: string;
  public_bio: string | null;
  public_visibility: boolean;
  state_code: string | null;
  sport: string | null;
  school_name: string | null;
  graduation_year: number | null;
  gpa: number | string | null;
  gpa_verification_tier: VerificationTier | null;
}

interface AthleteNameRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface SnapshotRow {
  id: string;
  athlete_user_id: string;
  gpa: number | string;
  verification_tier: VerificationTier;
  source: GpaSnapshot['source'];
  source_reference_id: string | null;
  reported_at: string;
  recorded_at: string;
  notes: string | null;
}

function mapSnapshotRow(row: SnapshotRow): GpaSnapshot {
  const gpa = typeof row.gpa === 'string' ? Number(row.gpa) : row.gpa;
  return {
    id: row.id,
    athleteUserId: row.athlete_user_id,
    gpa: Number.isFinite(gpa) ? gpa : 0,
    tier: row.verification_tier,
    source: row.source,
    sourceReferenceId: row.source_reference_id,
    reportedAt: row.reported_at,
    recordedAt: row.recorded_at,
    notes: row.notes,
  };
}

export async function getPublicProfileByUsername(
  rawUsername: string
): Promise<PublicAthleteProfile | null> {
  const v = validateUsername(rawUsername);
  if (!v.ok) return null;
  const username = v.normalized!;
  const sb = getServiceRoleClient();

  const { data: profile } = await sb
    .from('hs_athlete_profiles')
    .select(
      'user_id, username, public_bio, public_visibility, state_code, sport, school_name, graduation_year, gpa, gpa_verification_tier'
    )
    .eq('username', username)
    .maybeSingle<PublicProfileRow>();

  if (!profile || profile.public_visibility !== true || !profile.username) {
    return null;
  }

  // Athlete name (for first name + last initial).
  const { data: athleteRow } = await sb
    .from('athletes')
    .select('id, first_name, last_name')
    .eq('profile_id', profile.user_id)
    .maybeSingle<AthleteNameRow>();

  const firstName = athleteRow?.first_name?.trim() || 'Scholar';
  const lastName = athleteRow?.last_name?.trim() || 'Athlete';
  const lastInitial = lastName.charAt(0).toUpperCase();

  // Snapshots — full history for the mini chart.
  const { data: snapshotRows } = await sb
    .from('hs_athlete_gpa_snapshots')
    .select(
      'id, athlete_user_id, gpa, verification_tier, source, source_reference_id, reported_at, recorded_at, notes'
    )
    .eq('athlete_user_id', profile.user_id)
    .order('reported_at', { ascending: true });

  const snapshots = (snapshotRows ?? []).map((r) =>
    mapSnapshotRow(r as SnapshotRow)
  );

  // Completed-deals COUNT + brand-logo strip. Amounts are NOT selected.
  let completedDealsCount = 0;
  const completedDealBrands: Array<{
    brandName: string;
    brandLogoUrl: string | null;
  }> = [];
  if (athleteRow?.id) {
    const { data: dealRows } = await sb
      .from('deals')
      .select(
        `id, status, completed_at,
         brand:brands(company_name, logo_url)`
      )
      .eq('athlete_id', athleteRow.id)
      .in('status', ['paid', 'completed'])
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(12);

    const rows = (dealRows ?? []) as unknown as Array<{
      id: string;
      brand: { company_name: string; logo_url: string | null } | null;
    }>;
    completedDealsCount = rows.length;
    // De-duplicate by brand name so multi-deal brands don't spam the strip.
    const seen = new Set<string>();
    for (const r of rows) {
      const name = r.brand?.company_name ?? 'Unknown brand';
      if (seen.has(name)) continue;
      seen.add(name);
      completedDealBrands.push({
        brandName: name,
        brandLogoUrl: r.brand?.logo_url ?? null,
      });
      if (completedDealBrands.length >= 6) break;
    }
  }

  const currentGpa =
    profile.gpa !== null && profile.gpa !== undefined
      ? typeof profile.gpa === 'string'
        ? Number(profile.gpa)
        : profile.gpa
      : null;

  return {
    athleteUserId: profile.user_id,
    username: profile.username,
    publicBio: profile.public_bio,
    firstName,
    lastInitial,
    school: profile.school_name,
    sport: profile.sport,
    stateCode: profile.state_code,
    stateName: stateDisplayName(profile.state_code),
    graduationYear: profile.graduation_year,
    currentGpa: currentGpa !== null && Number.isFinite(currentGpa) ? currentGpa : null,
    currentTier: profile.gpa_verification_tier,
    snapshots,
    completedDealsCount,
    completedDealBrands,
  };
}

// ----------------------------------------------------------------------------
// listPublicAthletes — directory index + sitemap feeder.
// ----------------------------------------------------------------------------

/**
 * Composite score for directory ordering. Pure fn, deterministic — the
 * point is to surface athletes with the richest trajectory, not to be
 * clever. Weights:
 *   - GPA / 4.0  (caps at 1.0)                      × 0.55
 *   - deals count (log-normalized over ceiling 10)  × 0.30
 *   - tier bonus (institution=1, transcript=0.5)    × 0.15
 */
function composeScore(input: {
  gpa: number | null;
  tier: VerificationTier | null;
  dealsCount: number;
}): number {
  const gpaN = Math.min(1, Math.max(0, (input.gpa ?? 0) / 4.0));
  const dealsN = Math.min(1, Math.log10(1 + input.dealsCount) / Math.log10(11));
  const tierBonus =
    input.tier === 'institution_verified'
      ? 1
      : input.tier === 'user_submitted'
        ? 0.5
        : 0;
  return 0.55 * gpaN + 0.3 * dealsN + 0.15 * tierBonus;
}

export async function listPublicAthletes(
  filters: DirectoryFilters = {}
): Promise<DirectoryAthleteSummary[]> {
  const sb = getServiceRoleClient();
  const limit = Math.min(Math.max(filters.limit ?? 60, 1), 200);
  const offset = Math.max(filters.offset ?? 0, 0);

  let query = sb
    .from('hs_athlete_profiles')
    .select(
      'user_id, username, public_bio, state_code, sport, school_name, graduation_year, gpa, gpa_verification_tier'
    )
    .eq('public_visibility', true)
    .not('username', 'is', null);

  if (filters.stateCode) query = query.eq('state_code', filters.stateCode);
  if (filters.sport) query = query.eq('sport', filters.sport);
  if (filters.graduationYear) {
    query = query.eq('graduation_year', filters.graduationYear);
  }

  const { data, error } = await query.range(offset, offset + limit - 1);
  if (error || !data) return [];

  const rows = data as unknown as Array<
    PublicProfileRow & { user_id: string }
  >;

  // Hydrate first names + deals counts in batch. This is a directory
  // view so per-row serial queries would be a death-march — we collect
  // profile_ids and athlete_ids, then do two cheap IN-queries.
  const userIds = rows.map((r) => r.user_id);
  const nameMap = new Map<string, { firstName: string; lastInitial: string }>();
  const athleteIdMap = new Map<string, string>();

  if (userIds.length) {
    const { data: athleteRows } = await sb
      .from('athletes')
      .select('id, profile_id, first_name, last_name')
      .in('profile_id', userIds);
    for (const a of (athleteRows ?? []) as Array<{
      id: string;
      profile_id: string;
      first_name: string | null;
      last_name: string | null;
    }>) {
      const firstName = a.first_name?.trim() || 'Scholar';
      const lastInitial = (a.last_name?.trim().charAt(0) || 'A').toUpperCase();
      nameMap.set(a.profile_id, { firstName, lastInitial });
      athleteIdMap.set(a.profile_id, a.id);
    }
  }

  const athleteIds = Array.from(athleteIdMap.values());
  const dealsCount = new Map<string, number>();
  if (athleteIds.length) {
    const { data: dealRows } = await sb
      .from('deals')
      .select('athlete_id, status')
      .in('athlete_id', athleteIds)
      .in('status', ['paid', 'completed']);
    for (const d of (dealRows ?? []) as Array<{ athlete_id: string }>) {
      dealsCount.set(d.athlete_id, (dealsCount.get(d.athlete_id) ?? 0) + 1);
    }
  }

  const summaries: DirectoryAthleteSummary[] = rows.map((r) => {
    const nm = nameMap.get(r.user_id) ?? {
      firstName: 'Scholar',
      lastInitial: 'A',
    };
    const athleteId = athleteIdMap.get(r.user_id);
    const dealsN = athleteId ? (dealsCount.get(athleteId) ?? 0) : 0;
    const gpa =
      r.gpa === null || r.gpa === undefined
        ? null
        : typeof r.gpa === 'string'
          ? Number(r.gpa)
          : r.gpa;
    return {
      username: r.username as string,
      firstName: nm.firstName,
      lastInitial: nm.lastInitial,
      school: r.school_name,
      sport: r.sport,
      stateCode: r.state_code,
      stateName: stateDisplayName(r.state_code),
      graduationYear: r.graduation_year,
      currentGpa: gpa !== null && Number.isFinite(gpa) ? gpa : null,
      currentTier: r.gpa_verification_tier,
      completedDealsCount: dealsN,
      publicBio: r.public_bio,
      compositeScore: composeScore({
        gpa: gpa !== null && Number.isFinite(gpa) ? gpa : null,
        tier: r.gpa_verification_tier,
        dealsCount: dealsN,
      }),
    };
  });

  summaries.sort((a, b) => b.compositeScore - a.compositeScore);
  return summaries;
}

// ----------------------------------------------------------------------------
// logProfileView — coarsened analytics insert. Fire-and-forget from the page.
// ----------------------------------------------------------------------------

function coarseUserAgent(ua: string | null): string {
  if (!ua) return 'other';
  const lc = ua.toLowerCase();
  if (/bot|crawler|spider|slurp|preview|facebookexternalhit|twitterbot/.test(lc)) {
    return 'bot';
  }
  if (/ipad|tablet/.test(lc)) return 'tablet';
  if (/iphone|android|mobi/.test(lc)) return 'mobile';
  if (/mozilla|chrome|safari|firefox|edge/.test(lc)) return 'desktop';
  return 'other';
}

function coarseReferrer(ref: string | null): string | null {
  if (!ref) return null;
  try {
    const u = new URL(ref);
    return u.host.toLowerCase() || null;
  } catch {
    return null;
  }
}

function ipHash(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.ATHLETE_VIEW_HASH_SALT ?? 'gradeup-hs-default-salt';
  return createHash('sha256').update(`${ip}:${salt}`).digest('hex').slice(0, 48);
}

function getClientIP(req: { headers: Headers } | NextRequest): string | null {
  const h = req.headers;
  const xff = h.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  const real = h.get('x-real-ip');
  if (real) return real.trim();
  return null;
}

export interface LogProfileViewInput {
  athleteUserId: string;
  req: { headers: Headers } | NextRequest;
}

export async function logProfileView(
  input: LogProfileViewInput
): Promise<void> {
  try {
    const sb = getServiceRoleClient();
    const ua = input.req.headers.get('user-agent');
    const referrer = input.req.headers.get('referer');
    const ip = getClientIP(input.req);
    await sb.from('athlete_profile_view_log').insert({
      athlete_user_id: input.athleteUserId,
      user_agent_hint: coarseUserAgent(ua),
      referrer_hint: coarseReferrer(referrer),
      ip_hash: ipHash(ip),
    });
  } catch {
    // Telemetry must never break the page render.
  }
}
