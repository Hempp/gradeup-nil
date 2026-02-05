-- GradeUp NIL Platform - Row Level Security Policies
-- Version: 1.0.0
-- Description: Comprehensive RLS policies for multi-tenant security

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletic_directors ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get athlete ID for current user
CREATE OR REPLACE FUNCTION get_athlete_id()
RETURNS UUID AS $$
  SELECT id FROM athletes WHERE profile_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get brand ID for current user
CREATE OR REPLACE FUNCTION get_brand_id()
RETURNS UUID AS $$
  SELECT id FROM brands WHERE profile_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get school ID for athletic director
CREATE OR REPLACE FUNCTION get_ad_school_id()
RETURNS UUID AS $$
  SELECT school_id FROM athletic_directors WHERE profile_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if athletic director can manage athlete
CREATE OR REPLACE FUNCTION ad_can_manage_athlete(athlete_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM athletes a
    JOIN athletic_directors ad ON ad.school_id = a.school_id
    WHERE a.id = athlete_id AND ad.profile_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- SCHOOLS & SPORTS (Public read, admin write)
-- ============================================================================

-- Schools: Public read
CREATE POLICY "schools_public_read" ON schools
  FOR SELECT USING (is_active = true);

-- Schools: Admin write
CREATE POLICY "schools_admin_write" ON schools
  FOR ALL USING (is_admin());

-- Sports: Public read
CREATE POLICY "sports_public_read" ON sports
  FOR SELECT USING (is_active = true);

-- Sports: Admin write
CREATE POLICY "sports_admin_write" ON sports
  FOR ALL USING (is_admin());

-- ============================================================================
-- PROFILES (Own profile + public view for authenticated)
-- ============================================================================

-- Profiles: Users can read own profile
CREATE POLICY "profiles_read_own" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Profiles: Authenticated users can see basic profile info
CREATE POLICY "profiles_read_authenticated" ON profiles
  FOR SELECT USING (
    auth.role() = 'authenticated' AND is_active = true
  );

-- Profiles: Users can update own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Profiles: Admin full access
CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING (is_admin());

-- ============================================================================
-- ATHLETES (Complex visibility rules)
-- ============================================================================

-- Athletes: Public can view searchable, verified athletes
CREATE POLICY "athletes_public_view" ON athletes
  FOR SELECT USING (
    is_searchable = true
    AND enrollment_verified = true
  );

-- Athletes: Own profile full access
CREATE POLICY "athletes_own_full" ON athletes
  FOR ALL USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Athletes: Brands can view all active athletes
CREATE POLICY "athletes_brand_view" ON athletes
  FOR SELECT USING (
    get_user_role() = 'brand'
    AND is_searchable = true
  );

-- Athletes: Athletic directors can view athletes at their school
CREATE POLICY "athletes_ad_view" ON athletes
  FOR SELECT USING (
    get_user_role() = 'athletic_director'
    AND school_id = get_ad_school_id()
  );

-- Athletes: Athletic directors can update verification fields at their school
CREATE POLICY "athletes_ad_verify" ON athletes
  FOR UPDATE USING (
    get_user_role() = 'athletic_director'
    AND school_id = get_ad_school_id()
  )
  WITH CHECK (
    school_id = get_ad_school_id()
  );

-- Athletes: Admin full access
CREATE POLICY "athletes_admin_all" ON athletes
  FOR ALL USING (is_admin());

-- ============================================================================
-- BRANDS (Own profile + public verified brands)
-- ============================================================================

-- Brands: Public can view verified brands
CREATE POLICY "brands_public_view" ON brands
  FOR SELECT USING (is_verified = true);

-- Brands: Own profile full access
CREATE POLICY "brands_own_full" ON brands
  FOR ALL USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Brands: Athletes can view all brands (for opportunities)
CREATE POLICY "brands_athlete_view" ON brands
  FOR SELECT USING (get_user_role() = 'athlete');

-- Brands: Admin full access
CREATE POLICY "brands_admin_all" ON brands
  FOR ALL USING (is_admin());

-- ============================================================================
-- ATHLETIC DIRECTORS (School-scoped access)
-- ============================================================================

-- Athletic Directors: Own profile full access
CREATE POLICY "ad_own_full" ON athletic_directors
  FOR ALL USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Athletic Directors: Athletes can view their school's AD
CREATE POLICY "ad_athletes_view" ON athletic_directors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM athletes
      WHERE profile_id = auth.uid()
      AND school_id = athletic_directors.school_id
    )
  );

-- Athletic Directors: Admin full access
CREATE POLICY "ad_admin_all" ON athletic_directors
  FOR ALL USING (is_admin());

-- ============================================================================
-- VERIFICATION REQUESTS (Athlete + AD access)
-- ============================================================================

-- Verification: Athletes can view and create own requests
CREATE POLICY "verification_athlete_own" ON verification_requests
  FOR ALL USING (athlete_id = get_athlete_id())
  WITH CHECK (athlete_id = get_athlete_id());

-- Verification: Athletic directors can view/update for their school
CREATE POLICY "verification_ad_school" ON verification_requests
  FOR ALL USING (ad_can_manage_athlete(athlete_id));

