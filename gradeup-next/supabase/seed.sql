-- ═══════════════════════════════════════════════════════════════════════════
-- GradeUp NIL - Seed Data for Testing
-- Run this AFTER schema.sql in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- SCHOOLS
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO schools (id, name, short_name, city, state, conference, division, logo_url) VALUES
  ('sch_00000001-0000-0000-0000-000000000001', 'University of Texas at Austin', 'Texas', 'Austin', 'TX', 'Big 12', 'D1', NULL),
  ('sch_00000001-0000-0000-0000-000000000002', 'Duke University', 'Duke', 'Durham', 'NC', 'ACC', 'D1', NULL),
  ('sch_00000001-0000-0000-0000-000000000003', 'Stanford University', 'Stanford', 'Stanford', 'CA', 'Pac-12', 'D1', NULL),
  ('sch_00000001-0000-0000-0000-000000000004', 'University of Alabama', 'Alabama', 'Tuscaloosa', 'AL', 'SEC', 'D1', NULL),
  ('sch_00000001-0000-0000-0000-000000000005', 'University of Michigan', 'Michigan', 'Ann Arbor', 'MI', 'Big Ten', 'D1', NULL),
  ('sch_00000001-0000-0000-0000-000000000006', 'UCLA', 'UCLA', 'Los Angeles', 'CA', 'Pac-12', 'D1', NULL),
  ('sch_00000001-0000-0000-0000-000000000007', 'University of Florida', 'Florida', 'Gainesville', 'FL', 'SEC', 'D1', NULL),
  ('sch_00000001-0000-0000-0000-000000000008', 'Ohio State University', 'Ohio State', 'Columbus', 'OH', 'Big Ten', 'D1', NULL);

-- ═══════════════════════════════════════════════════════════════════════════
-- SPORTS
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO sports (id, name, category, season) VALUES
  ('spt_00000001-0000-0000-0000-000000000001', 'Football', 'team', 'fall'),
  ('spt_00000001-0000-0000-0000-000000000002', 'Basketball', 'team', 'winter'),
  ('spt_00000001-0000-0000-0000-000000000003', 'Soccer', 'team', 'fall'),
  ('spt_00000001-0000-0000-0000-000000000004', 'Baseball', 'team', 'spring'),
  ('spt_00000001-0000-0000-0000-000000000005', 'Volleyball', 'team', 'fall'),
  ('spt_00000001-0000-0000-0000-000000000006', 'Swimming', 'individual', 'winter'),
  ('spt_00000001-0000-0000-0000-000000000007', 'Track & Field', 'individual', 'spring'),
  ('spt_00000001-0000-0000-0000-000000000008', 'Tennis', 'individual', 'spring'),
  ('spt_00000001-0000-0000-0000-000000000009', 'Gymnastics', 'individual', 'winter'),
  ('spt_00000001-0000-0000-0000-000000000010', 'Softball', 'team', 'spring');

-- ═══════════════════════════════════════════════════════════════════════════
-- TEST USER PROFILES
-- Note: These need matching auth.users entries. For testing, you can:
-- 1. Sign up users through the app, then update these IDs
-- 2. Or use Supabase Auth Admin API to create users with these IDs
-- ═══════════════════════════════════════════════════════════════════════════

-- For demo purposes, we'll use placeholder UUIDs
-- In production, these would match actual auth.users IDs

