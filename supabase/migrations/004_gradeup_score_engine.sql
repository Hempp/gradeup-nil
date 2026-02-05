-- GradeUp NIL Platform - GradeUp Score Engine
-- Version: 1.0.0
-- Description: Advanced GPA-weighted athlete valuation system with major categories and academic tracking
--
-- The GradeUp Score Engine is the core innovation that differentiates GradeUp from other NIL platforms.
-- It creates a comprehensive 0-1000 score that weighs:
--   - Athletic performance (0-400 points)
--   - Social reach (0-300 points)
--   - Academic achievement (0-300 points, with multipliers for GPA, major, and consistency)

-- ============================================================================
-- MAJOR CATEGORIES FOR BRAND MATCHING
-- ============================================================================

-- Major categories map academic fields to industries for smarter brand matching
CREATE TABLE major_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    industries TEXT[] NOT NULL, -- Matching industries for brand alignment
    multiplier DECIMAL(3,2) DEFAULT 1.00 CHECK (multiplier >= 0.50 AND multiplier <= 2.00),
    icon_name VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ACADEMIC RECORDS FOR GPA TRACKING
-- ============================================================================

-- Track semester-by-semester academic performance for consistency scoring
CREATE TABLE academic_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

    -- Semester info
    semester TEXT NOT NULL CHECK (semester IN ('fall', 'spring', 'summer', 'winter')),
    year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),

    -- Academic performance
    gpa DECIMAL(3,2) NOT NULL CHECK (gpa >= 0 AND gpa <= 4.0),
    credits INTEGER CHECK (credits >= 0 AND credits <= 30),
    cumulative_gpa DECIMAL(3,2) CHECK (cumulative_gpa >= 0 AND cumulative_gpa <= 4.0),

    -- Honors
    deans_list BOOLEAN DEFAULT false,
    academic_all_american BOOLEAN DEFAULT false,
    honor_roll BOOLEAN DEFAULT false,

    -- Verification
    verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES profiles(id),
    verification_document_url TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate entries for same semester/year
    UNIQUE(athlete_id, semester, year)
);

-- ============================================================================
-- GRADEUP SCORE HISTORY
-- ============================================================================

-- Track score history for analytics and trends
CREATE TABLE gradeup_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

    -- Composite score (0-1000)
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 1000),

    -- Component scores
    athletic_score INTEGER CHECK (athletic_score >= 0 AND athletic_score <= 400),
    social_score INTEGER CHECK (social_score >= 0 AND social_score <= 300),
    academic_score INTEGER CHECK (academic_score >= 0 AND academic_score <= 300),

    -- Multipliers applied
    gpa_multiplier DECIMAL(3,2),
    major_multiplier DECIMAL(3,2),
    consistency_bonus DECIMAL(3,2),

    -- Raw inputs (for audit trail)
    input_data JSONB,

    -- Metadata
    calculation_version VARCHAR(20) DEFAULT '2.0',
    calculated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Index for time-series queries
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SPORT TIERS FOR ATHLETIC SCORING
-- ============================================================================

-- Sport tiers affect athletic score weighting
CREATE TABLE sport_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
    division athletic_division NOT NULL,
    tier INTEGER NOT NULL CHECK (tier >= 1 AND tier <= 5), -- 1 = highest (football, basketball), 5 = lowest
    base_multiplier DECIMAL(3,2) DEFAULT 1.00,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(sport_id, division)
);

-- ============================================================================
-- ALTER ATHLETES TABLE
-- ============================================================================

-- Add major_category_id to athletes for industry matching
ALTER TABLE athletes
ADD COLUMN IF NOT EXISTS major_category_id UUID REFERENCES major_categories(id);

-- Add cumulative_gpa for overall GPA tracking (separate from current semester GPA)
ALTER TABLE athletes
ADD COLUMN IF NOT EXISTS cumulative_gpa DECIMAL(3,2) CHECK (cumulative_gpa >= 0 AND cumulative_gpa <= 4.0);

