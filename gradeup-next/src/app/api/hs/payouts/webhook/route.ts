/**
 * HS-NIL Parent-Custodial Payout Webhook (PLACEHOLDER)
 * ----------------------------------------------------------------------------
 * Receives Stripe Connect transfer events for HS-NIL parent-custodial
 * payouts and reflects them onto `hs_deal_parent_payouts.status`.
 *
 * ⚠️ THIS ENDPOINT DOES NOT VERIFY THE STRIPE SIGNATURE ⚠️
 *
 * A real webhook must:
 *   1. Read the raw request body (already done below).
 *   2. Call `stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)`
 *      to verify the `stripe-signature` header.
 *   3. Reject on signature mismatch with a 400.
 *
 * Until a dedicated Connect webhook signing secret is provisioned (separate
 * from the platform webhook secret used in /api/webhooks/stripe), this
 * handler parses the JSON body directly. It emits a prominent `console.warn`
 * on every invocation so unverified traffic is never silent.
 *
 * Returns 200 regardless of processing outcome — Stripe treats non-200 as a
 * retry signal, and we don't want an ambiguous DB error to spam retries for
 * an event we've logged. Downstream state repair is via the main payout
 * lifecycle functions, not this webhook.
 *
 * See also: src/app/api/webhooks/stripe/route.ts — the platform webhook,
 * which DOES verify signatures. This handler should converge to that
 * pattern before going live.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ----------------------------------------------------------------------------
// Infrastructure
// ----------------------------------------------------------------------------

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

// ----------------------------------------------------------------------------
// Event -> DB mapping
// ----------------------------------------------------------------------------

interface StripeEventShape {
  id?: string;
  type?: string;
  data?: {
    object?: {
      id?: string;
      metadata?: { dealId?: string };
      destination?: string;
      failure_code?: string;
      failure_message?: string;
    };
  };
}

async function applyEventToPayouts(
  sb: SupabaseClient,
  event: StripeEventShape,
): Promise<{ handled: boolean; note?: string }> {
  const type = event.type ?? '';
  const obj = event.data?.object ?? {};
  const dealId = obj.metadata?.dealId;
  const transferId = obj.id;

  // We need a dealId to locate the row. Without metadata.dealId there's
  // nothing to update here — log and drop.
  if (!dealId) {
    return { handled: false, note: 'missing metadata.dealId' };
  }

  switch (type) {
    case 'transfer.created': {
      const { error } = await sb
        .from('hs_deal_parent_payouts')
        .update({
          stripe_transfer_id: transferId,
          status: 'authorized',
          authorized_at: new Date().toISOString(),
        })
        .eq('deal_id', dealId);
      return { handled: !error, note: error?.message };
    }
    case 'transfer.paid': {
      const { error } = await sb
        .from('hs_deal_parent_payouts')
        .update({
          stripe_transfer_id: transferId,
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('deal_id', dealId);
      return { handled: !error, note: error?.message };
    }
    case 'transfer.failed': {
      const reason =
        obj.failure_message ?? obj.failure_code ?? 'stripe transfer failed';
      const { error } = await sb
        .from('hs_deal_parent_payouts')
        .update({
          stripe_transfer_id: transferId,
          status: 'failed',
          failed_reason: String(reason).slice(0, 500),
        })
        .eq('deal_id', dealId);
      return { handled: !error, note: error?.message };
    }
    default:
      return { handled: false, note: `unhandled event type: ${type}` };
  }
}

// ----------------------------------------------------------------------------
// Handler
// ----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // Raw body — needed for future signature verification.
  const body = await request.text();

  // LOUD unverified-traffic warning. Do NOT remove this until real
  // Stripe signature verification is wired in (see module header).
  // eslint-disable-next-line no-console
  console.warn(
    '[hs-nil payouts webhook] UNVERIFIED webhook invocation — ' +
      'signature verification NOT implemented. Do not ship to prod without ' +
      'STRIPE_CONNECT_WEBHOOK_SECRET + stripe.webhooks.constructEvent().',
    {
      contentLength: body.length,
      hasSignatureHeader: Boolean(request.headers.get('stripe-signature')),
    },
  );

  let event: StripeEventShape;
  try {
    event = JSON.parse(body) as StripeEventShape;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil payouts webhook] malformed JSON body', {
      error: err instanceof Error ? err.message : String(err),
    });
    // Still 200 — we don't want Stripe retrying a bad body forever.
    return NextResponse.json({ received: true, parsed: false });
  }

  try {
    const sb = getServiceRoleClient();
    const result = await applyEventToPayouts(sb, event);
    // eslint-disable-next-line no-console
    console.warn('[hs-nil payouts webhook] processed (unverified)', {
      eventId: event.id,
      type: event.type,
      handled: result.handled,
      note: result.note,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil payouts webhook] handler error (swallowed)', {
      error: err instanceof Error ? err.message : String(err),
      eventId: event.id,
      type: event.type,
    });
    // Fall through — Stripe expects 200.
  }

  return NextResponse.json({ received: true });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
