/**
 * HS-NIL Parent-Custodial Payout Webhook (Stripe Connect)
 * ----------------------------------------------------------------------------
 * Receives Stripe Connect events and reflects them onto:
 *   - hs_parent_profiles         (account onboarding state)
 *   - hs_deal_parent_payouts     (per-deal transfer lifecycle)
 *
 * Security:
 *   - Raw request body is read unmodified and passed to
 *     `stripe.webhooks.constructEvent` with
 *     `STRIPE_CONNECT_WEBHOOK_SECRET` (DISTINCT from the platform
 *     `STRIPE_WEBHOOK_SECRET` — Stripe issues one secret per endpoint,
 *     and Connect is its own endpoint).
 *   - Missing signature → 400 without processing.
 *   - Missing secret   → 500 (configuration error, not a Stripe retry).
 *   - Bad signature    → 400 (so Stripe retries, allowing transient
 *                        clock drift recovery; but we refuse to process
 *                        the body).
 *
 * Event handling:
 *   - `account.updated`                 → sync parent onboarding state
 *   - `account.application.deauthorized`→ revoke stored account id
 *   - `transfer.created`                → mark payout authorized
 *   - `transfer.paid`                   → mark payout paid
 *   - `transfer.failed`                 → mark payout failed + reason
 *   - everything else                   → log + 200 (Stripe retries 5xx)
 *
 * Follows the pattern of src/app/api/webhooks/stripe/route.ts (platform
 * webhook). Uses the service-role Supabase client because the events
 * arrive server-to-server without a user session.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ----------------------------------------------------------------------------
// Infrastructure
// ----------------------------------------------------------------------------

let stripeInstance: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
    });
  }
  return stripeInstance;
}

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil payouts webhook] Supabase service role not configured.',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function logEvent(
  level: 'info' | 'warn' | 'error',
  eventType: string,
  message: string,
  metadata?: Record<string, unknown>,
) {
  const line = {
    timestamp: new Date().toISOString(),
    service: 'hs-nil-connect-webhook',
    eventType,
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
// Event handlers
// ----------------------------------------------------------------------------

async function handleAccountUpdated(
  account: Stripe.Account,
  sb: SupabaseClient,
) {
  const detailsSubmitted = Boolean(account.details_submitted);
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const complete = detailsSubmitted && payoutsEnabled;
  const requirementsDue = account.requirements?.currently_due ?? [];

  logEvent('info', 'account.updated', 'Syncing Connect account state', {
    accountId: account.id,
    detailsSubmitted,
    payoutsEnabled,
    requirementsDue,
  });

  const { error } = await sb
    .from('hs_parent_profiles')
    .update({
      stripe_connect_onboarding_complete: complete,
      stripe_connect_requirements_due: requirementsDue,
      stripe_connect_updated_at: new Date().toISOString(),
    })
    .eq('stripe_connect_account_id', account.id);

  if (error) {
    logEvent('warn', 'account.updated', 'Failed to sync parent profile', {
      accountId: account.id,
      error: error.message,
    });
  }
}

async function handleAccountDeauthorized(
  event: Stripe.Event,
  sb: SupabaseClient,
) {
  // For account.application.deauthorized, event.data.object is an
  // Application; the connected-account id is in event.account.
  const accountId = event.account;
  if (!accountId) {
    logEvent(
      'warn',
      'account.application.deauthorized',
      'Missing event.account — cannot locate parent profile',
      { eventId: event.id },
    );
    return;
  }

  logEvent(
    'info',
    'account.application.deauthorized',
    'Parent deauthorized Connect — clearing stored account id',
    { accountId },
  );

  const { error } = await sb
    .from('hs_parent_profiles')
    .update({
      stripe_connect_account_id: null,
      stripe_connect_onboarding_complete: false,
      stripe_connect_requirements_due: null,
      stripe_connect_updated_at: new Date().toISOString(),
    })
    .eq('stripe_connect_account_id', accountId);

  if (error) {
    logEvent(
      'warn',
      'account.application.deauthorized',
      'Failed to clear parent profile Connect id',
      { accountId, error: error.message },
    );
  }
}

async function handleTransferCreated(
  transfer: Stripe.Transfer,
  sb: SupabaseClient,
) {
  const dealId = transfer.metadata?.dealId;
  if (!dealId) {
    logEvent(
      'warn',
      'transfer.created',
      'Transfer missing metadata.dealId — skipping',
      { transferId: transfer.id },
    );
    return;
  }

  const { error } = await sb
    .from('hs_deal_parent_payouts')
    .update({
      stripe_transfer_id: transfer.id,
      status: 'authorized',
      authorized_at: new Date().toISOString(),
    })
    .eq('deal_id', dealId);

  if (error) {
    logEvent('warn', 'transfer.created', 'Failed to update payout row', {
      dealId,
      transferId: transfer.id,
      error: error.message,
    });
  }
}

async function handleTransferPaid(
  transfer: Stripe.Transfer,
  sb: SupabaseClient,
) {
  const dealId = transfer.metadata?.dealId;
  if (!dealId) {
    logEvent('warn', 'transfer.paid', 'Transfer missing metadata.dealId', {
      transferId: transfer.id,
    });
    return;
  }

  const { error } = await sb
    .from('hs_deal_parent_payouts')
    .update({
      stripe_transfer_id: transfer.id,
      status: 'paid',
      paid_at: new Date().toISOString(),
      failed_reason: null,
    })
    .eq('deal_id', dealId);

  if (error) {
    logEvent('warn', 'transfer.paid', 'Failed to mark payout paid', {
      dealId,
      transferId: transfer.id,
      error: error.message,
    });
  }
}

/**
 * `transfer.failed` is the legacy Connect event name; newer accounts may
 * emit `transfer.reversed` instead. We handle both at the dispatcher.
 */
