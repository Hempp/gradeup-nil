-- HS-NIL Phase 8 — Athlete GPA + Deal Trajectory
-- ============================================================
-- Adds historical GPA tracking and public shareable trajectories.
-- The "trajectory" is the recruiting-office story: four years of
-- GPA progression + completed deals + verification events — one
-- narrative view, link-shareable in a recruiting packet.
--
-- Today, `hs_athlete_profiles.gpa` is a point-in-time value that
-- gets overwritten on every transcript approval. The dashboard's
-- profile card shows the CURRENT number only. To render a
-- trajectory we need the history. This migration introduces:
--
--   1. `hs_athlete_gpa_snapshots` — append-mostly series of GPA
--      readings. One snapshot per source event: initial signup
--      (self-reported), each approved transcript submission
--      (user-submitted), and any admin-manual adjustment
--      (institution-verified or manual). `reported_at` captures
--      the academic date the GPA applies to (e.g. "end of Spring
--      2026") which may differ from `recorded_at` (when the DB
--      stored it). This matters for chart X-axis semantics.
--
--   2. `hs_athlete_trajectory_shares` — short URL-safe tokens
--      that unlock a public read-only view at /hs/trajectory/[token].
--      Expiry is optional. View count is incremented on every
--      render of the public page (service-role write). Athletes
--      can create, label, and revoke their own shares.
--
--   3. Idempotent backfill — every existing hs_athlete_profiles
--      row with a non-null gpa gets one snapshot at source
--      'trajectory_import' so charts don't start empty when the
--      migration lands.
--
-- RLS posture:
--   * hs_athlete_gpa_snapshots
--       athlete → SELECT own
--       brand   → SELECT on snapshots for athletes they have an
--                 active deal with (so the brand's athlete detail
--                 card can render the trajectory inline)
--       service role → INSERT + SELECT all (public page reads)
--   * hs_athlete_trajectory_shares
--       athlete → SELECT, INSERT, UPDATE (revoke/relabel), DELETE
--                 on own rows
--       service role → full access (public page lookup + view
--                      count increment)
-- ============================================================

