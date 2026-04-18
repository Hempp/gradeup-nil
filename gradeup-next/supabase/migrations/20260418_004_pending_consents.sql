-- ============================================================
-- pending_consents
-- ============================================================
-- Holds short-lived signing tokens for the HS-NIL parental consent
-- flow. An athlete initiates consent, which inserts a row here with
-- a cryptographically-random token. The parent lands on
-- /hs/consent/[token] via email, submits the signing form, and the
-- handler resolves the token, writes the durable record into
-- public.parental_consents, and marks this row consumed.
--
-- Design notes:
--   * Tokens live here (not just in-memory) so a parent clicking the
--     email link hours later still works, and so multiple server
--     instances / edge regions share state.
--   * Rows are effectively single-use (consumed_at sets on signing).
--   * Expired or consumed rows can be vacuumed by a cleanup job.
--   * No public SELECT — parents pull details via the server route,
--     which uses the service role.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pending_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  athlete_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_email text NOT NULL,
  parent_full_name text,
  scope jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_pending_consents_token ON public.pending_consents(token);
CREATE INDEX IF NOT EXISTS idx_pending_consents_active
  ON public.pending_consents(athlete_user_id, consumed_at)
  WHERE consumed_at IS NULL;

ALTER TABLE public.pending_consents ENABLE ROW LEVEL SECURITY;

-- The initiating athlete may see the pending invites they created
-- (e.g. to surface "waiting on parent signature" in their dashboard).
CREATE POLICY pending_consents_initiator_read ON public.pending_consents
  FOR SELECT USING (auth.uid() = athlete_user_id);

-- No anon/public SELECT, INSERT, UPDATE or DELETE policies. All
-- server-side writes happen via the service role, which bypasses RLS.
