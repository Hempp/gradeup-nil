-- =====================================================================================
-- GradeUp NIL - Payments Schema
-- Version: 007
-- Description: Payment accounts, payments, and payout tracking
-- =====================================================================================

-- =====================================================================================
-- ENUM TYPES
-- =====================================================================================

-- Payment status
CREATE TYPE payment_status AS ENUM (
  'pending',     -- Payment created, awaiting processing
  'processing',  -- Payment being processed
  'completed',   -- Payment successful
  'failed',      -- Payment failed
  'refunded',    -- Payment refunded
  'cancelled'    -- Payment cancelled
);

-- Payment method types
CREATE TYPE payment_method AS ENUM (
  'bank_transfer',
  'paypal',
  'venmo',
  'check',
  'stripe',
  'wire_transfer'
);

-- =====================================================================================
-- PAYMENT ACCOUNTS TABLE
-- =====================================================================================

-- Athlete payout method accounts
CREATE TABLE payment_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Account type and details
  account_type payment_method NOT NULL,
  account_details JSONB NOT NULL DEFAULT '{}',  -- Encrypted/masked details

  -- Status
  is_primary BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,

  -- For bank accounts
  bank_name TEXT,
  account_last_four TEXT,  -- Last 4 digits for display

  -- For PayPal/Venmo
  external_email TEXT,

  -- Stripe Connect
  stripe_account_id TEXT,
  stripe_account_status TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- PAYMENTS TABLE
-- =====================================================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

  -- Payment details
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status payment_status DEFAULT 'pending',

  -- Payment method used
  payment_method payment_method,
  payment_account_id UUID REFERENCES payment_accounts(id) ON DELETE SET NULL,

  -- Scheduling
  scheduled_date DATE,
  due_date DATE,

  -- Processing details
  processor TEXT,  -- stripe, paypal, manual
  processor_payment_id TEXT,  -- External payment ID
  processor_fee NUMERIC(10,2) DEFAULT 0,

  -- Completion
  paid_at TIMESTAMPTZ,
  confirmation_number TEXT,

  -- Failure handling
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,

  -- Notes
  notes TEXT,
  internal_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- PAYMENT MILESTONES TABLE
-- =====================================================================================

-- For deals with multiple payment milestones
CREATE TABLE payment_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,

  -- Milestone details
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  percentage NUMERIC(5,2),  -- Percentage of total deal

  -- Status
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,

  -- Timeline
  due_date DATE,
  trigger_event TEXT,  -- e.g., 'deal_signed', 'deliverable_approved', 'campaign_end'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- PAYMENT DISPUTES TABLE
-- =====================================================================================

CREATE TABLE payment_disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,

  -- Parties
  raised_by UUID NOT NULL REFERENCES profiles(id),
  against UUID NOT NULL REFERENCES profiles(id),

  -- Dispute details
  reason TEXT NOT NULL,
  description TEXT,
  evidence_urls TEXT[],

  -- Resolution
  status TEXT DEFAULT 'open',  -- open, under_review, resolved, escalated
  resolution TEXT,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- INDEXES
-- =====================================================================================

-- Payment account indexes
CREATE INDEX idx_payment_accounts_user_id ON payment_accounts(user_id);
CREATE INDEX idx_payment_accounts_primary ON payment_accounts(is_primary) WHERE is_primary = TRUE;
CREATE INDEX idx_payment_accounts_verified ON payment_accounts(is_verified) WHERE is_verified = TRUE;
CREATE INDEX idx_payment_accounts_stripe ON payment_accounts(stripe_account_id) WHERE stripe_account_id IS NOT NULL;

-- Payment indexes
CREATE INDEX idx_payments_athlete_id ON payments(athlete_id);
CREATE INDEX idx_payments_deal_id ON payments(deal_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX idx_payments_scheduled ON payments(scheduled_date) WHERE scheduled_date IS NOT NULL;
CREATE INDEX idx_payments_pending ON payments(status) WHERE status = 'pending';
CREATE INDEX idx_payments_processor ON payments(processor, processor_payment_id);

-- Payment milestone indexes
CREATE INDEX idx_payment_milestones_deal_id ON payment_milestones(deal_id);
CREATE INDEX idx_payment_milestones_payment_id ON payment_milestones(payment_id);
CREATE INDEX idx_payment_milestones_due_date ON payment_milestones(due_date);
CREATE INDEX idx_payment_milestones_incomplete ON payment_milestones(is_completed) WHERE is_completed = FALSE;

-- Payment dispute indexes
CREATE INDEX idx_payment_disputes_payment_id ON payment_disputes(payment_id);
CREATE INDEX idx_payment_disputes_deal_id ON payment_disputes(deal_id);
CREATE INDEX idx_payment_disputes_status ON payment_disputes(status);
CREATE INDEX idx_payment_disputes_raised_by ON payment_disputes(raised_by);

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

CREATE TRIGGER update_payment_accounts_updated_at
  BEFORE UPDATE ON payment_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_milestones_updated_at
  BEFORE UPDATE ON payment_milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_disputes_updated_at
  BEFORE UPDATE ON payment_disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- HELPER FUNCTIONS
-- =====================================================================================

-- Function to calculate total earnings for an athlete
CREATE OR REPLACE FUNCTION get_athlete_total_earnings(p_athlete_id UUID)
RETURNS NUMERIC(12,2) AS $$
DECLARE
  total NUMERIC(12,2);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total
  FROM payments
  WHERE athlete_id = p_athlete_id AND status = 'completed';

  RETURN total;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate pending earnings for an athlete
CREATE OR REPLACE FUNCTION get_athlete_pending_earnings(p_athlete_id UUID)
RETURNS NUMERIC(12,2) AS $$
DECLARE
  total NUMERIC(12,2);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total
  FROM payments
  WHERE athlete_id = p_athlete_id AND status IN ('pending', 'processing');

  RETURN total;
END;
$$ LANGUAGE plpgsql STABLE;

-- Ensure only one primary payment account per user
CREATE OR REPLACE FUNCTION ensure_single_primary_payment_account()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = TRUE THEN
    UPDATE payment_accounts
    SET is_primary = FALSE
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_primary = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_primary_account_trigger
  BEFORE INSERT OR UPDATE ON payment_accounts
  FOR EACH ROW
  WHEN (NEW.is_primary = TRUE)
  EXECUTE FUNCTION ensure_single_primary_payment_account();

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON TABLE payment_accounts IS 'Payout methods configured by athletes';
COMMENT ON TABLE payments IS 'Individual payment records for deals';
COMMENT ON TABLE payment_milestones IS 'Multi-payment milestones for deals';
COMMENT ON TABLE payment_disputes IS 'Payment dispute tracking';
COMMENT ON COLUMN payment_accounts.account_details IS 'JSONB containing account details (should be encrypted at rest)';
COMMENT ON COLUMN payments.processor_payment_id IS 'External payment processor transaction ID';
