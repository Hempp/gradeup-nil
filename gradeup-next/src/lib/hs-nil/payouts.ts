/**
 * HS-NIL Parent-Custodial Payout Service
 * ----------------------------------------------------------------------------
 * For HS NIL deals the money does NOT flow to the minor athlete. It flows
 * to a custodial account controlled by the consenting parent / guardian.
 * This module owns the lifecycle of that payout record:
 *
 *   pending      → created at contract sign-time (row exists, no destination)
 *   authorized   → parent has completed Stripe Connect onboarding + deal
 *                  fully signed; payout is cleared for release on deliverable
 *                  completion
 *   paid         → Stripe transfer succeeded
 *   failed       → transfer failed (network / compliance / closed account)
 *   refunded     → clawback path (not wired yet)
 *
 * The actual Stripe Connect API is abstracted behind a `PayoutProvider`
 * interface. The default impl stubs every call. In production, that stub
 * THROWS — this is deliberate: no real deal should ever be "paid" through
 * a mock transfer. To enable real payouts, inject a non-stub provider
 * (e.g. backed by src/lib/services/stripe.ts).
 *
 * All DB writes use the service-role client. RLS on
 * `hs_deal_parent_payouts` explicitly blocks browser writes.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type PayoutStatus =
  | 'pending'
  | 'authorized'
  | 'paid'
  | 'failed'
  | 'refunded';

export interface PayoutRow {
  id: string;
  deal_id: string;
  parent_profile_id: string;
  stripe_connect_account_id: string | null;
  payout_amount: number;
  payout_currency: string;
  status: PayoutStatus;
  authorized_at: string | null;
  paid_at: string | null;
  failed_reason: string | null;
  stripe_transfer_id: string | null;
  created_at: string;
}

export interface PayoutProvider {
  createDestination(input: {
    parentProfileId: string;
    email: string;
    countryCode?: string;
  }): Promise<{
    accountId: string;
    onboardingUrl: string;
    complete: boolean;
  }>;
  refreshDestination(accountId: string): Promise<{
    complete: boolean;
    reason?: string;
  }>;
  initiatePayout(input: {
    accountId: string;
    amount: number; // cents
    currency: string;
    dealId: string;
  }): Promise<{
    transferId: string;
    status: 'pending' | 'paid' | 'failed';
    reason?: string;
  }>;
}

// ----------------------------------------------------------------------------
// Service-role client
// ----------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil payouts] Supabase service role not configured ' +
        '(NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ----------------------------------------------------------------------------
// Default (stub) provider
// ----------------------------------------------------------------------------

/**
 * Stub provider. Returns fake but stable ids in dev / test so the lifecycle
 * can be exercised end-to-end without Stripe credentials. In production
 * (NODE_ENV === 'production') every method THROWS — fail-closed — so that
 * missing real Stripe integration cannot silently move zero-dollar or
 * fake-ID "payouts" through the system.
 *
 * Swap-in path: import this file, replace `defaultPayoutProvider` usage with
 * a real impl that wraps src/lib/services/stripe.ts (or inject through an
 * arg to each lifecycle function — none take the provider today, but that
 * injection seam is one small refactor away when Stripe lands).
 */
export const defaultPayoutProvider: PayoutProvider = {
  async createDestination({ parentProfileId, email }) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[hs-nil payouts] payout provider not configured (production). ' +
          'Refusing to create a custodial destination without real Stripe Connect.',
      );
    }
    return {
      accountId: `acct_stub_${parentProfileId.slice(0, 8)}`,
      onboardingUrl: `https://stub.local/connect/onboard?email=${encodeURIComponent(email)}`,
      complete: false,
    };
  },

  async refreshDestination(accountId) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[hs-nil payouts] payout provider not configured (production). ' +
          'Refusing to refresh Connect status without real Stripe Connect.',
      );
    }
    // Dev: pretend onboarding is complete after ~one check.
    return { complete: true, reason: `stub-accountId=${accountId}` };
  },

  async initiatePayout({ accountId, amount, currency, dealId }) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[hs-nil payouts] payout provider not configured (production). ' +
          'Refusing to initiate a real transfer through the stub.',
      );
    }
    return {
      transferId: `tr_stub_${dealId.slice(0, 8)}`,
      status: 'paid',
      reason: `stub acct=${accountId} amount=${amount} ${currency}`,
    };
  },
};

