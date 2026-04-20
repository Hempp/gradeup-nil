/**
 * Regulatory change monitor — service layer.
 * ============================================================================
 * Best-effort weekly content-hash polling of state-athletic-association pages.
 * Detects that *something* changed on a tracked page; does NOT decide whether
 * the change matters. Admin reviews every detected change manually.
 *
 * What this module does:
 *   1. listSources()            — active sources for the cron + admin console
 *   2. checkSource(sourceId)    — fetch, hash, compare, insert event on change
 *   3. listUnreviewedChanges()  — admin queue
 *   4. reviewChange()           — admin marks event reviewed + writes audit log
 *   5. parseDiff()              — structured keyword-delta heuristic
 *
 * What it does NOT do:
 *   - Auto-update STATE_RULES. Rules stay accurate via manual admin review
 *     triggered by this system. This is the watchtower, not the editor.
 *   - Store page text. We keep SHA-256 hashes only. Keyword detection runs on
 *     the response body in-memory during checkSource() and the *derived*
 *     summary (keywords present, length delta) is what persists.
 *
 * Respectful polling:
 *   - 3s request timeout, up to 3 retries with small backoff
 *   - User-agent identifies as compliance monitoring (not a generic crawler)
 *   - Default 168h (weekly) check interval per source
 *
 * Failure handling:
 *   - Fetch failures (404 / timeout / SSL) do NOT crash the cron. They are
 *     logged as regulatory_change_events with review_outcome='unable_to_parse'
 *     so an admin sees them in the queue next to real changes.
 */

