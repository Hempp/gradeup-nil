/**
 * HS-NIL Campaign Service
 * ----------------------------------------------------------------------------
 * Multi-athlete campaign surface — the GradeUp counter to NIL Club's
 * one-brand → 150-athletes pattern. Campaigns sit above `deals`: brand
 * publishes ONE brief, up to `max_athletes` individual deals get spawned
 * through the normal HS-NIL compliance path (state rules, parental
 * consent scope, disclosure pipeline).
 *
 * Public entrypoints:
 *
 *   createCampaign({ brandId, fields })
 *     Creates a DRAFT campaign. Runs the state-rule pre-evaluation
 *     described below before writing the row. Returns the created row.
 *
 *   openCampaign({ brandId, campaignId })
 *     Flips draft → open, triggers match-email fan-out. For 'invited_only'
 *     and 'hybrid' campaigns, invitations are expected to already be on
 *     file via inviteAthletes().
 *
 *   closeCampaign({ brandId, campaignId })
 *     Flips open → closed. Athletes with participation status 'applied'
 *     are notified; already-accepted participants keep their deal rows
 *     untouched (the deal is the source of truth for payout, not the
 *     campaign's status).
 *
 *   applyToCampaign({ athleteUserId, campaignId })
 *     Athlete-initiated apply. Runs bracket + state-rule + consent-scope
 *     gates. On consent-gap, returns a structured error with a suggested
 *     scope so the athlete UI can pre-fill a new consent request.
 *
 *   acceptParticipation({ brandId, participationId })
 *     Brand-initiated acceptance. Spawns a deal row via the same
 *     validateDealCreation path used by /api/deals, stamps
 *     deals.hs_campaign_id = campaign.id, updates participation.status →
 *     'active' and participation.individual_deal_id.
 *
 *   rejectParticipation({ brandId, participationId, reason? })
 *     Brand declines an applied athlete. Fires a closed-to-athlete email
 *     so the athlete hears a clear "thanks, not this time".
 *
 *   inviteAthletes({ brandId, campaignId, athleteIds })
 *     For invited_only / hybrid flows. Writes campaign_invitations rows
 *     (capped at campaign.max_athletes total) and fires invitation
 *     emails.
 *
 *   listOpenCampaignsForAthlete(athleteUserId, filters?)
 *     Athlete-facing browse. Filters campaigns by state + consent-scope
 *     coverage. Returns per-campaign consent-fit status so the UI can
 *     pre-highlight "application will require a new consent".
 *
 *   getCampaignPerformance(campaignId)
 *     Reads campaign_performance_summary for the brand dashboard.
 *
 * State-rule pre-evaluation at creation:
 *   For 'open_to_apply' and 'hybrid' campaigns we evaluate against the
 *   MOST RESTRICTIVE pilot state among campaign.target_states — if any
 *   target state would block the category / category type / age floor
 *   for a hypothetical 15-year-old athlete, we reject creation. A brand
 *   that picks CA+TX+NJ learns at creation time that TX's minimumAge=17
 *   rule will screen out younger athletes. This keeps campaigns
 *   aligned with the LEAST-COMMON-DENOMINATOR rule set of their target
 *   list — narrower than per-athlete validation but safer.
 *
 *   'invited_only' campaigns still pre-evaluate the target_states but do
 *   NOT hard-block on age (the brand is hand-picking athletes; minor-age
 *   screening happens per invitee at apply time via validateDealCreation).
 *
 * Consent-scope integration on apply:
 *   campaign.deal_category is constrained to the ConsentScope vocabulary
 *   by the SQL CHECK. On apply we call checkConsentScope with
 *     category          = campaign.deal_category
 *     amount            = campaign.base_compensation_cents / 100
 *     durationMonths    = ceil((timeline_end - timeline_start) / 30)
 *   If not covered → 409 with buildConsentRequestSuggestion() payload.
 *
 * No double-payout risk:
 *   campaign_participations.individual_deal_id is 1:1 — there is exactly
 *   one deal row per accepted participant, and the deal row is the only
 *   thing the payout engine looks at. Rejecting a participant does not
 *   touch deals.
 *
 * Writes go through the service-role client because the RLS on
 * campaign_participations intentionally has NO authenticated INSERT
 * policy — the service enforces the deal-spawn transaction and the
 * consent gate in application code rather than via a trigger.
 */

