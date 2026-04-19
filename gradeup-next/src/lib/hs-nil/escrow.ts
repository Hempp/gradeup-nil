/**
 * HS-NIL Brand Escrow Service
 * ----------------------------------------------------------------------------
 * Owns the inbound side of the HS NIL money loop. Until this module,
 * `hs_deal_parent_payouts` handled the OUT side (platform → parent custodian
 * via Stripe Connect transfer) but nothing pulled money IN from the brand.
 *
 * Lifecycle:
 *   1. contract fully_signed  → createDealPaymentIntent() creates a Stripe
 *                               PaymentIntent (capture_method='automatic')
 *                               off the brand's default payment method and
 *                               inserts a `hs_deal_brand_charges` row. Funds
 *                               settle into GradeUp's platform balance.
 *   2. Stripe webhook fires    → `payment_intent.succeeded` flips the charge
 *                               row to 'succeeded' and, if the deal is
 *                               already 'approved', triggers the release.
 *   3. brand approves deal    → releaseEscrowToParent() fires (via the
 *                               review route). If the charge hasn't settled
 *                               yet, release is deferred — the payment
 *                               webhook will retrigger once it does.
 *   4. release path           → calls into payouts.ts::releasePayout() which
 *                               does the Connect Transfer out to the parent
 *                               Connect account. Updates the charge row to
 *                               'released_to_parent'.
 *   5. dispute / refund       → refundEscrow() issues a Stripe refund and
 *                               marks the charge 'refunded'.
 *
 * Capture strategy choice (capture_method='automatic'):
 *   We auto-capture on contract sign and release via a separate Transfer on
 *   brand approval. The alternative (capture_method='manual' + capture at
 *   approval) was rejected because Stripe auths expire after ~7 days — a
 *   realistic HS NIL deal can take longer between sign and approval. Two
 *   independent events (charge then transfer) also make refunds cleaner.
 *
 * Fail-closed semantics:
 *   - Missing STRIPE_SECRET_KEY in production → throws.
 *   - Missing key in dev/test returns fake pi_* / cus_* ids so the lifecycle
 *     can be exercised locally. Mirrors the pattern in payouts.ts.
 *
 * Idempotency:
 *   - createDealPaymentIntent uses dealId as the Stripe idempotency key.
 *   - All state transitions (succeeded, released_to_parent, refunded) read
 *     the current row status before acting and short-circuit if already in
 *     the target state.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

import { releasePayout } from './payouts';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type BrandChargeStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'processing'
  | 'requires_action'
  | 'canceled'
  | 'succeeded'
  | 'released_to_parent'
  | 'refunded';

export interface BrandChargeRow {
  id: string;
  deal_id: string;
  brand_id: string;
  stripe_payment_intent_id: string | null;
  amount_cents: number;
  currency: string;
  platform_fee_cents: number;
  status: BrandChargeStatus;
  captured_at: string | null;
  released_at: string | null;
  refunded_at: string | null;
  failure_reason: string | null;
}

// ----------------------------------------------------------------------------
// Infra
// ----------------------------------------------------------------------------

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      '[hs-nil escrow] STRIPE_SECRET_KEY not configured — refusing to build escrow.',
    );
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
    });
  }
  return stripeClient;
}

function isDevStub(): boolean {
  return (
    !process.env.STRIPE_SECRET_KEY &&
    process.env.NODE_ENV !== 'production'
  );
}

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil escrow] Supabase service role not configured ' +
        '(NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function logEvent(
  level: 'info' | 'warn' | 'error',
  message: string,
  metadata?: Record<string, unknown>,
): void {
  const line = {
    timestamp: new Date().toISOString(),
    service: 'hs-nil-escrow',
    message,
    ...metadata,
  };
  const json = JSON.stringify(line);
  switch (level) {
    case 'error':
      // eslint-disable-next-line no-console
      console.error(json);
      break;
    case 'warn':
      // eslint-disable-next-line no-console
      console.warn(json);
      break;
    default:
      // eslint-disable-next-line no-console
      console.log(json);
  }
}

// ----------------------------------------------------------------------------
// ensureBrandCustomer
// ----------------------------------------------------------------------------

/**
 * Create or fetch the Stripe Customer row for a brand. Stamps the id onto
 * `brands.stripe_customer_id` the first time. Safe to call on every payment-
 * method setup attempt — existing customers are returned directly.
 */
