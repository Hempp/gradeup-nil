-- =====================================================================================
-- GradeUp NIL - Deals and Deliverables Schema
-- Version: 004
-- Description: Deal agreements, deliverables tracking, and deal history
-- =====================================================================================

-- =====================================================================================
-- ENUM TYPES
-- =====================================================================================

-- Deal status lifecycle
CREATE TYPE deal_status AS ENUM (
  'draft',       -- Initial creation
  'pending',     -- Awaiting athlete response
  'negotiating', -- In counter-offer process
  'accepted',    -- Athlete accepted terms
  'active',      -- Deal is currently active
  'completed',   -- Deal fulfilled
  'cancelled',   -- Cancelled by either party
  'expired',     -- Deadline passed without response
  'rejected',    -- Athlete declined
  'paused'       -- Temporarily on hold
);

-- Deliverable status
CREATE TYPE deliverable_status AS ENUM (
  'pending',      -- Not yet started
  'in_progress',  -- Athlete is working on it
  'submitted',    -- Athlete has submitted for review
  'approved',     -- Brand has approved
  'rejected',     -- Brand has rejected (needs revision)
  'revision'      -- Revisions requested
);

-- Content platform for deliverables
CREATE TYPE content_platform AS ENUM (
  'instagram', 'tiktok', 'youtube', 'twitter',
  'facebook', 'linkedin', 'snapchat', 'other'
);

-- Content type for deliverables
CREATE TYPE content_type AS ENUM (
  'reel', 'story', 'feed_post', 'video', 'short',
  'live', 'carousel', 'blog', 'tweet', 'other'
);

-- =====================================================================================
-- DEALS TABLE
-- =====================================================================================

CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Parties
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  -- Deal Info
  title TEXT NOT NULL,
  description TEXT,
  deal_type deal_type NOT NULL,

  -- Compensation
  compensation_type compensation_type NOT NULL,
  compensation_amount NUMERIC(10,2) NOT NULL,
  compensation_details TEXT,
  deliverables TEXT,  -- Text description of deliverables

  -- Status
  status deal_status DEFAULT 'draft',
  rejection_reason TEXT,
  cancellation_reason TEXT,

  -- Timeline
  start_date DATE,
  end_date DATE,
  expires_at TIMESTAMPTZ,  -- When pending deal expires

  -- Negotiation
  counter_offer_count INTEGER DEFAULT 0,
  last_counter_by UUID REFERENCES profiles(id),
  counter_notes TEXT,

  -- Important Timestamps
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- DEAL HISTORY TABLE
-- =====================================================================================

-- Tracks all changes and negotiations on a deal
CREATE TABLE deal_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,

  -- Action details
  action TEXT NOT NULL,  -- e.g., 'created', 'counter_offer', 'accepted', 'rejected'
  actor_id UUID REFERENCES profiles(id),
  changes JSONB DEFAULT '{}',  -- What was changed
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- DELIVERABLES TABLE
-- =====================================================================================

CREATE TABLE deliverables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  -- Content Details
  platform content_platform NOT NULL,
  content_type content_type NOT NULL,
  title TEXT,
  description TEXT,
  requirements TEXT,

  -- Status
  status deliverable_status DEFAULT 'pending',

  -- Timeline
  due_date DATE,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,

  -- Content Submission
  content_url TEXT,    -- URL to the posted content
  draft_url TEXT,      -- URL to draft/preview if applicable
  proof_url TEXT,      -- Screenshot or proof of posting

  -- Review
  feedback TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  revision_count INTEGER DEFAULT 0,

  -- Metrics (after posting)
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- INDEXES
-- =====================================================================================

-- Deal indexes
CREATE INDEX idx_deals_athlete_id ON deals(athlete_id);
CREATE INDEX idx_deals_brand_id ON deals(brand_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_created_at ON deals(created_at DESC);
CREATE INDEX idx_deals_opportunity_id ON deals(opportunity_id);
CREATE INDEX idx_deals_campaign_id ON deals(campaign_id);
CREATE INDEX idx_deals_deal_type ON deals(deal_type);
CREATE INDEX idx_deals_active ON deals(status) WHERE status IN ('pending', 'accepted', 'active');
CREATE INDEX idx_deals_expires ON deals(expires_at) WHERE expires_at IS NOT NULL;

-- Deal history indexes
CREATE INDEX idx_deal_history_deal_id ON deal_history(deal_id);
CREATE INDEX idx_deal_history_actor_id ON deal_history(actor_id);
CREATE INDEX idx_deal_history_created_at ON deal_history(created_at DESC);
CREATE INDEX idx_deal_history_action ON deal_history(action);

-- Deliverable indexes
CREATE INDEX idx_deliverables_deal_id ON deliverables(deal_id);
CREATE INDEX idx_deliverables_athlete_id ON deliverables(athlete_id);
CREATE INDEX idx_deliverables_campaign_id ON deliverables(campaign_id);
CREATE INDEX idx_deliverables_status ON deliverables(status);
CREATE INDEX idx_deliverables_due_date ON deliverables(due_date);
CREATE INDEX idx_deliverables_submitted ON deliverables(status) WHERE status = 'submitted';
CREATE INDEX idx_deliverables_pending ON deliverables(status) WHERE status = 'pending';

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliverables_updated_at
  BEFORE UPDATE ON deliverables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- HELPER FUNCTIONS
-- =====================================================================================

-- Function to update brand stats when deal is completed
CREATE OR REPLACE FUNCTION update_brand_stats_on_deal_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE brands
    SET
      deals_completed = deals_completed + 1,
      total_spent = total_spent + NEW.compensation_amount,
      updated_at = NOW()
    WHERE id = NEW.brand_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_brand_stats_trigger
  AFTER UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_brand_stats_on_deal_complete();

-- Function to log deal history on status change
CREATE OR REPLACE FUNCTION log_deal_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO deal_history (deal_id, action, changes, created_at)
    VALUES (
      NEW.id,
      'status_change',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status
      ),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_deal_status_trigger
  AFTER UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION log_deal_status_change();

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON TABLE deals IS 'NIL deal agreements between brands and athletes';
COMMENT ON TABLE deal_history IS 'Audit trail of all deal changes and negotiations';
COMMENT ON TABLE deliverables IS 'Individual content deliverables for deals';
COMMENT ON COLUMN deals.counter_offer_count IS 'Number of counter-offers exchanged';
COMMENT ON COLUMN deliverables.proof_url IS 'Screenshot or proof that content was posted';
