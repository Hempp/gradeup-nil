-- HS-NIL Phase 0 Foundations
-- ============================================================
-- Data model scaffolding for the high-school NIL beta. Gated
-- in the app via FEATURE_HS_NIL env flag. Schema is additive;
-- nothing here affects existing college NIL flows.
--
-- Tables:
--   hs_athlete_profiles   — extends base athlete_profiles for HS-specific data
--   parental_consents     — signed consent records linking minor athlete to parent/guardian
--   state_nil_rules       — authoritative per-state rule set (source of truth; seed below)
--   hs_deal_disclosures   — outbound compliance disclosure log
--
-- All tables have RLS enabled. Policies follow the principle of least privilege.

-- ============================================================
-- state_nil_rules
-- ============================================================

CREATE TABLE IF NOT EXISTS public.state_nil_rules (
  state_code text PRIMARY KEY CHECK (char_length(state_code) = 2),
  status text NOT NULL CHECK (status IN ('permitted', 'limited', 'prohibited', 'transitioning')),
  minimum_age int,
  requires_parental_consent boolean NOT NULL DEFAULT true,
  disclosure_window_hours int,
  disclosure_recipient text CHECK (disclosure_recipient IN ('state_athletic_association', 'school', 'both')),
  banned_categories text[] NOT NULL DEFAULT ARRAY['gambling','alcohol','tobacco','cannabis','adult','weapons'],
  agent_registration_required boolean NOT NULL DEFAULT false,
  payment_deferred_until_age_18 boolean NOT NULL DEFAULT false,
  notes text,
  last_reviewed date NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE public.state_nil_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY state_nil_rules_read_all ON public.state_nil_rules
  FOR SELECT USING (true);

-- Seed pilot states
INSERT INTO public.state_nil_rules
  (state_code, status, minimum_age, disclosure_window_hours, disclosure_recipient, banned_categories, agent_registration_required, notes)
VALUES
  ('CA', 'permitted', NULL, 72,  'state_athletic_association', ARRAY['gambling','alcohol','tobacco','cannabis','adult','weapons','vaping'], false, 'CIF governs. Largest TAM.'),
  ('FL', 'permitted', NULL, 168, 'school',                     ARRAY['gambling','alcohol','tobacco','cannabis','adult','weapons'],          true,  'FHSAA + DBPR agent registry.'),
  ('GA', 'permitted', NULL, 168, 'school',                     ARRAY['gambling','alcohol','tobacco','cannabis','adult','weapons'],          false, 'GHSA permissive. Middle school included.'),
  ('TX', 'limited',   17,   336, 'both',                       ARRAY['gambling','alcohol','tobacco','cannabis','adult','weapons'],          false, 'UIL 17+ + escrow until 18. Deferred from pilot.'),
  ('AL', 'prohibited', NULL, NULL, NULL,                       ARRAY['gambling','alcohol','tobacco','cannabis','adult','weapons'],          false, 'AHSAA prohibits.'),
  ('HI', 'prohibited', NULL, NULL, NULL,                       ARRAY['gambling','alcohol','tobacco','cannabis','adult','weapons'],          false, 'HHSAA prohibits.'),
  ('IN', 'prohibited', NULL, NULL, NULL,                       ARRAY['gambling','alcohol','tobacco','cannabis','adult','weapons'],          false, 'IHSAA prohibits.'),
  ('MI', 'prohibited', NULL, NULL, NULL,                       ARRAY['gambling','alcohol','tobacco','cannabis','adult','weapons'],          false, 'MHSAA prohibits.'),
  ('WY', 'prohibited', NULL, NULL, NULL,                       ARRAY['gambling','alcohol','tobacco','cannabis','adult','weapons'],          false, 'WHSAA prohibits.')
ON CONFLICT (state_code) DO NOTHING;

-- ============================================================
-- hs_athlete_profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hs_athlete_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_code text NOT NULL REFERENCES public.state_nil_rules(state_code),
  date_of_birth date NOT NULL,
  graduation_year int NOT NULL CHECK (graduation_year BETWEEN 2026 AND 2035),
  school_name text NOT NULL,
  sport text NOT NULL,
  gpa numeric(3,2) CHECK (gpa IS NULL OR (gpa >= 0 AND gpa <= 5.0)),
  gpa_verification_tier text NOT NULL DEFAULT 'self_reported'
    CHECK (gpa_verification_tier IN ('self_reported', 'user_submitted', 'institution_verified')),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX idx_hs_athlete_profiles_state ON public.hs_athlete_profiles(state_code);
CREATE INDEX idx_hs_athlete_profiles_school ON public.hs_athlete_profiles(school_name);

ALTER TABLE public.hs_athlete_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY hs_athlete_profiles_read_own ON public.hs_athlete_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY hs_athlete_profiles_insert_own ON public.hs_athlete_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY hs_athlete_profiles_update_own ON public.hs_athlete_profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- parental_consents
-- ============================================================

CREATE TABLE IF NOT EXISTS public.parental_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_email text NOT NULL,
  parent_full_name text NOT NULL,
  relationship text NOT NULL CHECK (relationship IN ('parent', 'legal_guardian')),
  signed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  signature_method text NOT NULL CHECK (signature_method IN ('e_signature', 'notarized_upload', 'video_attestation')),
  identity_verified boolean NOT NULL DEFAULT false,
  identity_verification_provider text CHECK (identity_verification_provider IN ('stripe_identity', 'persona', NULL)),
  identity_verification_reference text,
  scope jsonb NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > signed_at)
);

COMMENT ON COLUMN public.parental_consents.scope IS
  'JSON describing what the consent covers: {deal_categories: [], max_deal_amount: N, duration_months: N}';

CREATE INDEX idx_parental_consents_athlete ON public.parental_consents(athlete_user_id);
CREATE INDEX idx_parental_consents_active ON public.parental_consents(athlete_user_id, expires_at) WHERE revoked_at IS NULL;

ALTER TABLE public.parental_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY parental_consents_read_own ON public.parental_consents
  FOR SELECT USING (auth.uid() = athlete_user_id);

CREATE POLICY parental_consents_insert_self ON public.parental_consents
  FOR INSERT WITH CHECK (auth.uid() = athlete_user_id);

-- ============================================================
-- hs_deal_disclosures
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hs_deal_disclosures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  athlete_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_code text NOT NULL REFERENCES public.state_nil_rules(state_code),
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  recipient text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hs_deal_disclosures_pending ON public.hs_deal_disclosures(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_hs_deal_disclosures_athlete ON public.hs_deal_disclosures(athlete_user_id);

ALTER TABLE public.hs_deal_disclosures ENABLE ROW LEVEL SECURITY;

CREATE POLICY hs_deal_disclosures_read_own ON public.hs_deal_disclosures
  FOR SELECT USING (auth.uid() = athlete_user_id);

-- ============================================================
-- updated_at trigger (reuse existing function if present)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    EXECUTE 'CREATE TRIGGER trg_hs_athlete_profiles_updated_at
             BEFORE UPDATE ON public.hs_athlete_profiles
             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  END IF;
END $$;
