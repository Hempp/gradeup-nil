/**
 * HS-NIL State-AD Compliance Portal Service
 * ----------------------------------------------------------------------------
 * SALES ANGLE / WEDGE RATIONALE
 * ----------------------------------------------------------------------------
 * NIL Club — our main HS-NIL competitor — *asserts* compliance but offers no
 * demonstrable AD-facing audit surface. State athletic association compliance
 * offices (CIF, FHSAA, GHSA, NJSIAA, NYSPHSAA, UIL, IHSA ...) are the buyer
 * NIL Club structurally cannot address: NIL Club is a marketplace that moves
 * money first and asks compliance questions later, while state ADs are
 * monitoring bodies whose job is to supervise that activity.
 *
 * GradeUp's differentiator is that we already produce machine-readable
 * compliance records as a side-effect of the deal pipeline — per-state rules
 * engine (src/lib/hs-nil/state-rules.ts), post-sign disclosure queue
 * (src/lib/hs-nil/disclosures.ts), parental-consent vault, audit log. We
 * hand those to state ADs for free, read-only, auditable. Distribution to
 * the compliance office becomes both the strongest trust signal for
 * parents/schools AND a wedge that NIL Club cannot match without rebuilding
 * the same infrastructure from zero.
 *
 * Product constraints enforced here:
 *   - Read-only everywhere. No write endpoints off this surface.
 *   - PII minimization. ADs see the same athlete-facing slice the public
 *     trajectory share URL exposes: first name + last initial, school, sport,
 *     state. Never email, phone, DOB, full address, parent info.
 *   - State-scoped. requireStateAdForStateCode() gates every query; an AD
 *     assigned to CA cannot query NJ data.
 *   - Auditable. Every portal view is logged to state_ad_portal_views, and
 *     that log is queryable by regular admins so we can flag ADs who drill
 *     excessively into individual athletes.
 *   - Invitation-gated. ADs cannot self-register — admin issues a 30-day
 *     token and the AD completes signup through the token.
 *
 * Source of truth: supabase/migrations/20260419_015_state_ad_portal.sql.
 */

import { randomUUID, randomBytes } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { USPSStateCode } from './state-rules';

// ----------------------------------------------------------------------------
// Infrastructure
// ----------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil state-ad-portal] Supabase service role not configured ' +
        '(NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ----------------------------------------------------------------------------
// PII minimization helpers
// ----------------------------------------------------------------------------

/**
 * Render an athlete's display name at the AD-portal privacy tier:
 * first-name + last-initial ("Jordan S."). Same slice as the public
 * trajectory share URL. If first name is missing, falls back to
 * "Athlete <short-id>" so we never render empty strings.
 */
export function anonymizeAthleteName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  athleteId: string
): string {
  const first = (firstName ?? '').trim();
  const last = (lastName ?? '').trim();
  if (!first && !last) return `Athlete ${athleteId.slice(0, 8)}`;
  const initial = last ? `${last.charAt(0).toUpperCase()}.` : '';
  return first ? `${first}${initial ? ` ${initial}` : ''}` : initial;
}

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface StateAdAssignment {
  id: string;
  userId: string;
  stateCode: USPSStateCode;
  organizationName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  activatedAt: string;
  deactivatedAt: string | null;
}

export interface StateAdInvitation {
  id: string;
  invitedEmail: string;
  stateCode: USPSStateCode;
  organizationName: string;
  invitedByUserId: string | null;
  invitationToken: string;
  invitedAt: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
  expiresAt: string;
  acceptedByUserId: string | null;
}

export interface InviteStateAdInput {
  email: string;
  stateCode: USPSStateCode;
  organizationName: string;
  invitedByUserId: string;
}

export interface InviteStateAdResult {
  ok: boolean;
  invitation?: StateAdInvitation;
  error?: string;
}