INSERT INTO profiles (id, email, first_name, last_name, role, avatar_url, bio, created_at) VALUES
  -- Athletes
  ('pro_00000001-0000-0000-0000-000000000001', 'marcus.johnson@example.com', 'Marcus', 'Johnson', 'athlete', NULL, 'Junior quarterback with a passion for community service and academic excellence.', NOW() - INTERVAL '6 months'),
  ('pro_00000001-0000-0000-0000-000000000002', 'sarah.chen@example.com', 'Sarah', 'Chen', 'athlete', NULL, 'Pre-med student and starting point guard. Dean''s List 4 semesters.', NOW() - INTERVAL '8 months'),
  ('pro_00000001-0000-0000-0000-000000000003', 'james.williams@example.com', 'James', 'Williams', 'athlete', NULL, 'Computer Science major and wide receiver. Building apps in my free time.', NOW() - INTERVAL '4 months'),
  ('pro_00000001-0000-0000-0000-000000000004', 'emma.rodriguez@example.com', 'Emma', 'Rodriguez', 'athlete', NULL, 'Olympic hopeful in swimming. Business major with 3.9 GPA.', NOW() - INTERVAL '10 months'),
  ('pro_00000001-0000-0000-0000-000000000005', 'tyler.brooks@example.com', 'Tyler', 'Brooks', 'athlete', NULL, 'Two-sport athlete in football and track. Communications major.', NOW() - INTERVAL '5 months'),
  ('pro_00000001-0000-0000-0000-000000000006', 'olivia.martinez@example.com', 'Olivia', 'Martinez', 'athlete', NULL, 'Team captain and psychology major. Mental health advocate.', NOW() - INTERVAL '7 months'),
  ('pro_00000001-0000-0000-0000-000000000007', 'david.kim@example.com', 'David', 'Kim', 'athlete', NULL, 'Engineering student and tennis player. Ranked top 50 nationally.', NOW() - INTERVAL '3 months'),
  ('pro_00000001-0000-0000-0000-000000000008', 'ashley.thompson@example.com', 'Ashley', 'Thompson', 'athlete', NULL, 'Gymnast and kinesiology major. Social media content creator.', NOW() - INTERVAL '9 months'),

  -- Brands
  ('pro_00000001-0000-0000-0000-000000000101', 'partnerships@nikelocal.example.com', 'Nike', 'Partnerships', 'brand', NULL, 'Local Nike representative for collegiate partnerships.', NOW() - INTERVAL '12 months'),
  ('pro_00000001-0000-0000-0000-000000000102', 'nil@gatorade.example.com', 'Gatorade', 'NIL Team', 'brand', NULL, 'Fueling the next generation of athletes.', NOW() - INTERVAL '11 months'),
  ('pro_00000001-0000-0000-0000-000000000103', 'campus@chipotle.example.com', 'Chipotle', 'Campus', 'brand', NULL, 'Real ingredients, real athletes, real partnerships.', NOW() - INTERVAL '8 months'),
  ('pro_00000001-0000-0000-0000-000000000104', 'athletes@localbank.example.com', 'First National', 'Bank', 'brand', NULL, 'Supporting student-athletes in our community.', NOW() - INTERVAL '6 months'),
  ('pro_00000001-0000-0000-0000-000000000105', 'nil@bodyarmor.example.com', 'BodyArmor', 'Sports', 'brand', NULL, 'Superior hydration for superior athletes.', NOW() - INTERVAL '5 months'),

  -- Athletic Directors
  ('pro_00000001-0000-0000-0000-000000000201', 'chris.davis@texas.example.edu', 'Chris', 'Davis', 'athletic_director', NULL, 'Athletic Director at UT Austin. 15 years in collegiate athletics.', NOW() - INTERVAL '24 months'),
  ('pro_00000001-0000-0000-0000-000000000202', 'jennifer.white@duke.example.edu', 'Jennifer', 'White', 'athletic_director', NULL, 'Duke Athletics - Building champions on and off the field.', NOW() - INTERVAL '18 months'),
  ('pro_00000001-0000-0000-0000-000000000203', 'michael.brown@stanford.example.edu', 'Michael', 'Brown', 'athletic_director', NULL, 'Stanford Athletics Administration.', NOW() - INTERVAL '20 months');

-- ═══════════════════════════════════════════════════════════════════════════
-- ATHLETES
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO athletes (id, profile_id, school_id, sport_id, position, jersey_number, year, major, gpa, hometown, height, weight, instagram_url, twitter_url, tiktok_url, enrollment_verified, sport_verified, grades_verified, is_available) VALUES
  ('ath_00000001-0000-0000-0000-000000000001', 'pro_00000001-0000-0000-0000-000000000001', 'sch_00000001-0000-0000-0000-000000000001', 'spt_00000001-0000-0000-0000-000000000001', 'Quarterback', 12, 'Junior', 'Business Administration', 3.65, 'Dallas, TX', '6''2"', 215, 'https://instagram.com/marcusj12', 'https://twitter.com/marcusj12', NULL, true, true, true, true),

  ('ath_00000001-0000-0000-0000-000000000002', 'pro_00000001-0000-0000-0000-000000000002', 'sch_00000001-0000-0000-0000-000000000002', 'spt_00000001-0000-0000-0000-000000000002', 'Point Guard', 3, 'Senior', 'Biology (Pre-Med)', 3.92, 'San Francisco, CA', '5''8"', 145, 'https://instagram.com/sarahchen3', 'https://twitter.com/sarahchen3', 'https://tiktok.com/@sarahchen3', true, true, true, true),

  ('ath_00000001-0000-0000-0000-000000000003', 'pro_00000001-0000-0000-0000-000000000003', 'sch_00000001-0000-0000-0000-000000000001', 'spt_00000001-0000-0000-0000-000000000001', 'Wide Receiver', 88, 'Sophomore', 'Computer Science', 3.78, 'Houston, TX', '6''1"', 195, 'https://instagram.com/jwilliams88', NULL, 'https://tiktok.com/@jwilliams88', true, true, true, true),

  ('ath_00000001-0000-0000-0000-000000000004', 'pro_00000001-0000-0000-0000-000000000004', 'sch_00000001-0000-0000-0000-000000000003', 'spt_00000001-0000-0000-0000-000000000006', 'Freestyle/IM', NULL, 'Junior', 'Business Economics', 3.89, 'Miami, FL', '5''10"', 155, 'https://instagram.com/emmaswims', 'https://twitter.com/emmaswims', NULL, true, true, true, true),

  ('ath_00000001-0000-0000-0000-000000000005', 'pro_00000001-0000-0000-0000-000000000005', 'sch_00000001-0000-0000-0000-000000000004', 'spt_00000001-0000-0000-0000-000000000001', 'Running Back', 22, 'Senior', 'Communications', 3.21, 'Birmingham, AL', '5''11"', 210, 'https://instagram.com/tbrooks22', 'https://twitter.com/tbrooks22', 'https://tiktok.com/@tbrooks22', true, true, true, true),

  ('ath_00000001-0000-0000-0000-000000000006', 'pro_00000001-0000-0000-0000-000000000006', 'sch_00000001-0000-0000-0000-000000000005', 'spt_00000001-0000-0000-0000-000000000005', 'Outside Hitter', 7, 'Junior', 'Psychology', 3.72, 'Chicago, IL', '6''0"', 165, 'https://instagram.com/oliviam7', NULL, NULL, true, true, true, true),

  ('ath_00000001-0000-0000-0000-000000000007', 'pro_00000001-0000-0000-0000-000000000007', 'sch_00000001-0000-0000-0000-000000000006', 'spt_00000001-0000-0000-0000-000000000008', 'Singles/Doubles', NULL, 'Sophomore', 'Mechanical Engineering', 3.95, 'Los Angeles, CA', '5''11"', 170, 'https://instagram.com/davidkimtennis', 'https://twitter.com/dkimtennis', NULL, true, true, true, true),

  ('ath_00000001-0000-0000-0000-000000000008', 'pro_00000001-0000-0000-0000-000000000008', 'sch_00000001-0000-0000-0000-000000000007', 'spt_00000001-0000-0000-0000-000000000009', 'All-Around', NULL, 'Freshman', 'Kinesiology', 3.45, 'Orlando, FL', '5''3"', 115, 'https://instagram.com/ashleytgymnast', 'https://twitter.com/ashleytgymnast', 'https://tiktok.com/@ashleytgymnast', true, true, false, true);

