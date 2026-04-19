/**
 * HS-NIL Brand Payments Webhook (Platform / non-Connect)
 * ----------------------------------------------------------------------------
 * Receives Stripe PLATFORM events (not Connect) related to HS NIL inbound
 * brand charges and reflects them onto `hs_deal_brand_charges`. Separate
 * endpoint from the Connect webhook (/api/hs/payouts/webhook) because:
 *
 *   - Stripe issues one webhook secret per endpoint. Connect events and
 *     platform events fire from the same Stripe account but through
 *     distinct event sources — giving each their own endpoint keeps the
 *     signature verification clean and the incident surface small.
 *
 *   - Handler code stays narrowly scoped: this file ONLY cares about
 *     `payment_intent.*` and `charge.refunded` for hs-nil-brand-charge
 *     flows. The existing /api/webhooks/stripe handles older platform
 *     events (checkout, subscriptions); this one is HS-NIL specific so
 *     the two don't step on each other's payment_intent events — we
 *     scope by metadata.scope === 'hs-nil-brand-charge'.
 *
 * Secret env var: STRIPE_HS_PAYMENTS_WEBHOOK_SECRET (distinct from the
 *                 platform and connect secrets). If not set, falls back
 *                 to STRIPE_WEBHOOK_SECRET so a single-secret deployment
 *                 still works. Missing both → 500.
 *
 * Event handling:
 *   - payment_intent.succeeded       → confirmCapture. If deal already
 *                                       approved, trigger a release pass.
 *   - payment_intent.payment_failed  → markChargeFailed + notify brand.
 *   - payment_intent.canceled        → mark canceled.
 *   - charge.refunded                → flag as refunded (if the refund
 *                                       came from outside our own UI).
 *   - everything else                → log + 200.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  confirmCapture,
  markChargeFailed,
  releaseEscrowToParent,
} from '@/lib/hs-nil/escrow';
import {
  sendPaymentCaptured,
  sendPaymentFailedToBrand,
} from '@/lib/services/hs-nil/payment-emails';

// ----------------------------------------------------------------------------
// Infra
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

function getSecret(): string | undefined {
  return (
    process.env.STRIPE_HS_PAYMENTS_WEBHOOK_SECRET ||
    process.env.STRIPE_PLATFORM_WEBHOOK_SECRET ||
    process.env.STRIPE_WEBHOOK_SECRET ||
    undefined
  );
}

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil payments webhook] Supabase service role not configured.',
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
): void {
  const line = {
    timestamp: new Date().toISOString(),
    service: 'hs-nil-payments-webhook',
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
// Scope helper — only act on HS-NIL brand charges
// ----------------------------------------------------------------------------

function isHsNilBrandCharge(pi: Stripe.PaymentIntent): boolean {
  return pi.metadata?.scope === 'hs-nil-brand-charge';
}

// ----------------------------------------------------------------------------
// Event handlers
// ----------------------------------------------------------------------------

async function handlePaymentIntentSucceeded(
  pi: Stripe.PaymentIntent,
  sb: SupabaseClient,
) {
  if (!isHsNilBrandCharge(pi)) {
    logEvent(
      'info',
      'payment_intent.succeeded',
      'Skipping — not an HS-NIL brand charge',
      { paymentIntentId: pi.id },
    );
    return;
  }

  const result = await confirmCapture(pi.id);
  if (!result.ok) {
    logEvent(
      'warn',
      'payment_intent.succeeded',
      'confirmCapture failed',
      { paymentIntentId: pi.id, reason: result.reason },
    );
    return;
  }

  const dealId = result.dealId;
  if (!dealId) return;

  // If the deal is already approved, the brand has completed their side but
  // the charge was still processing — now that it's captured, fire the
  // release. Otherwise the release triggers from the review route when the
  // brand approves.
  const { data: deal } = await sb
    .from('deals')
    .select('status, title, compensation_amount, brand:brands(contact_email, company_name), athlete:athletes(first_name, last_name)')
    .eq('id', dealId)
    .maybeSingle();

  const dealRow = deal as unknown as {
    status?: string;
    title?: string;
    compensation_amount?: number;
    brand?:
      | { contact_email?: string | null; company_name?: string | null }
      | { contact_email?: string | null; company_name?: string | null }[]
      | null;
    athlete?:
      | { first_name?: string | null; last_name?: string | null }
      | { first_name?: string | null; last_name?: string | null }[]
      | null;
  } | null;

  const brand = Array.isArray(dealRow?.brand)
    ? dealRow?.brand[0]
    : dealRow?.brand ?? null;
  const athlete = Array.isArray(dealRow?.athlete)
    ? dealRow?.athlete[0]
    : dealRow?.athlete ?? null;

  // Notify brand — best-effort.
  if (brand?.contact_email) {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      'https://gradeupnil.com';
    const first = (athlete?.first_name ?? '').trim();
    const last = (athlete?.last_name ?? '').trim();
    const athleteName = `${first} ${last}`.trim() || 'the athlete';
    void sendPaymentCaptured({
      recipientEmail: brand.contact_email,
      brandName: brand.company_name ?? 'there',
      athleteName,
      dealTitle: dealRow?.title ?? 'your deal',
      amountCents: pi.amount,
      dealUrl: `${appUrl}/hs/brand/deals/${dealId}`,
    }).catch((err) => {
      logEvent('warn', 'payment_intent.succeeded', 'sendPaymentCaptured failed', {
        dealId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  // Deal already approved? Fire the release.
  if (dealRow?.status === 'approved' || dealRow?.status === 'in_review') {
    // Only fire release when 'approved' (brand has reviewed). 'in_review'
    // just captured the charge while the brand hasn't clicked approve yet.
    if (dealRow.status === 'approved') {
      try {
        const release = await releaseEscrowToParent(dealId);
        logEvent(
          'info',
          'payment_intent.succeeded',
          'post-capture release pass',
          {
            dealId,
            ok: release.ok,
            deferred: release.deferred,
            reason: release.reason,
          },
        );
      } catch (err) {
        logEvent(
          'warn',
          'payment_intent.succeeded',
          'releaseEscrowToParent threw',
          {
            dealId,
            error: err instanceof Error ? err.message : String(err),
          },
        );
      }
    }
  }
}

async function handlePaymentIntentFailed(pi: Stripe.PaymentIntent) {
  if (!isHsNilBrandCharge(pi)) return;

  const reason = pi.last_payment_error?.message ?? 'Payment failed';
  const result = await markChargeFailed(pi.id, reason);
  if (!result.ok) {
    logEvent(
      'warn',
      'payment_intent.payment_failed',
      'markChargeFailed failed',
      { paymentIntentId: pi.id, reason: result.reason },
    );
    return;
  }

  // Notify brand — best-effort.
  const sb = getServiceRoleClient();
  const { data: deal } = await sb
    .from('deals')
    .select('id, title, brand:brands(contact_email, company_name)')
    .eq('id', result.dealId)
    .maybeSingle();

  const dealRow = deal as unknown as {
    id?: string;
    title?: string;
    brand?:
      | { contact_email?: string | null; company_name?: string | null }
      | { contact_email?: string | null; company_name?: string | null }[]
      | null;
  } | null;
  const brand = Array.isArray(dealRow?.brand)
    ? dealRow?.brand[0]
    : dealRow?.brand ?? null;

  if (brand?.contact_email && dealRow?.id) {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      'https://gradeupnil.com';
    void sendPaymentFailedToBrand({
      recipientEmail: brand.contact_email,
      brandName: brand.company_name ?? 'there',
      dealTitle: dealRow.title ?? 'your deal',
      amountCents: pi.amount,
      failureReason: reason,
      retryUrl: `${appUrl}/hs/brand/payment-method`,
    }).catch((err) => {
      logEvent(
        'warn',
        'payment_intent.payment_failed',
        'sendPaymentFailedToBrand failed',
        { error: err instanceof Error ? err.message : String(err) },
      );
    });
  }
}

async function handlePaymentIntentCanceled(
  pi: Stripe.PaymentIntent,
  sb: SupabaseClient,
) {
  if (!isHsNilBrandCharge(pi)) return;
  const { error } = await sb
    .from('hs_deal_brand_charges')
    .update({
      status: 'canceled',
      failure_reason: pi.cancellation_reason ?? 'canceled',
    })
    .eq('stripe_payment_intent_id', pi.id);
  if (error) {
    logEvent(
      'warn',
      'payment_intent.canceled',
      'Failed to mark canceled',
      { paymentIntentId: pi.id, error: error.message },
    );
  }
}

async function handleChargeRefunded(
  charge: Stripe.Charge,
  sb: SupabaseClient,
) {
  const pi =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;
  if (!pi) return;

  // Only act on rows we manage (scoped by metadata on the PaymentIntent).
  const { data: row } = await sb
    .from('hs_deal_brand_charges')
    .select('id, status')
    .eq('stripe_payment_intent_id', pi)
    .maybeSingle();

  if (!row) {
    logEvent(
      'info',
      'charge.refunded',
      'No matching hs_deal_brand_charges row — ignoring',
      { paymentIntentId: pi },
    );
    return;
  }

  if (row.status === 'refunded') return;

  const { error } = await sb
    .from('hs_deal_brand_charges')
    .update({
      status: 'refunded',
      refunded_at: new Date().toISOString(),
    })
    .eq('id', row.id);

  if (error) {
    logEvent('warn', 'charge.refunded', 'Failed to mark refunded', {
      chargeId: charge.id,
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

  const secret = getSecret();
  if (!secret) {
    logEvent(
      'error',
      'webhook',
      'No webhook secret configured (STRIPE_HS_PAYMENTS_WEBHOOK_SECRET / STRIPE_WEBHOOK_SECRET)',
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
    event = stripe.webhooks.constructEvent(body, signature, secret);
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

  logEvent('info', event.type, 'Received platform webhook event', {
    eventId: event.id,
    livemode: event.livemode,
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
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent,
          sb,
        );
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(
          event.data.object as Stripe.PaymentIntent,
          sb,
        );
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge, sb);
        break;
      default:
        logEvent('info', event.type, 'Unhandled event', { eventId: event.id });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    logEvent('error', event.type, 'Handler failed', {
      eventId: event.id,
      error: message,
    });
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 },
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
