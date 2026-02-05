-- GradeUp NIL Platform - Seed Data
-- Version: 1.0.0
-- Description: Test data for development environment

-- ============================================================================
-- SCHOOLS (Top D1 Programs)
-- ============================================================================

INSERT INTO schools (id, name, short_name, city, state, division, conference, primary_color, secondary_color, website_url) VALUES
  ('11111111-1111-1111-1111-111111111111', 'University of Alabama', 'Alabama', 'Tuscaloosa', 'AL', 'D1', 'SEC', '#9E1B32', '#FFFFFF', 'https://rolltide.com'),
  ('22222222-2222-2222-2222-222222222222', 'Ohio State University', 'Ohio State', 'Columbus', 'OH', 'D1', 'Big Ten', '#BB0000', '#666666', 'https://ohiostatebuckeyes.com'),
  ('33333333-3333-3333-3333-333333333333', 'University of Texas', 'Texas', 'Austin', 'TX', 'D1', 'SEC', '#BF5700', '#FFFFFF', 'https://texassports.com'),
  ('44444444-4444-4444-4444-444444444444', 'University of Michigan', 'Michigan', 'Ann Arbor', 'MI', 'D1', 'Big Ten', '#00274C', '#FFCB05', 'https://mgoblue.com'),
  ('55555555-5555-5555-5555-555555555555', 'University of Georgia', 'Georgia', 'Athens', 'GA', 'D1', 'SEC', '#BA0C2F', '#000000', 'https://georgiadogs.com'),
  ('66666666-6666-6666-6666-666666666666', 'USC', 'USC', 'Los Angeles', 'CA', 'D1', 'Big Ten', '#990000', '#FFC72C', 'https://usctrojans.com'),
  ('77777777-7777-7777-7777-777777777777', 'University of Oregon', 'Oregon', 'Eugene', 'OR', 'D1', 'Big Ten', '#154733', '#FEE123', 'https://goducks.com'),
  ('88888888-8888-8888-8888-888888888888', 'Clemson University', 'Clemson', 'Clemson', 'SC', 'D1', 'ACC', '#F56600', '#522D80', 'https://clemsontigers.com');

-- ============================================================================
-- SPORTS
-- ============================================================================