export async function ensureBrandCustomer(brandId: string): Promise<{
  ok: boolean;
  customerId?: string;
  reason?: string;
}> {
  const sb = getServiceRoleClient();

  const { data: brand, error: brandErr } = await sb
    .from('brands')
    .select('id, stripe_customer_id, contact_email, company_name, profile_id')
    .eq('id', brandId)
    .maybeSingle();

  if (brandErr || !brand) {
    return { ok: false, reason: 'brand not found' };
  }

  if (brand.stripe_customer_id) {
    return { ok: true, customerId: brand.stripe_customer_id as string };
  }

  if (isDevStub()) {
    const fakeId = `cus_stub_${String(brandId).slice(0, 8)}`;
    await sb
      .from('brands')
      .update({ stripe_customer_id: fakeId })
      .eq('id', brandId);
    return { ok: true, customerId: fakeId };
  }

  try {
    const stripe = getStripe();
    const customer = await stripe.customers.create(
      {
        email: (brand.contact_email as string) ?? undefined,
        name: (brand.company_name as string) ?? undefined,
        metadata: {
          brandId,
          profileId: (brand.profile_id as string) ?? '',
        },
      },
      { idempotencyKey: `brand-customer-${brandId}` },
    );

    const { error: updateErr } = await sb
      .from('brands')
      .update({ stripe_customer_id: customer.id })
      .eq('id', brandId);

    if (updateErr) {
      logEvent('warn', 'ensureBrandCustomer: db update failed after Stripe create', {
        brandId,
        customerId: customer.id,
        error: updateErr.message,
      });
    }

    return { ok: true, customerId: customer.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logEvent('error', 'ensureBrandCustomer failed', { brandId, error: message });
    return { ok: false, reason: message };
  }
}

// ----------------------------------------------------------------------------
// createDealPaymentIntent
// ----------------------------------------------------------------------------

export interface CreateDealPaymentIntentInput {
  dealId: string;
  brandId: string;
  amountCents: number;
  currency?: string;
}

export interface CreateDealPaymentIntentResult {
  ok: boolean;
  chargeId?: string;
  paymentIntentId?: string;
  status?: BrandChargeStatus;
  reason?: string;
  /** Client secret for off-session confirmation (dev only — off-session
   *  confirmation for the MVP uses brands.default_payment_method_id stored
   *  at setup time). */
  clientSecret?: string;
}

/**
 * Called when a contract transitions to `fully_signed`. Creates (or reuses)
 * a PaymentIntent for the deal and inserts the `hs_deal_brand_charges` row.
 *
 * Idempotency:
 *   - UNIQUE(deal_id) prevents duplicate rows at the DB layer.
 *   - Stripe idempotency key uses `pi-deal-${dealId}` so retrying on a
 *     network flake re-uses the same PaymentIntent.
 *   - On re-invocation with an existing row: returns the current state
 *     without hitting Stripe again. Caller can treat this as a success.
 */
export async function createDealPaymentIntent(
  input: CreateDealPaymentIntentInput,
): Promise<CreateDealPaymentIntentResult> {
  const sb = getServiceRoleClient();
  const currency = (input.currency ?? 'USD').toUpperCase();

  // Idempotency pass 1: if a row already exists for this deal, return it.
  const { data: existing } = await sb
    .from('hs_deal_brand_charges')
    .select(
      'id, status, stripe_payment_intent_id, amount_cents, currency',
    )
    .eq('deal_id', input.dealId)
    .maybeSingle();

  if (existing) {
    return {
      ok: true,
      chargeId: existing.id as string,
      paymentIntentId: (existing.stripe_payment_intent_id as string) ?? undefined,
      status: existing.status as BrandChargeStatus,
      reason: 'already exists',
    };
  }

  // Look up the brand's customer + default payment method (off-session).
  const { data: brand } = await sb
    .from('brands')
    .select('id, stripe_customer_id, default_payment_method_id')
    .eq('id', input.brandId)
    .maybeSingle();

  const customerId = (brand?.stripe_customer_id as string | null) ?? null;
  const paymentMethodId =
    (brand?.default_payment_method_id as string | null) ?? null;

  // Dev/stub path — no Stripe, insert a fake-but-plausible row so the
  // downstream lifecycle can be exercised end-to-end.
  if (isDevStub()) {
    const fakePi = `pi_stub_${String(input.dealId).slice(0, 8)}`;
    const initialStatus: BrandChargeStatus = paymentMethodId
      ? 'succeeded'
      : 'requires_payment_method';
    const { data: inserted, error: insertErr } = await sb
      .from('hs_deal_brand_charges')
      .insert({
        deal_id: input.dealId,
        brand_id: input.brandId,
        stripe_payment_intent_id: fakePi,
        amount_cents: input.amountCents,
        currency,
        status: initialStatus,
        captured_at:
          initialStatus === 'succeeded' ? new Date().toISOString() : null,
      })
      .select('id')
      .single();

    if (insertErr || !inserted) {
      return { ok: false, reason: insertErr?.message ?? 'insert failed' };
    }
    return {
      ok: true,
      chargeId: inserted.id as string,
      paymentIntentId: fakePi,
      status: initialStatus,
    };
  }

  // Production path — require Stripe + customer + payment method. If the
  // brand hasn't set up a payment method yet, we still create a row in
  // 'requires_payment_method' so ops can see the gap.
  if (!customerId) {
    const { data: inserted, error: insertErr } = await sb
      .from('hs_deal_brand_charges')
      .insert({
        deal_id: input.dealId,
        brand_id: input.brandId,
        amount_cents: input.amountCents,
        currency,
        status: 'requires_payment_method' as BrandChargeStatus,
        failure_reason: 'brand has no Stripe customer id on file',
      })
      .select('id')
      .single();

    return {
      ok: false,
      chargeId: inserted?.id as string | undefined,
      status: 'requires_payment_method',
      reason: 'brand has no Stripe customer',
    };
  }

  if (!paymentMethodId) {
    const { data: inserted } = await sb
      .from('hs_deal_brand_charges')
      .insert({
        deal_id: input.dealId,
        brand_id: input.brandId,
        amount_cents: input.amountCents,
        currency,
        status: 'requires_payment_method' as BrandChargeStatus,
        failure_reason: 'brand has no default payment method',
      })
      .select('id')
      .single();

    return {
      ok: false,
      chargeId: inserted?.id as string | undefined,
      status: 'requires_payment_method',
      reason: 'brand has no default payment method',
    };
  }

  try {
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: input.amountCents,
        currency: currency.toLowerCase(),
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        capture_method: 'automatic',
        // transfer_group ties the inbound charge to the outbound Transfer.
        // When releasePayout fires a separate stripe.transfers.create call,
        // passing the same transfer_group lets Stripe Sigma / the dashboard
        // surface the full money path on the deal.
        transfer_group: `deal:${input.dealId}`,
        description: `HS NIL deal ${input.dealId}`,
        metadata: {
          dealId: input.dealId,
          brandId: input.brandId,
          scope: 'hs-nil-brand-charge',
        },
      },
      { idempotencyKey: `pi-deal-${input.dealId}` },
    );

    const stripeStatus = paymentIntent.status as BrandChargeStatus;
    const now = new Date().toISOString();

    const { data: inserted, error: insertErr } = await sb
      .from('hs_deal_brand_charges')
      .insert({
        deal_id: input.dealId,
        brand_id: input.brandId,
        stripe_payment_intent_id: paymentIntent.id,
        amount_cents: input.amountCents,
        currency,
        status: stripeStatus,
        captured_at: stripeStatus === 'succeeded' ? now : null,
      })
      .select('id')
      .single();

    if (insertErr || !inserted) {
      logEvent('error', 'createDealPaymentIntent db insert failed', {
        dealId: input.dealId,
        paymentIntentId: paymentIntent.id,
        error: insertErr?.message,
      });
      return { ok: false, reason: insertErr?.message ?? 'insert failed' };
    }

    return {
      ok: true,
      chargeId: inserted.id as string,
      paymentIntentId: paymentIntent.id,
      status: stripeStatus,
      clientSecret: paymentIntent.client_secret ?? undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logEvent('error', 'createDealPaymentIntent failed', {
      dealId: input.dealId,
      brandId: input.brandId,
      error: message,
    });

    // Persist the failure so ops can see it in the UI.
    await sb
      .from('hs_deal_brand_charges')
      .insert({
        deal_id: input.dealId,
        brand_id: input.brandId,
        amount_cents: input.amountCents,
        currency,
        status: 'requires_payment_method' as BrandChargeStatus,
        failure_reason: message.slice(0, 500),
      });

    return { ok: false, reason: message };
  }
}