-- ═══════════════════════════════════════════════════════════════════════════
-- BRANDS
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO brands (id, profile_id, company_name, industry, website, description, is_verified, contact_email) VALUES
  ('brd_00000001-0000-0000-0000-000000000001', 'pro_00000001-0000-0000-0000-000000000101', 'Nike Campus', 'Apparel & Footwear', 'https://nike.com', 'Global leader in athletic footwear and apparel. Looking for authentic student-athlete partnerships.', true, 'campus@nike.example.com'),

  ('brd_00000001-0000-0000-0000-000000000002', 'pro_00000001-0000-0000-0000-000000000102', 'Gatorade', 'Sports Nutrition', 'https://gatorade.com', 'The official sports fuel of champions. Partnering with scholar-athletes who excel on and off the field.', true, 'nil@gatorade.example.com'),

  ('brd_00000001-0000-0000-0000-000000000003', 'pro_00000001-0000-0000-0000-000000000103', 'Chipotle', 'Food & Beverage', 'https://chipotle.com', 'Real ingredients for real athletes. Campus ambassador program for student-athletes.', true, 'campus@chipotle.example.com'),

  ('brd_00000001-0000-0000-0000-000000000004', 'pro_00000001-0000-0000-0000-000000000104', 'First National Bank', 'Financial Services', 'https://fnb.example.com', 'Community bank supporting local student-athletes with NIL education and partnerships.', true, 'athletes@fnb.example.com'),

  ('brd_00000001-0000-0000-0000-000000000005', 'pro_00000001-0000-0000-0000-000000000105', 'BodyArmor Sports', 'Sports Nutrition', 'https://bodyarmor.com', 'Premium sports drinks for premium athletes. Looking for health-conscious brand ambassadors.', true, 'nil@bodyarmor.example.com');

-- ═══════════════════════════════════════════════════════════════════════════
-- ATHLETIC DIRECTORS
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO athletic_directors (id, profile_id, school_id, title, department) VALUES
  ('dir_00000001-0000-0000-0000-000000000001', 'pro_00000001-0000-0000-0000-000000000201', 'sch_00000001-0000-0000-0000-000000000001', 'Athletic Director', 'Athletics'),
  ('dir_00000001-0000-0000-0000-000000000002', 'pro_00000001-0000-0000-0000-000000000202', 'sch_00000001-0000-0000-0000-000000000002', 'Athletic Director', 'Athletics'),
  ('dir_00000001-0000-0000-0000-000000000003', 'pro_00000001-0000-0000-0000-000000000203', 'sch_00000001-0000-0000-0000-000000000003', 'Associate Athletic Director', 'Athletics Administration');

-- ═══════════════════════════════════════════════════════════════════════════
-- CAMPAIGNS
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO campaigns (id, brand_id, title, description, budget, requirements, status, start_date, end_date) VALUES
  ('cmp_00000001-0000-0000-0000-000000000001', 'brd_00000001-0000-0000-0000-000000000001', 'Back to School 2024', 'Campus ambassador program for fall semester. Looking for athletes across all sports to represent Nike on campus.', 50000.00, '{"min_gpa": 3.0, "min_followers": 1000, "sports": ["any"]}', 'active', '2024-08-01', '2024-12-31'),

  ('cmp_00000001-0000-0000-0000-000000000002', 'brd_00000001-0000-0000-0000-000000000002', 'Fuel Your Excellence', 'Highlighting scholar-athletes who maintain high GPAs while competing at elite levels.', 35000.00, '{"min_gpa": 3.5, "sports": ["any"]}', 'active', '2024-09-01', '2025-05-31'),

  ('cmp_00000001-0000-0000-0000-000000000003', 'brd_00000001-0000-0000-0000-000000000003', 'Real Food, Real Athletes', 'Social media campaign featuring athletes and their favorite Chipotle orders.', 25000.00, '{"min_followers": 5000, "platforms": ["instagram", "tiktok"]}', 'active', '2024-10-01', '2025-03-31'),

  ('cmp_00000001-0000-0000-0000-000000000004', 'brd_00000001-0000-0000-0000-000000000004', 'Financial Literacy Champions', 'Educational content partnership focusing on financial wellness for student-athletes.', 15000.00, '{"min_gpa": 3.2, "content_type": "educational"}', 'active', '2024-09-15', '2025-04-30'),

  ('cmp_00000001-0000-0000-0000-000000000005', 'brd_00000001-0000-0000-0000-000000000005', 'Summer Training Series', 'Content series following athletes through summer training.', 20000.00, '{"sports": ["football", "basketball", "swimming"]}', 'draft', '2025-05-01', '2025-08-31');

