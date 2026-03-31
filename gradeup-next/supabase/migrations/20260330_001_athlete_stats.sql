-- ═══════════════════════════════════════════════════════════════════════════
-- ATHLETE STATS TABLE — StatsTaq Integration
-- Stores athletic performance data (self-reported, coach-verified, or synced from StatsTaq)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE stat_source AS ENUM ('statstaq', 'ncaa', 'self_reported', 'coach_verified');

CREATE TABLE IF NOT EXISTS athlete_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  season TEXT NOT NULL,
  sport TEXT NOT NULL,
  source stat_source NOT NULL DEFAULT 'self_reported',
  verified BOOLEAN NOT NULL DEFAULT false,
  stats JSONB NOT NULL DEFAULT '{}',
  highlights JSONB NOT NULL DEFAULT '[]',
  statstaq_id TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(athlete_id, season)
);

-- Index for fast lookups by athlete
CREATE INDEX idx_athlete_stats_athlete_id ON athlete_stats(athlete_id);
CREATE INDEX idx_athlete_stats_season ON athlete_stats(season);

-- RLS Policies
ALTER TABLE athlete_stats ENABLE ROW LEVEL SECURITY;

-- Athletes can read their own stats
CREATE POLICY "Athletes can view own stats"
  ON athlete_stats FOR SELECT
  USING (
    athlete_id IN (
      SELECT id FROM athletes WHERE profile_id = auth.uid()
    )
  );

-- Athletes can insert/update their own stats
CREATE POLICY "Athletes can manage own stats"
  ON athlete_stats FOR ALL
  USING (
    athlete_id IN (
      SELECT id FROM athletes WHERE profile_id = auth.uid()
    )
  );

-- Brands and directors can view all athlete stats (public data)
CREATE POLICY "Authenticated users can view athlete stats"
  ON athlete_stats FOR SELECT
  USING (auth.role() = 'authenticated');

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_athlete_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER athlete_stats_updated_at
  BEFORE UPDATE ON athlete_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_athlete_stats_updated_at();
