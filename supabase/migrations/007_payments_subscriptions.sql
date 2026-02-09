-- GradeUp NIL Platform - Payments & Subscriptions Schema
-- Version: 1.0.0
-- Description: Stripe Connect integration for marketplace payments
-- NEXUS-PRIME: SUPA-MASTER + CIPHER deployment

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Payment status
CREATE TYPE payment_status AS ENUM (
    'pending',           -- Payment intent created
    'processing',        -- Payment being processed
    'requires_action',   -- 3D Secure or additional auth needed
    'succeeded',         -- Payment successful
    'failed',            -- Payment failed
    'refunded',          -- Full refund issued
    'partially_refunded' -- Partial refund issued
);

-- Payout status
CREATE TYPE payout_status AS ENUM (
    'pending',      -- Scheduled for payout
    'in_transit',   -- Payout initiated
    'paid',         -- Athlete received funds
    'failed',       -- Payout failed
    'canceled'      -- Payout canceled
);

-- Subscription tier
CREATE TYPE subscription_tier AS ENUM (
    'free',         -- Limited access
    'starter',      -- $99/month - 5 athlete connections
    'growth',       -- $299/month - 25 athlete connections
    'enterprise'    -- $999/month - Unlimited + API access
);

-- Subscription status
CREATE TYPE subscription_status AS ENUM (
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'incomplete'
);

-- ============================================================================
-- TABLES: Stripe Connected Accounts
-- ============================================================================

-- Athlete Stripe Connect accounts (for receiving payouts)
CREATE TABLE stripe_connected_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

    -- Stripe Connect data
    stripe_account_id VARCHAR(255) NOT NULL UNIQUE,
    account_type VARCHAR(50) DEFAULT 'express', -- 'express', 'standard', 'custom'

    -- Onboarding status
    details_submitted BOOLEAN DEFAULT false,
    charges_enabled BOOLEAN DEFAULT false,
    payouts_enabled BOOLEAN DEFAULT false,

    -- Account metadata
    country VARCHAR(2) DEFAULT 'US',
    default_currency VARCHAR(3) DEFAULT 'usd',

    -- Payout schedule
    payout_schedule_interval VARCHAR(20) DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly'
    payout_schedule_anchor INTEGER, -- Day of week (0-6) or day of month (1-31)

    -- Tax info
    tax_id_provided BOOLEAN DEFAULT false,
    tax_form_w9_completed BOOLEAN DEFAULT false,

    -- Balance
    available_balance DECIMAL(12,2) DEFAULT 0,
    pending_balance DECIMAL(12,2) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(athlete_id)
);

-- Brand Stripe customers (for making payments)
CREATE TABLE stripe_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,

    -- Stripe data
    stripe_customer_id VARCHAR(255) NOT NULL UNIQUE,

    -- Default payment method
    default_payment_method_id VARCHAR(255),

    -- Billing info
    billing_email VARCHAR(255),
    billing_name VARCHAR(255),
    billing_address JSONB,

    -- Tax
    tax_exempt BOOLEAN DEFAULT false,
    tax_ids JSONB, -- Array of tax IDs

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(brand_id)
);

-- ============================================================================
-- TABLES: Payments
-- ============================================================================

-- Deal payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE RESTRICT,

    -- Participants
    brand_id UUID NOT NULL REFERENCES brands(id),
    athlete_id UUID NOT NULL REFERENCES athletes(id),

    -- Stripe references
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_charge_id VARCHAR(255),
    stripe_transfer_id VARCHAR(255), -- Transfer to connected account

    -- Amounts (all in cents for precision)
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    platform_fee_cents INTEGER NOT NULL DEFAULT 0,
    athlete_amount_cents INTEGER NOT NULL,

    -- Fee calculation (stored for audit trail)
    platform_fee_percent DECIMAL(5,2) DEFAULT 12.00, -- 12% platform fee

    -- Currency
    currency VARCHAR(3) DEFAULT 'usd',

    -- Status
    status payment_status DEFAULT 'pending',

    -- Processing details
    payment_method_type VARCHAR(50), -- 'card', 'ach', 'wire'
    card_last_four VARCHAR(4),
    card_brand VARCHAR(20),

    -- Error handling
    failure_code VARCHAR(100),
    failure_message TEXT,

    -- Timestamps
    paid_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refunds
CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,

    -- Stripe reference
    stripe_refund_id VARCHAR(255) UNIQUE,

    -- Amount
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),

    -- Reason
    reason VARCHAR(50), -- 'duplicate', 'fraudulent', 'requested_by_customer', 'other'
    description TEXT,

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'succeeded', 'failed', 'canceled'

    -- Initiated by
    initiated_by UUID REFERENCES profiles(id),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLES: Payouts
-- ============================================================================

-- Athlete payouts
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE RESTRICT,
    stripe_account_id UUID REFERENCES stripe_connected_accounts(id),

    -- Stripe reference
    stripe_payout_id VARCHAR(255) UNIQUE,

    -- Amount
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    currency VARCHAR(3) DEFAULT 'usd',

    -- Status
    status payout_status DEFAULT 'pending',

    -- Payout details
    destination_type VARCHAR(50), -- 'bank_account', 'card'
    arrival_date DATE,

    -- Error handling
    failure_code VARCHAR(100),
    failure_message TEXT,

    -- Timestamps
    initiated_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payout line items (which payments contributed to this payout)
CREATE TABLE payout_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payout_id UUID NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,

    amount_cents INTEGER NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLES: Brand Subscriptions
-- ============================================================================

-- Subscription plans
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Plan details
    name VARCHAR(100) NOT NULL,
    tier subscription_tier NOT NULL UNIQUE,
    description TEXT,

    -- Pricing
    price_cents_monthly INTEGER NOT NULL,
    price_cents_yearly INTEGER, -- Discount for annual

    -- Stripe references
    stripe_product_id VARCHAR(255),
    stripe_price_id_monthly VARCHAR(255),
    stripe_price_id_yearly VARCHAR(255),

    -- Features
    max_athlete_connections INTEGER, -- NULL = unlimited
    max_active_campaigns INTEGER,
    api_access BOOLEAN DEFAULT false,
    priority_support BOOLEAN DEFAULT false,
    custom_branding BOOLEAN DEFAULT false,
    analytics_dashboard BOOLEAN DEFAULT false,

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brand subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),

    -- Stripe reference
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_customer_id UUID REFERENCES stripe_customers(id),

    -- Status
    status subscription_status DEFAULT 'incomplete',

    -- Billing period
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- 'monthly', 'yearly'
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,

    -- Trial
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,

    -- Cancellation
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMPTZ,

    -- Usage tracking
    athlete_connections_used INTEGER DEFAULT 0,
    campaigns_used INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription usage events
CREATE TABLE subscription_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,

    -- Event type
    event_type VARCHAR(50) NOT NULL, -- 'athlete_connection', 'campaign_created', 'api_call'

    -- Usage details
    quantity INTEGER DEFAULT 1,
    metadata JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLES: Earnings & Financial Reports
-- ============================================================================

-- Athlete earnings summary (materialized for performance)
CREATE TABLE athlete_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

    -- Year tracking
    year INTEGER NOT NULL,
    month INTEGER, -- NULL for yearly totals

    -- Earnings
    gross_earnings_cents INTEGER DEFAULT 0,
    platform_fees_cents INTEGER DEFAULT 0,
    net_earnings_cents INTEGER DEFAULT 0,

    -- Counts
    deals_completed INTEGER DEFAULT 0,

    -- Payouts
    payouts_total_cents INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(athlete_id, year, month)
);

