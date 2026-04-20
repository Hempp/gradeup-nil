/**
 * HS-NIL Concierge Import — Service Layer
 * ============================================================
 *
 * Bulk import of admin-sourced parent+athlete pairs from a CSV.
 * This service is the only thing that writes to
 * concierge_import_batches + concierge_import_rows (via the
 * service-role client). The API layer in
 * /api/hs/admin/actions/concierge-import/* is a thin auth +
 * rate-limit wrapper over this module.
 *
 * Design commitments (enforced by tests + the migration's RLS):
 *
 *   1. Per-row atomicity, NOT per-batch.
 *      If row 5 fails during apply, rows 1-4 remain applied and
 *      rows 6-20 still proceed. Admin reviews failures afterwards
 *      via the batch detail page.
 *
 *   2. Idempotent re-apply.
 *      applyImport() skips any row where applied_at IS NOT NULL
 *      AND apply_error IS NULL. Rows with apply_error set are
 *      retried. Admin re-running apply on a batch is safe.
 *
 *   3. Audit-grade trail.
 *      Each successful apply writes one admin_audit_log row with
 *      action='concierge_import_applied' and metadata
 *      { batchId, succeeded, failed }. No audit row is suppressed
 *      on partial failure; partial failures are first-class outcomes.
 *
 *   4. Pilot-state gate.
 *      Every row is rejected at validation time if it targets a
 *      non-pilot state. The batch itself also carries a
 *      pilot_state_code that is checked at upload time.
 *
 *   5. Temporary passwords, never surfaced.
 *      Created auth.users get crypto.randomUUID() temporary
 *      passwords. Users never see these. They sign in via a
 *      password-reset email sent after apply — using the
 *      existing recovery flow (`generateLink` with type='recovery').
 *
 *   6. Concierge consent is explicitly NOT a normal signup flow.
 *      The rows below insert parental_consents using
 *      signature_method='notarized_upload' (the closest fit in
 *      the existing CHECK enum) + identity_verified=true because
 *      the founder has verified the parent relationship out-of-band
 *      during concierge intake. This is NOT a general signup-time
 *      behavior — it is ONLY valid here because the caller is an
 *      admin vouching for a hand-sourced cohort.
 */

