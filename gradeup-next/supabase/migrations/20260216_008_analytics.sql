-- =====================================================================================
-- GradeUp NIL - Analytics and Notifications Schema
-- Version: 008
-- Description: Activity logging, notifications, analytics, and compliance alerts
-- =====================================================================================

-- =====================================================================================
-- ENUM TYPES
-- =====================================================================================

-- Activity types for logging
CREATE TYPE activity_type AS ENUM (
  'deal_created', 'deal_accepted', 'deal_completed', 'deal_rejected', 'deal_cancelled',
  'message', 'profile_view', 'deliverable', 'deliverable_submitted', 'deliverable_approved',
  'payment', 'payment_received', 'new_offer', 'verification_submitted', 'verification_approved',
  'login', 'profile_updated', 'search_appearance', 'shortlist_added'
);

-- Notification types
CREATE TYPE notification_type AS ENUM (
  'deal', 'deal_offer', 'deal_accepted', 'deal_rejected', 'deal_completed', 'deal_cancelled',
  'message', 'message_received',
  'payment', 'payment_received', 'payment_pending',
  'system', 'verification_approved', 'verification_rejected', 'verification_request',
  'opportunity_match', 'profile_view', 'deliverable_due', 'deliverable_approved'
);

-- Compliance alert types
CREATE TYPE compliance_alert_type AS ENUM (
  'gpa_drop', 'deal_review', 'verification_expired', 'policy_violation',
  'excessive_earnings', 'missing_documentation', 'eligibility_concern'
);

-- Compliance severity levels
CREATE TYPE compliance_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- =====================================================================================
-- ACTIVITY LOG TABLE
-- =====================================================================================

CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Activity details
  type activity_type NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',

  -- Related entities
  related_deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  related_athlete_id UUID REFERENCES athletes(id) ON DELETE SET NULL,
  related_brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,

  -- Context
  ip_address INET,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- NOTIFICATIONS TABLE
-- =====================================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Notification content
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT,  -- Link to relevant page

  -- Status
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Delivery tracking
  email_sent BOOLEAN DEFAULT FALSE,
  push_sent BOOLEAN DEFAULT FALSE,
  sms_sent BOOLEAN DEFAULT FALSE,

  -- Additional data
  metadata JSONB DEFAULT '{}',
  image_url TEXT,
  action_text TEXT,

  -- Expiration
  expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- ATHLETE ANALYTICS TABLE
-- =====================================================================================

CREATE TABLE athlete_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL UNIQUE REFERENCES athletes(id) ON DELETE CASCADE,

  -- Visibility metrics
  profile_views INTEGER DEFAULT 0,
  profile_views_30d INTEGER DEFAULT 0,
  search_appearances INTEGER DEFAULT 0,
  search_appearances_30d INTEGER DEFAULT 0,

  -- Engagement metrics
  shortlist_count INTEGER DEFAULT 0,
  opportunity_applications INTEGER DEFAULT 0,

  -- Deal metrics
  total_deals INTEGER DEFAULT 0,
  completed_deals INTEGER DEFAULT 0,
  deal_completion_rate NUMERIC(5,2) DEFAULT 0,

  -- Financial metrics
  total_earnings NUMERIC(12,2) DEFAULT 0,
  avg_deal_value NUMERIC(10,2) DEFAULT 0,
  earnings_30d NUMERIC(12,2) DEFAULT 0,

  -- Social metrics
  social_engagement_rate NUMERIC(5,2) DEFAULT 0,

  -- Rankings
  school_rank INTEGER,
  sport_rank INTEGER,
  overall_rank INTEGER,

  -- Last calculation
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- BRAND ANALYTICS TABLE
-- =====================================================================================

CREATE TABLE brand_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL UNIQUE REFERENCES brands(id) ON DELETE CASCADE,

  -- Campaign metrics
  total_impressions INTEGER DEFAULT 0,
  total_engagements INTEGER DEFAULT 0,
  avg_engagement_rate NUMERIC(5,2) DEFAULT 0,

  -- Deal metrics
  total_deals INTEGER DEFAULT 0,
  completed_deals INTEGER DEFAULT 0,
  avg_deal_duration INTEGER DEFAULT 0,  -- Days

  -- Financial metrics
  total_spent NUMERIC(12,2) DEFAULT 0,
  avg_deal_value NUMERIC(10,2) DEFAULT 0,
  avg_roi NUMERIC(5,2) DEFAULT 0,

  -- Athlete metrics
  unique_athletes INTEGER DEFAULT 0,
  repeat_athletes INTEGER DEFAULT 0,

  -- Last calculation
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- COMPLIANCE ALERTS TABLE
-- =====================================================================================