import {
  createClient as createServiceClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import type { USPSStateCode } from './state-rules';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 3_000; // 3s — respectful polling
const FETCH_MAX_RETRIES = 3;
const FETCH_USER_AGENT =
  'GradeUp-HS-Regulatory-Monitor/1.0 (compliance-monitoring; +https://gradeupnil.com)';

/**
 * NIL-rule-relevant keywords. Presence in the *new* content (vs old)
 * prioritizes admin review. Phrases are lowercased before comparison.
 */
const NIL_KEYWORDS = [
  'name, image',
  'likeness',
  'disclosure',
  'parental',
  'consent',
  'agent registration',
  'minimum age',
  'prohibited category',
  'banned categories',
  'escrow',
  'pay-for-play',
  'amateur',
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RegulatorySourceType = 'web_page' | 'rss_feed' | 'announcement_api';

export type RegulatoryReviewOutcome =
  | 'no_change'
  | 'minor_update'
  | 'rule_change'
  | 'unable_to_parse';

export interface RegulatorySource {
  id: string;
  stateCode: USPSStateCode;
  sourceType: RegulatorySourceType;
  sourceUrl: string;
  lastContentHash: string | null;
  lastCheckedAt: string | null;
  lastChangedAt: string | null;
  checkIntervalHours: number;
  active: boolean;
  notes: string | null;
}

export interface RegulatoryChangeEvent {
  id: string;
  sourceId: string;
  detectedAt: string;
  oldHash: string | null;
  newHash: string | null;
  diffSummary: string | null;
  reviewedByAdminId: string | null;
  reviewedAt: string | null;
  reviewOutcome: RegulatoryReviewOutcome | null;
  reviewNotes: string | null;
}

export interface RegulatoryChangeEventWithSource extends RegulatoryChangeEvent {
  source: Pick<
    RegulatorySource,
    'stateCode' | 'sourceUrl' | 'sourceType' | 'notes'
  >;
}

export interface DiffSummary {
  kind: 'changed' | 'first_seen' | 'fetch_failed';
  oldLength: number | null;
  newLength: number | null;
  lengthDelta: number | null;
  newKeywords: string[]; // keywords present in new content but not old
  presentKeywords: string[]; // all NIL keywords present in the new content
  error?: string; // only for fetch_failed
}

export interface CheckSourceResult {
  sourceId: string;
  stateCode: USPSStateCode;
  sourceUrl: string;
  outcome: 'unchanged' | 'changed' | 'first_seen' | 'fetch_failed';
  eventId?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Service-role client
// ---------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[regulatory-monitor] Supabase service role not configured ' +
        '(NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

interface SourceRow {
  id: string;
  state_code: string;
  source_type: RegulatorySourceType;
  source_url: string;
  last_content_hash: string | null;
  last_checked_at: string | null;
  last_changed_at: string | null;
  check_interval_hours: number;
  active: boolean;
  notes: string | null;
}

function mapSource(row: SourceRow): RegulatorySource {
  return {
    id: row.id,
    stateCode: row.state_code as USPSStateCode,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    lastContentHash: row.last_content_hash,
    lastCheckedAt: row.last_checked_at,
    lastChangedAt: row.last_changed_at,
    checkIntervalHours: row.check_interval_hours,
    active: row.active,
    notes: row.notes,
  };
}

interface EventRow {
  id: string;
  source_id: string;
  detected_at: string;
  old_hash: string | null;
  new_hash: string | null;
  diff_summary: string | null;
  reviewed_by_admin_id: string | null;
  reviewed_at: string | null;
  review_outcome: RegulatoryReviewOutcome | null;
  review_notes: string | null;
}

function mapEvent(row: EventRow): RegulatoryChangeEvent {
  return {
    id: row.id,
    sourceId: row.source_id,
    detectedAt: row.detected_at,
    oldHash: row.old_hash,
    newHash: row.new_hash,
    diffSummary: row.diff_summary,
    reviewedByAdminId: row.reviewed_by_admin_id,
    reviewedAt: row.reviewed_at,
    reviewOutcome: row.review_outcome,
    reviewNotes: row.review_notes,
  };
}

// ---------------------------------------------------------------------------
// 1. listSources
// ---------------------------------------------------------------------------

export async function listSources(
  opts: { activeOnly?: boolean } = {}
): Promise<RegulatorySource[]> {
  const sb = getServiceRoleClient();
  const query = sb
    .from('regulatory_monitor_sources')
    .select('*')
    .order('state_code', { ascending: true });

  if (opts.activeOnly) query.eq('active', true);

  const { data, error } = await query;
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[regulatory-monitor] listSources failed', error.message);
    return [];
  }
  return (data ?? []).map((row) => mapSource(row as SourceRow));
}

// ---------------------------------------------------------------------------
// 5. parseDiff — exported so the cron email + review page can reuse it
// ---------------------------------------------------------------------------

/**
 * Heuristic diff. We purposely DO NOT store page text, so the summary is
 * computed in-memory during checkSource() and only the structured result
 * is persisted.
 */
export function parseDiff(
  oldContent: string | null,
  newContent: string
): DiffSummary {
  const newLen = newContent.length;
  const oldLen = oldContent?.length ?? null;
  const lowerNew = newContent.toLowerCase();
  const lowerOld = oldContent ? oldContent.toLowerCase() : '';

  const presentKeywords: string[] = [];
  const newKeywords: string[] = [];
  for (const kw of NIL_KEYWORDS) {
    const inNew = lowerNew.includes(kw);
    if (!inNew) continue;
    presentKeywords.push(kw);
    const inOld = oldContent ? lowerOld.includes(kw) : false;
    if (!inOld) newKeywords.push(kw);
  }

  return {
    kind: oldContent === null ? 'first_seen' : 'changed',
    oldLength: oldLen,
    newLength: newLen,
    lengthDelta: oldLen !== null ? newLen - oldLen : null,
    newKeywords,
    presentKeywords,
  };
}

/**
 * Render a DiffSummary to a compact, stable string we can store in
 * diff_summary. Keep it human-readable; the review UI parses it back
 * via the structured columns or just displays this verbatim.
 */
export function formatDiffSummary(summary: DiffSummary): string {
  if (summary.kind === 'fetch_failed') {
    return `FETCH FAILED: ${summary.error ?? 'unknown error'}`;
  }
  if (summary.kind === 'first_seen') {
    return `FIRST SEEN · length=${summary.newLength} · keywords present: ${
      summary.presentKeywords.length > 0
        ? summary.presentKeywords.join(', ')
        : '(none detected)'
    }`;
  }
  const parts: string[] = [];
  const delta = summary.lengthDelta;
  if (delta !== null) {
    const sign = delta > 0 ? '+' : '';
    parts.push(
      `length ${summary.oldLength}→${summary.newLength} (${sign}${delta})`
    );
  }
  if (summary.newKeywords.length > 0) {
    parts.push(`NEW keywords: ${summary.newKeywords.join(', ')}`);
  } else {
    parts.push('no new NIL keywords detected');
  }
  if (summary.presentKeywords.length > 0) {
    parts.push(`present: ${summary.presentKeywords.join(', ')}`);
  }
  return parts.join(' · ');
}

// ---------------------------------------------------------------------------
// 2. checkSource
// ---------------------------------------------------------------------------

async function fetchWithRetry(url: string): Promise<
  | { ok: true; body: string }
  | { ok: false; error: string }
> {
  let lastError = 'unknown error';
  for (let attempt = 0; attempt < FETCH_MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': FETCH_USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
        cache: 'no-store',
      });
      clearTimeout(timer);
      if (!res.ok) {
        lastError = `HTTP ${res.status} ${res.statusText}`;
        if (res.status >= 400 && res.status < 500) {
          // 4xx is not worth retrying
          return { ok: false, error: lastError };
        }
        continue;
      }
      const body = await res.text();
      return { ok: true, body };
    } catch (err) {
      clearTimeout(timer);
      lastError =
        err instanceof Error
          ? err.name === 'AbortError'
            ? `timeout after ${FETCH_TIMEOUT_MS}ms`
            : err.message
          : String(err);
    }
    // small linear backoff between retries; avoid hammering a sick host
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }
  return { ok: false, error: lastError };
}

