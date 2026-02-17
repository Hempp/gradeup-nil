import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

// =====================================================================================
// Stripe Webhook Handler
// =====================================================================================
// This endpoint receives webhook events from Stripe and processes them accordingly.
// All events are verified using Stripe's signature verification to ensure authenticity.
//
// To set up webhooks:
// 1. Go to https://dashboard.stripe.com/webhooks
// 2. Add endpoint: https://your-domain.com/api/webhooks/stripe
// 3. Select events to listen for (payment_intent, checkout, subscription)
// 4. Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET env var
// =====================================================================================

// Lazy initialization to avoid build-time errors when env vars aren't set
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

// Structured logging for webhook events
function logWebhookEvent(
  level: 'info' | 'warn' | 'error',
  eventType: string,
  message: string,
  metadata?: Record<string, unknown>
) {
  const logData = {
    timestamp: new Date().toISOString(),
    service: 'stripe-webhook',
    eventType,
    message,
    ...metadata,
  };

  switch (level) {
    case 'error':
      console.error(JSON.stringify(logData));
      break;
    case 'warn':
      console.warn(JSON.stringify(logData));
      break;
    default:
      console.log(JSON.stringify(logData));
  }
}

// =====================================================================================
// Event Handlers
// =====================================================================================

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { dealId, athleteId } = paymentIntent.metadata;

  logWebhookEvent('info', 'payment_intent.succeeded', 'Processing successful payment', {
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    dealId,
    athleteId,
  });

  // Update payment record to completed
  const { error: paymentError } = await supabase
    .from('payments')
    .update({
      status: 'completed',
      paid_at: new Date().toISOString(),
      processor: 'stripe',
      processor_payment_id: paymentIntent.id,
      confirmation_number: paymentIntent.id,
    })
    .eq('processor_payment_id', paymentIntent.id);

  if (paymentError) {
    logWebhookEvent('error', 'payment_intent.succeeded', 'Failed to update payment record', {
      paymentIntentId: paymentIntent.id,
      error: paymentError.message,
    });
    throw new Error(`Failed to update payment: ${paymentError.message}`);
  }

  // Update deal status if needed
  if (dealId) {
    const { error: dealError } = await supabase
      .from('deals')
      .update({ payment_status: 'paid' })
      .eq('id', dealId);

    if (dealError) {
      logWebhookEvent('warn', 'payment_intent.succeeded', 'Failed to update deal payment status', {
        dealId,
        error: dealError.message,
      });
    }
  }

  logWebhookEvent('info', 'payment_intent.succeeded', 'Payment processed successfully', {
    paymentIntentId: paymentIntent.id,
  });
}

async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const failureMessage =
    paymentIntent.last_payment_error?.message || 'Payment failed';

  logWebhookEvent('warn', 'payment_intent.payment_failed', 'Payment failed', {
    paymentIntentId: paymentIntent.id,
    failureCode: paymentIntent.last_payment_error?.code,
    failureMessage,
    dealId: paymentIntent.metadata.dealId,
  });

  const { error } = await supabase
    .from('payments')
    .update({
      status: 'failed',
      failure_reason: failureMessage,
      // retry_count will be handled separately if retry logic is needed
      last_retry_at: new Date().toISOString(),
    })
    .eq('processor_payment_id', paymentIntent.id);

  if (error) {
    logWebhookEvent('error', 'payment_intent.payment_failed', 'Failed to update payment record', {
      paymentIntentId: paymentIntent.id,
      error: error.message,
    });
    throw new Error(`Failed to update payment: ${error.message}`);
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { dealId, athleteId, brandId } = session.metadata || {};

  logWebhookEvent('info', 'checkout.session.completed', 'Checkout session completed', {
    sessionId: session.id,
    customerId: session.customer,
    amountTotal: session.amount_total,
    dealId,
  });

  // If there's an associated payment intent, update the payment record
  if (session.payment_intent && typeof session.payment_intent === 'string') {
    const { error } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        paid_at: new Date().toISOString(),
        processor: 'stripe',
        processor_payment_id: session.payment_intent,
      })
      .eq('deal_id', dealId);

    if (error) {
      logWebhookEvent('warn', 'checkout.session.completed', 'Failed to update payment from checkout', {
        sessionId: session.id,
        error: error.message,
      });
    }
  }

  // Handle subscription checkout
  if (session.mode === 'subscription' && session.subscription) {
    logWebhookEvent('info', 'checkout.session.completed', 'Subscription checkout completed', {
      sessionId: session.id,
      subscriptionId: session.subscription,
    });
  }
}