-- ═══════════════════════════════════════════════════════════════════════════
-- OPPORTUNITIES (Open for athlete applications)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO opportunities (id, brand_id, campaign_id, title, description, compensation_type, compensation_amount, requirements, status, deadline) VALUES
  ('opp_00000001-0000-0000-0000-000000000001', 'brd_00000001-0000-0000-0000-000000000001', 'cmp_00000001-0000-0000-0000-000000000001', 'Campus Ambassador - Fall Semester', 'Represent Nike on your campus. Includes monthly social media posts, event appearances, and product seeding.', 'fixed', 5000.00, '{"min_gpa": 3.0, "posts_per_month": 4}', 'open', '2024-11-30'),

  ('opp_00000001-0000-0000-0000-000000000002', 'brd_00000001-0000-0000-0000-000000000002', 'cmp_00000001-0000-0000-0000-000000000002', 'Scholar-Athlete Spotlight', 'Featured athlete for monthly spotlight series. One video interview + social promotion.', 'fixed', 2500.00, '{"min_gpa": 3.5}', 'open', '2024-12-15'),

  ('opp_00000001-0000-0000-0000-000000000003', 'brd_00000001-0000-0000-0000-000000000003', 'cmp_00000001-0000-0000-0000-000000000003', 'TikTok Content Creator', 'Create 3 TikTok videos featuring Chipotle. Creative freedom with brand guidelines.', 'fixed', 1500.00, '{"min_followers": 5000, "platform": "tiktok"}', 'open', '2024-11-15'),

  ('opp_00000001-0000-0000-0000-000000000004', 'brd_00000001-0000-0000-0000-000000000004', 'cmp_00000001-0000-0000-0000-000000000004', 'Financial Wellness Workshop Host', 'Host a financial literacy workshop for fellow student-athletes. Includes prep materials and support.', 'fixed', 1000.00, '{"min_gpa": 3.2}', 'open', '2024-12-01'),

  ('opp_00000001-0000-0000-0000-000000000005', 'brd_00000001-0000-0000-0000-000000000005', NULL, 'Game Day Hydration Partner', 'In-game promotion and social media content during home games.', 'per_post', 250.00, '{"sports": ["football", "basketball"]}', 'open', '2025-01-15');

-- ═══════════════════════════════════════════════════════════════════════════
-- DEALS
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO deals (id, athlete_id, brand_id, campaign_id, opportunity_id, title, description, deal_type, compensation_amount, status, start_date, end_date, deliverables) VALUES
  -- Marcus Johnson's deals
  ('deal_0000001-0000-0000-0000-000000000001', 'ath_00000001-0000-0000-0000-000000000001', 'brd_00000001-0000-0000-0000-000000000001', 'cmp_00000001-0000-0000-0000-000000000001', 'opp_00000001-0000-0000-0000-000000000001', 'Nike Campus Ambassador', 'Fall semester campus ambassador partnership', 'ambassador', 5000.00, 'active', '2024-09-01', '2024-12-31', '[{"type": "social_post", "quantity": 16, "completed": 8}, {"type": "event", "quantity": 2, "completed": 1}]'),

  ('deal_0000001-0000-0000-0000-000000000002', 'ath_00000001-0000-0000-0000-000000000001', 'brd_00000001-0000-0000-0000-000000000002', 'cmp_00000001-0000-0000-0000-000000000002', NULL, 'Gatorade Fuel Partner', 'Monthly content featuring Gatorade products', 'content', 2000.00, 'active', '2024-10-01', '2025-03-31', '[{"type": "social_post", "quantity": 6, "completed": 2}]'),

  -- Sarah Chen's deals
  ('deal_0000001-0000-0000-0000-000000000003', 'ath_00000001-0000-0000-0000-000000000002', 'brd_00000001-0000-0000-0000-000000000002', 'cmp_00000001-0000-0000-0000-000000000002', 'opp_00000001-0000-0000-0000-000000000002', 'Scholar-Athlete Feature', 'Featured in Gatorade scholar-athlete series', 'appearance', 2500.00, 'completed', '2024-09-15', '2024-10-15', '[{"type": "video", "quantity": 1, "completed": 1}, {"type": "social_post", "quantity": 2, "completed": 2}]'),

  ('deal_0000001-0000-0000-0000-000000000004', 'ath_00000001-0000-0000-0000-000000000002', 'brd_00000001-0000-0000-0000-000000000004', 'cmp_00000001-0000-0000-0000-000000000004', NULL, 'Financial Wellness Ambassador', 'Workshop host and content creator', 'ambassador', 3000.00, 'active', '2024-10-01', '2025-04-30', '[{"type": "workshop", "quantity": 4, "completed": 1}, {"type": "social_post", "quantity": 8, "completed": 3}]'),

  -- James Williams' deals
  ('deal_0000001-0000-0000-0000-000000000005', 'ath_00000001-0000-0000-0000-000000000003', 'brd_00000001-0000-0000-0000-000000000003', 'cmp_00000001-0000-0000-0000-000000000003', 'opp_00000001-0000-0000-0000-000000000003', 'Chipotle Content Creator', 'TikTok content series', 'content', 1500.00, 'active', '2024-10-15', '2024-12-15', '[{"type": "tiktok", "quantity": 3, "completed": 1}]'),

  -- Emma Rodriguez's deals
  ('deal_0000001-0000-0000-0000-000000000006', 'ath_00000001-0000-0000-0000-000000000004', 'brd_00000001-0000-0000-0000-000000000001', 'cmp_00000001-0000-0000-0000-000000000001', NULL, 'Nike Swim Partner', 'Exclusive swimwear partnership', 'ambassador', 8000.00, 'active', '2024-08-01', '2025-07-31', '[{"type": "social_post", "quantity": 24, "completed": 10}, {"type": "event", "quantity": 4, "completed": 2}]'),

  ('deal_0000001-0000-0000-0000-000000000007', 'ath_00000001-0000-0000-0000-000000000004', 'brd_00000001-0000-0000-0000-000000000005', NULL, NULL, 'BodyArmor Athlete', 'Hydration partnership', 'content', 3000.00, 'accepted', '2024-11-01', '2025-04-30', '[{"type": "social_post", "quantity": 12, "completed": 0}]'),

  -- Tyler Brooks' deals
  ('deal_0000001-0000-0000-0000-000000000008', 'ath_00000001-0000-0000-0000-000000000005', 'brd_00000001-0000-0000-0000-000000000004', 'cmp_00000001-0000-0000-0000-000000000004', 'opp_00000001-0000-0000-0000-000000000004', 'Financial Literacy Champion', 'Workshop series host', 'appearance', 2000.00, 'completed', '2024-09-01', '2024-10-31', '[{"type": "workshop", "quantity": 2, "completed": 2}]'),

  -- David Kim's pending deal
  ('deal_0000001-0000-0000-0000-000000000009', 'ath_00000001-0000-0000-0000-000000000007', 'brd_00000001-0000-0000-0000-000000000001', NULL, NULL, 'Nike Tennis Partnership', 'Apparel and equipment partnership', 'ambassador', 6000.00, 'pending', '2024-12-01', '2025-11-30', '[{"type": "social_post", "quantity": 12, "completed": 0}, {"type": "event", "quantity": 3, "completed": 0}]'),

  -- Ashley Thompson's deals
  ('deal_0000001-0000-0000-0000-000000000010', 'ath_00000001-0000-0000-0000-000000000008', 'brd_00000001-0000-0000-0000-000000000003', 'cmp_00000001-0000-0000-0000-000000000003', NULL, 'Chipotle Campus Rep', 'Social media content and appearances', 'content', 2000.00, 'active', '2024-10-01', '2025-03-31', '[{"type": "social_post", "quantity": 8, "completed": 3}, {"type": "tiktok", "quantity": 4, "completed": 2}]');

