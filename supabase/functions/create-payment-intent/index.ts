/**
 * GradeUp NIL Platform - Create Payment Intent
 * Handles deal payments from brands to athletes with platform fee
 *
 * Flow:
 * 1. Brand initiates payment for accepted deal
 * 2. Create Stripe PaymentIntent with platform fee
 * 3. On success, transfer funds to athlete's connected account
 *
 * @nexus CIPHER + SUPA-MASTER deployment
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const PLATFORM_FEE_PERCENT = 12.0;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { deal_id } = await req.json();
    if (!deal_id) {
      throw new Error('Deal ID is required');
    }

    // Get brand profile
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, profile_id, company_name')
      .eq('profile_id', user.id)
      .single();

    if (brandError || !brand) {
      throw new Error('Brand profile not found');
    }

    // Get deal with athlete info
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select(`
        id, title, amount, status, brand_id, athlete_id,
        athlete:athletes!inner(
          id,
          profile_id,
          profiles:profile_id(first_name, last_name, email)
        )
      `)
      .eq('id', deal_id)
      .eq('brand_id', brand.id)
      .single();

    if (dealError || !deal) {
      throw new Error('Deal not found or access denied');
    }

    // Validate deal status
    const payableStatuses = ['accepted', 'active'];
    if (!payableStatuses.includes(deal.status)) {
      throw new Error(`Deal cannot be paid in ${deal.status} status`);
    }

    // Get athlete's connected account
    const { data: connectedAccount, error: accountError } = await supabase
      .from('stripe_connected_accounts')
      .select('stripe_account_id, charges_enabled, payouts_enabled')
      .eq('athlete_id', deal.athlete_id)
      .single();

    if (accountError || !connectedAccount) {
      throw new Error('Athlete has not connected their payment account');
    }

    if (!connectedAccount.charges_enabled || !connectedAccount.payouts_enabled) {
      throw new Error('Athlete payment account is not fully set up');
    }

    // Get or create Stripe customer for brand
    let { data: stripeCustomer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('brand_id', brand.id)
      .single();

    if (!stripeCustomer) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: brand.company_name,
        metadata: {
          brand_id: brand.id,
          profile_id: user.id,
          platform: 'gradeup_nil',
        },
      });

      await supabase
        .from('stripe_customers')
        .insert({
          brand_id: brand.id,
          stripe_customer_id: customer.id,
          billing_email: user.email,
          billing_name: brand.company_name,
        });

      stripeCustomer = { stripe_customer_id: customer.id };
    }

    // Calculate amounts
    const amountCents = Math.round(deal.amount * 100);
    const platformFeeCents = Math.ceil(amountCents * (PLATFORM_FEE_PERCENT / 100));
    const athleteAmountCents = amountCents - platformFeeCents;

    // Check for existing payment record
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, stripe_payment_intent_id, status')
      .eq('deal_id', deal_id)
      .in('status', ['pending', 'processing', 'requires_action'])
      .single();

    if (existingPayment?.stripe_payment_intent_id) {
      // Return existing payment intent
      const paymentIntent = await stripe.paymentIntents.retrieve(
        existingPayment.stripe_payment_intent_id
      );

      return new Response(
        JSON.stringify({
          client_secret: paymentIntent.client_secret,
          payment_id: existingPayment.id,
          amount: amountCents,
          platform_fee: platformFeeCents,
          athlete_amount: athleteAmountCents,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Create new PaymentIntent with automatic transfer to connected account
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: stripeCustomer.stripe_customer_id,
      automatic_payment_methods: { enabled: true },
      // Transfer to connected account after successful payment
      transfer_data: {
        destination: connectedAccount.stripe_account_id,
        amount: athleteAmountCents, // Amount after platform fee
      },
      metadata: {
        deal_id: deal.id,
        brand_id: brand.id,
        athlete_id: deal.athlete_id,
        platform: 'gradeup_nil',
        platform_fee_cents: platformFeeCents.toString(),
      },
      description: `GradeUp NIL Deal: ${deal.title}`,
      statement_descriptor_suffix: 'GRADEUP NIL',
    });

    // Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        deal_id: deal.id,
        brand_id: brand.id,
        athlete_id: deal.athlete_id,
        stripe_payment_intent_id: paymentIntent.id,
        amount_cents: amountCents,
        platform_fee_cents: platformFeeCents,
        athlete_amount_cents: athleteAmountCents,
        platform_fee_percent: PLATFORM_FEE_PERCENT,
        currency: 'usd',
        status: 'pending',
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Failed to create payment record:', paymentError);
    }

    return new Response(
      JSON.stringify({
        client_secret: paymentIntent.client_secret,
        payment_id: payment?.id,
        amount: amountCents,
        platform_fee: platformFeeCents,
        athlete_amount: athleteAmountCents,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Create payment intent error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