async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

  logWebhookEvent('info', 'customer.subscription.created', 'New subscription created', {
    subscriptionId: subscription.id,
    customerId,
    status: subscription.status,
    priceId: subscription.items.data[0]?.price.id,
  });

  // Look up the profile by Stripe customer ID and update subscription status
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: subscription.status,
      subscription_id: subscription.id,
      subscription_price_id: subscription.items.data[0]?.price.id,
      subscription_current_period_end: 'current_period_end' in subscription && subscription.current_period_end
        ? new Date((subscription.current_period_end as number) * 1000).toISOString()
        : null,
    })
    .eq('stripe_customer_id', customerId);

  if (error) {
    logWebhookEvent('warn', 'customer.subscription.created', 'Failed to update profile subscription', {
      subscriptionId: subscription.id,
      customerId,
      error: error.message,
    });
  }
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

  logWebhookEvent('info', 'customer.subscription.updated', 'Subscription updated', {
    subscriptionId: subscription.id,
    customerId,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: subscription.status,
      subscription_price_id: subscription.items.data[0]?.price.id,
      subscription_current_period_end: 'current_period_end' in subscription && subscription.current_period_end
        ? new Date((subscription.current_period_end as number) * 1000).toISOString()
        : null,
      subscription_cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq('stripe_customer_id', customerId);

  if (error) {
    logWebhookEvent('warn', 'customer.subscription.updated', 'Failed to update profile subscription', {
      subscriptionId: subscription.id,
      customerId,
      error: error.message,
    });
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

  logWebhookEvent('info', 'customer.subscription.deleted', 'Subscription cancelled/deleted', {
    subscriptionId: subscription.id,
    customerId,
  });

  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'canceled',
      subscription_id: null,
      subscription_price_id: null,
      subscription_current_period_end: null,
      subscription_cancel_at_period_end: false,
    })
    .eq('stripe_customer_id', customerId);

  if (error) {
    logWebhookEvent('warn', 'customer.subscription.deleted', 'Failed to update profile subscription', {
      subscriptionId: subscription.id,
      customerId,
      error: error.message,
    });
  }
}

// =====================================================================================
// Main Webhook Handler
// =====================================================================================

export async function POST(request: NextRequest) {
  // Get the raw body for signature verification
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  // Validate that signature header is present
  if (!signature) {
    logWebhookEvent('error', 'webhook', 'Missing stripe-signature header', {});
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  // Validate webhook secret is configured
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    logWebhookEvent('error', 'webhook', 'STRIPE_WEBHOOK_SECRET is not configured', {});
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  // Verify webhook signature
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logWebhookEvent('error', 'webhook', 'Webhook signature verification failed', {
      error: errorMessage,
    });
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  logWebhookEvent('info', event.type, 'Received webhook event', {
    eventId: event.id,
    livemode: event.livemode,
  });

  // Get Supabase client for database operations
  const supabase = await createClient();

  try {
    // Handle the event based on its type
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent,
          supabase
        );
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent,
          supabase
        );
        break;

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
          supabase
        );
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(
          event.data.object as Stripe.Subscription,
          supabase
        );
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
          supabase
        );
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
          supabase
        );
        break;

      default:
        // Log unhandled events for monitoring
        logWebhookEvent('info', event.type, 'Unhandled event type', {
          eventId: event.id,
        });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logWebhookEvent('error', event.type, 'Error processing webhook event', {
      eventId: event.id,
      error: errorMessage,
    });

    // Return 500 to trigger Stripe retry mechanism
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// =====================================================================================
// Route Configuration
// =====================================================================================

// Disable body parsing - we need the raw body for signature verification
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
