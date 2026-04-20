/**
 * HS-NIL OPS-BRIEF — Daily Ops Digest Aggregator
 * ----------------------------------------------------------------------------
 * The founder + ops lead currently click through 8 admin queue pages to
 * know what needs attention today. This module collapses that into a
 * single at-a-glance brief. One email / one page / 60 seconds.
 *
 * Design tenets
 * ─────────────
 *   1. Fail-soft aggregation. Every domain collector is wrapped in
 *      `Promise.allSettled` so one broken signal (e.g. a co-agent's
 *      migration not yet applied) never blanks the whole brief. A
 *      collector that throws surfaces as
 *      { unavailable: true, error: <message> } — the email renders
 *      "data unavailable" for that section and keeps going.
 *
 *   2. Urgency tiers per-domain (see thresholds near each collector).
 *      Clear / warn / urgent — the email color-codes and the page
 *      badges it, so the ops lead can eyeball priority.
 *
 *   3. Count-first, preview-second. Each collector returns a scalar
 *      count, a small `preview: Array<{ id, summary }>` of the worst
 *      offenders (max 5), an `urgency` tier, and a `deepLink` to the
 *      underlying admin queue page. Totals are summed at the top so
 *      the subject line can read "23 items — 3 urgent".
 *
 *   4. Range-scoped. `collectDailyOpsBrief(rangeStart, rangeEnd)` is
 *      the top-level entry point. Most collectors use (rangeEnd - 24h,
 *      rangeEnd) but a few bake in their own windows (disputes look at
 *      ALL open, not last-24h). The range is passed through so the
 *      admin page can render "today" while a cron backfill can ask for
 *      a different window without patching every collector.
 *
 *   5. Read-only. Every query is SELECT. No state mutation here — the
 *      cron is the only caller that writes, and the only row it writes
 *      is profiles.ops_brief_sent_at.
 *
 * SQL origins are documented inline at each collector so future ops
 * debugging can trace numbers back to tables.
 */

import {
  createClient as createServiceClient,
  type SupabaseClient,
} from '@supabase/supabase-js';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type OpsBriefUrgency = 'clear' | 'warn' | 'urgent';

export interface OpsBriefPreview {
  id: string;
  summary: string;
}

export interface OpsBriefDomainStatus {
  /** Primary scalar — shown in the tally row. */
  count: number;
  /** Up to 5 worst-offender rows for inline display. */
  preview: OpsBriefPreview[];
  /** clear / warn / urgent. Drives email color coding. */
  urgency: OpsBriefUrgency;
  /** Relative path to the admin page the ops lead should click. */
  deepLink: string;
  /**
   * Short (≤120 char) one-liner describing the state in English
   * ("3 overdue by > 7 days"). Shown under the domain title.
   */
  summary: string;
  /** If the collector failed, this carries the error message. */
  unavailable?: boolean;
  error?: string;
  /** Extra signals the page / email may want to render. */
  extra?: Record<string, number | string | null>;
}

export interface OpsBriefRange {
  rangeStart: string;
  rangeEnd: string;
}

export interface DailyOpsBrief {
  generatedAt: string;
  rangeStart: string;
  rangeEnd: string;
  tally: {
    total: number;
    urgent: number;
    warn: number;
  };
  domains: {
    disclosures: OpsBriefDomainStatus;
    transcripts: OpsBriefDomainStatus;
    parentLinks: OpsBriefDomainStatus;
    disputes: OpsBriefDomainStatus;
    deferredPayouts: OpsBriefDomainStatus;
    expiringConsents: OpsBriefDomainStatus;
    regulatoryChanges: OpsBriefDomainStatus;
    waitlistInflow: OpsBriefDomainStatus;
    dealActivity: OpsBriefDomainStatus;
    brandOnboarding: OpsBriefDomainStatus;
    payoutFailures: OpsBriefDomainStatus;
    moderationQueue: OpsBriefDomainStatus;
  };
}

// ----------------------------------------------------------------------------
// Service-role client
// ----------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil ops-brief] Supabase service role not configured (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function hoursBetween(laterIso: string | null | undefined, earlierIso: string): number | null {
  if (!laterIso) return null;
  const later = new Date(laterIso).getTime();
  const earlier = new Date(earlierIso).getTime();
  if (!Number.isFinite(later) || !Number.isFinite(earlier)) return null;
  return Math.round((later - earlier) / (60 * 60 * 1000));
}

function daysBetween(laterIso: string, earlierIso: string): number {
  const later = new Date(laterIso).getTime();
  const earlier = new Date(earlierIso).getTime();
  if (!Number.isFinite(later) || !Number.isFinite(earlier)) return 0;
  return Math.max(0, Math.round((later - earlier) / (24 * 60 * 60 * 1000)));
}