import {
  createClient as createServiceClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

import { PILOT_STATES, type USPSStateCode } from './state-rules';
import { ensureAthleteRow } from './athlete-identity';

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

/**
 * Canonical CSV header row (and the minimum valid set of column names
 * expected on an uploaded file). Order doesn't matter — parseImportCsv
 * builds a header-indexed map. Missing required columns is a parse-time
 * fatal error.
 */
export const IMPORT_CSV_HEADERS = [
  'athlete_first_name',
  'athlete_last_name',
  'athlete_email',
  'athlete_dob',
  'athlete_sport',
  'athlete_school',
  'athlete_grade_year',
  'athlete_claimed_gpa',
  'parent_first_name',
  'parent_last_name',
  'parent_email',
  'parent_phone',
  'parent_relationship',
  'consent_scope_categories',
  'consent_max_deal_cents',
  'consent_duration_months',
  'notes',
] as const;

export type ImportCsvHeader = (typeof IMPORT_CSV_HEADERS)[number];

/**
 * Allowed sport list — deliberately matches the athlete signup page
 * select options so the CSV template never asks for a sport the UI
 * cannot render later.
 */
export const ALLOWED_SPORTS = [
  'Football',
  'Basketball',
  'Baseball',
  'Soccer',
  'Track & Field',
  'Swimming',
  'Volleyball',
  'Tennis',
  'Golf',
  'Wrestling',
  'Softball',
  'Lacrosse',
  'Hockey',
  'Other',
] as const;

/**
 * Allowed consent scope categories. These are the admin-facing strings
 * (what the CSV contains). They map 1:1 onto the string array stored at
 * parental_consents.scope.deal_categories.
 */
export const ALLOWED_CONSENT_CATEGORIES = [
  'apparel',
  'food_beverage',
  'local_business',
  'training',
  'autograph',
  'social_media_promo',
] as const;

export type ConsentCategory = (typeof ALLOWED_CONSENT_CATEGORIES)[number];

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface ParsedRow {
  rowNumber: number;
  /** Raw row verbatim, keyed by header. */
  raw: Record<string, string>;
}

export interface ParseError {
  rowNumber: number;
  message: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  headers: string[];
  errors: ParseError[];
}

export interface RowValidation {
  valid: boolean;
  errors: string[];
}

export interface UploadBatchResult {
  batchId: string;
  rowCount: number;
  validCount: number;
  invalidCount: number;
}

export interface PreviewRow {
  id: string;
  rowNumber: number;
  raw: Record<string, string>;
  validationStatus: 'valid' | 'invalid';
  validationErrors: string[];
  appliedAt: string | null;
  applyError: string | null;
  createdAthleteUserId: string | null;
  createdParentUserId: string | null;
}

export interface PreviewResult {
  batch: {
    id: string;
    filename: string;
    pilotStateCode: string;
    status: string;
    rowCount: number;
    succeededCount: number;
    failedCount: number;
    notes: string | null;
    createdAt: string;
    completedAt: string | null;
  };
  rows: PreviewRow[];
}

export interface ApplyResult {
  batchId: string;
  attempted: number;
  succeeded: number;
  failed: number;
  skipped: number;
  auditLogId: string | null;
}

// ----------------------------------------------------------------------------
// Service-role client
// ----------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil concierge-import] Supabase service role not configured ' +
        '(NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ============================================================
// 1. parseImportCsv
// ============================================================

/**
 * Parse a CSV text blob into ParsedRow[]. Tolerates:
 *   - UTF-8 BOM prefix (Excel exports)
 *   - CRLF or LF line endings
 *   - Quoted fields containing commas
 *   - Trailing blank lines
 *
 * Returns:
 *   - rows: one ParsedRow per non-empty data row, in file order
 *   - headers: lower-cased + trimmed header row
 *   - errors: parse-level problems that prevent validation of a specific
 *             row (wrong column count, unclosed quote, etc.)
 *
 * This function does NOT semantically validate any row; see
 * validateImportRow.
 */
export function parseImportCsv(csvText: string): ParseResult {
  const errors: ParseError[] = [];
  const rows: ParsedRow[] = [];

  if (typeof csvText !== 'string' || csvText.length === 0) {
    return { rows, headers: [], errors: [{ rowNumber: 0, message: 'CSV is empty.' }] };
  }

  // Strip UTF-8 BOM if present.
  let text = csvText;
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  // Minimal RFC-4180-ish parser. Tokenises line by line, respecting
  // quoted fields that may contain commas or escaped quotes.
  const records = splitCsvRecords(text);
  if (records.length === 0) {
    return { rows, headers: [], errors: [{ rowNumber: 0, message: 'CSV has no rows.' }] };
  }

  const rawHeaders = records[0].map((h) => h.trim().toLowerCase());
  const missing: string[] = [];
  for (const required of IMPORT_CSV_HEADERS) {
    if (!rawHeaders.includes(required)) missing.push(required);
  }
  if (missing.length) {
    errors.push({
      rowNumber: 1,
      message: `Missing required header column(s): ${missing.join(', ')}`,
    });
    return { rows, headers: rawHeaders, errors };
  }

  // Build index map header → position.
  const positions = new Map<string, number>();
  rawHeaders.forEach((h, i) => positions.set(h, i));

  for (let i = 1; i < records.length; i++) {
    const fields = records[i];
    const lineNumber = i + 1; // 1-indexed, matching spreadsheet row number

    // Skip fully-blank lines quietly (Excel often emits trailing blanks).
    if (fields.length === 1 && fields[0].trim() === '') continue;
    if (fields.every((f) => f === '')) continue;

    if (fields.length !== rawHeaders.length) {
      errors.push({
        rowNumber: lineNumber,
        message: `Column count mismatch (got ${fields.length}, expected ${rawHeaders.length}).`,
      });
      continue;
    }

    const raw: Record<string, string> = {};
    for (const header of IMPORT_CSV_HEADERS) {
      const pos = positions.get(header);
      if (pos === undefined) continue;
      raw[header] = (fields[pos] ?? '').trim();
    }
    rows.push({ rowNumber: lineNumber, raw });
  }

  return { rows, headers: rawHeaders, errors };
}

/**
 * Split a CSV blob into records (arrays of fields). RFC-4180-lite: a
 * field is either unquoted (up to the next comma / newline) or quoted
 * ("..."). Inside a quoted field, "" is an escaped quote.
 */
function splitCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let field = '';
  let current: string[] = [];
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          // Escaped quote.
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      current.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (ch === '\r') {
      // Handle CRLF or bare CR as a line terminator.
      current.push(field);
      records.push(current);
      current = [];
      field = '';
      i += text[i + 1] === '\n' ? 2 : 1;
      continue;
    }
    if (ch === '\n') {
      current.push(field);
      records.push(current);
      current = [];
      field = '';
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }

  // Flush the trailing record if the file didn't end with a newline.
  if (field.length > 0 || current.length > 0) {
    current.push(field);
    records.push(current);
  }
  return records;
}

// ============================================================
// 2. validateImportRow
// ============================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate a single CSV row's content against business rules. Collects
 * ALL errors (not fail-fast) so the admin preview surfaces every issue
 * with a row at once.
 *
 * Validation rules:
 *   * Athlete + parent emails are well-formed + non-identical.
 *   * DOB parses as YYYY-MM-DD and isn't in the future / older than 100y.
 *   * Sport ∈ ALLOWED_SPORTS.
 *   * School is non-empty after trim.
 *   * grade_year ∈ [9, 12].
 *   * claimed_gpa ∈ [0, 5] (or blank — optional).
 *   * parent_relationship ∈ {parent, legal_guardian}.
 *   * consent_scope_categories — one-or-more of ALLOWED_CONSENT_CATEGORIES.
 *   * consent_max_deal_cents ≥ 1.
 *   * consent_duration_months ∈ [1, 24].
 *   * (pilot-state gate) athlete_state_code of the batch is applied to
 *     every row — checked at upload time, not here.
 */