import {
  createClient as createServiceClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import {
  validateDealCreation,
  checkConsentScope,
  buildConsentRequestSuggestion,
  computeDurationMonths,
} from '@/lib/hs-nil/deal-validation';
import {
  STATE_RULES,
  evaluateDeal,
  type USPSStateCode,
  type BannedCategory,
} from '@/lib/hs-nil/state-rules';
import type { ConsentScope } from '@/lib/hs-nil/consent-provider';
import {
  sendCampaignInvitationToAthlete,
  sendCampaignApplicationReceived,
  sendCampaignAcceptedToAthlete,
  sendCampaignClosedToAthlete,
} from '@/lib/services/hs-nil/campaign-emails';
import { sendPushToUser } from '@/lib/push/sender';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CampaignCompensationType =
  | 'fixed_per_deliverable'
  | 'per_conversion'
  | 'tiered';

export type CampaignAthleteSelection =
  | 'open_to_apply'
  | 'invited_only'
  | 'hybrid';

export type CampaignStatus =
  | 'draft'
  | 'open'
  | 'closed'
  | 'completed'
  | 'cancelled';

export type CampaignDealCategory =
  | 'apparel'
  | 'food_beverage'
  | 'local_business'
  | 'training'
  | 'autograph'
  | 'social_media_promo';

export type ParticipationStatus =
  | 'applied'
  | 'accepted'
  | 'active'
  | 'delivered'
  | 'rejected'
  | 'withdrawn'
  | 'completed';

export interface CampaignRow {
  id: string;
  brand_id: string;
  title: string;
  description: string | null;
  deal_category: CampaignDealCategory;
  compensation_type: CampaignCompensationType;
  base_compensation_cents: number;
  max_athletes: number;
  target_states: string[];
  athlete_selection: CampaignAthleteSelection;
  deliverables_template: string | null;
  timeline_start: string | null;
  timeline_end: string | null;
  status: CampaignStatus;
  requires_parental_consent: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignFields {
  title: string;
  description?: string | null;
  dealCategory: CampaignDealCategory;
  compensationType: CampaignCompensationType;
  baseCompensationCents: number;
  maxAthletes: number;
  targetStates: USPSStateCode[];
  athleteSelection: CampaignAthleteSelection;
  deliverablesTemplate?: string | null;
  timelineStart?: string | null;
  timelineEnd?: string | null;
}

export type CreateCampaignResult =
  | { ok: true; campaign: CampaignRow }
  | {
      ok: false;
      code: 'state_rule_violation' | 'invalid_input';
      violations: string[];
    };

export type ApplyToCampaignResult =
  | { ok: true; participationId: string }
  | {
      ok: false;
      code:
        | 'campaign_not_open'
        | 'campaign_full'
        | 'state_rule_violation'
        | 'consent_scope_gap'
        | 'already_applied'
        | 'not_hs_athlete'
        | 'bracket_mismatch';
      violations?: string[];
      suggestedScope?: ConsentScope;
    };

export type AcceptParticipationResult =
  | { ok: true; dealId: string; participationId: string }
  | {
      ok: false;
      code:
        | 'not_found'
        | 'invalid_state'
        | 'state_rule_violation'
        | 'deal_insert_failed';
      violations?: string[];
    };

// ---------------------------------------------------------------------------
// Service-role client (server-only)
// ---------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil/campaigns] service role not configured ' +
        '(NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// Deal-type bridging
// ---------------------------------------------------------------------------
// The normal `deals` row expects a legacy `deal_type` enum. Our campaigns
// key on the ConsentScope category vocabulary directly. Map the two so
// spawned deals stay typed consistently with single-athlete flows.
// ---------------------------------------------------------------------------

const CATEGORY_TO_DEAL_TYPE: Record<CampaignDealCategory, string> = {
  apparel: 'endorsement',
  food_beverage: 'endorsement',
  local_business: 'appearance',
  training: 'camp',
  autograph: 'autograph',
  social_media_promo: 'social_post',
};

// ---------------------------------------------------------------------------
// State-rule pre-evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a campaign brief against the MOST RESTRICTIVE pilot state in
 * its target_states. We fabricate a worst-case athlete age (15) so
 * campaigns targeting states with minimumAge floors (TX=17) get flagged
 * at creation time rather than at apply time for every minor.
 *
 * For 'invited_only' campaigns we skip the age floor check because the
 * brand is hand-picking athletes — per-athlete validateDealCreation
 * still runs at the accept path.
 */
function preEvaluateCampaignStates(
  fields: CreateCampaignFields,
): { ok: true } | { ok: false; violations: string[] } {
  const violations: string[] = [];
  const rulesCategory: BannedCategory | 'other' = 'other';

  if (fields.targetStates.length === 0) {
    return { ok: false, violations: ['At least one target state is required.'] };
  }

  const checkAge = fields.athleteSelection !== 'invited_only';
  // Worst-case minor age — this matters for TX (minimumAge=17). We pick
  // 15 rather than 14 because the pilot states cap middle-school at
  // grade 8 (≈13–14); a 15-year-old represents the typical HS freshman
  // a campaign is trying to reach.
  const worstAge = checkAge ? 15 : 18;

  for (const state of fields.targetStates) {
    const rules = STATE_RULES[state as USPSStateCode];
    if (!rules) {
      violations.push(`State ${state} is not in the pilot rule set.`);
      continue;
    }
    if (rules.status === 'prohibited') {
      violations.push(`State ${state} prohibits HS NIL.`);
      continue;
    }

    const evalResult = evaluateDeal({
      state: state as USPSStateCode,
      athleteAge: worstAge,
      category: rulesCategory,
      involvesSchoolIP: false,
      isContingentOnPerformance: false,
    });

    if (!evalResult.allowed) {
      for (const v of evalResult.violations) {
        violations.push(`${state}: ${v}`);
      }
    }
  }

  if (violations.length > 0) return { ok: false, violations };
  return { ok: true };
}

/**
 * Does the HS rule set for this campaign require parental consent?
 * All current pilot states require it for minors; the column exists so
 * the brand UI can surface the banner without re-joining state_rules.
 */
function computeRequiresParentalConsent(targetStates: USPSStateCode[]): boolean {
  if (targetStates.length === 0) return true;
  return targetStates.some((s) => STATE_RULES[s]?.requiresParentalConsent);
}

// ---------------------------------------------------------------------------
// createCampaign
// ---------------------------------------------------------------------------

export async function createCampaign(
  input: { brandId: string; fields: CreateCampaignFields },
  sbOverride?: SupabaseClient,
): Promise<CreateCampaignResult> {
  const sb = sbOverride ?? getServiceRoleClient();
  const { brandId, fields } = input;

  if (fields.maxAthletes <= 0 || fields.maxAthletes > 500) {
    return {
      ok: false,
      code: 'invalid_input',
      violations: ['max_athletes must be between 1 and 500.'],
    };
  }
  if (fields.baseCompensationCents < 0) {
    return {
      ok: false,
      code: 'invalid_input',
      violations: ['base_compensation_cents must be non-negative.'],
    };
  }

  // State-rule pre-evaluation against the most restrictive target state.
  const stateEval = preEvaluateCampaignStates(fields);
  if (!stateEval.ok) {
    return {
      ok: false,
      code: 'state_rule_violation',
      violations: stateEval.violations,
    };
  }

  const requiresConsent = computeRequiresParentalConsent(fields.targetStates);

  const { data, error } = await sb
    .from('hs_brand_campaigns')
    .insert({
      brand_id: brandId,
      title: fields.title.trim(),
      description: fields.description?.trim() || null,
      deal_category: fields.dealCategory,
      compensation_type: fields.compensationType,
      base_compensation_cents: Math.round(fields.baseCompensationCents),
      max_athletes: fields.maxAthletes,
      target_states: fields.targetStates,
      athlete_selection: fields.athleteSelection,
      deliverables_template: fields.deliverablesTemplate?.trim() || null,
      timeline_start: fields.timelineStart || null,
      timeline_end: fields.timelineEnd || null,
      status: 'draft',
      requires_parental_consent: requiresConsent,
    })
    .select('*')
    .single();

  if (error || !data) {
    return {
      ok: false,
      code: 'invalid_input',
      violations: [error?.message ?? 'Could not create campaign.'],
    };
  }

  return { ok: true, campaign: data as CampaignRow };
}

// ---------------------------------------------------------------------------
// openCampaign / closeCampaign
// ---------------------------------------------------------------------------

export async function openCampaign(
  input: { brandId: string; campaignId: string },
  sbOverride?: SupabaseClient,
): Promise<{ ok: boolean; error?: string }> {
  const sb = sbOverride ?? getServiceRoleClient();

  const { data: campaign, error } = await sb
    .from('hs_brand_campaigns')
    .update({ status: 'open' })
    .eq('id', input.campaignId)
    .eq('brand_id', input.brandId)
    .eq('status', 'draft')
    .select('*')
    .maybeSingle();

  if (error || !campaign) {
    return { ok: false, error: error?.message ?? 'Campaign not in draft.' };
  }

  // Fan-out candidate emails. Best-effort — an email failure must not
  // roll back the status transition.
  try {
    await fanOutCandidateAlerts(campaign as CampaignRow, sb);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil/campaigns] open fan-out failed', err);
  }

  return { ok: true };
}

export async function closeCampaign(
  input: { brandId: string; campaignId: string },
  sbOverride?: SupabaseClient,
): Promise<{ ok: boolean; error?: string }> {
  const sb = sbOverride ?? getServiceRoleClient();

  const { data: campaign, error } = await sb
    .from('hs_brand_campaigns')
    .update({ status: 'closed' })
    .eq('id', input.campaignId)
    .eq('brand_id', input.brandId)
    .in('status', ['open'])
    .select('*')
    .maybeSingle();

  if (error || !campaign) {
    return { ok: false, error: error?.message ?? 'Campaign not open.' };
  }

  // Notify athletes who applied but never got accepted that the
  // campaign is closed.
  try {
    const { data: applied } = await sb
      .from('campaign_participations')
      .select('athlete_user_id')
      .eq('campaign_id', input.campaignId)
      .eq('status', 'applied');
    const athleteIds = (applied ?? []).map(
      (r: { athlete_user_id: string }) => r.athlete_user_id,
    );
    await notifyApplicantsOfClose(
      campaign as CampaignRow,
      athleteIds,
      sb,
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil/campaigns] close fan-out failed', err);
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// applyToCampaign
// ---------------------------------------------------------------------------

export async function applyToCampaign(
  input: { athleteUserId: string; campaignId: string },
  sbOverride?: SupabaseClient,
): Promise<ApplyToCampaignResult> {
  const sb = sbOverride ?? getServiceRoleClient();

  // Load campaign first — need state + category + compensation.
  const { data: campaignRow } = await sb
    .from('hs_brand_campaigns')
    .select('*')
    .eq('id', input.campaignId)
    .maybeSingle();
  const campaign = (campaignRow as CampaignRow | null) ?? null;

  if (!campaign || campaign.status !== 'open') {
    return { ok: false, code: 'campaign_not_open' };
  }

  // Max-athletes cap — include already-accepted + active.
  const { count: activeCount } = await sb
    .from('campaign_participations')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaign.id)
    .in('status', ['accepted', 'active', 'delivered', 'completed']);
  if ((activeCount ?? 0) >= campaign.max_athletes) {
    return { ok: false, code: 'campaign_full' };
  }

  // Resolve athlete → athletes row id + hs profile.
  const { data: athleteRow } = await sb
    .from('athletes')
    .select('id, profile_id, bracket')
    .eq('profile_id', input.athleteUserId)
    .maybeSingle<{ id: string; profile_id: string; bracket: string | null }>();

  if (!athleteRow) {
    return { ok: false, code: 'not_hs_athlete' };
  }
  if (athleteRow.bracket && athleteRow.bracket !== 'high_school') {
    return { ok: false, code: 'bracket_mismatch' };
  }

  // Already applied?
  const { data: existing } = await sb
    .from('campaign_participations')
    .select('id, status')
    .eq('campaign_id', campaign.id)
    .eq('athlete_id', athleteRow.id)
    .maybeSingle();
  if (existing) {
    return { ok: false, code: 'already_applied' };
  }

  // State-rule gate for the athlete specifically (validateDealCreation
  // reads hs_athlete_profiles for state + DOB).
  const stateCheck = await validateDealCreation({
    deal: {
      target_bracket: 'high_school',
      deal_type: CATEGORY_TO_DEAL_TYPE[campaign.deal_category],
      compensation_amount: campaign.base_compensation_cents / 100,
      start_date: campaign.timeline_start,
      end_date: campaign.timeline_end,
      tags: [campaign.deal_category],
      involves_school_ip: false,
      is_contingent_on_performance: false,
    },
    athlete: {
      user_id: input.athleteUserId,
      bracket: 'high_school',
    },
    supabase: sb,
  });

  if (!stateCheck.ok) {
    return {
      ok: false,
      code: 'state_rule_violation',
      violations: stateCheck.violations,
    };
  }

  // Consent-scope gate. Uses campaign.base_compensation_cents (cents→USD)
  // and campaign duration.
  const durationMonths = computeDurationMonths(
    campaign.timeline_start,
    campaign.timeline_end,
  );
  const consentCheck = await checkConsentScope({
    athleteUserId: input.athleteUserId,
    category: campaign.deal_category,
    amount: campaign.base_compensation_cents / 100,
    durationMonths,
    supabase: sb,
  });
  if (!consentCheck.covered) {
    const suggestedScope = buildConsentRequestSuggestion({
      category: campaign.deal_category,
      amount: campaign.base_compensation_cents / 100,
      durationMonths,
    });
    return {
      ok: false,
      code: 'consent_scope_gap',
      violations: [
        `Parental consent does not cover this campaign (${consentCheck.reason}).`,
      ],
      suggestedScope,
    };
  }

  // Write the participation row.
  const { data: newPart, error: insertErr } = await sb
    .from('campaign_participations')
    .insert({
      campaign_id: campaign.id,
      athlete_id: athleteRow.id,
      athlete_user_id: input.athleteUserId,
      status: 'applied',
    })
    .select('id')
    .single();

  if (insertErr || !newPart) {
    return {
      ok: false,
      code: 'state_rule_violation',
      violations: [insertErr?.message ?? 'Could not record participation.'],
    };
  }

  // Notify the brand. Best-effort.
  try {
    await notifyBrandOfApplication(campaign, athleteRow.id, sb);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil/campaigns] notify-brand failed', err);
  }

  return { ok: true, participationId: (newPart as { id: string }).id };
}

// ---------------------------------------------------------------------------
// acceptParticipation — spawns the deal row
// ---------------------------------------------------------------------------

export async function acceptParticipation(
  input: { brandId: string; participationId: string },
  sbOverride?: SupabaseClient,
): Promise<AcceptParticipationResult> {
  const sb = sbOverride ?? getServiceRoleClient();

  const { data: part } = await sb
    .from('campaign_participations')
    .select(
      'id, campaign_id, athlete_id, athlete_user_id, status, individual_deal_id',
    )
    .eq('id', input.participationId)
    .maybeSingle<{
      id: string;
      campaign_id: string;
      athlete_id: string;
      athlete_user_id: string;
      status: ParticipationStatus;
      individual_deal_id: string | null;
    }>();
  if (!part) return { ok: false, code: 'not_found' };
  if (part.status !== 'applied') {
    return { ok: false, code: 'invalid_state' };
  }

  const { data: campaignRow } = await sb
    .from('hs_brand_campaigns')
    .select('*')
    .eq('id', part.campaign_id)
    .maybeSingle();
  const campaign = (campaignRow as CampaignRow | null) ?? null;
  if (!campaign || campaign.brand_id !== input.brandId) {
    return { ok: false, code: 'not_found' };
  }

  // Re-run state-rule gate at accept time — rules may have been updated
  // since the athlete applied.
  const dealType = CATEGORY_TO_DEAL_TYPE[campaign.deal_category];
  const compAmt = campaign.base_compensation_cents / 100;
  const stateCheck = await validateDealCreation({
    deal: {
      target_bracket: 'high_school',
      deal_type: dealType,
      compensation_amount: compAmt,
      start_date: campaign.timeline_start,
      end_date: campaign.timeline_end,
      tags: [campaign.deal_category],
      involves_school_ip: false,
      is_contingent_on_performance: false,
    },
    athlete: { user_id: part.athlete_user_id, bracket: 'high_school' },
    supabase: sb,
  });
  if (!stateCheck.ok) {
    return {
      ok: false,
      code: 'state_rule_violation',
      violations: stateCheck.violations,
    };
  }

  // Spawn the deal row. Uses the service-role client so the insert
  // goes through RLS — same shape the /api/deals POST route builds.
  const { data: deal, error: dealErr } = await sb
    .from('deals')
    .insert({
      athlete_id: part.athlete_id,
      brand_id: campaign.brand_id,
      title: campaign.title,
      description: campaign.description ?? campaign.deliverables_template,
      deal_type: dealType,
      compensation_amount: compAmt,
      compensation_type: campaign.compensation_type === 'fixed_per_deliverable'
        ? 'fixed'
        : 'hybrid',
      start_date: campaign.timeline_start,
      end_date: campaign.timeline_end,
      deliverables: campaign.deliverables_template
        ? campaign.deliverables_template
        : null,
      status: 'pending',
      target_bracket: 'high_school',
      state_code: stateCheck.state_code,
      requires_disclosure: stateCheck.requires_disclosure,
      hs_campaign_id: campaign.id,
    })
    .select('id')
    .single();

  if (dealErr || !deal) {
    return {
      ok: false,
      code: 'deal_insert_failed',
      violations: [dealErr?.message ?? 'Could not spawn deal row.'],
    };
  }
  const dealId = (deal as { id: string }).id;

  const { error: updateErr } = await sb
    .from('campaign_participations')
    .update({
      status: 'active',
      accepted_at: new Date().toISOString(),
      individual_deal_id: dealId,
    })
    .eq('id', part.id);

  if (updateErr) {
    return {
      ok: false,
      code: 'deal_insert_failed',
      violations: [updateErr.message],
    };
  }

  // Notify the athlete. Best-effort.
  try {
    await notifyAthleteOfAcceptance(campaign, part.athlete_user_id, sb);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil/campaigns] notify-athlete failed', err);
  }

  return { ok: true, dealId, participationId: part.id };
}

