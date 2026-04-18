/**
 * HS-NIL Athlete Identity Helper
 *
 * One job: guarantee a public.athletes row exists for a given auth user.
 *
 * Context
 * -------
 * `deals.athlete_id` FKs `athletes(id)`. College signup has always
 * created a matching athletes row, but HS signup (up through migration
 * 20260418_007) only created `hs_athlete_profiles`. That meant HS users
 * could exist without ever being wired into the deals pipeline.
 *
 * This helper closes that gap. It's idempotent by design — safe to call
 * from signup, onboarding, or a backfill sweep.
 *
 * Execution
 * ---------
 * Server-side only. Uses the service role client because:
 *   1. `profiles` row may not exist yet for fresh HS signups (the HS
 *      signup flow skips the profiles write), and the athletes FK to
 *      profiles would otherwise fail.
 *   2. RLS on `athletes` allows self-insert, but only when the caller's
 *      session is already authenticated against `profile_id = auth.uid()`.
 *      The service role bypass keeps the helper callable from contexts
 *      (API routes, migrations, cron sweeps) where the session isn't
 *      attached to the athlete.
 *
 * The helper never touches college flows — it only writes new rows, and
 * only for the passed-in user. Existing college athletes rows are left
 * alone (their `bracket` default is 'college').
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type AthleteBracket = 'college' | 'high_school';

export interface EnsureAthleteRowInput {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  /** Defaults to 'high_school' — the only caller right now is HS signup. */
  bracket?: AthleteBracket;
}

export interface EnsureAthleteRowResult {
  athleteId: string;
  /** True iff this call created the athletes row. False if it already existed. */
  created: boolean;
}

// ----------------------------------------------------------------------------
// Service-role client (server-only)
// ----------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase service role not configured (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ----------------------------------------------------------------------------
// ensureAthleteRow
// ----------------------------------------------------------------------------

/**
 * Upsert an athletes row for the given user, idempotent.
 *
 * Flow:
 *   1. If `athletes` row already exists for `profile_id = userId` → return it.
 *   2. Ensure a `profiles` row exists (HS signup skips this; create it now).
 *   3. Insert `athletes` row with `bracket` flag and searchable=false.
 *
 * Never throws for duplicate-insert races — re-reads the existing row.
 */
export async function ensureAthleteRow(
  input: EnsureAthleteRowInput
): Promise<EnsureAthleteRowResult> {
  const { userId, firstName, lastName, email, bracket = 'high_school' } = input;

  if (!userId) throw new Error('ensureAthleteRow: userId is required.');
  if (!email) throw new Error('ensureAthleteRow: email is required.');

  const supabase = getServiceRoleClient();

  // Step 1: already have one?
  const existing = await supabase
    .from('athletes')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle();

  if (existing.error && existing.error.code !== 'PGRST116') {
    throw new Error(
      `ensureAthleteRow: could not query athletes: ${existing.error.message}`
    );
  }

  if (existing.data?.id) {
    return { athleteId: existing.data.id as string, created: false };
  }

  // Step 2: ensure profiles row. HS signup doesn't write to profiles;
  // athletes.profile_id is a FK to profiles.id, so we need one.
  const profileInsert = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        email,
        role: 'athlete',
        first_name: firstName || null,
        last_name: lastName || null,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );

  if (profileInsert.error) {
    // Not fatal on duplicate-key — the upsert handles that. Anything else
    // is real: surface it.
    const msg = profileInsert.error.message || '';
    if (!/duplicate key/i.test(msg)) {
      throw new Error(
        `ensureAthleteRow: could not ensure profile: ${msg}`
      );
    }
  }

  // Step 3: insert the athletes row.
  const inserted = await supabase
    .from('athletes')
    .insert({
      profile_id: userId,
      first_name: firstName || 'Unknown',
      last_name: lastName || 'Unknown',
      email,
      bracket,
      is_searchable: false,
    })
    .select('id')
    .single();

  if (inserted.error) {
    // Duplicate race: a parallel caller won the insert. Re-read and return.
    const raced = await supabase
      .from('athletes')
      .select('id')
      .eq('profile_id', userId)
      .maybeSingle();
    if (raced.data?.id) {
      return { athleteId: raced.data.id as string, created: false };
    }
    throw new Error(
      `ensureAthleteRow: could not insert athlete: ${inserted.error.message}`
    );
  }

  return { athleteId: inserted.data.id as string, created: true };
}
