/**
 * HS-NIL Athlete Trajectory Service
 * ----------------------------------------------------------------------------
 * Assembles the academic-athletic narrative surface:
 *   - GPA snapshots  (hs_athlete_gpa_snapshots)
 *   - Completed deals (deals where status IN ('paid', 'completed'))
 *   - Derived milestones (first tier entry, first consent, first deal, etc.)
 *
 * Plus share-token management for the public read-only page at
 * /hs/trajectory/[token].
 *
 * Writes are all service-role to make the ingestion paths (signup,
 * transcript approval, admin manual) independent of the caller's
 * auth context. Reads for the auth'd athlete page use the caller's
 * Supabase client so RLS still enforces scoping; the public page
 * calls getTrajectoryByPublicToken which opens a service-role
 * client internally (no RLS bypass on the client at any layer).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type VerificationTier =
  | 'self_reported'
  | 'user_submitted'
  | 'institution_verified';

export type SnapshotSource =
  | 'initial_signup'
  | 'transcript_approval'
  | 'manual_admin'
  | 'trajectory_import';

export interface GpaSnapshot {
  id: string;
  athleteUserId: string;
  gpa: number;
  tier: VerificationTier;
  source: SnapshotSource;
  sourceReferenceId: string | null;
  reportedAt: string; // ISO
  recordedAt: string; // ISO
  notes: string | null;
}

export interface TrajectoryDeal {
  id: string;
  brandName: string;
  brandLogoUrl: string | null;
  title: string;
  compensationCents: number;
  completedAt: string | null;
  createdAt: string;
}

export type MilestoneType =
  | 'consent_signed'
  | 'first_verified_gpa'
  | 'first_user_submitted_gpa'
  | 'first_institution_verified_gpa'
  | 'first_deal'
  | 'deal_completed';

export interface TrajectoryMilestone {
  type: MilestoneType;
  title: string;
  subtitle: string;
  date: string; // ISO
  iconHint: string;
  metadata?: Record<string, unknown>;
}

export interface TrajectoryIdentity {
  firstName: string;
  lastInitial: string;
  school: string | null;
  sport: string | null;
  stateCode: string | null;
  graduationYear: number | null;
  currentTier: VerificationTier | null;
  currentGpa: number | null;
}

export interface Trajectory {
  identity: TrajectoryIdentity;
  snapshots: GpaSnapshot[];
  deals: TrajectoryDeal[];
  milestones: TrajectoryMilestone[];
}

export interface TrajectoryShare {
  id: string;
  athleteUserId: string;
  publicToken: string;
  label: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  viewCount: number;
  createdAt: string;
  publicUrl: string;
}

// ----------------------------------------------------------------------------
// Service-role client (bypasses RLS — callers own their own auth)
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
// Token generation — 24-char URL-safe base62
// ----------------------------------------------------------------------------

const BASE62 =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generatePublicToken(length = 24): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += BASE62[bytes[i] % BASE62.length];
  }
  return out;
}

function publicUrlForToken(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
  return `${base}/hs/trajectory/${token}`;
}

// ----------------------------------------------------------------------------
// Row mappers
// ----------------------------------------------------------------------------

interface SnapshotRow {
  id: string;
  athlete_user_id: string;
  gpa: number | string;
  verification_tier: VerificationTier;
  source: SnapshotSource;
  source_reference_id: string | null;
  reported_at: string;
  recorded_at: string;
  notes: string | null;
}

function mapSnapshot(row: SnapshotRow): GpaSnapshot {
  const gpa = typeof row.gpa === 'string' ? Number(row.gpa) : row.gpa;
  return {
    id: row.id,
    athleteUserId: row.athlete_user_id,
    gpa: Number.isFinite(gpa) ? gpa : 0,
    tier: row.verification_tier,
    source: row.source,
    sourceReferenceId: row.source_reference_id,
    reportedAt: row.reported_at,
    recordedAt: row.recorded_at,
    notes: row.notes,
  };
}

interface ShareRow {
  id: string;
  athlete_user_id: string;
  public_token: string;
  label: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  view_count: number;
  created_at: string;
}

function mapShare(row: ShareRow): TrajectoryShare {
  return {
    id: row.id,
    athleteUserId: row.athlete_user_id,
    publicToken: row.public_token,
    label: row.label,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    viewCount: row.view_count,
    createdAt: row.created_at,
    publicUrl: publicUrlForToken(row.public_token),
  };
}

// ----------------------------------------------------------------------------
// captureGpaSnapshot — idempotent on source_reference_id
// ----------------------------------------------------------------------------

export interface CaptureGpaSnapshotInput {
  athleteUserId: string;
  gpa: number;
  tier: VerificationTier;
  source: SnapshotSource;
  /**
   * For source='transcript_approval' this is the transcript_submissions.id
   * — it makes the capture idempotent if the approval path re-runs.
   */
  sourceReferenceId?: string | null;
  /** Academic effective date (what the GPA was as of). Defaults to now. */
  reportedAt?: string;
  notes?: string | null;
}

