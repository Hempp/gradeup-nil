-- Phase 12: Public Case Studies + Sales Collateral
-- ============================================================
-- Mirrors NIL Club's highest-converting sales asset: a public,
-- SEO-indexed case-studies surface at /business/case-studies.
--
-- Data model — three tables:
--
--   case_studies          : one row per published study; has slug,
--                           markdown body, optional deal/brand/
--                           athlete anchors, featured ordering,
--                           taxonomy tags, and publish state.
--   case_study_metrics    : 1-many stat cards (metric_label,
--                           metric_value, optional hint).
--   case_study_quotes     : 1-many attributable pull quotes with
--                           role + display name + ordering.
--
-- Public read: published=true only. Writes are admin-only and flow
-- through the service role in the admin UI — non-admin clients
-- cannot create, update, publish, or delete.
--
-- Slug scheme: kebab-case, unique. Author-chosen (defaulted from
-- title on the client); uniqueness enforced at the DB layer. URL
-- shape is /business/case-studies/{slug}.
--
-- Tags: text[]. No enum — taxonomy evolves with portfolio. Expected
-- values include food_beverage, multi_athlete, tier_b_verified,
-- viral_share, california, parent_quote. Readers filter by tag on
-- the listing page.
--
-- Privacy: the deal_id / brand_id / athlete_user_id anchors are
-- optional. Athletes are masked to first-name + last-initial in the
-- rendering layer by default; the columns themselves store the
-- canonical references so an admin can re-derive attribution later.
-- ============================================================

-- ============================================================
-- 1. case_studies
-- ============================================================

CREATE TABLE IF NOT EXISTS public.case_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 3 AND 120),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  subtitle text CHECK (subtitle IS NULL OR char_length(subtitle) <= 300),
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  athlete_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  hero_image_url text CHECK (hero_image_url IS NULL OR char_length(hero_image_url) <= 1024),
  body_markdown text NOT NULL DEFAULT ''
    CHECK (char_length(body_markdown) <= 60000),
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  featured_order integer
    CHECK (featured_order IS NULL OR featured_order BETWEEN 0 AND 10000),
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_studies_published_featured
  ON public.case_studies (featured_order ASC NULLS LAST, published_at DESC)
  WHERE published = true;

CREATE INDEX IF NOT EXISTS idx_case_studies_slug
  ON public.case_studies (slug);

CREATE INDEX IF NOT EXISTS idx_case_studies_tags
  ON public.case_studies USING GIN (tags);

COMMENT ON TABLE public.case_studies IS
  'Public NIL Club-style case studies. Rows with published=true are served at /business/case-studies/{slug} and indexed by crawlers.';
COMMENT ON COLUMN public.case_studies.slug IS
  'Kebab-case URL segment, unique across all studies. Author-chosen; defaults to slugified title on the client.';
COMMENT ON COLUMN public.case_studies.featured_order IS
  'Null = unfeatured; lowest integer renders first on the listing page. Use 10, 20, 30 to leave room.';

-- ============================================================
-- 2. case_study_metrics
-- ============================================================

CREATE TABLE IF NOT EXISTS public.case_study_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_study_id uuid NOT NULL REFERENCES public.case_studies(id) ON DELETE CASCADE,
  metric_label text NOT NULL CHECK (char_length(metric_label) BETWEEN 1 AND 120),
  metric_value text NOT NULL CHECK (char_length(metric_value) BETWEEN 1 AND 60),
  metric_hint text CHECK (metric_hint IS NULL OR char_length(metric_hint) <= 400),
  display_order integer NOT NULL DEFAULT 0
    CHECK (display_order BETWEEN 0 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_study_metrics_study
  ON public.case_study_metrics (case_study_id, display_order ASC);

COMMENT ON TABLE public.case_study_metrics IS
  'Numbered stat cards rendered on a case-study page. metric_value is text to support "$4,200", "2.3x", "47 shares".';

-- ============================================================
-- 3. case_study_quotes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.case_study_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_study_id uuid NOT NULL REFERENCES public.case_studies(id) ON DELETE CASCADE,
  quote_body text NOT NULL CHECK (char_length(quote_body) BETWEEN 1 AND 2000),
  attributed_role text NOT NULL
    CHECK (attributed_role IN ('athlete', 'parent', 'brand_marketer', 'athletic_director', 'other')),
  attributed_name text NOT NULL CHECK (char_length(attributed_name) BETWEEN 1 AND 160),
  display_order integer NOT NULL DEFAULT 0
    CHECK (display_order BETWEEN 0 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_study_quotes_study
  ON public.case_study_quotes (case_study_id, display_order ASC);

COMMENT ON TABLE public.case_study_quotes IS
  'Attributable pull-quotes rendered alongside the study body. attributed_name is already anonymized (first name + last initial or brand name) by the admin authoring the study.';

-- ============================================================
-- 4. updated_at trigger on case_studies
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_case_studies_updated_at ON public.case_studies';
    EXECUTE 'CREATE TRIGGER trg_case_studies_updated_at
             BEFORE UPDATE ON public.case_studies
             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  END IF;
END $$;

-- ============================================================
-- 5. RLS
-- ============================================================
--
-- Public read of published=true rows for anon + authenticated.
-- Admin-role read of everything (including drafts).
-- Writes flow through the service-role client in the admin API —
-- we do NOT grant a client-role INSERT/UPDATE/DELETE policy, so a
-- compromised authenticated session cannot edit case studies.

ALTER TABLE public.case_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_study_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_study_quotes ENABLE ROW LEVEL SECURITY;

-- Public (anon + authenticated) read of published case studies.
DROP POLICY IF EXISTS case_studies_public_read ON public.case_studies;
CREATE POLICY case_studies_public_read
  ON public.case_studies
  FOR SELECT
  TO anon, authenticated
  USING (published = true);

-- Admins read everything.
DROP POLICY IF EXISTS case_studies_admin_read ON public.case_studies;
CREATE POLICY case_studies_admin_read
  ON public.case_studies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Metrics + quotes: readable if parent study is readable.
DROP POLICY IF EXISTS case_study_metrics_public_read ON public.case_study_metrics;
CREATE POLICY case_study_metrics_public_read
  ON public.case_study_metrics
  FOR SELECT
  TO anon, authenticated
  USING (
    case_study_id IN (
      SELECT id FROM public.case_studies WHERE published = true
    )
  );

DROP POLICY IF EXISTS case_study_metrics_admin_read ON public.case_study_metrics;
CREATE POLICY case_study_metrics_admin_read
  ON public.case_study_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS case_study_quotes_public_read ON public.case_study_quotes;
CREATE POLICY case_study_quotes_public_read
  ON public.case_study_quotes
  FOR SELECT
  TO anon, authenticated
  USING (
    case_study_id IN (
      SELECT id FROM public.case_studies WHERE published = true
    )
  );

DROP POLICY IF EXISTS case_study_quotes_admin_read ON public.case_study_quotes;
CREATE POLICY case_study_quotes_admin_read
  ON public.case_study_quotes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- No INSERT/UPDATE/DELETE policies → only the service-role key can
-- mutate these tables. The admin API routes are the single write
-- surface; they verify profiles.role = 'admin' before delegating to
-- the service-role client.

COMMENT ON POLICY case_studies_public_read ON public.case_studies IS
  'Anon + authenticated users see published case studies only. Drafts are invisible until an admin flips published=true.';
