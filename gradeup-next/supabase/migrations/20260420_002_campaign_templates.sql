-- Phase 14: Campaign Templates
-- ============================================================
-- Pre-built campaign briefs brands can clone + customize in ~2
-- minutes, cutting brand-side posting friction introduced in
-- Phase 12's multi-athlete surface. A template is NOT a campaign
-- — cloning returns a pre-filled CampaignCreateForm draft that a
-- human brand edits before submitting through the existing
-- createCampaign() path.
--
-- Model:
--   campaign_templates              : published catalog
--   campaign_template_uses          : log of which template a
--                                     brand cloned + which
--                                     (optional) campaign it
--                                     produced (back-populated
--                                     when brand submits the
--                                     cloned draft)
--
-- Every clone creates one row in campaign_template_uses. We link
-- cloned_into_campaign_id asynchronously via an UPDATE once the
-- brand actually posts. The clone -> submit funnel is the
-- analytic that matters: templates that get cloned but never
-- ship signal bad copy.
--
-- Writes are service-role only. Public SELECT of published=true
-- rows is intentional: the public marketing browse at
-- /solutions/brands/templates reads anon-role with RLS scoping.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. campaign_templates
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campaign_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 3 AND 120),

  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),

  category text NOT NULL CHECK (category IN (
    'grand_opening',
    'back_to_school',
    'summer_camp',
    'seasonal_promo',
    'product_launch',
    'athlete_spotlight',
    'community_event',
    'recurring_series'
  )),

  description text NOT NULL DEFAULT ''
    CHECK (char_length(description) <= 5000),

  -- Matches ConsentScope vocabulary used by campaign.deal_category.
  deal_category text NOT NULL CHECK (deal_category IN (
    'apparel',
    'food_beverage',
    'local_business',
    'training',
    'autograph',
    'social_media_promo'
  )),

  -- National baseline. UI shows "adjust for your state" because
  -- CA/NY/TX typically run 20-30% higher.
  suggested_compensation_cents integer NOT NULL
    CHECK (suggested_compensation_cents >= 0 AND suggested_compensation_cents <= 100000000),

  suggested_duration_days integer NOT NULL
    CHECK (suggested_duration_days > 0 AND suggested_duration_days <= 365),

  deliverables_template text NOT NULL DEFAULT ''
    CHECK (char_length(deliverables_template) <= 5000),

  target_sports text[] NOT NULL DEFAULT ARRAY[]::text[],
  target_grad_years integer[] NOT NULL DEFAULT ARRAY[]::integer[],

  hero_image_url text
    CHECK (hero_image_url IS NULL OR char_length(hero_image_url) <= 1024),

  published boolean NOT NULL DEFAULT true,

  -- Lower number renders first. Use 10, 20, 30 ... to leave room.
  display_order integer NOT NULL DEFAULT 100
    CHECK (display_order BETWEEN 0 AND 10000),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.campaign_templates IS
  'Pre-built campaign briefs brands clone into their campaign-create form. A template does not become a campaign itself — cloning returns a pre-filled draft the brand edits before submitting via the normal createCampaign() path.';

CREATE INDEX IF NOT EXISTS idx_campaign_templates_published_order
  ON public.campaign_templates (display_order ASC, created_at ASC)
  WHERE published = true;

CREATE INDEX IF NOT EXISTS idx_campaign_templates_category
  ON public.campaign_templates (category)
  WHERE published = true;

CREATE INDEX IF NOT EXISTS idx_campaign_templates_deal_category
  ON public.campaign_templates (deal_category)
  WHERE published = true;

CREATE INDEX IF NOT EXISTS idx_campaign_templates_target_sports
  ON public.campaign_templates USING GIN (target_sports);

-- Keep updated_at fresh.
CREATE OR REPLACE FUNCTION public.campaign_templates_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_campaign_templates_touch ON public.campaign_templates;
CREATE TRIGGER trg_campaign_templates_touch
  BEFORE UPDATE ON public.campaign_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.campaign_templates_touch();

ALTER TABLE public.campaign_templates ENABLE ROW LEVEL SECURITY;

-- Public read of published templates. Anon + authenticated.
-- Used by both the brand-facing browse and the marketing landing
-- at /solutions/brands/templates (ISR).
DROP POLICY IF EXISTS campaign_templates_public_read ON public.campaign_templates;
CREATE POLICY campaign_templates_public_read
  ON public.campaign_templates
  FOR SELECT
  TO anon, authenticated
  USING (published = true);

-- Admin read-all for drafts and unpublished.
DROP POLICY IF EXISTS campaign_templates_admin_read ON public.campaign_templates;
CREATE POLICY campaign_templates_admin_read
  ON public.campaign_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- No client INSERT/UPDATE/DELETE policies → service-role only.
-- The admin API verifies profiles.role='admin' then delegates.

