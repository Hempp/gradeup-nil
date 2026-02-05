-- GradeUp NIL Platform - Scholar Sponsors Program & Gamification System
-- Version: 1.0.0
-- Description: Premium tier for high-GPA athletes and achievement system

-- ============================================================================
-- SCHOLAR SPONSORS PROGRAM
-- ============================================================================

-- Scholar tier levels
CREATE TABLE scholar_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- 'bronze', 'silver', 'gold', 'platinum'
  min_gpa DECIMAL(3,2) NOT NULL,
  min_gradeup_score INTEGER,
  benefits JSONB,
  badge_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scholar sponsor brands (premium brands for high-GPA athletes)
CREATE TABLE scholar_sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  tier_requirement TEXT NOT NULL, -- minimum tier required
  exclusive BOOLEAN DEFAULT false,
  premium_rate_multiplier DECIMAL(3,2) DEFAULT 1.25,
  industries TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Athlete scholar status
CREATE TABLE athlete_scholar_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE UNIQUE,
  tier_id UUID REFERENCES scholar_tiers(id),
  qualified_at TIMESTAMPTZ,
  last_verified TIMESTAMPTZ,
  consecutive_semesters INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- ============================================================================
-- GAMIFICATION: ACHIEVEMENTS
-- ============================================================================

-- Achievements definition
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'academic', 'nil', 'social', 'milestone'
  icon TEXT,
  points INTEGER DEFAULT 10,
  rarity TEXT DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  requirements JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Athlete achievements (earned)
CREATE TABLE athlete_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  UNIQUE(athlete_id, achievement_id)
);

-- ============================================================================
-- ATHLETE XP AND LEVELS
-- ============================================================================

-- Add XP and level columns to athletes table
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS xp_total INTEGER DEFAULT 0;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS scholar_tier TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS cumulative_gpa DECIMAL(3,2);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_scholar_tiers_min_gpa ON scholar_tiers(min_gpa);
CREATE INDEX idx_scholar_sponsors_brand ON scholar_sponsors(brand_id);
CREATE INDEX idx_scholar_sponsors_tier ON scholar_sponsors(tier_requirement);
CREATE INDEX idx_scholar_sponsors_active ON scholar_sponsors(is_active);
CREATE INDEX idx_athlete_scholar_status_athlete ON athlete_scholar_status(athlete_id);
CREATE INDEX idx_athlete_scholar_status_tier ON athlete_scholar_status(tier_id);
CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_rarity ON achievements(rarity);
CREATE INDEX idx_athlete_achievements_athlete ON athlete_achievements(athlete_id);
CREATE INDEX idx_athlete_achievements_achievement ON athlete_achievements(achievement_id);
CREATE INDEX idx_athletes_xp ON athletes(xp_total DESC);
CREATE INDEX idx_athletes_level ON athletes(level);
CREATE INDEX idx_athletes_scholar_tier ON athletes(scholar_tier);

-- ============================================================================
-- SEED DATA: SCHOLAR TIERS
-- ============================================================================

INSERT INTO scholar_tiers (name, min_gpa, min_gradeup_score, benefits, badge_color) VALUES
  ('bronze', 3.0, 400, '{"priority_matching": false, "premium_brands": false, "rate_boost": 1.0}', '#CD7F32'),
  ('silver', 3.25, 500, '{"priority_matching": true, "premium_brands": false, "rate_boost": 1.1}', '#C0C0C0'),
  ('gold', 3.5, 600, '{"priority_matching": true, "premium_brands": true, "rate_boost": 1.25}', '#FFD700'),
  ('platinum', 3.75, 750, '{"priority_matching": true, "premium_brands": true, "rate_boost": 1.5, "guaranteed_minimum": 5000}', '#E5E4E2');

-- ============================================================================
-- SEED DATA: ACHIEVEMENTS
-- ============================================================================

