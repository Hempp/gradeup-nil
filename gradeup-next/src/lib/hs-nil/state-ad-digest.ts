/**
 * HS-NIL Phase 16 — State-AD Weekly Digest Service
 * ----------------------------------------------------------------------------
 * Assembles the once-a-week compliance summary that state athletic-association
 * ADs receive in their inbox. Mirrors the Phase 15 OPS-BRIEF pattern — but at
 * a different level of the org: per-state, per-AD, not admin-wide.
 *
 * Data philosophy
 * ───────────────
 *   1. Same source-of-truth. Deal counts, disclosures, compliance events
 *      come through the existing state-ad-portal service so the numbers the
 *      digest reports always match what the AD sees when they click through.
 *
 *   2. PII discipline. Athletes surfaced in the digest use the same slice
 *      the portal exposes: first name + last initial + school + sport.
 *      No email, no phone, no DOB, no parent names in the digest body.
 *      `anonymizeAthleteName` (from state-ad-portal) is the single choke
 *      point for that rule.
 *
 *   3. Empty-week suppression. If a state had zero new deals AND zero new
 *      disclosures AND zero failures AND zero compliance events in the
 *      7-day window, the cron skips the send entirely. "Nothing happened
 *      this week" is never an email worth sending.
 *
 *   4. Idempotent dispatch. listDueDigestRecipients() filters by two gates:
 *        - extract(dow from now()) = digest_day_of_week   (AD's chosen day)
 *        - digest_last_sent_at IS NULL OR < now() - 6 days
 *      Six days (not seven) to survive DST / timezone wobble on the cron.
 *
 *   5. Fail-soft. Payload assembly wraps every Supabase read in try/catch.
 *      A bad week stat doesn't blank the whole digest — the affected slice
 *      becomes a zero and the rest still renders.
 */

import {
  createClient as createServiceClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import {
  anonymizeAthleteName,
  listDealsInState,
  listDisclosuresInState,
} from './state-ad-portal';
import type { USPSStateCode } from './state-rules';

// ----------------------------------------------------------------------------
// Service-role client
// ----------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil state-ad-digest] Supabase service role not configured ' +
        '(NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface WeeklyStateAdBriefDeal {
  id: string;
  athleteAnon: string;           // "Jordan S."
  athleteSchool: string | null;
  athleteSport: string | null;
  brandName: string | null;
  compensationAmount: number | null;
  signedAt: string | null;
}

export interface WeeklyStateAdBriefTopSchool {
  school: string;
  dealCount: number;
}

export interface WeeklyStateAdBrief {
  stateCode: USPSStateCode;
  rangeStart: string;   // ISO
  rangeEnd: string;     // ISO
  /** Total new deals (HS bracket) signed or created this week. */
  newDealCount: number;
  /** First 20 deals for inline display. Portal has the full list. */
  newDeals: WeeklyStateAdBriefDeal[];
  /** Total compensation across all new deals ($). */
  totalCompensation: number;
  /** Disclosures with status='sent' in the window. */
  disclosuresEmitted: number;
  /** Disclosures with status='failed' in the window. */
  disclosuresFailed: number;
  /** Unreviewed compliance events in the window (regulatory_change_events). */
  unreviewedComplianceEvents: number;
  /** Disclosure success rate (0..1) or null if nothing attempted. */
  complianceRate: number | null;
  /** Top 3 schools by deal volume this week. */
  topSchools: WeeklyStateAdBriefTopSchool[];
}

export interface DigestRecipient {
  assignmentId: string;
  userId: string;
  stateCode: USPSStateCode;
  organizationName: string;
  contactEmail: string | null;
  digestDayOfWeek: number;
  digestLastSentAt: string | null;
}

// ----------------------------------------------------------------------------
// Assemble the weekly payload
// ----------------------------------------------------------------------------

/**
 * Build the weekly brief payload for one state. 7-day window ending at
 * `weekEndingAt` (default: now). Uses the existing portal service calls
 * so the numbers shown in the email match what the AD sees in-portal.
 *
 * Fail-soft: each sub-query is guarded so a single failure degrades to a
 * zero instead of throwing.
 */