export async function captureGpaSnapshot(
  input: CaptureGpaSnapshotInput
): Promise<GpaSnapshot> {
  if (!Number.isFinite(input.gpa) || input.gpa < 0 || input.gpa > 5) {
    throw new Error('captureGpaSnapshot: gpa must be a number in [0, 5].');
  }

  const sb = getServiceRoleClient();
  const reportedAt = input.reportedAt ?? new Date().toISOString();
  const sourceRefId = input.sourceReferenceId ?? null;

  // Idempotency: if a snapshot already exists for this source_reference_id
  // (non-null), update in place rather than append a duplicate.
  if (sourceRefId) {
    const { data: existing } = await sb
      .from('hs_athlete_gpa_snapshots')
      .select('id, athlete_user_id, gpa, verification_tier, source, source_reference_id, reported_at, recorded_at, notes')
      .eq('source_reference_id', sourceRefId)
      .maybeSingle<SnapshotRow>();

    if (existing) {
      const { data: updated, error: updateErr } = await sb
        .from('hs_athlete_gpa_snapshots')
        .update({
          gpa: input.gpa,
          verification_tier: input.tier,
          source: input.source,
          reported_at: reportedAt,
          notes: input.notes ?? existing.notes,
        })
        .eq('id', existing.id)
        .select(
          'id, athlete_user_id, gpa, verification_tier, source, source_reference_id, reported_at, recorded_at, notes'
        )
        .single<SnapshotRow>();
      if (updateErr || !updated) {
        throw new Error(
          `captureGpaSnapshot: update failed — ${updateErr?.message ?? 'no row returned'}`
        );
      }
      return mapSnapshot(updated);
    }
  }

  const { data: inserted, error: insertErr } = await sb
    .from('hs_athlete_gpa_snapshots')
    .insert({
      athlete_user_id: input.athleteUserId,
      gpa: input.gpa,
      verification_tier: input.tier,
      source: input.source,
      source_reference_id: sourceRefId,
      reported_at: reportedAt,
      notes: input.notes ?? null,
    })
    .select(
      'id, athlete_user_id, gpa, verification_tier, source, source_reference_id, reported_at, recorded_at, notes'
    )
    .single<SnapshotRow>();

  if (insertErr || !inserted) {
    throw new Error(
      `captureGpaSnapshot: insert failed — ${insertErr?.message ?? 'no row returned'}`
    );
  }
  return mapSnapshot(inserted);
}

// ----------------------------------------------------------------------------
// Assembly: identity + snapshots + deals + milestones
// ----------------------------------------------------------------------------

interface HsProfileRow {
  user_id: string;
  state_code: string | null;
  sport: string | null;
  school_name: string | null;
  graduation_year: number | null;
  gpa: number | string | null;
  gpa_verification_tier: VerificationTier | null;
}

interface AthleteNameRow {
  id: string;
  profile_id: string;
  first_name: string | null;
  last_name: string | null;
}

