-- =====================================================================================
-- GradeUp NIL - Seed Data Migration
-- Version: 002
-- Description: Sample data for testing and development
-- Note: Run AFTER 001_initial_schema.sql
-- =====================================================================================

-- =====================================================================================
-- TEST USERS
-- Important: In a real setup, these profile IDs must match auth.users entries.
-- For local development, you can:
-- 1. Create users via the Supabase Auth API with these specific IDs
-- 2. Or sign up users through the app and update these IDs accordingly
-- =====================================================================================

-- We'll use deterministic UUIDs for easier testing and reference

-- =====================================================================================
-- PROFILES
-- =====================================================================================

-- Athlete Profiles
INSERT INTO profiles (id, email, first_name, last_name, role, bio, is_active, created_at) VALUES
  ('11111111-1111-1111-1111-111111111001', 'marcus.johnson@test.gradeup.com', 'Marcus', 'Johnson', 'athlete', 'Junior quarterback with a passion for community service and academic excellence. 4x Academic All-American.', TRUE, NOW() - INTERVAL '6 months'),
  ('11111111-1111-1111-1111-111111111002', 'sarah.chen@test.gradeup.com', 'Sarah', 'Chen', 'athlete', 'Pre-med student and starting point guard. Dean''s List 4 semesters. Future sports medicine physician.', TRUE, NOW() - INTERVAL '8 months'),
  ('11111111-1111-1111-1111-111111111003', 'james.williams@test.gradeup.com', 'James', 'Williams', 'athlete', 'Computer Science major and wide receiver. Building apps and breaking records.', TRUE, NOW() - INTERVAL '4 months'),
  ('11111111-1111-1111-1111-111111111004', 'emma.rodriguez@test.gradeup.com', 'Emma', 'Rodriguez', 'athlete', 'Olympic hopeful in swimming. Business major with 3.9 GPA. National champion in 200m freestyle.', TRUE, NOW() - INTERVAL '10 months'),
  ('11111111-1111-1111-1111-111111111005', 'tyler.brooks@test.gradeup.com', 'Tyler', 'Brooks', 'athlete', 'Two-sport athlete in football and track. Communications major. Community leader.', TRUE, NOW() - INTERVAL '5 months'),
  ('11111111-1111-1111-1111-111111111006', 'olivia.martinez@test.gradeup.com', 'Olivia', 'Martinez', 'athlete', 'Team captain and psychology major. Mental health advocate and wellness content creator.', TRUE, NOW() - INTERVAL '7 months'),
  ('11111111-1111-1111-1111-111111111007', 'david.kim@test.gradeup.com', 'David', 'Kim', 'athlete', 'Mechanical engineering student and tennis player. Ranked top 50 nationally. Tech enthusiast.', TRUE, NOW() - INTERVAL '3 months'),
  ('11111111-1111-1111-1111-111111111008', 'ashley.thompson@test.gradeup.com', 'Ashley', 'Thompson', 'athlete', 'Gymnast and kinesiology major. Social media content creator with 500K+ followers.', TRUE, NOW() - INTERVAL '9 months'),
  ('11111111-1111-1111-1111-111111111009', 'michael.davis@test.gradeup.com', 'Michael', 'Davis', 'athlete', 'Freshman running back with a 3.8 GPA. Finance major. First-generation college student.', TRUE, NOW() - INTERVAL '2 months'),
  ('11111111-1111-1111-1111-111111111010', 'jessica.brown@test.gradeup.com', 'Jessica', 'Brown', 'athlete', 'Softball pitcher and marketing major. All-American pitcher with entrepreneurial ambitions.', TRUE, NOW() - INTERVAL '5 months')
ON CONFLICT (id) DO NOTHING;

-- Brand Profiles
INSERT INTO profiles (id, email, first_name, last_name, role, bio, is_active, created_at) VALUES
  ('22222222-2222-2222-2222-222222222001', 'partnerships@nikelocal.test.com', 'Mike', 'Richardson', 'brand', 'Nike Campus Partnerships - Connecting athletes with opportunities.', TRUE, NOW() - INTERVAL '12 months'),
  ('22222222-2222-2222-2222-222222222002', 'nil@gatorade.test.com', 'Jennifer', 'Adams', 'brand', 'Gatorade NIL Team - Fueling the next generation of athletes.', TRUE, NOW() - INTERVAL '11 months'),
  ('22222222-2222-2222-2222-222222222003', 'campus@chipotle.test.com', 'Carlos', 'Mendez', 'brand', 'Chipotle Campus - Real ingredients for real athletes.', TRUE, NOW() - INTERVAL '8 months'),
  ('22222222-2222-2222-2222-222222222004', 'athletes@localbank.test.com', 'Robert', 'Taylor', 'brand', 'First National Bank - Supporting student-athletes in our community.', TRUE, NOW() - INTERVAL '6 months'),
  ('22222222-2222-2222-2222-222222222005', 'nil@bodyarmor.test.com', 'Lisa', 'Chen', 'brand', 'BodyArmor Sports - Superior hydration for superior athletes.', TRUE, NOW() - INTERVAL '5 months')
ON CONFLICT (id) DO NOTHING;

-- Athletic Director Profiles
INSERT INTO profiles (id, email, first_name, last_name, role, bio, is_active, created_at) VALUES
  ('33333333-3333-3333-3333-333333333001', 'chris.davis@texas.test.edu', 'Chris', 'Davis', 'athletic_director', 'Athletic Director at UT Austin. 15 years in collegiate athletics administration.', TRUE, NOW() - INTERVAL '24 months'),
  ('33333333-3333-3333-3333-333333333002', 'jennifer.white@duke.test.edu', 'Jennifer', 'White', 'athletic_director', 'Duke Athletics - Building champions on and off the field.', TRUE, NOW() - INTERVAL '18 months'),
  ('33333333-3333-3333-3333-333333333003', 'michael.brown@stanford.test.edu', 'Michael', 'Brown', 'athletic_director', 'Stanford Athletics Administration. Focus on scholar-athlete development.', TRUE, NOW() - INTERVAL '20 months')
