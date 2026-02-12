-- =====================================================================================
-- GradeUp NIL - Initial Database Schema Migration
-- Version: 001
-- Description: Complete production-ready schema for the GradeUp NIL platform
-- =====================================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================================
-- ENUM TYPES
-- =====================================================================================

-- User roles
CREATE TYPE user_role AS ENUM ('athlete', 'brand', 'athletic_director', 'admin');

-- Deal-related enums
CREATE TYPE deal_status AS ENUM (
  'draft', 'pending', 'negotiating', 'accepted',
  'active', 'completed', 'cancelled', 'expired', 'rejected', 'paused'
);

CREATE TYPE deal_type AS ENUM (
  'social_post', 'appearance', 'endorsement',
  'autograph', 'camp', 'merchandise', 'other'
);

CREATE TYPE compensation_type AS ENUM (
  'fixed', 'hourly', 'per_post', 'revenue_share', 'product', 'other'
);

-- Opportunity status
CREATE TYPE opportunity_status AS ENUM ('draft', 'active', 'paused', 'closed');

-- Campaign status
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');

-- Payment-related enums
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');

CREATE TYPE payment_method AS ENUM ('bank_transfer', 'paypal', 'venmo', 'check');

-- School division
CREATE TYPE school_division AS ENUM ('D1', 'D2', 'D3', 'NAIA', 'JUCO', 'other');

-- Sport gender
CREATE TYPE sport_gender AS ENUM ('men', 'women', 'coed');

-- Brand types
CREATE TYPE company_type AS ENUM ('corporation', 'llc', 'partnership', 'sole_proprietor', 'nonprofit');

CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');

-- Activity types
CREATE TYPE activity_type AS ENUM (
  'deal_created', 'deal_accepted', 'deal_completed', 'deal_rejected',
  'message', 'profile_view', 'deliverable', 'payment', 'new_offer'
);

-- Notification types
CREATE TYPE notification_type AS ENUM ('deal', 'message', 'payment', 'system');

-- Compliance alert types
CREATE TYPE compliance_alert_type AS ENUM ('gpa_drop', 'deal_review', 'verification_expired', 'policy_violation');

CREATE TYPE compliance_severity AS ENUM ('low', 'medium', 'high');

-- Academic year
CREATE TYPE academic_year AS ENUM ('freshman', 'sophomore', 'junior', 'senior', 'graduate', 'other');

-- =====================================================================================
-- REFERENCE TABLES
-- =====================================================================================

-- Schools/Universities
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  division school_division,
  conference TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sports
CREATE TABLE sports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  gender sport_gender,
  icon_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- USER TABLES
-- =====================================================================================

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Athletes
CREATE TABLE athletes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  sport_id UUID REFERENCES sports(id) ON DELETE SET NULL,
  position TEXT,
  jersey_number TEXT,
  academic_year academic_year,
  gpa NUMERIC(3,2) CHECK (gpa >= 0 AND gpa <= 4.0),
  major TEXT,
  minor TEXT,
  hometown TEXT,
  height TEXT,
  weight TEXT,
  gender TEXT,
  expected_graduation TEXT,
  avatar_url TEXT,
  bio TEXT,
  cover_url TEXT,
  instagram_handle TEXT,
  twitter_handle TEXT,
  tiktok_handle TEXT,
  total_followers INTEGER DEFAULT 0,
  nil_valuation NUMERIC(12,2) DEFAULT 0,
  is_searchable BOOLEAN DEFAULT TRUE,
  -- Verification flags
  enrollment_verified BOOLEAN DEFAULT FALSE,
  sport_verified BOOLEAN DEFAULT FALSE,
  grades_verified BOOLEAN DEFAULT FALSE,
  identity_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brands
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_type company_type,
  industry TEXT,
  website_url TEXT,
  logo_url TEXT,
  description TEXT,
  contact_name TEXT NOT NULL,
  contact_title TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  -- Statistics
  total_spent NUMERIC(12,2) DEFAULT 0,
  deals_completed INTEGER DEFAULT 0,
  avg_deal_rating NUMERIC(3,2),
  active_campaigns INTEGER DEFAULT 0,
  -- Preferences for matching
  preferred_sports TEXT[],
  preferred_schools TEXT[],
  preferred_divisions TEXT[],
  min_gpa NUMERIC(3,2),
  min_followers INTEGER,
  budget_range_min NUMERIC(10,2),
  budget_range_max NUMERIC(10,2),
  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  subscription_tier subscription_tier DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Athletic Directors
