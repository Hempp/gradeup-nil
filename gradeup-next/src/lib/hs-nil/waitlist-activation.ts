/**
 * HS-NIL — Waitlist Activation Service
 *
 * Core engine for the waitlist-to-signup conversion loop. When an admin
 * flips a state to "active pilot" (inserts a row into
 * state_pilot_activations with paused_at IS NULL), the sequencer drains
 * waiting rows from hs_waitlist in FIFO order, sends a role-specific
 * invite email with an opaque 32-byte token, and tracks conversion when
 * the recipient finishes signup.
 *
 * Design choices
 * ──────────────
 *
 * - **Email-or-nothing transactions.** We send the invite email first,
 *   and only commit invitation_token + activation_state='invited' to
 *   the row after a successful send. A failed send leaves the row in
 *   'waiting' so the next cron tick can retry — no orphan tokens, no
 *   rows stuck in 'invited' without ever having gotten the email.
 *
 *   Implementation: we generate the token, call send, and if send
 *   succeeds we run the UPDATE with a WHERE activation_state='waiting'
 *   guard so concurrent cron runs can't double-invite. If the UPDATE
 *   affected zero rows (someone else won the race), we mark the send
 *   as wasted (email already went out) but don't fail the batch.
 *
 * - **Throttle = 25 per state per run.** At a 4-hour cadence, this is
 *   150 invites/state/day max. The rationale is supply-side reality:
 *   we don't want to blast a state's entire list in a single batch,
 *   overwhelm our ops capacity for transcript review and consent
 *   support, and create a noisy launch. Trickle the list out over
 *   days/weeks. Callers can override via options.batchLimit when
 *   they know what they're doing (e.g. the admin activate-state
 *   endpoint passes 10 to warm up the admin UI with a small visible
 *   first batch).
 *
 * - **FIFO ordering.** oldest hs_waitlist rows get invited first.
 *   Honors loyalty — whoever joined the list first deserves the
 *   first invite — and gives us a predictable drain order.
 *
 * - **Service-role only.** The service_role client bypasses RLS and
 *   is the only way to write state_pilot_activations. Callers of
 *   this module (API routes, cron handler) are responsible for
 *   their own auth gating before invoking these functions.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import {
  sendWaitlistInvite,
  type WaitlistInviteRole,
} from '@/lib/services/hs-nil/waitlist-emails';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WaitingRow {
  id: string;
  email: string;
  role: WaitlistInviteRole;
  state_code: string;
  created_at: string;
}

export interface SequenceOptions {
  /** Max rows to process for this state in this call. */
  batchLimit?: number;
}

export interface SequenceResult {
  stateCode: string;
  processed: number;
  sent: number;
  failed: number;
}

export interface ActivableState {
  state_code: string;
  activated_at: string;
}

const DEFAULT_BATCH_LIMIT = 25;

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://gradeupnil.com';

// ---------------------------------------------------------------------------
// Service-role client
// ---------------------------------------------------------------------------

export function getWaitlistServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase service role not configured for waitlist activation (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// Active-state query
// ---------------------------------------------------------------------------

/**
 * Returns the state codes whose pilots are currently active (row
 * exists, paused_at IS NULL). The cron reads this to know which
 * states to drain.
 */
export async function getActivableStates(
  client?: SupabaseClient
): Promise<ActivableState[]> {
  const supabase = client ?? getWaitlistServiceClient();
  const { data, error } = await supabase
    .from('state_pilot_activations')
    .select('state_code, activated_at')
    .is('paused_at', null)
    .order('activated_at', { ascending: true });
  if (error) {
    throw new Error(`Failed to list activable states: ${error.message}`);
  }
  return (data ?? []) as ActivableState[];
}

// ---------------------------------------------------------------------------
// Token + helpers
// ---------------------------------------------------------------------------

function generateInvitationToken(): string {
  return randomBytes(32).toString('hex');
}

function buildInviteUrl(token: string): string {
  return `${APP_URL}/hs/invite/${token}`;
}

function buildOptOutUrl(token: string): string {
  return `${APP_URL}/hs/invite/${token}?opt_out=1`;
}

function weeksSince(createdAtIso: string): number | null {
  const t = Date.parse(createdAtIso);
  if (Number.isNaN(t)) return null;
  const ms = Date.now() - t;
  if (ms <= 0) return 0;
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24 * 7)));
}

// ---------------------------------------------------------------------------
// The sequencer
// ---------------------------------------------------------------------------

/**
 * Invite up to batchLimit waiting rows for a specific state. Returns
 * processed / sent / failed counts. Email-or-nothing: if the email
 * send fails the row is left in activation_state='waiting' with no
 * token committed.
 */
