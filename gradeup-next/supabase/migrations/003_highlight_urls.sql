-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Add highlight_urls column to athletes table
-- Purpose: Allow athletes to add YouTube/TikTok highlight tape links
-- ═══════════════════════════════════════════════════════════════════════════

-- Add highlight_urls JSONB column to athletes table
-- This stores an array of video links with the structure:
-- [{ id: string, platform: 'youtube' | 'tiktok', url: string, title?: string, added_at: string }]
ALTER TABLE athletes
ADD COLUMN IF NOT EXISTS highlight_urls JSONB DEFAULT '[]'::jsonb;

-- Create a GIN index for efficient querying of the JSONB column
CREATE INDEX IF NOT EXISTS idx_athletes_highlight_urls
ON athletes USING gin (highlight_urls);

-- Add comment for documentation
COMMENT ON COLUMN athletes.highlight_urls IS 'Array of highlight video URLs (YouTube/TikTok) stored as JSONB';