function unavailable(deepLink: string, err: unknown): OpsBriefDomainStatus {
  const message = err instanceof Error ? err.message : String(err);
  return {
    count: 0,
    preview: [],
    urgency: 'clear',
    deepLink,
    summary: 'Data unavailable — source query failed.',
    unavailable: true,
    error: message,
  };
}

function emptyDomain(deepLink: string, summary: string): OpsBriefDomainStatus {
  return { count: 0, preview: [], urgency: 'clear', deepLink, summary };
}

// ----------------------------------------------------------------------------
// 1. Disclosures
//   Sources: hs_deal_disclosures
//   Urgency: urgent if any failed; warn if pending > 50
// ----------------------------------------------------------------------------

export async function collectDisclosureQueueStatus(): Promise<OpsBriefDomainStatus> {
  const deepLink = '/hs/admin/disclosures';
  try {
    const sb = getServiceRoleClient();
    const nowIso = new Date().toISOString();

    const [failedRes, pendingRes, overdueRes] = await Promise.all([
      sb
        .from('hs_deal_disclosures')
        .select('id, deal_id, state_code, failure_reason, recipient, created_at', {
          count: 'exact',
        })
        .eq('status', 'failed')
        .order('created_at', { ascending: true })
        .limit(5),
      sb
        .from('hs_deal_disclosures')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      sb
        .from('hs_deal_disclosures')
        .select('id, deal_id, state_code, scheduled_for', { count: 'exact' })
        .eq('status', 'pending')
        .lt('scheduled_for', nowIso)
        .order('scheduled_for', { ascending: true })
        .limit(5),
    ]);

    const failed = failedRes.count ?? 0;
    const pending = pendingRes.count ?? 0;
    const overdue = overdueRes.count ?? 0;

    let urgency: OpsBriefUrgency = 'clear';
    if (failed > 0) urgency = 'urgent';
    else if (pending > 50 || overdue > 0) urgency = 'warn';

    const previewRows = (failedRes.data ?? []).map((row) => ({
      id: row.id as string,
      summary: `${row.state_code} · ${
        (row.failure_reason as string | null)?.slice(0, 60) ?? 'no failure reason'
      }`,
    }));
    if (previewRows.length === 0 && (overdueRes.data ?? []).length > 0) {
      for (const row of overdueRes.data ?? []) {
        previewRows.push({
          id: row.id as string,
          summary: `${row.state_code} · scheduled ${new Date(
            row.scheduled_for as string
          ).toISOString().slice(0, 16)}Z (overdue)`,
        });
        if (previewRows.length >= 5) break;
      }
    }

    return {
      count: failed + overdue,
      preview: previewRows,
      urgency,
      deepLink,
      summary: `${failed} failed · ${overdue} pending past schedule · ${pending} pending total`,
      extra: { failed, pending, overdue },
    };
  } catch (err) {
    return unavailable(deepLink, err);
  }
}

// ----------------------------------------------------------------------------
// 2. Transcripts
//   Sources: transcript_submissions
//   Urgency: warn if pending > 10; urgent if oldest > 7 days
// ----------------------------------------------------------------------------