export async function sequenceInvitesForState(
  stateCode: string,
  options: SequenceOptions = {}
): Promise<SequenceResult> {
  const batchLimit = options.batchLimit ?? DEFAULT_BATCH_LIMIT;
  const supabase = getWaitlistServiceClient();

  // Safety: require the state to currently be active before we
  // invite anyone. This guards against manual misuse of the service
  // function (e.g. calling it directly from a script or from a
  // route that skipped the gate).
  const { data: activation, error: activationErr } = await supabase
    .from('state_pilot_activations')
    .select('state_code, paused_at')
    .eq('state_code', stateCode)
    .maybeSingle();
  if (activationErr) {
    throw new Error(
      `Failed to read state_pilot_activations for ${stateCode}: ${activationErr.message}`
    );
  }
  if (!activation || activation.paused_at !== null) {
    return { stateCode, processed: 0, sent: 0, failed: 0 };
  }

  const { data: rows, error: rowsErr } = await supabase
    .from('hs_waitlist')
    .select('id, email, role, state_code, created_at')
    .eq('state_code', stateCode)
    .eq('activation_state', 'waiting')
    .order('created_at', { ascending: true })
    .limit(batchLimit);

  if (rowsErr) {
    throw new Error(
      `Failed to select waiting waitlist rows for ${stateCode}: ${rowsErr.message}`
    );
  }

  const waiting = (rows ?? []) as WaitingRow[];

  let sent = 0;
  let failed = 0;

  for (const row of waiting) {
    const token = generateInvitationToken();
    const inviteUrl = buildInviteUrl(token);
    const optOutUrl = buildOptOutUrl(token);

    // Send first. If send fails, we never write the token and the
    // row stays 'waiting' for the next cron tick. Roles are constrained
    // by the CHECK on hs_waitlist.role — no runtime validation needed.
    let sendResult;
    try {
      sendResult = await sendWaitlistInvite({
        email: row.email,
        role: row.role,
        stateCode: row.state_code,
        invitationUrl: inviteUrl,
        optOutUrl,
        weeksOnWaitlist: weeksSince(row.created_at),
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[waitlist-activation] send threw', {
        waitlistId: row.id,
        stateCode,
        error: err instanceof Error ? err.message : String(err),
      });
      failed++;
      continue;
    }

    if (!sendResult.success) {
      // eslint-disable-next-line no-console
      console.warn('[waitlist-activation] send returned failure', {
        waitlistId: row.id,
        stateCode,
        error: sendResult.error ?? null,
      });
      failed++;
      continue;
    }

    // Commit the transition. The WHERE activation_state='waiting' guard
    // serializes with any concurrent cron — the loser observes 0 affected
    // rows. We treat that as a non-failure but *do* log: the email went
    // out, and the row is already 'invited' with whoever won's token.
    const { data: updated, error: updateErr } = await supabase
      .from('hs_waitlist')
      .update({
        invitation_token: token,
        invitation_sent_at: new Date().toISOString(),
        activation_state: 'invited',
      })
      .eq('id', row.id)
      .eq('activation_state', 'waiting')
      .select('id');

    if (updateErr) {
      // eslint-disable-next-line no-console
      console.warn('[waitlist-activation] update failed after send', {
        waitlistId: row.id,
        stateCode,
        error: updateErr.message,
      });
      failed++;
      continue;
    }

    if (!updated || updated.length === 0) {
      // Concurrency loss. Email still went out but another cron claimed
      // the row. Count it as sent so the metric reflects actual mail
      // traffic.
      // eslint-disable-next-line no-console
      console.warn('[waitlist-activation] concurrent invite — token not committed', {
        waitlistId: row.id,
        stateCode,
      });
      sent++;
      continue;
    }

    sent++;
  }

  return { stateCode, processed: waiting.length, sent, failed };
}

// ---------------------------------------------------------------------------
// Explicit transition helpers — used by the invite handler + signup hook.
// Kept in this file so all state transitions go through one place.
// ---------------------------------------------------------------------------

/**
 * Mark a waitlist row as invited. Not used in the happy-path sequencer
 * (which inlines the update), but exported for tests and for any future
 * manual invite flow.
 */
export async function markInvited(
  waitlistId: string,
  token: string
): Promise<void> {
  const supabase = getWaitlistServiceClient();
  const { error } = await supabase
    .from('hs_waitlist')
    .update({
      invitation_token: token,
      invitation_sent_at: new Date().toISOString(),
      activation_state: 'invited',
    })
    .eq('id', waitlistId)
    .eq('activation_state', 'waiting');
  if (error) {
    throw new Error(`Failed to mark waitlist ${waitlistId} as invited: ${error.message}`);
  }
}