-- Verification: Admin full access
CREATE POLICY "verification_admin_all" ON verification_requests
  FOR ALL USING (is_admin());

-- ============================================================================
-- OPPORTUNITIES (Brand creates, athletes view eligible)
-- ============================================================================

-- Opportunities: Brands own their opportunities
CREATE POLICY "opportunities_brand_own" ON opportunities
  FOR ALL USING (brand_id = get_brand_id())
  WITH CHECK (brand_id = get_brand_id());

-- Opportunities: Athletes can view active opportunities
CREATE POLICY "opportunities_athlete_view" ON opportunities
  FOR SELECT USING (
    get_user_role() = 'athlete'
    AND status = 'active'
  );

-- Opportunities: Public can view featured opportunities
CREATE POLICY "opportunities_public_featured" ON opportunities
  FOR SELECT USING (
    status = 'active' AND is_featured = true
  );

-- Opportunities: Admin full access
CREATE POLICY "opportunities_admin_all" ON opportunities
  FOR ALL USING (is_admin());

-- ============================================================================
-- DEALS (Athlete + Brand involved parties only)
-- ============================================================================

-- Deals: Athletes can view/manage their own deals
CREATE POLICY "deals_athlete_own" ON deals
  FOR ALL USING (athlete_id = get_athlete_id())
  WITH CHECK (athlete_id = get_athlete_id());

-- Deals: Brands can view/manage their own deals
CREATE POLICY "deals_brand_own" ON deals
  FOR ALL USING (brand_id = get_brand_id())
  WITH CHECK (brand_id = get_brand_id());

-- Deals: Athletic directors can view deals for their school's athletes
CREATE POLICY "deals_ad_view" ON deals
  FOR SELECT USING (ad_can_manage_athlete(athlete_id));

-- Deals: Admin full access
CREATE POLICY "deals_admin_all" ON deals
  FOR ALL USING (is_admin());

-- ============================================================================
-- DEAL MESSAGES (Involved parties only)
-- ============================================================================

-- Deal Messages: Sender can manage own messages
CREATE POLICY "messages_sender_own" ON deal_messages
  FOR ALL USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Deal Messages: Participants can view messages in their deals
CREATE POLICY "messages_deal_participants" ON deal_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deals d
      WHERE d.id = deal_messages.deal_id
      AND (
        d.athlete_id = get_athlete_id()
        OR d.brand_id = get_brand_id()
      )
    )
  );

-- Deal Messages: Admin full access
CREATE POLICY "messages_admin_all" ON deal_messages
  FOR ALL USING (is_admin());

-- ============================================================================
-- NOTIFICATIONS (User's own only)
-- ============================================================================

-- Notifications: Users can only see their own
CREATE POLICY "notifications_own_only" ON notifications
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Notifications: Service role can insert
CREATE POLICY "notifications_service_insert" ON notifications
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- ACTIVITY LOG (User's own + admin view all)
-- ============================================================================

-- Activity Log: Users can view their own activity
CREATE POLICY "activity_own_view" ON activity_log
  FOR SELECT USING (user_id = auth.uid());

-- Activity Log: System can insert
CREATE POLICY "activity_system_insert" ON activity_log
  FOR INSERT WITH CHECK (true);

-- Activity Log: Admin view all
CREATE POLICY "activity_admin_view" ON activity_log
  FOR SELECT USING (is_admin());

-- ============================================================================
-- ANALYTICS (View counts, search tracking)
-- ============================================================================

-- Profile Views: Athletes can see who viewed their profile
CREATE POLICY "views_athlete_own" ON profile_views
  FOR SELECT USING (athlete_id = get_athlete_id());

-- Profile Views: System can insert
CREATE POLICY "views_system_insert" ON profile_views
  FOR INSERT WITH CHECK (true);

-- Profile Views: Admin view all
CREATE POLICY "views_admin_all" ON profile_views
  FOR ALL USING (is_admin());

-- Search Analytics: Users can see their own searches
CREATE POLICY "search_own_view" ON search_analytics
  FOR SELECT USING (user_id = auth.uid());

-- Search Analytics: System can insert
CREATE POLICY "search_system_insert" ON search_analytics
  FOR INSERT WITH CHECK (true);

-- Search Analytics: Admin view all
CREATE POLICY "search_admin_all" ON search_analytics
  FOR ALL USING (is_admin());

-- ============================================================================
-- GRANT PERMISSIONS TO AUTHENTICATED USERS
-- ============================================================================

-- Grant usage on all tables to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_athlete_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_brand_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_ad_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION ad_can_manage_athlete(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_gradeup_score(DECIMAL, INTEGER, INTEGER, DECIMAL, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_user_role IS 'Returns the role of the currently authenticated user';
COMMENT ON FUNCTION is_admin IS 'Checks if the current user has admin role';
COMMENT ON FUNCTION get_athlete_id IS 'Gets the athlete record ID for the current user';
COMMENT ON FUNCTION get_brand_id IS 'Gets the brand record ID for the current user';
COMMENT ON FUNCTION get_ad_school_id IS 'Gets the school ID for an athletic director';
COMMENT ON FUNCTION ad_can_manage_athlete IS 'Checks if an athletic director can manage a specific athlete';