-- Platform revenue tracking
CREATE TABLE platform_revenue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Period
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,

    -- Transaction fees (12% of deal volume)
    transaction_fees_cents INTEGER DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,

    -- Subscription revenue
    subscription_revenue_cents INTEGER DEFAULT 0,
    subscribers_count INTEGER DEFAULT 0,

    -- Totals
    total_revenue_cents INTEGER DEFAULT 0,

    -- Volume metrics
    gross_deal_volume_cents INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(year, month)
);

-- ============================================================================
-- TABLES: Tax Reporting
-- ============================================================================

-- 1099 tax forms
CREATE TABLE tax_forms_1099 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

    -- Tax year
    tax_year INTEGER NOT NULL,

    -- Form status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'generated', 'sent', 'filed'

    -- Amounts
    gross_payments_cents INTEGER NOT NULL,

    -- Stripe Tax reference
    stripe_tax_form_id VARCHAR(255),
    form_url TEXT,

    -- Recipient info (at time of generation)
    recipient_name VARCHAR(255),
    recipient_address JSONB,
    recipient_tin_last_four VARCHAR(4),

    -- Timestamps
    generated_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(athlete_id, tax_year)
);

-- ============================================================================
-- SEED: Subscription Plans
-- ============================================================================

INSERT INTO subscription_plans (name, tier, description, price_cents_monthly, price_cents_yearly, max_athlete_connections, max_active_campaigns, api_access, priority_support, analytics_dashboard, sort_order) VALUES
('Free', 'free', 'Browse athletes and create 1 campaign', 0, 0, 1, 1, false, false, false, 0),
('Starter', 'starter', 'Perfect for small businesses starting with NIL', 9900, 95000, 5, 3, false, false, true, 1),
('Growth', 'growth', 'Scale your NIL campaigns with more athletes', 29900, 299000, 25, 10, false, true, true, 2),
('Enterprise', 'enterprise', 'Unlimited access with API and custom features', 99900, 999000, NULL, NULL, true, true, true, 3);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Payments
CREATE INDEX idx_payments_deal ON payments(deal_id);
CREATE INDEX idx_payments_brand ON payments(brand_id);
CREATE INDEX idx_payments_athlete ON payments(athlete_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_stripe_intent ON payments(stripe_payment_intent_id);

-- Payouts
CREATE INDEX idx_payouts_athlete ON payouts(athlete_id);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_payouts_stripe_payout ON payouts(stripe_payout_id);

-- Subscriptions
CREATE INDEX idx_subscriptions_brand ON subscriptions(brand_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- Earnings
CREATE INDEX idx_athlete_earnings_athlete ON athlete_earnings(athlete_id);
CREATE INDEX idx_athlete_earnings_period ON athlete_earnings(year, month);

-- Connected accounts
CREATE INDEX idx_stripe_accounts_athlete ON stripe_connected_accounts(athlete_id);
CREATE INDEX idx_stripe_accounts_stripe ON stripe_connected_accounts(stripe_account_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Calculate platform fee
CREATE OR REPLACE FUNCTION calculate_platform_fee(
    amount_cents INTEGER,
    fee_percent DECIMAL DEFAULT 12.00
) RETURNS INTEGER AS $$
BEGIN
    RETURN CEIL(amount_cents * (fee_percent / 100.0));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update athlete earnings after payment
CREATE OR REPLACE FUNCTION update_athlete_earnings_on_payment() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'succeeded' AND OLD.status != 'succeeded' THEN
        -- Insert or update monthly earnings
        INSERT INTO athlete_earnings (athlete_id, year, month, gross_earnings_cents, platform_fees_cents, net_earnings_cents, deals_completed)
        VALUES (
            NEW.athlete_id,
            EXTRACT(YEAR FROM NEW.paid_at),
            EXTRACT(MONTH FROM NEW.paid_at),
            NEW.amount_cents,
            NEW.platform_fee_cents,
            NEW.athlete_amount_cents,
            1
        )
        ON CONFLICT (athlete_id, year, month)
        DO UPDATE SET
            gross_earnings_cents = athlete_earnings.gross_earnings_cents + NEW.amount_cents,
            platform_fees_cents = athlete_earnings.platform_fees_cents + NEW.platform_fee_cents,
            net_earnings_cents = athlete_earnings.net_earnings_cents + NEW.athlete_amount_cents,
            deals_completed = athlete_earnings.deals_completed + 1,
            updated_at = NOW();

        -- Update athlete total_earnings in athletes table
        UPDATE athletes
        SET total_earnings = total_earnings + (NEW.athlete_amount_cents / 100.0),
            deals_completed = deals_completed + 1
        WHERE id = NEW.athlete_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_earnings_on_payment
    AFTER UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_athlete_earnings_on_payment();

-- Update platform revenue after payment
CREATE OR REPLACE FUNCTION update_platform_revenue_on_payment() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'succeeded' AND OLD.status != 'succeeded' THEN
        INSERT INTO platform_revenue (year, month, transaction_fees_cents, transaction_count, gross_deal_volume_cents, total_revenue_cents)
        VALUES (
            EXTRACT(YEAR FROM NEW.paid_at),
            EXTRACT(MONTH FROM NEW.paid_at),
            NEW.platform_fee_cents,
            1,
            NEW.amount_cents,
            NEW.platform_fee_cents
        )
        ON CONFLICT (year, month)
        DO UPDATE SET
            transaction_fees_cents = platform_revenue.transaction_fees_cents + NEW.platform_fee_cents,
            transaction_count = platform_revenue.transaction_count + 1,
            gross_deal_volume_cents = platform_revenue.gross_deal_volume_cents + NEW.amount_cents,
            total_revenue_cents = platform_revenue.total_revenue_cents + NEW.platform_fee_cents,
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_platform_revenue
    AFTER UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_platform_revenue_on_payment();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE stripe_connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_forms_1099 ENABLE ROW LEVEL SECURITY;

-- Athletes can view their own connected account
CREATE POLICY "Athletes can view own connected account"
    ON stripe_connected_accounts FOR SELECT
    USING (athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid()));

-- Brands can view their own customer record
CREATE POLICY "Brands can view own customer"
    ON stripe_customers FOR SELECT
    USING (brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid()));

-- Athletes can view payments where they're the recipient
CREATE POLICY "Athletes can view own payments"
    ON payments FOR SELECT
    USING (athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid()));