export interface AcceptInvitationResult {
  ok: boolean;
  assignmentId?: string;
  stateCode?: USPSStateCode;
  organizationName?: string;
  error?: string;
  code?: 'not_found' | 'expired' | 'already_accepted' | 'revoked' | 'internal';
}

export interface PortalMetrics {
  stateCode: USPSStateCode;
  rangeStart: string;
  rangeEnd: string;
  totalActiveDeals: number;
  totalSignedDeals: number;
  totalPaidDeals: number;
  totalDisclosuresEmitted: number;
  totalDisclosuresFailed: number;
  disclosureSuccessRate: number | null; // 0..1 or null if no disclosures yet
  averageHoursToDisclosure: number | null;
  totalDisputes: number;
  athletesActive: number;
  brandsActive: number;
}

export interface AdDealRow {
  id: string;
  title: string;
  status: string;
  stateCode: USPSStateCode;
  signedAt: string | null;
  compensationAmount: number | null;
  athleteAnon: string;
  athleteSchool: string | null;
  athleteSport: string | null;
  brandName: string | null;
  requiresDisclosure: boolean;
  hasConsent: boolean;
  disclosureStatus: string | null; // 'pending' | 'sent' | 'failed' | null
}

export interface AdDealFilters {
  status?: string;
  dateStart?: string;
  dateEnd?: string;
  sport?: string;
  school?: string;
  limit?: number;
  offset?: number;
}

export interface AdDisclosureRow {
  id: string;
  dealId: string;
  stateCode: USPSStateCode;
  recipient: string;
  status: string;
  scheduledFor: string;
  sentAt: string | null;
  failureReason: string | null;
  athleteAnon: string;
  athleteSchool: string | null;
  counterpartyName: string | null;
  payloadPreview: string;
}

export interface AdDisclosureFilters {
  status?: string;
  dateStart?: string;
  dateEnd?: string;
  limit?: number;
  offset?: number;
}

export interface AdDealComplianceDetail {
  deal: {
    id: string;
    title: string;
    status: string;
    stateCode: USPSStateCode;
    signedAt: string | null;
    createdAt: string;
    compensationAmount: number | null;
    dealType: string | null;
  };
  athlete: {
    anonymizedName: string;
    school: string | null;
    sport: string | null;
    graduationYear: number | null;
  };
  brand: {
    companyName: string | null;
  };
  parentalConsentRef: {
    consentId: string | null;
    signedAt: string | null;
    expiresAt: string | null;
  };
  disclosures: Array<{
    id: string;
    status: string;
    scheduledFor: string;
    sentAt: string | null;
    recipient: string;
    failureReason: string | null;
  }>;
  contentModerationStatus: string | null;
  signingTimestamps: {
    createdAt: string;
    signedAt: string | null;
    paidAt: string | null;
    completedAt: string | null;
  };
}

// ----------------------------------------------------------------------------
// Guard: state-scoping
// ----------------------------------------------------------------------------

/**
 * Returns the active assignment for (userId, stateCode) or null if the user
 * is not an active AD for that state. Callers MUST throw / 404 on null.
 *
 * Uses the service-role client: we cannot rely on RLS here because the
 * calling server component may be running with an auth client whose read
 * policy on state_ad_assignments is scoped to `user_id = auth.uid()`.
 * Service-role keeps the check direct.
 */
export async function requireStateAdForStateCode(
  userId: string,
  stateCode: USPSStateCode
): Promise<StateAdAssignment | null> {
  const sb = getServiceRoleClient();
  const { data } = await sb
    .from('state_ad_assignments')
    .select(
      'id, user_id, state_code, organization_name, contact_email, contact_phone, activated_at, deactivated_at'
    )
    .eq('user_id', userId)
    .eq('state_code', stateCode)
    .is('deactivated_at', null)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    userId: data.user_id,
    stateCode: data.state_code as USPSStateCode,
    organizationName: data.organization_name,
    contactEmail: data.contact_email,
    contactPhone: data.contact_phone,
    activatedAt: data.activated_at,
    deactivatedAt: data.deactivated_at,
  };
}

