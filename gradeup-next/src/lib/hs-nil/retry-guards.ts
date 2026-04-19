/**
 * HS-NIL Admin Retry Guards (Phase 9)
 * ---------------------------------------------------------------------------
 * Shared cooldown table for admin retries. Both single-row actions
 * (src/lib/hs-nil/admin-actions.ts) and bulk actions
 * (src/lib/hs-nil/bulk-actions.ts) write/read this table so retries
 * dedupe across flows.
 *
 * Split into its own module to avoid a circular dependency between the
 * single-row action layer (which writes the guard after mutating) and
 * the bulk layer (which checks the guard before calling the single-row
 * action).
 */

import {
  createClient as createServiceClient,
  type SupabaseClient,
} from '@supabase/supabase-js';

export type BulkTargetKind = 'disclosure' | 'payout' | 'link' | 'consent';

// Picked to match the "how long until it could plausibly be a fresh
// problem worth retrying" window per domain. See bulk-actions.ts for
// the rationale notes.
export const RETRY_GUARD_COOLDOWN_MINUTES: Record<BulkTargetKind, number> = {
  disclosure: 10,
  payout: 30,
  link: 5,
  consent: 60,
};

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil retry-guards] Supabase service role not configured ' +
        '(NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function checkRetryGuard(
  targetKind: BulkTargetKind,
  targetId: string,
  cooldownMinutes: number = RETRY_GUARD_COOLDOWN_MINUTES[targetKind]
): Promise<{ blocked: boolean; lastRetryAt?: string; unblockAt?: string }> {
  const sb = getServiceRoleClient();
  const { data, error } = await sb
    .from('admin_retry_guards')
    .select('last_retry_at')
    .eq('target_kind', targetKind)
    .eq('target_id', targetId)
    .maybeSingle();

  if (error || !data) return { blocked: false };

  const last = new Date(data.last_retry_at as string);
  const unblockMs = last.getTime() + cooldownMinutes * 60 * 1000;
  const blocked = Date.now() < unblockMs;
  return blocked
    ? {
        blocked: true,
        lastRetryAt: last.toISOString(),
        unblockAt: new Date(unblockMs).toISOString(),
      }
    : { blocked: false, lastRetryAt: last.toISOString() };
}

export async function writeRetryGuard(
  targetKind: BulkTargetKind,
  targetId: string,
  actorId: string,
  action: string
): Promise<void> {
  const sb = getServiceRoleClient();
  const { error } = await sb.from('admin_retry_guards').upsert(
    {
      target_kind: targetKind,
      target_id: targetId,
      last_retry_at: new Date().toISOString(),
      last_actor_user_id: actorId,
      last_action: action,
    },
    { onConflict: 'target_kind,target_id' }
  );
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil retry-guards] upsert failed', {
      targetKind,
      targetId,
      error: error.message,
    });
  }
}

export interface ActiveRetryGuard {
  target_kind: BulkTargetKind;
  target_id: string;
  last_retry_at: string;
  last_action: string | null;
}

export async function listActiveRetryGuards(
  withinMinutes: number = 60
): Promise<ActiveRetryGuard[]> {
  const sb = getServiceRoleClient();
  const since = new Date(
    Date.now() - withinMinutes * 60 * 1000
  ).toISOString();
  const { data, error } = await sb
    .from('admin_retry_guards')
    .select('target_kind, target_id, last_retry_at, last_action')
    .gte('last_retry_at', since)
    .order('last_retry_at', { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return data as unknown as ActiveRetryGuard[];
}
