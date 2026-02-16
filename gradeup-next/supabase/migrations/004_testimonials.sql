-- =====================================================================================
-- GradeUp NIL - Testimonials Table Migration
-- Version: 004
-- Description: Adds testimonials table for storing customer testimonials on landing page
-- =====================================================================================

-- =====================================================================================
-- TESTIMONIALS TABLE
-- =====================================================================================

CREATE TABLE testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL, -- e.g., "Student Athlete", "Brand Partner", "Football, Ohio State"
  author_image TEXT, -- URL to avatar/profile image
  content TEXT NOT NULL, -- The testimonial quote
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  featured BOOLEAN DEFAULT FALSE, -- Whether to show on landing page
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- INDEXES
-- =====================================================================================

-- Index for featured testimonials (used by landing page query)
CREATE INDEX idx_testimonials_featured ON testimonials(featured) WHERE featured = TRUE;

-- Index for ordering by creation date
CREATE INDEX idx_testimonials_created_at ON testimonials(created_at DESC);

-- =====================================================================================
-- ROW LEVEL SECURITY
-- =====================================================================================

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Testimonials are publicly readable (for landing page)
CREATE POLICY "Testimonials are publicly readable"
  ON testimonials FOR SELECT
  USING (TRUE);

-- Only admins can insert/update/delete testimonials (managed through Supabase dashboard or admin)
-- This is handled by default RLS - no public write access

-- =====================================================================================
-- UPDATED_AT TRIGGER
-- =====================================================================================

CREATE TRIGGER update_testimonials_updated_at
  BEFORE UPDATE ON testimonials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- SEED DATA - Initial testimonials from mock data
-- =====================================================================================

INSERT INTO testimonials (author_name, author_role, author_image, content, rating, featured) VALUES
  (
    'Jasmine Taylor',
    'Women''s Basketball, Stanford',
    'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100&h=100&fit=crop&crop=face',
    'I was getting generic offers for $200 posts. After verifying my 3.9 GPA on GradeUp, a tutoring company reached out with a $3,500 semester deal. They specifically wanted someone who could represent academic excellence.',
    5,
    TRUE
  ),
  (
    'Marcus Thompson',
    'Football, Ohio State',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face',
    'My academic advisor actually recommended GradeUp. Within two weeks, I had three brand meetings. The verification process took 10 minutes and my first deal closed in 8 days.',
    5,
    TRUE
  ),
  (
    'Rachel Kim',
    'Brand Partnerships, Hydrow',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face',
    'We''ve tried three NIL platforms. GradeUp is the only one where athletes actually respond and show up prepared. The GPA filter saves us hours of vetting. Our campaign ROI increased 340%.',
    5,
    TRUE
  );

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================

COMMENT ON TABLE testimonials IS 'Customer testimonials displayed on landing page and marketing materials';
