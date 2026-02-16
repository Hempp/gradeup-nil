-- =====================================================================================
-- GradeUp NIL - Deliverables Table Migration
-- Version: 005
-- Description: Add deliverables table for tracking campaign/deal content submissions
-- =====================================================================================

-- =====================================================================================
-- ENUM TYPES
-- =====================================================================================

-- Deliverable status
CREATE TYPE deliverable_status AS ENUM (
  'pending',      -- Not yet started
  'in_progress',  -- Athlete is working on it
  'submitted',    -- Athlete has submitted for review
  'approved',     -- Brand has approved
  'rejected',     -- Brand has rejected (needs revision)
  'revision'      -- Revisions requested
);

-- Content platform
CREATE TYPE content_platform AS ENUM (
  'instagram',
  'tiktok',
  'youtube',
  'twitter',
  'facebook',
  'linkedin',
  'other'
);

-- Content type
CREATE TYPE content_type AS ENUM (
  'reel',
  'story',
  'feed_post',
  'video',
  'short',
  'live',
  'carousel',
  'blog',
  'other'
);

-- =====================================================================================
-- DELIVERABLES TABLE
-- =====================================================================================

CREATE TABLE deliverables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  -- Content details
  platform content_platform NOT NULL,
  content_type content_type NOT NULL,
  title TEXT,
  description TEXT,
  requirements TEXT,

  -- Status tracking
  status deliverable_status DEFAULT 'pending',

  -- Dates
  due_date DATE,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,

  -- Content submission
  content_url TEXT,           -- URL to the posted content
  draft_url TEXT,             -- URL to draft/preview if applicable

  -- Review fields
  feedback TEXT,              -- Brand feedback on the deliverable
  reviewed_by UUID REFERENCES profiles(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- INDEXES
-- =====================================================================================

CREATE INDEX idx_deliverables_deal_id ON deliverables(deal_id);
CREATE INDEX idx_deliverables_athlete_id ON deliverables(athlete_id);
CREATE INDEX idx_deliverables_campaign_id ON deliverables(campaign_id);
CREATE INDEX idx_deliverables_status ON deliverables(status);
CREATE INDEX idx_deliverables_due_date ON deliverables(due_date);
CREATE INDEX idx_deliverables_submitted ON deliverables(status) WHERE status = 'submitted';

-- =====================================================================================
-- ROW LEVEL SECURITY
-- =====================================================================================

ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;

-- Brands can view deliverables for their deals
CREATE POLICY "Brands can view deliverables for their deals"
  ON deliverables FOR SELECT
  USING (
    deal_id IN (
      SELECT id FROM deals WHERE brand_id IN (
        SELECT id FROM brands WHERE profile_id = auth.uid()
      )
    )
  );

-- Athletes can view their own deliverables
CREATE POLICY "Athletes can view own deliverables"
  ON deliverables FOR SELECT
  USING (
    athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
  );

-- Brands can create deliverables for their deals
CREATE POLICY "Brands can create deliverables"
  ON deliverables FOR INSERT
  WITH CHECK (
    deal_id IN (
      SELECT id FROM deals WHERE brand_id IN (
        SELECT id FROM brands WHERE profile_id = auth.uid()
      )
    )
  );

-- Athletes can update their own deliverables (submit content)
CREATE POLICY "Athletes can update own deliverables"
  ON deliverables FOR UPDATE
  USING (
    athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
  );

-- Brands can update deliverables for their deals (approve/reject)
CREATE POLICY "Brands can update deliverables for their deals"
  ON deliverables FOR UPDATE
  USING (
    deal_id IN (
      SELECT id FROM deals WHERE brand_id IN (
        SELECT id FROM brands WHERE profile_id = auth.uid()
      )
    )
  );

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

CREATE TRIGGER update_deliverables_updated_at
  BEFORE UPDATE ON deliverables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- REALTIME
-- =====================================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE deliverables;

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================

COMMENT ON TABLE deliverables IS 'Tracks individual content deliverables for deals and campaigns';
