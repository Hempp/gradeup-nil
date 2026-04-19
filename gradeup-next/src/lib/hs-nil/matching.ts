/**
 * HS-NIL Brand → Athlete Matching Service
 *
 * Thin service layer over the `match_hs_athletes_for_brand` RPC and
 * the athlete-side `is_discoverable` toggle. See migration
 * `20260418_014_athlete_visibility.sql` for the SQL surface.
 *
 * Responsibilities:
 *   - getSuggestedAthletes(brandId, filters) — ranked list for the
 *     /hs/brand/suggested page.
 *   - getNewMatchesForBrand(brandId, since) — counts matches whose
 *     profile was created since the given timestamp. Used by the
 *     match-alert cron and the brand dashboard "new since last
 *     visit" badge.
 *   - toggleAthleteDiscoverability(userId, isDiscoverable) — server-
 *     side update wrapped around the existing RLS policy. Called
 *     from the /api/hs/athlete/discoverability route.
 *   - signAthleteRef / verifyAthleteRef — HMAC wrapper so brands
 *     cannot brute-force athlete UUIDs from the suggested list into
 *     the deal-creation form. Falls back to plain ids + TODO when
 *     SERVER_SECRET is not configured.
 *
 * All reads go through the shared server SSR client. The caller is
 * responsible for establishing the auth context (route handlers /
 * server components).
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type GpaTier =
  | 'self_reported'
  | 'user_submitted'
  | 'institution_verified';

export interface MatchedAthleteRow {
  athleteId: string;
  firstName: string;
  schoolName: string;
  sport: string;
  gpa: number | null;
  gpaVerificationTier: GpaTier;
  stateCode: string;
  graduationYear: number;
  matchScore: number;
  /** Per-(brand, athlete) aggregate feedback weight. 0 when no feedback. */
  affinityScore: number;
  /** Number of feedback events behind affinityScore. 0 when no feedback. */
  signalCount: number;
  /**
   * Phase 11 referral-rewards contribution: 0..1 sum of linked-parent
   * priority-boost perks, clamped by the RPC and re-clamped here.
   * Surfaces zero when the 20260419_011 migration isn't live yet.
   */
  referralPriorityBoost: number;
}

export interface GetSuggestedAthletesFilters {
  minGpa?: number;
  /** Hard cap clamped to [1,200] by the RPC. */
  limit?: number;
}

/**
 * Row shape returned by the RPC. snake_case mirrors the SQL RETURNS TABLE.
 */
interface RpcRow {
  athlete_id: string;
  first_name: string;
  school_name: string;
  sport: string;
  gpa: number | null;
  gpa_verification_tier: string;
  state_code: string;
  graduation_year: number;
  match_score: number;
  /** Added Phase 8 — present whenever the 20260419_004 migration is live. */
  affinity_score?: number | null;
  /** Added Phase 8 — present whenever the 20260419_004 migration is live. */
  signal_count?: number | null;
  /** Added Phase 11 — present whenever the 20260419_011 migration is live. */
  referral_priority_boost?: number | null;
}

function isGpaTier(value: string): value is GpaTier {
  return (
    value === 'self_reported' ||
    value === 'user_submitted' ||
    value === 'institution_verified'
  );
}

function normalizeRow(row: RpcRow): MatchedAthleteRow {
  return {
    athleteId: row.athlete_id,
    firstName: row.first_name,
    schoolName: row.school_name,
    sport: row.sport,
    gpa: row.gpa,
    gpaVerificationTier: isGpaTier(row.gpa_verification_tier)
      ? row.gpa_verification_tier
      : 'self_reported',
    stateCode: row.state_code,
    graduationYear: row.graduation_year,
    matchScore: row.match_score,
    affinityScore:
      row.affinity_score !== null && row.affinity_score !== undefined
        ? Number(row.affinity_score)
        : 0,
    signalCount:
      row.signal_count !== null && row.signal_count !== undefined
        ? Number(row.signal_count)
        : 0,
    referralPriorityBoost:
      row.referral_priority_boost !== null &&
      row.referral_priority_boost !== undefined
        ? Math.min(1, Math.max(0, Number(row.referral_priority_boost)))
        : 0,
  };
}

// ─────────────────────────────────────────────────────────────────
// getSuggestedAthletes
// ─────────────────────────────────────────────────────────────────

/**
 * Call the RPC for a specific brand. Returns [] on error to keep the
 * calling page from 500ing on a transient hiccup — the caller decides
 * whether to log or surface.
 */