-- Add athletic_rating for coaches/staff input (0-100)
ALTER TABLE athletes
ADD COLUMN IF NOT EXISTS athletic_rating INTEGER DEFAULT 50 CHECK (athletic_rating >= 0 AND athletic_rating <= 100);

-- Change gradeup_score from DECIMAL(5,2) to INTEGER (0-1000 scale)
-- First drop the trigger and old column, then recreate
DROP TRIGGER IF EXISTS trigger_update_gradeup_score ON athletes;

-- Update the column type (keeping the old data temporarily)
ALTER TABLE athletes
ALTER COLUMN gradeup_score TYPE INTEGER
USING ROUND(COALESCE(gradeup_score, 0) * 10)::INTEGER;

-- Set default
ALTER TABLE athletes
ALTER COLUMN gradeup_score SET DEFAULT 0;

-- Add constraint
ALTER TABLE athletes
ADD CONSTRAINT chk_gradeup_score CHECK (gradeup_score >= 0 AND gradeup_score <= 1000);

-- ============================================================================
-- SEED MAJOR CATEGORIES
-- ============================================================================

INSERT INTO major_categories (name, description, industries, multiplier, icon_name) VALUES
    ('STEM', 'Science, Technology, Engineering, Mathematics',
     ARRAY['technology', 'aerospace', 'automotive', 'engineering', 'gaming', 'electronics', 'software', 'robotics'],
     1.25, 'beaker'),

    ('Business', 'Business Administration, Finance, Economics, Marketing',
     ARRAY['finance', 'consulting', 'retail', 'b2b', 'insurance', 'banking', 'investment', 'real-estate'],
     1.20, 'briefcase'),

    ('Healthcare', 'Pre-Med, Nursing, Kinesiology, Public Health',
     ARRAY['pharmaceutical', 'healthcare', 'wellness', 'fitness', 'medical', 'biotech', 'nutrition', 'sports-medicine'],
     1.25, 'heart-pulse'),

    ('Communications', 'Journalism, Public Relations, Media Studies, Advertising',
     ARRAY['media', 'marketing', 'pr', 'advertising', 'entertainment', 'broadcasting', 'social-media', 'content'],
     1.15, 'megaphone'),

    ('Education', 'Education, Teaching, Coaching, Educational Psychology',
     ARRAY['edtech', 'tutoring', 'publishing', 'nonprofit', 'youth-sports', 'coaching', 'training'],
     1.10, 'graduation-cap'),

    ('Arts & Design', 'Fine Arts, Graphic Design, Film, Music, Fashion',
     ARRAY['fashion', 'design', 'music', 'entertainment', 'lifestyle', 'luxury', 'creative', 'apparel'],
     1.10, 'palette'),

    ('Social Sciences', 'Psychology, Sociology, Political Science, Anthropology',
     ARRAY['nonprofit', 'government', 'consulting', 'research', 'social-impact', 'community'],
     1.05, 'users'),

    ('Law & Criminal Justice', 'Pre-Law, Criminal Justice, Legal Studies',
     ARRAY['legal', 'security', 'government', 'consulting', 'corporate'],
     1.15, 'scale'),

    ('General Studies', 'Undeclared, General Studies, Liberal Arts',
     ARRAY['consumer', 'retail', 'food', 'beverage', 'sports', 'lifestyle', 'general'],
     1.00, 'book')
ON CONFLICT (name) DO UPDATE SET
    industries = EXCLUDED.industries,
    multiplier = EXCLUDED.multiplier,
    description = EXCLUDED.description,
    icon_name = EXCLUDED.icon_name;

-- ============================================================================
-- GRADEUP SCORE CALCULATION FUNCTION (v2.0)
-- ============================================================================

-- Drop old function if exists
DROP FUNCTION IF EXISTS calculate_gradeup_score(DECIMAL, INTEGER, INTEGER, DECIMAL, BOOLEAN, BOOLEAN, BOOLEAN);

