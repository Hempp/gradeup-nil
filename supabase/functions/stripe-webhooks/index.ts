/**
 * GradeUp NIL Platform - Stripe Webhooks Handler
 * Processes all Stripe events for payments, payouts, and subscriptions
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

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

// Initialize admin Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      // ===== PAYMENT EVENTS =====
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleRefund(event.data.object as Stripe.Charge);
        break;

      // ===== CONNECTED ACCOUNT EVENTS =====
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      case 'payout.paid':
        await handlePayoutPaid(event.data.object as Stripe.Payout);
        break;

      case 'payout.failed':
        await handlePayoutFailed(event.data.object as Stripe.Payout);
        break;

      // ===== SUBSCRIPTION EVENTS =====
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }
});

// ============================================================================
// PAYMENT HANDLERS
// ============================================================================

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { deal_id, athlete_id, platform_fee_cents } = paymentIntent.metadata;

  // Update payment record
  const { error: paymentError } = await supabaseAdmin
    .from('payments')
    .update({
      status: 'succeeded',
      stripe_charge_id: paymentIntent.latest_charge as string,
      paid_at: new Date().toISOString(),
      payment_method_type: paymentIntent.payment_method_types?.[0],
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (paymentError) {
    console.error('Failed to update payment:', paymentError);
  }

  // Update deal status to active/completed
  await supabaseAdmin
    .from('deals')
    .update({ status: 'active' })
    .eq('id', deal_id)
    .eq('status', 'accepted');

  // Create notification for athlete
  const { data: athlete } = await supabaseAdmin
    .from('athletes')
    .select('profile_id')
    .eq('id', athlete_id)
    .single();

  if (athlete) {
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: athlete.profile_id,
        type: 'payment_received',
        title: 'Payment Received!',
        body: `You received a payment of ${formatCurrency(paymentIntent.amount - parseInt(platform_fee_cents || '0'))} for your deal.`,
        related_type: 'deal',
        related_id: deal_id,
        action_url: `/athlete/deals/${deal_id}`,
      });
  }

  console.log(`Payment succeeded for deal ${deal_id}: $${paymentIntent.amount / 100}`);
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const lastError = paymentIntent.last_payment_error;

  await supabaseAdmin
    .from('payments')
    .update({
      status: 'failed',
      failure_code: lastError?.code,
      failure_message: lastError?.message,
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  // Notify brand of failure
  const { data: customer } = await supabaseAdmin
    .from('stripe_customers')
    .select('brand_id, brands!inner(profile_id)')
    .eq('stripe_customer_id', paymentIntent.customer)
    .single();

  if (customer) {
    const brand = customer.brands as any;
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: brand.profile_id,
        type: 'payment_failed',
        title: 'Payment Failed',
        body: `Your payment failed: ${lastError?.message || 'Unknown error'}. Please update your payment method.`,
        related_type: 'deal',
        related_id: paymentIntent.metadata.deal_id,
        action_url: '/brand/billing',
      });
  }

  console.log(`Payment failed for intent ${paymentIntent.id}: ${lastError?.message}`);
}

async function handleRefund(charge: Stripe.Charge) {
  const refunds = charge.refunds?.data || [];
  const latestRefund = refunds[0];

  if (!latestRefund) return;

  // Find the payment by charge ID
  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('id, deal_id')
    .eq('stripe_charge_id', charge.id)
    .single();

  if (!payment) {
    console.log(`No payment found for charge ${charge.id}`);
    return;
  }

  // Record refund
  await supabaseAdmin
    .from('refunds')
    .insert({
      payment_id: payment.id,
      stripe_refund_id: latestRefund.id,
      amount_cents: latestRefund.amount,
      reason: latestRefund.reason || 'other',
      status: latestRefund.status,
    });

  // Update payment status
  const isFullRefund = latestRefund.amount === charge.amount;
  await supabaseAdmin
    .from('payments')
    .update({
      status: isFullRefund ? 'refunded' : 'partially_refunded',
      refunded_at: new Date().toISOString(),
    })
    .eq('id', payment.id);

  console.log(`Refund processed: $${latestRefund.amount / 100} for payment ${payment.id}`);
}

// ============================================================================
// CONNECTED ACCOUNT HANDLERS
// ============================================================================

async function handleAccountUpdated(account: Stripe.Account) {
  await supabaseAdmin
    .from('stripe_connected_accounts')
    .update({
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_account_id', account.id);

  // If account is now fully enabled, notify athlete
  if (account.charges_enabled && account.payouts_enabled) {
    const { data: connectedAccount } = await supabaseAdmin
      .from('stripe_connected_accounts')
      .select('athlete_id, athletes!inner(profile_id)')
      .eq('stripe_account_id', account.id)
      .single();

    if (connectedAccount) {
      const athlete = connectedAccount.athletes as any;
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: athlete.profile_id,
          type: 'system',
          title: 'Payment Account Ready!',
          body: 'Your payment account is fully set up. You can now receive payments for deals!',
          action_url: '/athlete/payments',
        });
    }
  }

  console.log(`Account ${account.id} updated: charges=${account.charges_enabled}, payouts=${account.payouts_enabled}`);
}

async function handlePayoutPaid(payout: Stripe.Payout) {
  // Update payout record
  await supabaseAdmin
    .from('payouts')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('stripe_payout_id', payout.id);

  console.log(`Payout ${payout.id} paid: $${payout.amount / 100}`);
}

async function handlePayoutFailed(payout: Stripe.Payout) {
  await supabaseAdmin
    .from('payouts')
    .update({
      status: 'failed',
      failure_code: payout.failure_code,
      failure_message: payout.failure_message,
    })
    .eq('stripe_payout_id', payout.id);

  console.log(`Payout ${payout.id} failed: ${payout.failure_message}`);
}

// ============================================================================
// SUBSCRIPTION HANDLERS
// ============================================================================

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const { brand_id } = subscription.metadata;

  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'unpaid',
    trialing: 'trialing',
    incomplete: 'incomplete',
    incomplete_expired: 'canceled',
    paused: 'past_due',
  };

  const status = statusMap[subscription.status] || 'incomplete';

  // Get plan from price
  const priceId = subscription.items.data[0]?.price.id;
  const { data: plan } = await supabaseAdmin
    .from('subscription_plans')
    .select('id')
    .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
    .single();

  // Upsert subscription
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
      brand_id,
      stripe_subscription_id: subscription.id,
      plan_id: plan?.id,
      status,
      billing_cycle: subscription.items.data[0]?.price.recurring?.interval === 'year' ? 'yearly' : 'monthly',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'stripe_subscription_id',
    });

  if (error) {
    console.error('Failed to update subscription:', error);
  }

  console.log(`Subscription ${subscription.id} updated: ${status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  console.log(`Subscription ${subscription.id} deleted`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Update platform revenue for subscription payments
  if (invoice.subscription) {
    const now = new Date();
    await supabaseAdmin
      .from('platform_revenue')
      .upsert({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        subscription_revenue_cents: invoice.amount_paid,
        subscribers_count: 1,
      }, {
        onConflict: 'year,month',
        ignoreDuplicates: false,
      });
  }

  console.log(`Invoice ${invoice.id} paid: $${(invoice.amount_paid || 0) / 100}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // Notify brand of failed subscription payment
  const { data: customer } = await supabaseAdmin
    .from('stripe_customers')
    .select('brand_id, brands!inner(profile_id)')
    .eq('stripe_customer_id', invoice.customer)
    .single();

  if (customer) {
    const brand = customer.brands as any;
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: brand.profile_id,
        type: 'subscription_payment_failed',
        title: 'Subscription Payment Failed',
        body: 'Your subscription payment failed. Please update your payment method to continue using GradeUp.',
        action_url: '/brand/billing',
      });
  }

  console.log(`Invoice ${invoice.id} payment failed`);
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}
