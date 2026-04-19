/**
 * HS-NIL — Referral Rewards Service
 * ----------------------------------------------------------------------------
 * Phase 11 structural incentive layer on top of the Phase 8/9 referral
 * funnel. Parents who refer verified signups unlock tiered perks:
 *
 *   Tier thresholds (signup_completed events):
 *     bronze   — 3    conversions
 *     silver   — 10   conversions
 *     gold     — 25   conversions
 *     platinum — 50   conversions
 *
 * Perk taxonomy (canonical — keep in sync with migration CHECK):
 *   match_priority_boost_level_1  bronze    +0.3 boost, 90-day TTL
 *   match_priority_boost_level_2  silver    +0.5 boost, permanent
 *   match_priority_boost_level_3  gold      +0.8 boost, permanent
 *   match_priority_boost_level_4  platinum  +1.0 boost, permanent
 *   trajectory_extended_ttl       silver+   +60 days on active shares
 *   waitlist_invite_priority      gold+     front of activation batch
 *   concierge_direct_line         platinum  direct founder access
 *
 * Idempotency
 * ───────────
 *   grantTiersIfEarned() checks actual conversion count, compares to
 *   every tier's minimum, and INSERTs any tier whose grant doesn't
 *   exist. The (user_id, tier_id) UNIQUE constraint means repeat
 *   calls are cheap no-ops. The function is safe to call from
 *   anywhere — referrals.ts attributeSignup, a reconciliation cron,
 *   the admin force-grant route.
 *
 * Wiring TODO (see referrals.ts)
 * ──────────────────────────────
 *   The automatic check-and-grant is NOT yet wired into
 *   attributeSignup() — that edit belongs to the next phase to
 *   avoid merge friction with PUSH-WIRING's recent changes.
 *
 *   TODO: in `src/lib/hs-nil/referrals.ts` attributeSignup(), after
 *   the `signup_completed` event insert succeeds, call:
 *
 *       // Phase 11 referral rewards — check-and-grant tiers.
 *       try {
 *         const { grantTiersIfEarned } = await import('@/lib/hs-nil/referral-rewards');
 *         await grantTiersIfEarned(referringUserId);
 *       } catch (err) {
 *         console.warn('[hs-referrals] grantTiersIfEarned failed', err);
 *       }
 *
 *   (Dynamic import + try/catch preserves the fail-closed semantics
 *   of the signup attribution path — a reward check must never break
 *   signup.)  Until the wire-up lands, the admin force-grant route
 *   and a daily reconciliation cron close the gap.
 *
 * Fail-closed
 * ───────────
 *   All functions swallow transient DB errors rather than throw,
 *   except on explicit "something is fundamentally wrong" cases
 *   (service-role missing). Callers treat null / false / empty
 *   array as "no reward this time" and proceed.
 *
 * Server-only — every entry point uses the service-role client.
 */

import {
  createClient as createServiceClient,
  type SupabaseClient,
} from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RewardTierId = 'bronze' | 'silver' | 'gold' | 'platinum';

export type PerkName =
  | 'match_priority_boost_level_1'
  | 'match_priority_boost_level_2'
  | 'match_priority_boost_level_3'
  | 'match_priority_boost_level_4'
  | 'trajectory_extended_ttl'
  | 'waitlist_invite_priority'
  | 'concierge_direct_line';

export interface RewardTier {
  id: RewardTierId;
  tierName: string;
  minConversions: number;
  perks: PerkName[];
  displayOrder: number;
  badgeIconHint: string;
  description: string;
}

export interface RewardGrant {
  id: string;
  userId: string;
  tierId: RewardTierId;
  awardedAt: string;
  awardedBy: string;
  conversionCountAtAward: number;
  metadata: Record<string, unknown>;
}

export interface PerkActivation {
  id: string;
  grantId: string;
  perkName: PerkName;
  activatedAt: string;
  expiresAt: string | null;
  metadata: Record<string, unknown>;
}

export interface UserRewardSummary {
  currentTier: RewardTier | null;
  nextTier: RewardTier | null;
  conversionCount: number;
  grants: RewardGrant[];
  activePerks: PerkActivation[];
}

// ---------------------------------------------------------------------------
// Tier ladder — mirrors the seed in 20260419_011_referral_rewards.sql
// ---------------------------------------------------------------------------
// Single source of truth for default perks when we INSERT a grant row.
// Read paths hydrate from the DB, but the write path needs a local
// reference so we don't round-trip to read the tier config just to
// figure out which perks to activate.

