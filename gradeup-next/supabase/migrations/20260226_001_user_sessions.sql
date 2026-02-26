-- =====================================================================================
-- GradeUp NIL - User Sessions Schema
-- Version: 20260226_001
-- Description: Track user sessions for security management and session revocation
-- =====================================================================================

-- =====================================================================================
-- USER SESSIONS TABLE
-- =====================================================================================

-- User Sessions - tracks active sessions for each user
-- This allows users to view and revoke sessions from other devices
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Session identification
  refresh_token_hash TEXT, -- Hash of the refresh token (for correlation with Supabase auth)

  -- Device/client information
  device_name TEXT, -- e.g., "MacBook Pro", "iPhone 15"
  browser TEXT, -- e.g., "Chrome", "Safari", "Firefox"
  browser_version TEXT,
  operating_system TEXT, -- e.g., "macOS", "Windows", "iOS"

  -- Location information (derived from IP)
  ip_address INET,
  city TEXT,
  region TEXT, -- State/province
  country TEXT,
  location_display TEXT, -- Pre-formatted: "New York, USA"

  -- Session metadata
  is_current BOOLEAN DEFAULT FALSE, -- Marked true for the requesting session
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- When the session should auto-expire
  revoked_at TIMESTAMPTZ, -- If session was manually revoked
  revoked_by UUID REFERENCES profiles(id), -- Who revoked it (for audit)

  -- User agent string for additional context
  user_agent TEXT
);

-- =====================================================================================
-- INDEXES
-- =====================================================================================

-- Fast lookup by user
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);

-- Find active sessions for a user (exclude revoked)
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, revoked_at)
  WHERE revoked_at IS NULL;

-- Cleanup expired sessions
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at)
  WHERE revoked_at IS NULL;

-- Track most recent activity
CREATE INDEX idx_user_sessions_last_active ON user_sessions(last_active_at DESC);

-- =====================================================================================
-- ROW LEVEL SECURITY
-- =====================================================================================

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
  ON user_sessions
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own sessions (for revoking)
CREATE POLICY "Users can update own sessions"
  ON user_sessions
  FOR UPDATE
  USING (user_id = auth.uid());

-- Service role can insert sessions (called from API routes)
CREATE POLICY "Service role can insert sessions"
  ON user_sessions
  FOR INSERT
  WITH CHECK (true);

-- Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
  ON user_sessions
  FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================================================
-- HELPER FUNCTIONS
-- =====================================================================================

-- Function to create or update a session
CREATE OR REPLACE FUNCTION upsert_user_session(
  p_user_id UUID,
  p_device_name TEXT DEFAULT NULL,
  p_browser TEXT DEFAULT NULL,
  p_browser_version TEXT DEFAULT NULL,
  p_operating_system TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_refresh_token_hash TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
  v_location_display TEXT;
BEGIN
  -- Build location display string
  v_location_display := NULL;
  IF p_city IS NOT NULL THEN
    v_location_display := p_city;
    IF p_country IS NOT NULL THEN
      v_location_display := v_location_display || ', ' || p_country;
    END IF;
  ELSIF p_country IS NOT NULL THEN
    v_location_display := p_country;
  END IF;

  -- Insert new session
  INSERT INTO user_sessions (
    user_id,
    device_name,
    browser,
    browser_version,
    operating_system,
    ip_address,
    city,
    region,
    country,
    location_display,
    user_agent,
    refresh_token_hash,
    expires_at
  ) VALUES (
    p_user_id,
    p_device_name,
    p_browser,
    p_browser_version,
    p_operating_system,
    p_ip_address,
    p_city,
    p_region,
    p_country,
    v_location_display,
    p_user_agent,
    p_refresh_token_hash,
    NOW() + INTERVAL '30 days' -- Sessions expire after 30 days
  )
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke a session
CREATE OR REPLACE FUNCTION revoke_user_session(
  p_session_id UUID,
  p_revoked_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the session's user_id
  SELECT user_id INTO v_user_id
  FROM user_sessions
  WHERE id = p_session_id AND revoked_at IS NULL;

  IF v_user_id IS NULL THEN
    RETURN FALSE; -- Session not found or already revoked
  END IF;

  -- Ensure the revoking user owns the session or use the session owner
  IF p_revoked_by IS NULL THEN
    p_revoked_by := v_user_id;
  END IF;

  -- Mark session as revoked
  UPDATE user_sessions
  SET
    revoked_at = NOW(),
    revoked_by = p_revoked_by
  WHERE id = p_session_id AND revoked_at IS NULL;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired and old revoked sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions
  WHERE
    -- Remove expired sessions
    (expires_at < NOW() AND revoked_at IS NULL)
    OR
    -- Remove sessions revoked more than 30 days ago
    (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '30 days');

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

-- Trigger to update last_active_at when session is accessed
CREATE TRIGGER update_user_sessions_last_active
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  WHEN (OLD.last_active_at IS DISTINCT FROM NEW.last_active_at)
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON TABLE user_sessions IS 'Tracks active user sessions for security management';
COMMENT ON COLUMN user_sessions.refresh_token_hash IS 'SHA-256 hash of refresh token for correlation';
COMMENT ON COLUMN user_sessions.is_current IS 'True if this is the current requesting session';
COMMENT ON COLUMN user_sessions.revoked_at IS 'Timestamp when session was manually revoked';
COMMENT ON COLUMN user_sessions.revoked_by IS 'User who revoked the session (for audit trail)';
COMMENT ON FUNCTION upsert_user_session IS 'Creates a new session record with device and location info';
COMMENT ON FUNCTION revoke_user_session IS 'Marks a session as revoked';
COMMENT ON FUNCTION cleanup_expired_sessions IS 'Removes expired and old revoked sessions';
