/**
 * GradeUp NIL Platform - Create Subscription Checkout
 * Creates Stripe Checkout session for brand subscriptions
 *
 * Pricing:
 * - Starter: $99/month ($950/year)
 * - Growth: $299/month ($2,990/year)
 * - Enterprise: $999/month ($9,990/year)
 *
 * @nexus CIPHER deployment
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

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

    const { plan_id, billing_cycle = 'monthly' } = await req.json();
    if (!plan_id) {
      throw new Error('Plan ID is required');
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

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      throw new Error('Subscription plan not found');
    }

    // Get or create Stripe price ID (or use existing)
    const priceId = billing_cycle === 'yearly'
      ? plan.stripe_price_id_yearly
      : plan.stripe_price_id_monthly;

    if (!priceId) {
      throw new Error(`No ${billing_cycle} pricing configured for this plan`);
    }

    // Get or create Stripe customer
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

    const siteUrl = Deno.env.get('SITE_URL') || 'https://gradeup.com';

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.stripe_customer_id,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/brand/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/brand/billing?canceled=true`,
      subscription_data: {
        trial_period_days: plan.tier === 'starter' ? 14 : undefined, // 14-day trial for starter
        metadata: {
          brand_id: brand.id,
          plan_id: plan.id,
          plan_tier: plan.tier,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      tax_id_collection: { enabled: true },
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Create subscription checkout error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