export async function getSuggestedAthletes(
  supabase: SupabaseClient,
  brandId: string,
  filters: GetSuggestedAthletesFilters = {}
): Promise<MatchedAthleteRow[]> {
  const { data, error } = await supabase.rpc('match_hs_athletes_for_brand', {
    p_brand_id: brandId,
    p_min_gpa: filters.minGpa ?? 0,
    p_limit_count: filters.limit ?? 25,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[hs-matching] getSuggestedAthletes rpc failed', error.message);
    return [];
  }

  const rows = (data ?? []) as RpcRow[];
  return rows.map(normalizeRow);
}

// ─────────────────────────────────────────────────────────────────
// getNewMatchesForBrand
// ─────────────────────────────────────────────────────────────────

/**
 * How many current matches were created since `sinceTimestamp`? Used
 * by the cron to decide whether to send an alert, and by the brand
 * dashboard to render a "N new since your last visit" badge.
 *
 * Implementation: we call the RPC normally and then filter by a
 * lightweight `created_at` check on hs_athlete_profiles. The RPC
 * itself doesn't expose created_at (by design — brands don't need
 * it), so we issue a follow-up count query against the returned ids.
 * This keeps the RPC's projection minimal without requiring a second
 * RPC variant.
 */
export async function getNewMatchesForBrand(
  supabase: SupabaseClient,
  brandId: string,
  sinceTimestamp: Date | null,
  filters: GetSuggestedAthletesFilters = {}
): Promise<{ total: number; newSince: number; matches: MatchedAthleteRow[] }> {
  const matches = await getSuggestedAthletes(supabase, brandId, filters);
  if (matches.length === 0 || !sinceTimestamp) {
    return {
      total: matches.length,
      newSince: matches.length,
      matches,
    };
  }

  // Look up how many of the matched profiles were created after
  // sinceTimestamp. This is an RLS-safe read because the RPC-returned
  // ids were already validated as discoverable within the brand's
  // states. If this query fails we fall back to 0 new, which is
  // strictly less noisy for the brand.
  const ids = matches.map((m) => m.athleteId);
  const { data, error } = await supabase
    .from('hs_athlete_profiles')
    .select('user_id, created_at')
    .in('user_id', ids)
    .gt('created_at', sinceTimestamp.toISOString());

  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[hs-matching] newSince fetch failed', error.message);
    return { total: matches.length, newSince: 0, matches };
  }

  return {
    total: matches.length,
    newSince: (data ?? []).length,
    matches,
  };
}

// ─────────────────────────────────────────────────────────────────
// toggleAthleteDiscoverability
// ─────────────────────────────────────────────────────────────────

/**
 * Flip the athlete's discoverability flag. RLS on
 * hs_athlete_profiles_update_own enforces that auth.uid() = user_id,
 * so this is safe to call from an authenticated API route. Returns
 * the new flag value so the caller can echo it back to the client.
 */
export async function toggleAthleteDiscoverability(
  supabase: SupabaseClient,
  userId: string,
  isDiscoverable: boolean
): Promise<{ isDiscoverable: boolean; updatedAt: string | null }> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('hs_athlete_profiles')
    .update({
      is_discoverable: isDiscoverable,
      discoverability_updated_at: now,
    })
    .eq('user_id', userId)
    .select('is_discoverable, discoverability_updated_at')
    .maybeSingle();

  if (error) {
    throw new Error(`toggleAthleteDiscoverability failed: ${error.message}`);
  }
  if (!data) {
    throw new Error(
      'toggleAthleteDiscoverability: no athlete profile row for this user.'
    );
  }

  return {
    isDiscoverable: data.is_discoverable as boolean,
    updatedAt: (data.discoverability_updated_at as string | null) ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────
// HMAC athlete-ref signing
// ─────────────────────────────────────────────────────────────────

/**
 * Deal-creation flow takes an `athlete` querystring param when the
 * brand clicks "Propose a deal" on a suggested card. We wrap the
 * athlete UUID in a short HMAC so brands can't bulk-guess UUIDs and
 * post deals against athletes they weren't suggested. The receiving
 * form verifies the signature before using the id.
 *
 * When SERVER_SECRET is missing (local dev / preview deploys without
 * the secret configured) we fall back to returning the raw UUID —
 * matching the pre-feature behavior of the deal-creation form, which
 * only accepted email lookups anyway.
 *
 * TODO: once SERVER_SECRET is required in all envs, drop the
 * fallback and return null when secret is missing so the UI can
 * degrade gracefully instead of leaking raw ids.
 */

const SECRET = process.env.SERVER_SECRET ?? null;

function hmac(value: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(value)
    .digest('base64url')
    .slice(0, 16); // 96 bits is plenty against brute force.
}

export function signAthleteRef(athleteId: string): string {
  if (!SECRET) {
    return athleteId;
  }
  const sig = hmac(athleteId, SECRET);
  return `${athleteId}.${sig}`;
}

/**
 * Verify and unwrap a signed athlete ref. Returns the raw UUID when
 * the signature matches, null otherwise. When SERVER_SECRET is not
 * configured, accepts the value as a raw UUID (matching
 * signAthleteRef's fallback).
 */
export function verifyAthleteRef(ref: string): string | null {
  if (!ref) return null;

  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!SECRET) {
    return UUID_RE.test(ref) ? ref : null;
  }

  const [athleteId, sig] = ref.split('.');
  if (!athleteId || !sig) return null;
  if (!UUID_RE.test(athleteId)) return null;

  const expected = hmac(athleteId, SECRET);

  // Timing-safe compare; lengths must match first or timingSafeEqual
  // throws.
  if (expected.length !== sig.length) return null;
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(sig);
    return timingSafeEqual(a, b) ? athleteId : null;
  } catch {
    return null;
  }
}
