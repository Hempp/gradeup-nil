-- HS-NIL Athlete Parent Supervision Unlink
-- ============================================================
-- Lets a student-athlete remove parent supervision once they
-- turn 18 OR graduate from high school. Eligibility is computed
-- app-side from hs_athlete_profiles.date_of_birth and
-- hs_athlete_profiles.graduation_year; this migration only
-- adds the storage columns + index the app needs.
--
-- Data model decisions:
--   * Two new columns live on hs_athlete_profiles — one row per
--     athlete, so we don't need a join table for a per-athlete
--     boolean + reason.
--   * parent_unlinked_at is nullable. NULL means "supervision
--     active" (the default, covering every existing row). A
--     timestamp means "athlete has opted out, effective at that
--     moment". Re-linking clears the timestamp back to NULL.
--   * parent_unlink_reason is a free text column gated by a
--     CHECK enum so we can analyse why athletes unlink without
--     a full lookup table.
--   * We deliberately DO NOT touch hs_parent_athlete_links rows
--     or parental_consents rows here. Historical consent is
--     audit-critical and must remain queryable after unlink —
--     the 18-year-old unlinking today doesn't erase the fact
--     that their parent approved a deal last season. That
--     requirement drove the flag-on-profile approach over
--     deleting link rows.
--   * No RLS changes — hs_athlete_profiles already has
--     owner-scoped read/update policies (see 20260418_002),
--     and those policies cover the new columns automatically.
-- ============================================================

ALTER TABLE public.hs_athlete_profiles
  ADD COLUMN IF NOT EXISTS parent_unlinked_at timestamptz,
  ADD COLUMN IF NOT EXISTS parent_unlink_reason text;

-- Enum-like constraint. Added as a separate ALTER so it can be
-- re-run idempotently if the migration is replayed against a
-- database that already has the column but not the check.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'hs_athlete_profiles'
      AND constraint_name = 'hs_athlete_profiles_parent_unlink_reason_check'
  ) THEN
    ALTER TABLE public.hs_athlete_profiles
      ADD CONSTRAINT hs_athlete_profiles_parent_unlink_reason_check
      CHECK (
        parent_unlink_reason IS NULL
        OR parent_unlink_reason IN ('turned_18', 'graduated', 'athlete_choice')
      );
  END IF;
END $$;

-- Coherency check: reason without timestamp is nonsense. We
-- allow timestamp without reason (legacy imports, ops inserts)
-- but not the other way.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'hs_athlete_profiles'
      AND constraint_name = 'hs_athlete_profiles_parent_unlink_coherent_check'
  ) THEN
    ALTER TABLE public.hs_athlete_profiles
      ADD CONSTRAINT hs_athlete_profiles_parent_unlink_coherent_check
      CHECK (
        parent_unlink_reason IS NULL
        OR parent_unlinked_at IS NOT NULL
      );
  END IF;
END $$;

-- Partial index for the hot path: consent checks need a fast
-- "is this athlete unlinked?" lookup per deal. We keep it
-- partial so it's tiny — only unlinked rows are indexed.
CREATE INDEX IF NOT EXISTS idx_hs_athlete_profiles_parent_unlinked
  ON public.hs_athlete_profiles(user_id)
  WHERE parent_unlinked_at IS NOT NULL;

COMMENT ON COLUMN public.hs_athlete_profiles.parent_unlinked_at IS
  'When the athlete removed parent supervision. NULL = supervision active. Does NOT revoke prior parental_consents rows — those stay binding for the deals they already cover.';

COMMENT ON COLUMN public.hs_athlete_profiles.parent_unlink_reason IS
  'Why the athlete unlinked. Enum: turned_18 | graduated | athlete_choice. Null when parent_unlinked_at is null.';