interface DealRow {
  id: string;
  title: string;
  status: string;
  compensation_amount: number | string;
  completed_at: string | null;
  created_at: string;
  brand:
    | { company_name: string; logo_url: string | null }
    | null;
}

interface ConsentRow {
  signed_at: string;
}

function dollarsToCents(v: number | string): number {
  const n = typeof v === 'string' ? Number(v) : v;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function deriveMilestones(
  snapshots: GpaSnapshot[],
  deals: TrajectoryDeal[],
  consentSignedAt: string | null
): TrajectoryMilestone[] {
  const out: TrajectoryMilestone[] = [];

  // First consent
  if (consentSignedAt) {
    out.push({
      type: 'consent_signed',
      title: 'Parental consent signed',
      subtitle: 'Athlete is eligible to sign deals.',
      date: consentSignedAt,
      iconHint: 'consent_signed',
    });
  }

  // First entry per tier
  const seenTiers = new Set<VerificationTier>();
  for (const s of snapshots) {
    if (seenTiers.has(s.tier)) continue;
    seenTiers.add(s.tier);
    if (s.tier === 'user_submitted') {
      out.push({
        type: 'first_user_submitted_gpa',
        title: 'Transcript-verified GPA',
        subtitle: `${s.gpa.toFixed(2)} GPA verified via transcript.`,
        date: s.reportedAt,
        iconHint: 'verified_gpa',
        metadata: { gpa: s.gpa },
      });
    } else if (s.tier === 'institution_verified') {
      out.push({
        type: 'first_institution_verified_gpa',
        title: 'Institution-verified GPA',
        subtitle: `${s.gpa.toFixed(2)} GPA verified by institution.`,
        date: s.reportedAt,
        iconHint: 'institution_verified',
        metadata: { gpa: s.gpa },
      });
    } else if (s.tier === 'self_reported' && s.source === 'initial_signup') {
      out.push({
        type: 'first_verified_gpa',
        title: 'Account created',
        subtitle: `${s.gpa.toFixed(2)} GPA reported at signup.`,
        date: s.reportedAt,
        iconHint: 'first_snapshot',
        metadata: { gpa: s.gpa },
      });
    }
  }

  // First completed deal
  if (deals.length > 0) {
    const sorted = [...deals].sort(
      (a, b) =>
        new Date(a.completedAt ?? a.createdAt).getTime() -
        new Date(b.completedAt ?? b.createdAt).getTime()
    );
    const first = sorted[0];
    out.push({
      type: 'first_deal',
      title: 'First completed deal',
      subtitle: `${first.brandName} — $${(first.compensationCents / 100).toLocaleString('en-US')}.`,
      date: first.completedAt ?? first.createdAt,
      iconHint: 'first_deal',
      metadata: { dealId: first.id, brandName: first.brandName },
    });
    // Every additional completed deal as its own milestone
    for (const d of sorted.slice(1)) {
      out.push({
        type: 'deal_completed',
        title: 'Deal completed',
        subtitle: `${d.brandName} — $${(d.compensationCents / 100).toLocaleString('en-US')}.`,
        date: d.completedAt ?? d.createdAt,
        iconHint: 'deal_completed',
        metadata: { dealId: d.id, brandName: d.brandName },
      });
    }
  }

  // Chronological
  out.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return out;
}

async function assembleTrajectory(
  sb: SupabaseClient,
  athleteUserId: string
): Promise<Trajectory | null> {
  const { data: profile, error: profileErr } = await sb
    .from('hs_athlete_profiles')
    .select(
      'user_id, state_code, sport, school_name, graduation_year, gpa, gpa_verification_tier'
    )
    .eq('user_id', athleteUserId)
    .maybeSingle<HsProfileRow>();

  if (profileErr || !profile) return null;

  // Athlete name comes from the athletes/profiles join, not hs_athlete_profiles.
  const { data: athleteRow } = await sb
    .from('athletes')
    .select('id, profile_id, first_name, last_name')
    .eq('profile_id', athleteUserId)
    .maybeSingle<AthleteNameRow>();

  const firstName = athleteRow?.first_name?.trim() || 'Scholar';
  const last = athleteRow?.last_name?.trim() || 'Athlete';
  const lastInitial = last.charAt(0).toUpperCase();

  // Snapshots
  const { data: snapshotRows } = await sb
    .from('hs_athlete_gpa_snapshots')
    .select(
      'id, athlete_user_id, gpa, verification_tier, source, source_reference_id, reported_at, recorded_at, notes'
    )
    .eq('athlete_user_id', athleteUserId)
    .order('reported_at', { ascending: true });

  const snapshots = (snapshotRows ?? []).map((r) =>
    mapSnapshot(r as SnapshotRow)
  );

  // Completed deals (only when we have an athletes row; otherwise skip)
  let deals: TrajectoryDeal[] = [];
  if (athleteRow?.id) {
    const { data: dealRows } = await sb
      .from('deals')
      .select(
        `id, title, status, compensation_amount, completed_at, created_at,
         brand:brands(company_name, logo_url)`
      )
      .eq('athlete_id', athleteRow.id)
      .in('status', ['paid', 'completed'])
      .order('completed_at', { ascending: true, nullsFirst: false });

    const rows = (dealRows ?? []) as unknown as DealRow[];
    deals = rows.map((r) => ({
      id: r.id,
      brandName: r.brand?.company_name ?? 'Unknown brand',
      brandLogoUrl: r.brand?.logo_url ?? null,
      title: r.title,
      compensationCents: dollarsToCents(r.compensation_amount),
      completedAt: r.completed_at,
      createdAt: r.created_at,
    }));
  }

  // First active consent — used for the consent milestone.
  const { data: consentRow } = await sb
    .from('parental_consents')
    .select('signed_at')
    .eq('athlete_user_id', athleteUserId)
    .is('revoked_at', null)
    .order('signed_at', { ascending: true })
    .limit(1)
    .maybeSingle<ConsentRow>();

  const milestones = deriveMilestones(
    snapshots,
    deals,
    consentRow?.signed_at ?? null
  );

  const currentGpa =
    profile.gpa !== null && profile.gpa !== undefined
      ? typeof profile.gpa === 'string'
        ? Number(profile.gpa)
        : profile.gpa
      : null;

  return {
    identity: {
      firstName,
      lastInitial,
      school: profile.school_name,
      sport: profile.sport,
      stateCode: profile.state_code,
      graduationYear: profile.graduation_year,
      currentTier: profile.gpa_verification_tier,
      currentGpa,
    },
    snapshots,
    deals,
    milestones,
  };
}

/**
 * Caller-scoped read: uses the passed Supabase client so RLS applies
 * (athlete reads own; brand-on-active-deal can read too). Used by the
 * auth'd dashboard pages.
 */
export async function getTrajectoryForAthlete(
  supabase: SupabaseClient,
  athleteUserId: string
): Promise<Trajectory | null> {
  return assembleTrajectory(supabase, athleteUserId);
}

// ----------------------------------------------------------------------------
// Public token resolution (service-role read)
// ----------------------------------------------------------------------------

export interface PublicTrajectoryResult {
  trajectory: Trajectory;
  share: TrajectoryShare;
}

/**
 * Public page entry point. Resolves the token, confirms it's live
 * (not revoked, not expired), assembles the trajectory, and
 * increments the view count. Returns null on miss / expired /
 * revoked — the page renders a friendly 404.
 */
export async function getTrajectoryByPublicToken(
  token: string
): Promise<PublicTrajectoryResult | null> {
  if (!token || typeof token !== 'string' || token.length < 16) return null;

  const sb = getServiceRoleClient();

  const { data: shareRow, error: shareErr } = await sb
    .from('hs_athlete_trajectory_shares')
    .select(
      'id, athlete_user_id, public_token, label, expires_at, revoked_at, view_count, created_at'
    )
    .eq('public_token', token)
    .maybeSingle<ShareRow>();

  if (shareErr || !shareRow) return null;
  if (shareRow.revoked_at) return null;
  if (shareRow.expires_at && new Date(shareRow.expires_at).getTime() < Date.now()) {
    return null;
  }

  const trajectory = await assembleTrajectory(sb, shareRow.athlete_user_id);
  if (!trajectory) return null;

  // Increment view count. Best-effort — a failure here doesn't block render.
  try {
    await sb
      .from('hs_athlete_trajectory_shares')
      .update({ view_count: shareRow.view_count + 1 })
      .eq('id', shareRow.id);
  } catch {
    // swallow — telemetry isn't critical path
  }

  return {
    trajectory,
    share: mapShare({ ...shareRow, view_count: shareRow.view_count + 1 }),
  };
}

// ----------------------------------------------------------------------------
// Share management — create / list / revoke
// ----------------------------------------------------------------------------

export interface CreateTrajectoryShareInput {
  athleteUserId: string;
  label?: string | null;
  /** If set, share auto-expires in this many days. */
  expiresInDays?: number | null;
}

export async function createTrajectoryShare(
  input: CreateTrajectoryShareInput
): Promise<TrajectoryShare> {
  const sb = getServiceRoleClient();

  // Collision-resilient: up to 3 retries if token already exists. 24 chars
  // of base62 gives ~142 bits of entropy — retries should never fire in
  // practice but the surface area is free to write.
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = generatePublicToken(24);
    const expiresAt =
      input.expiresInDays && input.expiresInDays > 0
        ? new Date(
            Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000
          ).toISOString()
        : null;

    const { data, error } = await sb
      .from('hs_athlete_trajectory_shares')
      .insert({
        athlete_user_id: input.athleteUserId,
        public_token: token,
        label: input.label ?? null,
        expires_at: expiresAt,
      })
      .select(
        'id, athlete_user_id, public_token, label, expires_at, revoked_at, view_count, created_at'
      )
      .single<ShareRow>();

    if (!error && data) return mapShare(data);
    // Unique-constraint collision — retry
    if (error && /duplicate|unique/i.test(error.message)) continue;
    throw new Error(
      `createTrajectoryShare: insert failed — ${error?.message ?? 'unknown'}`
    );
  }
  throw new Error('createTrajectoryShare: exceeded retry budget.');
}

