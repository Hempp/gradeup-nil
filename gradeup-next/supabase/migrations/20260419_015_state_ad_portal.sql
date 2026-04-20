-- HS-NIL State-AD Compliance Portal
-- ============================================================
-- Adds the state athletic-association AD-facing portal. State AD
-- compliance offices (CIF, FHSAA, GHSA, NJSIAA, ...) get a
-- read-only view of every HS NIL deal + disclosure in their
-- state, with a full audit trail of their own portal access.
--
-- Wedge rationale: NIL Club (our main competitor) asserts
-- compliance but has no AD-facing audit surface. State ADs are
-- the buyer NIL Club cannot address. Free distribution to state
-- compliance offices, defensible by per-state rules engine +
-- disclosure pipeline that already exists in the codebase.
--
-- Tables in this migration:
--   state_ad_assignments   — active AD ↔ state link; one user
--                            may cover multiple states, one state
--                            may have multiple AD contacts.
--   state_ad_portal_views  — append-only audit log of AD portal
--                            access for demonstrating clean
--                            data-access behavior.
--   state_ad_invitations   — admin-sent invitation tokens with
--                            30-day expiry. ADs cannot self-register.
-- Plus: extends profiles.role to accept 'state_ad'.
--
-- All tables RLS-enabled. Service role + narrowly-scoped self reads
-- only — no cross-state reads from the auth client.

-- ============================================================
-- 0. Extend profiles.role
-- ============================================================
-- The project uses the `user_role` enum type from the original
-- schema for `profiles.role`. Later phases added role values
-- ('director', 'hs_parent') by ALTER TYPE ... ADD VALUE. We extend
-- that same type with 'state_ad'. The block is idempotent and safe
-- to re-run.
--
-- If a future migration has converted `profiles.role` to a plain
-- text column guarded by a named CHECK constraint, the second block
-- below drops and recreates that constraint. Only one of the two
-- blocks will do work at runtime — the other is a no-op.

DO $$
BEGIN
  -- Path A: enum-type role column. ADD VALUE IF NOT EXISTS is
  -- Postgres 14+ and cannot run inside a transaction block when a
  -- statement that uses the new value runs in the same tx, so we
  -- run it in its own savepoint.
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'user_role'
  ) THEN
    BEGIN
      EXECUTE 'ALTER TYPE user_role ADD VALUE IF NOT EXISTS ''state_ad''';
    EXCEPTION WHEN duplicate_object THEN
      -- race or re-run — safe to ignore.
      NULL;
    END;
  END IF;
END $$;

-- Path B: text+CHECK role column. If a `profiles_role_check`
-- constraint exists, drop + recreate it to include 'state_ad'
-- alongside existing 'admin','athlete','brand','director','hs_parent'.
DO $$
DECLARE
  check_name text;
BEGIN
  SELECT conname INTO check_name
  FROM pg_constraint
  WHERE conrelid = 'public.profiles'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%role%IN%';

  IF check_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', check_name);
    EXECUTE 'ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check ' ||
            'CHECK (role IN (''admin'',''athlete'',''brand'',''director'',''hs_parent'',''state_ad''))';
  END IF;
END $$;

-- ============================================================
-- 1. state_ad_assignments
-- ============================================================
-- One row per (user, state) pairing. A single AD user may be
-- assigned to multiple states (e.g. a regional compliance
-- consultant covering several small states). A single state
-- may have multiple AD contacts (primary + deputy).
--
-- The UNIQUE constraint on (user_id, state_code) prevents
-- duplicate assignments; deactivation is soft via deactivated_at
-- so historical portal-access events remain interpretable.

CREATE TABLE IF NOT EXISTS public.state_ad_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_code text NOT NULL REFERENCES public.state_nil_rules(state_code),
  organization_name text NOT NULL,
  contact_email text,
  contact_phone text,
  activated_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, state_code)
);

CREATE INDEX IF NOT EXISTS idx_state_ad_assignments_user
  ON public.state_ad_assignments(user_id)
  WHERE deactivated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_state_ad_assignments_state
  ON public.state_ad_assignments(state_code)
  WHERE deactivated_at IS NULL;

