-- =====================================================================================
-- GradeUp NIL - Athletes and Schools Schema
-- Version: 002
-- Description: Schools, sports reference tables and athlete profiles
-- =====================================================================================

-- =====================================================================================
-- ENUM TYPES
-- =====================================================================================

-- School division classifications
CREATE TYPE school_division AS ENUM ('D1', 'D2', 'D3', 'NAIA', 'JUCO', 'other');

-- Sport gender categories
CREATE TYPE sport_gender AS ENUM ('men', 'women', 'coed');

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
  website_url TEXT,
  colors JSONB DEFAULT '{}',  -- Primary and secondary colors
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sports catalog
CREATE TABLE sports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,  -- team, individual
  gender sport_gender,
  icon_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- ATHLETES TABLE
-- =====================================================================================

CREATE TABLE athletes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,

  -- Basic Info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  gender TEXT,

  -- School & Sport
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  sport_id UUID REFERENCES sports(id) ON DELETE SET NULL,
  position TEXT,
  jersey_number TEXT,

  -- Academic Info
  academic_year academic_year,
  gpa NUMERIC(3,2) CHECK (gpa >= 0 AND gpa <= 4.0),
  major TEXT,
  minor TEXT,
  expected_graduation TEXT,

  -- Physical/Bio
  hometown TEXT,
  height TEXT,
  weight TEXT,
  avatar_url TEXT,
  bio TEXT,
  cover_url TEXT,

  -- Social Media
  instagram_handle TEXT,
  twitter_handle TEXT,
  tiktok_handle TEXT,
  youtube_handle TEXT,
  linkedin_url TEXT,
  total_followers INTEGER DEFAULT 0,

  -- Highlight videos (JSONB array of video URLs)
  highlight_urls JSONB DEFAULT '[]',

  -- NIL Metrics
  nil_valuation NUMERIC(12,2) DEFAULT 0,
  engagement_rate NUMERIC(5,2),

  -- Visibility & Search
  is_searchable BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,

  -- Verification Status Flags
  enrollment_verified BOOLEAN DEFAULT FALSE,
  sport_verified BOOLEAN DEFAULT FALSE,
  grades_verified BOOLEAN DEFAULT FALSE,
  identity_verified BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- ATHLETIC DIRECTORS TABLE
-- =====================================================================================

CREATE TABLE athletic_directors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  title TEXT,
  department TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  permissions JSONB DEFAULT '{}',  -- Granular permissions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- INDEXES
-- =====================================================================================

-- School indexes
CREATE INDEX idx_schools_division ON schools(division);
CREATE INDEX idx_schools_state ON schools(state);
CREATE INDEX idx_schools_conference ON schools(conference);

-- Sport indexes
CREATE INDEX idx_sports_category ON sports(category);
CREATE INDEX idx_sports_gender ON sports(gender);
CREATE INDEX idx_sports_active ON sports(is_active) WHERE is_active = TRUE;

-- Athlete indexes
CREATE INDEX idx_athletes_profile_id ON athletes(profile_id);
CREATE INDEX idx_athletes_school_id ON athletes(school_id);
CREATE INDEX idx_athletes_sport_id ON athletes(sport_id);
CREATE INDEX idx_athletes_searchable ON athletes(is_searchable) WHERE is_searchable = TRUE;
CREATE INDEX idx_athletes_featured ON athletes(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_athletes_gpa ON athletes(gpa);
CREATE INDEX idx_athletes_nil_valuation ON athletes(nil_valuation DESC NULLS LAST);
CREATE INDEX idx_athletes_total_followers ON athletes(total_followers DESC NULLS LAST);
CREATE INDEX idx_athletes_academic_year ON athletes(academic_year);

-- Athletic director indexes
CREATE INDEX idx_athletic_directors_profile_id ON athletic_directors(profile_id);
CREATE INDEX idx_athletic_directors_school_id ON athletic_directors(school_id);
CREATE INDEX idx_athletic_directors_verified ON athletic_directors(is_verified) WHERE is_verified = TRUE;

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON schools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_athletes_updated_at
  BEFORE UPDATE ON athletes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_athletic_directors_updated_at
  BEFORE UPDATE ON athletic_directors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- HELPER FUNCTIONS
-- =====================================================================================

-- Function to get athlete's full name
CREATE OR REPLACE FUNCTION get_athlete_name(athlete_id UUID)
RETURNS TEXT AS $$
DECLARE
  full_name TEXT;
BEGIN
  SELECT first_name || ' ' || last_name INTO full_name
  FROM athletes
  WHERE id = athlete_id;

  RETURN full_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if athlete is fully verified
CREATE OR REPLACE FUNCTION is_athlete_verified(athlete_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  athlete_record RECORD;
BEGIN
  SELECT enrollment_verified, sport_verified, grades_verified, identity_verified
  INTO athlete_record
  FROM athletes
  WHERE id = athlete_id;

  RETURN athlete_record.enrollment_verified
     AND athlete_record.sport_verified
     AND athlete_record.grades_verified
     AND athlete_record.identity_verified;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON TABLE schools IS 'Reference table of universities and colleges';
COMMENT ON TABLE sports IS 'Catalog of available sports for athlete profiles';
COMMENT ON TABLE athletes IS 'Athlete profiles with verification status and NIL metrics';
COMMENT ON TABLE athletic_directors IS 'Athletic director profiles linked to schools';
COMMENT ON COLUMN athletes.highlight_urls IS 'JSONB array of highlight video objects with id, platform, url, title';
COMMENT ON COLUMN athletes.nil_valuation IS 'Estimated NIL market value based on metrics';