export function validateImportRow(raw: Record<string, string>): RowValidation {
  const errors: string[] = [];

  const athleteFirst = (raw.athlete_first_name ?? '').trim();
  const athleteLast = (raw.athlete_last_name ?? '').trim();
  const athleteEmail = (raw.athlete_email ?? '').trim().toLowerCase();
  const athleteDob = (raw.athlete_dob ?? '').trim();
  const athleteSport = (raw.athlete_sport ?? '').trim();
  const athleteSchool = (raw.athlete_school ?? '').trim();
  const athleteGradeYear = (raw.athlete_grade_year ?? '').trim();
  const athleteGpa = (raw.athlete_claimed_gpa ?? '').trim();
  const parentFirst = (raw.parent_first_name ?? '').trim();
  const parentLast = (raw.parent_last_name ?? '').trim();
  const parentEmail = (raw.parent_email ?? '').trim().toLowerCase();
  const parentRelationship = (raw.parent_relationship ?? '').trim().toLowerCase();
  const scopeCategories = (raw.consent_scope_categories ?? '').trim();
  const maxDealCents = (raw.consent_max_deal_cents ?? '').trim();
  const durationMonths = (raw.consent_duration_months ?? '').trim();

  if (!athleteFirst) errors.push('athlete_first_name is required.');
  if (!athleteLast) errors.push('athlete_last_name is required.');
  if (!parentFirst) errors.push('parent_first_name is required.');
  if (!parentLast) errors.push('parent_last_name is required.');

  if (!athleteEmail) {
    errors.push('athlete_email is required.');
  } else if (!EMAIL_RE.test(athleteEmail)) {
    errors.push(`athlete_email "${athleteEmail}" is not a valid email.`);
  }
  if (!parentEmail) {
    errors.push('parent_email is required.');
  } else if (!EMAIL_RE.test(parentEmail)) {
    errors.push(`parent_email "${parentEmail}" is not a valid email.`);
  }
  if (athleteEmail && parentEmail && athleteEmail === parentEmail) {
    errors.push('athlete_email and parent_email must differ.');
  }

  if (!athleteDob) {
    errors.push('athlete_dob is required (YYYY-MM-DD).');
  } else if (!DATE_RE.test(athleteDob)) {
    errors.push(`athlete_dob "${athleteDob}" must be YYYY-MM-DD.`);
  } else {
    const d = new Date(athleteDob);
    if (Number.isNaN(d.getTime())) {
      errors.push(`athlete_dob "${athleteDob}" is not a parseable date.`);
    } else {
      const now = Date.now();
      if (d.getTime() > now) {
        errors.push('athlete_dob cannot be in the future.');
      } else if (now - d.getTime() > 100 * 365.25 * 24 * 60 * 60 * 1000) {
        errors.push('athlete_dob is unreasonably old.');
      }
    }
  }

  if (!athleteSport) {
    errors.push('athlete_sport is required.');
  } else if (!ALLOWED_SPORTS.includes(athleteSport as (typeof ALLOWED_SPORTS)[number])) {
    errors.push(
      `athlete_sport "${athleteSport}" not in allowed list (${ALLOWED_SPORTS.join(', ')}).`
    );
  }

  if (!athleteSchool) errors.push('athlete_school is required.');

  const gy = Number(athleteGradeYear);
  if (!athleteGradeYear) {
    errors.push('athlete_grade_year is required.');
  } else if (!Number.isInteger(gy) || gy < 9 || gy > 12) {
    errors.push(`athlete_grade_year "${athleteGradeYear}" must be an integer 9..12.`);
  }

  if (athleteGpa) {
    const g = Number(athleteGpa);
    if (!Number.isFinite(g) || g < 0 || g > 5) {
      errors.push(`athlete_claimed_gpa "${athleteGpa}" must be between 0.0 and 5.0.`);
    }
  }

  if (!parentRelationship) {
    errors.push('parent_relationship is required (parent or legal_guardian).');
  } else if (parentRelationship !== 'parent' && parentRelationship !== 'legal_guardian') {
    errors.push(
      `parent_relationship "${parentRelationship}" must be "parent" or "legal_guardian".`
    );
  }

  const categories = scopeCategories
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter((c) => c.length > 0);
  if (categories.length === 0) {
    errors.push(
      `consent_scope_categories is required (one-or-more of ${ALLOWED_CONSENT_CATEGORIES.join(', ')}).`
    );
  } else {
    for (const c of categories) {
      if (!ALLOWED_CONSENT_CATEGORIES.includes(c as ConsentCategory)) {
        errors.push(
          `consent_scope_categories contains "${c}" which is not in allowed list (${ALLOWED_CONSENT_CATEGORIES.join(', ')}).`
        );
      }
    }
  }

  const cents = Number(maxDealCents);
  if (!maxDealCents) {
    errors.push('consent_max_deal_cents is required.');
  } else if (!Number.isInteger(cents) || cents < 1) {
    errors.push(`consent_max_deal_cents "${maxDealCents}" must be an integer ≥ 1.`);
  }

  const months = Number(durationMonths);
  if (!durationMonths) {
    errors.push('consent_duration_months is required.');
  } else if (!Number.isInteger(months) || months < 1 || months > 24) {
    errors.push(`consent_duration_months "${durationMonths}" must be an integer 1..24.`);
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================
// 3. createBatch — call from the upload endpoint
// ============================================================

export interface CreateBatchInput {
  actorUserId: string;
  filename: string;
  pilotStateCode: string;
  notes?: string | null;
  csvText: string;
}

/**
 * Parse the CSV, validate every row, and persist a batch envelope +
 * one concierge_import_rows row per CSV line (valid or invalid). Returns
 * the generated batch id + counts. The batch status is left at 'pending'
 * until applyImport runs.
 *
 * Enforces the pilot-state gate: a pilotStateCode outside PILOT_STATES
 * throws — the caller (API route) should 400 on that.
 */
export async function createBatch(input: CreateBatchInput): Promise<UploadBatchResult> {
  if (!PILOT_STATES.includes(input.pilotStateCode as USPSStateCode)) {
    throw new Error(
      `pilot_state_code "${input.pilotStateCode}" is not a pilot state (${PILOT_STATES.join(', ')}).`
    );
  }

  const parse = parseImportCsv(input.csvText);
  if (parse.errors.length > 0 && parse.rows.length === 0) {
    throw new Error(
      `CSV could not be parsed: ${parse.errors.map((e) => `row ${e.rowNumber}: ${e.message}`).join('; ')}`
    );
  }

  const sb = getServiceRoleClient();

  // Batch envelope. Status stays 'pending' until apply runs — we do NOT
  // transition through 'previewing' here; that status is reserved for
  // an admin explicitly hitting the preview endpoint, which is a UI
  // verb, not a service one.
  const { data: batch, error: batchErr } = await sb
    .from('concierge_import_batches')
    .insert({
      actor_user_id: input.actorUserId,
      filename: input.filename,
      pilot_state_code: input.pilotStateCode,
      notes: input.notes ?? null,
      row_count: parse.rows.length,
      status: 'pending',
    })
    .select('id')
    .single();

  if (batchErr || !batch) {
    throw new Error(
      `Failed to create concierge_import_batches row: ${batchErr?.message ?? 'unknown'}`
    );
  }

  const batchId = batch.id as string;

  // Validate every row + insert. Parse-level problems land as invalid
  // rows with the parse error as the sole validation_error, so the
  // admin can see everything on one screen.
  const rowPayloads: Array<Record<string, unknown>> = parse.rows.map((r) => {
    const v = validateImportRow(r.raw);
    return {
      batch_id: batchId,
      row_number: r.rowNumber,
      raw_row: r.raw,
      validation_errors: v.errors,
      validation_status: v.valid ? 'valid' : 'invalid',
    };
  });

  // Add any rows that the parser itself rejected (bad column counts,
  // etc) so they are visible in the preview.
  for (const e of parse.errors) {
    // Skip header-level errors; they were surfaced via the throw above
    // if the file was totally unparseable, otherwise the caller already
    // saw them in the parse result.
    if (e.rowNumber <= 1) continue;
    if (rowPayloads.some((p) => p.row_number === e.rowNumber)) continue;
    rowPayloads.push({
      batch_id: batchId,
      row_number: e.rowNumber,
      raw_row: {},
      validation_errors: [e.message],
      validation_status: 'invalid',
    });
  }

  let validCount = 0;
  let invalidCount = 0;
  for (const p of rowPayloads) {
    if (p.validation_status === 'valid') validCount++;
    else invalidCount++;
  }

  if (rowPayloads.length > 0) {
    const { error: rowsErr } = await sb.from('concierge_import_rows').insert(rowPayloads);
    if (rowsErr) {
      // Best-effort rollback: delete the batch envelope so the admin
      // can retry a fresh upload. FK ON DELETE CASCADE handles any
      // partially-inserted row payload.
      await sb.from('concierge_import_batches').delete().eq('id', batchId);
      throw new Error(
        `Failed to insert concierge_import_rows: ${rowsErr.message}`
      );
    }
  }

  await sb
    .from('concierge_import_batches')
    .update({ row_count: rowPayloads.length, failed_count: invalidCount })
    .eq('id', batchId);

  return {
    batchId,
    rowCount: rowPayloads.length,
    validCount,
    invalidCount,
  };
}

// ============================================================
// 4. previewImport
// ============================================================

/**
 * Load the batch + all rows for admin review before apply. Returns
 * everything a preview page needs to render validation status, per-row
 * errors, and (after apply) per-row apply status.
 */
export async function previewImport(batchId: string): Promise<PreviewResult | null> {
  const sb = getServiceRoleClient();

  const { data: batch, error: batchErr } = await sb
    .from('concierge_import_batches')
    .select(
      'id, filename, pilot_state_code, status, row_count, succeeded_count, failed_count, notes, created_at, completed_at'
    )
    .eq('id', batchId)
    .maybeSingle();

  if (batchErr) {
    throw new Error(`previewImport: batch fetch failed: ${batchErr.message}`);
  }
  if (!batch) return null;

  const { data: rows, error: rowsErr } = await sb
    .from('concierge_import_rows')
    .select(
      'id, row_number, raw_row, validation_status, validation_errors, applied_at, apply_error, created_athlete_user_id, created_parent_user_id'
    )
    .eq('batch_id', batchId)
    .order('row_number', { ascending: true });

  if (rowsErr) {
    throw new Error(`previewImport: rows fetch failed: ${rowsErr.message}`);
  }

  return {
    batch: {
      id: batch.id as string,
      filename: batch.filename as string,
      pilotStateCode: batch.pilot_state_code as string,
      status: batch.status as string,
      rowCount: Number(batch.row_count ?? 0),
      succeededCount: Number(batch.succeeded_count ?? 0),
      failedCount: Number(batch.failed_count ?? 0),
      notes: (batch.notes as string | null) ?? null,
      createdAt: batch.created_at as string,
      completedAt: (batch.completed_at as string | null) ?? null,
    },
    rows: (rows ?? []).map((r) => ({
      id: r.id as string,
      rowNumber: Number(r.row_number),
      raw: (r.raw_row ?? {}) as Record<string, string>,
      validationStatus: r.validation_status as 'valid' | 'invalid',
      validationErrors: (r.validation_errors ?? []) as string[],
      appliedAt: (r.applied_at as string | null) ?? null,
      applyError: (r.apply_error as string | null) ?? null,
      createdAthleteUserId: (r.created_athlete_user_id as string | null) ?? null,
      createdParentUserId: (r.created_parent_user_id as string | null) ?? null,
    })),
  };
}

// ============================================================
// 5. applyImport
// ============================================================

export interface ApplyInput {
  batchId: string;
  actorUserId: string;
}

/**
 * Apply every valid + not-yet-successfully-applied row in the batch.
 *
 * For each such row we execute:
 *   (1) admin auth.users create for athlete (role='hs_athlete')
 *   (2) admin auth.users create for parent  (role='hs_parent')
 *   (3) ensureAthleteRow for athlete (public.athletes + profiles)
 *   (4) INSERT hs_athlete_profiles
 *   (5) INSERT hs_parent_profiles
 *   (6) INSERT hs_parent_athlete_links (verified_at=now, method='manual_support')
 *   (7) INSERT parental_consents (signature_method='notarized_upload',
 *       identity_verified=true)
 *   (8) Stamp applied_at + created_* IDs on the concierge_import_rows row.
 *
 * If any step fails, apply_error is recorded on the row and the loop
 * moves on — per-row atomicity, NOT per-batch. The partial-ok state is
 * surfaced back through the return value and via the
 * 'concierge_import_applied' audit row.
 *
 * Password recovery emails are queued via Supabase's
 * `generateLink({ type: 'recovery' })`, which fires the standard
 * "reset your password" email the same way /forgot-password does. Users
 * never see the temporary password.
 */
export async function applyImport(input: ApplyInput): Promise<ApplyResult> {
  const sb = getServiceRoleClient();
  const { batchId, actorUserId } = input;

  const { data: batch, error: batchErr } = await sb
    .from('concierge_import_batches')
    .select('id, pilot_state_code, status')
    .eq('id', batchId)
    .maybeSingle();

  if (batchErr || !batch) {
    throw new Error(`applyImport: batch ${batchId} not found.`);
  }
  if (batch.status === 'cancelled') {
    throw new Error(`applyImport: batch is cancelled.`);
  }

  await sb
    .from('concierge_import_batches')
    .update({ status: 'applying' })
    .eq('id', batchId);

  // Pull the rows we will attempt. Idempotent filter: valid rows that
  // haven't already succeeded. Already-succeeded rows (applied_at NOT
  // NULL + apply_error NULL) are silently skipped; failed rows
  // (applied_at NOT NULL + apply_error NOT NULL) are retried.
  const { data: rows, error: rowsErr } = await sb
    .from('concierge_import_rows')
    .select(
      'id, row_number, raw_row, validation_status, applied_at, apply_error'
    )
    .eq('batch_id', batchId)
    .eq('validation_status', 'valid')
    .order('row_number', { ascending: true });

  if (rowsErr) {
    throw new Error(`applyImport: rows fetch failed: ${rowsErr.message}`);
  }

  const attempted: typeof rows = (rows ?? []).filter(
    (r) => !r.applied_at || r.apply_error
  );

  let succeeded = 0;
  let failed = 0;
  const skipped = (rows ?? []).length - attempted.length;

  for (const row of attempted) {
    try {
      await applySingleRow(sb, {
        rowId: row.id as string,
        pilotStateCode: batch.pilot_state_code as string,
        raw: (row.raw_row ?? {}) as Record<string, string>,
      });
      succeeded++;
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      await sb
        .from('concierge_import_rows')
        .update({
          apply_error: message.slice(0, 2000),
          applied_at: new Date().toISOString(),
        })
        .eq('id', row.id);
    }
  }

  // Aggregate counts + terminal status. failed_count is the rolling
  // total, not just this run's new failures.
  const { data: tally } = await sb
    .from('concierge_import_rows')
    .select('validation_status, applied_at, apply_error')
    .eq('batch_id', batchId);

  let successTally = 0;
  let failureTally = 0;
  for (const r of tally ?? []) {
    if (r.validation_status !== 'valid') continue;
    if (r.applied_at && !r.apply_error) successTally++;
    else if (r.apply_error) failureTally++;
  }

  const terminalStatus: 'completed' | 'partial_failure' =
    failureTally === 0 ? 'completed' : 'partial_failure';

  await sb
    .from('concierge_import_batches')
    .update({
      succeeded_count: successTally,
      failed_count: failureTally + ((tally ?? []).filter((r) => r.validation_status !== 'valid').length),
      status: terminalStatus,
      completed_at: new Date().toISOString(),
    })
    .eq('id', batchId);

  // Audit trail. One row per apply() invocation, even when the run
  // was a no-op (every row already succeeded) — that's a record that
  // the admin re-triggered and we confirmed no work was needed.
  const { data: audit } = await sb
    .from('admin_audit_log')
    .insert({
      actor_user_id: actorUserId,
      action: 'concierge_import_applied',
      target_kind: 'concierge_import_batch',
      target_id: batchId,
      reason: `Applied concierge import batch ${batchId}: ${succeeded} succeeded, ${failed} failed, ${skipped} skipped.`,
      metadata: {
        batchId,
        attempted: attempted.length,
        succeeded,
        failed,
        skipped,
        terminalStatus,
      },
    })
    .select('id')
    .single();

  return {
    batchId,
    attempted: attempted.length,
    succeeded,
    failed,
    skipped,
    auditLogId: (audit?.id as string | null) ?? null,
  };
}

// ------------------------------------------------------------
// applySingleRow — the 8-step happy path for one CSV row
// ------------------------------------------------------------

interface ApplySingleInput {
  rowId: string;
  pilotStateCode: string;
  raw: Record<string, string>;
}

async function applySingleRow(sb: SupabaseClient, input: ApplySingleInput): Promise<void> {
  const { raw, pilotStateCode } = input;

  const athleteFirst = (raw.athlete_first_name ?? '').trim();
  const athleteLast = (raw.athlete_last_name ?? '').trim();
  const athleteEmail = (raw.athlete_email ?? '').trim().toLowerCase();
  const athleteDob = (raw.athlete_dob ?? '').trim();
  const athleteSport = (raw.athlete_sport ?? '').trim();
  const athleteSchool = (raw.athlete_school ?? '').trim();
  const athleteGradeYear = Number((raw.athlete_grade_year ?? '').trim());
  const athleteGpa = (raw.athlete_claimed_gpa ?? '').trim();
  const parentFirst = (raw.parent_first_name ?? '').trim();
  const parentLast = (raw.parent_last_name ?? '').trim();
  const parentEmail = (raw.parent_email ?? '').trim().toLowerCase();
  const parentPhone = (raw.parent_phone ?? '').trim();
  const parentRelationship = ((raw.parent_relationship ?? '').trim().toLowerCase() ||
    'parent') as 'parent' | 'legal_guardian';

  const scopeCategories = (raw.consent_scope_categories ?? '')
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter((c) => c.length > 0);
  const maxDealCents = Number((raw.consent_max_deal_cents ?? '').trim());
  const durationMonths = Number((raw.consent_duration_months ?? '').trim());

  // --- Step 1: auth.users for athlete --------------------------------
  const athleteUserId = await ensureAuthUser(sb, {
    email: athleteEmail,
    firstName: athleteFirst,
    lastName: athleteLast,
    role: 'hs_athlete',
    extraMetadata: {
      requires_parental_consent: isMinor(athleteDob),
      concierge_imported: true,
    },
  });

  // --- Step 2: auth.users for parent ---------------------------------
  const parentUserId = await ensureAuthUser(sb, {
    email: parentEmail,
    firstName: parentFirst,
    lastName: parentLast,
    role: 'hs_parent',
    extraMetadata: {
      relationship: parentRelationship,
      pending_athlete_name: `${athleteFirst} ${athleteLast}`.trim(),
      pending_athlete_email: athleteEmail,
      concierge_imported: true,
    },
  });

  // --- Step 3: ensureAthleteRow -------------------------------------
  await ensureAthleteRow({
    userId: athleteUserId,
    firstName: athleteFirst,
    lastName: athleteLast,
    email: athleteEmail,
    bracket: 'high_school',
  });

  // --- Step 4: hs_athlete_profiles ----------------------------------
  // upsert-style: if an earlier run created it, leave it alone.
  const { data: existingAthleteProfile } = await sb
    .from('hs_athlete_profiles')
    .select('id')
    .eq('user_id', athleteUserId)
    .maybeSingle();

  let athleteProfileId = existingAthleteProfile?.id as string | undefined;
  if (!athleteProfileId) {
    const { data: inserted, error: insertErr } = await sb
      .from('hs_athlete_profiles')
      .insert({
        user_id: athleteUserId,
        state_code: pilotStateCode,
        date_of_birth: athleteDob || null,
        graduation_year: Number.isInteger(athleteGradeYear)
          ? new Date().getFullYear() + Math.max(0, 12 - athleteGradeYear)
          : null,
        school_name: athleteSchool,
        sport: athleteSport,
        gpa: athleteGpa ? Number(athleteGpa) : null,
        gpa_verification_tier: 'self_reported',
      })
      .select('id')
      .single();
    if (insertErr || !inserted) {
      throw new Error(`hs_athlete_profiles insert failed: ${insertErr?.message ?? 'unknown'}`);
    }
    athleteProfileId = inserted.id as string;
  }

  // --- Step 5: hs_parent_profiles -----------------------------------
  const { data: existingParentProfile } = await sb
    .from('hs_parent_profiles')
    .select('id')
    .eq('user_id', parentUserId)
    .maybeSingle();

  let parentProfileId = existingParentProfile?.id as string | undefined;
  if (!parentProfileId) {
    const { data: inserted, error: insertErr } = await sb
      .from('hs_parent_profiles')
      .insert({
        user_id: parentUserId,
        full_name: `${parentFirst} ${parentLast}`.trim(),
        relationship: parentRelationship,
        phone: parentPhone || null,
      })
      .select('id')
      .single();
    if (insertErr || !inserted) {
      throw new Error(`hs_parent_profiles insert failed: ${insertErr?.message ?? 'unknown'}`);
    }
    parentProfileId = inserted.id as string;
  }

  // --- Step 6: hs_parent_athlete_links (verified + manual_support) --
  const { data: existingLink } = await sb
    .from('hs_parent_athlete_links')
    .select('id')
    .eq('parent_profile_id', parentProfileId)
    .eq('athlete_user_id', athleteUserId)
    .maybeSingle();

  let linkId = existingLink?.id as string | undefined;
  if (!linkId) {
    const { data: inserted, error: insertErr } = await sb
      .from('hs_parent_athlete_links')
      .insert({
        parent_profile_id: parentProfileId,
        athlete_user_id: athleteUserId,
        relationship: parentRelationship,
        verified_at: new Date().toISOString(),
        verification_method: 'manual_support',
      })
      .select('id')
      .single();
    if (insertErr || !inserted) {
      throw new Error(`hs_parent_athlete_links insert failed: ${insertErr?.message ?? 'unknown'}`);
    }
    linkId = inserted.id as string;
  }

  // --- Step 7: parental_consents (concierge-specific signature mode)-
  const signedAt = new Date();
  const expiresAt = new Date(signedAt);
  expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

  const consentScope = {
    deal_categories: scopeCategories,
    max_deal_amount: Math.ceil(maxDealCents / 100),
    max_deal_amount_cents: maxDealCents,
    duration_months: durationMonths,
  };

  const { data: consent, error: consentErr } = await sb
    .from('parental_consents')
    .insert({
      athlete_user_id: athleteUserId,
      parent_email: parentEmail,
      parent_full_name: `${parentFirst} ${parentLast}`.trim(),
      relationship: parentRelationship,
      signed_at: signedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      // NOTE: signature_method is constrained to
      // ('e_signature','notarized_upload','video_attestation') at the DB
      // level (migration 20260418_002). 'notarized_upload' is the closest
      // fit for the concierge case — the founder has an offline verified
      // intake record (signed paper / phone notes) that functions as the
      // notarized proof. This is ONLY appropriate in the concierge
      // import path; production signup never uses it.
      signature_method: 'notarized_upload',
      identity_verified: true,
      identity_verification_provider: null,
      identity_verification_reference: null,
      scope: consentScope,
    })
    .select('id')
    .single();

  if (consentErr || !consent) {
    throw new Error(`parental_consents insert failed: ${consentErr?.message ?? 'unknown'}`);
  }

  // --- Step 8: stamp the row ----------------------------------------
  const { error: stampErr } = await sb
    .from('concierge_import_rows')
    .update({
      created_athlete_user_id: athleteUserId,
      created_parent_user_id: parentUserId,
      created_athlete_profile_id: athleteProfileId,
      created_parent_profile_id: parentProfileId,
      created_link_id: linkId,
      created_consent_id: consent.id,
      applied_at: new Date().toISOString(),
      apply_error: null,
    })
    .eq('id', input.rowId);

  if (stampErr) {
    // This is a genuinely bad state — the side effects succeeded but we
    // can't record them. Surface loudly; the admin can reconcile via
    // the created_* IDs we already wrote to the auth.users.user_metadata
    // (concierge_imported flag).
    throw new Error(
      `concierge_import_rows stamp failed after successful apply: ${stampErr.message}`
    );
  }

  // Fire the password-recovery email for both users. Failures are
  // non-fatal — the apply_at is already stamped, and ops can resend
  // from the Supabase dashboard. We tolerate the rare "user exists but
  // email bounced" case rather than rolling back a completed concierge
  // apply.
  await queueRecoveryEmail(sb, athleteEmail);
  await queueRecoveryEmail(sb, parentEmail);
}

// ------------------------------------------------------------
// ensureAuthUser — idempotent create via the admin API
// ------------------------------------------------------------

interface EnsureAuthUserInput {
  email: string;
  firstName: string;
  lastName: string;
  role: 'hs_athlete' | 'hs_parent';
  extraMetadata: Record<string, unknown>;
}

/**
 * Create an auth.users row, or return the existing id if one already
 * exists for this email. Uses a throw-away crypto.randomUUID() as the
 * temporary password — the user never sees it because they sign in via
 * the recovery email link.
 */
async function ensureAuthUser(
  sb: SupabaseClient,
  input: EnsureAuthUserInput
): Promise<string> {
  const admin = (sb as unknown as {
    auth: {
      admin: {
        createUser: (
          args: Record<string, unknown>
        ) => Promise<{ data: { user?: { id?: string } | null } | null; error: { message: string; status?: number } | null }>;
        listUsers: (
          args: Record<string, unknown>
        ) => Promise<{ data: { users?: Array<{ id: string; email?: string | null }> } | null; error: { message: string } | null }>;
      };
    };
  }).auth.admin;

  if (!admin || typeof admin.createUser !== 'function') {
    throw new Error(
      'ensureAuthUser: Supabase admin API not available on service-role client.'
    );
  }

  const tempPassword = randomUUID() + '-' + randomUUID();

  const { data: created, error } = await admin.createUser({
    email: input.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      first_name: input.firstName,
      last_name: input.lastName,
      role: input.role,
      ...input.extraMetadata,
    },
  });

  if (created?.user?.id) {
    return created.user.id;
  }

  // Supabase surfaces "User already registered" as a 422. When that
  // happens we resolve the id out of the user list.
  const msg = error?.message ?? '';
  const isConflict =
    /already/i.test(msg) ||
    /registered/i.test(msg) ||
    /exists/i.test(msg) ||
    error?.status === 422;
  if (isConflict) {
    const existing = await findUserIdByEmail(sb, input.email);
    if (existing) return existing;
  }

  throw new Error(`auth.admin.createUser failed: ${msg || 'unknown'}`);
}

async function findUserIdByEmail(
  sb: SupabaseClient,
  email: string
): Promise<string | null> {
  // First try the profiles table — fast + doesn't require paging.
  const { data: profile } = await sb
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (profile?.id) return profile.id as string;

  const admin = (sb as unknown as {
    auth: {
      admin: {
        listUsers: (args: Record<string, unknown>) => Promise<{
          data: { users?: Array<{ id: string; email?: string | null }> } | null;
          error: { message: string } | null;
        }>;
      };
    };
  }).auth.admin;

  // Paged fallback. Cap at 500 to avoid unbounded loops on very large
  // user tables; the concierge import is only ever run against pilot
  // cohorts where the email is guaranteed to exist in the first page.
  for (let page = 1; page <= 5; page++) {
    const { data } = await admin.listUsers({ page, perPage: 100 });
    const match = data?.users?.find(
      (u) => (u.email ?? '').toLowerCase() === email.toLowerCase()
    );
    if (match?.id) return match.id;
    if (!data?.users || data.users.length < 100) break;
  }
  return null;
}

// ------------------------------------------------------------
// queueRecoveryEmail
// ------------------------------------------------------------

/**
 * Fire the standard "set your password" recovery email via
 * supabase.auth.admin.generateLink. This is the same delivery path the
 * /forgot-password page uses, but invoked server-side so the new user
 * receives it without needing to know their temp password exists.
 *
 * Fails soft — an email outage must not roll back a completed apply.
 */
async function queueRecoveryEmail(sb: SupabaseClient, email: string): Promise<void> {
  try {
    const admin = (sb as unknown as {
      auth: {
        admin: {
          generateLink?: (args: {
            type: 'recovery';
            email: string;
            options?: { redirectTo?: string };
          }) => Promise<{ data: unknown; error: { message: string } | null }>;
        };
      };
    }).auth.admin;

    if (!admin?.generateLink) return;

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      'https://gradeupnil.com';

    await admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${appUrl}/reset-password` },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil concierge-import] recovery email failed', {
      email,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function isMinor(dob: string): boolean {
  if (!dob) return false;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const age =
    now.getFullYear() -
    d.getFullYear() -
    (now.getMonth() < d.getMonth() ||
    (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())
      ? 1
      : 0);
  return age < 18;
}

// ============================================================
// 6. cancelImport
// ============================================================

/**
 * Mark a batch as cancelled. Does NOT roll back any already-applied
 * rows — the side effects of a successful apply are permanent. Use
 * this only to signal "we're abandoning the rest of this CSV" so the
 * batch stops showing up as actionable in the admin dashboard.
 */
export async function cancelImport(batchId: string): Promise<void> {
  const sb = getServiceRoleClient();
  const { error } = await sb
    .from('concierge_import_batches')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString(),
    })
    .eq('id', batchId)
    .in('status', ['pending', 'previewing', 'applying', 'partial_failure']);
  if (error) {
    throw new Error(`cancelImport failed: ${error.message}`);
  }
}

// ============================================================
// 7. listBatches — for the admin landing card
// ============================================================

export interface BatchSummary {
  id: string;
  filename: string;
  pilotStateCode: string;
  status: string;
  rowCount: number;
  succeededCount: number;
  failedCount: number;
  createdAt: string;
  completedAt: string | null;
}

export async function listBatches(limit: number = 50): Promise<BatchSummary[]> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('concierge_import_batches')
    .select(
      'id, filename, pilot_state_code, status, row_count, succeeded_count, failed_count, created_at, completed_at'
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    throw new Error(`listBatches failed: ${error.message}`);
  }
  return (data ?? []).map((row) => ({
    id: row.id as string,
    filename: row.filename as string,
    pilotStateCode: row.pilot_state_code as string,
    status: row.status as string,
    rowCount: Number(row.row_count ?? 0),
    succeededCount: Number(row.succeeded_count ?? 0),
    failedCount: Number(row.failed_count ?? 0),
    createdAt: row.created_at as string,
    completedAt: (row.completed_at as string | null) ?? null,
  }));
}

export async function countPendingBatches(): Promise<number> {
  const sb = getServiceRoleClient();
  const { count, error } = await sb
    .from('concierge_import_batches')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pending', 'previewing', 'applying', 'partial_failure']);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil concierge-import] countPendingBatches failed', error.message);
    return 0;
  }
  return count ?? 0;
}
