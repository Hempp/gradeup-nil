/**
 * HS-NIL — Post-Waitlist Nurture Sequences Service
 *
 * Enroll, advance, and suppress users in role-scoped email drip
 * sequences. The daily cron (/api/cron/hs-nurture-sequencer) calls
 * `listDueEnrollments` + per-row `sendNurtureEmail` + `markStepFired`.
 *
 * Core guarantees:
 *   1. **Idempotent enrollment.** `checkAndEnroll(waitlistId)` can fire
 *      N times for the same waitlist row — only the first insert wins
 *      (UNIQUE(user_or_waitlist_ref, sequence_id)).
 *   2. **Permanent unsubscribe.** Once status='unsubscribed', the row
 *      stays there forever. Re-signup on the waitlist creates a new
 *      row with a new unsubscribe token — the old one is tombstoned.
 *   3. **Conversion suppression.** When a waitlist row transitions to
 *      'converted', the hook inside reconcileSignupToWaitlist calls
 *      `suppressEnrollment({ ref, reason: 'converted' })` to stop the
 *      drip.
 *   4. **Backoff on failure.** 3 consecutive send failures transition
 *      the enrollment to status='failed' so we stop burning inventory
 *      against a hard-bouncing mailbox.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  defaultSequenceIdForRole,
  hasNurtureTemplate,
} from '@/lib/services/hs-nil/nurture-emails';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NurtureRef = `waitlist:${string}` | `user:${string}`;

export interface SequenceStep {
  day_offset: number;
  template_key: string;
  subject_template: string;
  body_template: string;
}

export interface SequenceDefinition {
  id: string;
  role: 'hs_athlete' | 'hs_parent' | 'coach' | 'brand';
  version: number;
  steps: SequenceStep[];
  active: boolean;
  description: string;
}

export interface Enrollment {
  id: string;
  user_or_waitlist_ref: string;
  sequence_id: string;
  enrolled_at: string;
  current_step: number;
  next_scheduled_at: string | null;
  status:
    | 'active'
    | 'completed'
    | 'suppressed_converted'
    | 'unsubscribed'
    | 'failed';
  suppressed_reason: string | null;
  consecutive_failures: number;
  unsubscribe_token: string;
  last_state_code: string | null;
  last_email: string | null;
  metadata: Record<string, unknown>;
}

export type StepOutcome =
  | { kind: 'sent'; metadata?: Record<string, unknown> }
  | { kind: 'failed'; reason: string; metadata?: Record<string, unknown> };

export interface EnrollInSequenceArgs {
  ref: NurtureRef;
  sequenceId: string;
  /** Email cached on the enrollment row — used by the cron when the
   *  waitlist row is private (service-role only). */
  email?: string | null;
  /** Two-letter state code cached on the enrollment. */
  stateCode?: string | null;
  /** Optional metadata merged into the row. */
  metadata?: Record<string, unknown>;
}

export interface SuppressEnrollmentArgs {
  ref: NurtureRef;
  reason: 'converted' | 'unsubscribed' | 'manual';
}

export interface DueEnrollmentRow extends Enrollment {
  sequence: SequenceDefinition;
}

// ---------------------------------------------------------------------------
// Ref helpers
// ---------------------------------------------------------------------------

export function waitlistRef(waitlistId: string): NurtureRef {
  return `waitlist:${waitlistId}` as NurtureRef;
}

export function userRef(userId: string): NurtureRef {
  return `user:${userId}` as NurtureRef;
}

/**
 * Map a waitlist role to the internal role tag used by sequence
 * definitions. We keep 'athlete' as 'hs_athlete' and 'parent' as
 * 'hs_parent' to match the Phase 15 spec.
 */
function internalRole(
  role: 'athlete' | 'parent' | 'coach' | 'brand'
): 'hs_athlete' | 'hs_parent' | 'coach' | 'brand' {
  if (role === 'athlete') return 'hs_athlete';
  if (role === 'parent') return 'hs_parent';
  return role;
}

// ---------------------------------------------------------------------------
// Service client
// ---------------------------------------------------------------------------