-- Create new comprehensive scoring function
CREATE OR REPLACE FUNCTION calculate_gradeup_score(p_athlete_id UUID)
RETURNS TABLE (
    score INTEGER,
    athletic_score INTEGER,
    social_score INTEGER,
    academic_score INTEGER,
    gpa_multiplier DECIMAL,
    major_multiplier DECIMAL,
    consistency_bonus DECIMAL,
    breakdown JSONB
) AS $$
DECLARE
    v_athlete RECORD;
    v_athletic_score INTEGER := 0;
    v_social_score INTEGER := 0;
    v_academic_score INTEGER := 0;
    v_gpa DECIMAL;
    v_gpa_multiplier DECIMAL := 1.00;
    v_major_multiplier DECIMAL := 1.00;
    v_consistency_bonus DECIMAL := 1.00;
    v_final_score INTEGER;
    v_sport_tier INTEGER;
    v_semester_count INTEGER;
    v_min_semester_gpa DECIMAL;
    v_breakdown JSONB;
BEGIN
    -- Get athlete data with related info
    SELECT
        a.*,
        s.name as sport_name,
        mc.multiplier as category_multiplier,
        mc.name as major_category_name
    INTO v_athlete
    FROM athletes a
    LEFT JOIN sports s ON a.sport_id = s.id
    LEFT JOIN major_categories mc ON a.major_category_id = mc.id
    WHERE a.id = p_athlete_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Athlete not found: %', p_athlete_id;
    END IF;

    -- =========================================================================
    -- ATHLETIC SCORE (0-400 points)
    -- Based on sport tier, athletic rating, deals completed, and average rating
    -- =========================================================================

    -- Get sport tier (default to tier 3 if not set)
    SELECT COALESCE(st.tier, 3) INTO v_sport_tier
    FROM athletes a
    LEFT JOIN sport_tiers st ON a.sport_id = st.sport_id
    WHERE a.id = p_athlete_id;

    -- Base athletic score from athletic_rating (0-100 -> 0-200)
    v_athletic_score := COALESCE(v_athlete.athletic_rating, 50) * 2;

    -- Sport tier adjustment (tier 1 = 1.5x, tier 5 = 0.7x)
    v_athletic_score := (v_athletic_score * (1.6 - (COALESCE(v_sport_tier, 3) * 0.15)))::INTEGER;

    -- Experience bonus (up to 100 points from deals)
    v_athletic_score := v_athletic_score + LEAST(COALESCE(v_athlete.deals_completed, 0) * 5, 100);

    -- Rating bonus (up to 100 points from avg rating)
    IF v_athlete.avg_deal_rating IS NOT NULL AND v_athlete.avg_deal_rating > 0 THEN
        v_athletic_score := v_athletic_score + (v_athlete.avg_deal_rating / 5.0 * 100)::INTEGER;
    END IF;

    -- Cap at 400
    v_athletic_score := LEAST(400, v_athletic_score);

    -- =========================================================================
    -- SOCIAL SCORE (0-300 points)
    -- Based on total followers with logarithmic scaling
    -- =========================================================================

    IF v_athlete.total_followers IS NOT NULL AND v_athlete.total_followers > 0 THEN
        -- Logarithmic scale: 1K = 60, 10K = 120, 100K = 180, 1M = 240, 10M = 300
        v_social_score := LEAST(300, (LOG(v_athlete.total_followers::DECIMAL) / LOG(10::DECIMAL) - 2) * 60)::INTEGER;
        v_social_score := GREATEST(0, v_social_score);
    END IF;

    -- =========================================================================
    -- ACADEMIC SCORE (0-300 points)
    -- GPA-weighted with multipliers for academic excellence
    -- =========================================================================

    -- Use cumulative_gpa if available, otherwise fall back to gpa
    v_gpa := COALESCE(v_athlete.cumulative_gpa, v_athlete.gpa, 2.5);

    -- GPA Multiplier tiers:
    -- 4.0     = 1.50x (Dean's List+)
    -- 3.75+   = 1.35x (Honor Roll)
    -- 3.5+    = 1.25x (Academic Excellence)
    -- 3.0+    = 1.10x (Good Standing)
    -- < 3.0   = 1.00x (Standard)
    v_gpa_multiplier := CASE
        WHEN v_gpa >= 4.0 THEN 1.50
        WHEN v_gpa >= 3.75 THEN 1.35
        WHEN v_gpa >= 3.5 THEN 1.25
        WHEN v_gpa >= 3.0 THEN 1.10
        ELSE 1.00
    END;

    -- Major Multiplier from major_categories table
    v_major_multiplier := COALESCE(v_athlete.category_multiplier, 1.00);

    -- Consistency Bonus: Reward maintaining high GPA over multiple semesters
    SELECT COUNT(*), MIN(gpa)
    INTO v_semester_count, v_min_semester_gpa
    FROM academic_records
    WHERE athlete_id = p_athlete_id AND verified = true;

    v_consistency_bonus := CASE
        WHEN v_semester_count >= 6 AND v_min_semester_gpa >= 3.5 THEN 1.15  -- 6+ semesters, all 3.5+
        WHEN v_semester_count >= 4 AND v_min_semester_gpa >= 3.5 THEN 1.10  -- 4+ semesters, all 3.5+
        WHEN v_semester_count >= 4 AND v_min_semester_gpa >= 3.0 THEN 1.07  -- 4+ semesters, all 3.0+
        WHEN v_semester_count >= 2 AND v_min_semester_gpa >= 3.0 THEN 1.05  -- 2+ semesters, all 3.0+
        ELSE 1.00
    END;

    -- Calculate base academic score (GPA/4.0 * 200)
    -- Then apply multipliers, cap at 300
    v_academic_score := ((v_gpa / 4.0) * 200 * v_gpa_multiplier * v_major_multiplier * v_consistency_bonus)::INTEGER;
    v_academic_score := LEAST(300, v_academic_score);

    -- Verification bonuses (add directly to academic score)
    IF v_athlete.grades_verified THEN
        v_academic_score := LEAST(300, v_academic_score + 15);
    END IF;
    IF v_athlete.enrollment_verified THEN
        v_academic_score := LEAST(300, v_academic_score + 10);
    END IF;

    -- =========================================================================
    -- FINAL SCORE CALCULATION
    -- =========================================================================

    v_final_score := v_athletic_score + v_social_score + v_academic_score;
    v_final_score := LEAST(1000, v_final_score);

    -- Build detailed breakdown for transparency
    v_breakdown := jsonb_build_object(
        'version', '2.0',
        'athletic', jsonb_build_object(
            'score', v_athletic_score,
            'max', 400,
            'components', jsonb_build_object(
                'base_rating', COALESCE(v_athlete.athletic_rating, 50),
                'sport_tier', COALESCE(v_sport_tier, 3),
                'deals_completed', COALESCE(v_athlete.deals_completed, 0),
                'avg_rating', COALESCE(v_athlete.avg_deal_rating, 0)
            )
        ),
        'social', jsonb_build_object(
            'score', v_social_score,
            'max', 300,
            'components', jsonb_build_object(
                'total_followers', COALESCE(v_athlete.total_followers, 0),
                'instagram', COALESCE(v_athlete.instagram_followers, 0),
                'twitter', COALESCE(v_athlete.twitter_followers, 0),
                'tiktok', COALESCE(v_athlete.tiktok_followers, 0)
            )
        ),
        'academic', jsonb_build_object(
            'score', v_academic_score,
            'max', 300,
            'components', jsonb_build_object(
                'gpa', v_gpa,
                'major', COALESCE(v_athlete.major_category_name, 'General Studies'),
                'semesters_tracked', v_semester_count,
                'grades_verified', v_athlete.grades_verified,
                'enrollment_verified', v_athlete.enrollment_verified
            ),
            'multipliers', jsonb_build_object(
                'gpa_multiplier', v_gpa_multiplier,
                'major_multiplier', v_major_multiplier,
                'consistency_bonus', v_consistency_bonus
            )
        ),
        'calculated_at', NOW()
    );

    -- =========================================================================
    -- RECORD SCORE IN HISTORY
    -- =========================================================================

    INSERT INTO gradeup_scores (
        athlete_id,
        score,
        athletic_score,
        social_score,
        academic_score,
        gpa_multiplier,
        major_multiplier,
        consistency_bonus,
        input_data
    ) VALUES (
        p_athlete_id,
        v_final_score,
        v_athletic_score,
        v_social_score,
        v_academic_score,
        v_gpa_multiplier,
        v_major_multiplier,
        v_consistency_bonus,
        v_breakdown
    );

    -- Update athlete's current score
    UPDATE athletes
    SET gradeup_score = v_final_score,
        updated_at = NOW()
    WHERE id = p_athlete_id;

    -- Return results
    RETURN QUERY SELECT
        v_final_score,
        v_athletic_score,
        v_social_score,
        v_academic_score,
        v_gpa_multiplier,
        v_major_multiplier,
        v_consistency_bonus,
        v_breakdown;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- BATCH SCORE CALCULATION
-- ============================================================================

-- Calculate scores for multiple athletes at once
CREATE OR REPLACE FUNCTION batch_calculate_gradeup_scores(p_athlete_ids UUID[])
RETURNS TABLE (
    athlete_id UUID,
    score INTEGER,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_athlete_id UUID;
    v_result RECORD;
BEGIN
    FOREACH v_athlete_id IN ARRAY p_athlete_ids LOOP
        BEGIN
            SELECT * INTO v_result
            FROM calculate_gradeup_score(v_athlete_id) LIMIT 1;

            RETURN QUERY SELECT v_athlete_id, v_result.score, true, NULL::TEXT;
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT v_athlete_id, 0, false, SQLERRM;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get score breakdown for display
CREATE OR REPLACE FUNCTION get_score_breakdown(p_athlete_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_breakdown JSONB;
BEGIN
    SELECT input_data INTO v_breakdown
    FROM gradeup_scores
    WHERE athlete_id = p_athlete_id
    ORDER BY calculated_at DESC
    LIMIT 1;

    RETURN COALESCE(v_breakdown, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql STABLE;

-- Get score history for athlete
CREATE OR REPLACE FUNCTION get_score_history(
    p_athlete_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    score INTEGER,
    athletic_score INTEGER,
    social_score INTEGER,
    academic_score INTEGER,
    calculated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        gs.score,
        gs.athletic_score,
        gs.social_score,
        gs.academic_score,
        gs.calculated_at
    FROM gradeup_scores gs
    WHERE gs.athlete_id = p_athlete_id
    ORDER BY gs.calculated_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get athletes by score range for brand matching
CREATE OR REPLACE FUNCTION get_athletes_by_score_range(
    p_min_score INTEGER DEFAULT 0,
    p_max_score INTEGER DEFAULT 1000,
    p_major_category_id UUID DEFAULT NULL,
    p_sport_id UUID DEFAULT NULL,
    p_min_gpa DECIMAL DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    athlete_id UUID,
    score INTEGER,
    gpa DECIMAL,
    major_category TEXT,
    sport TEXT,
    total_followers INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id as athlete_id,
        a.gradeup_score as score,
        COALESCE(a.cumulative_gpa, a.gpa) as gpa,
        mc.name as major_category,
        s.name as sport,
        a.total_followers
    FROM athletes a
    LEFT JOIN major_categories mc ON a.major_category_id = mc.id
    LEFT JOIN sports s ON a.sport_id = s.id
    WHERE a.gradeup_score BETWEEN p_min_score AND p_max_score
        AND a.is_searchable = true
        AND a.accepting_deals = true
        AND (p_major_category_id IS NULL OR a.major_category_id = p_major_category_id)
        AND (p_sport_id IS NULL OR a.sport_id = p_sport_id)
        AND (p_min_gpa IS NULL OR COALESCE(a.cumulative_gpa, a.gpa) >= p_min_gpa)
    ORDER BY a.gradeup_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_academic_records_athlete ON academic_records(athlete_id);
CREATE INDEX IF NOT EXISTS idx_academic_records_semester ON academic_records(athlete_id, year DESC, semester);
CREATE INDEX IF NOT EXISTS idx_academic_records_verified ON academic_records(athlete_id, verified) WHERE verified = true;

CREATE INDEX IF NOT EXISTS idx_gradeup_scores_athlete ON gradeup_scores(athlete_id);
CREATE INDEX IF NOT EXISTS idx_gradeup_scores_calculated ON gradeup_scores(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_gradeup_scores_athlete_time ON gradeup_scores(athlete_id, calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_sport_tiers_sport ON sport_tiers(sport_id);

CREATE INDEX IF NOT EXISTS idx_athletes_major_category ON athletes(major_category_id);
CREATE INDEX IF NOT EXISTS idx_athletes_gradeup_score_new ON athletes(gradeup_score DESC) WHERE is_searchable = true;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE major_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE gradeup_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE sport_tiers ENABLE ROW LEVEL SECURITY;

-- Major categories: Public read access
CREATE POLICY "major_categories_public_read" ON major_categories
    FOR SELECT USING (is_active = true);

-- Academic records: Athletes can view/manage their own
CREATE POLICY "academic_records_athlete_view" ON academic_records
    FOR SELECT USING (
        athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
    );

CREATE POLICY "academic_records_athlete_insert" ON academic_records
    FOR INSERT WITH CHECK (
        athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
    );

CREATE POLICY "academic_records_athlete_update" ON academic_records
    FOR UPDATE USING (
        athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
        AND verified = false  -- Can only edit unverified records
    );

-- Athletic Directors can view/verify records for their school's athletes
CREATE POLICY "academic_records_ad_view" ON academic_records
    FOR SELECT USING (
        athlete_id IN (
            SELECT a.id FROM athletes a
            JOIN athletic_directors ad ON a.school_id = ad.school_id
            WHERE ad.profile_id = auth.uid()
        )
    );

CREATE POLICY "academic_records_ad_verify" ON academic_records
    FOR UPDATE USING (
        athlete_id IN (
            SELECT a.id FROM athletes a
            JOIN athletic_directors ad ON a.school_id = ad.school_id
            WHERE ad.profile_id = auth.uid() AND ad.can_verify_grades = true
        )
    );

-- GradeUp scores: Public read (scores are public), athletes can see their own history
CREATE POLICY "gradeup_scores_public_read" ON gradeup_scores
    FOR SELECT USING (true);

-- Sport tiers: Public read (reference data)
CREATE POLICY "sport_tiers_public_read" ON sport_tiers
    FOR SELECT USING (true);

-- Admin policies
CREATE POLICY "major_categories_admin" ON major_categories
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "academic_records_admin" ON academic_records
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "gradeup_scores_admin" ON gradeup_scores
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "sport_tiers_admin" ON sport_tiers
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update cumulative GPA when academic records change
CREATE OR REPLACE FUNCTION update_cumulative_gpa()
RETURNS TRIGGER AS $$
DECLARE
    v_cumulative_gpa DECIMAL;
    v_total_credits INTEGER;
    v_weighted_sum DECIMAL;
BEGIN
    -- Calculate weighted GPA from all verified academic records
    SELECT
        SUM(ar.gpa * ar.credits),
        SUM(ar.credits)
    INTO v_weighted_sum, v_total_credits
    FROM academic_records ar
    WHERE ar.athlete_id = COALESCE(NEW.athlete_id, OLD.athlete_id)
        AND ar.verified = true
        AND ar.credits IS NOT NULL
        AND ar.credits > 0;

    IF v_total_credits > 0 THEN
        v_cumulative_gpa := ROUND(v_weighted_sum / v_total_credits, 2);
    ELSE
        -- Fall back to simple average if no credits recorded
        SELECT ROUND(AVG(ar.gpa), 2) INTO v_cumulative_gpa
        FROM academic_records ar
        WHERE ar.athlete_id = COALESCE(NEW.athlete_id, OLD.athlete_id)
            AND ar.verified = true;
    END IF;

    -- Update athlete's cumulative GPA
    UPDATE athletes
    SET cumulative_gpa = v_cumulative_gpa,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.athlete_id, OLD.athlete_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cumulative_gpa
    AFTER INSERT OR UPDATE OR DELETE ON academic_records
    FOR EACH ROW
    EXECUTE FUNCTION update_cumulative_gpa();

-- Update timestamps
CREATE TRIGGER trigger_major_categories_updated_at
    BEFORE UPDATE ON major_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_academic_records_updated_at
    BEFORE UPDATE ON academic_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- SEED SPORT TIERS (Common NCAA sports)
-- ============================================================================

-- This will be populated based on actual sport IDs after sports table is seeded
-- Example structure for reference:
-- INSERT INTO sport_tiers (sport_id, division, tier, base_multiplier) VALUES
--     ('football-uuid', 'D1', 1, 1.50),
--     ('basketball-mens-uuid', 'D1', 1, 1.50),
--     ('basketball-womens-uuid', 'D1', 2, 1.30),
--     ('baseball-uuid', 'D1', 2, 1.25),
--     ('softball-uuid', 'D1', 2, 1.25),
--     ('soccer-uuid', 'D1', 3, 1.10),
--     ('volleyball-uuid', 'D1', 3, 1.10),
--     ('track-uuid', 'D1', 3, 1.00),
--     ('swimming-uuid', 'D1', 4, 0.90),
--     ('tennis-uuid', 'D1', 4, 0.85),
--     ('golf-uuid', 'D1', 5, 0.80);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE major_categories IS 'Academic major categories for brand-athlete matching based on industry alignment';
COMMENT ON TABLE academic_records IS 'Semester-by-semester academic performance records for GPA tracking and verification';
COMMENT ON TABLE gradeup_scores IS 'Historical GradeUp Score records for trend analysis and audit trail';
COMMENT ON TABLE sport_tiers IS 'Sport tier classifications affecting athletic score weighting';

COMMENT ON FUNCTION calculate_gradeup_score(UUID) IS 'Calculate comprehensive GradeUp Score (0-1000) with athletic, social, and academic components';
COMMENT ON FUNCTION batch_calculate_gradeup_scores(UUID[]) IS 'Batch calculate scores for multiple athletes';
COMMENT ON FUNCTION get_score_breakdown(UUID) IS 'Get detailed breakdown of an athlete''s most recent score calculation';
COMMENT ON FUNCTION get_score_history(UUID, INTEGER) IS 'Get historical score records for an athlete';
COMMENT ON FUNCTION get_athletes_by_score_range(INTEGER, INTEGER, UUID, UUID, DECIMAL, INTEGER) IS 'Find athletes within a score range with optional filters for brand matching';

COMMENT ON COLUMN athletes.gradeup_score IS 'Composite GradeUp Score (0-1000) based on athletic (400), social (300), and academic (300) components';
COMMENT ON COLUMN athletes.cumulative_gpa IS 'Weighted cumulative GPA calculated from verified academic records';
COMMENT ON COLUMN athletes.major_category_id IS 'Reference to major category for industry-based brand matching';
COMMENT ON COLUMN athletes.athletic_rating IS 'Coach/staff rating of athletic ability (0-100) used in score calculation';