// ----------------------------------------------------------------------------
// confirmCapture — primarily called by the payment webhook
// ----------------------------------------------------------------------------

/**
 * Mark a charge as succeeded (captured). Called by the payment webhook on
 * `payment_intent.succeeded`. Idempotent: short-circuits if the row is
 * already in a terminal state that implies capture.
 */
export async function confirmCapture(paymentIntentId: string): Promise<{
  ok: boolean;
  chargeId?: string;
  dealId?: string;
  reason?: string;
}> {
  const sb = getServiceRoleClient();

  const { data: row, error: rowErr } = await sb
    .from('hs_deal_brand_charges')
    .select('id, deal_id, status')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();

  if (rowErr || !row) {
    return { ok: false, reason: 'charge row not found' };
  }

  // Already captured — no-op.
  if (
    row.status === 'succeeded' ||
    row.status === 'released_to_parent' ||
    row.status === 'refunded'
  ) {
    return {
      ok: true,
      chargeId: row.id as string,
      dealId: row.deal_id as string,
      reason: `already ${row.status}`,
    };
  }

  const { error: updateErr } = await sb
    .from('hs_deal_brand_charges')
    .update({
      status: 'succeeded' as BrandChargeStatus,
      captured_at: new Date().toISOString(),
      failure_reason: null,
    })
    .eq('id', row.id);

  if (updateErr) {
    return { ok: false, reason: updateErr.message };
  }

  return {
    ok: true,
    chargeId: row.id as string,
    dealId: row.deal_id as string,
  };
}