/**
 * Return every active assignment for this user (multi-state support). Used
 * by the portal landing page to let a regional AD pick a state.
 */
export async function listAssignmentsForUser(
  userId: string
): Promise<StateAdAssignment[]> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('state_ad_assignments')
    .select(
      'id, user_id, state_code, organization_name, contact_email, contact_phone, activated_at, deactivated_at'
    )
    .eq('user_id', userId)
    .is('deactivated_at', null)
    .order('activated_at', { ascending: true });
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[state-ad-portal] listAssignmentsForUser failed', error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    stateCode: row.state_code as USPSStateCode,
    organizationName: row.organization_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    activatedAt: row.activated_at,
    deactivatedAt: row.deactivated_at,
  }));
}

// ----------------------------------------------------------------------------
// Audit-log writer
// ----------------------------------------------------------------------------

export type AdViewedResource =
  | 'dashboard'
  | 'deal_list'
  | 'disclosure_list'
  | 'deal_detail'
  | 'invitations';

/**
 * Append a single audit row. Called from every AD-portal surface before the
 * query executes. Best-effort: a failed insert logs and returns without
 * throwing — losing an audit row is preferable to 500ing on the UI.
 */
export async function logPortalView(
  adUserId: string,
  stateCode: USPSStateCode,
  viewedResource: AdViewedResource,
  resourceId: string | null = null
): Promise<void> {
  try {
    const sb = getServiceRoleClient();
    await sb.from('state_ad_portal_views').insert({
      ad_user_id: adUserId,
      state_code: stateCode,
      viewed_resource: viewedResource,
      resource_id: resourceId,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[state-ad-portal] logPortalView failed', {
      adUserId,
      stateCode,
      viewedResource,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ----------------------------------------------------------------------------
// Invitation flow
// ----------------------------------------------------------------------------

function generateToken(): string {
  return randomBytes(24).toString('base64url');
}

function rowToInvitation(row: Record<string, unknown>): StateAdInvitation {
  return {
    id: row.id as string,
    invitedEmail: row.invited_email as string,
    stateCode: row.state_code as USPSStateCode,
    organizationName: row.organization_name as string,
    invitedByUserId: (row.invited_by_user_id as string | null) ?? null,
    invitationToken: row.invitation_token as string,
    invitedAt: row.invited_at as string,
    acceptedAt: (row.accepted_at as string | null) ?? null,
    rejectedAt: (row.rejected_at as string | null) ?? null,
    expiresAt: row.expires_at as string,
    acceptedByUserId: (row.accepted_by_user_id as string | null) ?? null,
  };
}

/**
 * Admin action. Writes an invitation row and returns it. Does NOT send the
 * email — callers should invoke sendStateAdInvitation() from
 * src/lib/services/hs-nil/state-ad-emails.ts. Separating write + email keeps
 * the DB write authoritative even if email is not configured.
 */
export async function inviteStateAd(
  input: InviteStateAdInput
): Promise<InviteStateAdResult> {
  const sb = getServiceRoleClient();
  const token = generateToken();

  const { data, error } = await sb
    .from('state_ad_invitations')
    .insert({
      id: randomUUID(),
      invited_email: input.email.trim().toLowerCase(),
      state_code: input.stateCode,
      organization_name: input.organizationName,
      invited_by_user_id: input.invitedByUserId,
      invitation_token: token,
    })
    .select(
      'id, invited_email, state_code, organization_name, invited_by_user_id, invitation_token, invited_at, accepted_at, rejected_at, expires_at, accepted_by_user_id'
    )
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? 'insert failed',
    };
  }
  return { ok: true, invitation: rowToInvitation(data) };
}

/**
 * Accept an invitation during AD signup. Called from the signup route after
 * the new auth.users row is created. Flow:
 *   1. Look up invitation by token. 404 if missing.
 *   2. Verify not expired / accepted / revoked.
 *   3. Create state_ad_assignments row (ON CONFLICT DO NOTHING so a
 *      double-acceptance is idempotent).
 *   4. Mark invitation accepted_at + accepted_by_user_id.
 *
 * The function does NOT mutate the auth.users role directly — that is the
 * responsibility of the signup API route, which sets profiles.role='state_ad'
 * as part of profile creation. We do return the assigned state so the route
 * can redirect into the portal.
 */
export async function acceptInvitation(
  token: string,
  userId: string
): Promise<AcceptInvitationResult> {
  const sb = getServiceRoleClient();
  const now = new Date();

  const { data: invitation, error: fetchErr } = await sb
    .from('state_ad_invitations')
    .select(
      'id, invited_email, state_code, organization_name, invited_by_user_id, invitation_token, invited_at, accepted_at, rejected_at, expires_at, accepted_by_user_id'
    )
    .eq('invitation_token', token)
    .maybeSingle();

  if (fetchErr) {
    return { ok: false, error: fetchErr.message, code: 'internal' };
  }
  if (!invitation) {
    return { ok: false, error: 'Invitation not found', code: 'not_found' };
  }
  if (invitation.accepted_at) {
    return {
      ok: false,
      error: 'Invitation already accepted',
      code: 'already_accepted',
    };
  }
  if (invitation.rejected_at) {
    return { ok: false, error: 'Invitation was revoked', code: 'revoked' };
  }
  if (new Date(invitation.expires_at as string).getTime() < now.getTime()) {
    return { ok: false, error: 'Invitation expired', code: 'expired' };
  }

  // Insert the assignment. UNIQUE (user_id, state_code) guards duplicates.
  const { data: assignment, error: insertErr } = await sb
    .from('state_ad_assignments')
    .upsert(
      {
        user_id: userId,
        state_code: invitation.state_code,
        organization_name: invitation.organization_name,
        contact_email: invitation.invited_email,
      },
      { onConflict: 'user_id,state_code', ignoreDuplicates: false }
    )
    .select('id')
    .single();

  if (insertErr || !assignment) {
    return {
      ok: false,
      error: insertErr?.message ?? 'assignment create failed',
      code: 'internal',
    };
  }

  const { error: updateErr } = await sb
    .from('state_ad_invitations')
    .update({
      accepted_at: now.toISOString(),
      accepted_by_user_id: userId,
    })
    .eq('id', invitation.id);
  if (updateErr) {
    // Log but don't fail — assignment is already written, which is the
    // authoritative record. Invitation can be reconciled out-of-band.
    // eslint-disable-next-line no-console
    console.warn('[state-ad-portal] acceptInvitation update failed', updateErr.message);
  }

  return {
    ok: true,
    assignmentId: assignment.id,
    stateCode: invitation.state_code as USPSStateCode,
    organizationName: invitation.organization_name,
  };
}

export async function listInvitations(
  filter: 'all' | 'open' | 'accepted' | 'revoked' = 'all'
): Promise<StateAdInvitation[]> {
  const sb = getServiceRoleClient();
  let q = sb
    .from('state_ad_invitations')
    .select(
      'id, invited_email, state_code, organization_name, invited_by_user_id, invitation_token, invited_at, accepted_at, rejected_at, expires_at, accepted_by_user_id'
    )
    .order('invited_at', { ascending: false })
    .limit(200);
  if (filter === 'open') q = q.is('accepted_at', null).is('rejected_at', null);
  else if (filter === 'accepted') q = q.not('accepted_at', 'is', null);
  else if (filter === 'revoked') q = q.not('rejected_at', 'is', null);
  const { data, error } = await q;
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[state-ad-portal] listInvitations failed', error.message);
    return [];
  }
  return (data ?? []).map(rowToInvitation);
}

export async function revokeInvitation(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const sb = getServiceRoleClient();
  const { error } = await sb
    .from('state_ad_invitations')
    .update({ rejected_at: new Date().toISOString() })
    .eq('id', id)
    .is('accepted_at', null);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Unauthenticated-landing helper. Returns the invitation if it's still
 * actionable (not accepted, not revoked, not expired). Callers must NOT
 * return the token itself in the response — pass only the display fields
 * to the unauthenticated landing page.
 */
export async function getInvitationByToken(
  token: string
): Promise<StateAdInvitation | null> {
  const sb = getServiceRoleClient();
  const { data } = await sb
    .from('state_ad_invitations')
    .select(
      'id, invited_email, state_code, organization_name, invited_by_user_id, invitation_token, invited_at, accepted_at, rejected_at, expires_at, accepted_by_user_id'
    )
    .eq('invitation_token', token)
    .maybeSingle();
  if (!data) return null;
  const invite = rowToInvitation(data);
  if (invite.acceptedAt || invite.rejectedAt) return null;
  if (new Date(invite.expiresAt).getTime() < Date.now()) return null;
  return invite;
}

// ----------------------------------------------------------------------------
// Portal metrics
// ----------------------------------------------------------------------------

/**
 * Aggregate signal block for an AD's assigned state, over a date range.
 * Batched into a small set of count-only queries so page load stays under
 * the Supabase PostgREST round-trip budget.
 *
 * NB: `compensation_amount` on deals is the *full* deal compensation;
 * 'paid' here is the status, which flags the athlete-side money flow.
 */
export async function getPortalMetricsForState(
  stateCode: USPSStateCode,
  rangeStart: Date,
  rangeEnd: Date
): Promise<PortalMetrics> {
  const sb = getServiceRoleClient();
  const startIso = rangeStart.toISOString();
  const endIso = rangeEnd.toISOString();

  const baseDeals = () =>
    sb
      .from('deals')
      .select('id', { count: 'exact', head: true })
      .eq('state_code', stateCode)
      .gte('created_at', startIso)
      .lte('created_at', endIso);

  const [
    activeDeals,
    signedDeals,
    paidDeals,
    disclosuresSent,
    disclosuresFailed,
    disclosureTimings,
    disputes,
    athletes,
    brands,
  ] = await Promise.all([
    baseDeals().in('status', ['active', 'accepted', 'negotiating', 'fully_signed', 'in_delivery', 'in_review', 'approved']),
    baseDeals().in('status', ['fully_signed', 'in_delivery', 'in_review', 'approved', 'paid', 'completed']),
    baseDeals().in('status', ['paid', 'completed']),
    sb
      .from('hs_deal_disclosures')
      .select('id', { count: 'exact', head: true })
      .eq('state_code', stateCode)
      .eq('status', 'sent')
      .gte('created_at', startIso)
      .lte('created_at', endIso),
    sb
      .from('hs_deal_disclosures')
      .select('id', { count: 'exact', head: true })
      .eq('state_code', stateCode)
      .eq('status', 'failed')
      .gte('created_at', startIso)
      .lte('created_at', endIso),
    sb
      .from('hs_deal_disclosures')
      .select('scheduled_for, sent_at')
      .eq('state_code', stateCode)
      .eq('status', 'sent')
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .limit(500),
    sb
      .from('deal_disputes')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startIso)
      .lte('created_at', endIso),
    sb
      .from('hs_athlete_profiles')
      .select('user_id', { count: 'exact', head: true })
      .eq('state_code', stateCode),
    sb
      .from('deals')
      .select('brand_id')
      .eq('state_code', stateCode)
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .limit(1000),
  ]);

  const sentCount = disclosuresSent.count ?? 0;
  const failedCount = disclosuresFailed.count ?? 0;
  const attempted = sentCount + failedCount;
  const successRate = attempted > 0 ? sentCount / attempted : null;

  let totalHours = 0;
  let timingCount = 0;
  for (const row of disclosureTimings.data ?? []) {
    if (!row?.sent_at || !row?.scheduled_for) continue;
    const diffMs =
      new Date(row.sent_at as string).getTime() -
      new Date(row.scheduled_for as string).getTime();
    if (!Number.isFinite(diffMs)) continue;
    totalHours += Math.abs(diffMs) / (1000 * 60 * 60);
    timingCount += 1;
  }

  const uniqueBrands = new Set<string>();
  for (const row of brands.data ?? []) {
    if (row?.brand_id) uniqueBrands.add(row.brand_id as string);
  }

  return {
    stateCode,
    rangeStart: startIso,
    rangeEnd: endIso,
    totalActiveDeals: activeDeals.count ?? 0,
    totalSignedDeals: signedDeals.count ?? 0,
    totalPaidDeals: paidDeals.count ?? 0,
    totalDisclosuresEmitted: sentCount,
    totalDisclosuresFailed: failedCount,
    disclosureSuccessRate: successRate,
    averageHoursToDisclosure: timingCount > 0 ? totalHours / timingCount : null,
    totalDisputes: disputes.count ?? 0,
    athletesActive: athletes.count ?? 0,
    brandsActive: uniqueBrands.size,
  };
}

// ----------------------------------------------------------------------------
// Deal listings
// ----------------------------------------------------------------------------

export async function listDealsInState(
  stateCode: USPSStateCode,
  filters: AdDealFilters = {}
): Promise<{ rows: AdDealRow[]; total: number }> {
  const sb = getServiceRoleClient();
  const limit = Math.max(1, Math.min(filters.limit ?? 25, 100));
  const offset = Math.max(0, filters.offset ?? 0);

  let q = sb
    .from('deals')
    .select(
      `id, title, status, state_code, signed_at, created_at, compensation_amount, requires_disclosure, parental_consent_id, target_bracket,
       athlete:athletes(id, first_name, last_name, profile_id,
         hs_profile:hs_athlete_profiles!hs_athlete_profiles_user_id_fkey(school_name, sport)
       ),
       brand:brands(company_name),
       disclosures:hs_deal_disclosures(id, status)`,
      { count: 'exact' }
    )
    .eq('state_code', stateCode)
    .eq('target_bracket', 'high_school')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.status) q = q.eq('status', filters.status);
  if (filters.dateStart) q = q.gte('created_at', filters.dateStart);
  if (filters.dateEnd) q = q.lte('created_at', filters.dateEnd);

  const { data, count, error } = await q;
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[state-ad-portal] listDealsInState failed', error.message);
    return { rows: [], total: 0 };
  }

  const rows: AdDealRow[] = [];
  for (const raw of data ?? []) {
    const row = raw as unknown as {
      id: string;
      title: string;
      status: string;
      state_code: string;
      signed_at: string | null;
      compensation_amount: number | null;
      requires_disclosure: boolean | null;
      parental_consent_id: string | null;
      athlete: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        profile_id: string | null;
        hs_profile?: Array<{ school_name: string | null; sport: string | null }> | null;
      } | null;
      brand: { company_name: string | null } | null;
      disclosures: Array<{ id: string; status: string }> | null;
    };
    const hsProfile = row.athlete?.hs_profile?.[0] ?? null;

    // In-memory filter for sport/school (supabase join can't easily filter
    // at the join level through the simple query builder).
    if (filters.sport && hsProfile?.sport !== filters.sport) continue;
    if (filters.school && hsProfile?.school_name !== filters.school) continue;

    const latestDisclosure = (row.disclosures ?? []).reduce<
      { id: string; status: string } | null
    >(
      (acc, cur) => (acc ? acc : cur),
      null
    );

    rows.push({
      id: row.id,
      title: row.title,
      status: row.status,
      stateCode: row.state_code as USPSStateCode,
      signedAt: row.signed_at,
      compensationAmount: row.compensation_amount,
      athleteAnon: row.athlete
        ? anonymizeAthleteName(row.athlete.first_name, row.athlete.last_name, row.athlete.id)
        : 'Athlete',
      athleteSchool: hsProfile?.school_name ?? null,
      athleteSport: hsProfile?.sport ?? null,
      brandName: row.brand?.company_name ?? null,
      requiresDisclosure: Boolean(row.requires_disclosure),
      hasConsent: Boolean(row.parental_consent_id),
      disclosureStatus: latestDisclosure?.status ?? null,
    });
  }

  return { rows, total: count ?? rows.length };
}

