-- GradeUp NIL Platform - Brand Matching & Academic Calendar
-- Version: 1.0.0
-- Description: Major-to-brand matching and academic calendar integration

-- ============================================================================
-- BRAND INDUSTRY MATCHING
-- ============================================================================

-- Brand industries (for matching with majors)
CREATE TABLE brand_industries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    industry TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Match scores between athletes and brands
CREATE TABLE athlete_brand_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
    major_match BOOLEAN DEFAULT false,
    industry_match BOOLEAN DEFAULT false,
    values_match BOOLEAN DEFAULT false,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(athlete_id, brand_id)
);

-- Major categories with industry mappings
CREATE TABLE major_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    industries TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add major_category_id to athletes table
ALTER TABLE athletes
ADD COLUMN IF NOT EXISTS major_category_id UUID REFERENCES major_categories(id),
ADD COLUMN IF NOT EXISTS cumulative_gpa DECIMAL(3,2) CHECK (cumulative_gpa >= 0 AND cumulative_gpa <= 4.0),
ADD COLUMN IF NOT EXISTS scholar_tier TEXT CHECK (scholar_tier IN ('bronze', 'silver', 'gold', 'platinum')),
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- ============================================================================
-- ACADEMIC CALENDAR INTEGRATION
-- ============================================================================