function sha256(body: string): string {
  return createHash('sha256').update(body).digest('hex');
}

export async function checkSource(sourceId: string): Promise<CheckSourceResult> {
  const sb = getServiceRoleClient();

  const { data: sourceRow, error: fetchErr } = await sb
    .from('regulatory_monitor_sources')
    .select('*')
    .eq('id', sourceId)
    .maybeSingle();

  if (fetchErr || !sourceRow) {
    return {
      sourceId,
      stateCode: 'CA',
      sourceUrl: '',
      outcome: 'fetch_failed',
      error: fetchErr?.message ?? 'source not found',
    };
  }

  const source = mapSource(sourceRow as SourceRow);
  const now = new Date().toISOString();

  // Fetch
  const fetched = await fetchWithRetry(source.sourceUrl);

  if (!fetched.ok) {
    // Log the failure as an event so the admin queue surfaces it.
    const failSummary: DiffSummary = {
      kind: 'fetch_failed',
      oldLength: null,
      newLength: null,
      lengthDelta: null,
      newKeywords: [],
      presentKeywords: [],
      error: fetched.error,
    };
    const { data: inserted } = await sb
      .from('regulatory_change_events')
      .insert({
        source_id: source.id,
        old_hash: source.lastContentHash,
        new_hash: null,
        diff_summary: formatDiffSummary(failSummary),
        review_outcome: 'unable_to_parse',
      })
      .select('id')
      .single();

    // Record that we tried, even though content didn't land
    await sb
      .from('regulatory_monitor_sources')
      .update({ last_checked_at: now })
      .eq('id', source.id);

    return {
      sourceId: source.id,
      stateCode: source.stateCode,
      sourceUrl: source.sourceUrl,
      outcome: 'fetch_failed',
      eventId: (inserted?.id as string) ?? undefined,
      error: fetched.error,
    };
  }

  const newHash = sha256(fetched.body);

  // Unchanged
  if (source.lastContentHash === newHash) {
    await sb
      .from('regulatory_monitor_sources')
      .update({ last_checked_at: now })
      .eq('id', source.id);
    return {
      sourceId: source.id,
      stateCode: source.stateCode,
      sourceUrl: source.sourceUrl,
      outcome: 'unchanged',
    };
  }

  // Changed (or first-seen)
  // We DO have the previous body only if we were keeping it — we aren't.
  // So diff is done against null for first-seen; for subsequent changes
  // we only know length + keyword presence in the *new* body.
  const summary: DiffSummary = parseDiff(null, fetched.body);
  if (source.lastContentHash !== null) {
    summary.kind = 'changed';
  }

  const { data: inserted, error: insertErr } = await sb
    .from('regulatory_change_events')
    .insert({
      source_id: source.id,
      old_hash: source.lastContentHash,
      new_hash: newHash,
      diff_summary: formatDiffSummary(summary),
    })
    .select('id')
    .single();

  if (insertErr) {
    // eslint-disable-next-line no-console
    console.error('[regulatory-monitor] event insert failed', {
      sourceId: source.id,
      error: insertErr.message,
    });
  }

  await sb
    .from('regulatory_monitor_sources')
    .update({
      last_content_hash: newHash,
      last_checked_at: now,
      last_changed_at: now,
    })
    .eq('id', source.id);

  return {
    sourceId: source.id,
    stateCode: source.stateCode,
    sourceUrl: source.sourceUrl,
    outcome: source.lastContentHash === null ? 'first_seen' : 'changed',
    eventId: (inserted?.id as string) ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// 3. listUnreviewedChanges
// ---------------------------------------------------------------------------

export async function listUnreviewedChanges(
  limit = 50
): Promise<RegulatoryChangeEventWithSource[]> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('regulatory_change_events')
    .select(
      `
      id, source_id, detected_at, old_hash, new_hash, diff_summary,
      reviewed_by_admin_id, reviewed_at, review_outcome, review_notes,
      source:regulatory_monitor_sources (
        state_code, source_url, source_type, notes
      )
    `
    )
    .is('reviewed_at', null)
    .order('detected_at', { ascending: false })
    .limit(limit);

  if (error) {
    // eslint-disable-next-line no-console
    console.error(
      '[regulatory-monitor] listUnreviewedChanges failed',
      error.message
    );
    return [];
  }

  type SourceJoin = {
    state_code: string;
    source_url: string;
    source_type: RegulatorySourceType;
    notes: string | null;
  };
  type JoinedRow = EventRow & {
    source: SourceJoin | SourceJoin[] | null;
  };

  function firstSource(
    s: SourceJoin | SourceJoin[] | null | undefined
  ): SourceJoin | null {
    if (!s) return null;
    return Array.isArray(s) ? (s[0] ?? null) : s;
  }

  return (data ?? []).map((raw) => {
    const row = raw as unknown as JoinedRow;
    const src = firstSource(row.source);
    return {
      ...mapEvent(row),
      source: {
        stateCode: (src?.state_code ?? 'CA') as USPSStateCode,
        sourceUrl: src?.source_url ?? '',
        sourceType: src?.source_type ?? 'web_page',
        notes: src?.notes ?? null,
      },
    };
  });
}

export async function getChangeEvent(
  eventId: string
): Promise<RegulatoryChangeEventWithSource | null> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('regulatory_change_events')
    .select(
      `
      id, source_id, detected_at, old_hash, new_hash, diff_summary,
      reviewed_by_admin_id, reviewed_at, review_outcome, review_notes,
      source:regulatory_monitor_sources (
        state_code, source_url, source_type, notes
      )
    `
    )
    .eq('id', eventId)
    .maybeSingle();

  if (error || !data) return null;

  type SourceJoin = {
    state_code: string;
    source_url: string;
    source_type: RegulatorySourceType;
    notes: string | null;
  };
  type JoinedRow = EventRow & {
    source: SourceJoin | SourceJoin[] | null;
  };
  const row = data as unknown as JoinedRow;
  const src: SourceJoin | null = Array.isArray(row.source)
    ? (row.source[0] ?? null)
    : (row.source ?? null);
  return {
    ...mapEvent(row),
    source: {
      stateCode: (src?.state_code ?? 'CA') as USPSStateCode,
      sourceUrl: src?.source_url ?? '',
      sourceType: src?.source_type ?? 'web_page',
      notes: src?.notes ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// 4. reviewChange
// ---------------------------------------------------------------------------

export interface ReviewChangeInput {
  eventId: string;
  outcome: RegulatoryReviewOutcome;
  notes: string;
  reviewerUserId: string;
}

export type ReviewChangeResult =
  | { ok: true; auditLogId: string | null }
  | { ok: false; error: string; code: 'not_found' | 'invalid_state' | 'db_error' };

export async function reviewChange(
  input: ReviewChangeInput
): Promise<ReviewChangeResult> {
  const { eventId, outcome, notes, reviewerUserId } = input;

  if (
    !['no_change', 'minor_update', 'rule_change', 'unable_to_parse'].includes(
      outcome
    )
  ) {
    return {
      ok: false,
      error: 'Invalid outcome.',
      code: 'invalid_state',
    };
  }
  if (!notes || notes.trim().length < 10) {
    return {
      ok: false,
      error: 'Review notes must be at least 10 characters.',
      code: 'invalid_state',
    };
  }

  const sb = getServiceRoleClient();
  const now = new Date().toISOString();

  const { data: updated, error: updateErr } = await sb
    .from('regulatory_change_events')
    .update({
      reviewed_by_admin_id: reviewerUserId,
      reviewed_at: now,
      review_outcome: outcome,
      review_notes: notes.trim(),
    })
    .eq('id', eventId)
    .select(
      `
      id, source_id, detected_at, old_hash, new_hash, diff_summary,
      reviewed_by_admin_id, reviewed_at, review_outcome, review_notes,
      source:regulatory_monitor_sources ( state_code, source_url )
    `
    )
    .maybeSingle();

  if (updateErr) {
    return { ok: false, error: updateErr.message, code: 'db_error' };
  }
  if (!updated) {
    return {
      ok: false,
      error: 'Change event not found.',
      code: 'not_found',
    };
  }

  // On rule_change we ALSO write an admin_audit_log row so compliance
  // has a durable "we saw + acknowledged this rule shift" trail. Other
  // outcomes are noise-filtering — no audit row.
  let auditLogId: string | null = null;
  if (outcome === 'rule_change') {
    type JoinedRow = {
      source: { state_code: string; source_url: string } | null;
      diff_summary: string | null;
    };
    const row = updated as unknown as JoinedRow;
    const { data: audit, error: auditErr } = await sb
      .from('admin_audit_log')
      .insert({
        actor_user_id: reviewerUserId,
        action: 'regulatory_change_reviewed',
        target_kind: 'regulatory_change_event',
        target_id: eventId,
        reason: notes.trim(),
        metadata: {
          stateCode: row.source?.state_code ?? null,
          sourceUrl: row.source?.source_url ?? null,
          outcome,
          diffSummary: row.diff_summary,
        },
      })
      .select('id')
      .single();

    if (auditErr) {
      // eslint-disable-next-line no-console
      console.error(
        '[regulatory-monitor] audit write failed on rule_change review',
        auditErr.message
      );
    } else {
      auditLogId = (audit?.id as string) ?? null;
    }
  }

  return { ok: true, auditLogId };
}

// ---------------------------------------------------------------------------
// Admin-console signal helpers
// ---------------------------------------------------------------------------

export async function countUnreviewedChanges(): Promise<number> {
  const sb = getServiceRoleClient();
  const { count } = await sb
    .from('regulatory_change_events')
    .select('id', { count: 'exact', head: true })
    .is('reviewed_at', null);
  return count ?? 0;
}

export async function countSourcesStale(days = 14): Promise<number> {
  const sb = getServiceRoleClient();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await sb
    .from('regulatory_monitor_sources')
    .select('id', { count: 'exact', head: true })
    .eq('active', true)
    .or(`last_checked_at.is.null,last_checked_at.lt.${cutoff}`);
  return count ?? 0;
}

/**
 * Placeholder-URL signal. A source is "needing a real URL" if the notes
 * column mentions "Placeholder URL" — that phrase is our seed convention.
 */
export async function countSourcesNeedingRealUrls(): Promise<number> {
  const sb = getServiceRoleClient();
  const { count } = await sb
    .from('regulatory_monitor_sources')
    .select('id', { count: 'exact', head: true })
    .ilike('notes', '%Placeholder URL%');
  return count ?? 0;
}

export async function countChangesInLastDays(days = 7): Promise<number> {
  const sb = getServiceRoleClient();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await sb
    .from('regulatory_change_events')
    .select('id', { count: 'exact', head: true })
    .gte('detected_at', cutoff);
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Cron helper — pick due sources + run up to N checks
// ---------------------------------------------------------------------------

export interface DueSource {
  id: string;
  stateCode: USPSStateCode;
  sourceUrl: string;
  hoursSinceLastCheck: number | null;
}

export async function listDueSources(
  limit = 20
): Promise<DueSource[]> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('regulatory_monitor_sources')
    .select(
      'id, state_code, source_url, last_checked_at, check_interval_hours'
    )
    .eq('active', true)
    .order('last_checked_at', { ascending: true, nullsFirst: true })
    .limit(limit * 2); // over-fetch; we filter client-side by interval

  if (error || !data) return [];

  const now = Date.now();
  const due: DueSource[] = [];
  for (const raw of data) {
    const row = raw as {
      id: string;
      state_code: string;
      source_url: string;
      last_checked_at: string | null;
      check_interval_hours: number;
    };
    if (row.last_checked_at === null) {
      due.push({
        id: row.id,
        stateCode: row.state_code as USPSStateCode,
        sourceUrl: row.source_url,
        hoursSinceLastCheck: null,
      });
    } else {
      const last = new Date(row.last_checked_at).getTime();
      const hours = (now - last) / (1000 * 60 * 60);
      if (hours >= row.check_interval_hours) {
        due.push({
          id: row.id,
          stateCode: row.state_code as USPSStateCode,
          sourceUrl: row.source_url,
          hoursSinceLastCheck: hours,
        });
      }
    }
    if (due.length >= limit) break;
  }
  return due;
}