-- ═══════════════════════════════════════════════════════════════════════════
-- PAYMENTS
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO payments (id, deal_id, athlete_id, brand_id, amount, status, payment_type, due_date, paid_at, description) VALUES
  -- Marcus Johnson payments
  ('pay_00000001-0000-0000-0000-000000000001', 'deal_0000001-0000-0000-0000-000000000001', 'ath_00000001-0000-0000-0000-000000000001', 'brd_00000001-0000-0000-0000-000000000001', 1250.00, 'completed', 'milestone', '2024-09-30', '2024-10-02', 'Q3 milestone payment'),
  ('pay_00000001-0000-0000-0000-000000000002', 'deal_0000001-0000-0000-0000-000000000001', 'ath_00000001-0000-0000-0000-000000000001', 'brd_00000001-0000-0000-0000-000000000001', 1250.00, 'completed', 'milestone', '2024-10-31', '2024-11-01', 'October milestone payment'),
  ('pay_00000001-0000-0000-0000-000000000003', 'deal_0000001-0000-0000-0000-000000000001', 'ath_00000001-0000-0000-0000-000000000001', 'brd_00000001-0000-0000-0000-000000000001', 1250.00, 'pending', 'milestone', '2024-11-30', NULL, 'November milestone payment'),
  ('pay_00000001-0000-0000-0000-000000000004', 'deal_0000001-0000-0000-0000-000000000002', 'ath_00000001-0000-0000-0000-000000000001', 'brd_00000001-0000-0000-0000-000000000002', 500.00, 'completed', 'monthly', '2024-10-31', '2024-11-02', 'October payment'),

  -- Sarah Chen payments
  ('pay_00000001-0000-0000-0000-000000000005', 'deal_0000001-0000-0000-0000-000000000003', 'ath_00000001-0000-0000-0000-000000000002', 'brd_00000001-0000-0000-0000-000000000002', 2500.00, 'completed', 'completion', '2024-10-15', '2024-10-18', 'Feature completion payment'),
  ('pay_00000001-0000-0000-0000-000000000006', 'deal_0000001-0000-0000-0000-000000000004', 'ath_00000001-0000-0000-0000-000000000002', 'brd_00000001-0000-0000-0000-000000000004', 750.00, 'completed', 'milestone', '2024-10-31', '2024-11-03', 'Q4 milestone'),

  -- Emma Rodriguez payments
  ('pay_00000001-0000-0000-0000-000000000007', 'deal_0000001-0000-0000-0000-000000000006', 'ath_00000001-0000-0000-0000-000000000004', 'brd_00000001-0000-0000-0000-000000000001', 2000.00, 'completed', 'quarterly', '2024-09-30', '2024-10-01', 'Q3 payment'),
  ('pay_00000001-0000-0000-0000-000000000008', 'deal_0000001-0000-0000-0000-000000000006', 'ath_00000001-0000-0000-0000-000000000004', 'brd_00000001-0000-0000-0000-000000000001', 2000.00, 'pending', 'quarterly', '2024-12-31', NULL, 'Q4 payment'),

  -- Tyler Brooks payments
  ('pay_00000001-0000-0000-0000-000000000009', 'deal_0000001-0000-0000-0000-000000000008', 'ath_00000001-0000-0000-0000-000000000005', 'brd_00000001-0000-0000-0000-000000000004', 2000.00, 'completed', 'completion', '2024-10-31', '2024-11-05', 'Workshop series completion');

