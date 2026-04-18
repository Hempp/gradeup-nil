-- HS-NIL Share-the-Win: Share Templates + Share Events
-- ============================================================
-- Phase 6 viral amplifier. When a deal reaches `fully_signed`,
-- the athlete and parent land on a celebration page with brand-
-- approved share copy for Instagram, LinkedIn, X, TikTok, and a
-- generic copy-link. This migration introduces:
--
--   1. `deal_share_templates` — per-deal, per-platform share copy
--      authored by the brand. Templates contain `{athleteFirstName}`,
--      `{brandName}`, `{schoolName}` placeholders that the render
--      step fills at celebration time. If no template exists for a
--      platform, the celebration page falls back to a generated
--      default (NOT persisted — ephemeral render fallback).
--
--   2. `deal_share_events` — one row per share-click event. Tracks
--      `platform` (what the user picked), the `user_role` (athlete
--      vs parent), optional `template_id` (nullable: user may have
--      fired from a default fallback), and optional `user_agent`
--      for future device/browser analytics.
--
-- RLS posture:
--   * `deal_share_templates` — brand owner (the brand profile on
--     the deal) can CRUD; the athlete + linked parent on the deal
--     can SELECT; no public access.
--   * `deal_share_events` — the clicking user can SELECT + INSERT
--     their own events; the brand owner of the deal can SELECT
--     (aggregate view for the brand deal detail). No public access.
--     Service role reads all for admin dashboards.
--
-- Placeholder syntax:
--   We use `{athleteFirstName}` (NOT dollar-brace form) because JS
--   template literals would accidentally interpolate if the stored
--   template ever hit a dynamic-eval renderer. Curly-only is safe
--   for `String.prototype.replace` and for manual substitution.
-- ============================================================

-- ============================================================
-- 1. deal_share_templates
-- ============================================================

CREATE TABLE IF NOT EXISTS public.deal_share_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('instagram', 'linkedin', 'x', 'tiktok', 'generic')),
  copy_template text NOT NULL,
  hashtags text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_deal_share_templates_deal
  ON public.deal_share_templates(deal_id);

ALTER TABLE public.deal_share_templates ENABLE ROW LEVEL SECURITY;

-- Brand owner CRUD — the brand that owns the deal is identified by
-- deals.brand_id -> brands.profile_id = auth.uid().
CREATE POLICY deal_share_templates_brand_select ON public.deal_share_templates
  FOR SELECT USING (
    deal_id IN (
      SELECT d.id
      FROM public.deals d
      JOIN public.brands b ON b.id = d.brand_id
      WHERE b.profile_id = auth.uid()
    )
  );

CREATE POLICY deal_share_templates_brand_insert ON public.deal_share_templates
  FOR INSERT WITH CHECK (
    deal_id IN (
      SELECT d.id
      FROM public.deals d
      JOIN public.brands b ON b.id = d.brand_id
      WHERE b.profile_id = auth.uid()
    )
  );

CREATE POLICY deal_share_templates_brand_update ON public.deal_share_templates
  FOR UPDATE USING (
    deal_id IN (
      SELECT d.id
      FROM public.deals d
      JOIN public.brands b ON b.id = d.brand_id
      WHERE b.profile_id = auth.uid()
    )
  ) WITH CHECK (
    deal_id IN (
      SELECT d.id
      FROM public.deals d
      JOIN public.brands b ON b.id = d.brand_id
      WHERE b.profile_id = auth.uid()
    )
  );

CREATE POLICY deal_share_templates_brand_delete ON public.deal_share_templates
  FOR DELETE USING (
    deal_id IN (
      SELECT d.id
      FROM public.deals d
      JOIN public.brands b ON b.id = d.brand_id
      WHERE b.profile_id = auth.uid()
    )
  );

-- Athlete on the deal can SELECT (so the celebration page renders).
CREATE POLICY deal_share_templates_athlete_read ON public.deal_share_templates
  FOR SELECT USING (
    deal_id IN (
      SELECT d.id
      FROM public.deals d
      JOIN public.athletes a ON a.id = d.athlete_id
      WHERE a.profile_id = auth.uid()
    )
  );

-- Linked parent on the deal's athlete can SELECT.
CREATE POLICY deal_share_templates_parent_read ON public.deal_share_templates
  FOR SELECT USING (
    deal_id IN (
      SELECT d.id
      FROM public.deals d
      JOIN public.athletes a ON a.id = d.athlete_id
      JOIN public.hs_parent_athlete_links l
        ON l.athlete_user_id = a.profile_id
       AND l.verified_at IS NOT NULL
      JOIN public.hs_parent_profiles p
        ON p.id = l.parent_profile_id
      WHERE p.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.deal_share_templates IS
  'Brand-authored share copy per deal per platform. Placeholders: {athleteFirstName}, {brandName}, {schoolName}. Celebration page falls back to ephemeral defaults when no row exists for a platform.';
COMMENT ON COLUMN public.deal_share_templates.copy_template IS
  'Share copy template. Placeholders {athleteFirstName}, {brandName}, {schoolName} are substituted at render time.';

-- ============================================================
-- 2. deal_share_events
-- ============================================================

CREATE TABLE IF NOT EXISTS public.deal_share_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_role text NOT NULL CHECK (user_role IN ('athlete', 'parent')),
  platform text NOT NULL CHECK (platform IN ('instagram', 'linkedin', 'x', 'tiktok', 'copy_link')),
  template_id uuid REFERENCES public.deal_share_templates(id) ON DELETE SET NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_share_events_deal
  ON public.deal_share_events(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_share_events_user
  ON public.deal_share_events(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_share_events_deal_platform
  ON public.deal_share_events(deal_id, platform);

ALTER TABLE public.deal_share_events ENABLE ROW LEVEL SECURITY;

-- Clicking user can see + insert their own events.
CREATE POLICY deal_share_events_self_select ON public.deal_share_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY deal_share_events_self_insert ON public.deal_share_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Brand owner of the deal can SELECT aggregate events.
CREATE POLICY deal_share_events_brand_select ON public.deal_share_events
  FOR SELECT USING (
    deal_id IN (
      SELECT d.id
      FROM public.deals d
      JOIN public.brands b ON b.id = d.brand_id
      WHERE b.profile_id = auth.uid()
    )
  );

-- No public UPDATE/DELETE — events are append-only. Service role
-- can bypass RLS for admin analytics.

COMMENT ON TABLE public.deal_share_events IS
  'One row per share-click event. Append-only. user_role distinguishes athlete vs parent; template_id is null when user fired from an ephemeral default.';

-- ============================================================
-- 3. updated_at trigger for templates (reuse shared function)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    EXECUTE 'CREATE TRIGGER trg_deal_share_templates_updated_at
             BEFORE UPDATE ON public.deal_share_templates
             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  END IF;
END $$;