CREATE TABLE athletic_directors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  title TEXT,
  department TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- CAMPAIGN & OPPORTUNITY TABLES
-- =====================================================================================

-- Campaigns (brand marketing campaigns)
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT, -- Alias for name, used by some services
  description TEXT,
  budget NUMERIC(12,2) NOT NULL,
  spent NUMERIC(12,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status campaign_status DEFAULT 'draft',
  -- Targeting criteria
  target_sports TEXT[],
  target_schools TEXT[],
  target_divisions TEXT[],
  target_min_gpa NUMERIC(3,2),
  target_min_followers INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Opportunities (open positions for athletes to apply)
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  deal_type deal_type NOT NULL,
  compensation_type compensation_type NOT NULL,
  compensation_amount NUMERIC(10,2) NOT NULL,
  compensation_details TEXT,
  deliverables TEXT,
  requirements TEXT,
  status opportunity_status DEFAULT 'active',
  is_featured BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- DEALS TABLE
-- =====================================================================================

-- Deals (agreements between athletes and brands)
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  deal_type deal_type NOT NULL,
  compensation_type compensation_type NOT NULL,
  compensation_amount NUMERIC(10,2) NOT NULL,
  compensation_details TEXT,
  deliverables TEXT,
  status deal_status DEFAULT 'draft',
  rejection_reason TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- =====================================================================================
-- PAYMENT TABLES
-- =====================================================================================

-- Payment Accounts (athlete payout methods)
CREATE TABLE payment_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_type payment_method NOT NULL,
  account_details JSONB NOT NULL DEFAULT '{}',
  is_primary BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments (individual payment records)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  status payment_status DEFAULT 'pending',
  payment_method payment_method,
  scheduled_date DATE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- MESSAGING TABLES
-- =====================================================================================

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation Participants
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message Attachments
CREATE TABLE message_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- ANALYTICS & TRACKING TABLES
-- =====================================================================================

-- Athlete Analytics
CREATE TABLE athlete_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL UNIQUE REFERENCES athletes(id) ON DELETE CASCADE,
  profile_views INTEGER DEFAULT 0,
  search_appearances INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Brand Analytics
CREATE TABLE brand_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL UNIQUE REFERENCES brands(id) ON DELETE CASCADE,
  total_impressions INTEGER DEFAULT 0,
  total_engagements INTEGER DEFAULT 0,
  avg_roi NUMERIC(5,2) DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Brand Shortlist (saved athletes)
CREATE TABLE brand_shortlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, athlete_id)
);

-- =====================================================================================
-- ACTIVITY & NOTIFICATION TABLES
-- =====================================================================================

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Log (for feeds and history)
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type activity_type NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance Alerts (for athletic directors)
CREATE TABLE compliance_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  type compliance_alert_type NOT NULL,
  severity compliance_severity NOT NULL,
  message TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================================

-- Profile indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

-- Athlete indexes
CREATE INDEX idx_athletes_profile_id ON athletes(profile_id);
CREATE INDEX idx_athletes_school_id ON athletes(school_id);
CREATE INDEX idx_athletes_sport_id ON athletes(sport_id);
CREATE INDEX idx_athletes_searchable ON athletes(is_searchable) WHERE is_searchable = TRUE;
CREATE INDEX idx_athletes_gpa ON athletes(gpa);
CREATE INDEX idx_athletes_nil_valuation ON athletes(nil_valuation DESC NULLS LAST);
CREATE INDEX idx_athletes_total_followers ON athletes(total_followers DESC NULLS LAST);

-- Brand indexes
CREATE INDEX idx_brands_profile_id ON brands(profile_id);
CREATE INDEX idx_brands_verified ON brands(is_verified) WHERE is_verified = TRUE;
CREATE INDEX idx_brands_industry ON brands(industry);