export async function listDisclosuresInState(
  stateCode: USPSStateCode,
  filters: AdDisclosureFilters = {}
): Promise<{ rows: AdDisclosureRow[]; total: number }> {
  const sb = getServiceRoleClient();
  const limit = Math.max(1, Math.min(filters.limit ?? 25, 100));
  const offset = Math.max(0, filters.offset ?? 0);

  let q = sb
    .from('hs_deal_disclosures')
    .select(
      'id, deal_id, state_code, recipient, status, scheduled_for, sent_at, failure_reason, payload, athlete_user_id',
      { count: 'exact' }
    )
    .eq('state_code', stateCode)
    .order('scheduled_for', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.status) q = q.eq('status', filters.status);
  if (filters.dateStart) q = q.gte('created_at', filters.dateStart);
  if (filters.dateEnd) q = q.lte('created_at', filters.dateEnd);

  const { data, count, error } = await q;
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[state-ad-portal] listDisclosuresInState failed', error.message);
    return { rows: [], total: 0 };
  }

  const rows: AdDisclosureRow[] = [];
  for (const row of data ?? []) {
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    const fullAthleteName = (payload.athleteName as string | undefined) ?? '';
    const [first = '', ...rest] = fullAthleteName.trim().split(/\s+/);
    const anon = anonymizeAthleteName(first || null, rest.join(' ') || null, row.athlete_user_id as string);
    const preview = [
      payload.state ? `${payload.state}` : null,
      payload.amount ? `$${payload.amount}` : null,
      payload.signedAt ? `signed ${String(payload.signedAt).slice(0, 10)}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    rows.push({
      id: row.id as string,
      dealId: row.deal_id as string,
      stateCode: row.state_code as USPSStateCode,
      recipient: row.recipient as string,
      status: row.status as string,
      scheduledFor: row.scheduled_for as string,
      sentAt: (row.sent_at as string | null) ?? null,
      failureReason: (row.failure_reason as string | null) ?? null,
      athleteAnon: anon,
      athleteSchool: (payload.schoolName as string | null) ?? null,
      counterpartyName: null,
      payloadPreview: preview,
    });
  }

  return { rows, total: count ?? rows.length };
}

// ----------------------------------------------------------------------------
// Single-deal compliance deep dive
// ----------------------------------------------------------------------------

export async function getDealComplianceDetail(
  dealId: string,
  requestingAdUserId: string,
  stateCode: USPSStateCode
): Promise<AdDealComplianceDetail | null> {
  const sb = getServiceRoleClient();

  const { data: deal } = await sb
    .from('deals')
    .select(
      `id, title, status, state_code, signed_at, created_at, compensation_amount, deal_type, athlete_id, brand_id, parental_consent_id,
       athlete:athletes(id, first_name, last_name, profile_id,
         hs_profile:hs_athlete_profiles!hs_athlete_profiles_user_id_fkey(school_name, sport, graduation_year)
       ),
       brand:brands(company_name),
       parental_consent:parental_consents(id, signed_at, expires_at),
       disclosures:hs_deal_disclosures(id, status, scheduled_for, sent_at, recipient, failure_reason)`
    )
    .eq('id', dealId)
    .eq('state_code', stateCode)
    .maybeSingle();

  if (!deal) return null;

  // Log access to this specific deal.
  await logPortalView(requestingAdUserId, stateCode, 'deal_detail', dealId);

  const row = deal as unknown as {
    id: string;
    title: string;
    status: string;
    state_code: string;
    signed_at: string | null;
    created_at: string;
    compensation_amount: number | null;
    deal_type: string | null;
    athlete: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      hs_profile?: Array<{
        school_name: string | null;
        sport: string | null;
        graduation_year: number | null;
      }> | null;
    } | null;
    brand: { company_name: string | null } | null;
    parental_consent: {
      id: string;
      signed_at: string;
      expires_at: string;
    } | null;
    disclosures: Array<{
      id: string;
      status: string;
      scheduled_for: string;
      sent_at: string | null;
      recipient: string;
      failure_reason: string | null;
    }> | null;
  };

  const hsProfile = row.athlete?.hs_profile?.[0] ?? null;

  // Content moderation status — join only if deliverable_submissions + moderation
  // table has the deal. Non-fatal on missing tables.
  let contentModerationStatus: string | null = null;
  try {
    const { data: mod } = await sb
      .from('deliverable_submissions')
      .select('status')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (mod) contentModerationStatus = mod.status as string;
  } catch {
    // ignore — module not loaded in this env.
  }

  let paidAt: string | null = null;
  let completedAt: string | null = null;
  try {
    const { data: payout } = await sb
      .from('hs_deal_parent_payouts')
      .select('paid_at')
      .eq('deal_id', dealId)
      .maybeSingle();
    paidAt = (payout?.paid_at as string | null) ?? null;
  } catch {
    // ignore.
  }
  if (row.status === 'completed') completedAt = row.signed_at;

  return {
    deal: {
      id: row.id,
      title: row.title,
      status: row.status,
      stateCode: row.state_code as USPSStateCode,
      signedAt: row.signed_at,
      createdAt: row.created_at,
      compensationAmount: row.compensation_amount,
      dealType: row.deal_type,
    },
    athlete: {
      anonymizedName: row.athlete
        ? anonymizeAthleteName(row.athlete.first_name, row.athlete.last_name, row.athlete.id)
        : 'Athlete',
      school: hsProfile?.school_name ?? null,
      sport: hsProfile?.sport ?? null,
      graduationYear: hsProfile?.graduation_year ?? null,
    },
    brand: { companyName: row.brand?.company_name ?? null },
    parentalConsentRef: {
      consentId: row.parental_consent?.id ?? null,
      signedAt: row.parental_consent?.signed_at ?? null,
      expiresAt: row.parental_consent?.expires_at ?? null,
    },
    disclosures: (row.disclosures ?? []).map((d) => ({
      id: d.id,
      status: d.status,
      scheduledFor: d.scheduled_for,
      sentAt: d.sent_at,
      recipient: d.recipient,
      failureReason: d.failure_reason,
    })),
    contentModerationStatus,
    signingTimestamps: {
      createdAt: row.created_at,
      signedAt: row.signed_at,
      paidAt,
      completedAt,
    },
  };
}

/**
 * Count active AD assignments across the platform. Used by the main admin
 * dashboard's State AD card.
 */
export async function countActiveStateAds(): Promise<{
  assignments: number;
  openInvitations: number;
}> {
  const sb = getServiceRoleClient();
  try {
    const [assignments, invitations] = await Promise.all([
      sb
        .from('state_ad_assignments')
        .select('id', { count: 'exact', head: true })
        .is('deactivated_at', null),
      sb
        .from('state_ad_invitations')
        .select('id', { count: 'exact', head: true })
        .is('accepted_at', null)
        .is('rejected_at', null)
        .gte('expires_at', new Date().toISOString()),
    ]);
    return {
      assignments: assignments.count ?? 0,
      openInvitations: invitations.count ?? 0,
    };
  } catch {
    return { assignments: 0, openInvitations: 0 };
  }
}
