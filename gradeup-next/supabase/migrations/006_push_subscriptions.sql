-- Push notification subscriptions
-- Stores Web Push API subscription data for each user's browser/device

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Enable Row Level Security
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own subscriptions
CREATE POLICY "Users can manage their own subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- Index for faster lookups by user_id
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

-- Comment on table
COMMENT ON TABLE push_subscriptions IS 'Stores Web Push API subscription data for browser push notifications';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'The push service endpoint URL';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'The P-256 public key for encryption';
COMMENT ON COLUMN push_subscriptions.auth IS 'The authentication secret';
