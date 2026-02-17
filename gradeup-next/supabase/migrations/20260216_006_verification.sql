-- =====================================================================================
-- GradeUp NIL - Verification Schema
-- Version: 006
-- Description: Verification requests, history, and document tracking
-- =====================================================================================

-- =====================================================================================
-- ENUM TYPES
-- =====================================================================================

-- Verification types
CREATE TYPE verification_type AS ENUM (
  'enrollment',      -- Student enrollment verification
  'sport',           -- Sport participation verification
  'grades',          -- GPA/transcript verification
  'identity',        -- Identity verification
  'stats',           -- Athletic statistics verification
  'ncaa_eligibility' -- NCAA eligibility verification
);

-- Verification status
CREATE TYPE verification_status AS ENUM (
  'pending',    -- Submitted, awaiting review
  'in_review',  -- Currently being reviewed
  'approved',   -- Verification approved
  'rejected',   -- Verification rejected
  'expired',    -- Verification expired
  'revoked'     -- Previously approved but revoked
);

-- =====================================================================================
-- VERIFICATION REQUESTS TABLE
-- =====================================================================================

CREATE TABLE verification_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

  -- Verification details
  type verification_type NOT NULL,
  status verification_status DEFAULT 'pending',
  notes TEXT,

  -- Documents (array of storage URLs)
  documents TEXT[],

  -- Submission
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_by UUID REFERENCES profiles(id),

  -- Review
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,

  -- Validity
  valid_from TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Metadata
  verification_data JSONB DEFAULT '{}',  -- Additional verification data

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- VERIFICATION HISTORY TABLE
-- =====================================================================================

-- Audit trail for all verification actions
CREATE TABLE verification_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  request_id UUID REFERENCES verification_requests(id) ON DELETE SET NULL,

  -- Action details
  type verification_type NOT NULL,
  action TEXT NOT NULL,  -- submitted, approved, rejected, revoked, expired
  actor_id UUID REFERENCES profiles(id),
  notes TEXT,

  -- Snapshot of state
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- VERIFICATION DOCUMENTS TABLE
-- =====================================================================================

-- Track individual documents submitted for verification
CREATE TABLE verification_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES verification_requests(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

  -- Document info
  document_type TEXT NOT NULL,  -- transcript, enrollment_letter, id_card, etc.
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,

  -- Document status
  is_verified BOOLEAN DEFAULT FALSE,
  verification_notes TEXT,

  -- Timestamps
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

-- =====================================================================================
-- INDEXES
-- =====================================================================================

-- Verification request indexes
CREATE INDEX idx_verification_requests_athlete_id ON verification_requests(athlete_id);
CREATE INDEX idx_verification_requests_status ON verification_requests(status);
CREATE INDEX idx_verification_requests_type ON verification_requests(type);
CREATE INDEX idx_verification_requests_pending ON verification_requests(status)
  WHERE status IN ('pending', 'in_review');
CREATE INDEX idx_verification_requests_reviewed_by ON verification_requests(reviewed_by);
CREATE INDEX idx_verification_requests_expires ON verification_requests(expires_at)
  WHERE expires_at IS NOT NULL;

-- Verification history indexes
CREATE INDEX idx_verification_history_athlete_id ON verification_history(athlete_id);
CREATE INDEX idx_verification_history_request_id ON verification_history(request_id);
CREATE INDEX idx_verification_history_type ON verification_history(type);
CREATE INDEX idx_verification_history_created_at ON verification_history(created_at DESC);
CREATE INDEX idx_verification_history_actor ON verification_history(actor_id);

-- Verification document indexes
CREATE INDEX idx_verification_documents_request_id ON verification_documents(request_id);
CREATE INDEX idx_verification_documents_athlete_id ON verification_documents(athlete_id);

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

CREATE TRIGGER update_verification_requests_updated_at
  BEFORE UPDATE ON verification_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- HELPER FUNCTIONS
-- =====================================================================================

-- Function to update athlete verification flags when request is approved
CREATE OR REPLACE FUNCTION update_athlete_verification_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Update the corresponding verification flag on the athlete
    CASE NEW.type
      WHEN 'enrollment' THEN
        UPDATE athletes SET enrollment_verified = TRUE, updated_at = NOW()
        WHERE id = NEW.athlete_id;
      WHEN 'sport' THEN
        UPDATE athletes SET sport_verified = TRUE, updated_at = NOW()
        WHERE id = NEW.athlete_id;
      WHEN 'grades' THEN
        UPDATE athletes SET grades_verified = TRUE, updated_at = NOW()
        WHERE id = NEW.athlete_id;
      WHEN 'identity' THEN
        UPDATE athletes SET identity_verified = TRUE, updated_at = NOW()
        WHERE id = NEW.athlete_id;
      ELSE
        -- Other verification types don't have specific flags
        NULL;
    END CASE;

    -- Log to verification history
    INSERT INTO verification_history (athlete_id, request_id, type, action, actor_id, created_at)
    VALUES (NEW.athlete_id, NEW.id, NEW.type, 'approved', NEW.reviewed_by, NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_athlete_verification_trigger
  AFTER UPDATE ON verification_requests
  FOR EACH ROW EXECUTE FUNCTION update_athlete_verification_on_approval();

-- Function to revoke verification
CREATE OR REPLACE FUNCTION revoke_athlete_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'revoked' AND OLD.status = 'approved' THEN
    -- Update the corresponding verification flag on the athlete
    CASE NEW.type
      WHEN 'enrollment' THEN
        UPDATE athletes SET enrollment_verified = FALSE, updated_at = NOW()
        WHERE id = NEW.athlete_id;
      WHEN 'sport' THEN
        UPDATE athletes SET sport_verified = FALSE, updated_at = NOW()
        WHERE id = NEW.athlete_id;
      WHEN 'grades' THEN
        UPDATE athletes SET grades_verified = FALSE, updated_at = NOW()
        WHERE id = NEW.athlete_id;
      WHEN 'identity' THEN
        UPDATE athletes SET identity_verified = FALSE, updated_at = NOW()
        WHERE id = NEW.athlete_id;
      ELSE
        NULL;
    END CASE;

    -- Log to verification history
    INSERT INTO verification_history (athlete_id, request_id, type, action, actor_id, notes, created_at)
    VALUES (NEW.athlete_id, NEW.id, NEW.type, 'revoked', NEW.reviewed_by, NEW.rejection_reason, NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER revoke_athlete_verification_trigger
  AFTER UPDATE ON verification_requests
  FOR EACH ROW EXECUTE FUNCTION revoke_athlete_verification();

-- Function to check verification status for an athlete
CREATE OR REPLACE FUNCTION get_athlete_verification_status(p_athlete_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'enrollment_verified', enrollment_verified,
    'sport_verified', sport_verified,
    'grades_verified', grades_verified,
    'identity_verified', identity_verified,
    'fully_verified', (enrollment_verified AND sport_verified AND grades_verified AND identity_verified)
  ) INTO result
  FROM athletes
  WHERE id = p_athlete_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON TABLE verification_requests IS 'Verification requests submitted by athletes';
COMMENT ON TABLE verification_history IS 'Audit trail of all verification actions';
COMMENT ON TABLE verification_documents IS 'Documents submitted for verification requests';
COMMENT ON COLUMN verification_requests.verification_data IS 'Additional data like GPA value, enrollment date, etc.';
COMMENT ON COLUMN verification_requests.expires_at IS 'When the verification expires (e.g., semester-based)';
