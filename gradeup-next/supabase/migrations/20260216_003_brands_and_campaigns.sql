-- =====================================================================================
-- GradeUp NIL - Brands and Campaigns Schema
-- Version: 003
-- Description: Brand profiles, campaigns, and opportunities tables
-- =====================================================================================

-- =====================================================================================
-- ENUM TYPES
-- =====================================================================================

-- Brand/Company types
CREATE TYPE company_type AS ENUM ('corporation', 'llc', 'partnership', 'sole_proprietor', 'nonprofit');

-- Subscription tiers for brands
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');

-- Campaign status
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');

-- Opportunity status
CREATE TYPE opportunity_status AS ENUM ('draft', 'active', 'paused', 'closed');

-- Deal type (shared with deals table)
CREATE TYPE deal_type AS ENUM (
  'social_post', 'appearance', 'endorsement',
  'autograph', 'camp', 'merchandise', 'other'
);

-- Compensation type
CREATE TYPE compensation_type AS ENUM (
  'fixed', 'hourly', 'per_post', 'revenue_share', 'product', 'other'
);

-- =====================================================================================
-- BRANDS TABLE
-- =====================================================================================

CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,

  -- Company Info
  company_name TEXT NOT NULL,
  company_type company_type,
  industry TEXT,
  website_url TEXT,
  logo_url TEXT,
  description TEXT,

  -- Primary Contact
  contact_name TEXT NOT NULL,
  contact_title TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,

  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',

  -- Business Identifiers
  ein TEXT,  -- Employer Identification Number

  -- Statistics (computed/cached)
  total_spent NUMERIC(12,2) DEFAULT 0,
  deals_completed INTEGER DEFAULT 0,
  avg_deal_rating NUMERIC(3,2),
  active_campaigns INTEGER DEFAULT 0,

  -- Athlete Preferences (for matching)
  preferred_sports TEXT[],
  preferred_schools TEXT[],
  preferred_divisions TEXT[],
  min_gpa NUMERIC(3,2),
  min_followers INTEGER,
  budget_range_min NUMERIC(10,2),
  budget_range_max NUMERIC(10,2),

  -- Verification & Subscription
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  subscription_tier subscription_tier DEFAULT 'free',
  subscription_expires_at TIMESTAMPTZ,

  -- Stripe Integration
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- CAMPAIGNS TABLE
-- =====================================================================================

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,

  -- Campaign Info
  name TEXT NOT NULL,
  title TEXT,  -- Display title
  description TEXT,

  -- Budget & Timeline
  budget NUMERIC(12,2) NOT NULL,
  spent NUMERIC(12,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status campaign_status DEFAULT 'draft',

  -- Targeting Criteria
  target_sports TEXT[],
  target_schools TEXT[],
  target_divisions TEXT[],
  target_min_gpa NUMERIC(3,2),
  target_min_followers INTEGER,
  target_states TEXT[],

  -- Campaign Settings
  max_athletes INTEGER,  -- Maximum athletes to include
  auto_approve BOOLEAN DEFAULT FALSE,

  -- Metrics
  total_impressions INTEGER DEFAULT 0,
  total_engagements INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- OPPORTUNITIES TABLE
-- =====================================================================================

-- Opportunities (open positions for athletes to apply)
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  -- Opportunity Details
  title TEXT NOT NULL,
  description TEXT,
  deal_type deal_type NOT NULL,

  -- Compensation
  compensation_type compensation_type NOT NULL,
  compensation_amount NUMERIC(10,2) NOT NULL,
  compensation_details TEXT,

  -- Requirements
  deliverables TEXT,
  requirements TEXT,
  min_gpa NUMERIC(3,2),
  min_followers INTEGER,
  required_sports UUID[],  -- Sport IDs
  required_schools UUID[],  -- School IDs

  -- Availability
  status opportunity_status DEFAULT 'active',
  is_featured BOOLEAN DEFAULT FALSE,
  max_applicants INTEGER,
  current_applicants INTEGER DEFAULT 0,

  -- Timeline
  application_deadline TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- BRAND SHORTLIST TABLE
-- =====================================================================================

-- Saved athletes (brand's favorites)
CREATE TABLE brand_shortlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, athlete_id)
);

-- =====================================================================================
-- INDEXES
-- =====================================================================================

-- Brand indexes
CREATE INDEX idx_brands_profile_id ON brands(profile_id);
CREATE INDEX idx_brands_verified ON brands(is_verified) WHERE is_verified = TRUE;
CREATE INDEX idx_brands_industry ON brands(industry);
CREATE INDEX idx_brands_subscription ON brands(subscription_tier);
CREATE INDEX idx_brands_company_name ON brands(company_name);

-- Campaign indexes
CREATE INDEX idx_campaigns_brand_id ON campaigns(brand_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX idx_campaigns_active ON campaigns(status) WHERE status = 'active';

-- Opportunity indexes
CREATE INDEX idx_opportunities_brand_id ON opportunities(brand_id);
CREATE INDEX idx_opportunities_campaign_id ON opportunities(campaign_id);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_featured ON opportunities(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_opportunities_deal_type ON opportunities(deal_type);
CREATE INDEX idx_opportunities_active ON opportunities(status) WHERE status = 'active';

-- Brand shortlist indexes
CREATE INDEX idx_brand_shortlist_brand_id ON brand_shortlist(brand_id);
CREATE INDEX idx_brand_shortlist_athlete_id ON brand_shortlist(athlete_id);

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- HELPER FUNCTIONS
-- =====================================================================================

-- Function to check if brand has active subscription
CREATE OR REPLACE FUNCTION brand_has_active_subscription(brand_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  brand_record RECORD;
BEGIN
  SELECT subscription_tier, subscription_expires_at
  INTO brand_record
  FROM brands
  WHERE id = brand_id;

  IF brand_record.subscription_tier = 'free' THEN
    RETURN TRUE;  -- Free tier is always active
  END IF;

  RETURN brand_record.subscription_expires_at IS NULL
      OR brand_record.subscription_expires_at > NOW();
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON TABLE brands IS 'Brand/company profiles with subscription and targeting preferences';
COMMENT ON TABLE campaigns IS 'Marketing campaigns that group multiple deals/opportunities';
COMMENT ON TABLE opportunities IS 'Open opportunities for athletes to apply to';
COMMENT ON TABLE brand_shortlist IS 'Brands saved/favorited athletes list';
COMMENT ON COLUMN brands.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN campaigns.target_sports IS 'Array of sport names to target for this campaign';
