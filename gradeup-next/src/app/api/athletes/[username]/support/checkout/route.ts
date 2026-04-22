/**
 * POST /api/athletes/[username]/support/checkout
 *
 * Creates a Stripe Checkout session for a supporter to pay an athlete
 * directly. Returns { url } for the client to redirect to Stripe-hosted
 * checkout.
 *
 * Legal framing (see migration 20260422_002):
 *   This is an NIL PAYMENT, not a donation. The supporter receives a
 *   shoutout/message/content deliverable in exchange. No charitable
 *   receipt is issued. Athlete reports as NIL income; supporter cannot
 *   deduct. Copy in the UI reinforces this. IRS AM-2023-004 compliant
 *   by construction — no 501(c)(3) plumbing anywhere.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const DEFAULT_AMOUNTS = [500, 1000, 2500, 5000];
const MIN_CENTS = 100;
const MAX_CENTS = 50_000; // $500 per single payment — fraud + chargeback ceiling

const schema = z.object({
  amountCents: z.number().int().min(MIN_CENTS).max(MAX_CENTS),
  supporterEmail: z.string().email().max(320),
  supporterName: z.string().max(200).optional(),
  supporterMessage: z.string().max(500).optional(),
});

let stripeClient: Stripe | null = null;
function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
    });
  }
  return stripeClient;
}

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
    'https://gradeup-next.vercel.app'
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
): Promise<NextResponse> {
  try {
    const { username } = await params;
    if (!username || typeof username !== 'string' || username.length > 60) {
      return NextResponse.json({ error: 'Invalid athlete' }, { status: 404 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Supporter payments are temporarily unavailable.' },
        { status: 503 }
      );
    }

    const sb = getServiceRoleClient();
    if (!sb) {
      return NextResponse.json(
        { error: 'Service unavailable', code: 'internal' },
        { status: 500 }
      );
    }

    // Resolve athlete: look up by username against hs_athlete_profiles.
    const { data: athlete } = await sb
      .from('hs_athlete_profiles')
      .select('user_id, school_name, public_visibility')
      .eq('username', username)
      .maybeSingle();

    if (!athlete || !athlete.public_visibility) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
    }

    // Parse + validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join('; '), code: 'validation' },
        { status: 400 }
      );
    }

    const { amountCents, supporterEmail, supporterName, supporterMessage } = parsed.data;

    // Pre-insert a pending row — we need a stable ID to reconcile against
    // Stripe webhook events.
    const { data: payment, error: insertError } = await sb
      .from('supporter_payments')
      .insert({
        athlete_user_id: athlete.user_id,
        supporter_email: supporterEmail,
        supporter_name: supporterName ?? null,
        supporter_message: supporterMessage ?? null,
        amount_cents: amountCents,
        currency: 'usd',
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertError || !payment) {
      // eslint-disable-next-line no-console
      console.error('[supporter-checkout] insert failed', insertError?.message);
      return NextResponse.json(
        { error: 'Could not create payment record' },
        { status: 500 }
      );
    }

    const returnUrl = `${siteUrl()}/athletes/${encodeURIComponent(username)}/support/thanks?pid=${payment.id}`;
    const cancelUrl = `${siteUrl()}/athletes/${encodeURIComponent(username)}?support_cancelled=1`;

    // Create Stripe Checkout session. We intentionally do NOT use a
    // Connect destination charge here — supporter pays the platform, and
    // the platform later transfers to the athlete once compliance gates
    // (parent consent for minors, state NIL rules) are satisfied out-of-band.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: supporterEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name: `Supporter shoutout — @${username}`,
              description:
                'NIL payment to a GradeUp scholar-athlete in exchange for a personalized shoutout or message. Not tax-deductible.',
            },
          },
          quantity: 1,
        },
      ],
      success_url: returnUrl,
      cancel_url: cancelUrl,
      metadata: {
        type: 'supporter_payment',
        supporter_payment_id: payment.id,
        athlete_username: username,
        athlete_user_id: athlete.user_id,
      },
      payment_intent_data: {
        description: `GradeUp supporter payment to @${username}`,
        metadata: {
          type: 'supporter_payment',
          supporter_payment_id: payment.id,
        },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'Stripe session did not return a URL' },
        { status: 500 }
      );
    }

    // Stamp the session id so the webhook can look up by session.
    await sb
      .from('supporter_payments')
      .update({ stripe_session_id: session.id })
      .eq('id', payment.id);

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[supporter-checkout]', msg);
    return NextResponse.json(
      { error: 'Internal error', code: 'internal' },
      { status: 500 }
    );
  }
}

export const SUPPORT_AMOUNT_PRESETS_CENTS = DEFAULT_AMOUNTS;