// ----------------------------------------------------------------------------
// Stripe Connect provider (real)
// ----------------------------------------------------------------------------

/**
 * Lazy Stripe client — constructed once, reused across calls. We use the
 * same pattern as `src/lib/services/stripe.ts` / the platform webhook
 * handler (both construct Stripe with the project's pinned API version).
 * Intentionally NOT imported from that module because we also need the
 * Stripe type for constructEvent in the webhook.
 */
let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      '[hs-nil payouts] STRIPE_SECRET_KEY not configured — cannot use StripeConnectPayoutProvider.',
    );
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
    });
  }
  return stripeClient;
}

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    'https://gradeupnil.com'
  );
}

/**
 * Real Stripe Connect implementation of `PayoutProvider`. Uses Express
 * connected accounts with the `transfers` capability — the standard
 * marketplace / custodian flow where the platform holds the funds and
 * transfers them to the parent's linked bank.
 *
 * Activation: this provider is only returned by `getPayoutProvider()`
 * when `HS_PAYOUT_PROVIDER === 'stripe'` AND a `STRIPE_SECRET_KEY` is
 * present. In all other configurations the stub is used, preserving
 * fail-closed semantics in production (stub throws there too, so
 * forgetting the env var surfaces loudly).
 */
export class StripeConnectPayoutProvider implements PayoutProvider {
  async createDestination({
    parentProfileId,
    email,
    countryCode = 'US',
  }: {
    parentProfileId: string;
    email: string;
    countryCode?: string;
  }): Promise<{ accountId: string; onboardingUrl: string; complete: boolean }> {
    const stripe = getStripe();

    const account = await stripe.accounts.create({
      type: 'express',
      country: countryCode,
      email,
      business_type: 'individual',
      capabilities: {
        transfers: { requested: true },
      },
      metadata: { parentProfileId },
    });

    const appUrl = getAppUrl();
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${appUrl}/hs/onboarding/payouts?refresh=1`,
      return_url: `${appUrl}/hs/onboarding/payouts/return`,
      type: 'account_onboarding',
    });

    // Persist the account id on hs_parent_profiles. We set onboarding
    // _complete=false because Stripe Connect is NEVER complete at this
    // point — the parent hasn't seen the hosted onboarding yet.
    const sb = getServiceRoleClient();
    const { error: updateErr } = await sb
      .from('hs_parent_profiles')
      .update({
        stripe_connect_account_id: account.id,
        stripe_connect_onboarding_complete: false,
        stripe_connect_updated_at: new Date().toISOString(),
      })
      .eq('id', parentProfileId);

    if (updateErr) {
      throw new Error(
        `[hs-nil payouts] failed to persist connect account id: ${updateErr.message}`,
      );
    }

    return {
      accountId: account.id,
      onboardingUrl: accountLink.url,
      complete: false,
    };
  }

  /**
   * Re-creates an onboarding account link for a Connect account that
   * already exists. Used by the "resume onboarding" CTA and by the
   * refresh_url round-trip when the hosted session expires.
   */
  async createOnboardingLink(accountId: string): Promise<string> {
    const stripe = getStripe();
    const appUrl = getAppUrl();
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/hs/onboarding/payouts?refresh=1`,
      return_url: `${appUrl}/hs/onboarding/payouts/return`,
      type: 'account_onboarding',
    });
    return link.url;
  }

  async refreshDestination(
    accountId: string,
  ): Promise<{ complete: boolean; reason?: string }> {
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(accountId);

    const detailsSubmitted = Boolean(account.details_submitted);
    const payoutsEnabled = Boolean(account.payouts_enabled);
    const complete = detailsSubmitted && payoutsEnabled;

    const requirementsDue = account.requirements?.currently_due ?? [];

    // Update the parent profile row identified by this account id.
    const sb = getServiceRoleClient();
    const { error: updateErr } = await sb
      .from('hs_parent_profiles')
      .update({
        stripe_connect_onboarding_complete: complete,
        stripe_connect_requirements_due: requirementsDue,
        stripe_connect_updated_at: new Date().toISOString(),
      })
      .eq('stripe_connect_account_id', accountId);

    if (updateErr) {
      // Don't throw — the Stripe fetch itself succeeded and is the
      // authoritative answer. Caller can decide whether the db mismatch
      // warrants alerting.
      // eslint-disable-next-line no-console
      console.warn(
        '[hs-nil payouts] refreshDestination db update failed',
        { accountId, error: updateErr.message },
      );
    }

    if (complete) return { complete: true };

    if (!detailsSubmitted) {
      return { complete: false, reason: 'onboarding_incomplete' };
    }
    if (!payoutsEnabled) {
      return {
        complete: false,
        reason:
          requirementsDue.length > 0
            ? `requirements_due:${requirementsDue.join(',')}`
            : 'payouts_disabled',
      };
    }
    return { complete: false, reason: 'unknown' };
  }

  async initiatePayout({
    accountId,
    amount,
    currency,
    dealId,
  }: {
    accountId: string;
    amount: number;
    currency: string;
    dealId: string;
  }): Promise<{
    transferId: string;
    status: 'pending' | 'paid' | 'failed';
    reason?: string;
  }> {
    const stripe = getStripe();

    // Verify the account is payout-capable before we create the transfer.
    // Stripe would reject the transfer anyway, but this gives us a
    // cleaner error path that doesn't leak Stripe internals.
    const account = await stripe.accounts.retrieve(accountId);
    if (!account.payouts_enabled) {
      return {
        transferId: '',
        status: 'failed',
        reason: 'payouts_not_enabled',
      };
    }

    const transfer = await stripe.transfers.create({
      amount,
      currency: currency.toLowerCase(),
      destination: accountId,
      metadata: { dealId },
    });

    // Stripe transfers complete asynchronously. The final status
    // (paid / failed) arrives via the Connect webhook.
    return {
      transferId: transfer.id,
      status: 'pending',
    };
  }
}