CREATE TABLE compliance_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

  -- Alert details
  type compliance_alert_type NOT NULL,
  severity compliance_severity NOT NULL,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',

  -- Related entities
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,

  -- Resolution
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolution_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- PROFILE VIEWS TABLE
-- =====================================================================================

-- Track individual profile views for analytics
CREATE TABLE profile_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- NULL for anonymous

  -- View context
  source TEXT,  -- search, direct, opportunity, shortlist
  referrer TEXT,

  -- Timestamps
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- PUSH SUBSCRIPTIONS TABLE
-- =====================================================================================

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Push subscription data
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,

  -- Device info
  device_type TEXT,
  device_name TEXT,
  browser TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, endpoint)
);

-- =====================================================================================
-- INDEXES
-- =====================================================================================

-- Activity log indexes
CREATE INDEX idx_activity_log_profile_id ON activity_log(profile_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_type ON activity_log(type);
CREATE INDEX idx_activity_log_related_deal ON activity_log(related_deal_id) WHERE related_deal_id IS NOT NULL;

-- Notification indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(read) WHERE read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Analytics indexes
CREATE INDEX idx_athlete_analytics_athlete_id ON athlete_analytics(athlete_id);
CREATE INDEX idx_athlete_analytics_views ON athlete_analytics(profile_views DESC);
CREATE INDEX idx_athlete_analytics_earnings ON athlete_analytics(total_earnings DESC);

CREATE INDEX idx_brand_analytics_brand_id ON brand_analytics(brand_id);
CREATE INDEX idx_brand_analytics_spent ON brand_analytics(total_spent DESC);

-- Compliance alert indexes
CREATE INDEX idx_compliance_alerts_athlete_id ON compliance_alerts(athlete_id);
CREATE INDEX idx_compliance_alerts_school_id ON compliance_alerts(school_id);
CREATE INDEX idx_compliance_alerts_unresolved ON compliance_alerts(resolved) WHERE resolved = FALSE;
CREATE INDEX idx_compliance_alerts_severity ON compliance_alerts(severity);

-- Profile views indexes
CREATE INDEX idx_profile_views_athlete_id ON profile_views(athlete_id);
CREATE INDEX idx_profile_views_viewer_id ON profile_views(viewer_id) WHERE viewer_id IS NOT NULL;
CREATE INDEX idx_profile_views_date ON profile_views(viewed_at DESC);

-- Push subscription indexes
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = TRUE;

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

-- Create analytics record when athlete is created
CREATE OR REPLACE FUNCTION create_athlete_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO athlete_analytics (athlete_id)
  VALUES (NEW.id)
  ON CONFLICT (athlete_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_athlete_analytics_trigger
  AFTER INSERT ON athletes
  FOR EACH ROW EXECUTE FUNCTION create_athlete_analytics();

-- Create analytics record when brand is created
CREATE OR REPLACE FUNCTION create_brand_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO brand_analytics (brand_id)
  VALUES (NEW.id)
  ON CONFLICT (brand_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_brand_analytics_trigger
  AFTER INSERT ON brands
  FOR EACH ROW EXECUTE FUNCTION create_brand_analytics();

-- Update athlete analytics on profile view
CREATE OR REPLACE FUNCTION update_analytics_on_profile_view()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE athlete_analytics
  SET
    profile_views = profile_views + 1,
    last_updated = NOW()
  WHERE athlete_id = NEW.athlete_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analytics_on_view_trigger
  AFTER INSERT ON profile_views
  FOR EACH ROW EXECUTE FUNCTION update_analytics_on_profile_view();

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- HELPER FUNCTIONS
-- =====================================================================================

-- Function to log activity
CREATE OR REPLACE FUNCTION log_user_activity(
  p_profile_id UUID,
  p_type activity_type,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO activity_log (profile_id, type, description, metadata)
  VALUES (p_profile_id, p_type, p_description, p_metadata)
  RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_user_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_body TEXT,
  p_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, body, url, metadata)
  VALUES (p_user_id, p_type, p_title, p_body, p_url, p_metadata)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON TABLE activity_log IS 'Audit log of user activities for feeds and history';
COMMENT ON TABLE notifications IS 'User notifications with multi-channel delivery tracking';
COMMENT ON TABLE athlete_analytics IS 'Cached analytics metrics for athlete profiles';
COMMENT ON TABLE brand_analytics IS 'Cached analytics metrics for brand profiles';
COMMENT ON TABLE compliance_alerts IS 'Athletic director compliance monitoring alerts';
COMMENT ON TABLE profile_views IS 'Individual profile view tracking for analytics';
COMMENT ON TABLE push_subscriptions IS 'Web push notification subscriptions';