-- ═══════════════════════════════════════════════════════════════════════════
-- BRAND SHORTLIST
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO brand_shortlist (id, brand_id, athlete_id, notes) VALUES
  ('shl_00000001-0000-0000-0000-000000000001', 'brd_00000001-0000-0000-0000-000000000001', 'ath_00000001-0000-0000-0000-000000000002', 'Excellent GPA, strong social presence'),
  ('shl_00000001-0000-0000-0000-000000000002', 'brd_00000001-0000-0000-0000-000000000001', 'ath_00000001-0000-0000-0000-000000000007', 'Top engineering student, great fit for tech angle'),
  ('shl_00000001-0000-0000-0000-000000000003', 'brd_00000001-0000-0000-0000-000000000002', 'ath_00000001-0000-0000-0000-000000000001', 'High profile QB, good academic standing'),
  ('shl_00000001-0000-0000-0000-000000000004', 'brd_00000001-0000-0000-0000-000000000002', 'ath_00000001-0000-0000-0000-000000000004', 'Olympic potential, excellent student'),
  ('shl_00000001-0000-0000-0000-000000000005', 'brd_00000001-0000-0000-0000-000000000003', 'ath_00000001-0000-0000-0000-000000000008', 'Strong TikTok presence, great content creator'),
  ('shl_00000001-0000-0000-0000-000000000006', 'brd_00000001-0000-0000-0000-000000000004', 'ath_00000001-0000-0000-0000-000000000006', 'Psychology major, great for wellness content');

-- ═══════════════════════════════════════════════════════════════════════════
-- CONVERSATIONS & MESSAGES
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO conversations (id, created_at) VALUES
  ('conv_0000001-0000-0000-0000-000000000001', NOW() - INTERVAL '14 days'),
  ('conv_0000001-0000-0000-0000-000000000002', NOW() - INTERVAL '7 days'),
  ('conv_0000001-0000-0000-0000-000000000003', NOW() - INTERVAL '3 days');

INSERT INTO conversation_participants (conversation_id, profile_id) VALUES
  -- Marcus Johnson <-> Nike
  ('conv_0000001-0000-0000-0000-000000000001', 'pro_00000001-0000-0000-0000-000000000001'),
  ('conv_0000001-0000-0000-0000-000000000001', 'pro_00000001-0000-0000-0000-000000000101'),
  -- Sarah Chen <-> Gatorade
  ('conv_0000001-0000-0000-0000-000000000002', 'pro_00000001-0000-0000-0000-000000000002'),
  ('conv_0000001-0000-0000-0000-000000000002', 'pro_00000001-0000-0000-0000-000000000102'),
  -- Emma Rodriguez <-> BodyArmor
  ('conv_0000001-0000-0000-0000-000000000003', 'pro_00000001-0000-0000-0000-000000000004'),
  ('conv_0000001-0000-0000-0000-000000000003', 'pro_00000001-0000-0000-0000-000000000105');

INSERT INTO messages (id, conversation_id, sender_id, content, created_at) VALUES
  -- Nike <-> Marcus conversation
  ('msg_00000001-0000-0000-0000-000000000001', 'conv_0000001-0000-0000-0000-000000000001', 'pro_00000001-0000-0000-0000-000000000101', 'Hi Marcus! We loved your recent game day content. Would you be interested in extending our partnership into the spring semester?', NOW() - INTERVAL '14 days'),
  ('msg_00000001-0000-0000-0000-000000000002', 'conv_0000001-0000-0000-0000-000000000001', 'pro_00000001-0000-0000-0000-000000000001', 'Thanks for reaching out! I''d definitely be interested in discussing that. What did you have in mind?', NOW() - INTERVAL '13 days'),
  ('msg_00000001-0000-0000-0000-000000000003', 'conv_0000001-0000-0000-0000-000000000001', 'pro_00000001-0000-0000-0000-000000000101', 'We''re thinking a similar structure - monthly posts plus 2 campus events. We could also add some exclusive product drops for your followers.', NOW() - INTERVAL '12 days'),
  ('msg_00000001-0000-0000-0000-000000000004', 'conv_0000001-0000-0000-0000-000000000001', 'pro_00000001-0000-0000-0000-000000000001', 'That sounds great! The product drops would be really cool for my audience. Can you send over the details?', NOW() - INTERVAL '11 days'),

  -- Gatorade <-> Sarah conversation
  ('msg_00000001-0000-0000-0000-000000000005', 'conv_0000001-0000-0000-0000-000000000002', 'pro_00000001-0000-0000-0000-000000000102', 'Sarah, congratulations on being selected for our Scholar-Athlete Spotlight! When would work best for the video interview?', NOW() - INTERVAL '7 days'),
  ('msg_00000001-0000-0000-0000-000000000006', 'conv_0000001-0000-0000-0000-000000000002', 'pro_00000001-0000-0000-0000-000000000002', 'Thank you so much! I''m really excited about this opportunity. I''m free most afternoons after practice. Would next Tuesday work?', NOW() - INTERVAL '6 days'),
  ('msg_00000001-0000-0000-0000-000000000007', 'conv_0000001-0000-0000-0000-000000000002', 'pro_00000001-0000-0000-0000-000000000102', 'Tuesday at 3pm works perfectly! We''ll send over some interview prep questions beforehand.', NOW() - INTERVAL '5 days'),

  -- BodyArmor <-> Emma conversation
  ('msg_00000001-0000-0000-0000-000000000008', 'conv_0000001-0000-0000-0000-000000000003', 'pro_00000001-0000-0000-0000-000000000105', 'Hi Emma! We''ve been following your swimming career and would love to discuss a partnership. Are you currently available for new NIL deals?', NOW() - INTERVAL '3 days'),
  ('msg_00000001-0000-0000-0000-000000000009', 'conv_0000001-0000-0000-0000-000000000003', 'pro_00000001-0000-0000-0000-000000000004', 'Hi! Yes, I''m always open to hearing about new opportunities. What kind of partnership are you thinking?', NOW() - INTERVAL '2 days'),
  ('msg_00000001-0000-0000-0000-000000000010', 'conv_0000001-0000-0000-0000-000000000003', 'pro_00000001-0000-0000-0000-000000000105', 'We''re looking for a hydration ambassador who can create content around training and competition. Given your academic excellence and athletic achievements, you''d be perfect for our "Fuel Your Potential" campaign.', NOW() - INTERVAL '1 day');

