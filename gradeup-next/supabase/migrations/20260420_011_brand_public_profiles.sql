-- HS-NIL Public Brand Directory
-- ============================================================
-- Phase 17 BRAND-DIRECTORY. Opt-in visibility for HS-enabled
-- brands that want to appear in the public directory + run a
-- per-brand marketing surface at /brands/[slug].
--
-- Design:
--   * Default public_visibility = false. Claiming a slug does
--     not auto-publish; the brand must also flip visibility.
--   * public_slug is semi-immutable. Once claimed, resetting
--     requires admin (we do not expose slug rotation in the
--     brand UI). claimed_public_slug_at timestamps the claim.
--   * brand_profile_view_log mirrors athlete_profile_view_log
--     for symmetrical analytics. Writes are service-role only.
--   * Reserved-slug function blocks platform routes from being
--     hijacked (admin, brands, athletes, blog, etc.).
--
-- PII discipline:
--   Nothing about athletes or deal amounts is ever joined onto
--   the public brand surface. The public read path only exposes
--   columns on this migration + aggregated completed-deal count
--   + active-campaign count.
-- ============================================================

-- ----------------------------------------------------------------
-- Column additions
-- ----------------------------------------------------------------

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS public_slug text,
  ADD COLUMN IF NOT EXISTS public_visibility boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_bio text,
  ADD COLUMN IF NOT EXISTS public_bio_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS public_website text,
  ADD COLUMN IF NOT EXISTS public_avatar_url text,
  ADD COLUMN IF NOT EXISTS public_location_city text,
  ADD COLUMN IF NOT EXISTS public_location_region text,
  ADD COLUMN IF NOT EXISTS claimed_public_slug_at timestamptz;

COMMENT ON COLUMN public.brands.public_slug IS
  'URL-safe slug for /brands/[slug]. Unique (lowercase). NULL until claimed. Semi-immutable once set; admin resets only.';
COMMENT ON COLUMN public.brands.public_visibility IS
  'Opt-in visibility flag for the public brand directory. Default false; brand must explicitly enable.';
COMMENT ON COLUMN public.brands.public_bio IS
  'Brand-authored bio for the public surface. Max 500 chars enforced at the app layer.';
COMMENT ON COLUMN public.brands.public_location_region IS
  'Pilot-state USPS code (2 letters) the brand calls home. Used on public detail page.';

-- 500-char cap on bio — matches the UI contract and prevents
-- unbounded growth from a public-safe column.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'brands_public_bio_length'
  ) THEN
    ALTER TABLE public.brands
      ADD CONSTRAINT brands_public_bio_length
      CHECK (public_bio IS NULL OR char_length(public_bio) <= 500);
  END IF;
END $$;

-- 2-letter region constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'brands_public_region_shape'
  ) THEN
    ALTER TABLE public.brands
      ADD CONSTRAINT brands_public_region_shape
      CHECK (public_location_region IS NULL OR public_location_region ~ '^[A-Z]{2}$');
  END IF;
END $$;

-- Slug shape: lowercase, 3-64 chars, alphanumerics + single dashes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'brands_public_slug_shape'
  ) THEN
    ALTER TABLE public.brands
      ADD CONSTRAINT brands_public_slug_shape
      CHECK (
        public_slug IS NULL OR (
          char_length(public_slug) BETWEEN 3 AND 64
          AND public_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
        )
      );
  END IF;
END $$;

-- Partial UNIQUE index on lowercase slug — collisions only for claimed rows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_brands_public_slug_unique
  ON public.brands ((lower(public_slug)))
  WHERE public_slug IS NOT NULL;

-- Directory query index: cheap list for public_visibility=true brands.
CREATE INDEX IF NOT EXISTS idx_brands_public_visible
  ON public.brands(public_location_region)
  WHERE public_visibility = true AND public_slug IS NOT NULL;