export async function listTrajectorySharesForAthlete(
  supabase: SupabaseClient,
  athleteUserId: string
): Promise<TrajectoryShare[]> {
  const { data, error } = await supabase
    .from('hs_athlete_trajectory_shares')
    .select(
      'id, athlete_user_id, public_token, label, expires_at, revoked_at, view_count, created_at'
    )
    .eq('athlete_user_id', athleteUserId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as ShareRow[]).map(mapShare);
}

/**
 * Revokes by marking revoked_at. Enforces athlete ownership at the
 * service-role layer (RLS also enforces it for the anon client but
 * we want the layered check).
 */
export async function revokeTrajectoryShare(
  shareId: string,
  athleteUserId: string
): Promise<{ ok: boolean; reason?: string }> {
  const sb = getServiceRoleClient();
  const { data: row } = await sb
    .from('hs_athlete_trajectory_shares')
    .select('id, athlete_user_id, revoked_at')
    .eq('id', shareId)
    .maybeSingle<{ id: string; athlete_user_id: string; revoked_at: string | null }>();

  if (!row) return { ok: false, reason: 'not_found' };
  if (row.athlete_user_id !== athleteUserId) {
    return { ok: false, reason: 'forbidden' };
  }
  if (row.revoked_at) return { ok: true }; // idempotent

  const { error } = await sb
    .from('hs_athlete_trajectory_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', shareId);
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

// ----------------------------------------------------------------------------
// Formatting helpers (pure; safe to import from client components)
// ----------------------------------------------------------------------------

export function formatGpa(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toFixed(2);
}

export function tierLabel(tier: VerificationTier): string {
  switch (tier) {
    case 'self_reported':
      return 'Self-reported';
    case 'user_submitted':
      return 'Transcript-verified';
    case 'institution_verified':
      return 'Institution-verified';
  }
}