/**
 * Mark a waitlist row as converted. Called from the signup pages when a
 * user finishes an HS signup and had the hs_invite cookie present.
 * Idempotent — if the row is already 'converted' the update is a no-op.
 */
export async function markConverted(
  token: string,
  userId: string
): Promise<{ matched: boolean }> {
  const supabase = getWaitlistServiceClient();
  const { data, error } = await supabase
    .from('hs_waitlist')
    .update({
      converted_user_id: userId,
      converted_at: new Date().toISOString(),
      activation_state: 'converted',
    })
    .eq('invitation_token', token)
    .in('activation_state', ['invited', 'waiting'])
    .select('id');
  if (error) {
    throw new Error(`Failed to mark token ${token.slice(0, 6)}... as converted: ${error.message}`);
  }
  return { matched: Array.isArray(data) && data.length > 0 };
}

/** Hard bounce — never retry this email. */
export async function markBounced(
  waitlistId: string,
  reason: string
): Promise<void> {
  const supabase = getWaitlistServiceClient();
  const { error } = await supabase
    .from('hs_waitlist')
    .update({ activation_state: 'bounced', bounce_reason: reason })
    .eq('id', waitlistId);
  if (error) {
    throw new Error(`Failed to mark waitlist ${waitlistId} as bounced: ${error.message}`);
  }
}

/** Opt-out — recipient clicked the footer opt-out link. */
export async function markOptedOut(token: string): Promise<{ matched: boolean }> {
  const supabase = getWaitlistServiceClient();
  const { data, error } = await supabase
    .from('hs_waitlist')
    .update({ activation_state: 'opted_out' })
    .eq('invitation_token', token)
    .in('activation_state', ['invited', 'waiting'])
    .select('id');
  if (error) {
    throw new Error(`Failed to mark token as opted_out: ${error.message}`);
  }
  return { matched: Array.isArray(data) && data.length > 0 };
}

// ---------------------------------------------------------------------------
// Token lookup — used by the /hs/invite/[token] handler.
// ---------------------------------------------------------------------------

export interface InviteTokenLookup {
  id: string;
  role: WaitlistInviteRole;
  state_code: string;
  email: string;
  activation_state: string;
}

export async function lookupInviteToken(
  token: string
): Promise<InviteTokenLookup | null> {
  if (!token || !/^[a-f0-9]{64}$/i.test(token)) return null;
  const supabase = getWaitlistServiceClient();
  const { data, error } = await supabase
    .from('hs_waitlist')
    .select('id, role, state_code, email, activation_state')
    .eq('invitation_token', token)
    .maybeSingle();
  if (error) {
    throw new Error(`lookupInviteToken failed: ${error.message}`);
  }
  return (data ?? null) as InviteTokenLookup | null;
}

// ---------------------------------------------------------------------------
// Conversion hook — called from signup success paths.
// ---------------------------------------------------------------------------

/**
 * Best-effort reconciliation: given an authed user id and (optionally)
 * their signup email, find a matching waitlist row and flip it to
 * 'converted'. Order of precedence:
 *   1. The invitation_token passed in (from the hs_invite cookie).
 *   2. If no token provided, match (email, role) against a row in
 *      state 'invited' or 'waiting' — this catches the case where
 *      the user hit the invite link but lost the cookie.
 *
 * This function never throws — it logs on failure and returns false.
 */
export async function reconcileSignupToWaitlist(args: {
  userId: string;
  email: string;
  role: WaitlistInviteRole;
  inviteToken?: string | null;
}): Promise<boolean> {
  const { userId, email, role, inviteToken } = args;
  try {
    if (inviteToken) {
      const { matched } = await markConverted(inviteToken, userId);
      if (matched) return true;
    }

    // Fallback: match by (email, role). Use the functional lower(email)
    // path to mirror the unique index.
    const supabase = getWaitlistServiceClient();
    const { data, error } = await supabase
      .from('hs_waitlist')
      .update({
        converted_user_id: userId,
        converted_at: new Date().toISOString(),
        activation_state: 'converted',
      })
      .ilike('email', email)
      .eq('role', role)
      .in('activation_state', ['invited', 'waiting'])
      .select('id');
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[waitlist-activation] reconcile fallback failed', {
        userId,
        role,
        error: error.message,
      });
      return false;
    }
    return Array.isArray(data) && data.length > 0;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[waitlist-activation] reconcile threw', {
      userId,
      role,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