-- ----------------------------------------------------------------
-- Reserved-slug function
-- ----------------------------------------------------------------
-- Blocks conflicts with platform routes. Keep in sync with the
-- top-level route segments under src/app. Called by the app layer
-- before INSERT/UPDATE; we also use it in a CHECK via trigger so
-- raw SQL writes can't smuggle a reserved slug through.
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_reserved_brand_slug(p_slug text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(p_slug) = ANY (ARRAY[
    'admin', 'api', 'auth', 'login', 'signup', 'logout', 'dashboard',
    'brands', 'brand', 'athletes', 'athlete', 'parents', 'parent',
    'blog', 'business', 'case-studies', 'solutions', 'pricing',
    'compare', 'discover', 'opportunities', 'help', 'privacy',
    'terms', 'subscription-terms', 'hs', 'nil', 'gradeup',
    'settings', 'account', 'billing', 'support', 'about',
    'contact', 'careers', 'press', 'new', 'edit', 'create'
  ]);
$$;

COMMENT ON FUNCTION public.is_reserved_brand_slug(text) IS
  'Returns true when slug collides with a reserved platform route. Checked by app layer; mirrored in a trigger for defense-in-depth.';

-- Guard trigger so even service-role inserts can't claim a reserved slug.
CREATE OR REPLACE FUNCTION public.tg_brands_check_reserved_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.public_slug IS NOT NULL
     AND public.is_reserved_brand_slug(NEW.public_slug) THEN
    RAISE EXCEPTION 'public_slug "%" is reserved', NEW.public_slug
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_brands_check_reserved_slug ON public.brands;
CREATE TRIGGER trg_brands_check_reserved_slug
  BEFORE INSERT OR UPDATE OF public_slug ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.tg_brands_check_reserved_slug();

-- ----------------------------------------------------------------
-- brand_profile_view_log
-- ----------------------------------------------------------------
-- Lightweight analytics — one row per surfaced view on the public
-- /brands/[slug] page. Mirrors athlete_profile_view_log so the
-- directory-side dashboards can compose matching queries.
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.brand_profile_view_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  user_agent_hint text,
  referrer_hint text,
  ip_hash text
);

CREATE INDEX IF NOT EXISTS idx_brand_profile_view_log_brand_time
  ON public.brand_profile_view_log(brand_id, viewed_at DESC);

COMMENT ON TABLE public.brand_profile_view_log IS
  'One row per surfaced /brands/[slug] view. user_agent_hint/referrer_hint truncated at app layer; ip_hash = sha256(ip+salt).';

-- ----------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------

ALTER TABLE public.brand_profile_view_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brand_profile_view_log_no_public_read ON public.brand_profile_view_log;
CREATE POLICY brand_profile_view_log_no_public_read
  ON public.brand_profile_view_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.id = brand_profile_view_log.brand_id
        AND b.profile_id = auth.uid()
    )
  );

-- All writes go through service role (the log endpoint). No
-- insert policy for authenticated users on purpose — avoids
-- spam floods from anon clients.

-- ----------------------------------------------------------------
-- Public read policy for the directory
-- ----------------------------------------------------------------
-- The existing brands RLS restricts SELECT to the owning profile
-- + service role. We add a public policy that exposes ONLY the
-- public-safe projection (rows where visibility is on AND slug
-- is claimed). PostgREST still returns full row on a select(*);
-- the service layer controls the projection by listing columns.
-- ----------------------------------------------------------------

-- Enable RLS in case it isn't already. (Safe no-op if enabled.)
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brands_public_directory_read ON public.brands;
CREATE POLICY brands_public_directory_read
  ON public.brands
  FOR SELECT
  TO anon, authenticated
  USING (
    public_visibility = true
    AND public_slug IS NOT NULL
  );

-- Owner update / insert policies — keep these permissive. The
-- existing policy set already covers owner access; we add a
-- belt-and-braces owner-update policy so this migration is
-- self-contained in case the base one drifts.
DROP POLICY IF EXISTS brands_owner_update_public_fields ON public.brands;
CREATE POLICY brands_owner_update_public_fields
  ON public.brands
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- ----------------------------------------------------------------
-- Storage bucket: brand-public-assets
-- ----------------------------------------------------------------
-- Public read (logos are meant to be seen), brand-owner writes only.
-- Path convention: {brand_id}/{uuid}.{ext}. Owner is enforced via
-- policy — the brand's profile_id must match auth.uid() AND the
-- first path segment must equal their brand.id.
-- ----------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-public-assets', 'brand-public-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "brand-public-assets public read" ON storage.objects;
CREATE POLICY "brand-public-assets public read"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'brand-public-assets');

DROP POLICY IF EXISTS "brand-public-assets owner insert" ON storage.objects;
CREATE POLICY "brand-public-assets owner insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'brand-public-assets'
    AND EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.profile_id = auth.uid()
        AND (storage.foldername(name))[1] = b.id::text
    )
  );

DROP POLICY IF EXISTS "brand-public-assets owner update" ON storage.objects;
CREATE POLICY "brand-public-assets owner update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'brand-public-assets'
    AND EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.profile_id = auth.uid()
        AND (storage.foldername(name))[1] = b.id::text
    )
  );

DROP POLICY IF EXISTS "brand-public-assets owner delete" ON storage.objects;
CREATE POLICY "brand-public-assets owner delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'brand-public-assets'
    AND EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.profile_id = auth.uid()
        AND (storage.foldername(name))[1] = b.id::text
    )
  );