-- Academic calendars by school
CREATE TABLE academic_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('finals', 'midterms', 'break', 'graduation', 'registration', 'other')),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    no_nil_activity BOOLEAN DEFAULT false,
    academic_year TEXT,
    semester TEXT CHECK (semester IN ('fall', 'spring', 'summer', 'winter')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Athlete availability preferences
CREATE TABLE athlete_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE UNIQUE,
    blocked_periods JSONB DEFAULT '[]',
    study_hours JSONB DEFAULT '{}',
    max_deals_per_month INTEGER DEFAULT 5 CHECK (max_deals_per_month >= 0),
    no_finals_deals BOOLEAN DEFAULT true,
    no_midterms_deals BOOLEAN DEFAULT true,
    preferred_deal_days TEXT[] DEFAULT ARRAY['friday', 'saturday', 'sunday'],
    min_notice_days INTEGER DEFAULT 3,
    max_hours_per_week INTEGER DEFAULT 10,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_brand_industries_brand ON brand_industries(brand_id);
CREATE INDEX idx_brand_industries_industry ON brand_industries(industry);

CREATE INDEX idx_athlete_brand_matches_athlete ON athlete_brand_matches(athlete_id);
CREATE INDEX idx_athlete_brand_matches_brand ON athlete_brand_matches(brand_id);
CREATE INDEX idx_athlete_brand_matches_score ON athlete_brand_matches(match_score DESC);

CREATE INDEX idx_academic_calendars_school ON academic_calendars(school_id);
CREATE INDEX idx_academic_calendars_dates ON academic_calendars(start_date, end_date);
CREATE INDEX idx_academic_calendars_type ON academic_calendars(event_type);

CREATE INDEX idx_athlete_availability_athlete ON athlete_availability(athlete_id);

CREATE INDEX idx_athletes_major_category ON athletes(major_category_id);
CREATE INDEX idx_athletes_scholar_tier ON athletes(scholar_tier);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to calculate brand match score
CREATE OR REPLACE FUNCTION calculate_brand_match(p_athlete_id UUID, p_brand_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 50;
    v_athlete RECORD;
    v_brand RECORD;
    v_brand_industries TEXT[];
    v_major_industries TEXT[];
    v_has_major_match BOOLEAN := false;
BEGIN
    -- Get athlete with major category
    SELECT a.*, mc.name as major_name, mc.industries as major_industries
    INTO v_athlete
    FROM athletes a
    LEFT JOIN major_categories mc ON a.major_category_id = mc.id
    WHERE a.id = p_athlete_id;

    IF v_athlete IS NULL THEN
        RETURN 0;
    END IF;

    -- Get brand
    SELECT * INTO v_brand FROM brands WHERE id = p_brand_id;

    IF v_brand IS NULL THEN
        RETURN 0;
    END IF;

    -- Get brand industries
    SELECT ARRAY_AGG(industry) INTO v_brand_industries
    FROM brand_industries WHERE brand_id = p_brand_id;

    -- Get major industries
    v_major_industries := COALESCE(v_athlete.major_industries, '{}');

    -- Major/Industry match (+30 points)
    IF v_brand_industries IS NOT NULL AND v_major_industries IS NOT NULL THEN
        IF v_brand_industries && v_major_industries THEN
            v_score := v_score + 30;
            v_has_major_match := true;
        END IF;
    END IF;

    -- GPA bonus for high-GPA athletes (+10 points)
    IF COALESCE(v_athlete.cumulative_gpa, v_athlete.gpa) >= 3.5 THEN
        v_score := v_score + 10;
    ELSIF COALESCE(v_athlete.cumulative_gpa, v_athlete.gpa) >= 3.0 THEN
        v_score := v_score + 5;
    END IF;

    -- Verified bonus (+5 points)
    IF COALESCE(v_athlete.verified, false) OR
       (v_athlete.enrollment_verified AND v_athlete.sport_verified) THEN
        v_score := v_score + 5;
    END IF;

    -- Scholar tier bonus
    IF v_athlete.scholar_tier = 'platinum' THEN
        v_score := v_score + 10;
    ELSIF v_athlete.scholar_tier = 'gold' THEN
        v_score := v_score + 7;
    ELSIF v_athlete.scholar_tier = 'silver' THEN
        v_score := v_score + 5;
    ELSIF v_athlete.scholar_tier = 'bronze' THEN
        v_score := v_score + 2;
    END IF;

    -- Social following bonus (up to +5 points)
    IF v_athlete.total_followers >= 100000 THEN
        v_score := v_score + 5;
    ELSIF v_athlete.total_followers >= 50000 THEN
        v_score := v_score + 3;
    ELSIF v_athlete.total_followers >= 10000 THEN
        v_score := v_score + 2;
    END IF;

    -- Cap at 100
    v_score := LEAST(100, v_score);

    -- Upsert match record
    INSERT INTO athlete_brand_matches (athlete_id, brand_id, match_score, major_match, industry_match, calculated_at)
    VALUES (p_athlete_id, p_brand_id, v_score, v_has_major_match, v_has_major_match, NOW())
    ON CONFLICT (athlete_id, brand_id)
    DO UPDATE SET
        match_score = v_score,
        major_match = v_has_major_match,
        industry_match = v_has_major_match,
        calculated_at = NOW(),
        updated_at = NOW();

    RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if athlete is available on a specific date
CREATE OR REPLACE FUNCTION is_athlete_available(p_athlete_id UUID, p_date DATE)
RETURNS BOOLEAN AS $$
DECLARE
    v_athlete RECORD;
    v_availability RECORD;
    v_calendar RECORD;
    v_day_name TEXT;
BEGIN
    -- Get athlete with school
    SELECT a.*, s.id as school_id INTO v_athlete
    FROM athletes a
    JOIN schools s ON a.school_id = s.id
    WHERE a.id = p_athlete_id;

    IF v_athlete IS NULL THEN
        RETURN true; -- Default to available if athlete not found
    END IF;

    -- Get athlete availability preferences
    SELECT * INTO v_availability FROM athlete_availability WHERE athlete_id = p_athlete_id;

    -- Check academic calendar for blocking events
    SELECT * INTO v_calendar FROM academic_calendars
    WHERE school_id = v_athlete.school_id
        AND p_date BETWEEN start_date AND end_date
        AND no_nil_activity = true
    LIMIT 1;

    IF v_calendar IS NOT NULL THEN
        -- Check athlete preferences for this event type
        IF v_calendar.event_type = 'finals' AND COALESCE(v_availability.no_finals_deals, true) THEN
            RETURN false;
        END IF;
        IF v_calendar.event_type = 'midterms' AND COALESCE(v_availability.no_midterms_deals, true) THEN
            RETURN false;
        END IF;
        -- Other blocking events
        IF v_calendar.event_type NOT IN ('finals', 'midterms') THEN
            RETURN false;
        END IF;
    END IF;

    -- Check custom blocked periods
    IF v_availability.blocked_periods IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM jsonb_array_elements(v_availability.blocked_periods) AS bp
            WHERE p_date BETWEEN (bp->>'start_date')::DATE AND (bp->>'end_date')::DATE
        ) THEN
            RETURN false;
        END IF;
    END IF;

    -- Check preferred deal days
    v_day_name := LOWER(TO_CHAR(p_date, 'day'));
    v_day_name := TRIM(v_day_name);

    IF v_availability.preferred_deal_days IS NOT NULL AND
       array_length(v_availability.preferred_deal_days, 1) > 0 THEN
        IF NOT (v_day_name = ANY(v_availability.preferred_deal_days)) THEN
            -- Not a preferred day, but not strictly unavailable
            -- Could add a flag for strict vs. preferred
        END IF;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get blocked periods for an athlete
CREATE OR REPLACE FUNCTION get_athlete_blocked_periods(p_athlete_id UUID, p_start_date DATE DEFAULT CURRENT_DATE, p_end_date DATE DEFAULT NULL)
RETURNS TABLE (
    period_type TEXT,
    name TEXT,
    start_date DATE,
    end_date DATE,
    source TEXT
) AS $$
DECLARE
    v_athlete RECORD;
    v_availability RECORD;
    v_end DATE;
BEGIN
    v_end := COALESCE(p_end_date, CURRENT_DATE + INTERVAL '6 months');

    -- Get athlete
    SELECT a.*, s.id as school_id INTO v_athlete
    FROM athletes a
    JOIN schools s ON a.school_id = s.id
    WHERE a.id = p_athlete_id;

    IF v_athlete IS NULL THEN
        RETURN;
    END IF;

    -- Get availability preferences
    SELECT * INTO v_availability FROM athlete_availability WHERE athlete_id = p_athlete_id;

    -- Return academic calendar events that block NIL activity
    RETURN QUERY
    SELECT
        ac.event_type::TEXT as period_type,
        ac.name::TEXT,
        ac.start_date,
        ac.end_date,
        'academic_calendar'::TEXT as source
    FROM academic_calendars ac
    WHERE ac.school_id = v_athlete.school_id
        AND ac.no_nil_activity = true
        AND ac.start_date <= v_end
        AND ac.end_date >= p_start_date
        AND (
            (ac.event_type = 'finals' AND COALESCE(v_availability.no_finals_deals, true))
            OR (ac.event_type = 'midterms' AND COALESCE(v_availability.no_midterms_deals, true))
            OR ac.event_type NOT IN ('finals', 'midterms')
        );

    -- Return custom blocked periods
    IF v_availability.blocked_periods IS NOT NULL THEN
        RETURN QUERY
        SELECT
            'custom'::TEXT as period_type,
            COALESCE(bp->>'name', 'Blocked Period')::TEXT as name,
            (bp->>'start_date')::DATE as start_date,
            (bp->>'end_date')::DATE as end_date,
            'athlete_preference'::TEXT as source
        FROM jsonb_array_elements(v_availability.blocked_periods) AS bp
        WHERE (bp->>'start_date')::DATE <= v_end
            AND (bp->>'end_date')::DATE >= p_start_date;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to suggest best deal timing for an athlete
CREATE OR REPLACE FUNCTION suggest_deal_timing(p_athlete_id UUID, p_within_days INTEGER DEFAULT 30)
RETURNS TABLE (
    suggested_date DATE,
    day_of_week TEXT,
    is_preferred_day BOOLEAN,
    availability_score INTEGER
) AS $$
DECLARE
    v_athlete RECORD;
    v_availability RECORD;
    v_date DATE;
    v_end_date DATE;
    v_day_name TEXT;
    v_is_preferred BOOLEAN;
    v_score INTEGER;
BEGIN
    v_end_date := CURRENT_DATE + p_within_days;

    -- Get athlete
    SELECT a.*, s.id as school_id INTO v_athlete
    FROM athletes a
    JOIN schools s ON a.school_id = s.id
    WHERE a.id = p_athlete_id;

    IF v_athlete IS NULL THEN
        RETURN;
    END IF;

    -- Get availability preferences
    SELECT * INTO v_availability FROM athlete_availability WHERE athlete_id = p_athlete_id;

    -- Check each day
    v_date := CURRENT_DATE;
    WHILE v_date <= v_end_date LOOP
        -- Check if available
        IF is_athlete_available(p_athlete_id, v_date) THEN
            v_day_name := LOWER(TRIM(TO_CHAR(v_date, 'day')));

            -- Check if preferred day
            v_is_preferred := v_availability.preferred_deal_days IS NULL
                OR array_length(v_availability.preferred_deal_days, 1) = 0
                OR v_day_name = ANY(v_availability.preferred_deal_days);

            -- Calculate availability score
            v_score := 50;
            IF v_is_preferred THEN
                v_score := v_score + 30;
            END IF;
            -- Weekend bonus
            IF v_day_name IN ('saturday', 'sunday') THEN
                v_score := v_score + 10;
            END IF;
            -- Not too soon (give notice)
            IF v_date > CURRENT_DATE + COALESCE(v_availability.min_notice_days, 3) THEN
                v_score := v_score + 10;
            END IF;

            RETURN QUERY SELECT v_date, INITCAP(v_day_name), v_is_preferred, v_score;
        END IF;

        v_date := v_date + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update timestamps
CREATE TRIGGER trigger_athlete_brand_matches_updated_at
    BEFORE UPDATE ON athlete_brand_matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_academic_calendars_updated_at
    BEFORE UPDATE ON academic_calendars
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_athlete_availability_updated_at
    BEFORE UPDATE ON athlete_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Seed major categories with industry mappings
INSERT INTO major_categories (name, description, industries) VALUES
('Business & Finance', 'Business administration, finance, accounting, economics', ARRAY['finance', 'banking', 'insurance', 'consulting', 'real_estate', 'investment']),
('Computer Science & IT', 'Computer science, software engineering, information technology', ARRAY['technology', 'software', 'gaming', 'cybersecurity', 'ai_ml', 'data_science']),
('Engineering', 'All engineering disciplines', ARRAY['technology', 'automotive', 'aerospace', 'manufacturing', 'energy', 'construction']),
('Communications & Media', 'Journalism, communications, public relations, media studies', ARRAY['media', 'entertainment', 'advertising', 'marketing', 'broadcasting', 'social_media']),
('Health & Medicine', 'Pre-med, nursing, health sciences, kinesiology', ARRAY['healthcare', 'pharmaceutical', 'fitness', 'nutrition', 'wellness', 'medical_devices']),
('Education', 'Education, teaching, instructional design', ARRAY['education', 'edtech', 'tutoring', 'youth_development', 'nonprofit']),
('Arts & Design', 'Fine arts, graphic design, fashion, architecture', ARRAY['fashion', 'design', 'entertainment', 'media', 'luxury', 'retail']),
('Sciences', 'Biology, chemistry, physics, environmental science', ARRAY['pharmaceutical', 'biotech', 'research', 'environmental', 'energy', 'agriculture']),
('Social Sciences', 'Psychology, sociology, political science', ARRAY['nonprofit', 'government', 'consulting', 'research', 'hr', 'social_services']),
('Sports & Recreation', 'Sports management, exercise science, athletic training', ARRAY['sports', 'fitness', 'entertainment', 'apparel', 'equipment', 'media']),
('Hospitality & Tourism', 'Hotel management, tourism, culinary arts', ARRAY['hospitality', 'travel', 'food_beverage', 'entertainment', 'luxury', 'retail']),
('Agriculture', 'Agriculture, food science, natural resources', ARRAY['agriculture', 'food_beverage', 'environmental', 'retail', 'manufacturing'])
ON CONFLICT (name) DO NOTHING;

-- Seed some common brand industries
INSERT INTO brand_industries (brand_id, industry, is_primary)
SELECT b.id, 'sports', true
FROM brands b
WHERE b.industry ILIKE '%sport%'
AND NOT EXISTS (SELECT 1 FROM brand_industries bi WHERE bi.brand_id = b.id);

INSERT INTO brand_industries (brand_id, industry, is_primary)
SELECT b.id, 'apparel', false
FROM brands b
WHERE b.industry ILIKE '%apparel%' OR b.industry ILIKE '%cloth%'
AND NOT EXISTS (SELECT 1 FROM brand_industries bi WHERE bi.brand_id = b.id AND bi.industry = 'apparel');

INSERT INTO brand_industries (brand_id, industry, is_primary)
SELECT b.id, 'technology', true
FROM brands b
WHERE b.industry ILIKE '%tech%' OR b.industry ILIKE '%software%'
AND NOT EXISTS (SELECT 1 FROM brand_industries bi WHERE bi.brand_id = b.id AND bi.industry = 'technology');

INSERT INTO brand_industries (brand_id, industry, is_primary)
SELECT b.id, 'food_beverage', true
FROM brands b
WHERE b.industry ILIKE '%food%' OR b.industry ILIKE '%beverage%' OR b.industry ILIKE '%restaurant%'
AND NOT EXISTS (SELECT 1 FROM brand_industries bi WHERE bi.brand_id = b.id AND bi.industry = 'food_beverage');

-- Seed academic calendar data for sample schools
-- Note: This uses subqueries to handle schools that may or may not exist
INSERT INTO academic_calendars (school_id, event_type, name, start_date, end_date, no_nil_activity, academic_year, semester)
SELECT id, 'finals', 'Fall Finals 2026', '2026-12-10', '2026-12-18', true, '2026-2027', 'fall'
FROM schools WHERE name ILIKE '%Duke%' LIMIT 1;

INSERT INTO academic_calendars (school_id, event_type, name, start_date, end_date, no_nil_activity, academic_year, semester)
SELECT id, 'finals', 'Spring Finals 2027', '2027-05-01', '2027-05-10', true, '2026-2027', 'spring'
FROM schools WHERE name ILIKE '%Duke%' LIMIT 1;

INSERT INTO academic_calendars (school_id, event_type, name, start_date, end_date, no_nil_activity, academic_year, semester)
SELECT id, 'midterms', 'Fall Midterms 2026', '2026-10-15', '2026-10-22', true, '2026-2027', 'fall'
FROM schools WHERE name ILIKE '%Duke%' LIMIT 1;

INSERT INTO academic_calendars (school_id, event_type, name, start_date, end_date, no_nil_activity, academic_year, semester)
SELECT id, 'midterms', 'Spring Midterms 2027', '2027-03-10', '2027-03-17', true, '2026-2027', 'spring'
FROM schools WHERE name ILIKE '%Duke%' LIMIT 1;

INSERT INTO academic_calendars (school_id, event_type, name, start_date, end_date, no_nil_activity, academic_year, semester)
SELECT id, 'break', 'Winter Break 2026', '2026-12-19', '2027-01-08', false, '2026-2027', 'winter'
FROM schools WHERE name ILIKE '%Duke%' LIMIT 1;

INSERT INTO academic_calendars (school_id, event_type, name, start_date, end_date, no_nil_activity, academic_year, semester)
SELECT id, 'break', 'Spring Break 2027', '2027-03-18', '2027-03-26', false, '2026-2027', 'spring'
FROM schools WHERE name ILIKE '%Duke%' LIMIT 1;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE brand_industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_brand_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE major_categories ENABLE ROW LEVEL SECURITY;

-- Brand industries: public read
CREATE POLICY "brand_industries_public_read" ON brand_industries
    FOR SELECT USING (true);

CREATE POLICY "brand_industries_brand_manage" ON brand_industries
    FOR ALL USING (
        brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
    );

-- Athlete brand matches: athletes and brands can view their own matches
CREATE POLICY "athlete_brand_matches_athlete_view" ON athlete_brand_matches
    FOR SELECT USING (
        athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
    );

CREATE POLICY "athlete_brand_matches_brand_view" ON athlete_brand_matches
    FOR SELECT USING (
        brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
    );

-- Academic calendars: public read
CREATE POLICY "academic_calendars_public_read" ON academic_calendars
    FOR SELECT USING (true);

-- Athletic directors can manage their school's calendar
CREATE POLICY "academic_calendars_ad_manage" ON academic_calendars
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM athletic_directors WHERE profile_id = auth.uid()
        )
    );