// ----------------------------------------------------------------------------
// Provider selection
// ----------------------------------------------------------------------------

/**
 * Resolve the payout provider from env. Fail-closed: defaults to the stub,
 * which itself throws in production so a missing env var can never
 * silently move fake money.
 *
 * Opt-in to real Stripe requires BOTH:
 *   - `HS_PAYOUT_PROVIDER === 'stripe'`
 *   - `STRIPE_SECRET_KEY` is set
 *
 * Callers that need a specific provider can pass one explicitly; this
 * function is the default for routes/UI that just want "whatever is
 * configured".
 */
export function getPayoutProvider(): PayoutProvider {
  if (
    process.env.HS_PAYOUT_PROVIDER === 'stripe' &&
    process.env.STRIPE_SECRET_KEY
  ) {
    return new StripeConnectPayoutProvider();
  }
  return defaultPayoutProvider;
}

// ----------------------------------------------------------------------------
// createPendingPayout
// ----------------------------------------------------------------------------

export interface CreatePendingPayoutInput {
  dealId: string;
  parentProfileId: string;
  /** Whole USD — same unit as deals.compensation_amount. */
  amount: number;
  currency?: string;
}

export interface CreatePendingPayoutResult {
  ok: boolean;
  payoutId?: string;
  reason?: string;
}

/**
 * Insert a `pending` row in `hs_deal_parent_payouts`. No Stripe call — the
 * connect_account_id is filled in later when the parent completes onboarding.
 * Idempotent: unique constraint on deal_id means re-calling is a no-op that
 * returns ok=false with a reason the caller can log-and-drop.
 */
export async function createPendingPayout(
  input: CreatePendingPayoutInput,
): Promise<CreatePendingPayoutResult> {
  const sb = getServiceRoleClient();

  const { data, error } = await sb
    .from('hs_deal_parent_payouts')
    .insert({
      deal_id: input.dealId,
      parent_profile_id: input.parentProfileId,
      payout_amount: input.amount,
      payout_currency: input.currency ?? 'USD',
      status: 'pending' as PayoutStatus,
    })
    .select('id')
    .single();

  if (error) {
    return { ok: false, reason: error.message };
  }

  return { ok: true, payoutId: data.id as string };
}

// ----------------------------------------------------------------------------
// authorizePayout
// ----------------------------------------------------------------------------

/**
 * Mark the payout authorized once:
 *   - the contract is fully signed, AND
 *   - the parent has a stripe_connect_account_id on file (set via webhook or
 *     explicit onboarding completion).
 *
 * Today this writes status='authorized' without calling Stripe — the account
 * id is expected to be stamped onto the row by a separate onboarding flow.
 * When that flow lands, this function will also verify the account is
 * payout-capable via `provider.refreshDestination`.
 */