INSERT INTO sports (id, name, category, gender, icon_name) VALUES
  ('aaaa1111-1111-1111-1111-111111111111', 'Football', 'team', 'mens', 'football'),
  ('aaaa2222-2222-2222-2222-222222222222', 'Men''s Basketball', 'team', 'mens', 'basketball'),
  ('aaaa3333-3333-3333-3333-333333333333', 'Women''s Basketball', 'team', 'womens', 'basketball'),
  ('aaaa4444-4444-4444-4444-444444444444', 'Baseball', 'team', 'mens', 'baseball'),
  ('aaaa5555-5555-5555-5555-555555555555', 'Softball', 'team', 'womens', 'softball'),
  ('aaaa6666-6666-6666-6666-666666666666', 'Women''s Volleyball', 'team', 'womens', 'volleyball'),
  ('aaaa7777-7777-7777-7777-777777777777', 'Women''s Soccer', 'team', 'womens', 'soccer'),
  ('aaaa8888-8888-8888-8888-888888888888', 'Men''s Soccer', 'team', 'mens', 'soccer'),
  ('aaaa9999-9999-9999-9999-999999999999', 'Swimming & Diving', 'individual', 'coed', 'swimming'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Track & Field', 'individual', 'coed', 'track'),
  ('bbbb1111-1111-1111-1111-111111111111', 'Gymnastics', 'individual', 'womens', 'gymnastics'),
  ('bbbb2222-2222-2222-2222-222222222222', 'Wrestling', 'individual', 'mens', 'wrestling');

-- ============================================================================
-- TEST USERS (Profiles)
-- Note: In production, these would be created via Supabase Auth
-- For testing, we use predictable UUIDs
-- ============================================================================

-- Athletes
INSERT INTO profiles (id, email, role, first_name, last_name, phone, is_verified) VALUES
  ('a0000001-0001-0001-0001-000000000001', 'marcus.johnson@test.com', 'athlete', 'Marcus', 'Johnson', '555-0101', true),
  ('a0000002-0002-0002-0002-000000000002', 'sarah.williams@test.com', 'athlete', 'Sarah', 'Williams', '555-0102', true),
  ('a0000003-0003-0003-0003-000000000003', 'jaylen.carter@test.com', 'athlete', 'Jaylen', 'Carter', '555-0103', true),
  ('a0000004-0004-0004-0004-000000000004', 'emma.rodriguez@test.com', 'athlete', 'Emma', 'Rodriguez', '555-0104', true),
  ('a0000005-0005-0005-0005-000000000005', 'tyler.brown@test.com', 'athlete', 'Tyler', 'Brown', '555-0105', true),
  ('a0000006-0006-0006-0006-000000000006', 'olivia.chen@test.com', 'athlete', 'Olivia', 'Chen', '555-0106', true);

-- Brands
INSERT INTO profiles (id, email, role, first_name, last_name, phone, is_verified) VALUES
  ('b0000001-0001-0001-0001-000000000001', 'john@nikenil.com', 'brand', 'John', 'Smith', '555-0201', true),
  ('b0000002-0002-0002-0002-000000000002', 'lisa@gatorade.com', 'brand', 'Lisa', 'Martinez', '555-0202', true),
  ('b0000003-0003-0003-0003-000000000003', 'mike@localdealer.com', 'brand', 'Mike', 'Thompson', '555-0203', true);

-- Athletic Directors
INSERT INTO profiles (id, email, role, first_name, last_name, phone, is_verified) VALUES
  ('d0000001-0001-0001-0001-000000000001', 'ad@alabama.edu', 'athletic_director', 'Greg', 'Byrne', '555-0301', true),
  ('d0000002-0002-0002-0002-000000000002', 'ad@osu.edu', 'athletic_director', 'Gene', 'Smith', '555-0302', true);

-- Admin
INSERT INTO profiles (id, email, role, first_name, last_name, is_verified) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@gradeup.com', 'admin', 'System', 'Admin', true);

-- ============================================================================
-- ATHLETES
-- ============================================================================

INSERT INTO athletes (
  id, profile_id, school_id, sport_id,
  major, gpa, academic_year, expected_graduation,
  position, jersey_number, height_inches, weight_lbs, hometown,
  instagram_handle, instagram_followers, twitter_handle, twitter_followers, tiktok_handle, tiktok_followers,
  nil_valuation, total_earnings, deals_completed, avg_deal_rating,
  enrollment_verified, enrollment_verified_at, sport_verified, sport_verified_at, grades_verified, grades_verified_at,
  is_searchable, accepting_deals, min_deal_amount, featured
) VALUES
  -- Marcus Johnson - Alabama Football QB
  (
    'ath00001-0001-0001-0001-000000000001',
    'a0000001-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'aaaa1111-1111-1111-1111-111111111111',
    'Business Administration', 3.75, 'junior', '2026-05-15',
    'Quarterback', '7', 75, 215, 'Atlanta, GA',
    'marcus_qb7', 125000, 'marcusjohnson7', 45000, 'marcusj7', 85000,
    450000.00, 125000.00, 8, 4.8,
    true, NOW(), true, NOW(), true, NOW(),
    true, true, 2500.00, true
  ),
  -- Sarah Williams - Ohio State Women's Basketball
  (
    'ath00002-0002-0002-0002-000000000002',
    'a0000002-0002-0002-0002-000000000002',
    '22222222-2222-2222-2222-222222222222',
    'aaaa3333-3333-3333-3333-333333333333',
    'Mechanical Engineering', 3.92, 'senior', '2025-05-15',
    'Point Guard', '23', 68, 145, 'Chicago, IL',
    'sarahwhoops', 89000, 'sarah_hoops23', 32000, 'sarahw23', 156000,
    320000.00, 85000.00, 12, 4.9,
    true, NOW(), true, NOW(), true, NOW(),
    true, true, 1500.00, true
  ),
  -- Jaylen Carter - Texas Football WR
  (
    'ath00003-0003-0003-0003-000000000003',
    'a0000003-0003-0003-0003-000000000003',
    '33333333-3333-3333-3333-333333333333',
    'aaaa1111-1111-1111-1111-111111111111',
    'Communications', 3.45, 'sophomore', '2027-05-15',
    'Wide Receiver', '11', 73, 195, 'Dallas, TX',
    'jcarter11', 67000, 'jaylen_carter', 28000, 'jaylenc11', 92000,
    180000.00, 42000.00, 5, 4.6,
    true, NOW(), true, NOW(), true, NOW(),
    true, true, 1000.00, false
  ),
  -- Emma Rodriguez - Georgia Gymnastics
  (
    'ath00004-0004-0004-0004-000000000004',
    'a0000004-0004-0004-0004-000000000004',
    '55555555-5555-5555-5555-555555555555',
    'bbbb1111-1111-1111-1111-111111111111',
    'Psychology', 3.88, 'junior', '2026-05-15',
    'All-Around', '12', 62, 115, 'Miami, FL',
    'emmaflips', 245000, 'emma_gym', 78000, 'emmarod12', 420000,
    580000.00, 195000.00, 18, 4.95,
    true, NOW(), true, NOW(), true, NOW(),
    true, true, 3000.00, true
  ),
  -- Tyler Brown - Michigan Baseball
  (
    'ath00005-0005-0005-0005-000000000005',
    'a0000005-0005-0005-0005-000000000005',
    '44444444-4444-4444-4444-444444444444',
    'aaaa4444-4444-4444-4444-444444444444',
    'Finance', 3.62, 'senior', '2025-05-15',
    'Pitcher', '22', 76, 210, 'Detroit, MI',
    'tbrown22', 34000, 'tyler_pitches', 15000, NULL, 0,
    95000.00, 28000.00, 4, 4.5,
    true, NOW(), true, NOW(), true, NOW(),
    true, true, 750.00, false
  ),
  -- Olivia Chen - USC Swimming
  (
    'ath00006-0006-0006-0006-000000000006',
    'a0000006-0006-0006-0006-000000000006',
    '66666666-6666-6666-6666-666666666666',
    'aaaa9999-9999-9999-9999-999999999999',
    'Computer Science', 3.97, 'sophomore', '2027-05-15',
    'Freestyle/IM', NULL, 67, 140, 'San Francisco, CA',
    'oliviaswims', 52000, 'ochen_swim', 18000, 'oliviac', 78000,
    140000.00, 35000.00, 6, 4.7,
    true, NOW(), true, NOW(), true, NOW(),
    true, true, 1000.00, true
  );

-- ============================================================================
-- BRANDS
-- ============================================================================

INSERT INTO brands (
  id, profile_id,
  company_name, company_type, industry, website_url,
  contact_name, contact_title, contact_email, contact_phone,
  city, state, country,
  total_spent, deals_completed, avg_deal_rating,
  budget_range_min, budget_range_max,
  is_verified, verified_at
) VALUES
  -- Nike NIL Program
  (
    'brand001-0001-0001-0001-000000000001',
    'b0000001-0001-0001-0001-000000000001',
    'Nike NIL', 'corporation', 'Sports Apparel', 'https://nike.com/nil',
    'John Smith', 'NIL Program Director', 'john@nikenil.com', '555-0201',
    'Beaverton', 'OR', 'USA',
    2500000.00, 156, 4.9,
    5000.00, 500000.00,
    true, NOW()
  ),
  -- Gatorade
  (
    'brand002-0002-0002-0002-000000000002',
    'b0000002-0002-0002-0002-000000000002',
    'Gatorade', 'corporation', 'Sports Nutrition', 'https://gatorade.com',
    'Lisa Martinez', 'Athlete Relations Manager', 'lisa@gatorade.com', '555-0202',
    'Chicago', 'IL', 'USA',
    1800000.00, 89, 4.85,
    2500.00, 250000.00,
    true, NOW()
  ),
  -- Local Auto Dealer
  (
    'brand003-0003-0003-0003-000000000003',
    'b0000003-0003-0003-0003-000000000003',
    'Thompson Auto Group', 'local_business', 'Automotive', 'https://thompsonmotors.com',
    'Mike Thompson', 'Owner', 'mike@localdealer.com', '555-0203',
    'Tuscaloosa', 'AL', 'USA',
    45000.00, 12, 4.6,
    500.00, 10000.00,
    true, NOW()
  );

-- ============================================================================
-- ATHLETIC DIRECTORS
-- ============================================================================

INSERT INTO athletic_directors (
  id, profile_id, school_id,
  title, department, office_phone,
  can_verify_enrollment, can_verify_sport, can_verify_grades, can_manage_athletes,
  is_primary_contact
) VALUES
  (
    'ad000001-0001-0001-0001-000000000001',
    'd0000001-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'Athletic Director', 'Athletics Department', '205-555-0001',
    true, true, true, true, true
  ),
  (
    'ad000002-0002-0002-0002-000000000002',
    'd0000002-0002-0002-0002-000000000002',
    '22222222-2222-2222-2222-222222222222',
    'Athletic Director', 'Athletics Department', '614-555-0001',
    true, true, true, true, true
  );

-- ============================================================================
-- OPPORTUNITIES
-- ============================================================================

INSERT INTO opportunities (
  id, brand_id,
  title, description, deal_type,
  compensation_amount, compensation_type, compensation_details,
  min_gpa, min_followers, min_gradeup_score,
  start_date, end_date, application_deadline,
  max_athletes, athletes_selected,
  status, is_featured
) VALUES
  -- Nike NIL Opportunity
  (
    'opp00001-0001-0001-0001-000000000001',
    'brand001-0001-0001-0001-000000000001',
    'Nike Campus Ambassador Program',
    'Join the Nike NIL Campus Ambassador program. Represent Nike on your campus through social media and events. Must maintain 3.0+ GPA.',
    'endorsement',
    15000.00, 'fixed', 'Annual stipend plus product allowance',
    3.0, 10000, 60.0,
    '2025-01-01', '2025-12-31', '2025-02-28',
    50, 12,
    'active', true
  ),
  -- Gatorade Social Campaign
  (
    'opp00002-0002-0002-0002-000000000002',
    'brand002-0002-0002-0002-000000000002',
    'Gatorade Fuel Tomorrow Campaign',
    'Create content showcasing your training routine and how Gatorade fuels your performance. 3 Instagram posts + 2 TikTok videos.',
    'social_post',
    5000.00, 'per_post', '5 posts total, $1000 per post',
    2.5, 25000, 50.0,
    '2025-02-01', '2025-04-30', '2025-01-31',
    20, 8,
    'active', true
  ),
  -- Local Dealer
  (
    'opp00003-0003-0003-0003-000000000003',
    'brand003-0003-0003-0003-000000000003',
    'Thompson Auto Group Athlete Partnership',
    'Partner with local auto dealership for in-store appearances and social media promotion. Vehicle loan included during partnership.',
    'appearance',
    2500.00, 'fixed', 'Monthly stipend plus vehicle use',
    3.0, 5000, 40.0,
    '2025-01-15', '2025-06-15', '2025-01-10',
    3, 1,
    'active', false
  );

-- ============================================================================
-- DEALS
-- ============================================================================

INSERT INTO deals (
  id, opportunity_id, athlete_id, brand_id,
  title, description, deal_type, status,
  amount, payment_terms,
  start_date, end_date,
  compliance_approved, compliance_approved_at
) VALUES
  -- Marcus Johnson - Nike Deal
  (
    'deal0001-0001-0001-0001-000000000001',
    'opp00001-0001-0001-0001-000000000001',
    'ath00001-0001-0001-0001-000000000001',
    'brand001-0001-0001-0001-000000000001',
    'Nike Campus Ambassador - Alabama',
    'Campus ambassador role at University of Alabama',
    'endorsement', 'active',
    15000.00, 'Monthly payments of $1,250',
    '2025-01-01', '2025-12-31',
    true, NOW()
  ),
  -- Emma Rodriguez - Gatorade Deal
  (
    'deal0002-0002-0002-0002-000000000002',
    'opp00002-0002-0002-0002-000000000002',
    'ath00004-0004-0004-0004-000000000004',
    'brand002-0002-0002-0002-000000000002',
    'Gatorade Social Campaign',
    'Social media content creation campaign',
    'social_post', 'active',
    5000.00, 'Payment upon content approval',
    '2025-02-01', '2025-04-30',
    true, NOW()
  ),
  -- Marcus Johnson - Thompson Auto
  (
    'deal0003-0003-0003-0003-000000000003',
    'opp00003-0003-0003-0003-000000000003',
    'ath00001-0001-0001-0001-000000000001',
    'brand003-0003-0003-0003-000000000003',
    'Thompson Auto Partnership',
    'Local dealership partnership with vehicle use',
    'appearance', 'active',
    2500.00, 'Monthly payments',
    '2025-01-15', '2025-06-15',
    true, NOW()
  );

-- ============================================================================
-- NOTIFICATIONS (Sample)
-- ============================================================================

INSERT INTO notifications (user_id, type, title, body, related_type, related_id) VALUES
  ('a0000001-0001-0001-0001-000000000001', 'deal_offer', 'New Deal Opportunity!', 'Nike has sent you a partnership offer.', 'deal', 'deal0001-0001-0001-0001-000000000001'),
  ('a0000004-0004-0004-0004-000000000004', 'deal_offer', 'New Deal Opportunity!', 'Gatorade wants to partner with you!', 'deal', 'deal0002-0002-0002-0002-000000000002'),
  ('b0000001-0001-0001-0001-000000000001', 'system', 'Welcome to GradeUp NIL', 'Your brand account has been verified. Start browsing athletes!', NULL, NULL);

-- ============================================================================
-- PROFILE VIEWS (Sample Analytics)
-- ============================================================================

INSERT INTO profile_views (athlete_id, viewer_id, viewer_type, source) VALUES
  ('ath00001-0001-0001-0001-000000000001', 'b0000001-0001-0001-0001-000000000001', 'brand', 'search'),
  ('ath00001-0001-0001-0001-000000000001', 'b0000002-0002-0002-0002-000000000002', 'brand', 'featured'),
  ('ath00004-0004-0004-0004-000000000004', 'b0000002-0002-0002-0002-000000000002', 'brand', 'search'),
  ('ath00002-0002-0002-0002-000000000002', 'b0000001-0001-0001-0001-000000000001', 'brand', 'search'),
  ('ath00006-0006-0006-0006-000000000006', 'b0000002-0002-0002-0002-000000000002', 'brand', 'featured');

-- ============================================================================
-- REFRESH GRADEUP SCORES (Trigger should handle this, but explicit update)
-- ============================================================================

UPDATE athletes SET updated_at = NOW();
