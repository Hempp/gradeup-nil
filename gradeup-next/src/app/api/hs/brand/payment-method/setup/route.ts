/**
 * POST /api/hs/brand/payment-method/setup
 *
 * Create a Stripe SetupIntent so the brand can attach a payment method to
 * their Stripe Customer. Returns the client_secret for the Elements or
 * Checkout confirmation client to use.
 *
 * Design notes:
 *   - We ensure a Stripe Customer exists for the brand before creating the
 *     SetupIntent (ensureBrandCustomer is idempotent).
 *   - `usage: 'off_session'` is required because we then charge the card
 *     off-session when the contract transitions to fully_signed.
 *   - In dev (no STRIPE_SECRET_KEY) we return a fake client_secret so the
 *     client flow can still be exercised.
 *   - Rate-limited via the shared `mutation` bucket.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { ensureBrandCustomer } from '@/lib/hs-nil/escrow';

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

    // Resolve the brand row for the authenticated user.
    const { data: brand, error: brandErr } = await supabase
      .from('brands')
      .select('id, stripe_customer_id')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (brandErr || !brand) {
      return NextResponse.json(
        { error: 'No brand profile found for this user.', code: 'no_brand' },
        { status: 404 },
      );
    }

    const ensured = await ensureBrandCustomer(brand.id as string);
    if (!ensured.ok || !ensured.customerId) {
      return NextResponse.json(
        {
          error: ensured.reason ?? 'Could not create Stripe customer.',
          code: 'customer_failed',
        },
        { status: 500 },
      );
    }

    // Dev path — no STRIPE_SECRET_KEY in dev returns a fake client_secret so
    // the UI can simulate the happy path without Stripe credentials.
    if (
      !process.env.STRIPE_SECRET_KEY &&
      process.env.NODE_ENV !== 'production'
    ) {
      return NextResponse.json({
        clientSecret: `seti_stub_${String(brand.id).slice(0, 8)}_secret_dev`,
        customerId: ensured.customerId,
        dev: true,
      });
    }

    const stripe = getStripe();
    const setupIntent = await stripe.setupIntents.create(
      {
        customer: ensured.customerId,
        usage: 'off_session',
        payment_method_types: ['card'],
        metadata: {
          brandId: brand.id as string,
          profileId: user.id,
          scope: 'hs-nil-brand-setup',
        },
      },
      { idempotencyKey: `brand-setup-${brand.id}-${Date.now()}` },
    );

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: ensured.customerId,
      setupIntentId: setupIntent.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    // eslint-disable-next-line no-console
    console.error('[brand-payment-setup] failed', { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