-- ═══════════════════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO notifications (id, profile_id, type, title, message, data, read, created_at) VALUES
  -- Marcus Johnson notifications
  ('not_00000001-0000-0000-0000-000000000001', 'pro_00000001-0000-0000-0000-000000000001', 'deal', 'Payment Received', 'You received $1,250.00 from Nike Campus', '{"deal_id": "deal_0000001-0000-0000-0000-000000000001", "amount": 1250}', true, NOW() - INTERVAL '5 days'),
  ('not_00000001-0000-0000-0000-000000000002', 'pro_00000001-0000-0000-0000-000000000001', 'message', 'New Message', 'Nike Partnerships sent you a message', '{"conversation_id": "conv_0000001-0000-0000-0000-000000000001"}', true, NOW() - INTERVAL '11 days'),
  ('not_00000001-0000-0000-0000-000000000003', 'pro_00000001-0000-0000-0000-000000000001', 'opportunity', 'New Opportunity', 'A new opportunity matching your profile is available', '{"opportunity_id": "opp_00000001-0000-0000-0000-000000000002"}', false, NOW() - INTERVAL '2 days'),

  -- Sarah Chen notifications
  ('not_00000001-0000-0000-0000-000000000004', 'pro_00000001-0000-0000-0000-000000000002', 'deal', 'Deal Completed', 'Your Gatorade Scholar-Athlete Feature deal is now complete!', '{"deal_id": "deal_0000001-0000-0000-0000-000000000003"}', true, NOW() - INTERVAL '3 days'),
  ('not_00000001-0000-0000-0000-000000000005', 'pro_00000001-0000-0000-0000-000000000002', 'deal', 'Payment Received', 'You received $2,500.00 from Gatorade', '{"deal_id": "deal_0000001-0000-0000-0000-000000000003", "amount": 2500}', true, NOW() - INTERVAL '3 days'),

  -- Brand notifications
  ('not_00000001-0000-0000-0000-000000000006', 'pro_00000001-0000-0000-0000-000000000101', 'deal', 'Deliverable Submitted', 'Marcus Johnson submitted content for review', '{"deal_id": "deal_0000001-0000-0000-0000-000000000001"}', false, NOW() - INTERVAL '1 day'),
  ('not_00000001-0000-0000-0000-000000000007', 'pro_00000001-0000-0000-0000-000000000102', 'message', 'New Message', 'Sarah Chen replied to your message', '{"conversation_id": "conv_0000001-0000-0000-0000-000000000002"}', true, NOW() - INTERVAL '6 days');