ON CONFLICT (id) DO NOTHING;

-- =====================================================================================
-- ATHLETES
-- =====================================================================================

-- First, get school and sport IDs (we'll use subqueries since IDs are auto-generated)
INSERT INTO athletes (
  id, profile_id, first_name, last_name, email, phone,
  school_id, sport_id, position, jersey_number, academic_year,
  gpa, major, minor, hometown, height, weight, gender,
  instagram_handle, twitter_handle, tiktok_handle, total_followers,
  nil_valuation, is_searchable,
  enrollment_verified, sport_verified, grades_verified, identity_verified
) VALUES
  (
    'aaaa1111-1111-1111-1111-111111111001',
    '11111111-1111-1111-1111-111111111001',
    'Marcus', 'Johnson', 'marcus.johnson@test.gradeup.com', '512-555-0101',
    (SELECT id FROM schools WHERE short_name = 'Texas' LIMIT 1),
    (SELECT id FROM sports WHERE name = 'Football' AND gender = 'men' LIMIT 1),
    'Quarterback', '12', 'junior',
    3.65, 'Business Administration', 'Sports Management', 'Dallas, TX', '6''2"', '215 lbs', 'Male',
    'marcusj12', 'marcusj12', NULL, 125000,
    85000.00, TRUE,
    TRUE, TRUE, TRUE, TRUE
  ),
  (
    'aaaa1111-1111-1111-1111-111111111002',
    '11111111-1111-1111-1111-111111111002',
    'Sarah', 'Chen', 'sarah.chen@test.gradeup.com', '919-555-0102',
    (SELECT id FROM schools WHERE short_name = 'Duke' LIMIT 1),
    (SELECT id FROM sports WHERE name = 'Basketball' AND gender = 'women' LIMIT 1),
    'Point Guard', '3', 'senior',
    3.92, 'Biology', 'Chemistry', 'San Francisco, CA', '5''8"', '145 lbs', 'Female',
    'sarahchen3', 'sarahchen3', 'sarahchen3', 250000,
    120000.00, TRUE,
    TRUE, TRUE, TRUE, TRUE
  ),
  (
    'aaaa1111-1111-1111-1111-111111111003',
    '11111111-1111-1111-1111-111111111003',
    'James', 'Williams', 'james.williams@test.gradeup.com', '512-555-0103',
    (SELECT id FROM schools WHERE short_name = 'Texas' LIMIT 1),
    (SELECT id FROM sports WHERE name = 'Football' AND gender = 'men' LIMIT 1),
    'Wide Receiver', '88', 'sophomore',
    3.78, 'Computer Science', NULL, 'Houston, TX', '6''1"', '195 lbs', 'Male',
    'jwilliams88', NULL, 'jwilliams88', 75000,
    45000.00, TRUE,
    TRUE, TRUE, TRUE, TRUE
  ),
  (
    'aaaa1111-1111-1111-1111-111111111004',
    '11111111-1111-1111-1111-111111111004',
    'Emma', 'Rodriguez', 'emma.rodriguez@test.gradeup.com', '650-555-0104',
    (SELECT id FROM schools WHERE short_name = 'Stanford' LIMIT 1),
    (SELECT id FROM sports WHERE name = 'Swimming' LIMIT 1),
    'Freestyle/IM', NULL, 'junior',
    3.89, 'Business Economics', 'Data Science', 'Miami, FL', '5''10"', '155 lbs', 'Female',
    'emmaswims', 'emmaswims', NULL, 180000,
    95000.00, TRUE,
    TRUE, TRUE, TRUE, TRUE
  ),
  (
    'aaaa1111-1111-1111-1111-111111111005',
    '11111111-1111-1111-1111-111111111005',
    'Tyler', 'Brooks', 'tyler.brooks@test.gradeup.com', '205-555-0105',
    (SELECT id FROM schools WHERE short_name = 'Alabama' LIMIT 1),
    (SELECT id FROM sports WHERE name = 'Football' AND gender = 'men' LIMIT 1),
    'Running Back', '22', 'senior',
    3.21, 'Communications', NULL, 'Birmingham, AL', '5''11"', '210 lbs', 'Male',
    'tbrooks22', 'tbrooks22', 'tbrooks22', 95000,
    55000.00, TRUE,
    TRUE, TRUE, TRUE, TRUE
  ),
  (
    'aaaa1111-1111-1111-1111-111111111006',
    '11111111-1111-1111-1111-111111111006',
    'Olivia', 'Martinez', 'olivia.martinez@test.gradeup.com', '734-555-0106',
    (SELECT id FROM schools WHERE short_name = 'Michigan' LIMIT 1),
    (SELECT id FROM sports WHERE name = 'Volleyball' LIMIT 1),
    'Outside Hitter', '7', 'junior',
    3.72, 'Psychology', 'Public Health', 'Chicago, IL', '6''0"', '165 lbs', 'Female',
    'oliviam7', NULL, NULL, 65000,
    40000.00, TRUE,
    TRUE, TRUE, TRUE, TRUE
  ),
  (
    'aaaa1111-1111-1111-1111-111111111007',
    '11111111-1111-1111-1111-111111111007',
    'David', 'Kim', 'david.kim@test.gradeup.com', '310-555-0107',
    (SELECT id FROM schools WHERE short_name = 'UCLA' LIMIT 1),
    (SELECT id FROM sports WHERE name = 'Tennis' LIMIT 1),
    'Singles/Doubles', NULL, 'sophomore',
    3.95, 'Mechanical Engineering', 'Computer Science', 'Los Angeles, CA', '5''11"', '170 lbs', 'Male',
    'davidkimtennis', 'dkimtennis', NULL, 45000,
    35000.00, TRUE,
    TRUE, TRUE, TRUE, TRUE
  ),
  (
    'aaaa1111-1111-1111-1111-111111111008',
    '11111111-1111-1111-1111-111111111008',
    'Ashley', 'Thompson', 'ashley.thompson@test.gradeup.com', '352-555-0108',
    (SELECT id FROM schools WHERE short_name = 'Florida' LIMIT 1),
    (SELECT id FROM sports WHERE name = 'Gymnastics' LIMIT 1),
    'All-Around', NULL, 'freshman',
    3.45, 'Kinesiology', NULL, 'Orlando, FL', '5''3"', '115 lbs', 'Female',
    'ashleytgymnast', 'ashleytgymnast', 'ashleytgymnast', 520000,
    150000.00, TRUE,
    TRUE, TRUE, FALSE, TRUE
  ),
  (
    'aaaa1111-1111-1111-1111-111111111009',
    '11111111-1111-1111-1111-111111111009',
    'Michael', 'Davis', 'michael.davis@test.gradeup.com', '512-555-0109',
    (SELECT id FROM schools WHERE short_name = 'Texas' LIMIT 1),
    (SELECT id FROM sports WHERE name = 'Football' AND gender = 'men' LIMIT 1),
    'Running Back', '5', 'freshman',
    3.80, 'Finance', NULL, 'Austin, TX', '5''9"', '190 lbs', 'Male',
    'mdavis5', 'mdavis5', NULL, 25000,
    20000.00, TRUE,
    TRUE, TRUE, TRUE, FALSE
  ),
  (
    'aaaa1111-1111-1111-1111-111111111010',
    '11111111-1111-1111-1111-111111111010',
    'Jessica', 'Brown', 'jessica.brown@test.gradeup.com', '352-555-0110',
    (SELECT id FROM schools WHERE short_name = 'Florida' LIMIT 1),
    (SELECT id FROM sports WHERE name = 'Softball' LIMIT 1),
    'Pitcher', '24', 'junior',
    3.55, 'Marketing', 'Entrepreneurship', 'Tampa, FL', '5''9"', '150 lbs', 'Female',
    'jbrown24', 'jbrown24', 'jbrown24', 85000,
    50000.00, TRUE,
    TRUE, TRUE, TRUE, TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================================================
-- BRANDS
-- =====================================================================================

INSERT INTO brands (
  id, profile_id, company_name, company_type, industry,
  website_url, description, contact_name, contact_email, contact_phone,
  city, state, total_spent, deals_completed, active_campaigns,
  is_verified, verified_at, subscription_tier
) VALUES
  (
    'bbbb1111-1111-1111-1111-111111111001',
    '22222222-2222-2222-2222-222222222001',
    'Nike Campus', 'corporation', 'Apparel & Footwear',
    'https://nike.com', 'Global leader in athletic footwear and apparel. Looking for authentic student-athlete partnerships.',
    'Mike Richardson', 'partnerships@nikelocal.test.com', '503-555-0001',
    'Portland', 'OR', 125000.00, 15, 3,
    TRUE, NOW() - INTERVAL '10 months', 'enterprise'
  ),
  (
    'bbbb1111-1111-1111-1111-111111111002',
    '22222222-2222-2222-2222-222222222002',
    'Gatorade', 'corporation', 'Sports Nutrition',
    'https://gatorade.com', 'The official sports fuel of champions. Partnering with scholar-athletes who excel on and off the field.',
    'Jennifer Adams', 'nil@gatorade.test.com', '312-555-0002',
    'Chicago', 'IL', 85000.00, 12, 2,
    TRUE, NOW() - INTERVAL '9 months', 'enterprise'
  ),
  (
    'bbbb1111-1111-1111-1111-111111111003',
    '22222222-2222-2222-2222-222222222003',
    'Chipotle', 'corporation', 'Food & Beverage',
    'https://chipotle.com', 'Real ingredients for real athletes. Campus ambassador program for student-athletes.',
    'Carlos Mendez', 'campus@chipotle.test.com', '714-555-0003',
    'Newport Beach', 'CA', 45000.00, 8, 2,
    TRUE, NOW() - INTERVAL '6 months', 'pro'
  ),
  (
    'bbbb1111-1111-1111-1111-111111111004',
    '22222222-2222-2222-2222-222222222004',
    'First National Bank', 'corporation', 'Financial Services',
    'https://fnb.example.com', 'Community bank supporting local student-athletes with NIL education and partnerships.',
    'Robert Taylor', 'athletes@localbank.test.com', '512-555-0004',
    'Austin', 'TX', 25000.00, 5, 1,
    TRUE, NOW() - INTERVAL '4 months', 'pro'
  ),
  (
    'bbbb1111-1111-1111-1111-111111111005',
    '22222222-2222-2222-2222-222222222005',
    'BodyArmor Sports', 'corporation', 'Sports Nutrition',
    'https://bodyarmor.com', 'Premium sports drinks for premium athletes. Looking for health-conscious brand ambassadors.',
    'Lisa Chen', 'nil@bodyarmor.test.com', '404-555-0005',
    'Atlanta', 'GA', 35000.00, 6, 1,
    TRUE, NOW() - INTERVAL '3 months', 'pro'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================================================
-- ATHLETIC DIRECTORS
-- =====================================================================================

INSERT INTO athletic_directors (id, profile_id, school_id, title, department, is_verified) VALUES
  (
    'dddd1111-1111-1111-1111-111111111001',
    '33333333-3333-3333-3333-333333333001',
    (SELECT id FROM schools WHERE short_name = 'Texas' LIMIT 1),
    'Athletic Director', 'Intercollegiate Athletics',
    TRUE
  ),
  (
    'dddd1111-1111-1111-1111-111111111002',
    '33333333-3333-3333-3333-333333333002',
    (SELECT id FROM schools WHERE short_name = 'Duke' LIMIT 1),
    'Athletic Director', 'Duke Athletics',
    TRUE
  ),
  (
    'dddd1111-1111-1111-1111-111111111003',
    '33333333-3333-3333-3333-333333333003',
    (SELECT id FROM schools WHERE short_name = 'Stanford' LIMIT 1),
    'Associate Athletic Director', 'Stanford Athletics Administration',
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================================================
-- CAMPAIGNS
-- =====================================================================================

INSERT INTO campaigns (
  id, brand_id, name, title, description, budget, spent,
  start_date, end_date, status, target_sports, target_min_gpa
) VALUES
  (
    'cccc1111-1111-1111-1111-111111111001',
    'bbbb1111-1111-1111-1111-111111111001',
    'Back to School 2024', 'Back to School 2024',
    'Campus ambassador program for fall semester. Looking for athletes across all sports to represent Nike on campus.',
    50000.00, 25000.00,
    CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '90 days',
    'active', ARRAY['Football', 'Basketball', 'Soccer'], 3.0
  ),
  (
    'cccc1111-1111-1111-1111-111111111002',
    'bbbb1111-1111-1111-1111-111111111002',
    'Fuel Your Excellence', 'Fuel Your Excellence',
    'Highlighting scholar-athletes who maintain high GPAs while competing at elite levels.',
    35000.00, 12500.00,
    CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '120 days',
    'active', NULL, 3.5
  ),
  (
    'cccc1111-1111-1111-1111-111111111003',
    'bbbb1111-1111-1111-1111-111111111003',
    'Real Food Real Athletes', 'Real Food Real Athletes',
    'Social media campaign featuring athletes and their favorite Chipotle orders.',
    25000.00, 8000.00,
    CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '60 days',
    'active', NULL, NULL
  ),
  (
    'cccc1111-1111-1111-1111-111111111004',
    'bbbb1111-1111-1111-1111-111111111004',
    'Financial Literacy Champions', 'Financial Literacy Champions',
    'Educational content partnership focusing on financial wellness for student-athletes.',
    15000.00, 5000.00,
    CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '100 days',
    'active', NULL, 3.2
  ),
  (
    'cccc1111-1111-1111-1111-111111111005',
    'bbbb1111-1111-1111-1111-111111111005',
    'Summer Training Series', 'Summer Training Series',
    'Content series following athletes through summer training.',
    20000.00, 0.00,
    CURRENT_DATE + INTERVAL '90 days', CURRENT_DATE + INTERVAL '180 days',
    'draft', ARRAY['Football', 'Basketball', 'Swimming'], NULL
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================================================
-- OPPORTUNITIES
-- =====================================================================================

INSERT INTO opportunities (
  id, brand_id, campaign_id, title, description,
  deal_type, compensation_type, compensation_amount, compensation_details,
  deliverables, status, is_featured, expires_at
) VALUES
  (
    'eeee1111-1111-1111-1111-111111111001',
    'bbbb1111-1111-1111-1111-111111111001',
    'cccc1111-1111-1111-1111-111111111001',
    'Campus Ambassador - Fall Semester',
    'Represent Nike on your campus. Includes monthly social media posts, event appearances, and product seeding.',
    'endorsement', 'fixed', 5000.00, 'Payment split: 50% upfront, 50% on completion',
    '4 Instagram posts per month, 2 campus events, product content',
    'active', TRUE, CURRENT_DATE + INTERVAL '30 days'
  ),
  (
    'eeee1111-1111-1111-1111-111111111002',
    'bbbb1111-1111-1111-1111-111111111002',
    'cccc1111-1111-1111-1111-111111111002',
    'Scholar-Athlete Spotlight',
    'Featured athlete for monthly spotlight series. One video interview plus social promotion.',
    'appearance', 'fixed', 2500.00, 'Single payment upon content delivery',
    '1 video interview (30-45 min), 2 social media posts',
    'active', TRUE, CURRENT_DATE + INTERVAL '45 days'
  ),
  (
    'eeee1111-1111-1111-1111-111111111003',
    'bbbb1111-1111-1111-1111-111111111003',
    'cccc1111-1111-1111-1111-111111111003',
    'TikTok Content Creator',
    'Create 3 TikTok videos featuring Chipotle. Creative freedom with brand guidelines.',
    'social_post', 'per_post', 500.00, '$500 per video, up to 3 videos',
    '3 TikTok videos (15-60 seconds each) featuring Chipotle',
    'active', FALSE, CURRENT_DATE + INTERVAL '21 days'
  ),
  (
    'eeee1111-1111-1111-1111-111111111004',
    'bbbb1111-1111-1111-1111-111111111004',
    'cccc1111-1111-1111-1111-111111111004',
    'Financial Wellness Workshop Host',
    'Host a financial literacy workshop for fellow student-athletes. Includes prep materials and support.',
    'appearance', 'fixed', 1000.00, 'Payment after workshop completion',
    '1 workshop (1-2 hours), promotional social media posts',
    'active', FALSE, CURRENT_DATE + INTERVAL '60 days'
  ),
  (
    'eeee1111-1111-1111-1111-111111111005',
    'bbbb1111-1111-1111-1111-111111111005',
    NULL,
    'Game Day Hydration Partner',
    'In-game promotion and social media content during home games.',
    'endorsement', 'per_post', 250.00, '$250 per game day post',
    'Social media content on game days featuring BodyArmor',
    'active', TRUE, CURRENT_DATE + INTERVAL '90 days'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================================================
-- DEALS
-- =====================================================================================

INSERT INTO deals (
  id, brand_id, athlete_id, opportunity_id, campaign_id,
  title, description, deal_type, compensation_type, compensation_amount,
  status, start_date, end_date, accepted_at, completed_at
) VALUES
  -- Marcus Johnson's active deals
  (
    'ffff1111-1111-1111-1111-111111111001',
    'bbbb1111-1111-1111-1111-111111111001',
    'aaaa1111-1111-1111-1111-111111111001',
    'eeee1111-1111-1111-1111-111111111001',
    'cccc1111-1111-1111-1111-111111111001',
    'Nike Campus Ambassador',
    'Fall semester campus ambassador partnership with Nike.',
    'endorsement', 'fixed', 5000.00,
    'active', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '90 days',
    CURRENT_DATE - INTERVAL '28 days', NULL
  ),
  (
    'ffff1111-1111-1111-1111-111111111002',
    'bbbb1111-1111-1111-1111-111111111002',
    'aaaa1111-1111-1111-1111-111111111001',
    NULL, 'cccc1111-1111-1111-1111-111111111002',
    'Gatorade Fuel Partner',
    'Monthly content partnership featuring Gatorade products.',
    'social_post', 'per_post', 400.00,
    'active', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '100 days',
    CURRENT_DATE - INTERVAL '18 days', NULL
  ),
  -- Sarah Chen's deals
  (
    'ffff1111-1111-1111-1111-111111111003',
    'bbbb1111-1111-1111-1111-111111111002',
    'aaaa1111-1111-1111-1111-111111111002',
    'eeee1111-1111-1111-1111-111111111002',
    'cccc1111-1111-1111-1111-111111111002',
    'Scholar-Athlete Feature',
    'Featured in Gatorade scholar-athlete spotlight series.',
    'appearance', 'fixed', 2500.00,
    'completed', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '15 days',
    CURRENT_DATE - INTERVAL '43 days', CURRENT_DATE - INTERVAL '15 days'
  ),
  (
    'ffff1111-1111-1111-1111-111111111004',
    'bbbb1111-1111-1111-1111-111111111004',
    'aaaa1111-1111-1111-1111-111111111002',
    NULL, 'cccc1111-1111-1111-1111-111111111004',
    'Financial Wellness Ambassador',
    'Workshop host and content creator for financial literacy program.',
    'appearance', 'fixed', 3000.00,
    'active', CURRENT_DATE - INTERVAL '25 days', CURRENT_DATE + INTERVAL '90 days',
    CURRENT_DATE - INTERVAL '23 days', NULL
  ),
  -- James Williams' deals
  (
    'ffff1111-1111-1111-1111-111111111005',
    'bbbb1111-1111-1111-1111-111111111003',
    'aaaa1111-1111-1111-1111-111111111003',
    'eeee1111-1111-1111-1111-111111111003',
    'cccc1111-1111-1111-1111-111111111003',
    'Chipotle Content Creator',
    'TikTok content series featuring Chipotle.',
    'social_post', 'per_post', 500.00,
    'active', CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE + INTERVAL '45 days',
    CURRENT_DATE - INTERVAL '12 days', NULL
  ),
  -- Emma Rodriguez's deals
  (
    'ffff1111-1111-1111-1111-111111111006',
    'bbbb1111-1111-1111-1111-111111111001',
    'aaaa1111-1111-1111-1111-111111111004',
    NULL, 'cccc1111-1111-1111-1111-111111111001',
    'Nike Swim Partnership',
    'Exclusive swimwear and training gear partnership.',
    'endorsement', 'fixed', 8000.00,
    'active', CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE + INTERVAL '180 days',
    CURRENT_DATE - INTERVAL '58 days', NULL
  ),
  (
    'ffff1111-1111-1111-1111-111111111007',
    'bbbb1111-1111-1111-1111-111111111005',
    'aaaa1111-1111-1111-1111-111111111004',
    NULL, NULL,
    'BodyArmor Athlete',
    'Hydration partnership for training and competition content.',
    'endorsement', 'fixed', 3000.00,
    'accepted', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '120 days',
    CURRENT_DATE - INTERVAL '3 days', NULL
  ),
  -- Tyler Brooks' completed deal
  (
    'ffff1111-1111-1111-1111-111111111008',
    'bbbb1111-1111-1111-1111-111111111004',
    'aaaa1111-1111-1111-1111-111111111005',
    'eeee1111-1111-1111-1111-111111111004',
    'cccc1111-1111-1111-1111-111111111004',
    'Financial Literacy Champion',
    'Workshop series host for student-athlete financial education.',
    'appearance', 'fixed', 2000.00,
    'completed', CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE - INTERVAL '58 days', CURRENT_DATE - INTERVAL '30 days'
  ),
  -- David Kim's pending deal
  (
    'ffff1111-1111-1111-1111-111111111009',
    'bbbb1111-1111-1111-1111-111111111001',
    'aaaa1111-1111-1111-1111-111111111007',
    NULL, NULL,
    'Nike Tennis Partnership',
    'Apparel and equipment partnership for upcoming season.',
    'endorsement', 'fixed', 6000.00,
    'pending', CURRENT_DATE + INTERVAL '15 days', CURRENT_DATE + INTERVAL '200 days',
    NULL, NULL
  ),
  -- Ashley Thompson's active deal
  (
    'ffff1111-1111-1111-1111-111111111010',
    'bbbb1111-1111-1111-1111-111111111003',
    'aaaa1111-1111-1111-1111-111111111008',
    NULL, 'cccc1111-1111-1111-1111-111111111003',
    'Chipotle Campus Rep',
    'Social media content and campus appearances.',
    'social_post', 'per_post', 500.00,
    'active', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '80 days',
    CURRENT_DATE - INTERVAL '8 days', NULL
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================================================
-- PAYMENTS
-- =====================================================================================

INSERT INTO payments (
  id, deal_id, athlete_id, amount, status,
  payment_method, scheduled_date, paid_at
) VALUES
  -- Marcus Johnson payments
  (
    'pppp1111-1111-1111-1111-111111111001',
    'ffff1111-1111-1111-1111-111111111001',
    'aaaa1111-1111-1111-1111-111111111001',
    2500.00, 'completed',
    'bank_transfer', CURRENT_DATE - INTERVAL '25 days', CURRENT_DATE - INTERVAL '24 days'
  ),
  (
    'pppp1111-1111-1111-1111-111111111002',
    'ffff1111-1111-1111-1111-111111111001',
    'aaaa1111-1111-1111-1111-111111111001',
    2500.00, 'pending',
    NULL, CURRENT_DATE + INTERVAL '30 days', NULL
  ),
  (
    'pppp1111-1111-1111-1111-111111111003',
    'ffff1111-1111-1111-1111-111111111002',
    'aaaa1111-1111-1111-1111-111111111001',
    800.00, 'completed',
    'bank_transfer', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '8 days'
  ),
  -- Sarah Chen payments
  (
    'pppp1111-1111-1111-1111-111111111004',
    'ffff1111-1111-1111-1111-111111111003',
    'aaaa1111-1111-1111-1111-111111111002',
    2500.00, 'completed',
    'bank_transfer', CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE - INTERVAL '12 days'
  ),
  (
    'pppp1111-1111-1111-1111-111111111005',
    'ffff1111-1111-1111-1111-111111111004',
    'aaaa1111-1111-1111-1111-111111111002',
    1500.00, 'completed',
    'paypal', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '18 days'
  ),
  -- Emma Rodriguez payments
  (
    'pppp1111-1111-1111-1111-111111111006',
    'ffff1111-1111-1111-1111-111111111006',
    'aaaa1111-1111-1111-1111-111111111004',
    4000.00, 'completed',
    'bank_transfer', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '28 days'
  ),
  (
    'pppp1111-1111-1111-1111-111111111007',
    'ffff1111-1111-1111-1111-111111111006',
    'aaaa1111-1111-1111-1111-111111111004',
    4000.00, 'pending',
    NULL, CURRENT_DATE + INTERVAL '60 days', NULL
  ),
  -- Tyler Brooks payment
  (
    'pppp1111-1111-1111-1111-111111111008',
    'ffff1111-1111-1111-1111-111111111008',
    'aaaa1111-1111-1111-1111-111111111005',
    2000.00, 'completed',
    'bank_transfer', CURRENT_DATE - INTERVAL '28 days', CURRENT_DATE - INTERVAL '26 days'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================================================
-- BRAND SHORTLIST
-- =====================================================================================

INSERT INTO brand_shortlist (id, brand_id, athlete_id, notes) VALUES
  ('ssss1111-1111-1111-1111-111111111001', 'bbbb1111-1111-1111-1111-111111111001', 'aaaa1111-1111-1111-1111-111111111002', 'Excellent GPA, strong social presence. Perfect for scholar-athlete campaigns.'),
  ('ssss1111-1111-1111-1111-111111111002', 'bbbb1111-1111-1111-1111-111111111001', 'aaaa1111-1111-1111-1111-111111111007', 'Top engineering student, great fit for tech-forward angle.'),
  ('ssss1111-1111-1111-1111-111111111003', 'bbbb1111-1111-1111-1111-111111111002', 'aaaa1111-1111-1111-1111-111111111001', 'High profile QB, good academic standing. Watch for next campaign.'),
  ('ssss1111-1111-1111-1111-111111111004', 'bbbb1111-1111-1111-1111-111111111002', 'aaaa1111-1111-1111-1111-111111111004', 'Olympic potential, excellent student. Ideal for Fuel Your Excellence.'),
  ('ssss1111-1111-1111-1111-111111111005', 'bbbb1111-1111-1111-1111-111111111003', 'aaaa1111-1111-1111-1111-111111111008', 'Strong TikTok presence, 500K+ followers. Great content creator.'),
  ('ssss1111-1111-1111-1111-111111111006', 'bbbb1111-1111-1111-1111-111111111004', 'aaaa1111-1111-1111-1111-111111111006', 'Psychology major, great for wellness content partnership.')
ON CONFLICT (id) DO NOTHING;

-- =====================================================================================
-- CONVERSATIONS AND MESSAGES
-- =====================================================================================

INSERT INTO conversations (id, deal_id, created_at, updated_at) VALUES
  ('conv1111-1111-1111-1111-111111111001', 'ffff1111-1111-1111-1111-111111111001', NOW() - INTERVAL '14 days', NOW() - INTERVAL '1 day'),
  ('conv1111-1111-1111-1111-111111111002', 'ffff1111-1111-1111-1111-111111111003', NOW() - INTERVAL '7 days', NOW() - INTERVAL '2 days'),
  ('conv1111-1111-1111-1111-111111111003', 'ffff1111-1111-1111-1111-111111111007', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO conversation_participants (id, conversation_id, user_id, role) VALUES
  -- Marcus Johnson <-> Nike
  ('cprt1111-1111-1111-1111-111111111001', 'conv1111-1111-1111-1111-111111111001', '11111111-1111-1111-1111-111111111001', 'athlete'),
  ('cprt1111-1111-1111-1111-111111111002', 'conv1111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222001', 'brand'),
  -- Sarah Chen <-> Gatorade
  ('cprt1111-1111-1111-1111-111111111003', 'conv1111-1111-1111-1111-111111111002', '11111111-1111-1111-1111-111111111002', 'athlete'),
  ('cprt1111-1111-1111-1111-111111111004', 'conv1111-1111-1111-1111-111111111002', '22222222-2222-2222-2222-222222222002', 'brand'),
  -- Emma Rodriguez <-> BodyArmor
  ('cprt1111-1111-1111-1111-111111111005', 'conv1111-1111-1111-1111-111111111003', '11111111-1111-1111-1111-111111111004', 'athlete'),
  ('cprt1111-1111-1111-1111-111111111006', 'conv1111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222005', 'brand')
ON CONFLICT (id) DO NOTHING;

INSERT INTO messages (id, conversation_id, sender_id, content, read_at, created_at) VALUES
  -- Nike <-> Marcus conversation
  ('msg11111-1111-1111-1111-111111111001', 'conv1111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222001',
   'Hi Marcus! We loved your recent game day content. Would you be interested in extending our partnership into the spring semester?',
   NOW() - INTERVAL '13 days', NOW() - INTERVAL '14 days'),
  ('msg11111-1111-1111-1111-111111111002', 'conv1111-1111-1111-1111-111111111001', '11111111-1111-1111-1111-111111111001',
   'Thanks for reaching out! I''d definitely be interested in discussing that. What did you have in mind?',
   NOW() - INTERVAL '12 days', NOW() - INTERVAL '13 days'),
  ('msg11111-1111-1111-1111-111111111003', 'conv1111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222001',
   'We''re thinking a similar structure - monthly posts plus 2 campus events. We could also add some exclusive product drops for your followers.',
   NOW() - INTERVAL '11 days', NOW() - INTERVAL '12 days'),
  ('msg11111-1111-1111-1111-111111111004', 'conv1111-1111-1111-1111-111111111001', '11111111-1111-1111-1111-111111111001',
   'That sounds great! The product drops would be really cool for my audience. Can you send over the details?',
   NOW() - INTERVAL '1 day', NOW() - INTERVAL '11 days'),

  -- Gatorade <-> Sarah conversation
  ('msg11111-1111-1111-1111-111111111005', 'conv1111-1111-1111-1111-111111111002', '22222222-2222-2222-2222-222222222002',
   'Sarah, congratulations on being selected for our Scholar-Athlete Spotlight! When would work best for the video interview?',
   NOW() - INTERVAL '6 days', NOW() - INTERVAL '7 days'),
  ('msg11111-1111-1111-1111-111111111006', 'conv1111-1111-1111-1111-111111111002', '11111111-1111-1111-1111-111111111002',
   'Thank you so much! I''m really excited about this opportunity. I''m free most afternoons after practice. Would next Tuesday work?',
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '6 days'),
  ('msg11111-1111-1111-1111-111111111007', 'conv1111-1111-1111-1111-111111111002', '22222222-2222-2222-2222-222222222002',
   'Tuesday at 3pm works perfectly! We''ll send over some interview prep questions beforehand.',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '5 days'),

  -- BodyArmor <-> Emma conversation
  ('msg11111-1111-1111-1111-111111111008', 'conv1111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222005',
   'Hi Emma! We''ve been following your swimming career and would love to discuss a partnership. Are you currently available for new NIL deals?',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '3 days'),
  ('msg11111-1111-1111-1111-111111111009', 'conv1111-1111-1111-1111-111111111003', '11111111-1111-1111-1111-111111111004',
   'Hi! Yes, I''m always open to hearing about new opportunities. What kind of partnership are you thinking?',
   NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 days'),
  ('msg11111-1111-1111-1111-111111111010', 'conv1111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222005',
   'We''re looking for a hydration ambassador who can create content around training and competition. Given your academic excellence and athletic achievements, you''d be perfect for our "Fuel Your Potential" campaign.',
   NULL, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- =====================================================================================
-- NOTIFICATIONS
-- =====================================================================================

INSERT INTO notifications (id, user_id, type, title, body, read, metadata, created_at) VALUES
  -- Marcus Johnson notifications
  ('noti1111-1111-1111-1111-111111111001', '11111111-1111-1111-1111-111111111001', 'payment', 'Payment Received', 'You received $2,500.00 from Nike Campus', TRUE, '{"deal_id": "ffff1111-1111-1111-1111-111111111001", "amount": 2500}', NOW() - INTERVAL '24 days'),
  ('noti1111-1111-1111-1111-111111111002', '11111111-1111-1111-1111-111111111001', 'message', 'New Message', 'Nike Partnerships sent you a message', TRUE, '{"conversation_id": "conv1111-1111-1111-1111-111111111001"}', NOW() - INTERVAL '14 days'),
  ('noti1111-1111-1111-1111-111111111003', '11111111-1111-1111-1111-111111111001', 'deal', 'New Opportunity', 'A new opportunity matching your profile is available', FALSE, '{"opportunity_id": "eeee1111-1111-1111-1111-111111111002"}', NOW() - INTERVAL '2 days'),

  -- Sarah Chen notifications
  ('noti1111-1111-1111-1111-111111111004', '11111111-1111-1111-1111-111111111002', 'deal', 'Deal Completed', 'Your Gatorade Scholar-Athlete Feature deal is now complete!', TRUE, '{"deal_id": "ffff1111-1111-1111-1111-111111111003"}', NOW() - INTERVAL '15 days'),
  ('noti1111-1111-1111-1111-111111111005', '11111111-1111-1111-1111-111111111002', 'payment', 'Payment Received', 'You received $2,500.00 from Gatorade', TRUE, '{"deal_id": "ffff1111-1111-1111-1111-111111111003", "amount": 2500}', NOW() - INTERVAL '12 days'),

  -- Brand notifications
  ('noti1111-1111-1111-1111-111111111006', '22222222-2222-2222-2222-222222222001', 'deal', 'Deliverable Submitted', 'Marcus Johnson submitted content for review', FALSE, '{"deal_id": "ffff1111-1111-1111-1111-111111111001"}', NOW() - INTERVAL '1 day'),
  ('noti1111-1111-1111-1111-111111111007', '22222222-2222-2222-2222-222222222002', 'message', 'New Message', 'Sarah Chen replied to your message', TRUE, '{"conversation_id": "conv1111-1111-1111-1111-111111111002"}', NOW() - INTERVAL '6 days')
ON CONFLICT (id) DO NOTHING;

-- =====================================================================================
-- ACTIVITY LOG
-- =====================================================================================

INSERT INTO activity_log (id, profile_id, type, description, metadata, created_at) VALUES
  -- Marcus Johnson activity
  ('act11111-1111-1111-1111-111111111001', '11111111-1111-1111-1111-111111111001', 'deal_created', 'Started partnership with Nike Campus', '{"deal_id": "ffff1111-1111-1111-1111-111111111001", "brand": "Nike Campus"}', NOW() - INTERVAL '30 days'),
  ('act11111-1111-1111-1111-111111111002', '11111111-1111-1111-1111-111111111001', 'payment', 'Received payment of $2,500.00', '{"amount": 2500, "brand": "Nike Campus"}', NOW() - INTERVAL '24 days'),
  ('act11111-1111-1111-1111-111111111003', '11111111-1111-1111-1111-111111111001', 'deliverable', 'Submitted social media content', '{"deal_id": "ffff1111-1111-1111-1111-111111111001"}', NOW() - INTERVAL '15 days'),
  ('act11111-1111-1111-1111-111111111004', '11111111-1111-1111-1111-111111111001', 'deal_created', 'Started partnership with Gatorade', '{"deal_id": "ffff1111-1111-1111-1111-111111111002", "brand": "Gatorade"}', NOW() - INTERVAL '20 days'),

  -- Sarah Chen activity
  ('act11111-1111-1111-1111-111111111005', '11111111-1111-1111-1111-111111111002', 'deal_created', 'Started Scholar-Athlete Feature', '{"deal_id": "ffff1111-1111-1111-1111-111111111003", "brand": "Gatorade"}', NOW() - INTERVAL '45 days'),
  ('act11111-1111-1111-1111-111111111006', '11111111-1111-1111-1111-111111111002', 'deal_completed', 'Completed Gatorade feature', '{"deal_id": "ffff1111-1111-1111-1111-111111111003"}', NOW() - INTERVAL '15 days'),
  ('act11111-1111-1111-1111-111111111007', '11111111-1111-1111-1111-111111111002', 'payment', 'Received payment of $2,500.00', '{"amount": 2500, "brand": "Gatorade"}', NOW() - INTERVAL '12 days'),

  -- Emma Rodriguez activity
  ('act11111-1111-1111-1111-111111111008', '11111111-1111-1111-1111-111111111004', 'deal_created', 'Started Nike Swim partnership', '{"deal_id": "ffff1111-1111-1111-1111-111111111006", "brand": "Nike Campus"}', NOW() - INTERVAL '60 days'),
  ('act11111-1111-1111-1111-111111111009', '11111111-1111-1111-1111-111111111004', 'payment', 'Received payment of $4,000.00', '{"amount": 4000, "brand": "Nike Campus"}', NOW() - INTERVAL '28 days'),
  ('act11111-1111-1111-1111-111111111010', '11111111-1111-1111-1111-111111111004', 'new_offer', 'Received partnership offer from BodyArmor', '{"brand": "BodyArmor Sports"}', NOW() - INTERVAL '3 days'),
  ('act11111-1111-1111-1111-111111111011', '11111111-1111-1111-1111-111111111004', 'deal_accepted', 'Accepted BodyArmor partnership', '{"deal_id": "ffff1111-1111-1111-1111-111111111007", "brand": "BodyArmor Sports"}', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- =====================================================================================
-- COMPLIANCE ALERTS (for Athletic Directors)
-- =====================================================================================

INSERT INTO compliance_alerts (id, athlete_id, school_id, type, severity, message, resolved, created_at) VALUES
  (
    'alrt1111-1111-1111-1111-111111111001',
    'aaaa1111-1111-1111-1111-111111111005',
    (SELECT id FROM schools WHERE short_name = 'Alabama' LIMIT 1),
    'gpa_drop', 'medium',
    'GPA dropped to 3.21 - monitor for continued academic eligibility',
    FALSE, NOW() - INTERVAL '7 days'
  ),
  (
    'alrt1111-1111-1111-1111-111111111002',
    'aaaa1111-1111-1111-1111-111111111009',
    (SELECT id FROM schools WHERE short_name = 'Texas' LIMIT 1),
    'verification_expired', 'low',
    'Identity verification pending - please complete verification process',
    FALSE, NOW() - INTERVAL '3 days'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================================================
-- SEED DATA COMPLETE
-- =====================================================================================

COMMENT ON TABLE profiles IS 'Seed data includes 10 athletes, 5 brands, and 3 athletic directors for testing';