export async function collectWeeklyStateAdBrief(
  stateCode: USPSStateCode,
  weekEndingAt: Date = new Date()
): Promise<WeeklyStateAdBrief> {
  const rangeEnd = weekEndingAt;
  const rangeStart = new Date(
    rangeEnd.getTime() - 7 * 24 * 60 * 60 * 1000
  );
  const rangeStartIso = rangeStart.toISOString();
  const rangeEndIso = rangeEnd.toISOString();

  // Pull up to 100 deals in the window — enough to compute top-schools
  // accurately and pick out the first 20 for the email body.
  let newDeals: WeeklyStateAdBriefDeal[] = [];
  let newDealCount = 0;
  let totalCompensation = 0;
  const schoolTallies = new Map<string, number>();

  try {
    const { rows, total } = await listDealsInState(stateCode, {
      dateStart: rangeStartIso,
      dateEnd: rangeEndIso,
      limit: 100,
      offset: 0,
    });
    newDealCount = total;
    for (const r of rows) {
      totalCompensation += Number(r.compensationAmount ?? 0);
      if (r.athleteSchool) {
        schoolTallies.set(
          r.athleteSchool,
          (schoolTallies.get(r.athleteSchool) ?? 0) + 1
        );
      }
    }
    newDeals = rows.slice(0, 20).map((r) => ({
      id: r.id,
      athleteAnon: r.athleteAnon,
      athleteSchool: r.athleteSchool,
      athleteSport: r.athleteSport,
      brandName: r.brandName,
      compensationAmount: r.compensationAmount,
      signedAt: r.signedAt,
    }));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[state-ad-digest] new-deal pull failed', {
      stateCode,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const topSchools: WeeklyStateAdBriefTopSchool[] = [...schoolTallies.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([school, dealCount]) => ({ school, dealCount }));

  // Disclosure counts — need both "sent" and "failed" in the window to
  // compute compliance rate. listDisclosuresInState pages by scheduled_for,
  // but we want created_at-scoped window for this metric, so query direct.
  let disclosuresEmitted = 0;
  let disclosuresFailed = 0;
  try {
    const sb = getServiceRoleClient();
    const [emittedRes, failedRes] = await Promise.all([
      sb
        .from('hs_deal_disclosures')
        .select('id', { count: 'exact', head: true })
        .eq('state_code', stateCode)
        .eq('status', 'sent')
        .gte('created_at', rangeStartIso)
        .lt('created_at', rangeEndIso),
      sb
        .from('hs_deal_disclosures')
        .select('id', { count: 'exact', head: true })
        .eq('state_code', stateCode)
        .eq('status', 'failed')
        .gte('created_at', rangeStartIso)
        .lt('created_at', rangeEndIso),
    ]);
    disclosuresEmitted = emittedRes.count ?? 0;
    disclosuresFailed = failedRes.count ?? 0;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[state-ad-digest] disclosure-count pull failed', {
      stateCode,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Unreviewed compliance events. The table is global — not state-scoped —
  // so we filter by diff_summary containing the state code in
  // brackets/mentions. If the table isn't present (regulatory-monitor
  // migration not applied yet), degrade to zero.
  let unreviewedComplianceEvents = 0;
  try {
    const sb = getServiceRoleClient();
    const { count } = await sb
      .from('regulatory_change_events')
      .select('id', { count: 'exact', head: true })
      .is('reviewed_at', null)
      .gte('detected_at', rangeStartIso)
      .lt('detected_at', rangeEndIso)
      .or(
        `diff_summary.ilike.%${stateCode}%,diff_summary.ilike.%\[${stateCode}\]%`
      );
    unreviewedComplianceEvents = count ?? 0;
  } catch {
    unreviewedComplianceEvents = 0;
  }

  const attempted = disclosuresEmitted + disclosuresFailed;
  const complianceRate = attempted > 0 ? disclosuresEmitted / attempted : null;

  // Let anonymize do its thing on any edge-case empty names.
  for (const d of newDeals) {
    if (!d.athleteAnon) d.athleteAnon = anonymizeAthleteName(null, null, d.id);
  }

  return {
    stateCode,
    rangeStart: rangeStartIso,
    rangeEnd: rangeEndIso,
    newDealCount,
    newDeals,
    totalCompensation,
    disclosuresEmitted,
    disclosuresFailed,
    unreviewedComplianceEvents,
    complianceRate,
    topSchools,
  };
}

/**
 * Returns true if a brief contains at least one signal worth emailing.
 * The cron uses this to enforce the empty-week suppression rule.
 */
export function briefHasContent(brief: WeeklyStateAdBrief): boolean {
  return (
    brief.newDealCount > 0 ||
    brief.disclosuresEmitted > 0 ||
    brief.disclosuresFailed > 0 ||
    brief.unreviewedComplianceEvents > 0
  );
}

// ----------------------------------------------------------------------------
// Recipient roster
// ----------------------------------------------------------------------------

/**
 * Load every state-AD assignment whose digest is due today. Two gates:
 *   1. digest_enabled = true AND deactivated_at IS NULL
 *   2. digest_day_of_week = extract(dow from now())   (AD's preferred day)
 *   3. digest_last_sent_at IS NULL OR < now() - 6 days  (idempotency)
 *
 * Returns one row per assignment, including the AD's contact email. If
 * contact_email is NULL we fall back to auth.users.email (the email from
 * the signup flow) so brand-new assignments get reached on day one.
 */
export async function listDueDigestRecipients(
  now: Date = new Date()
): Promise<DigestRecipient[]> {
  const sb = getServiceRoleClient();
  // Postgres's extract(dow from now()) uses server-local time zone. Our
  // Supabase clusters run UTC, so match by UTC day-of-week.
  const dow = now.getUTCDay();
  const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await sb
    .from('state_ad_assignments')
    .select(
      'id, user_id, state_code, organization_name, contact_email, digest_enabled, digest_last_sent_at, digest_day_of_week'
    )
    .eq('digest_enabled', true)
    .eq('digest_day_of_week', dow)
    .is('deactivated_at', null)
    .order('state_code', { ascending: true })
    .limit(1000);

  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[state-ad-digest] recipient load failed', error.message);
    return [];
  }

  const rows = (data ?? []).filter((r) => {
    const lastSent = (r.digest_last_sent_at as string | null) ?? null;
    return !lastSent || lastSent < sixDaysAgo;
  });

  if (rows.length === 0) return [];

  // Resolve emails via auth.users for any assignment whose contact_email
  // is null. This mirrors the ops-brief recipient pattern.
  const missingEmailIds = rows
    .filter((r) => !(r.contact_email as string | null))
    .map((r) => r.user_id as string);

  const emailById = new Map<string, string>();
  if (missingEmailIds.length > 0) {
    const { data: authUsers } = await sb
      .schema('auth')
      .from('users')
      .select('id, email')
      .in('id', missingEmailIds);
    for (const u of authUsers ?? []) {
      if (u.email) emailById.set(u.id as string, u.email as string);
    }
  }

  const recipients: DigestRecipient[] = [];
  for (const row of rows) {
    const uid = row.user_id as string;
    const contactEmail =
      ((row.contact_email as string | null) ?? null) || emailById.get(uid) || null;
    recipients.push({
      assignmentId: row.id as string,
      userId: uid,
      stateCode: row.state_code as USPSStateCode,
      organizationName: row.organization_name as string,
      contactEmail,
      digestDayOfWeek: row.digest_day_of_week as number,
      digestLastSentAt: (row.digest_last_sent_at as string | null) ?? null,
    });
  }
  return recipients;
}

// ----------------------------------------------------------------------------
// Recipient mutations
// ----------------------------------------------------------------------------

/**
 * Stamp digest_last_sent_at after a successful send. Non-fatal on failure.
 */
export async function markDigestSent(assignmentId: string): Promise<void> {
  const sb = getServiceRoleClient();
  const { error } = await sb
    .from('state_ad_assignments')
    .update({ digest_last_sent_at: new Date().toISOString() })
    .eq('id', assignmentId);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[state-ad-digest] markDigestSent failed', {
      assignmentId,
      error: error.message,
    });
  }
}

