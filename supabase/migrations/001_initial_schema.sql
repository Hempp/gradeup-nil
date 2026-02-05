-- GradeUp NIL Platform - Initial Schema
-- Version: 1.0.0
-- Description: Complete database schema for NIL marketplace

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- User roles
CREATE TYPE user_role AS ENUM ('athlete', 'brand', 'athletic_director', 'admin');

-- Verification status
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected', 'expired');

-- Deal status
CREATE TYPE deal_status AS ENUM ('draft', 'pending', 'negotiating', 'accepted', 'active', 'completed', 'cancelled', 'expired');

-- Deal types
CREATE TYPE deal_type AS ENUM ('social_post', 'appearance', 'endorsement', 'autograph', 'camp', 'merchandise', 'other');

-- Athletic divisions
CREATE TYPE athletic_division AS ENUM ('D1', 'D2', 'D3', 'NAIA', 'JUCO', 'other');

-- Academic year
CREATE TYPE academic_year AS ENUM ('freshman', 'sophomore', 'junior', 'senior', 'graduate', 'other');

-- ============================================================================
-- TABLES: Core
-- ============================================================================

-- Schools/Universities
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(50),
    city VARCHAR(100),
    state VARCHAR(50),
    division athletic_division DEFAULT 'D1',
    conference VARCHAR(100),
    logo_url TEXT,
    primary_color VARCHAR(7),
    secondary_color VARCHAR(7),
    website_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sports
CREATE TABLE sports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50), -- 'team', 'individual'
    gender VARCHAR(20), -- 'mens', 'womens', 'coed'
    icon_name VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLES: Users & Profiles
-- ============================================================================

-- Base profiles (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url TEXT,
    bio TEXT,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Athlete profiles
CREATE TABLE athletes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    school_id UUID REFERENCES schools(id),
    sport_id UUID REFERENCES sports(id),

    -- Academic info
    major VARCHAR(255),
    minor VARCHAR(255),
    gpa DECIMAL(3,2) CHECK (gpa >= 0 AND gpa <= 4.0),
    academic_year academic_year,
    expected_graduation DATE,

    -- Athletic info
    position VARCHAR(100),
    jersey_number VARCHAR(10),
    height_inches INTEGER,
    weight_lbs INTEGER,
    hometown VARCHAR(255),
    high_school VARCHAR(255),

    -- Social metrics
    instagram_handle VARCHAR(100),
    instagram_followers INTEGER DEFAULT 0,
    twitter_handle VARCHAR(100),
    twitter_followers INTEGER DEFAULT 0,
    tiktok_handle VARCHAR(100),
    tiktok_followers INTEGER DEFAULT 0,
    total_followers INTEGER GENERATED ALWAYS AS (
        COALESCE(instagram_followers, 0) +
        COALESCE(twitter_followers, 0) +
        COALESCE(tiktok_followers, 0)
    ) STORED,

    -- NIL metrics
    nil_valuation DECIMAL(12,2) DEFAULT 0,
    total_earnings DECIMAL(12,2) DEFAULT 0,
    deals_completed INTEGER DEFAULT 0,
    avg_deal_rating DECIMAL(3,2) DEFAULT 0,

    -- GradeUp Score (calculated)
    gradeup_score DECIMAL(5,2) DEFAULT 0,

    -- Verification flags
    enrollment_verified BOOLEAN DEFAULT false,
    enrollment_verified_at TIMESTAMPTZ,
    sport_verified BOOLEAN DEFAULT false,
    sport_verified_at TIMESTAMPTZ,
    grades_verified BOOLEAN DEFAULT false,
    grades_verified_at TIMESTAMPTZ,
    identity_verified BOOLEAN DEFAULT false,
    identity_verified_at TIMESTAMPTZ,

    -- Profile settings
    is_searchable BOOLEAN DEFAULT true,
    show_gpa BOOLEAN DEFAULT true,
    accepting_deals BOOLEAN DEFAULT true,
    min_deal_amount DECIMAL(10,2),

    -- Metadata
    featured BOOLEAN DEFAULT false,
    featured_order INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(profile_id)
);