-- Brands can view payments they initiated
CREATE POLICY "Brands can view own payments"
    ON payments FOR SELECT
    USING (brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid()));

-- Athletes can view their own payouts
CREATE POLICY "Athletes can view own payouts"
    ON payouts FOR SELECT
    USING (athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid()));

-- Brands can view their own subscription
CREATE POLICY "Brands can view own subscription"
    ON subscriptions FOR SELECT
    USING (brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid()));

-- Athletes can view their own earnings
CREATE POLICY "Athletes can view own earnings"
    ON athlete_earnings FOR SELECT
    USING (athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid()));

-- Athletes can view their own tax forms
CREATE POLICY "Athletes can view own tax forms"
    ON tax_forms_1099 FOR SELECT
    USING (athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid()));

-- Admin policies (full access)
CREATE POLICY "Admins can manage all payments"
    ON payments FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage all payouts"
    ON payouts FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE payments IS 'All deal payments processed through Stripe';
COMMENT ON TABLE payouts IS 'Athlete payout transactions to their bank accounts';
COMMENT ON TABLE subscriptions IS 'Brand subscription status and usage';
COMMENT ON TABLE athlete_earnings IS 'Aggregated athlete earnings by month/year';
COMMENT ON TABLE platform_revenue IS 'GradeUp platform revenue tracking';
COMMENT ON COLUMN payments.platform_fee_cents IS 'GradeUp platform fee (12% of transaction)';
COMMENT ON COLUMN payments.athlete_amount_cents IS 'Net amount athlete receives after platform fee';