/**
 * Toggle a single assignment's digest_enabled + digest_day_of_week. Called
 * from the AD-portal settings page (authenticated AD mutating their own
 * assignment) and from the admin surface (authorized admin mutating
 * anyone). Access control lives on the caller.
 *
 * `userUpdating` is captured so callers can branch on authorization
 * without us re-deriving it. We don't write admin_audit_log from here
 * — the admin force-send route does that; settings-toggle is a
 * user-directed self-change.
 */
export async function toggleDigest(
  assignmentId: string,
  enabled: boolean,
  userUpdating: string,
  dayOfWeek?: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getServiceRoleClient();
  const update: Record<string, unknown> = { digest_enabled: enabled };
  if (typeof dayOfWeek === 'number' && dayOfWeek >= 0 && dayOfWeek <= 6) {
    update.digest_day_of_week = Math.floor(dayOfWeek);
  }
  const { error } = await sb
    .from('state_ad_assignments')
    .update(update)
    .eq('id', assignmentId);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[state-ad-digest] toggleDigest failed', {
      assignmentId,
      userUpdating,
      error: error.message,
    });
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Load a single assignment, used by the admin force-send route to
 * materialize the payload. Returns null if not found or deactivated.
 */
export async function getAssignmentForDigest(
  assignmentId: string
): Promise<DigestRecipient | null> {
  const sb = getServiceRoleClient();
  const { data } = await sb
    .from('state_ad_assignments')
    .select(
      'id, user_id, state_code, organization_name, contact_email, digest_enabled, digest_last_sent_at, digest_day_of_week, deactivated_at'
    )
    .eq('id', assignmentId)
    .maybeSingle();
  if (!data) return null;
  if (data.deactivated_at) return null;

  let email = (data.contact_email as string | null) ?? null;
  if (!email) {
    const { data: authUser } = await sb
      .schema('auth')
      .from('users')
      .select('email')
      .eq('id', data.user_id as string)
      .maybeSingle();
    email = (authUser?.email as string | null) ?? null;
  }

  return {
    assignmentId: data.id as string,
    userId: data.user_id as string,
    stateCode: data.state_code as USPSStateCode,
    organizationName: data.organization_name as string,
    contactEmail: email,
    digestDayOfWeek: data.digest_day_of_week as number,
    digestLastSentAt: (data.digest_last_sent_at as string | null) ?? null,
  };
}

/**
 * List every active assignment (for the admin state-ad-digest page).
 * Includes digest prefs + send history.
 */
export interface AdminDigestRow extends DigestRecipient {
  activatedAt: string;
  digestEnabled: boolean;
}

export async function listAllAssignmentsForAdmin(): Promise<AdminDigestRow[]> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('state_ad_assignments')
    .select(
      'id, user_id, state_code, organization_name, contact_email, digest_enabled, digest_last_sent_at, digest_day_of_week, activated_at'
    )
    .is('deactivated_at', null)
    .order('state_code', { ascending: true })
    .order('activated_at', { ascending: true })
    .limit(500);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[state-ad-digest] listAllAssignmentsForAdmin failed', error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    assignmentId: row.id as string,
    userId: row.user_id as string,
    stateCode: row.state_code as USPSStateCode,
    organizationName: row.organization_name as string,
    contactEmail: (row.contact_email as string | null) ?? null,
    digestDayOfWeek: row.digest_day_of_week as number,
    digestLastSentAt: (row.digest_last_sent_at as string | null) ?? null,
    digestEnabled: (row.digest_enabled as boolean | null) ?? true,
    activatedAt: row.activated_at as string,
  }));
}