-- Athlete availability: athletes manage their own
CREATE POLICY "athlete_availability_athlete_manage" ON athlete_availability
    FOR ALL USING (
        athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
    );

-- Brands can view athlete availability (for scheduling)
CREATE POLICY "athlete_availability_brand_view" ON athlete_availability
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM brands WHERE profile_id = auth.uid())
    );

-- Major categories: public read
CREATE POLICY "major_categories_public_read" ON major_categories
    FOR SELECT USING (true);

-- Admin policies
CREATE POLICY "brand_industries_admin" ON brand_industries FOR ALL USING (is_admin());
CREATE POLICY "athlete_brand_matches_admin" ON athlete_brand_matches FOR ALL USING (is_admin());
CREATE POLICY "academic_calendars_admin" ON academic_calendars FOR ALL USING (is_admin());
CREATE POLICY "athlete_availability_admin" ON athlete_availability FOR ALL USING (is_admin());
CREATE POLICY "major_categories_admin" ON major_categories FOR ALL USING (is_admin());

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE brand_industries IS 'Industries associated with brands for athlete matching';
COMMENT ON TABLE athlete_brand_matches IS 'Pre-calculated match scores between athletes and brands';
COMMENT ON TABLE major_categories IS 'Academic major categories with industry mappings for matching';
COMMENT ON TABLE academic_calendars IS 'School academic calendars for availability management';
COMMENT ON TABLE athlete_availability IS 'Athlete preferences for NIL deal scheduling';

COMMENT ON FUNCTION calculate_brand_match IS 'Calculates match score (0-100) between an athlete and brand based on major, GPA, verification, and other factors';
COMMENT ON FUNCTION is_athlete_available IS 'Checks if an athlete is available for NIL activity on a specific date';
COMMENT ON FUNCTION get_athlete_blocked_periods IS 'Returns all blocked periods for an athlete within a date range';
COMMENT ON FUNCTION suggest_deal_timing IS 'Suggests optimal dates for scheduling deals with an athlete';