-- ═══════════════════════════════════════════════════════════════════════════
-- ACTIVITY LOG
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO activity_log (id, profile_id, type, description, metadata, created_at) VALUES
  -- Marcus Johnson activity
  ('act_00000001-0000-0000-0000-000000000001', 'pro_00000001-0000-0000-0000-000000000001', 'deal_created', 'Started partnership with Nike Campus', '{"deal_id": "deal_0000001-0000-0000-0000-000000000001", "brand": "Nike Campus"}', NOW() - INTERVAL '60 days'),
  ('act_00000001-0000-0000-0000-000000000002', 'pro_00000001-0000-0000-0000-000000000001', 'payment', 'Received payment of $1,250.00', '{"amount": 1250, "brand": "Nike Campus"}', NOW() - INTERVAL '35 days'),
  ('act_00000001-0000-0000-0000-000000000003', 'pro_00000001-0000-0000-0000-000000000001', 'deliverable', 'Submitted social media content', '{"deal_id": "deal_0000001-0000-0000-0000-000000000001"}', NOW() - INTERVAL '20 days'),
  ('act_00000001-0000-0000-0000-000000000004', 'pro_00000001-0000-0000-0000-000000000001', 'payment', 'Received payment of $1,250.00', '{"amount": 1250, "brand": "Nike Campus"}', NOW() - INTERVAL '5 days'),
  ('act_00000001-0000-0000-0000-000000000005', 'pro_00000001-0000-0000-0000-000000000001', 'deal_created', 'Started partnership with Gatorade', '{"deal_id": "deal_0000001-0000-0000-0000-000000000002", "brand": "Gatorade"}', NOW() - INTERVAL '30 days'),

  -- Sarah Chen activity
  ('act_00000001-0000-0000-0000-000000000006', 'pro_00000001-0000-0000-0000-000000000002', 'deal_created', 'Started Scholar-Athlete Feature', '{"deal_id": "deal_0000001-0000-0000-0000-000000000003", "brand": "Gatorade"}', NOW() - INTERVAL '45 days'),
  ('act_00000001-0000-0000-0000-000000000007', 'pro_00000001-0000-0000-0000-000000000002', 'deal_completed', 'Completed Gatorade feature', '{"deal_id": "deal_0000001-0000-0000-0000-000000000003"}', NOW() - INTERVAL '15 days'),
  ('act_00000001-0000-0000-0000-000000000008', 'pro_00000001-0000-0000-0000-000000000002', 'payment', 'Received payment of $2,500.00', '{"amount": 2500, "brand": "Gatorade"}', NOW() - INTERVAL '12 days'),
  ('act_00000001-0000-0000-0000-000000000009', 'pro_00000001-0000-0000-0000-000000000002', 'deal_created', 'Started Financial Wellness Ambassador program', '{"deal_id": "deal_0000001-0000-0000-0000-000000000004", "brand": "First National Bank"}', NOW() - INTERVAL '30 days'),

  -- Emma Rodriguez activity
  ('act_00000001-0000-0000-0000-000000000010', 'pro_00000001-0000-0000-0000-000000000004', 'deal_created', 'Started Nike Swim partnership', '{"deal_id": "deal_0000001-0000-0000-0000-000000000006", "brand": "Nike Campus"}', NOW() - INTERVAL '90 days'),
  ('act_00000001-0000-0000-0000-000000000011', 'pro_00000001-0000-0000-0000-000000000004', 'payment', 'Received payment of $2,000.00', '{"amount": 2000, "brand": "Nike Campus"}', NOW() - INTERVAL '35 days'),
  ('act_00000001-0000-0000-0000-000000000012', 'pro_00000001-0000-0000-0000-000000000004', 'deal_accepted', 'Accepted BodyArmor partnership', '{"deal_id": "deal_0000001-0000-0000-0000-000000000007", "brand": "BodyArmor Sports"}', NOW() - INTERVAL '2 days'),
  ('act_00000001-0000-0000-0000-000000000013', 'pro_00000001-0000-0000-0000-000000000004', 'new_offer', 'Received partnership offer from BodyArmor', '{"brand": "BodyArmor Sports"}', NOW() - INTERVAL '3 days'),

  -- Brand activity
  ('act_00000001-0000-0000-0000-000000000014', 'pro_00000001-0000-0000-0000-000000000101', 'deal_created', 'Created deal with Marcus Johnson', '{"deal_id": "deal_0000001-0000-0000-0000-000000000001", "athlete": "Marcus Johnson"}', NOW() - INTERVAL '60 days'),
  ('act_00000001-0000-0000-0000-000000000015', 'pro_00000001-0000-0000-0000-000000000102', 'deal_completed', 'Completed Scholar-Athlete feature with Sarah Chen', '{"deal_id": "deal_0000001-0000-0000-0000-000000000003", "athlete": "Sarah Chen"}', NOW() - INTERVAL '15 days');

-- ═══════════════════════════════════════════════════════════════════════════
-- SUMMARY
-- ═══════════════════════════════════════════════════════════════════════════
--
-- This seed data includes:
--
-- SCHOOLS: 8 major universities (Texas, Duke, Stanford, Alabama, Michigan, UCLA, Florida, Ohio State)
-- SPORTS: 10 sports (Football, Basketball, Soccer, Baseball, Volleyball, Swimming, Track, Tennis, Gymnastics, Softball)
--
-- ATHLETES: 8 student-athletes with varying:
--   - Sports and positions
--   - GPAs (3.21 - 3.95)
--   - Years (Freshman - Senior)
--   - Social media presence
--   - Verification status
--
-- BRANDS: 5 brands across industries:
--   - Nike Campus (Apparel)
--   - Gatorade (Sports Nutrition)
--   - Chipotle (Food & Beverage)
--   - First National Bank (Financial Services)
--   - BodyArmor Sports (Sports Nutrition)
--
-- ATHLETIC DIRECTORS: 3 directors at Texas, Duke, and Stanford
--
-- CAMPAIGNS: 5 active/draft campaigns with various requirements
-- OPPORTUNITIES: 5 open opportunities for athletes to apply
-- DEALS: 10 deals in various statuses (active, completed, pending, accepted)
-- PAYMENTS: 9 payment records (completed and pending)
--
-- CONVERSATIONS: 3 message threads between athletes and brands
-- MESSAGES: 10 messages showing realistic NIL discussions
-- NOTIFICATIONS: 7 notifications for athletes and brands
-- ACTIVITY: 15 activity log entries
--
-- To use this data:
-- 1. First run schema.sql in Supabase SQL Editor
-- 2. Then run this seed.sql file
-- 3. Sign up real users through the app
-- 4. Update profile IDs to match auth.users IDs for testing
--
-- Alternatively, you can use Supabase Auth Admin API to create
-- users with these specific profile IDs for seamless testing.
-- ═══════════════════════════════════════════════════════════════════════════
