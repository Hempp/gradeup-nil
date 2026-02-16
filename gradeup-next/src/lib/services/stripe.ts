import Stripe from 'stripe';

// Lazy initialization to avoid build-time errors when env vars aren't set
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

export interface CreatePaymentIntentInput {
  amount: number; // in cents
  currency?: string;
  dealId: string;
  athleteId: string;
  brandId: string;
  description?: string;
}

export async function createPaymentIntent(input: CreatePaymentIntentInput) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { success: false, error: 'Stripe not configured' };
  }

  try {
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: input.amount,
      currency: input.currency || 'usd',
      metadata: {
        dealId: input.dealId,
        athleteId: input.athleteId,
        brandId: input.brandId,
      },
      description: input.description,
    });

    return { success: true, data: paymentIntent };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create payment' };
  }
}

export async function createConnectedAccount(email: string, athleteId: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { success: false, error: 'Stripe not configured' };
  }

  try {
    const stripe = getStripe();
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      metadata: { athleteId },
      capabilities: {
        transfers: { requested: true },
      },
    });

    return { success: true, data: account };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create account' };
  }
}

export async function createAccountLink(accountId: string, returnUrl: string, refreshUrl: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { success: false, error: 'Stripe not configured' };
  }

  try {
    const stripe = getStripe();
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return { success: true, data: accountLink };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create link' };
  }
}

export async function transferToConnectedAccount(amount: number, destinationAccountId: string, dealId: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { success: false, error: 'Stripe not configured' };
  }

  try {
    const stripe = getStripe();
    const transfer = await stripe.transfers.create({
      amount,
      currency: 'usd',
      destination: destinationAccountId,
      metadata: { dealId },
    });

    return { success: true, data: transfer };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to transfer' };
  }
}