-- ============================================================
-- 1. hs_athlete_gpa_snapshots
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hs_athlete_gpa_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gpa numeric(3,2) NOT NULL CHECK (gpa >= 0 AND gpa <= 5.0),
  verification_tier text NOT NULL
    CHECK (verification_tier IN ('self_reported', 'user_submitted', 'institution_verified')),
  source text NOT NULL
    CHECK (source IN ('initial_signup', 'transcript_approval', 'manual_admin', 'trajectory_import')),
  -- Nullable FK-style reference to the event that produced this snapshot.
  -- For `transcript_approval` it points at transcript_submissions.id.
  -- Left untyped (no FK) to avoid cross-table coupling that would break
  -- the backfill path (which predates any submission row).
  source_reference_id uuid,
  -- Academic effective date of the GPA reading (e.g. "Spring 2026
  -- transcript"). May be before, equal to, or — rarely — after
  -- recorded_at (a retroactive correction).
  reported_at timestamptz NOT NULL DEFAULT now(),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Primary timeline-query index: fetch one athlete's snapshots in
-- reported_at order for chart rendering.
CREATE INDEX IF NOT EXISTS idx_hs_gpa_snapshots_athlete_reported
  ON public.hs_athlete_gpa_snapshots(athlete_user_id, reported_at ASC);

-- Idempotency lookup: the service-layer upsert by source_reference_id
-- (for `transcript_approval`) hits this partial index.
CREATE INDEX IF NOT EXISTS idx_hs_gpa_snapshots_source_ref
  ON public.hs_athlete_gpa_snapshots(source_reference_id)
  WHERE source_reference_id IS NOT NULL;

ALTER TABLE public.hs_athlete_gpa_snapshots ENABLE ROW LEVEL SECURITY;

-- Athlete reads own snapshots.
CREATE POLICY hs_gpa_snapshots_read_own ON public.hs_athlete_gpa_snapshots
  FOR SELECT USING (auth.uid() = athlete_user_id);

-- Brand on an active (non-completed, non-canceled) deal with the athlete
-- may read the athlete's snapshots for their inline trajectory view.
-- `deals.athlete_id -> athletes.id`; we resolve via athletes.profile_id.
CREATE POLICY hs_gpa_snapshots_read_brand_on_active_deal ON public.hs_athlete_gpa_snapshots
  FOR SELECT USING (
    athlete_user_id IN (
      SELECT a.profile_id
      FROM public.deals d
      JOIN public.athletes a ON a.id = d.athlete_id
      JOIN public.brands b ON b.id = d.brand_id
      WHERE b.profile_id = auth.uid()
        AND d.status NOT IN ('canceled', 'declined', 'expired')
    )
  );

-- No public SELECT / INSERT / UPDATE policies. The public trajectory
-- page reads with the service role. Writes go through the service
-- role via src/lib/hs-nil/trajectory.ts.

COMMENT ON TABLE public.hs_athlete_gpa_snapshots IS
  'Append-mostly series of GPA readings per athlete. One row per source event. Backing table for the trajectory feature (/hs/athlete/trajectory and public /hs/trajectory/[token]).';
COMMENT ON COLUMN public.hs_athlete_gpa_snapshots.reported_at IS
  'Academic effective date of the GPA reading. Used as the X-axis in the trajectory chart.';
COMMENT ON COLUMN public.hs_athlete_gpa_snapshots.source_reference_id IS
  'Nullable reference to the event that produced this snapshot. For source=transcript_approval, this points at transcript_submissions.id (no FK — see migration notes).';


-- ============================================================
-- 2. hs_athlete_trajectory_shares
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hs_athlete_trajectory_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 24-char url-safe base62 token generated in Node. The app layer
  -- enforces length + alphabet; DB enforces uniqueness.
  public_token text UNIQUE NOT NULL
    CHECK (char_length(public_token) BETWEEN 16 AND 64),
  label text,
  expires_at timestamptz,
  revoked_at timestamptz,
  view_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hs_trajectory_shares_athlete
  ON public.hs_athlete_trajectory_shares(athlete_user_id, created_at DESC);

-- Token lookup for the public page. Not UNIQUE (that's the column
-- constraint); this is just for the fast path.
CREATE INDEX IF NOT EXISTS idx_hs_trajectory_shares_token
  ON public.hs_athlete_trajectory_shares(public_token);

ALTER TABLE public.hs_athlete_trajectory_shares ENABLE ROW LEVEL SECURITY;

-- Athlete CRUDs own share rows.
CREATE POLICY hs_trajectory_shares_select_own ON public.hs_athlete_trajectory_shares
  FOR SELECT USING (auth.uid() = athlete_user_id);

CREATE POLICY hs_trajectory_shares_insert_own ON public.hs_athlete_trajectory_shares
  FOR INSERT WITH CHECK (auth.uid() = athlete_user_id);

CREATE POLICY hs_trajectory_shares_update_own ON public.hs_athlete_trajectory_shares
  FOR UPDATE USING (auth.uid() = athlete_user_id)
  WITH CHECK (auth.uid() = athlete_user_id);

CREATE POLICY hs_trajectory_shares_delete_own ON public.hs_athlete_trajectory_shares
  FOR DELETE USING (auth.uid() = athlete_user_id);

-- The public page reads via the service role (no client-side RLS
-- bypass). No anonymous SELECT policy; that is intentional.

COMMENT ON TABLE public.hs_athlete_trajectory_shares IS
  'URL-safe tokens that unlock a public read-only trajectory at /hs/trajectory/[token]. Athlete-owned; public reads go through the service role.';


-- ============================================================
-- 3. Backfill — one snapshot per existing hs_athlete_profiles row
-- ============================================================
-- Idempotent: re-running is a no-op because we only INSERT when
-- the athlete has zero existing snapshots. Deployments that have
-- partial snapshot data (e.g. from a mid-rollout apply) are safe
-- because the NOT EXISTS gate runs per-athlete.
-- ============================================================

DO $$
BEGIN
  INSERT INTO public.hs_athlete_gpa_snapshots
    (athlete_user_id, gpa, verification_tier, source, reported_at, recorded_at, notes)
  SELECT
    p.user_id,
    p.gpa,
    p.gpa_verification_tier,
    'trajectory_import',
    COALESCE(p.verified_at, p.created_at),
    now(),
    'Backfilled from hs_athlete_profiles on trajectory-feature rollout.'
  FROM public.hs_athlete_profiles p
  WHERE p.gpa IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.hs_athlete_gpa_snapshots s
      WHERE s.athlete_user_id = p.user_id
    );
END $$;