async function handleTransferFailed(
  transfer: Stripe.Transfer,
  sb: SupabaseClient,
  reasonOverride?: string,
) {
  const dealId = transfer.metadata?.dealId;
  if (!dealId) {
    logEvent(
      'warn',
      'transfer.failed',
      'Transfer missing metadata.dealId — cannot update payout',
      { transferId: transfer.id },
    );
    return;
  }

  const reason =
    reasonOverride ??
    (transfer as unknown as { failure_message?: string; failure_code?: string })
      .failure_message ??
    (transfer as unknown as { failure_code?: string }).failure_code ??
    'stripe transfer failed';

  const { error } = await sb
    .from('hs_deal_parent_payouts')
    .update({
      stripe_transfer_id: transfer.id,
      status: 'failed',
      failed_reason: String(reason).slice(0, 500),
    })
    .eq('deal_id', dealId);

  if (error) {
    logEvent('warn', 'transfer.failed', 'Failed to mark payout failed', {
      dealId,
      transferId: transfer.id,
      error: error.message,
    });
  }
}

// ----------------------------------------------------------------------------
// Main handler
// ----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    logEvent('error', 'webhook', 'Missing stripe-signature header', {});
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 },
    );
  }

  if (!process.env.STRIPE_CONNECT_WEBHOOK_SECRET) {
    logEvent(
      'error',
      'webhook',
      'STRIPE_CONNECT_WEBHOOK_SECRET is not configured',
      {},
    );
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 },
    );
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    logEvent('error', 'webhook', 'Signature verification failed', {
      error: message,
    });
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 },
    );
  }

  logEvent('info', event.type, 'Received Connect webhook event', {
    eventId: event.id,
    livemode: event.livemode,
    account: event.account,
  });

  let sb: SupabaseClient;
  try {
    sb = getServiceRoleClient();
  } catch (err) {
    logEvent('error', event.type, 'Service role client init failed', {
      eventId: event.id,
      error: err instanceof Error ? err.message : 'unknown',
    });
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 },
    );
  }

  try {
    // `transfer.paid` / `transfer.failed` aren't always present in the
    // Stripe SDK's typed union for our pinned API version, but Stripe
    // still sends them for parent-custodial flows on some accounts.
    // Compare via the untyped event.type string to cover all shapes
    // (transfer.paid, transfer.failed, transfer.reversed).
    const eventType = event.type as string;

    switch (eventType) {
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account, sb);
        break;

      case 'account.application.deauthorized':
        await handleAccountDeauthorized(event, sb);
        break;

      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer, sb);
        break;

      case 'transfer.paid':
        await handleTransferPaid(event.data.object as Stripe.Transfer, sb);
        break;

      case 'transfer.failed':
      case 'transfer.reversed':
        await handleTransferFailed(event.data.object as Stripe.Transfer, sb);
        break;

      default:
        logEvent('info', eventType, 'Unhandled Connect event', {
          eventId: event.id,
        });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    logEvent('error', event.type, 'Handler failed', {
      eventId: event.id,
      error: message,
    });
    // 500 triggers Stripe retry (useful for transient DB outages).
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 },
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
