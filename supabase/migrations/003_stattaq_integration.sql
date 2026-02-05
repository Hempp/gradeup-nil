-- GradeUp NIL Platform - StatTaq Integration
-- Version: 1.0.0
-- Description: Tables and functions for StatTaq real-time data sync

-- ============================================================================
-- STATTAQ LINKED ACCOUNTS
-- ============================================================================

-- Stores athlete connections to StatTaq
CREATE TABLE stattaq_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

    -- StatTaq identifiers
    stattaq_user_id VARCHAR(255) NOT NULL,
    stattaq_athlete_id VARCHAR(255), -- Their internal athlete ID

    -- OAuth tokens (encrypted in production via Vault)
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,

    -- Sync settings
    sync_enabled BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    last_sync_status VARCHAR(50), -- 'success', 'failed', 'partial'
    last_sync_error TEXT,

    -- What data to sync
    sync_social_metrics BOOLEAN DEFAULT true,
    sync_performance_stats BOOLEAN DEFAULT true,
    sync_achievements BOOLEAN DEFAULT true,

    -- Metadata
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    disconnected_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(athlete_id),
    UNIQUE(stattaq_user_id)
);

-- ============================================================================
-- STATTAQ DATA CACHE
-- ============================================================================

-- Cached data from StatTaq (updated via sync)
CREATE TABLE stattaq_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    stattaq_account_id UUID NOT NULL REFERENCES stattaq_accounts(id) ON DELETE CASCADE,

    -- Social metrics from StatTaq
    instagram_followers INTEGER,
    instagram_engagement_rate DECIMAL(5,2),
    twitter_followers INTEGER,
    twitter_engagement_rate DECIMAL(5,2),
    tiktok_followers INTEGER,
    tiktok_engagement_rate DECIMAL(5,2),
    youtube_subscribers INTEGER,
    total_social_reach INTEGER,

    -- Performance stats
    games_played INTEGER,
    games_started INTEGER,
    season_stats JSONB, -- Sport-specific stats
    career_stats JSONB,
    awards JSONB, -- Array of awards/honors

    -- NIL metrics from StatTaq
    estimated_nil_value DECIMAL(12,2),
    nil_ranking_national INTEGER,
    nil_ranking_sport INTEGER,
    nil_ranking_conference INTEGER,

    -- Media & Content
    media_mentions INTEGER,
    content_engagement_score DECIMAL(5,2),
    brand_affinity_score DECIMAL(5,2),

    -- Raw data for custom processing
    raw_data JSONB,

    -- Sync metadata
    data_timestamp TIMESTAMPTZ, -- When StatTaq generated this data
    synced_at TIMESTAMPTZ DEFAULT NOW(),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(athlete_id)
);

-- ============================================================================
-- STATTAQ SYNC LOG
-- ============================================================================

-- Audit trail of all sync operations
CREATE TABLE stattaq_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    stattaq_account_id UUID REFERENCES stattaq_accounts(id) ON DELETE SET NULL,

    sync_type VARCHAR(50) NOT NULL, -- 'full', 'social', 'stats', 'webhook'
    status VARCHAR(50) NOT NULL, -- 'started', 'success', 'failed', 'partial'

    -- Metrics
    records_fetched INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    duration_ms INTEGER,

    -- Error handling
    error_code VARCHAR(100),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Request/Response for debugging
    request_payload JSONB,
    response_summary JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STATTAQ WEBHOOK EVENTS
-- ============================================================================

-- Incoming webhooks from StatTaq
CREATE TABLE stattaq_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Webhook identification
    webhook_id VARCHAR(255), -- StatTaq's webhook ID
    event_type VARCHAR(100) NOT NULL, -- 'stats.updated', 'social.sync', 'nil.changed'

    -- Payload
    payload JSONB NOT NULL,
    signature VARCHAR(255), -- For verification

    -- Processing
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    processing_error TEXT,

    -- Matching
    stattaq_user_id VARCHAR(255),
    athlete_id UUID REFERENCES athletes(id) ON DELETE SET NULL,

    received_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_stattaq_accounts_athlete ON stattaq_accounts(athlete_id);
CREATE INDEX idx_stattaq_accounts_user ON stattaq_accounts(stattaq_user_id);
CREATE INDEX idx_stattaq_accounts_active ON stattaq_accounts(is_active, sync_enabled);

