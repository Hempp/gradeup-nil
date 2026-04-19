-- HS-NIL Phase 10 — Multi-state expansion
-- ============================================================
-- Extends the state_nil_rules seed from Phase 0 to cover the
-- expanded pilot set. Previously CA/FL/GA were the only permitted
-- pilot jurisdictions; this migration lights up IL, NJ, NY and
-- refreshes TX (kept as 'limited' — escrow-until-18 flow deferred
-- to Phase 11) plus annotates GA's middle-school eligibility.
--
-- Idempotent: every row uses ON CONFLICT (state_code) DO UPDATE so
-- re-running this migration is safe and will refresh notes /
-- rule values to the values encoded below.
--
-- Source of truth mirror: src/lib/hs-nil/state-rules.ts must stay
-- in lockstep with these rows. Any change here requires a matching
-- change there and vice versa.

-- ------------------------------------------------------------
-- IL — Illinois (IHSA permits; 14-day disclosure to school)
-- ------------------------------------------------------------
INSERT INTO public.state_nil_rules
  (state_code, status, minimum_age, requires_parental_consent, disclosure_window_hours,
   disclosure_recipient, banned_categories, agent_registration_required,
   payment_deferred_until_age_18, notes, last_reviewed)
VALUES
  ('IL', 'permitted', NULL, true, 336, 'school',
   ARRAY['gambling','alcohol','tobacco','cannabis','adult','weapons','vaping'],
   false, false,
   'IHSA permits HS NIL with 14-day school disclosure window. No age floor. Vaping added to statewide bans.',
   CURRENT_DATE)
ON CONFLICT (state_code) DO UPDATE SET
  status = EXCLUDED.status,
  minimum_age = EXCLUDED.minimum_age,
  requires_parental_consent = EXCLUDED.requires_parental_consent,
  disclosure_window_hours = EXCLUDED.disclosure_window_hours,
  disclosure_recipient = EXCLUDED.disclosure_recipient,
  banned_categories = EXCLUDED.banned_categories,
  agent_registration_required = EXCLUDED.agent_registration_required,
  payment_deferred_until_age_18 = EXCLUDED.payment_deferred_until_age_18,
  notes = EXCLUDED.notes,
  last_reviewed = EXCLUDED.last_reviewed;

-- ------------------------------------------------------------
-- NJ — New Jersey (NJSIAA; 72h disclosure to state association)
-- ------------------------------------------------------------
INSERT INTO public.state_nil_rules
  (state_code, status, minimum_age, requires_parental_consent, disclosure_window_hours,
   disclosure_recipient, banned_categories, agent_registration_required,
   payment_deferred_until_age_18, notes, last_reviewed)
VALUES
  ('NJ', 'permitted', NULL, true, 72, 'state_athletic_association',
   ARRAY['gambling','alcohol','tobacco','cannabis','adult','weapons'],
   false, false,
   'NJSIAA permits HS NIL with a 72-hour state-association disclosure. Standard banned categories. No agent registry requirement.',
   CURRENT_DATE)
ON CONFLICT (state_code) DO UPDATE SET
  status = EXCLUDED.status,
  minimum_age = EXCLUDED.minimum_age,
  requires_parental_consent = EXCLUDED.requires_parental_consent,
  disclosure_window_hours = EXCLUDED.disclosure_window_hours,
  disclosure_recipient = EXCLUDED.disclosure_recipient,
  banned_categories = EXCLUDED.banned_categories,
  agent_registration_required = EXCLUDED.agent_registration_required,
  payment_deferred_until_age_18 = EXCLUDED.payment_deferred_until_age_18,
  notes = EXCLUDED.notes,
  last_reviewed = EXCLUDED.last_reviewed;

-- ------------------------------------------------------------
-- NY — New York (NYSPHSAA; 7-day disclosure to BOTH state + school)
-- ------------------------------------------------------------
INSERT INTO public.state_nil_rules
  (state_code, status, minimum_age, requires_parental_consent, disclosure_window_hours,
   disclosure_recipient, banned_categories, agent_registration_required,
   payment_deferred_until_age_18, notes, last_reviewed)
VALUES
  ('NY', 'permitted', NULL, true, 168, 'both',
   ARRAY['gambling','alcohol','tobacco','cannabis','adult','weapons'],
   false, false,
   'NYSPHSAA permits HS NIL. 7-day disclosure required to BOTH the state athletic association and the school. Standard banned categories.',
   CURRENT_DATE)
ON CONFLICT (state_code) DO UPDATE SET
  status = EXCLUDED.status,
  minimum_age = EXCLUDED.minimum_age,
  requires_parental_consent = EXCLUDED.requires_parental_consent,
  disclosure_window_hours = EXCLUDED.disclosure_window_hours,
  disclosure_recipient = EXCLUDED.disclosure_recipient,
  banned_categories = EXCLUDED.banned_categories,
  agent_registration_required = EXCLUDED.agent_registration_required,
  payment_deferred_until_age_18 = EXCLUDED.payment_deferred_until_age_18,
  notes = EXCLUDED.notes,
  last_reviewed = EXCLUDED.last_reviewed;

-- ------------------------------------------------------------
-- TX — Texas (UIL; 17+ minimum, escrow until age 18 required)
-- Re-asserted here so re-running the migration refreshes the
-- notes column and confirms 'limited' status. Still NOT a pilot
-- state on the app side: the escrow-until-18 payout flow is
-- Phase 11+ work and the app UI does not yet support it.
-- ------------------------------------------------------------
INSERT INTO public.state_nil_rules
  (state_code, status, minimum_age, requires_parental_consent, disclosure_window_hours,
   disclosure_recipient, banned_categories, agent_registration_required,
   payment_deferred_until_age_18, notes, last_reviewed)
VALUES
  ('TX', 'limited', 17, true, 168, 'school',
   ARRAY['gambling','alcohol','tobacco','cannabis','adult','weapons'],
   false, true,
   'UIL permits HS NIL with restrictions: minimum age 17, compensation must be held in escrow until the athlete turns 18. Deferred-escrow payout flow is Phase 11+ — TX is listed here as ''limited'' but excluded from the app-side PILOT_STATES until the escrow-until-18 UI lands.',
   CURRENT_DATE)
ON CONFLICT (state_code) DO UPDATE SET
  status = EXCLUDED.status,
  minimum_age = EXCLUDED.minimum_age,
  requires_parental_consent = EXCLUDED.requires_parental_consent,
  disclosure_window_hours = EXCLUDED.disclosure_window_hours,
  disclosure_recipient = EXCLUDED.disclosure_recipient,
  banned_categories = EXCLUDED.banned_categories,
  agent_registration_required = EXCLUDED.agent_registration_required,
  payment_deferred_until_age_18 = EXCLUDED.payment_deferred_until_age_18,
  notes = EXCLUDED.notes,
  last_reviewed = EXCLUDED.last_reviewed;

-- ------------------------------------------------------------
-- GA — middle-school nuance
-- GHSA permits middle-school athletes to participate in HS NIL.
-- Captured here via an annotated notes update rather than a
-- separate jurisdiction row.
-- ------------------------------------------------------------
UPDATE public.state_nil_rules
   SET notes = 'GHSA permissive. No minimum age. Middle-school athletes (grades 6-8) are eligible under GHSA 2025 guidance, subject to the same parental-consent + school-disclosure rules as HS athletes.',
       last_reviewed = CURRENT_DATE
 WHERE state_code = 'GA';
