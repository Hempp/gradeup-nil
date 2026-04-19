/**
 * HS-NIL — Parent-to-Parent Referral Service
 *
 * Measurement instrument for the concierge MVP success criterion: "5
 * unprompted parent-to-parent referrals in 30 days". Nothing else in
 * the app attributes organic parent-of-parent growth — without this,
 * those referrals happen off-platform and are invisible in the funnel.
 *
 * Scope
 * ─────
 *   - Generate + fetch a stable 8-char URL-safe code per user.
 *   - Record clicks that land on `/hs?ref=CODE` (attribution row with
 *     referred_user_id NULL + `code_clicked` funnel event).
 *   - Convert a click into an attributed signup (sets referred_user_id
 *     + converted_at + `signup_completed` event).
 *   - Log later-stage funnel events (`first_consent_signed`,
 *     `first_deal_signed`). The call sites for those two events live
 *     in the consent + deal flows — this service exposes the API;
 *     wiring the call sites is a separate TODO pass (see bottom of
 *     this file).
 *
 * Fail-closed semantics
 * ─────────────────────
 *   Every function in here returns null / undefined on the unhappy
 *   path rather than throwing. Signup + consent paths MUST NOT fail
 *   because referral attribution errored — referral is a measurement
 *   layer, not a gate.
 *
 * Server-only
 * ───────────
 *   All writes go through the service-role client. The service-role
 *   key must never reach the browser, so every entry point here is
 *   only callable from API routes / Server Components.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { sendPushToUser } from '@/lib/push/sender';

// ---------------------------------------------------------------------------
// Service-role client (server-only)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Code generation
// ---------------------------------------------------------------------------

/**
 * URL-safe base62 alphabet, ambiguous-character-free.
 * Dropped: 0 O 1 l I to avoid the "did you mean O or 0?" support
 * tickets when parents read the code over the phone.
 */
const BASE62 = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generate an 8-character URL-safe slug. Cryptographically random
 * — not sequential, not guessable from the user id.
 */
export function generateReferralCode(length = 8): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += BASE62[bytes[i] % BASE62.length];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReferralUserRole = 'hs_parent' | 'hs_athlete';
export type ReferralSignupRole = 'hs_parent' | 'hs_athlete' | 'hs_brand';

export type ReferralFunnelEvent =
  | 'code_clicked'
  | 'signup_started'
  | 'signup_completed'
  | 'first_consent_signed'
  | 'first_deal_signed';

export interface UserReferralCodeRow {
  user_id: string;
  code: string;
  role: ReferralUserRole;
  created_at: string;
  disabled_at: string | null;
}

export interface ReferralAttributionRow {
  id: string;
  referring_user_id: string;
  referred_user_id: string | null;
  referred_email: string | null;
  role_signed_up_as: ReferralSignupRole | null;
  referral_code: string;
  converted_at: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Code creation / retrieval
// ---------------------------------------------------------------------------

/**
 * Get the caller's referral code, generating one on first access.
 * Idempotent: always returns the same code for the same user. Retries
 * up to 5 times on unique-violation to recover from 8-char collision
 * races (astronomically rare but possible).
 */
export async function getOrCreateCodeForUser(args: {
  userId: string;
  role: ReferralUserRole;
}): Promise<UserReferralCodeRow> {
  const { userId, role } = args;
  const supabase = getServiceRoleClient();

  // Fast path: row already exists.
  const existing = await supabase
    .from('user_referral_codes')
    .select('user_id, code, role, created_at, disabled_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing.data) {
    return existing.data as UserReferralCodeRow;
  }

  // Try up to 5 times to land a unique code. 8-char base62 has 2.18e14
  // keyspace; collisions are overwhelmingly unlikely, but the loop is
  // cheap insurance.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode(8);
    const { data, error } = await supabase
      .from('user_referral_codes')
      .insert({ user_id: userId, code, role })
      .select('user_id, code, role, created_at, disabled_at')
      .single();

    if (data) {
      return data as UserReferralCodeRow;
    }

    // Unique violation — either another request beat us to it for the
    // same user_id (in which case re-read), or the code collided with
    // another user's. Either way, try again.
    if (error && /duplicate|unique/i.test(error.message)) {
      const reread = await supabase
        .from('user_referral_codes')
        .select('user_id, code, role, created_at, disabled_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (reread.data) {
        return reread.data as UserReferralCodeRow;
      }
      continue;
    }

    throw new Error(
      `getOrCreateCodeForUser: insert failed: ${error?.message ?? 'unknown error'}`
    );
  }