-- Brand profiles
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Company info
    company_name VARCHAR(255) NOT NULL,
    company_type VARCHAR(100), -- 'corporation', 'agency', 'local_business', 'nonprofit'
    industry VARCHAR(100),
    website_url TEXT,
    logo_url TEXT,

    -- Contact info
    contact_name VARCHAR(255),
    contact_title VARCHAR(100),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),

    -- Location
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',

    -- NIL activity
    total_spent DECIMAL(12,2) DEFAULT 0,
    deals_completed INTEGER DEFAULT 0,
    avg_deal_rating DECIMAL(3,2) DEFAULT 0,
    active_campaigns INTEGER DEFAULT 0,

    -- Preferences
    preferred_sports UUID[],
    preferred_schools UUID[],
    preferred_divisions athletic_division[],
    min_gpa DECIMAL(3,2),
    min_followers INTEGER,
    budget_range_min DECIMAL(10,2),
    budget_range_max DECIMAL(10,2),

    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(profile_id)
);

-- Athletic Directors
CREATE TABLE athletic_directors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id),

    title VARCHAR(255),
    department VARCHAR(255),
    office_phone VARCHAR(20),

    -- Permissions
    can_verify_enrollment BOOLEAN DEFAULT true,
    can_verify_sport BOOLEAN DEFAULT true,
    can_verify_grades BOOLEAN DEFAULT true,
    can_manage_athletes BOOLEAN DEFAULT true,

    is_primary_contact BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(profile_id)
);

-- ============================================================================
-- TABLES: Verification
-- ============================================================================

-- Verification requests
CREATE TABLE verification_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

    verification_type VARCHAR(50) NOT NULL, -- 'enrollment', 'sport', 'grades', 'identity'
    status verification_status DEFAULT 'pending',

    -- Submitted documents
    document_urls TEXT[],
    document_type VARCHAR(100), -- 'student_id', 'transcript', 'roster', 'id_card'

    -- Review info
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    rejection_reason TEXT,

    -- Auto-verification data
    auto_verified BOOLEAN DEFAULT false,
    verification_source VARCHAR(100), -- 'registrar_api', 'ncaa_database', 'manual'

    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLES: Deals & Opportunities
-- ============================================================================

-- Deal opportunities (brand creates)
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,
    description TEXT,
    deal_type deal_type NOT NULL,

    -- Compensation
    compensation_amount DECIMAL(10,2),
    compensation_type VARCHAR(50), -- 'fixed', 'hourly', 'per_post', 'revenue_share'
    compensation_details TEXT,

    -- Requirements
    required_sports UUID[],
    required_schools UUID[],
    required_divisions athletic_division[],
    min_gpa DECIMAL(3,2),
    min_followers INTEGER,
    min_gradeup_score DECIMAL(5,2),
    required_academic_years academic_year[],

    -- Deliverables
    deliverables JSONB, -- Array of {type, description, deadline}

    -- Timeline
    start_date DATE,
    end_date DATE,
    application_deadline DATE,

    -- Limits
    max_athletes INTEGER,
    athletes_selected INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'active', 'paused', 'closed', 'completed'
    is_featured BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deals (athlete-brand agreements)
CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opportunity_id UUID REFERENCES opportunities(id),
    athlete_id UUID NOT NULL REFERENCES athletes(id),
    brand_id UUID NOT NULL REFERENCES brands(id),

    -- Deal details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deal_type deal_type NOT NULL,
    status deal_status DEFAULT 'pending',

    -- Compensation
    amount DECIMAL(10,2) NOT NULL,
    payment_terms TEXT,

    -- Deliverables
    deliverables JSONB,

    -- Timeline
    start_date DATE,
    end_date DATE,

    -- Contract
    contract_url TEXT,
    contract_signed_athlete_at TIMESTAMPTZ,
    contract_signed_brand_at TIMESTAMPTZ,

    -- Completion
    completed_at TIMESTAMPTZ,
    athlete_rating DECIMAL(3,2),
    athlete_review TEXT,
    brand_rating DECIMAL(3,2),
    brand_review TEXT,

    -- Compliance
    compliance_approved BOOLEAN DEFAULT false,
    compliance_approved_by UUID REFERENCES profiles(id),
    compliance_approved_at TIMESTAMPTZ,
    compliance_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deal messages
CREATE TABLE deal_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id),

    message TEXT NOT NULL,
    attachments TEXT[],

    read_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLES: Notifications & Activity
-- ============================================================================

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL, -- 'deal_offer', 'verification_update', 'message', 'system'
    title VARCHAR(255) NOT NULL,
    body TEXT,

    -- Related entities
    related_type VARCHAR(50), -- 'deal', 'opportunity', 'verification', 'athlete', 'brand'
    related_id UUID,

    -- Action
    action_url TEXT,
    action_label VARCHAR(100),

    read_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),

    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,

    metadata JSONB,
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLES: Analytics
-- ============================================================================