// ---------------------------------------------------------------------------
// rejectParticipation
// ---------------------------------------------------------------------------

export async function rejectParticipation(
  input: { brandId: string; participationId: string; reason?: string | null },
  sbOverride?: SupabaseClient,
): Promise<{ ok: boolean; error?: string }> {
  const sb = sbOverride ?? getServiceRoleClient();

  const { data: part } = await sb
    .from('campaign_participations')
    .select('id, campaign_id, athlete_user_id, status')
    .eq('id', input.participationId)
    .maybeSingle<{
      id: string;
      campaign_id: string;
      athlete_user_id: string;
      status: ParticipationStatus;
    }>();
  if (!part) return { ok: false, error: 'Not found.' };
  if (part.status !== 'applied') {
    return { ok: false, error: 'Participation is not in applied state.' };
  }

  const { data: campaignRow } = await sb
    .from('hs_brand_campaigns')
    .select('*')
    .eq('id', part.campaign_id)
    .maybeSingle();
  const campaign = (campaignRow as CampaignRow | null) ?? null;
  if (!campaign || campaign.brand_id !== input.brandId) {
    return { ok: false, error: 'Not found.' };
  }

  const { error } = await sb
    .from('campaign_participations')
    .update({ status: 'rejected' })
    .eq('id', part.id);
  if (error) return { ok: false, error: error.message };

  try {
    await notifyAthleteOfClose(
      campaign,
      part.athlete_user_id,
      input.reason ?? null,
      sb,
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil/campaigns] notify-athlete-reject failed', err);
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// inviteAthletes
// ---------------------------------------------------------------------------

export async function inviteAthletes(
  input: { brandId: string; campaignId: string; athleteIds: string[] },
  sbOverride?: SupabaseClient,
): Promise<{ ok: boolean; invited: number; error?: string }> {
  const sb = sbOverride ?? getServiceRoleClient();

  const { data: campaignRow } = await sb
    .from('hs_brand_campaigns')
    .select('*')
    .eq('id', input.campaignId)
    .eq('brand_id', input.brandId)
    .maybeSingle();
  const campaign = (campaignRow as CampaignRow | null) ?? null;
  if (!campaign) return { ok: false, invited: 0, error: 'Campaign not found.' };
  if (campaign.athlete_selection === 'open_to_apply') {
    return {
      ok: false,
      invited: 0,
      error: 'Open-to-apply campaigns do not accept invitations.',
    };
  }

  // Cap against max_athletes total invitations per campaign.
  const { count: existingCount } = await sb
    .from('campaign_invitations')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaign.id);
  const remaining = Math.max(0, campaign.max_athletes - (existingCount ?? 0));
  const toInvite = input.athleteIds.slice(0, remaining);
  if (toInvite.length === 0) {
    return {
      ok: false,
      invited: 0,
      error: 'Invitation cap reached for this campaign.',
    };
  }

  // Resolve athlete rows → athlete_user_id per id.
  const { data: athleteRows } = await sb
    .from('athletes')
    .select('id, profile_id')
    .in('id', toInvite);
  const rowMap = new Map<string, string>();
  for (const a of (athleteRows ?? []) as Array<{ id: string; profile_id: string }>) {
    rowMap.set(a.id, a.profile_id);
  }

  const inserts = toInvite
    .filter((id) => rowMap.has(id))
    .map((id) => ({
      campaign_id: campaign.id,
      athlete_id: id,
      athlete_user_id: rowMap.get(id)!,
    }));

  if (inserts.length === 0) {
    return { ok: false, invited: 0, error: 'No valid athletes resolved.' };
  }

  const { data: inserted, error } = await sb
    .from('campaign_invitations')
    .upsert(inserts, { onConflict: 'campaign_id,athlete_id', ignoreDuplicates: true })
    .select('id, athlete_user_id');
  if (error) return { ok: false, invited: 0, error: error.message };

  const rows = (inserted ?? []) as Array<{ id: string; athlete_user_id: string }>;

  // Fan out invitation emails + push, best-effort per recipient.
  await Promise.all(
    rows.map(async (r) => {
      try {
        await notifyAthleteOfInvitation(campaign, r.athlete_user_id, sb);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[hs-nil/campaigns] invite fan-out failed', err);
      }
    }),
  );

  return { ok: true, invited: rows.length };
}

// ---------------------------------------------------------------------------
// listOpenCampaignsForAthlete
// ---------------------------------------------------------------------------

export interface OpenCampaignForAthlete {
  id: string;
  title: string;
  description: string | null;
  dealCategory: CampaignDealCategory;
  baseCompensationCents: number;
  targetStates: string[];
  athleteSelection: CampaignAthleteSelection;
  timelineStart: string | null;
  timelineEnd: string | null;
  /** True when the athlete is explicitly invited (invited_only/hybrid). */
  invited: boolean;
  /** True when consent already covers this campaign's category + amount. */
  consentCovered: boolean;
  /** When covered=false, suggested scope the athlete can request from a parent. */
  suggestedScope: ConsentScope | null;
}

export interface ListOpenCampaignsFilters {
  /** If set, restrict to campaigns targeting the athlete's state. Defaults to on. */
  restrictByState?: boolean;
  limit?: number;
}

export async function listOpenCampaignsForAthlete(
  athleteUserId: string,
  filters: ListOpenCampaignsFilters = {},
  sbOverride?: SupabaseClient,
): Promise<OpenCampaignForAthlete[]> {
  const sb = sbOverride ?? getServiceRoleClient();

  const { data: hsProfile } = await sb
    .from('hs_athlete_profiles')
    .select('state_code')
    .eq('user_id', athleteUserId)
    .maybeSingle<{ state_code: string | null }>();
  const stateCode = hsProfile?.state_code ?? null;

  let query = sb
    .from('hs_brand_campaigns')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 50);

  if ((filters.restrictByState ?? true) && stateCode) {
    query = query.contains('target_states', [stateCode]);
  }

  const { data: rows } = await query;
  const campaigns = (rows ?? []) as CampaignRow[];
  if (campaigns.length === 0) return [];

  // Pull this athlete's invitation map once, joined on the campaign ids.
  const campaignIds = campaigns.map((c) => c.id);
  const { data: invites } = await sb
    .from('campaign_invitations')
    .select('campaign_id')
    .eq('athlete_user_id', athleteUserId)
    .in('campaign_id', campaignIds);
  const invitedSet = new Set(
    (invites ?? []).map((r: { campaign_id: string }) => r.campaign_id),
  );

  // Per-campaign consent-scope check. We don't short-circuit — the
  // athlete sees every campaign, just with a different CTA ("Apply"
  // vs "Ask parent to expand consent").
  const out: OpenCampaignForAthlete[] = [];
  for (const c of campaigns) {
    // invited_only campaigns are only visible to invitees.
    if (c.athlete_selection === 'invited_only' && !invitedSet.has(c.id)) {
      continue;
    }

    const durationMonths = computeDurationMonths(
      c.timeline_start,
      c.timeline_end,
    );
    const consent = await checkConsentScope({
      athleteUserId,
      category: c.deal_category,
      amount: c.base_compensation_cents / 100,
      durationMonths,
      supabase: sb,
    });

    out.push({
      id: c.id,
      title: c.title,
      description: c.description,
      dealCategory: c.deal_category,
      baseCompensationCents: c.base_compensation_cents,
      targetStates: c.target_states,
      athleteSelection: c.athlete_selection,
      timelineStart: c.timeline_start,
      timelineEnd: c.timeline_end,
      invited: invitedSet.has(c.id),
      consentCovered: consent.covered,
      suggestedScope: consent.covered
        ? null
        : buildConsentRequestSuggestion({
            category: c.deal_category,
            amount: c.base_compensation_cents / 100,
            durationMonths,
          }),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// getCampaignPerformance
// ---------------------------------------------------------------------------

export interface CampaignPerformanceRow {
  campaignId: string;
  brandId: string;
  title: string;
  status: CampaignStatus;
  participantCount: number;
  completedCount: number;
  activeCount: number;
  totalShares: number;
  totalCompensationCents: number;
}

export async function getCampaignPerformance(
  campaignId: string,
  sbOverride?: SupabaseClient,
): Promise<CampaignPerformanceRow | null> {
  const sb = sbOverride ?? getServiceRoleClient();
  const { data, error } = await sb
    .from('campaign_performance_summary')
    .select(
      'campaign_id, brand_id, title, status, participant_count, completed_count, active_count, total_shares, total_compensation_cents',
    )
    .eq('campaign_id', campaignId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as {
    campaign_id: string;
    brand_id: string;
    title: string;
    status: CampaignStatus;
    participant_count: number | string;
    completed_count: number | string;
    active_count: number | string;
    total_shares: number | string;
    total_compensation_cents: number | string;
  };
  return {
    campaignId: row.campaign_id,
    brandId: row.brand_id,
    title: row.title,
    status: row.status,
    participantCount: Number(row.participant_count),
    completedCount: Number(row.completed_count),
    activeCount: Number(row.active_count),
    totalShares: Number(row.total_shares),
    totalCompensationCents: Number(row.total_compensation_cents),
  };
}

// ---------------------------------------------------------------------------
// Internal email helpers
// ---------------------------------------------------------------------------

async function fanOutCandidateAlerts(
  campaign: CampaignRow,
  sb: SupabaseClient,
): Promise<void> {
  // Only 'open_to_apply' and 'hybrid' get a fan-out alert to matching
  // athletes. 'invited_only' already got their invitation via
  // inviteAthletes().
  if (campaign.athlete_selection === 'invited_only') return;

  // Find discoverable HS athletes in target states whose sport isn't
  // restricted (we ignore sport here — any HS athlete in the pilot
  // states is a candidate; the athlete-facing browse applies their own
  // consent filter).
  const { data: profiles } = await sb
    .from('hs_athlete_profiles')
    .select('user_id')
    .in('state_code', campaign.target_states)
    .eq('is_discoverable', true)
    .limit(500);
  const userIds = (profiles ?? []).map((r: { user_id: string }) => r.user_id);
  if (userIds.length === 0) return;

  await Promise.all(
    userIds.map(async (uid) => {
      try {
        await notifyAthleteOfCampaignOpen(campaign, uid, sb);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[hs-nil/campaigns] open fan-out per user failed', err);
      }
    }),
  );
}

async function notifyAthleteOfInvitation(
  campaign: CampaignRow,
  athleteUserId: string,
  sb: SupabaseClient,
): Promise<void> {
  const { data } = await sb.auth.admin.getUserById(athleteUserId);
  const email = data.user?.email ?? null;
  const first =
    (data.user?.user_metadata as { first_name?: string } | undefined)
      ?.first_name ?? 'Athlete';

  if (email) {
    await sendCampaignInvitationToAthlete({
      athleteEmail: email,
      athleteFirstName: first,
      campaignTitle: campaign.title,
      campaignId: campaign.id,
    }).catch(() => null);
  }
  await sendPushToUser({
    userId: athleteUserId,
    notificationType: 'deal_review_needed',
    title: 'You were invited to a campaign',
    body: campaign.title,
    url: `/hs/athlete/campaigns/${campaign.id}`,
  }).catch(() => null);
}

async function notifyAthleteOfCampaignOpen(
  campaign: CampaignRow,
  athleteUserId: string,
  sb: SupabaseClient,
): Promise<void> {
  // Open-fan-out uses the same "invitation" email shell but with an
  // "open_to_apply" tone. Re-use the invitation email; callers can
  // differentiate via subject if needed. Silent push is preference-gated.
  const { data } = await sb.auth.admin.getUserById(athleteUserId);
  const email = data.user?.email ?? null;
  const first =
    (data.user?.user_metadata as { first_name?: string } | undefined)
      ?.first_name ?? 'Athlete';

  if (email) {
    await sendCampaignInvitationToAthlete({
      athleteEmail: email,
      athleteFirstName: first,
      campaignTitle: campaign.title,
      campaignId: campaign.id,
      openFanOut: true,
    }).catch(() => null);
  }
  await sendPushToUser({
    userId: athleteUserId,
    notificationType: 'deal_review_needed',
    title: 'New campaign open for you',
    body: campaign.title,
    url: `/hs/athlete/campaigns/${campaign.id}`,
  }).catch(() => null);
}

async function notifyBrandOfApplication(
  campaign: CampaignRow,
  athleteId: string,
  sb: SupabaseClient,
): Promise<void> {
  const { data: brand } = await sb
    .from('brands')
    .select('profile_id, company_name')
    .eq('id', campaign.brand_id)
    .maybeSingle<{ profile_id: string; company_name: string }>();
  if (!brand) return;

  const { data: userData } = await sb.auth.admin.getUserById(brand.profile_id);
  const email = userData.user?.email ?? null;
  if (email) {
    await sendCampaignApplicationReceived({
      brandEmail: email,
      brandName: brand.company_name,
      campaignTitle: campaign.title,
      campaignId: campaign.id,
      athleteId,
    }).catch(() => null);
  }
  await sendPushToUser({
    userId: brand.profile_id,
    notificationType: 'deal_review_needed',
    title: 'New campaign application',
    body: campaign.title,
    url: `/hs/brand/campaigns/${campaign.id}`,
  }).catch(() => null);
}

async function notifyAthleteOfAcceptance(
  campaign: CampaignRow,
  athleteUserId: string,
  sb: SupabaseClient,
): Promise<void> {
  const { data } = await sb.auth.admin.getUserById(athleteUserId);
  const email = data.user?.email ?? null;
  const first =
    (data.user?.user_metadata as { first_name?: string } | undefined)
      ?.first_name ?? 'Athlete';

  if (email) {
    await sendCampaignAcceptedToAthlete({
      athleteEmail: email,
      athleteFirstName: first,
      campaignTitle: campaign.title,
      campaignId: campaign.id,
    }).catch(() => null);
  }
  await sendPushToUser({
    userId: athleteUserId,
    notificationType: 'deal_completed',
    title: 'You were accepted into a campaign',
    body: campaign.title,
    url: `/hs/athlete/campaigns/${campaign.id}`,
  }).catch(() => null);
}

async function notifyAthleteOfClose(
  campaign: CampaignRow,
  athleteUserId: string,
  reason: string | null,
  sb: SupabaseClient,
): Promise<void> {
  const { data } = await sb.auth.admin.getUserById(athleteUserId);
  const email = data.user?.email ?? null;
  const first =
    (data.user?.user_metadata as { first_name?: string } | undefined)
      ?.first_name ?? 'Athlete';
  if (email) {
    await sendCampaignClosedToAthlete({
      athleteEmail: email,
      athleteFirstName: first,
      campaignTitle: campaign.title,
      campaignId: campaign.id,
      reason,
    }).catch(() => null);
  }
}

async function notifyApplicantsOfClose(
  campaign: CampaignRow,
  athleteUserIds: string[],
  sb: SupabaseClient,
): Promise<void> {
  await Promise.all(
    athleteUserIds.map((uid) =>
      notifyAthleteOfClose(campaign, uid, null, sb).catch(() => null),
    ),
  );
}