  throw new Error(
    'getOrCreateCodeForUser: could not allocate a unique code after 5 attempts.'
  );
}

/**
 * Look up the referring user for a given code. Only returns a row if
 * the code is active (disabled_at IS NULL). Used by the click-capture
 * path to validate the `?ref=CODE` param.
 */
export async function resolveCode(
  code: string
): Promise<UserReferralCodeRow | null> {
  if (!code || !/^[A-Za-z0-9]{6,24}$/.test(code)) return null;
  const supabase = getServiceRoleClient();
  const { data } = await supabase
    .from('user_referral_codes')
    .select('user_id, code, role, created_at, disabled_at')
    .eq('code', code)
    .is('disabled_at', null)
    .maybeSingle();
  return (data as UserReferralCodeRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Click capture
// ---------------------------------------------------------------------------

export interface RecordReferralClickInput {
  code: string;
  /** Caller's user id, if authenticated. Anonymous clicks are the common case. */
  viewerUserId?: string | null;
  /** Optional analytics payload (utm_source, utm_campaign, path). */
  metadata?: Record<string, unknown>;
}

export interface RecordReferralClickResult {
  attributionId: string;
  referringUserId: string;
  code: string;
  clickedAt: string;
}

/**
 * Record a click on `/hs?ref=CODE`. Creates an attributions row with
 * referred_user_id NULL plus a `code_clicked` event.
 *
 * Self-referral guard: if the viewer is already signed in AND the
 * code belongs to them, no-op. We still don't throw — the caller
 * sets a cookie anyway, we just don't pollute the funnel with
 * self-clicks.
 *
 * Returns null on any failure (unknown code, self-click, DB hiccup)
 * so the caller can gracefully continue.
 */
export async function recordReferralClick(
  input: RecordReferralClickInput
): Promise<RecordReferralClickResult | null> {
  const { code, viewerUserId, metadata = {} } = input;
  const resolved = await resolveCode(code);
  if (!resolved) return null;
  if (viewerUserId && viewerUserId === resolved.user_id) return null;

  const supabase = getServiceRoleClient();

  const insert = await supabase
    .from('referral_attributions')
    .insert({
      referring_user_id: resolved.user_id,
      referral_code: resolved.code,
      metadata,
    })
    .select('id, created_at')
    .single();

  if (insert.error || !insert.data) {
    // eslint-disable-next-line no-console
    console.warn('[hs-referrals] click insert failed', insert.error);
    return null;
  }

  const attributionId = insert.data.id as string;

  // Best-effort funnel event. Not critical if it fails — the
  // attributions row already captured the timestamp.
  await supabase.from('referral_conversion_events').insert({
    referral_attribution_id: attributionId,
    event_type: 'code_clicked',
    metadata,
  });

  return {
    attributionId,
    referringUserId: resolved.user_id,
    code: resolved.code,
    clickedAt: insert.data.created_at as string,
  };
}

// ---------------------------------------------------------------------------
// Signup attribution
// ---------------------------------------------------------------------------

export interface AttributeSignupInput {
  attributionId: string;
  referredUserId: string;
  referredEmail: string | null;
  roleSignedUpAs: ReferralSignupRole;
}

export interface AttributeSignupResult {
  attributionId: string;
  referringUserId: string;
  referredUserId: string;
  roleSignedUpAs: ReferralSignupRole;
  convertedAt: string;
}

/**
 * Tie an already-logged attribution row to the user who just signed
 * up. Called from /api/hs/referrals/attribute after the signup flow
 * completes. Idempotent: if already converted, returns the existing
 * conversion.
 *
 * Returns null if the attribution row doesn't exist, or if it's
 * already tied to a different user — whatever happens, the signup
 * continues successfully.
 */
export async function attributeSignup(
  input: AttributeSignupInput
): Promise<AttributeSignupResult | null> {
  const { attributionId, referredUserId, referredEmail, roleSignedUpAs } = input;
  const supabase = getServiceRoleClient();

  const existing = await supabase
    .from('referral_attributions')
    .select('id, referring_user_id, referred_user_id, converted_at')
    .eq('id', attributionId)
    .maybeSingle();

  if (!existing.data) return null;

  // Idempotency: already pointed at this user → re-return, skip write.
  if (
    existing.data.referred_user_id === referredUserId &&
    existing.data.converted_at
  ) {
    return {
      attributionId,
      referringUserId: existing.data.referring_user_id as string,
      referredUserId,
      roleSignedUpAs,
      convertedAt: existing.data.converted_at as string,
    };
  }

  // Already attributed to a different user — first-touch wins, don't
  // overwrite. Clear signal the cookie survived longer than it should
  // have; we log and bail.
  if (
    existing.data.referred_user_id &&
    existing.data.referred_user_id !== referredUserId
  ) {
    // eslint-disable-next-line no-console
    console.warn('[hs-referrals] attribution already claimed', {
      attributionId,
      existing: existing.data.referred_user_id,
      attempted: referredUserId,
    });
    return null;
  }

  // Guard self-referral at the write site too. Cookie could be forged.
  if (existing.data.referring_user_id === referredUserId) return null;

  const now = new Date().toISOString();

  const update = await supabase
    .from('referral_attributions')
    .update({
      referred_user_id: referredUserId,
      referred_email: referredEmail,
      role_signed_up_as: roleSignedUpAs,
      converted_at: now,
    })
    .eq('id', attributionId)
    // Only flip a row whose referred_user_id is still NULL, so the
    // unique constraint on referred_user_id can't collide.
    .is('referred_user_id', null)
    .select('id, referring_user_id')
    .maybeSingle();

  if (update.error || !update.data) {
    // eslint-disable-next-line no-console
    console.warn('[hs-referrals] attribution update failed', update.error);
    return null;
  }

  await supabase.from('referral_conversion_events').insert({
    referral_attribution_id: attributionId,
    event_type: 'signup_completed',
    metadata: { role: roleSignedUpAs },
  });

  const referringUserId = update.data.referring_user_id as string;

  // Notify the referrer. Preference gating + fail-soft handled by
  // sendPushToUser — wrap in try/catch so a push outage never kills
  // the signup attribution.
  try {
    const referredFirstName = await resolveFirstName(supabase, referredUserId);
    await sendPushToUser({
      userId: referringUserId,
      notificationType: 'referral_milestone',
      title: 'Your invite just joined GradeUp HS.',
      body: `${referredFirstName} signed up — thanks for spreading the word.`,
      url: '/hs/parent/referrals',
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-referrals] signup push failed', {
      referringUserId,
      referredUserId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return {
    attributionId,
    referringUserId,
    referredUserId,
    roleSignedUpAs,
    convertedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Best-effort first-name lookup for push body copy. Checks the
 * `profiles` table; falls back to a neutral short string so notifications
 * never leak empty placeholders. Never throws.
 */
async function resolveFirstName(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', userId)
      .maybeSingle();
    const first = (data?.first_name ?? '').toString().trim();
    return first || 'Your invite';
  } catch {
    return 'Your invite';
  }
}

// ---------------------------------------------------------------------------
// Later-funnel event recording
// ---------------------------------------------------------------------------

/**
 * Record a funnel milestone for an already-attributed user. The
 * attribution row is looked up by referred_user_id (which is unique).
 *
 * TODOs for call-site wiring:
 *
 *   - `first_consent_signed`:
 *      In `src/lib/hs-nil/consent-provider.ts`, inside the
 *      `recordSignature` path, after the signature row commits, call:
 *          await recordFunnelEvent({
 *            referredUserId: athlete_user_id,
 *            eventType: 'first_consent_signed',
 *          });
 *      (Best-effort; must not throw into the consent flow.)
 *
 *   - `first_deal_signed`:
 *      In `src/app/api/contracts/[id]/route.ts` `handleSign`, when
 *      the deal transitions to `fully_signed`, call the same helper
 *      with `eventType: 'first_deal_signed'`. Confirm we haven't
 *      already recorded this event for this user (the helper
 *      short-circuits on duplicate, so safe to call unconditionally).
 *
 * Neither of these call sites exists yet — this module is intentionally
 * kept pluggable so the eventual wire-up is a one-liner.
 */
export async function recordFunnelEvent(args: {
  referredUserId: string;
  eventType: ReferralFunnelEvent;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  const { referredUserId, eventType, metadata = {} } = args;
  const supabase = getServiceRoleClient();

  const attr = await supabase
    .from('referral_attributions')
    .select('id, referring_user_id')
    .eq('referred_user_id', referredUserId)
    .maybeSingle();

  if (!attr.data) return false;
  const attributionId = attr.data.id as string;
  const referringUserId = (attr.data.referring_user_id as string) ?? null;

  // Avoid duplicate milestones. We allow multiple `code_clicked` rows
  // (those are per-click) but not `first_*` ones.
  if (
    eventType === 'first_consent_signed' ||
    eventType === 'first_deal_signed'
  ) {
    const priors = await supabase
      .from('referral_conversion_events')
      .select('id')
      .eq('referral_attribution_id', attributionId)
      .eq('event_type', eventType)
      .limit(1);
    if (priors.data && priors.data.length > 0) return false;
  }

  const insert = await supabase
    .from('referral_conversion_events')
    .insert({
      referral_attribution_id: attributionId,
      event_type: eventType,
      metadata,
    });

  if (insert.error) {
    // eslint-disable-next-line no-console
    console.warn('[hs-referrals] funnel event insert failed', insert.error);
    return false;
  }

  // Push the referrer on milestone events. The helper short-circuits
  // on duplicate first_* events above, so this only fires once per
  // milestone per referred user. No-op if the signup wasn't referred
  // (in which case we would have returned early with !attr.data).
  if (
    referringUserId &&
    (eventType === 'first_consent_signed' || eventType === 'first_deal_signed')
  ) {
    try {
      const referredFirstName = await resolveFirstName(supabase, referredUserId);
      const title =
        eventType === 'first_consent_signed'
          ? `${referredFirstName} just signed parental consent.`
          : `${referredFirstName} signed their first NIL deal.`;
      await sendPushToUser({
        userId: referringUserId,
        notificationType: 'referral_milestone',
        title,
        body: 'Thanks for spreading the word — your invite is making moves.',
        url: '/hs/parent/referrals',
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[hs-referrals] milestone push failed', {
        referringUserId,
        referredUserId,
        eventType,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Reporting helpers (dashboards + leaderboard)
// ---------------------------------------------------------------------------

export interface ReferrerFunnelStats {
  referringUserId: string;
  clicks: number;
  signupsCompleted: number;
  consentsSigned: number;
  firstDealsSigned: number;
}

/**
 * Compute a single user's funnel stats. Cheap — driven by aggregates
 * on the two events-adjacent tables.
 */
export async function getFunnelStatsForUser(
  userId: string
): Promise<ReferrerFunnelStats> {
  const supabase = getServiceRoleClient();

  const { data: attributions } = await supabase
    .from('referral_attributions')
    .select('id, converted_at')
    .eq('referring_user_id', userId);

  const list = (attributions ?? []) as Array<{
    id: string;
    converted_at: string | null;
  }>;
  const clicks = list.length;
  const signupsCompleted = list.filter((r) => r.converted_at !== null).length;

  let consentsSigned = 0;
  let firstDealsSigned = 0;

  if (list.length > 0) {
    const ids = list.map((r) => r.id);
    const { data: events } = await supabase
      .from('referral_conversion_events')
      .select('event_type')
      .in('referral_attribution_id', ids)
      .in('event_type', ['first_consent_signed', 'first_deal_signed']);

    for (const ev of (events ?? []) as Array<{ event_type: string }>) {
      if (ev.event_type === 'first_consent_signed') consentsSigned += 1;
      if (ev.event_type === 'first_deal_signed') firstDealsSigned += 1;
    }
  }

  return {
    referringUserId: userId,
    clicks,
    signupsCompleted,
    consentsSigned,
    firstDealsSigned,
  };
}

export interface LeaderboardEntry {
  referringUserId: string;
  firstName: string | null;
  lastName: string | null;
  signupsCompleted: number;
  totalClicks: number;
}

/**
 * Top N referrers by converted signups. Used by the admin leaderboard
 * and (masked) by the parent-facing leaderboard.
 */
export async function getLeaderboard(
  limit = 10
): Promise<LeaderboardEntry[]> {
  const supabase = getServiceRoleClient();

  const { data: attributions } = await supabase
    .from('referral_attributions')
    .select('referring_user_id, referred_user_id');

  const list = (attributions ?? []) as Array<{
    referring_user_id: string;
    referred_user_id: string | null;
  }>;

  // In-memory rollup — the pilot's volume is tiny. A SQL view is the
  // v2 optimization once we have 1k+ referrers.
  const rollup = new Map<
    string,
    { referringUserId: string; signupsCompleted: number; totalClicks: number }
  >();

  for (const row of list) {
    const entry = rollup.get(row.referring_user_id) ?? {
      referringUserId: row.referring_user_id,
      signupsCompleted: 0,
      totalClicks: 0,
    };
    entry.totalClicks += 1;
    if (row.referred_user_id) entry.signupsCompleted += 1;
    rollup.set(row.referring_user_id, entry);
  }

  const sorted = Array.from(rollup.values())
    .sort((a, b) => {
      if (b.signupsCompleted !== a.signupsCompleted) {
        return b.signupsCompleted - a.signupsCompleted;
      }
      return b.totalClicks - a.totalClicks;
    })
    .slice(0, limit);

  // Hydrate names via profiles.
  if (sorted.length === 0) return [];
  const ids = sorted.map((r) => r.referringUserId);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', ids);

  const nameById = new Map<
    string,
    { first_name: string | null; last_name: string | null }
  >();
  for (const p of (profiles ?? []) as Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
  }>) {
    nameById.set(p.id, { first_name: p.first_name, last_name: p.last_name });
  }

  return sorted.map((s) => {
    const n = nameById.get(s.referringUserId);
    return {
      referringUserId: s.referringUserId,
      firstName: n?.first_name ?? null,
      lastName: n?.last_name ?? null,
      signupsCompleted: s.signupsCompleted,
      totalClicks: s.totalClicks,
    };
  });
}

/**
 * Parent-facing privacy mask: "Maya C." rather than "Maya Chen".
 */
export function maskLastName(
  firstName: string | null,
  lastName: string | null
): string {
  const first = (firstName ?? 'Anonymous').trim() || 'Anonymous';
  const lastInitial = (lastName ?? '').trim().charAt(0);
  return lastInitial ? `${first} ${lastInitial}.` : first;
}