export async function authorizePayout(dealId: string): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const sb = getServiceRoleClient();

  const { data: row, error: rowErr } = await sb
    .from('hs_deal_parent_payouts')
    .select('id, status, stripe_connect_account_id')
    .eq('deal_id', dealId)
    .maybeSingle();

  if (rowErr || !row) {
    return { ok: false, reason: 'payout row not found' };
  }

  if (row.status === 'paid' || row.status === 'authorized') {
    return { ok: true, reason: `already ${row.status}` };
  }

  if (!row.stripe_connect_account_id) {
    return {
      ok: false,
      reason: 'parent has not completed Stripe Connect onboarding',
    };
  }

  const { error: updateErr } = await sb
    .from('hs_deal_parent_payouts')
    .update({
      status: 'authorized' as PayoutStatus,
      authorized_at: new Date().toISOString(),
    })
    .eq('id', row.id);

  if (updateErr) return { ok: false, reason: updateErr.message };
  return { ok: true };
}

// ----------------------------------------------------------------------------
// releasePayout
// ----------------------------------------------------------------------------

/**
 * Invoke the payout provider and release funds to the parent's custodial
 * account. Caller owns the preconditions (deliverable approved, escrow
 * released, etc.) — this function does the plumbing only.
 *
 * NOTE: amount is pulled from the existing row (whole USD) and converted to
 * cents for Stripe. Currency propagates from the row.
 */
export async function releasePayout(
  dealId: string,
  provider: PayoutProvider = getPayoutProvider(),
): Promise<{
  ok: boolean;
  reason?: string;
  transferId?: string;
}> {
  const sb = getServiceRoleClient();

  const { data: row, error: rowErr } = await sb
    .from('hs_deal_parent_payouts')
    .select(
      'id, status, stripe_connect_account_id, payout_amount, payout_currency',
    )
    .eq('deal_id', dealId)
    .maybeSingle();

  if (rowErr || !row) return { ok: false, reason: 'payout row not found' };

  if (row.status === 'paid') {
    return { ok: true, reason: 'already paid' };
  }

  if (row.status !== 'authorized') {
    return {
      ok: false,
      reason: `payout not authorized (status=${row.status})`,
    };
  }

  if (!row.stripe_connect_account_id) {
    return { ok: false, reason: 'missing stripe_connect_account_id' };
  }

  try {
    const result = await provider.initiatePayout({
      accountId: row.stripe_connect_account_id as string,
      amount: Math.round((row.payout_amount as number) * 100),
      currency: (row.payout_currency as string) ?? 'USD',
      dealId,
    });

    const now = new Date().toISOString();
    const { error: updateErr } = await sb
      .from('hs_deal_parent_payouts')
      .update({
        status: result.status === 'paid' ? 'paid' : 'failed',
        stripe_transfer_id: result.transferId,
        paid_at: result.status === 'paid' ? now : null,
        failed_reason:
          result.status === 'failed' ? (result.reason ?? 'unknown') : null,
      })
      .eq('id', row.id);

    if (updateErr) return { ok: false, reason: updateErr.message };
    return {
      ok: result.status === 'paid',
      reason: result.reason,
      transferId: result.transferId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await sb
      .from('hs_deal_parent_payouts')
      .update({
        status: 'failed' as PayoutStatus,
        failed_reason: message.slice(0, 500),
      })
      .eq('id', row.id);
    return { ok: false, reason: message };
  }
}

// ----------------------------------------------------------------------------
// markFailed
// ----------------------------------------------------------------------------

/**
 * Explicit failure setter — used by the webhook when Stripe reports a
 * transfer.failed event, and by any caller that needs to short-circuit a
 * broken payout (e.g. parent closed their Connect account mid-flight).
 */
export async function markFailed(
  dealId: string,
  reason: string,
): Promise<{ ok: boolean; reason?: string }> {
  const sb = getServiceRoleClient();

  const { error } = await sb
    .from('hs_deal_parent_payouts')
    .update({
      status: 'failed' as PayoutStatus,
      failed_reason: reason.slice(0, 500),
    })
    .eq('deal_id', dealId);

  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}
