/**
 * POST /api/hs/brand/payment-method/confirm
 *
 * Called after the brand completes payment-method setup on the client
 * (SetupIntent succeeded). Body: { paymentMethodId: string }.
 *
 * Validates the payment method belongs to the brand's Stripe Customer, sets
 * it as the customer's default (for invoice/off-session use), and stamps
 * `brands.default_payment_method_id`.
 *
 * In dev without STRIPE_SECRET_KEY we accept any string and persist it —
 * lets the UI be exercised end-to-end.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';

import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';

let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
    });
  }
  return stripeClient;
}

const schema = z.object({
  paymentMethodId: z.string().trim().min(3).max(200),
});

export async function POST(request: NextRequest) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return rateLimited;

    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json(
        { error: 'Invalid JSON body', code: 'invalid_body' },
        { status: 400 },
      );
    }

    const parsed = schema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues.map((i) => i.message).join('; '),
          code: 'invalid_body',
        },
        { status: 400 },
      );
    }

    const { paymentMethodId } = parsed.data;

    const { data: brand, error: brandErr } = await supabase
      .from('brands')
      .select('id, stripe_customer_id')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (brandErr || !brand) {
      return NextResponse.json(
        { error: 'No brand profile found.', code: 'no_brand' },
        { status: 404 },
      );
    }

    const customerId = brand.stripe_customer_id as string | null;
    if (!customerId) {
      return NextResponse.json(
        {
          error: 'Setup not started — call /setup first.',
          code: 'no_customer',
        },
        { status: 400 },
      );
    }

    // Dev/stub path — just persist and return.
    if (
      !process.env.STRIPE_SECRET_KEY &&
      process.env.NODE_ENV !== 'production'
    ) {
      await supabase
        .from('brands')
        .update({ default_payment_method_id: paymentMethodId })
        .eq('id', brand.id);
      return NextResponse.json({ ok: true, dev: true });
    }

    const stripe = getStripe();

    // Verify the payment method belongs to this customer (defense in depth —
    // the client could have fabricated a pm_* id).
    let paymentMethod: Stripe.PaymentMethod;
    try {
      paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `Payment method not found: ${message}`, code: 'pm_not_found' },
        { status: 400 },
      );
    }

    if (
      paymentMethod.customer &&
      paymentMethod.customer !== customerId &&
      typeof paymentMethod.customer === 'string'
    ) {
      return NextResponse.json(
        {
          error: 'Payment method does not belong to this brand.',
          code: 'pm_mismatch',
        },
        { status: 403 },
      );
    }

    // Attach (if not already) + set as default.
    if (!paymentMethod.customer) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
    }

    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    const { error: updateErr } = await supabase
      .from('brands')
      .update({ default_payment_method_id: paymentMethodId })
      .eq('id', brand.id);

    if (updateErr) {
      return NextResponse.json(
        { error: `Failed to save: ${updateErr.message}`, code: 'db_update_failed' },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    // eslint-disable-next-line no-console
    console.error('[brand-payment-confirm] failed', { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