-- ─────────────────────────────────────────────────────────────
-- 2. campaign_template_uses
-- ─────────────────────────────────────────────────────────────
-- One row per clone action. cloned_into_campaign_id is NULL at
-- clone time and populated by the campaign-create POST path
-- when the brand actually posts a campaign seeded from a
-- template slug in its query param. This split is intentional —
-- a lot of clones will never convert, and that signal is the
-- point.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campaign_template_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL
    REFERENCES public.campaign_templates(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL
    REFERENCES public.brands(id) ON DELETE CASCADE,
  cloned_into_campaign_id uuid
    REFERENCES public.hs_brand_campaigns(id) ON DELETE SET NULL,
  cloned_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.campaign_template_uses IS
  'Clone audit log. One row per brand clone of a template. cloned_into_campaign_id is NULL at clone time and back-filled when the brand submits the seeded campaign. NULL rows with an old cloned_at signal copy problems.';

CREATE INDEX IF NOT EXISTS idx_campaign_template_uses_template
  ON public.campaign_template_uses (template_id, cloned_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_template_uses_brand
  ON public.campaign_template_uses (brand_id, cloned_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_template_uses_campaign
  ON public.campaign_template_uses (cloned_into_campaign_id)
  WHERE cloned_into_campaign_id IS NOT NULL;

ALTER TABLE public.campaign_template_uses ENABLE ROW LEVEL SECURITY;

-- Brand sees its own clone history.
DROP POLICY IF EXISTS campaign_template_uses_brand_select
  ON public.campaign_template_uses;
CREATE POLICY campaign_template_uses_brand_select
  ON public.campaign_template_uses
  FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT b.id FROM public.brands b WHERE b.profile_id = auth.uid()
    )
  );

-- Admin reads everything for analytics.
DROP POLICY IF EXISTS campaign_template_uses_admin_select
  ON public.campaign_template_uses;
CREATE POLICY campaign_template_uses_admin_select
  ON public.campaign_template_uses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Writes go through the service-role client in the clone API.

-- ─────────────────────────────────────────────────────────────
-- 3. Seed — 8 default templates (idempotent upsert by slug)
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.campaign_templates (
  slug, title, category, description, deal_category,
  suggested_compensation_cents, suggested_duration_days,
  deliverables_template, target_sports, target_grad_years,
  display_order
)
VALUES
  (
    'grand-opening',
    'Grand Opening',
    'grand_opening',
    'Open your doors with local scholar-athletes. Spin up a short, high-energy campaign that puts three nearby HS athletes in your feed, your store, and their followers'' feeds. Pair one in-person appearance with a social-media push so launch day is the local story.',
    'local_business',
    30000,
    14,
    '1. One Instagram feed post featuring your storefront (athlete''s own words).' || E'\n' ||
      '2. One Instagram story with a location tag the day of opening.' || E'\n' ||
      '3. One 30-minute in-person appearance within opening week.',
    ARRAY['basketball','football','soccer','volleyball','baseball','softball','track','swim','tennis','wrestling','lacrosse','field_hockey']::text[],
    ARRAY[2027, 2028]::integer[],
    10
  ),
  (
    'back-to-school',
    'Back-to-School',
    'back_to_school',
    'Meet the students already shopping your aisles. Late-summer campaigns land best when the athlete is your customer first. Two deliverables, 3-week window, high click-through for apparel, supplies, and food stops in the back-to-school corridor.',
    'apparel',
    20000,
    21,
    '1. One Instagram carousel (3-5 slides) featuring the product in a back-to-school context.' || E'\n' ||
      '2. One TikTok reel (15-30 seconds) showing the athlete''s first-week-of-school routine with the product.',
    ARRAY['basketball','football','soccer']::text[],
    ARRAY[2027, 2028, 2029]::integer[],
    20
  ),
  (
    'summer-camp',
    'Summer Camp',
    'summer_camp',
    'Fill your camp with local faces. Local HS athletes are the best camp marketing there is — kids want to train where the older kids train. Use this template for training facilities, sports camps, or academies running June-August programming.',
    'training',
    35000,
    30,
    '1. One Instagram feed post inside the training facility during a session.' || E'\n' ||
      '2. One Instagram reel showing a skill the athlete learned at the camp.' || E'\n' ||
      '3. One parent-facing referral DM script the athlete can share with teammates'' parents.',
    ARRAY['basketball','football','soccer','volleyball']::text[],
    ARRAY[2027, 2028, 2029]::integer[],
    30
  ),
  (
    'seasonal-winter-holiday',
    'Seasonal Promo — Winter Holiday',
    'seasonal_promo',
    'Holiday campaign with a local scholar-athlete. Gift guides hit harder when the face is a neighborhood name. Three-week window covering late November through the new year.',
    'local_business',
    25000,
    21,
    '1. One Instagram feed post featuring a holiday gift-guide framing with the product.' || E'\n' ||
      '2. One Instagram story with a swipe-up (or sticker) to your online-order page.',
    ARRAY['basketball','wrestling','swim','track','volleyball']::text[],
    ARRAY[2027, 2028]::integer[],
    40
  ),
  (
    'seasonal-spring',
    'Seasonal Promo — Spring',
    'seasonal_promo',
    'Spring campaign with a local scholar-athlete. Catch the March-April energy when HS teams are mid-season and the audience is peak-engaged. Same shape as holiday — two deliverables, 3-week window.',
    'local_business',
    25000,
    21,
    '1. One Instagram feed post with a spring-themed angle (outdoor, fresh product, team energy).' || E'\n' ||
      '2. One Instagram story with a location tag or swipe-up to the offer.',
    ARRAY['baseball','softball','track','lacrosse','tennis','soccer']::text[],
    ARRAY[2027, 2028]::integer[],
    50
  ),
  (
    'product-launch',
    'Product Launch',
    'product_launch',
    'Launch with a scholar-athlete''s real endorsement. When you put a new product in an athlete''s hands and let them tell the story, the campaign doubles as product research. Four deliverables spread over 30 days for compound reach.',
    'apparel',
    50000,
    30,
    '1. Unboxing reel on TikTok or Instagram (30-60 seconds).' || E'\n' ||
      '2. One Instagram feed post with the product in context (training, school, game day).' || E'\n' ||
      '3. One Instagram story with a swipe-up to the product page.' || E'\n' ||
      '4. Follow-up post seven days later with an honest take after real use.',
    ARRAY['basketball','football','soccer','track','volleyball']::text[],
    ARRAY[2027, 2028]::integer[],
    60
  ),
  (
    'athlete-spotlight',
    'Athlete Spotlight',
    'athlete_spotlight',
    'Feature one scholar-athlete in a profile campaign. Spotlight one senior with verified Tier B+ GPA, go deep on their story, and let the brand be the backdrop. Five deliverables across 30 days — this is the highest-production template in the set.',
    'social_media_promo',
    60000,
    30,
    '1. Long-form Instagram carousel (6-10 slides) telling the athlete''s season story.' || E'\n' ||
      '2. TikTok vlog (60-90 seconds) of a day-in-the-life.' || E'\n' ||
      '3. Optional Instagram Live Q&A with the brand co-hosting.' || E'\n' ||
      '4. One Instagram story highlighting the athlete''s favorite use of the product.' || E'\n' ||
      '5. One brand-authored post cross-sharing the spotlight to the brand''s channel.',
    ARRAY['basketball','football','soccer','volleyball','track','swim','baseball','softball']::text[],
    ARRAY[2027]::integer[],
    70
  ),
  (
    'recurring-series',
    'Recurring Monthly Series',
    'recurring_series',
    'Lock in a 3-month partnership. Three posts per month, 90-day commitment — the athlete becomes a recognizable face for the brand and the algorithm rewards the consistency. Best for brands with ongoing promotions instead of one-off launches.',
    'social_media_promo',
    120000,
    90,
    'Month 1 (3 posts):' || E'\n' ||
      '  - Week 1: Introduction post — athlete partnership announcement.' || E'\n' ||
      '  - Week 2: Product-in-context Instagram feed post.' || E'\n' ||
      '  - Week 4: Instagram story highlighting the athlete''s favorite use.' || E'\n' ||
      E'\n' ||
      'Month 2 (3 posts):' || E'\n' ||
      '  - Week 1: TikTok reel tying the product to the athlete''s season.' || E'\n' ||
      '  - Week 3: Instagram carousel showing off-the-field use.' || E'\n' ||
      '  - Week 4: Instagram story with a CTA to the offer.' || E'\n' ||
      E'\n' ||
      'Month 3 (3 posts):' || E'\n' ||
      '  - Week 1: Instagram feed post recapping the partnership.' || E'\n' ||
      '  - Week 2: TikTok reel of the athlete''s season highlight reel sponsored by the brand.' || E'\n' ||
      '  - Week 4: Wrap-up story thanking the audience and teasing continuation.',
    ARRAY['basketball','football','soccer','volleyball','baseball','softball','track','swim']::text[],
    ARRAY[2027, 2028]::integer[],
    80
  )
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  deal_category = EXCLUDED.deal_category,
  suggested_compensation_cents = EXCLUDED.suggested_compensation_cents,
  suggested_duration_days = EXCLUDED.suggested_duration_days,
  deliverables_template = EXCLUDED.deliverables_template,
  target_sports = EXCLUDED.target_sports,
  target_grad_years = EXCLUDED.target_grad_years,
  display_order = EXCLUDED.display_order,
  updated_at = now();

COMMENT ON POLICY campaign_templates_public_read ON public.campaign_templates IS
  'Anon + authenticated see published templates. Powers both the in-product browse and the public /solutions/brands/templates marketing surface.';