const TIER_LADDER: RewardTier[] = [
  {
    id: 'bronze',
    tierName: 'Bronze Referrer',
    minConversions: 3,
    perks: ['match_priority_boost_level_1'],
    displayOrder: 1,
    badgeIconHint: 'medal_bronze',
    description:
      '3 families joined. Your athletes get a 90-day boost on brand match rankings.',
  },
  {
    id: 'silver',
    tierName: 'Silver Referrer',
    minConversions: 10,
    perks: ['match_priority_boost_level_2', 'trajectory_extended_ttl'],
    displayOrder: 2,
    badgeIconHint: 'medal_silver',
    description:
      '10 families joined. Permanent match-ranker boost and +60 days on every trajectory share.',
  },
  {
    id: 'gold',
    tierName: 'Gold Referrer',
    minConversions: 25,
    perks: [
      'match_priority_boost_level_3',
      'trajectory_extended_ttl',
      'waitlist_invite_priority',
    ],
    displayOrder: 3,
    badgeIconHint: 'medal_gold',
    description:
      '25 families joined. Top-of-batch activation, stronger boost, extended shares.',
  },
  {
    id: 'platinum',
    tierName: 'Platinum Referrer',
    minConversions: 50,
    perks: [
      'match_priority_boost_level_4',
      'trajectory_extended_ttl',
      'waitlist_invite_priority',
      'concierge_direct_line',
    ],
    displayOrder: 4,
    badgeIconHint: 'medal_platinum',
    description:
      '50 families joined. Maximum match-ranker boost, priority, and direct founder access.',
  },
];

/** Per-perk default TTL in days. null = permanent. */
const PERK_TTL_DAYS: Record<PerkName, number | null> = {
  match_priority_boost_level_1: 90,
  match_priority_boost_level_2: null,
  match_priority_boost_level_3: null,
  match_priority_boost_level_4: null,
  trajectory_extended_ttl: null,
  waitlist_invite_priority: null,
  concierge_direct_line: null,
};

/**
 * Magnitude of each match-priority-boost level. Keep in sync with the
 * values encoded inside athlete_referral_priority_boost view.
 */
const BOOST_MAGNITUDE: Record<PerkName, number> = {
  match_priority_boost_level_1: 0.3,
  match_priority_boost_level_2: 0.5,
  match_priority_boost_level_3: 0.8,
  match_priority_boost_level_4: 1.0,
  trajectory_extended_ttl: 0,
  waitlist_invite_priority: 0,
  concierge_direct_line: 0,
};

export function getRewardTierLadder(): readonly RewardTier[] {
  return TIER_LADDER;
}

// ---------------------------------------------------------------------------
// Service-role client
// ---------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase service role not configured (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// Conversion count + current tier
// ---------------------------------------------------------------------------

/**
 * Count signup_completed events belonging to this user's attributions.
 * This is the canonical "verified conversions" metric the tier ladder
 * keys off.
 */
export async function countVerifiedConversions(
  userId: string
): Promise<number> {
  const sb = getServiceRoleClient();

  const { data: attrs, error: attrErr } = await sb
    .from('referral_attributions')
    .select('id')
    .eq('referring_user_id', userId)
    .not('referred_user_id', 'is', null);

  if (attrErr || !attrs) return 0;
  if (attrs.length === 0) return 0;

  const ids = (attrs as Array<{ id: string }>).map((r) => r.id);

  const { count } = await sb
    .from('referral_conversion_events')
    .select('id', { count: 'exact', head: true })
    .in('referral_attribution_id', ids)
    .eq('event_type', 'signup_completed');

  return count ?? 0;
}

/**
 * Highest tier the user currently qualifies for purely based on
 * verified conversions. Does NOT check whether the grant row exists —
 * this is the pre-grant calculation.
 */
export async function computeCurrentTier(
  userId: string
): Promise<{ tier: RewardTier | null; conversionCount: number; nextTier: RewardTier | null }> {
  const conversionCount = await countVerifiedConversions(userId);

  let tier: RewardTier | null = null;
  let nextTier: RewardTier | null = null;
  for (const t of TIER_LADDER) {
    if (conversionCount >= t.minConversions) {
      tier = t;
    } else if (!nextTier) {
      nextTier = t;
    }
  }
  return { tier, conversionCount, nextTier };
}

// ---------------------------------------------------------------------------
// Grant issuance
// ---------------------------------------------------------------------------