-- Athlete profile views
CREATE TABLE profile_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES profiles(id),
    viewer_type user_role,

    source VARCHAR(50), -- 'search', 'featured', 'opportunity', 'direct'

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search analytics
CREATE TABLE search_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),

    search_query TEXT,
    filters JSONB,
    results_count INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Athletes
CREATE INDEX idx_athletes_school ON athletes(school_id);
CREATE INDEX idx_athletes_sport ON athletes(sport_id);
CREATE INDEX idx_athletes_gpa ON athletes(gpa DESC);
CREATE INDEX idx_athletes_gradeup_score ON athletes(gradeup_score DESC);
CREATE INDEX idx_athletes_total_followers ON athletes(total_followers DESC);
CREATE INDEX idx_athletes_searchable ON athletes(is_searchable, accepting_deals);
CREATE INDEX idx_athletes_verified ON athletes(enrollment_verified, sport_verified, grades_verified);

-- Brands
CREATE INDEX idx_brands_verified ON brands(is_verified);
CREATE INDEX idx_brands_industry ON brands(industry);

-- Deals
CREATE INDEX idx_deals_athlete ON deals(athlete_id);
CREATE INDEX idx_deals_brand ON deals(brand_id);
CREATE INDEX idx_deals_status ON deals(status);

-- Opportunities
CREATE INDEX idx_opportunities_brand ON opportunities(brand_id);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_deal_type ON opportunities(deal_type);

-- Verification
CREATE INDEX idx_verification_athlete ON verification_requests(athlete_id);
CREATE INDEX idx_verification_status ON verification_requests(status);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id, read_at);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Calculate GradeUp Score
CREATE OR REPLACE FUNCTION calculate_gradeup_score(
    p_gpa DECIMAL,
    p_total_followers INTEGER,
    p_deals_completed INTEGER,
    p_avg_rating DECIMAL,
    p_enrollment_verified BOOLEAN,
    p_sport_verified BOOLEAN,
    p_grades_verified BOOLEAN
) RETURNS DECIMAL AS $$
DECLARE
    score DECIMAL := 0;
    verification_bonus DECIMAL := 0;
BEGIN
    -- GPA component (0-100 points, weighted 25%)
    score := score + (COALESCE(p_gpa, 0) / 4.0) * 25;

    -- Social following component (0-100 points, weighted 25%)
    -- Logarithmic scale to prevent mega-influencers from dominating
    IF p_total_followers > 0 THEN
        score := score + LEAST(LOG(p_total_followers) / LOG(1000000) * 25, 25);
    END IF;

    -- Experience component (0-100 points, weighted 20%)
    score := score + LEAST(p_deals_completed * 2, 20);

    -- Rating component (0-100 points, weighted 15%)
    score := score + (COALESCE(p_avg_rating, 0) / 5.0) * 15;

    -- Verification bonus (0-15 points)
    IF p_enrollment_verified THEN verification_bonus := verification_bonus + 5; END IF;
    IF p_sport_verified THEN verification_bonus := verification_bonus + 5; END IF;
    IF p_grades_verified THEN verification_bonus := verification_bonus + 5; END IF;

    score := score + verification_bonus;

    RETURN ROUND(score, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update GradeUp Score trigger
CREATE OR REPLACE FUNCTION update_gradeup_score() RETURNS TRIGGER AS $$
BEGIN
    NEW.gradeup_score := calculate_gradeup_score(
        NEW.gpa,
        NEW.total_followers,
        NEW.deals_completed,
        NEW.avg_deal_rating,
        NEW.enrollment_verified,
        NEW.sport_verified,
        NEW.grades_verified
    );
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_gradeup_score
    BEFORE INSERT OR UPDATE ON athletes
    FOR EACH ROW
    EXECUTE FUNCTION update_gradeup_score();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_athletic_directors_updated_at BEFORE UPDATE ON athletic_directors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_schools_updated_at BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_deals_updated_at BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_opportunities_updated_at BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_verification_updated_at BEFORE UPDATE ON verification_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE athletes IS 'Student-athlete profiles with NIL metrics and verification status';
COMMENT ON TABLE brands IS 'Brand/company profiles seeking athlete partnerships';
COMMENT ON TABLE athletic_directors IS 'Athletic department staff who verify athletes';
COMMENT ON TABLE deals IS 'NIL agreements between athletes and brands';
COMMENT ON TABLE opportunities IS 'Brand-posted opportunities for athletes to apply';
COMMENT ON COLUMN athletes.gradeup_score IS 'Composite score (0-100) based on GPA, social, experience, and verification';
COMMENT ON FUNCTION calculate_gradeup_score IS 'Calculates athlete GradeUp Score based on multiple factors';