CREATE INDEX idx_stattaq_data_athlete ON stattaq_data(athlete_id);
CREATE INDEX idx_stattaq_data_synced ON stattaq_data(synced_at);

CREATE INDEX idx_stattaq_sync_athlete ON stattaq_sync_log(athlete_id, created_at);
CREATE INDEX idx_stattaq_sync_status ON stattaq_sync_log(status, created_at);

CREATE INDEX idx_stattaq_webhooks_processed ON stattaq_webhooks(processed, received_at);
CREATE INDEX idx_stattaq_webhooks_user ON stattaq_webhooks(stattaq_user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Update athlete social metrics from StatTaq data
CREATE OR REPLACE FUNCTION sync_stattaq_to_athlete()
RETURNS TRIGGER AS $$
BEGIN
    -- Update athlete's social metrics from StatTaq data
    UPDATE athletes SET
        instagram_followers = COALESCE(NEW.instagram_followers, instagram_followers),
        twitter_followers = COALESCE(NEW.twitter_followers, twitter_followers),
        tiktok_followers = COALESCE(NEW.tiktok_followers, tiktok_followers),
        -- Update NIL valuation if StatTaq provides it
        nil_valuation = COALESCE(NEW.estimated_nil_value, nil_valuation),
        updated_at = NOW()
    WHERE id = NEW.athlete_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_stattaq_to_athlete
    AFTER INSERT OR UPDATE ON stattaq_data
    FOR EACH ROW
    EXECUTE FUNCTION sync_stattaq_to_athlete();

-- Mark stale connections (no sync in 7 days)
CREATE OR REPLACE FUNCTION check_stattaq_connection_health()
RETURNS TABLE (
    athlete_id UUID,
    stattaq_user_id VARCHAR,
    last_sync_at TIMESTAMPTZ,
    days_since_sync INTEGER,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sa.athlete_id,
        sa.stattaq_user_id,
        sa.last_sync_at,
        EXTRACT(DAY FROM NOW() - sa.last_sync_at)::INTEGER as days_since_sync,
        CASE
            WHEN sa.last_sync_at IS NULL THEN 'never_synced'
            WHEN sa.last_sync_at < NOW() - INTERVAL '7 days' THEN 'stale'
            WHEN sa.last_sync_at < NOW() - INTERVAL '1 day' THEN 'warning'
            ELSE 'healthy'
        END as status
    FROM stattaq_accounts sa
    WHERE sa.is_active = true AND sa.sync_enabled = true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE stattaq_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stattaq_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE stattaq_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE stattaq_webhooks ENABLE ROW LEVEL SECURITY;

-- Athletes can manage their own StatTaq connection
CREATE POLICY "stattaq_accounts_athlete_own" ON stattaq_accounts
    FOR ALL USING (athlete_id = get_athlete_id())
    WITH CHECK (athlete_id = get_athlete_id());

-- Athletes can view their own StatTaq data
CREATE POLICY "stattaq_data_athlete_own" ON stattaq_data
    FOR SELECT USING (athlete_id = get_athlete_id());

-- Athletes can view their sync history
CREATE POLICY "stattaq_sync_athlete_view" ON stattaq_sync_log
    FOR SELECT USING (athlete_id = get_athlete_id());

-- Admin full access
CREATE POLICY "stattaq_accounts_admin" ON stattaq_accounts FOR ALL USING (is_admin());
CREATE POLICY "stattaq_data_admin" ON stattaq_data FOR ALL USING (is_admin());
CREATE POLICY "stattaq_sync_admin" ON stattaq_sync_log FOR ALL USING (is_admin());
CREATE POLICY "stattaq_webhooks_admin" ON stattaq_webhooks FOR ALL USING (is_admin());

-- Service role can insert webhooks
CREATE POLICY "stattaq_webhooks_service_insert" ON stattaq_webhooks
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE stattaq_accounts IS 'Linked StatTaq accounts for athlete data sync';
COMMENT ON TABLE stattaq_data IS 'Cached athlete data from StatTaq (social, stats, NIL metrics)';
COMMENT ON TABLE stattaq_sync_log IS 'Audit log of all StatTaq sync operations';
COMMENT ON TABLE stattaq_webhooks IS 'Incoming webhook events from StatTaq';
COMMENT ON FUNCTION sync_stattaq_to_athlete IS 'Automatically updates athlete metrics when StatTaq data is synced';