interface GrantRow {
  id: string;
  user_id: string;
  tier_id: string;
  awarded_at: string;
  awarded_by: string;
  conversion_count_at_award: number;
  metadata: Record<string, unknown> | null;
}

function mapGrant(row: GrantRow): RewardGrant {
  return {
    id: row.id,
    userId: row.user_id,
    tierId: row.tier_id as RewardTierId,
    awardedAt: row.awarded_at,
    awardedBy: row.awarded_by,
    conversionCountAtAward: row.conversion_count_at_award,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

interface PerkRow {
  id: string;
  grant_id: string;
  perk_name: string;
  activated_at: string;
  expires_at: string | null;
  metadata: Record<string, unknown> | null;
}

function mapPerk(row: PerkRow): PerkActivation {
  return {
    id: row.id,
    grantId: row.grant_id,
    perkName: row.perk_name as PerkName,
    activatedAt: row.activated_at,
    expiresAt: row.expires_at,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

/**
 * Idempotent grant issuance. For each tier whose minimum is reached,
 * ensures a grant row exists AND its default perks are activated.
 *
 * Returns the set of tiers newly granted in this call (empty if the
 * user was already at or above their earned position). Callers that
 * want to fire welcome emails inspect the return value.
 */
export async function grantTiersIfEarned(
  userId: string,
  opts: { awardedBy?: string; reason?: string } = {}
): Promise<{
  newlyGranted: RewardGrant[];
  newlyActivatedPerks: PerkActivation[];
  conversionCount: number;
  currentTier: RewardTier | null;
}> {
  const sb = getServiceRoleClient();
  const { tier: currentTier, conversionCount } = await computeCurrentTier(userId);

  if (!currentTier) {
    return {
      newlyGranted: [],
      newlyActivatedPerks: [],
      conversionCount,
      currentTier: null,
    };
  }

  // Pull any existing grants for this user so we can skip known tiers.
  const { data: existingRows } = await sb
    .from('referral_reward_grants')
    .select(
      'id, user_id, tier_id, awarded_at, awarded_by, conversion_count_at_award, metadata'
    )
    .eq('user_id', userId);

  const existing = new Set<string>(
    ((existingRows as GrantRow[] | null) ?? []).map((r) => r.tier_id)
  );

  const eligibleTiers = TIER_LADDER.filter(
    (t) => conversionCount >= t.minConversions && !existing.has(t.id)
  );

  if (eligibleTiers.length === 0) {
    return {
      newlyGranted: [],
      newlyActivatedPerks: [],
      conversionCount,
      currentTier,
    };
  }

  const newlyGranted: RewardGrant[] = [];
  const newlyActivatedPerks: PerkActivation[] = [];

  for (const tier of eligibleTiers) {
    const { data: inserted, error: insertErr } = await sb
      .from('referral_reward_grants')
      .insert({
        user_id: userId,
        tier_id: tier.id,
        awarded_by: opts.awardedBy ?? 'system',
        conversion_count_at_award: conversionCount,
        metadata: {
          reason: opts.reason ?? 'auto_grant_from_conversions',
          tierName: tier.tierName,
        },
      })
      .select(
        'id, user_id, tier_id, awarded_at, awarded_by, conversion_count_at_award, metadata'
      )
      .single<GrantRow>();

    if (insertErr || !inserted) {
      // Likely a race with another call — the UNIQUE (user_id, tier_id)
      // constraint fired. Not a failure; continue.
      // eslint-disable-next-line no-console
      console.warn('[referral-rewards] grant insert failed', {
        userId,
        tierId: tier.id,
        error: insertErr?.message,
      });
      continue;
    }

    const grant = mapGrant(inserted);
    newlyGranted.push(grant);

    // Activate the tier's default perks. Each activate is independent;
    // a partial failure of one perk doesn't roll back the grant.
    for (const perk of tier.perks) {
      const activated = await activatePerk({
        grantId: grant.id,
        perkName: perk,
      });
      if (activated) newlyActivatedPerks.push(activated);
    }
  }

  return {
    newlyGranted,
    newlyActivatedPerks,
    conversionCount,
    currentTier,
  };
}

// ---------------------------------------------------------------------------
// Perk activations
// ---------------------------------------------------------------------------

export interface ActivatePerkInput {
  grantId: string;
  perkName: PerkName;
  /** Override the perk's default TTL. null = permanent. */
  durationDays?: number | null;
  metadata?: Record<string, unknown>;
}

export async function activatePerk(
  input: ActivatePerkInput
): Promise<PerkActivation | null> {
  const sb = getServiceRoleClient();

  const ttlDays =
    input.durationDays !== undefined
      ? input.durationDays
      : PERK_TTL_DAYS[input.perkName] ?? null;

  const expiresAt =
    ttlDays !== null && ttlDays > 0
      ? new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const { data, error } = await sb
    .from('referral_perk_activations')
    .insert({
      grant_id: input.grantId,
      perk_name: input.perkName,
      expires_at: expiresAt,
      metadata: input.metadata ?? {},
    })
    .select('id, grant_id, perk_name, activated_at, expires_at, metadata')
    .single<PerkRow>();

  if (error || !data) {
    // eslint-disable-next-line no-console
    console.warn('[referral-rewards] activatePerk failed', {
      grantId: input.grantId,
      perkName: input.perkName,
      error: error?.message,
    });
    return null;
  }

  return mapPerk(data);
}

/**
 * Returns the caller's active (non-expired) perk rows, joined to
 * their grants so the UI can show "Perk X, activated via your Gold
 * tier".
 */
export async function getActivePerksForUser(
  userId: string
): Promise<PerkActivation[]> {
  const sb = getServiceRoleClient();

  const { data: grants } = await sb
    .from('referral_reward_grants')
    .select('id')
    .eq('user_id', userId);

  const grantIds = ((grants as Array<{ id: string }> | null) ?? []).map(
    (r) => r.id
  );
  if (grantIds.length === 0) return [];

  const nowIso = new Date().toISOString();
  const { data: perks } = await sb
    .from('referral_perk_activations')
    .select('id, grant_id, perk_name, activated_at, expires_at, metadata')
    .in('grant_id', grantIds)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order('activated_at', { ascending: false });

  return ((perks as PerkRow[] | null) ?? []).map(mapPerk);
}

// ---------------------------------------------------------------------------
// Summary + rewards overview
// ---------------------------------------------------------------------------

export async function getUserRewardSummary(
  userId: string
): Promise<UserRewardSummary> {
  const sb = getServiceRoleClient();

  const [{ tier, nextTier, conversionCount }, grantsRes, activePerks] =
    await Promise.all([
      computeCurrentTier(userId),
      sb
        .from('referral_reward_grants')
        .select(
          'id, user_id, tier_id, awarded_at, awarded_by, conversion_count_at_award, metadata'
        )
        .eq('user_id', userId)
        .order('awarded_at', { ascending: false }),
      getActivePerksForUser(userId),
    ]);

  const grants = ((grantsRes.data as GrantRow[] | null) ?? []).map(mapGrant);

  return {
    currentTier: tier,
    nextTier,
    conversionCount,
    grants,
    activePerks,
  };
}

// ---------------------------------------------------------------------------
// Parent→athlete linkage helpers
// ---------------------------------------------------------------------------

/**
 * Resolves verified athlete user_ids a given parent is linked to.
 * Used by priority-boost resolution + trajectory extend perks.
 */
export async function getLinkedAthletesForParent(
  parentUserId: string
): Promise<string[]> {
  const sb = getServiceRoleClient();

  const { data: profile } = await sb
    .from('hs_parent_profiles')
    .select('id')
    .eq('user_id', parentUserId)
    .maybeSingle<{ id: string }>();

  if (!profile) return [];

  const { data: links } = await sb
    .from('hs_parent_athlete_links')
    .select('athlete_user_id, verified_at')
    .eq('parent_profile_id', profile.id)
    .not('verified_at', 'is', null);

  return ((links as Array<{ athlete_user_id: string }> | null) ?? []).map(
    (r) => r.athlete_user_id
  );
}

/**
 * Computes the effective priority boost for a given athlete —
 * summed across all linked parents' active priority-boost perks,
 * clamped at 1.0.
 *
 * This duplicates the SQL view's logic in application code so we
 * have a callable path outside the RPC (e.g. admin debugging,
 * preview renders of "what boost would this athlete get"). The RPC
 * is the authoritative path during ranking.
 */
export async function getReferralPriorityBoostForAthlete(
  athleteUserId: string
): Promise<number> {
  const sb = getServiceRoleClient();

  const { data: links } = await sb
    .from('hs_parent_athlete_links')
    .select('parent_profile_id, verified_at')
    .eq('athlete_user_id', athleteUserId)
    .not('verified_at', 'is', null);

  const linkRows = (links as Array<{ parent_profile_id: string }> | null) ?? [];
  if (linkRows.length === 0) return 0;

  const profileIds = linkRows.map((r) => r.parent_profile_id);
  const { data: profiles } = await sb
    .from('hs_parent_profiles')
    .select('id, user_id')
    .in('id', profileIds);

  const parentUserIds = (
    (profiles as Array<{ id: string; user_id: string }> | null) ?? []
  ).map((r) => r.user_id);
  if (parentUserIds.length === 0) return 0;

  // Pull all active priority-boost perks across these parents' grants.
  const { data: grantRows } = await sb
    .from('referral_reward_grants')
    .select('id, user_id')
    .in('user_id', parentUserIds);

  const grantIds = (
    (grantRows as Array<{ id: string; user_id: string }> | null) ?? []
  ).map((r) => r.id);
  if (grantIds.length === 0) return 0;

  const nowIso = new Date().toISOString();
  const { data: perks } = await sb
    .from('referral_perk_activations')
    .select('perk_name, expires_at')
    .in('grant_id', grantIds)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

  let total = 0;
  for (const p of (perks as Array<{ perk_name: string; expires_at: string | null }> | null) ?? []) {
    const mag = BOOST_MAGNITUDE[p.perk_name as PerkName] ?? 0;
    total += mag;
  }
  return Math.min(1.0, total);
}

// ---------------------------------------------------------------------------
// Trajectory-share TTL extension perk
// ---------------------------------------------------------------------------

/**
 * Redeem the trajectory_extended_ttl perk: for every linked athlete's
 * active (non-revoked) trajectory share, push expires_at forward by
 * extraDays. Shares currently set to "permanent" (expires_at IS NULL)
 * are left as-is — there's nothing to extend on a permanent share.
 *
 * Returns the count of share rows updated.
 */
export async function extendTrajectoryShareForUser(
  userId: string,
  extraDays: number
): Promise<{ sharesExtended: number; athleteUserIds: string[] }> {
  if (!Number.isFinite(extraDays) || extraDays <= 0) {
    return { sharesExtended: 0, athleteUserIds: [] };
  }

  const athleteUserIds = await getLinkedAthletesForParent(userId);
  if (athleteUserIds.length === 0) {
    return { sharesExtended: 0, athleteUserIds: [] };
  }

  const sb = getServiceRoleClient();
  const { data: shares } = await sb
    .from('hs_athlete_trajectory_shares')
    .select('id, expires_at, revoked_at')
    .in('athlete_user_id', athleteUserIds)
    .is('revoked_at', null)
    .not('expires_at', 'is', null);

  const rows =
    (shares as Array<{
      id: string;
      expires_at: string | null;
      revoked_at: string | null;
    }> | null) ?? [];
  if (rows.length === 0) {
    return { sharesExtended: 0, athleteUserIds };
  }

  const extendMs = extraDays * 24 * 60 * 60 * 1000;
  let updated = 0;
  for (const r of rows) {
    if (!r.expires_at) continue;
    const newExpiry = new Date(
      new Date(r.expires_at).getTime() + extendMs
    ).toISOString();
    const { error } = await sb
      .from('hs_athlete_trajectory_shares')
      .update({ expires_at: newExpiry })
      .eq('id', r.id);
    if (!error) updated += 1;
  }

  return { sharesExtended: updated, athleteUserIds };
}

// ---------------------------------------------------------------------------
// Leaderboard enrichment — tier-badge lookup
// ---------------------------------------------------------------------------

/**
 * Returns the highest-ordered tier each user currently holds, keyed
 * by user_id. Used by ReferralLeaderboard to show tier badges next
 * to each row without N round trips.
 */
export async function getTopTierByUser(
  userIds: string[]
): Promise<Map<string, RewardTierId>> {
  const map = new Map<string, RewardTierId>();
  if (userIds.length === 0) return map;

  const sb = getServiceRoleClient();
  const { data } = await sb
    .from('referral_reward_grants')
    .select('user_id, tier_id')
    .in('user_id', userIds);

  const rows = (data as Array<{ user_id: string; tier_id: string }> | null) ?? [];

  const priority: Record<RewardTierId, number> = {
    bronze: 1,
    silver: 2,
    gold: 3,
    platinum: 4,
  };

  for (const r of rows) {
    const tid = r.tier_id as RewardTierId;
    if (!priority[tid]) continue;
    const current = map.get(r.user_id);
    if (!current || priority[tid] > priority[current]) {
      map.set(r.user_id, tid);
    }
  }

  return map;
}