COMMENT ON TABLE public.state_ad_assignments IS
  'Active state-AD ↔ state-code assignments. Multi-state allowed. Soft-delete via deactivated_at.';
COMMENT ON COLUMN public.state_ad_assignments.organization_name IS
  'Display name for the governing body, e.g. "CIF — California Interscholastic Federation".';

ALTER TABLE public.state_ad_assignments ENABLE ROW LEVEL SECURITY;

-- ADs can read their own assignment rows (so the UI can show
-- which states they cover). They cannot read other ADs'
-- assignments — that would leak who else has access.
CREATE POLICY state_ad_assignments_read_own ON public.state_ad_assignments
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- 2. state_ad_portal_views
-- ============================================================
-- Append-only audit log of every AD portal view. Lets ops
-- demonstrate to state associations that GradeUp doesn't
-- surreptitiously expose data: every page load, list, and
-- deal-detail drill is recorded with actor + resource.
--
-- resource_id is nullable because top-level views (dashboard,
-- deal_list, disclosure_list) aren't anchored to a specific row.
-- The (ad_user_id, viewed_at) index supports both the AD's
-- own audit view and admin's cross-AD audit view.

CREATE TABLE IF NOT EXISTS public.state_ad_portal_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_code text NOT NULL REFERENCES public.state_nil_rules(state_code),
  viewed_resource text NOT NULL CHECK (viewed_resource IN (
    'dashboard',
    'deal_list',
    'disclosure_list',
    'deal_detail',
    'invitations'
  )),
  resource_id uuid,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_state_ad_portal_views_user_time
  ON public.state_ad_portal_views(ad_user_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_state_ad_portal_views_state_time
  ON public.state_ad_portal_views(state_code, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_state_ad_portal_views_resource
  ON public.state_ad_portal_views(viewed_resource, resource_id)
  WHERE resource_id IS NOT NULL;

COMMENT ON TABLE public.state_ad_portal_views IS
  'Append-only audit log of AD portal access. Queryable by regular admins to flag excessive drilling.';

ALTER TABLE public.state_ad_portal_views ENABLE ROW LEVEL SECURITY;

-- ADs can read their own history (transparency: you see what we
-- saw you see). They cannot read other ADs' access logs.
CREATE POLICY state_ad_portal_views_read_own ON public.state_ad_portal_views
  FOR SELECT USING (auth.uid() = ad_user_id);

-- ============================================================
-- 3. state_ad_invitations
-- ============================================================
-- Admin-issued invitation tokens. Flow:
--   1. Admin inserts a row with state_code + invited_email +
--      random invitation_token + expires_at = now()+30d.
--   2. Invitation email lands in the AD's inbox with a signup
--      link that carries the token.
--   3. AD opens the link, signs up (creates auth.users row),
--      and the accept endpoint marks accepted_at + creates the
--      state_ad_assignments row.
--   4. Admin can revoke (rejected_at) or an unused invitation
--      expires naturally past expires_at.

CREATE TABLE IF NOT EXISTS public.state_ad_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invited_email text NOT NULL,
  state_code text NOT NULL REFERENCES public.state_nil_rules(state_code),
  organization_name text NOT NULL,
  invited_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invitation_token text NOT NULL UNIQUE,
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  rejected_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  accepted_by_user_id uuid REFERENCES auth.users(id),
  CHECK (expires_at > invited_at)
);

CREATE INDEX IF NOT EXISTS idx_state_ad_invitations_token
  ON public.state_ad_invitations(invitation_token);

CREATE INDEX IF NOT EXISTS idx_state_ad_invitations_open
  ON public.state_ad_invitations(state_code, invited_at DESC)
  WHERE accepted_at IS NULL AND rejected_at IS NULL;

COMMENT ON TABLE public.state_ad_invitations IS
  'Admin-issued AD invitation tokens. 30-day default expiry. ADs cannot self-register — token required.';

ALTER TABLE public.state_ad_invitations ENABLE ROW LEVEL SECURITY;

-- No auth-client policies: invitation flow is driven entirely by
-- service-role calls (admin invites + token acceptance happens
-- during signup before the new user has a stable session).
