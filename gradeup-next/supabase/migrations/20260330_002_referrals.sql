-- ═══════════════════════════════════════════════════════════════════════════
-- REFERRAL SYSTEM — Athlete-to-Athlete Viral Growth
-- Tracks referral codes, signups, first deals, and bonus payouts
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE referral_status AS ENUM ('pending', 'signed_up', 'first_deal', 'bonus_paid');

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES athletes(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  status referral_status NOT NULL DEFAULT 'pending',
  referrer_bonus_cents INTEGER NOT NULL DEFAULT 2500,
  referee_bonus_cents INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_at TIMESTAMPTZ,
  bonus_paid_at TIMESTAMPTZ,

  UNIQUE(referral_code, referred_id)
);

-- Index for fast code lookups
CREATE INDEX idx_referrals_code ON referrals(referral_code);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);

-- RLS Policies
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Athletes can view their own referrals
CREATE POLICY "Athletes can view own referrals"
  ON referrals FOR SELECT
  USING (
    referrer_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
    OR referred_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
  );

-- System can insert referrals (via service role)
CREATE POLICY "Authenticated users can create referrals"
  ON referrals FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