function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase service role not configured for nurture sequences (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// Definition loading
// ---------------------------------------------------------------------------

const DEFINITION_CACHE = new Map<string, SequenceDefinition>();

async function loadDefinition(
  sequenceId: string,
  client?: SupabaseClient
): Promise<SequenceDefinition | null> {
  const cached = DEFINITION_CACHE.get(sequenceId);
  if (cached) return cached;

  const supabase = client ?? getServiceClient();
  const { data, error } = await supabase
    .from('nurture_sequence_definitions')
    .select('id, role, version, steps, active, description')
    .eq('id', sequenceId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load nurture sequence "${sequenceId}": ${error.message}`
    );
  }
  if (!data) return null;

  const def: SequenceDefinition = {
    id: data.id,
    role: data.role,
    version: data.version,
    steps: (Array.isArray(data.steps) ? data.steps : []) as SequenceStep[],
    active: data.active,
    description: data.description,
  };
  DEFINITION_CACHE.set(sequenceId, def);
  return def;
}

// ---------------------------------------------------------------------------
// Scheduling helpers
// ---------------------------------------------------------------------------

function scheduleForOffset(offsetDays: number, from: Date = new Date()): Date {
  const result = new Date(from.getTime());
  result.setUTCDate(result.getUTCDate() + offsetDays);
  return result;
}

// ---------------------------------------------------------------------------
// Enrollment
// ---------------------------------------------------------------------------

/**
 * Idempotent enrollment. Safe to call N times for the same ref — only
 * the first insert wins; subsequent calls update the `last_*` cache
 * fields if they've changed (e.g. the waitlist row got re-signed from
 * a different device / email tracker).
 */
export async function enrollInSequence(
  args: EnrollInSequenceArgs
): Promise<Enrollment> {
  const { ref, sequenceId, email, stateCode, metadata } = args;
  const supabase = getServiceClient();

  const def = await loadDefinition(sequenceId, supabase);
  if (!def) {
    throw new Error(`Unknown nurture sequence id: ${sequenceId}`);
  }
  if (!def.active) {
    throw new Error(`Nurture sequence ${sequenceId} is not active`);
  }
  if (def.steps.length === 0) {
    throw new Error(`Nurture sequence ${sequenceId} has no steps`);
  }

  const firstOffset = def.steps[0].day_offset ?? 0;
  const nextScheduledAt = scheduleForOffset(firstOffset).toISOString();

  // Try insert first — if it conflicts we fall back to a lightweight
  // update of the cached email/state.
  const { data: inserted, error: insertError } = await supabase
    .from('nurture_sequence_enrollments')
    .insert({
      user_or_waitlist_ref: ref,
      sequence_id: sequenceId,
      current_step: 0,
      next_scheduled_at: nextScheduledAt,
      status: 'active',
      last_state_code: stateCode ?? null,
      last_email: email ?? null,
      metadata: metadata ?? {},
    })
    .select('*')
    .maybeSingle();

  if (!insertError && inserted) {
    return inserted as Enrollment;
  }

  const isConflict =
    insertError &&
    ((insertError as { code?: string }).code === '23505' ||
      /duplicate key|unique/i.test(insertError.message ?? ''));

  if (insertError && !isConflict) {
    throw new Error(
      `Failed to enroll ref ${ref} into ${sequenceId}: ${insertError.message}`
    );
  }

  // Conflict — load the existing row. Refresh cached contact fields
  // only if non-null and the enrollment is still active.
  const { data: existing, error: selectErr } = await supabase
    .from('nurture_sequence_enrollments')
    .select('*')
    .eq('user_or_waitlist_ref', ref)
    .eq('sequence_id', sequenceId)
    .maybeSingle();

  if (selectErr || !existing) {
    throw new Error(
      `Enrollment conflict but row not found for ${ref}/${sequenceId}: ${
        selectErr?.message ?? 'no row'
      }`
    );
  }

  if (existing.status === 'active' && (email || stateCode)) {
    await supabase
      .from('nurture_sequence_enrollments')
      .update({
        last_email: email ?? existing.last_email,
        last_state_code: stateCode ?? existing.last_state_code,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  }

  return existing as Enrollment;
}

/**
 * Called from the waitlist signup hook. Loads the waitlist row
 * (service-role — the table is RLS-private), resolves the
 * role-appropriate sequence, and enrolls the ref. Best-effort: logs
 * and returns null on failure rather than throwing.
 */
export async function checkAndEnroll(
  waitlistId: string
): Promise<Enrollment | null> {
  try {
    const supabase = getServiceClient();
    const { data: row, error } = await supabase
      .from('hs_waitlist')
      .select('id, email, role, state_code, activation_state')
      .eq('id', waitlistId)
      .maybeSingle();
    if (error) throw error;
    if (!row) return null;

    // Converted + opted-out rows are terminal from the nurture
    // perspective; bounced rows shouldn't be touched either.
    if (
      row.activation_state === 'converted' ||
      row.activation_state === 'opted_out' ||
      row.activation_state === 'bounced'
    ) {
      return null;
    }

    const role = row.role as 'athlete' | 'parent' | 'coach' | 'brand';
    const sequenceId = defaultSequenceIdForRole(role);

    return await enrollInSequence({
      ref: waitlistRef(row.id),
      sequenceId,
      email: row.email,
      stateCode: row.state_code,
      metadata: { role: internalRole(role) },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[nurture-sequences] checkAndEnroll failed', {
      waitlistId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Suppression
// ---------------------------------------------------------------------------

/**
 * Permanently stop all active sequences for a ref. Converted users
 * get 'suppressed_converted'; unsubscribers get 'unsubscribed'. Both
 * are terminal — no re-enrollment without a fresh waitlist signup.
 */
export async function suppressEnrollment(
  args: SuppressEnrollmentArgs
): Promise<{ suppressed: number }> {
  const { ref, reason } = args;
  const supabase = getServiceClient();

  const status =
    reason === 'converted' ? 'suppressed_converted' : 'unsubscribed';

  const { data, error } = await supabase
    .from('nurture_sequence_enrollments')
    .update({
      status,
      suppressed_reason: reason,
      next_scheduled_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_or_waitlist_ref', ref)
    .eq('status', 'active')
    .select('id');

  if (error) {
    throw new Error(
      `Failed to suppress enrollments for ${ref}: ${error.message}`
    );
  }
  return { suppressed: Array.isArray(data) ? data.length : 0 };
}

/**
 * Unsubscribe by opaque token — used by the public unsubscribe page.
 * Matches on the token, not the ref, because the page is unauthed.
 */
export async function unsubscribeByToken(
  token: string
): Promise<{ matched: boolean; ref: string | null }> {
  if (!token || token.length < 16 || token.length > 128) {
    return { matched: false, ref: null };
  }
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('nurture_sequence_enrollments')
    .update({
      status: 'unsubscribed',
      suppressed_reason: 'unsubscribed',
      next_scheduled_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('unsubscribe_token', token)
    .in('status', ['active', 'failed'])
    .select('id, user_or_waitlist_ref');
  if (error) {
    throw new Error(`Failed to unsubscribe token: ${error.message}`);
  }

  const first = Array.isArray(data) && data.length > 0 ? data[0] : null;
  if (!first) {
    // Maybe the token is already unsubscribed — still treat as matched
    // for UX purposes if the row exists.
    const { data: existing } = await supabase
      .from('nurture_sequence_enrollments')
      .select('user_or_waitlist_ref')
      .eq('unsubscribe_token', token)
      .maybeSingle();
    if (existing) {
      return { matched: true, ref: existing.user_or_waitlist_ref };
    }
    return { matched: false, ref: null };
  }

  // Record an event row for audit.
  try {
    await supabase.from('nurture_sequence_events').insert({
      enrollment_id: first.id,
      step_index: 0,
      event_type: 'unsubscribed',
      metadata: { via: 'public_unsubscribe_page' },
    });
  } catch {
    // Non-fatal — the enrollment state is what actually gates future
    // sends; event log is observability.
  }

  return { matched: true, ref: first.user_or_waitlist_ref };
}

// ---------------------------------------------------------------------------
// Due-row loading + step advancement
// ---------------------------------------------------------------------------

const DUE_BATCH_CAP = 500;

/**
 * Active enrollments whose `next_scheduled_at` is now-or-past. Caps at
 * 500 per run to keep a single cron tick bounded. Each row is returned
 * with its sequence definition joined so the cron doesn't make an N+1
 * query for template lookup.
 */
export async function listDueEnrollments(): Promise<DueEnrollmentRow[]> {
  const supabase = getServiceClient();
  const now = new Date().toISOString();

  const { data: enrollments, error } = await supabase
    .from('nurture_sequence_enrollments')
    .select('*')
    .eq('status', 'active')
    .lte('next_scheduled_at', now)
    .order('next_scheduled_at', { ascending: true })
    .limit(DUE_BATCH_CAP);

  if (error) {
    throw new Error(`Failed to list due enrollments: ${error.message}`);
  }

  const rows = (enrollments ?? []) as Enrollment[];
  if (rows.length === 0) return [];

  const neededIds = Array.from(new Set(rows.map((r) => r.sequence_id)));
  const definitions = new Map<string, SequenceDefinition>();
  for (const id of neededIds) {
    const def = await loadDefinition(id, supabase);
    if (def) definitions.set(id, def);
  }

  return rows
    .map((row) => {
      const seq = definitions.get(row.sequence_id);
      if (!seq) return null;
      return { ...row, sequence: seq };
    })
    .filter((r): r is DueEnrollmentRow => r !== null);
}

/**
 * Returns the concrete step to fire next for a given enrollment.
 * Returns null when the enrollment has walked past the last step
 * (cron should mark it completed instead of firing).
 */
export async function getNextDueStep(
  enrollmentId: string
): Promise<{
  enrollment: Enrollment;
  sequence: SequenceDefinition;
  step: SequenceStep;
  stepIndex: number;
} | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('nurture_sequence_enrollments')
    .select('*')
    .eq('id', enrollmentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const enrollment = data as Enrollment;
  if (enrollment.status !== 'active') return null;

  const sequence = await loadDefinition(enrollment.sequence_id, supabase);
  if (!sequence) return null;

  const idx = enrollment.current_step;
  if (idx < 0 || idx >= sequence.steps.length) return null;
  return { enrollment, sequence, step: sequence.steps[idx], stepIndex: idx };
}

const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Record the result of a step send and advance the enrollment. On
 * success: bump current_step, schedule next step or mark completed,
 * zero the failure counter. On failure: increment the counter; if we
 * reach MAX_CONSECUTIVE_FAILURES, mark the enrollment 'failed' and
 * stop scheduling.
 */
export async function markStepFired(
  enrollmentId: string,
  stepIndex: number,
  outcome: StepOutcome
): Promise<void> {
  const supabase = getServiceClient();

  // Event log — one row per outcome.
  try {
    await supabase.from('nurture_sequence_events').insert({
      enrollment_id: enrollmentId,
      step_index: stepIndex,
      event_type: outcome.kind === 'sent' ? 'sent' : 'failed',
      failure_reason: outcome.kind === 'failed' ? outcome.reason : null,
      metadata: outcome.metadata ?? {},
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[nurture-sequences] event insert failed', {
      enrollmentId,
      stepIndex,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Load the enrollment + its sequence for scheduling math.
  const { data: current, error: loadErr } = await supabase
    .from('nurture_sequence_enrollments')
    .select('*')
    .eq('id', enrollmentId)
    .maybeSingle();
  if (loadErr || !current) {
    throw new Error(
      `markStepFired: could not load enrollment ${enrollmentId}: ${
        loadErr?.message ?? 'not found'
      }`
    );
  }
  const enrollment = current as Enrollment;
  const sequence = await loadDefinition(enrollment.sequence_id, supabase);
  if (!sequence) {
    throw new Error(
      `markStepFired: sequence ${enrollment.sequence_id} not found`
    );
  }

  if (outcome.kind === 'sent') {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= sequence.steps.length) {
      await supabase
        .from('nurture_sequence_enrollments')
        .update({
          current_step: nextIndex,
          status: 'completed',
          next_scheduled_at: null,
          consecutive_failures: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', enrollmentId);
      return;
    }

    const thisOffset = sequence.steps[stepIndex].day_offset;
    const nextOffset = sequence.steps[nextIndex].day_offset;
    const gap = Math.max(1, nextOffset - thisOffset);
    const nextAt = scheduleForOffset(gap).toISOString();

    await supabase
      .from('nurture_sequence_enrollments')
      .update({
        current_step: nextIndex,
        next_scheduled_at: nextAt,
        consecutive_failures: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId);
    return;
  }

  // Failure path — increment consecutive failures and either retry
  // tomorrow or park the enrollment as 'failed'.
  const nextFailCount = enrollment.consecutive_failures + 1;
  if (nextFailCount >= MAX_CONSECUTIVE_FAILURES) {
    await supabase
      .from('nurture_sequence_enrollments')
      .update({
        status: 'failed',
        suppressed_reason: `max_consecutive_failures:${outcome.reason.slice(0, 120)}`,
        next_scheduled_at: null,
        consecutive_failures: nextFailCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId);
    return;
  }

  // Retry tomorrow — linear backoff; intentional simplicity for pilot.
  const retryAt = scheduleForOffset(1).toISOString();
  await supabase
    .from('nurture_sequence_enrollments')
    .update({
      consecutive_failures: nextFailCount,
      next_scheduled_at: retryAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', enrollmentId);
}

// ---------------------------------------------------------------------------
// Template validation — invoked by the cron before sending so a typo
// in a seeded sequence doesn't burn email inventory.
// ---------------------------------------------------------------------------

export function isKnownTemplate(templateKey: string): boolean {
  return hasNurtureTemplate(templateKey);
}

// ---------------------------------------------------------------------------
// Admin aggregates — for the /hs/admin/nurture-sequences dashboard.
// Read-only. Light joins; counts + rates only.
// ---------------------------------------------------------------------------

export interface SequenceSummary {
  sequence_id: string;
  role: string;
  description: string;
  active: boolean;
  enrolled: number;
  completed: number;
  converted: number;
  unsubscribed: number;
  failed: number;
  /** Ratio of converted to total enrolled (rounded to 2 decimals). */
  conversion_rate: number;
  /** Ratio of unsubscribed to total enrolled (rounded to 2 decimals). */
  unsubscribe_rate: number;
}

export async function listSequenceSummaries(): Promise<SequenceSummary[]> {
  const supabase = getServiceClient();

  const { data: defs, error: defsErr } = await supabase
    .from('nurture_sequence_definitions')
    .select('id, role, description, active')
    .order('role', { ascending: true });
  if (defsErr) {
    throw new Error(
      `Failed to list nurture definitions: ${defsErr.message}`
    );
  }

  const summaries: SequenceSummary[] = [];

  for (const def of defs ?? []) {
    const baseFilter = supabase
      .from('nurture_sequence_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('sequence_id', def.id);

    const [total, completed, converted, unsubscribed, failed] =
      await Promise.all([
        (async () => {
          const { count } = await baseFilter;
          return count ?? 0;
        })(),
        (async () => {
          const { count } = await supabase
            .from('nurture_sequence_enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('sequence_id', def.id)
            .eq('status', 'completed');
          return count ?? 0;
        })(),
        (async () => {
          const { count } = await supabase
            .from('nurture_sequence_enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('sequence_id', def.id)
            .eq('status', 'suppressed_converted');
          return count ?? 0;
        })(),
        (async () => {
          const { count } = await supabase
            .from('nurture_sequence_enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('sequence_id', def.id)
            .eq('status', 'unsubscribed');
          return count ?? 0;
        })(),
        (async () => {
          const { count } = await supabase
            .from('nurture_sequence_enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('sequence_id', def.id)
            .eq('status', 'failed');
          return count ?? 0;
        })(),
      ]);

    summaries.push({
      sequence_id: def.id,
      role: def.role,
      description: def.description,
      active: def.active,
      enrolled: total,
      completed,
      converted,
      unsubscribed,
      failed,
      conversion_rate:
        total > 0 ? Math.round((converted / total) * 10000) / 100 : 0,
      unsubscribe_rate:
        total > 0 ? Math.round((unsubscribed / total) * 10000) / 100 : 0,
    });
  }

  return summaries;
}