export async function collectTranscriptQueueStatus(
  range?: OpsBriefRange
): Promise<OpsBriefDomainStatus> {
  const deepLink = '/hs/admin/transcripts';
  try {
    const sb = getServiceRoleClient();
    const rangeEnd = range?.rangeEnd ?? new Date().toISOString();
    const todayStart = new Date(new Date(rangeEnd).getTime() - 24 * 60 * 60 * 1000).toISOString();

    const [pendingRes, oldestRes, rejectedTodayRes] = await Promise.all([
      sb
        .from('transcript_submissions')
        .select('id, athlete_user_id, claimed_gpa, created_at', { count: 'exact' })
        .eq('status', 'pending_review')
        .order('created_at', { ascending: true })
        .limit(5),
      sb
        .from('transcript_submissions')
        .select('id, created_at')
        .eq('status', 'pending_review')
        .order('created_at', { ascending: true })
        .limit(1),
      sb
        .from('transcript_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'rejected')
        .gte('reviewed_at', todayStart)
        .lt('reviewed_at', rangeEnd),
    ]);

    const pending = pendingRes.count ?? 0;
    const rejectedToday = rejectedTodayRes.count ?? 0;
    const oldestIso =
      (oldestRes.data ?? [])[0]?.created_at as string | undefined;
    const oldestDays = oldestIso ? daysBetween(rangeEnd, oldestIso) : 0;

    let urgency: OpsBriefUrgency = 'clear';
    if (oldestDays > 7) urgency = 'urgent';
    else if (pending > 10) urgency = 'warn';

    const preview = (pendingRes.data ?? []).map((row) => ({
      id: row.id as string,
      summary: `Athlete ${(row.athlete_user_id as string).slice(0, 8)} · claimed GPA ${Number(
        row.claimed_gpa
      ).toFixed(2)} · waiting ${daysBetween(rangeEnd, row.created_at as string)}d`,
    }));

    return {
      count: pending,
      preview,
      urgency,
      deepLink,
      summary:
        pending === 0
          ? 'Queue clear.'
          : `${pending} pending · oldest ${oldestDays}d · ${rejectedToday} rejected today`,
      extra: { pending, oldestDays, rejectedToday },
    };
  } catch (err) {
    return unavailable(deepLink, err);
  }
}

// ----------------------------------------------------------------------------
// 3. Parent-athlete link verification
//   Sources: hs_parent_athlete_links
//   Urgency: warn if any > 3 days unverified; urgent if any > 7 days
// ----------------------------------------------------------------------------

export async function collectParentLinkStatus(): Promise<OpsBriefDomainStatus> {
  const deepLink = '/hs/admin/links';
  try {
    const sb = getServiceRoleClient();
    const now = Date.now();
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [allRes, aggedRes] = await Promise.all([
      sb
        .from('hs_parent_athlete_links')
        .select('id, parent_profile_id, athlete_user_id, relationship, created_at', {
          count: 'exact',
        })
        .is('verified_at', null)
        .lt('created_at', threeDaysAgo)
        .order('created_at', { ascending: true })
        .limit(5),
      sb
        .from('hs_parent_athlete_links')
        .select('id', { count: 'exact', head: true })
        .is('verified_at', null)
        .lt('created_at', sevenDaysAgo),
    ]);

    const stale = allRes.count ?? 0;
    const veryStale = aggedRes.count ?? 0;

    let urgency: OpsBriefUrgency = 'clear';
    if (veryStale > 0) urgency = 'urgent';
    else if (stale > 0) urgency = 'warn';

    const nowIso = new Date().toISOString();
    const preview = (allRes.data ?? []).map((row) => ({
      id: row.id as string,
      summary: `${(row.relationship as string) === 'legal_guardian' ? 'Guardian' : 'Parent'} → athlete ${(
        row.athlete_user_id as string
      ).slice(0, 8)} · ${daysBetween(nowIso, row.created_at as string)}d unverified`,
    }));

    return {
      count: stale,
      preview,
      urgency,
      deepLink,
      summary:
        stale === 0
          ? 'No stale link requests.'
          : `${stale} unverified > 3d${veryStale > 0 ? ` · ${veryStale} > 7d` : ''}`,
      extra: { stale, veryStale },
    };
  } catch (err) {
    return unavailable(deepLink, err);
  }
}

// ----------------------------------------------------------------------------
// 4. Dispute SLA
//   Sources: deal_disputes
//   Urgency: urgent if any open > 7 days; warn if any high-priority open > 3d
// ----------------------------------------------------------------------------

export async function collectDisputeSLAStatus(): Promise<OpsBriefDomainStatus> {
  const deepLink = '/hs/admin/disputes';
  try {
    const sb = getServiceRoleClient();
    const nowIso = new Date().toISOString();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [openRes, breachedRes, warnRes] = await Promise.all([
      sb
        .from('deal_disputes')
        .select('id, deal_id, reason_category, priority, status, created_at', {
          count: 'exact',
        })
        .in('status', ['open', 'under_review'])
        .order('created_at', { ascending: true })
        .limit(5),
      sb
        .from('deal_disputes')
        .select('id', { count: 'exact', head: true })
        .in('status', ['open', 'under_review'])
        .lt('created_at', sevenDaysAgo),
      sb
        .from('deal_disputes')
        .select('id', { count: 'exact', head: true })
        .in('status', ['open', 'under_review'])
        .in('priority', ['high', 'urgent'])
        .lt('created_at', threeDaysAgo),
    ]);

    const open = openRes.count ?? 0;
    const breached = breachedRes.count ?? 0;
    const highWarn = warnRes.count ?? 0;

    let urgency: OpsBriefUrgency = 'clear';
    if (breached > 0) urgency = 'urgent';
    else if (highWarn > 0) urgency = 'warn';

    const preview = (openRes.data ?? []).map((row) => ({
      id: row.id as string,
      summary: `${row.priority} · ${(row.reason_category as string).replace(/_/g, ' ')} · ${daysBetween(
        nowIso,
        row.created_at as string
      )}d open`,
    }));

    return {
      count: open,
      preview,
      urgency,
      deepLink,
      summary:
        open === 0
          ? 'No open disputes.'
          : `${open} open · ${breached} > 7d · ${highWarn} high-priority > 3d`,
      extra: { open, breached, highWarn },
    };
  } catch (err) {
    return unavailable(deepLink, err);
  }
}

// ----------------------------------------------------------------------------
// 5. Deferred payouts eligible today
//   Sources: hs_deferred_payouts
//   Urgency: warn if any eligible-today still holding; urgent if any overdue > 1d
// ----------------------------------------------------------------------------

export async function collectDeferredPayoutTodayStatus(): Promise<OpsBriefDomainStatus> {
  const deepLink = '/hs/admin/deferred-payouts';
  try {
    const sb = getServiceRoleClient();
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const nowIso = now.toISOString();

    const [eligibleRes, overdueRes] = await Promise.all([
      sb
        .from('hs_deferred_payouts')
        .select('id, deal_id, athlete_user_id, amount_cents, release_eligible_at', {
          count: 'exact',
        })
        .eq('status', 'holding')
        .lte('release_eligible_at', tomorrow)
        .order('release_eligible_at', { ascending: true })
        .limit(5),
      sb
        .from('hs_deferred_payouts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'holding')
        .lt('release_eligible_at', oneDayAgo),
    ]);

    const eligible = eligibleRes.count ?? 0;
    const overdue = overdueRes.count ?? 0;

    let urgency: OpsBriefUrgency = 'clear';
    if (overdue > 0) urgency = 'urgent';
    else if (eligible > 0) urgency = 'warn';

    const preview = (eligibleRes.data ?? []).map((row) => {
      const amount = Number(row.amount_cents) / 100;
      const eligibleAt = row.release_eligible_at as string;
      const hoursUntil = hoursBetween(eligibleAt, nowIso);
      return {
        id: row.id as string,
        summary: `$${amount.toFixed(2)} · deal ${(row.deal_id as string).slice(0, 8)} · ${
          hoursUntil === null
            ? 'release scheduled'
            : hoursUntil <= 0
              ? `overdue ${Math.abs(hoursUntil)}h`
              : `eligible in ${hoursUntil}h`
        }`,
      };
    });

    return {
      count: eligible,
      preview,
      urgency,
      deepLink,
      summary:
        eligible === 0
          ? 'No releases due in next 24h.'
          : `${eligible} releasing within 24h · ${overdue} overdue > 1d`,
      extra: { eligible, overdue },
    };
  } catch (err) {
    return unavailable(deepLink, err);
  }
}

// ----------------------------------------------------------------------------
// 6. Expiring consents
//   Sources: parental_consents
//   Urgency: warn if any within 3 days; urgent if any < 24h
// ----------------------------------------------------------------------------

export async function collectExpiringConsentsStatus(): Promise<OpsBriefDomainStatus> {
  const deepLink = '/hs/admin/consents';
  try {
    const sb = getServiceRoleClient();
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const in72h = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = now.toISOString();

    const [soonRes, in3Res, in24Res] = await Promise.all([
      sb
        .from('parental_consents')
        .select('id, athlete_user_id, parent_full_name, expires_at', {
          count: 'exact',
        })
        .is('revoked_at', null)
        .gte('expires_at', nowIso)
        .lte('expires_at', in7d)
        .order('expires_at', { ascending: true })
        .limit(5),
      sb
        .from('parental_consents')
        .select('id', { count: 'exact', head: true })
        .is('revoked_at', null)
        .gte('expires_at', nowIso)
        .lte('expires_at', in72h),
      sb
        .from('parental_consents')
        .select('id', { count: 'exact', head: true })
        .is('revoked_at', null)
        .gte('expires_at', nowIso)
        .lte('expires_at', in24h),
    ]);

    const soon = soonRes.count ?? 0;
    const in3 = in3Res.count ?? 0;
    const in24 = in24Res.count ?? 0;

    let urgency: OpsBriefUrgency = 'clear';
    if (in24 > 0) urgency = 'urgent';
    else if (in3 > 0) urgency = 'warn';

    const preview = (soonRes.data ?? []).map((row) => {
      const expires = new Date(row.expires_at as string);
      const hoursUntil = Math.round((expires.getTime() - now.getTime()) / (60 * 60 * 1000));
      return {
        id: row.id as string,
        summary: `${row.parent_full_name} · expires in ${hoursUntil <= 24 ? `${hoursUntil}h` : `${Math.ceil(hoursUntil / 24)}d`}`,
      };
    });

    return {
      count: soon,
      preview,
      urgency,
      deepLink,
      summary:
        soon === 0
          ? 'No consents expiring in 7 days.'
          : `${soon} expire within 7d · ${in3} within 3d · ${in24} within 24h`,
      extra: { soon, in3, in24 },
    };
  } catch (err) {
    return unavailable(deepLink, err);
  }
}

// ----------------------------------------------------------------------------
// 7. Regulatory changes
//   Sources: regulatory_change_events + regulatory_monitor_sources
//   Urgency: warn if any unreviewed from last 48h; urgent if rule_change keyword
//            hit + unreviewed > 24h
// ----------------------------------------------------------------------------

export async function collectRegulatoryChangeStatus(): Promise<OpsBriefDomainStatus> {
  const deepLink = '/hs/admin/regulatory-monitor';
  try {
    const sb = getServiceRoleClient();
    const now = Date.now();
    const last24hIso = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const last48hIso = new Date(now - 48 * 60 * 60 * 1000).toISOString();

    const [recentRes, keywordRes, totalUnreviewedRes] = await Promise.all([
      sb
        .from('regulatory_change_events')
        .select('id, source_id, detected_at, diff_summary', { count: 'exact' })
        .is('reviewed_at', null)
        .gte('detected_at', last48hIso)
        .order('detected_at', { ascending: false })
        .limit(5),
      sb
        .from('regulatory_change_events')
        .select('id', { count: 'exact', head: true })
        .is('reviewed_at', null)
        .lt('detected_at', last24hIso)
        .ilike('diff_summary', '%keyword%'),
      sb
        .from('regulatory_change_events')
        .select('id', { count: 'exact', head: true })
        .is('reviewed_at', null),
    ]);

    const recent = recentRes.count ?? 0;
    const keywordHit = keywordRes.count ?? 0;
    const totalUnreviewed = totalUnreviewedRes.count ?? 0;

    let urgency: OpsBriefUrgency = 'clear';
    if (keywordHit > 0) urgency = 'urgent';
    else if (recent > 0) urgency = 'warn';

    const preview = (recentRes.data ?? []).map((row) => ({
      id: row.id as string,
      summary: `${(row.diff_summary as string | null)?.slice(0, 80) ?? 'change detected'}`,
    }));

    return {
      count: totalUnreviewed,
      preview,
      urgency,
      deepLink,
      summary:
        totalUnreviewed === 0
          ? 'No unreviewed regulatory changes.'
          : `${totalUnreviewed} unreviewed · ${recent} in last 48h · ${keywordHit} keyword-match > 24h`,
      extra: { totalUnreviewed, recent, keywordHit },
    };
  } catch (err) {
    // Co-agent's migration may not be applied — fail-soft to "unavailable".
    return unavailable(deepLink, err);
  }
}

// ----------------------------------------------------------------------------
// 8. Waitlist inflow (last 24h)
//   Sources: hs_waitlist
//   Urgency: never urgent — informational only. warn if a single state > 25.
// ----------------------------------------------------------------------------

export async function collectWaitlistInflowStatus(
  range?: OpsBriefRange
): Promise<OpsBriefDomainStatus> {
  const deepLink = '/hs/admin';
  try {
    const sb = getServiceRoleClient();
    const rangeEnd = range?.rangeEnd ?? new Date().toISOString();
    const rangeStart =
      range?.rangeStart ?? new Date(new Date(rangeEnd).getTime() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await sb
      .from('hs_waitlist')
      .select('id, email, role, state_code, created_at', { count: 'exact' })
      .gte('created_at', rangeStart)
      .lt('created_at', rangeEnd)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;
    const rows = data ?? [];
    const total = rows.length;

    const byState = new Map<string, number>();
    const byRole = new Map<string, number>();
    for (const r of rows) {
      const s = (r.state_code as string) ?? 'unknown';
      const role = (r.role as string) ?? 'unknown';
      byState.set(s, (byState.get(s) ?? 0) + 1);
      byRole.set(role, (byRole.get(role) ?? 0) + 1);
    }
    const topStateEntry = [...byState.entries()].sort((a, b) => b[1] - a[1])[0];
    const hotState = topStateEntry && topStateEntry[1] > 25 ? topStateEntry[0] : null;

    const stateSummary = [...byState.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([s, n]) => `${s}:${n}`)
      .join(' · ');
    const roleSummary = [...byRole.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([r, n]) => `${r}:${n}`)
      .join(' · ');

    const urgency: OpsBriefUrgency = hotState ? 'warn' : 'clear';

    const preview = rows.slice(0, 5).map((r) => ({
      id: r.id as string,
      summary: `${r.role} · ${r.state_code} · ${r.email}`,
    }));

    return {
      count: total,
      preview,
      urgency,
      deepLink,
      summary:
        total === 0
          ? 'No waitlist signups in window.'
          : `${total} signups · ${stateSummary} · roles ${roleSummary}`,
      extra: { total, topState: topStateEntry?.[0] ?? null, topStateCount: topStateEntry?.[1] ?? 0 },
    };
  } catch (err) {
    return unavailable(deepLink, err);
  }
}

// ----------------------------------------------------------------------------
// 9. Deal activity (yesterday + today)
//   Sources: deals (target_bracket='high_school')
//   Urgency: informational only.
// ----------------------------------------------------------------------------

export async function collectDealActivityStatus(
  range?: OpsBriefRange
): Promise<OpsBriefDomainStatus> {
  const deepLink = '/hs/admin/analytics';
  try {
    const sb = getServiceRoleClient();
    const now = range?.rangeEnd ?? new Date().toISOString();
    const day1Ago = new Date(new Date(now).getTime() - 24 * 60 * 60 * 1000).toISOString();
    const day2Ago = new Date(new Date(now).getTime() - 48 * 60 * 60 * 1000).toISOString();

    const [signedTodayRes, signedYestRes, completedRes, reviewedRes] = await Promise.all([
      sb
        .from('deals')
        .select('id', { count: 'exact', head: true })
        .eq('target_bracket', 'high_school')
        .in('status', ['accepted', 'active', 'in_progress', 'completed', 'paid'])
        .gte('updated_at', day1Ago)
        .lt('updated_at', now),
      sb
        .from('deals')
        .select('id', { count: 'exact', head: true })
        .eq('target_bracket', 'high_school')
        .in('status', ['accepted', 'active', 'in_progress', 'completed', 'paid'])
        .gte('updated_at', day2Ago)
        .lt('updated_at', day1Ago),
      sb
        .from('deals')
        .select('id, title, updated_at', { count: 'exact' })
        .eq('target_bracket', 'high_school')
        .in('status', ['completed', 'paid'])
        .gte('updated_at', day1Ago)
        .lt('updated_at', now)
        .order('updated_at', { ascending: false })
        .limit(5),
      sb
        .from('deal_approvals')
        .select('id', { count: 'exact', head: true })
        .gte('reviewed_at', day1Ago)
        .lt('reviewed_at', now),
    ]);

    const signedToday = signedTodayRes.count ?? 0;
    const signedYest = signedYestRes.count ?? 0;
    const completedToday = completedRes.count ?? 0;
    const reviewedToday = reviewedRes.count ?? 0;

    const preview = (completedRes.data ?? []).map((row) => ({
      id: row.id as string,
      summary: `${(row.title as string)?.slice(0, 60) ?? 'Untitled'} · completed`,
    }));

    return {
      count: signedToday,
      preview,
      urgency: 'clear',
      deepLink,
      summary: `${signedToday} signed today (${signedYest} yesterday) · ${completedToday} completed · ${reviewedToday} approvals`,
      extra: { signedToday, signedYest, completedToday, reviewedToday },
    };
  } catch (err) {
    return unavailable(deepLink, err);
  }
}

// ----------------------------------------------------------------------------
// 10. Brand onboarding (last 7 days)
//   Sources: brands.is_hs_enabled
//   Urgency: informational only.
// ----------------------------------------------------------------------------

export async function collectBrandOnboardingStatus(
  range?: OpsBriefRange
): Promise<OpsBriefDomainStatus> {
  const deepLink = '/hs/admin/analytics';
  try {
    const sb = getServiceRoleClient();
    const rangeEnd = range?.rangeEnd ?? new Date().toISOString();
    const sevenDaysAgo = new Date(
      new Date(rangeEnd).getTime() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data, error, count } = await sb
      .from('brands')
      .select('id, company_name, industry, created_at', { count: 'exact' })
      .eq('is_hs_enabled', true)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    const total = count ?? 0;
    const preview = (data ?? []).map((row) => ({
      id: row.id as string,
      summary: `${row.company_name} · ${(row.industry as string | null) ?? 'unspecified'}`,
    }));

    return {
      count: total,
      preview,
      urgency: 'clear',
      deepLink,
      summary:
        total === 0
          ? 'No new HS-enabled brands in last 7 days.'
          : `${total} new HS-enabled brands in last 7d`,
      extra: { total },
    };
  } catch (err) {
    return unavailable(deepLink, err);
  }
}

// ----------------------------------------------------------------------------
// 11. Payout failures (last 7 days)
//   Sources: hs_deal_parent_payouts
//   Urgency: urgent if any failed in last 24h not resolved.
// ----------------------------------------------------------------------------

export async function collectPayoutFailureStatus(): Promise<OpsBriefDomainStatus> {
  const deepLink = '/hs/admin/payouts';
  try {
    const sb = getServiceRoleClient();
    const now = Date.now();
    const last24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [allFailedRes, recentFailedRes] = await Promise.all([
      sb
        .from('hs_deal_parent_payouts')
        .select(
          'id, deal_id, payout_amount, payout_currency, failed_reason, created_at',
          { count: 'exact' }
        )
        .eq('status', 'failed')
        .gte('created_at', last7d)
        .order('created_at', { ascending: false })
        .limit(5),
      sb
        .from('hs_deal_parent_payouts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('created_at', last24h),
    ]);

    const allFailed = allFailedRes.count ?? 0;
    const recentFailed = recentFailedRes.count ?? 0;

    let urgency: OpsBriefUrgency = 'clear';
    if (recentFailed > 0) urgency = 'urgent';
    else if (allFailed > 0) urgency = 'warn';

    const preview = (allFailedRes.data ?? []).map((row) => ({
      id: row.id as string,
      summary: `${Number(row.payout_amount).toFixed(2)} ${row.payout_currency} · ${
        (row.failed_reason as string | null)?.slice(0, 60) ?? 'no reason recorded'
      }`,
    }));

    return {
      count: allFailed,
      preview,
      urgency,
      deepLink,
      summary:
        allFailed === 0
          ? 'No failed payouts in last 7 days.'
          : `${allFailed} failed in last 7d · ${recentFailed} in last 24h`,
      extra: { allFailed, recentFailed },
    };
  } catch (err) {
    return unavailable(deepLink, err);
  }
}

// ----------------------------------------------------------------------------
// 12. Moderation queue
//   Sources: deliverable_moderation_results
//   Urgency: warn if queue depth > 5; urgent if any flagged > 3 days
// ----------------------------------------------------------------------------

export async function collectModerationQueueStatus(): Promise<OpsBriefDomainStatus> {
  const deepLink = '/hs/admin/moderation';
  try {
    const sb = getServiceRoleClient();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const [openRes, agedRes] = await Promise.all([
      sb
        .from('deliverable_moderation_results')
        .select('id, submission_id, auto_categories, auto_reasons, created_at', {
          count: 'exact',
        })
        .in('status', ['flagged', 'ops_reviewing'])
        .order('created_at', { ascending: true })
        .limit(5),
      sb
        .from('deliverable_moderation_results')
        .select('id', { count: 'exact', head: true })
        .in('status', ['flagged', 'ops_reviewing'])
        .lt('created_at', threeDaysAgo),
    ]);

    const open = openRes.count ?? 0;
    const aged = agedRes.count ?? 0;

    let urgency: OpsBriefUrgency = 'clear';
    if (aged > 0) urgency = 'urgent';
    else if (open > 5) urgency = 'warn';

    const preview = (openRes.data ?? []).map((row) => ({
      id: row.id as string,
      summary: `${
        (row.auto_reasons as string[] | null)?.[0] ??
        (row.auto_categories as string[] | null)?.join(', ') ??
        'human review default'
      }`.slice(0, 80),
    }));

    return {
      count: open,
      preview,
      urgency,
      deepLink,
      summary:
        open === 0
          ? 'Moderation queue clear.'
          : `${open} flagged${aged > 0 ? ` · ${aged} aging > 3d` : ''}`,
      extra: { open, aged },
    };
  } catch (err) {
    return unavailable(deepLink, err);
  }
}

// ----------------------------------------------------------------------------
// Top-level assembler
// ----------------------------------------------------------------------------

/**
 * Run every collector in parallel via Promise.allSettled. A rejected
 * promise from any single collector degrades to a settled value via
 * each collector's own try/catch, so in practice we rarely see a
 * rejection here — the fail-soft is defense in depth.
 */
export async function collectDailyOpsBrief(
  rangeStart: string,
  rangeEnd: string
): Promise<DailyOpsBrief> {
  const range: OpsBriefRange = { rangeStart, rangeEnd };

  const results = await Promise.allSettled([
    collectDisclosureQueueStatus(),
    collectTranscriptQueueStatus(range),
    collectParentLinkStatus(),
    collectDisputeSLAStatus(),
    collectDeferredPayoutTodayStatus(),
    collectExpiringConsentsStatus(),
    collectRegulatoryChangeStatus(),
    collectWaitlistInflowStatus(range),
    collectDealActivityStatus(range),
    collectBrandOnboardingStatus(range),
    collectPayoutFailureStatus(),
    collectModerationQueueStatus(),
  ]);

  const fallbacks = [
    emptyDomain('/hs/admin/disclosures', 'Data unavailable.'),
    emptyDomain('/hs/admin/transcripts', 'Data unavailable.'),
    emptyDomain('/hs/admin/links', 'Data unavailable.'),
    emptyDomain('/hs/admin/disputes', 'Data unavailable.'),
    emptyDomain('/hs/admin/deferred-payouts', 'Data unavailable.'),
    emptyDomain('/hs/admin/consents', 'Data unavailable.'),
    emptyDomain('/hs/admin/regulatory-monitor', 'Data unavailable.'),
    emptyDomain('/hs/admin', 'Data unavailable.'),
    emptyDomain('/hs/admin/analytics', 'Data unavailable.'),
    emptyDomain('/hs/admin/analytics', 'Data unavailable.'),
    emptyDomain('/hs/admin/payouts', 'Data unavailable.'),
    emptyDomain('/hs/admin/moderation', 'Data unavailable.'),
  ];

  const resolved = results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    const fallback = fallbacks[i];
    return {
      ...fallback,
      unavailable: true,
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });

  const [
    disclosures,
    transcripts,
    parentLinks,
    disputes,
    deferredPayouts,
    expiringConsents,
    regulatoryChanges,
    waitlistInflow,
    dealActivity,
    brandOnboarding,
    payoutFailures,
    moderationQueue,
  ] = resolved;

  const action: OpsBriefDomainStatus[] = [
    disclosures,
    transcripts,
    parentLinks,
    disputes,
    deferredPayouts,
    expiringConsents,
    regulatoryChanges,
    payoutFailures,
    moderationQueue,
  ];

  const tally = {
    total: action.reduce((acc, d) => acc + d.count, 0),
    urgent: action.filter((d) => d.urgency === 'urgent').length,
    warn: action.filter((d) => d.urgency === 'warn').length,
  };

  return {
    generatedAt: new Date().toISOString(),
    rangeStart,
    rangeEnd,
    tally,
    domains: {
      disclosures,
      transcripts,
      parentLinks,
      disputes,
      deferredPayouts,
      expiringConsents,
      regulatoryChanges,
      waitlistInflow,
      dealActivity,
      brandOnboarding,
      payoutFailures,
      moderationQueue,
    },
  };
}

// ----------------------------------------------------------------------------
// Admin recipient roster
// ----------------------------------------------------------------------------

export interface OpsBriefRecipient {
  userId: string;
  email: string;
  name: string | null;
  lastSentAt: string | null;
}

/**
 * Load admin recipients eligible for today's send. Filters out admins
 * whose ops_brief_sent_at is within the idempotency window — the
 * cron can run twice in a day without double-sending.
 */
export async function listEligibleAdminRecipients(
  idempotencyWindowHours = 18
): Promise<OpsBriefRecipient[]> {
  const sb = getServiceRoleClient();
  const cutoff = new Date(
    Date.now() - idempotencyWindowHours * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await sb
    .from('profiles')
    .select('id, first_name, last_name, ops_brief_sent_at, ops_brief_enabled, role')
    .eq('role', 'admin')
    .eq('ops_brief_enabled', true);

  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil ops-brief] admin recipient load failed', error.message);
    return [];
  }

  const rows = data ?? [];
  const userIds = rows.map((r) => r.id as string);
  if (userIds.length === 0) return [];

  // Resolve email via auth.users (service role only).
  const { data: authUsers } = await sb
    .schema('auth')
    .from('users')
    .select('id, email')
    .in('id', userIds);

  const emailById = new Map<string, string>();
  for (const u of authUsers ?? []) {
    if (u.email) emailById.set(u.id as string, u.email as string);
  }

  const recipients: OpsBriefRecipient[] = [];
  for (const row of rows) {
    const id = row.id as string;
    const email = emailById.get(id);
    if (!email) continue;
    const sentAt = (row.ops_brief_sent_at as string | null) ?? null;
    if (sentAt && sentAt > cutoff) continue;
    const fn = (row.first_name as string | null) ?? '';
    const ln = (row.last_name as string | null) ?? '';
    const combined = `${fn} ${ln}`.trim();
    recipients.push({
      userId: id,
      email,
      name: combined || null,
      lastSentAt: sentAt,
    });
  }
  return recipients;
}

/**
 * Stamp ops_brief_sent_at after a successful send. Non-fatal on failure —
 * the email already went out; a missed stamp means the next tick might
 * send again, which the 18h idempotency window bounds.
 */
export async function markBriefSent(userId: string): Promise<void> {
  const sb = getServiceRoleClient();
  const { error } = await sb
    .from('profiles')
    .update({ ops_brief_sent_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil ops-brief] mark-sent failed', {
      userId,
      error: error.message,
    });
  }
}

/**
 * Toggle the opt-in for a given admin. Called from the ops-brief admin
 * page. RLS allows a user to update their own profile — we still route
 * through the service role because the page is already admin-gated.
 */
export async function setOpsBriefEnabled(
  userId: string,
  enabled: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getServiceRoleClient();
  const { error } = await sb
    .from('profiles')
    .update({ ops_brief_enabled: enabled })
    .eq('id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
