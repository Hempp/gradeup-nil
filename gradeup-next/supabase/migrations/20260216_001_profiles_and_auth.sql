-- =====================================================================================
-- GradeUp NIL - Profiles and Authentication Schema
-- Version: 001
-- Description: User profiles linked to auth.users and core enums
-- =====================================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================================
-- CORE ENUM TYPES
-- =====================================================================================

-- User roles in the system
CREATE TYPE user_role AS ENUM ('athlete', 'brand', 'athletic_director', 'admin');

-- Academic year classification
CREATE TYPE academic_year AS ENUM ('freshman', 'sophomore', 'junior', 'senior', 'graduate', 'other');

-- =====================================================================================
-- PROFILES TABLE
-- =====================================================================================

-- Profiles (extends Supabase auth.users)
-- This is the central user profile linked to Supabase authentication
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 0,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- INDEXES
-- =====================================================================================

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_active ON profiles(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_profiles_last_login ON profiles(last_login_at DESC NULLS LAST);

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- HELPER FUNCTIONS
-- =====================================================================================

-- Function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
DECLARE
  user_role_value user_role;
BEGIN
  SELECT role INTO user_role_value
  FROM profiles
  WHERE id = auth.uid();

  RETURN user_role_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION has_role(required_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN has_role('admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth.users with role-based access';
COMMENT ON COLUMN profiles.role IS 'User role determining access permissions and dashboard type';
COMMENT ON COLUMN profiles.preferences IS 'User preferences as JSON (notification settings, theme, etc.)';
COMMENT ON COLUMN profiles.onboarding_completed IS 'Whether user has completed the onboarding flow';