// ----------------------------------------------------------------------------
// markChargeFailed
// ----------------------------------------------------------------------------

/**
 * Record a PaymentIntent failure. Called by the webhook on
 * `payment_intent.payment_failed`.
 */
export async function markChargeFailed(
  paymentIntentId: string,
  reason: string,
): Promise<{ ok: boolean; dealId?: string; reason?: string }> {
  const sb = getServiceRoleClient();

  const { data: row } = await sb
    .from('hs_deal_brand_charges')
    .select('id, deal_id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();

  if (!row) return { ok: false, reason: 'charge row not found' };

  const { error } = await sb
    .from('hs_deal_brand_charges')
    .update({
      status: 'requires_payment_method' as BrandChargeStatus,
      failure_reason: reason.slice(0, 500),
    })
    .eq('id', row.id);

  if (error) return { ok: false, reason: error.message };
  return { ok: true, dealId: row.deal_id as string };
}

// ----------------------------------------------------------------------------
// releaseEscrowToParent
// ----------------------------------------------------------------------------

/**
 * Two-gate release:
 *   1. Brand approved the deliverable (caller's responsibility to ensure —
 *      the review route is the authoritative caller).
 *   2. Escrow charge is in 'succeeded' (not 'requires_*' or 'processing').
 *
 * If gate #2 isn't met yet, we return a deferred result — the payment
 * webhook will retrigger this once the charge settles. Idempotent: if the
 * row is already 'released_to_parent', returns ok=true without a second
 * Connect transfer.
 *
 * Internally invokes `releasePayout(dealId)` — the existing Connect
 * transfer helper. That helper is itself idempotent against double-fire.
 */
export async function releaseEscrowToParent(dealId: string): Promise<{
  ok: boolean;
  reason?: string;
  deferred?: boolean;
  transferId?: string;
}> {
  const sb = getServiceRoleClient();

  const { data: charge, error: chargeErr } = await sb
    .from('hs_deal_brand_charges')
    .select('id, status, stripe_payment_intent_id, amount_cents')
    .eq('deal_id', dealId)
    .maybeSingle();

  if (chargeErr || !charge) {
    return { ok: false, reason: 'charge row not found' };
  }

  if (charge.status === 'released_to_parent') {
    return { ok: true, reason: 'already released' };
  }

  if (charge.status === 'refunded' || charge.status === 'canceled') {
    return {
      ok: false,
      reason: `charge terminal (status=${charge.status})`,
    };
  }

  if (charge.status !== 'succeeded') {
    // Not yet captured — defer. The webhook will re-call this helper
    // (via the "deal already approved" branch in the webhook handler)
    // as soon as the charge settles.
    logEvent(
      'info',
      'releaseEscrowToParent deferred — charge not captured',
      { dealId, chargeStatus: charge.status },
    );
    return {
      ok: false,
      deferred: true,
      reason: `charge status=${charge.status}`,
    };
  }

  // Fire the outbound Connect transfer. releasePayout is idempotent:
  // it checks the payout row's existing status before touching Stripe.
  const payoutResult = await releasePayout(dealId);
  if (!payoutResult.ok) {
    return {
      ok: false,
      reason: payoutResult.reason ?? 'releasePayout failed',
      transferId: payoutResult.transferId,
    };
  }

  // Stamp released_to_parent on the charge row. Also link payout → charge
  // for audit if the payout row doesn't carry one yet.
  const { error: updateErr } = await sb
    .from('hs_deal_brand_charges')
    .update({
      status: 'released_to_parent' as BrandChargeStatus,
      released_at: new Date().toISOString(),
    })
    .eq('id', charge.id);

  if (updateErr) {
    logEvent('warn', 'releaseEscrowToParent: charge status flip failed', {
      dealId,
      chargeId: charge.id,
      error: updateErr.message,
    });
  }

  await sb
    .from('hs_deal_parent_payouts')
    .update({ brand_charge_id: charge.id })
    .eq('deal_id', dealId)
    .is('brand_charge_id', null);

  return { ok: true, transferId: payoutResult.transferId };
}

// ----------------------------------------------------------------------------
// refundEscrow
// ----------------------------------------------------------------------------

/**
 * Issue a Stripe refund for a deal's inbound charge. Used for dispute-brand-
 * win and admin reversals. Idempotent: if the charge is already refunded,
 * returns ok=true without a second Stripe call.
 */
export async function refundEscrow(
  dealId: string,
  reason: string,
): Promise<{ ok: boolean; refundId?: string; reason?: string }> {
  const sb = getServiceRoleClient();

  const { data: charge } = await sb
    .from('hs_deal_brand_charges')
    .select('id, status, stripe_payment_intent_id')
    .eq('deal_id', dealId)
    .maybeSingle();

  if (!charge) return { ok: false, reason: 'charge row not found' };
  if (charge.status === 'refunded') {
    return { ok: true, reason: 'already refunded' };
  }

  if (charge.status === 'released_to_parent') {
    // Reversing a released payout requires clawing back the Connect transfer
    // first. Out of scope for the inbound refund path — flag and stop.
    return {
      ok: false,
      reason: 'charge already released to parent — refund path requires transfer reversal first',
    };
  }

  if (!charge.stripe_payment_intent_id) {
    // Stub rows (dev) with no real PI — just flip status.
    await sb
      .from('hs_deal_brand_charges')
      .update({
        status: 'refunded' as BrandChargeStatus,
        refunded_at: new Date().toISOString(),
        failure_reason: reason.slice(0, 500),
      })
      .eq('id', charge.id);
    return { ok: true };
  }

  if (isDevStub()) {
    await sb
      .from('hs_deal_brand_charges')
      .update({
        status: 'refunded' as BrandChargeStatus,
        refunded_at: new Date().toISOString(),
        failure_reason: reason.slice(0, 500),
      })
      .eq('id', charge.id);
    return { ok: true, refundId: `re_stub_${String(dealId).slice(0, 8)}` };
  }

  try {
    const stripe = getStripe();
    const refund = await stripe.refunds.create(
      {
        payment_intent: charge.stripe_payment_intent_id as string,
        reason: 'requested_by_customer',
        metadata: { dealId, reason: reason.slice(0, 250) },
      },
      { idempotencyKey: `refund-deal-${dealId}` },
    );

    await sb
      .from('hs_deal_brand_charges')
      .update({
        status: 'refunded' as BrandChargeStatus,
        refunded_at: new Date().toISOString(),
        failure_reason: reason.slice(0, 500),
      })
      .eq('id', charge.id);

    return { ok: true, refundId: refund.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logEvent('error', 'refundEscrow failed', { dealId, error: message });
    return { ok: false, reason: message };
  }
}

// ----------------------------------------------------------------------------
// getBrandChargeForDeal
// ----------------------------------------------------------------------------

/**
 * Lightweight read helper used by the brand deal detail page and
 * athlete/parent status surfaces. Goes through service-role because the
 * caller may be a background render that doesn't carry an auth context,
 * but callers render only the status-derived fields — never the raw
 * stripe_payment_intent_id — to a non-brand user.
 */
export async function getBrandChargeForDeal(
  dealId: string,
): Promise<BrandChargeRow | null> {
  const sb = getServiceRoleClient();

  const { data } = await sb
    .from('hs_deal_brand_charges')
    .select(
      'id, deal_id, brand_id, stripe_payment_intent_id, amount_cents, currency, platform_fee_cents, status, captured_at, released_at, refunded_at, failure_reason',
    )
    .eq('deal_id', dealId)
    .maybeSingle();

  return (data as unknown as BrandChargeRow | null) ?? null;
}