-- Athletic director indexes
CREATE INDEX idx_athletic_directors_profile_id ON athletic_directors(profile_id);
CREATE INDEX idx_athletic_directors_school_id ON athletic_directors(school_id);

-- Deal indexes
CREATE INDEX idx_deals_athlete_id ON deals(athlete_id);
CREATE INDEX idx_deals_brand_id ON deals(brand_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_created_at ON deals(created_at DESC);
CREATE INDEX idx_deals_opportunity_id ON deals(opportunity_id);
CREATE INDEX idx_deals_campaign_id ON deals(campaign_id);

-- Campaign indexes
CREATE INDEX idx_campaigns_brand_id ON campaigns(brand_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- Opportunity indexes
CREATE INDEX idx_opportunities_brand_id ON opportunities(brand_id);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_featured ON opportunities(is_featured) WHERE is_featured = TRUE;

-- Payment indexes
CREATE INDEX idx_payments_athlete_id ON payments(athlete_id);
CREATE INDEX idx_payments_deal_id ON payments(deal_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- Payment account indexes
CREATE INDEX idx_payment_accounts_user_id ON payment_accounts(user_id);
CREATE INDEX idx_payment_accounts_primary ON payment_accounts(is_primary) WHERE is_primary = TRUE;

-- Messaging indexes
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_unread ON messages(read_at) WHERE read_at IS NULL;

CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);

CREATE INDEX idx_conversations_deal_id ON conversations(deal_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);

-- Notification indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(read) WHERE read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Activity log indexes
CREATE INDEX idx_activity_log_profile_id ON activity_log(profile_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_type ON activity_log(type);

-- Brand shortlist indexes
CREATE INDEX idx_brand_shortlist_brand_id ON brand_shortlist(brand_id);
CREATE INDEX idx_brand_shortlist_athlete_id ON brand_shortlist(athlete_id);

-- Compliance alert indexes
CREATE INDEX idx_compliance_alerts_athlete_id ON compliance_alerts(athlete_id);
CREATE INDEX idx_compliance_alerts_school_id ON compliance_alerts(school_id);
CREATE INDEX idx_compliance_alerts_unresolved ON compliance_alerts(resolved) WHERE resolved = FALSE;

-- =====================================================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletic_directors ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_shortlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- Profiles Policies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (TRUE);

-- ─────────────────────────────────────────────────────────────────────────────
-- Athletes Policies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Athletes are publicly readable if searchable"
  ON athletes FOR SELECT
  USING (is_searchable = TRUE OR profile_id = auth.uid());

CREATE POLICY "Athletes can update own record"
  ON athletes FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "Athletes can insert own record"
  ON athletes FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- Brands Policies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Brands are publicly readable"
  ON brands FOR SELECT
  USING (TRUE);

CREATE POLICY "Brands can update own record"
  ON brands FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "Brands can insert own record"
  ON brands FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- Athletic Directors Policies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Directors can view own record"
  ON athletic_directors FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Directors can update own record"
  ON athletic_directors FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "Directors can insert own record"
  ON athletic_directors FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- Directors can also view athletes in their school
CREATE POLICY "Directors can view school athletes"
  ON athletes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM athletic_directors ad
      WHERE ad.profile_id = auth.uid()
      AND ad.school_id = athletes.school_id
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Deals Policies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Deals readable by parties"
  ON deals FOR SELECT
  USING (
    athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
    OR brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM athletic_directors ad
      JOIN athletes a ON a.school_id = ad.school_id
      WHERE ad.profile_id = auth.uid() AND a.id = deals.athlete_id
    )
  );

CREATE POLICY "Brands can create deals"
  ON deals FOR INSERT
  WITH CHECK (
    brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

CREATE POLICY "Deal parties can update"
  ON deals FOR UPDATE
  USING (
    athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
    OR brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Campaigns Policies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Brands can view own campaigns"
  ON campaigns FOR SELECT
  USING (
    brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

CREATE POLICY "Brands can create campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (
    brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

CREATE POLICY "Brands can update own campaigns"
  ON campaigns FOR UPDATE
  USING (
    brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

CREATE POLICY "Brands can delete own campaigns"
  ON campaigns FOR DELETE
  USING (
    brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Opportunities Policies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Active opportunities are publicly readable"
  ON opportunities FOR SELECT
  USING (status = 'active' OR brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid()));

CREATE POLICY "Brands can create opportunities"
  ON opportunities FOR INSERT
  WITH CHECK (
    brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

CREATE POLICY "Brands can update own opportunities"
  ON opportunities FOR UPDATE
  USING (
    brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Payments Policies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Athletes can view own payments"
  ON payments FOR SELECT
  USING (
    athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
  );

CREATE POLICY "Brands can view payments for their deals"
  ON payments FOR SELECT
  USING (
    deal_id IN (
      SELECT id FROM deals WHERE brand_id IN (
        SELECT id FROM brands WHERE profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "Service can create payments"
  ON payments FOR INSERT
  WITH CHECK (TRUE);

-- ─────────────────────────────────────────────────────────────────────────────
-- Payment Accounts Policies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Users can view own payment accounts"
  ON payment_accounts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own payment accounts"
  ON payment_accounts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own payment accounts"
  ON payment_accounts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own payment accounts"
  ON payment_accounts FOR DELETE
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- Conversations Policies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Participants can view conversations"
  ON conversations FOR SELECT
  USING (
    id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Participants can update conversations"
  ON conversations FOR UPDATE
  USING (
    id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Conversation Participants Policies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Users can view conversation participants"
  ON conversation_participants FOR SELECT
  USING (
    user_id = auth.uid() OR
    conversation_id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can add participants"
  ON conversation_participants FOR INSERT
  WITH CHECK (TRUE);

-- ─────────────────────────────────────────────────────────────────────────────
-- Messages Policies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Messages accessible to participants"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can insert messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can update messages"
  ON messages FOR UPDATE
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Message Attachments Policies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Attachments accessible to message participants"
  ON message_attachments FOR SELECT
  USING (
    message_id IN (
      SELECT m.id FROM messages m
      JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can add attachments"
  ON message_attachments FOR INSERT
  WITH CHECK (
    message_id IN (
      SELECT m.id FROM messages m
      JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE cp.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Notifications Policies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Service can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (TRUE);

-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Shortlist Policies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Brands can view own shortlist"
  ON brand_shortlist FOR SELECT
  USING (
    brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

CREATE POLICY "Brands can add to shortlist"
  ON brand_shortlist FOR INSERT
  WITH CHECK (
    brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

CREATE POLICY "Brands can remove from shortlist"
  ON brand_shortlist FOR DELETE
  USING (
    brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Activity Log Policies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Users can view own activity"
  ON activity_log FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Service can create activity"
  ON activity_log FOR INSERT
  WITH CHECK (TRUE);

-- ─────────────────────────────────────────────────────────────────────────────
-- Analytics Policies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Athletes can view own analytics"
  ON athlete_analytics FOR SELECT
  USING (
    athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
  );

CREATE POLICY "Brands can view own analytics"
  ON brand_analytics FOR SELECT
  USING (
    brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Compliance Alerts Policies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Directors can view school compliance alerts"
  ON compliance_alerts FOR SELECT
  USING (
    school_id IN (SELECT school_id FROM athletic_directors WHERE profile_id = auth.uid())
  );

CREATE POLICY "Directors can update school compliance alerts"
  ON compliance_alerts FOR UPDATE
  USING (
    school_id IN (SELECT school_id FROM athletic_directors WHERE profile_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Schools and Sports Policies (Public Read)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Schools are publicly readable"
  ON schools FOR SELECT
  USING (TRUE);

CREATE POLICY "Sports are publicly readable"
  ON sports FOR SELECT
  USING (TRUE);

-- =====================================================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_athletes_updated_at
  BEFORE UPDATE ON athletes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_athletic_directors_updated_at
  BEFORE UPDATE ON athletic_directors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_accounts_updated_at
  BEFORE UPDATE ON payment_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON schools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- HELPER FUNCTIONS
-- =====================================================================================

-- Function to create analytics record when athlete is created
CREATE OR REPLACE FUNCTION create_athlete_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO athlete_analytics (athlete_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_athlete_analytics_trigger
  AFTER INSERT ON athletes
  FOR EACH ROW EXECUTE FUNCTION create_athlete_analytics();

-- Function to create analytics record when brand is created
CREATE OR REPLACE FUNCTION create_brand_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO brand_analytics (brand_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_brand_analytics_trigger
  AFTER INSERT ON brands
  FOR EACH ROW EXECUTE FUNCTION create_brand_analytics();

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

-- =====================================================================================
-- ENABLE REALTIME
-- =====================================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE deals;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- =====================================================================================
-- INITIAL SEED DATA: Schools
-- =====================================================================================

INSERT INTO schools (name, short_name, city, state, division, conference) VALUES
  ('Duke University', 'Duke', 'Durham', 'NC', 'D1', 'ACC'),
  ('Stanford University', 'Stanford', 'Stanford', 'CA', 'D1', 'Pac-12'),
  ('Ohio State University', 'Ohio State', 'Columbus', 'OH', 'D1', 'Big Ten'),
  ('University of California, Los Angeles', 'UCLA', 'Los Angeles', 'CA', 'D1', 'Pac-12'),
  ('University of Michigan', 'Michigan', 'Ann Arbor', 'MI', 'D1', 'Big Ten'),
  ('University of Southern California', 'USC', 'Los Angeles', 'CA', 'D1', 'Pac-12'),
  ('University of Alabama', 'Alabama', 'Tuscaloosa', 'AL', 'D1', 'SEC'),
  ('University of Texas at Austin', 'Texas', 'Austin', 'TX', 'D1', 'Big 12'),
  ('University of North Carolina', 'UNC', 'Chapel Hill', 'NC', 'D1', 'ACC'),
  ('University of Florida', 'Florida', 'Gainesville', 'FL', 'D1', 'SEC'),
  ('University of Georgia', 'Georgia', 'Athens', 'GA', 'D1', 'SEC'),
  ('Clemson University', 'Clemson', 'Clemson', 'SC', 'D1', 'ACC'),
  ('University of Notre Dame', 'Notre Dame', 'Notre Dame', 'IN', 'D1', 'ACC'),
  ('Penn State University', 'Penn State', 'State College', 'PA', 'D1', 'Big Ten'),
  ('University of Oregon', 'Oregon', 'Eugene', 'OR', 'D1', 'Pac-12')
ON CONFLICT DO NOTHING;

-- =====================================================================================
-- INITIAL SEED DATA: Sports
-- =====================================================================================

INSERT INTO sports (name, category, gender, icon_name) VALUES
  ('Basketball', 'team', 'men', 'basketball'),
  ('Basketball', 'team', 'women', 'basketball'),
  ('Football', 'team', 'men', 'football'),
  ('Soccer', 'team', 'men', 'soccer'),
  ('Soccer', 'team', 'women', 'soccer'),
  ('Volleyball', 'team', 'women', 'volleyball'),
  ('Gymnastics', 'individual', 'women', 'gymnastics'),
  ('Swimming', 'individual', 'coed', 'swimming'),
  ('Tennis', 'individual', 'coed', 'tennis'),
  ('Track & Field', 'individual', 'coed', 'track'),
  ('Baseball', 'team', 'men', 'baseball'),
  ('Softball', 'team', 'women', 'softball'),
  ('Golf', 'individual', 'coed', 'golf'),
  ('Wrestling', 'individual', 'men', 'wrestling'),
  ('Lacrosse', 'team', 'coed', 'lacrosse'),
  ('Ice Hockey', 'team', 'men', 'hockey'),
  ('Ice Hockey', 'team', 'women', 'hockey'),
  ('Cross Country', 'individual', 'coed', 'running'),
  ('Rowing', 'team', 'coed', 'rowing'),
  ('Field Hockey', 'team', 'women', 'field-hockey')
ON CONFLICT DO NOTHING;

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================

COMMENT ON SCHEMA public IS 'GradeUp NIL Database Schema v1.0 - Production Ready';