INSERT INTO achievements (code, name, description, category, points, rarity, requirements) VALUES
  -- Academic achievements
  ('deans_list', 'Dean''s List', 'Achieved Dean''s List status', 'academic', 100, 'rare', '{"deans_list": true}'),
  ('gpa_3.5', 'Honor Roll', 'Maintained 3.5+ GPA', 'academic', 50, 'common', '{"min_gpa": 3.5}'),
  ('gpa_4.0', 'Perfect Scholar', 'Achieved 4.0 GPA', 'academic', 200, 'legendary', '{"min_gpa": 4.0}'),
  ('consistent_3.5', 'Consistency King', '4 consecutive semesters with 3.5+ GPA', 'academic', 150, 'epic', '{"consecutive_semesters": 4, "min_gpa": 3.5}'),

  -- NIL achievements
  ('first_deal', 'First Deal', 'Completed your first NIL deal', 'nil', 25, 'common', '{"deals_completed": 1}'),
  ('deal_streak_5', 'Deal Maker', 'Completed 5 NIL deals', 'nil', 75, 'rare', '{"deals_completed": 5}'),
  ('deal_streak_10', 'NIL Pro', 'Completed 10 NIL deals', 'nil', 125, 'epic', '{"deals_completed": 10}'),
  ('earned_1k', 'Thousand Club', 'Earned $1,000 in NIL deals', 'nil', 50, 'common', '{"total_earned": 1000}'),
  ('earned_10k', 'Five Figure Earner', 'Earned $10,000 in NIL deals', 'nil', 150, 'epic', '{"total_earned": 10000}'),
  ('earned_50k', 'Major Player', 'Earned $50,000 in NIL deals', 'nil', 250, 'legendary', '{"total_earned": 50000}'),
  ('premium_brand', 'Premium Partner', 'Partnered with a Fortune 500 brand', 'nil', 100, 'rare', '{"premium_brand": true}'),
  ('repeat_brand', 'Brand Loyal', 'Completed 3+ deals with the same brand', 'nil', 75, 'rare', '{"repeat_deals": 3}'),

  -- Social achievements
  ('social_10k', 'Rising Star', 'Reached 10K total followers', 'social', 50, 'common', '{"followers": 10000}'),
  ('social_50k', 'Growing Influence', 'Reached 50K total followers', 'social', 100, 'rare', '{"followers": 50000}'),
  ('social_100k', 'Influencer', 'Reached 100K total followers', 'social', 150, 'epic', '{"followers": 100000}'),
  ('social_1m', 'Superstar', 'Reached 1M total followers', 'social', 300, 'legendary', '{"followers": 1000000}'),

  -- Milestone achievements
  ('verified', 'Verified Athlete', 'Completed full verification', 'milestone', 50, 'common', '{"verified": true}'),
  ('profile_complete', 'Profile Pro', '100% profile completion', 'milestone', 25, 'common', '{"profile_complete": true}'),
  ('first_month', 'Getting Started', 'Active on platform for 1 month', 'milestone', 10, 'common', '{"days_active": 30}'),
  ('six_months', 'Veteran', 'Active on platform for 6 months', 'milestone', 50, 'rare', '{"days_active": 180}'),
  ('one_year', 'Platform Legend', 'Active on platform for 1 year', 'milestone', 100, 'epic', '{"days_active": 365}'),

  -- Scholar achievements
  ('scholar_bronze', 'Bronze Scholar', 'Achieved Bronze Scholar tier', 'academic', 75, 'common', '{"tier": "bronze"}'),
  ('scholar_silver', 'Silver Scholar', 'Achieved Silver Scholar tier', 'academic', 100, 'rare', '{"tier": "silver"}'),
  ('scholar_gold', 'Gold Scholar', 'Achieved Gold Scholar tier', 'academic', 150, 'epic', '{"tier": "gold"}'),
  ('scholar_platinum', 'Platinum Scholar', 'Achieved Platinum Scholar tier', 'academic', 250, 'legendary', '{"tier": "platinum"}');

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to calculate athlete level from XP
CREATE OR REPLACE FUNCTION calculate_level(p_xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Level formula: Each level requires (level * 100) XP
  -- Level 1: 0-99, Level 2: 100-299, Level 3: 300-599, etc.
  RETURN GREATEST(1, FLOOR((-1 + SQRT(1 + 8 * p_xp / 100.0)) / 2) + 1)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get XP required for next level
CREATE OR REPLACE FUNCTION xp_for_next_level(p_current_level INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Sum of arithmetic series: n * (n + 1) / 2 * 100
  RETURN (p_current_level * (p_current_level + 1) / 2 * 100)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to determine scholar tier based on GPA and GradeUp score
CREATE OR REPLACE FUNCTION determine_scholar_tier(p_gpa DECIMAL, p_gradeup_score DECIMAL)
RETURNS TEXT AS $$
DECLARE
  v_tier RECORD;
  v_result TEXT := NULL;
BEGIN
  FOR v_tier IN
    SELECT name, min_gpa, min_gradeup_score
    FROM scholar_tiers
    ORDER BY min_gpa DESC
  LOOP
    IF p_gpa >= v_tier.min_gpa AND
       (v_tier.min_gradeup_score IS NULL OR p_gradeup_score >= v_tier.min_gradeup_score) THEN
      v_result := v_tier.name;
      EXIT;
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_athlete_achievements(p_athlete_id UUID)
RETURNS SETOF achievements AS $$
DECLARE
  v_athlete RECORD;
  v_achievement RECORD;
  v_earned BOOLEAN;
  v_deals_count INTEGER;
  v_total_earned DECIMAL;
BEGIN
  -- Get athlete data
  SELECT * INTO v_athlete FROM athletes WHERE id = p_athlete_id;

  IF v_athlete IS NULL THEN
    RETURN;
  END IF;

  -- Get deal statistics
  SELECT
    COUNT(*) FILTER (WHERE status = 'completed'),
    COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0)
  INTO v_deals_count, v_total_earned
  FROM deals
  WHERE athlete_id = p_athlete_id;

  FOR v_achievement IN SELECT * FROM achievements LOOP
    v_earned := false;

    -- Check if already earned
    IF EXISTS (
      SELECT 1 FROM athlete_achievements
      WHERE athlete_id = p_athlete_id AND achievement_id = v_achievement.id
    ) THEN
      CONTINUE;
    END IF;

    -- Check requirements based on achievement code
    CASE v_achievement.code
      -- GPA achievements
      WHEN 'gpa_3.5' THEN
        v_earned := COALESCE(v_athlete.cumulative_gpa, v_athlete.gpa) >= 3.5;
      WHEN 'gpa_4.0' THEN
        v_earned := COALESCE(v_athlete.cumulative_gpa, v_athlete.gpa) >= 4.0;

      -- Verification achievements
      WHEN 'verified' THEN
        v_earned := v_athlete.enrollment_verified = true
          AND v_athlete.sport_verified = true
          AND v_athlete.grades_verified = true;

      -- Deal achievements
      WHEN 'first_deal' THEN
        v_earned := v_deals_count >= 1;
      WHEN 'deal_streak_5' THEN
        v_earned := v_deals_count >= 5;
      WHEN 'deal_streak_10' THEN
        v_earned := v_deals_count >= 10;

      -- Earnings achievements
      WHEN 'earned_1k' THEN
        v_earned := v_total_earned >= 1000;
      WHEN 'earned_10k' THEN
        v_earned := v_total_earned >= 10000;
      WHEN 'earned_50k' THEN
        v_earned := v_total_earned >= 50000;

      -- Social achievements
      WHEN 'social_10k' THEN
        v_earned := v_athlete.total_followers >= 10000;
      WHEN 'social_50k' THEN
        v_earned := v_athlete.total_followers >= 50000;
      WHEN 'social_100k' THEN
        v_earned := v_athlete.total_followers >= 100000;
      WHEN 'social_1m' THEN
        v_earned := v_athlete.total_followers >= 1000000;

      -- Scholar tier achievements
      WHEN 'scholar_bronze' THEN
        v_earned := v_athlete.scholar_tier = 'bronze';
      WHEN 'scholar_silver' THEN
        v_earned := v_athlete.scholar_tier = 'silver';
      WHEN 'scholar_gold' THEN
        v_earned := v_athlete.scholar_tier = 'gold';
      WHEN 'scholar_platinum' THEN
        v_earned := v_athlete.scholar_tier = 'platinum';

      ELSE
        v_earned := false;
    END CASE;

    IF v_earned THEN
      -- Award achievement
      INSERT INTO athlete_achievements (athlete_id, achievement_id)
      VALUES (p_athlete_id, v_achievement.id);

      -- Add XP to athlete
      UPDATE athletes
      SET
        xp_total = xp_total + v_achievement.points,
        level = calculate_level(xp_total + v_achievement.points)
      WHERE id = p_athlete_id;

      RETURN NEXT v_achievement;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update athlete scholar tier
CREATE OR REPLACE FUNCTION update_athlete_scholar_tier()
RETURNS TRIGGER AS $$
DECLARE
  v_new_tier TEXT;
  v_tier_id UUID;
BEGIN
  -- Calculate new tier based on GPA and GradeUp score
  v_new_tier := determine_scholar_tier(
    COALESCE(NEW.cumulative_gpa, NEW.gpa),
    NEW.gradeup_score
  );

  -- Update scholar_tier column
  NEW.scholar_tier := v_new_tier;

  -- Update or create scholar status record
  IF v_new_tier IS NOT NULL THEN
    SELECT id INTO v_tier_id FROM scholar_tiers WHERE name = v_new_tier;

    INSERT INTO athlete_scholar_status (athlete_id, tier_id, qualified_at, last_verified, is_active)
    VALUES (NEW.id, v_tier_id, NOW(), NOW(), true)
    ON CONFLICT (athlete_id)
    DO UPDATE SET
      tier_id = v_tier_id,
      last_verified = NOW(),
      is_active = true;
  ELSE
    -- Remove scholar status if no longer qualified
    UPDATE athlete_scholar_status
    SET is_active = false
    WHERE athlete_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update scholar tier when GPA or score changes
CREATE TRIGGER trigger_update_scholar_tier
    BEFORE INSERT OR UPDATE OF gpa, cumulative_gpa, gradeup_score ON athletes
    FOR EACH ROW
    EXECUTE FUNCTION update_athlete_scholar_tier();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE scholar_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholar_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_scholar_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_achievements ENABLE ROW LEVEL SECURITY;

-- Scholar tiers: Anyone can view
CREATE POLICY "Anyone can view scholar tiers" ON scholar_tiers
  FOR SELECT USING (true);

-- Scholar sponsors: Anyone can view active sponsors
CREATE POLICY "Anyone can view active scholar sponsors" ON scholar_sponsors
  FOR SELECT USING (is_active = true);

-- Achievements: Anyone can view
CREATE POLICY "Anyone can view achievements" ON achievements
  FOR SELECT USING (true);

-- Athlete achievements: Athletes can view their own
CREATE POLICY "Athletes can view own achievements" ON athlete_achievements
  FOR SELECT USING (
    athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
  );

-- Athlete achievements: Public view for verified athletes
CREATE POLICY "Public can view achievements of verified athletes" ON athlete_achievements
  FOR SELECT USING (
    athlete_id IN (
      SELECT id FROM athletes
      WHERE is_searchable = true
      AND enrollment_verified = true
    )
  );

-- Athlete scholar status: Athletes can view their own
CREATE POLICY "Athletes can view own scholar status" ON athlete_scholar_status
  FOR SELECT USING (
    athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
  );

-- Athlete scholar status: Public view for active scholars
CREATE POLICY "Public can view active scholar status" ON athlete_scholar_status
  FOR SELECT USING (
    is_active = true AND
    athlete_id IN (
      SELECT id FROM athletes
      WHERE is_searchable = true
    )
  );

-- Admin policies
CREATE POLICY "Admins have full access to scholar_tiers" ON scholar_tiers
  FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access to scholar_sponsors" ON scholar_sponsors
  FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access to achievements" ON achievements
  FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access to athlete_achievements" ON athlete_achievements
  FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access to athlete_scholar_status" ON athlete_scholar_status
  FOR ALL USING (is_admin());

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Leaderboard view for XP rankings
CREATE OR REPLACE VIEW xp_leaderboard AS
SELECT
  a.id AS athlete_id,
  p.first_name,
  p.last_name,
  p.avatar_url,
  s.name AS school_name,
  sp.name AS sport_name,
  a.xp_total,
  a.level,
  a.scholar_tier,
  COALESCE(a.cumulative_gpa, a.gpa) AS gpa,
  a.gradeup_score,
  (SELECT COUNT(*) FROM athlete_achievements WHERE athlete_id = a.id) AS achievement_count,
  ROW_NUMBER() OVER (ORDER BY a.xp_total DESC) AS rank
FROM athletes a
JOIN profiles p ON a.profile_id = p.id
LEFT JOIN schools s ON a.school_id = s.id
LEFT JOIN sports sp ON a.sport_id = sp.id
WHERE a.is_searchable = true
ORDER BY a.xp_total DESC;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE scholar_tiers IS 'Scholar program tier definitions with GPA requirements and benefits';
COMMENT ON TABLE scholar_sponsors IS 'Premium brands available to scholar athletes based on tier';
COMMENT ON TABLE athlete_scholar_status IS 'Tracking athlete qualification for scholar program';
COMMENT ON TABLE achievements IS 'Gamification achievement definitions';
COMMENT ON TABLE athlete_achievements IS 'Achievements earned by athletes';
COMMENT ON FUNCTION calculate_level IS 'Calculate athlete level from total XP';
COMMENT ON FUNCTION check_athlete_achievements IS 'Check and award new achievements to an athlete';
COMMENT ON FUNCTION determine_scholar_tier IS 'Determine scholar tier based on GPA and GradeUp score';
