/**
 * GradeUp NIL Platform - Stripe Connect Onboarding
 * Creates onboarding link for athletes to connect their bank accounts
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get athlete profile
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('id, profile_id, profiles!inner(email, first_name, last_name)')
      .eq('profile_id', user.id)
      .single();

    if (athleteError || !athlete) {
      throw new Error('Athlete profile not found');
    }

    // Parse request body
    const { return_url } = await req.json();
    const baseUrl = return_url || Deno.env.get('SITE_URL') || 'https://gradeup.com';

    // Check for existing connected account
    const { data: existingAccount } = await supabase
      .from('stripe_connected_accounts')
      .select('stripe_account_id, details_submitted')
      .eq('athlete_id', athlete.id)
      .single();

    let stripeAccountId: string;

    if (existingAccount?.stripe_account_id) {
      // Use existing account
      stripeAccountId = existingAccount.stripe_account_id;
    } else {
      // Create new Stripe Connect Express account
      const profile = athlete.profiles as any;
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: profile.email,
        business_type: 'individual',
        individual: {
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'weekly',
              weekly_anchor: 'friday',
            },
          },
        },
        metadata: {
          athlete_id: athlete.id,
          profile_id: user.id,
          platform: 'gradeup_nil',
        },
      });

      stripeAccountId = account.id;

      // Store in database
      await supabase
        .from('stripe_connected_accounts')
        .insert({
          athlete_id: athlete.id,
          stripe_account_id: stripeAccountId,
          account_type: 'express',
          country: 'US',
          default_currency: 'usd',
          payout_schedule_interval: 'weekly',
          payout_schedule_anchor: 5, // Friday
        });
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${baseUrl}/athlete/payments?refresh=true`,
      return_url: `${baseUrl}/athlete/payments?success=true`,
      type: 'account_onboarding',
      collect: 'eventually_due',
    });

    return new Response(
      JSON.stringify({ url: accountLink.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Stripe Connect onboarding error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
