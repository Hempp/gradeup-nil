#!/usr/bin/env node
/**
 * GradeUp NIL - Stripe Products Setup Script
 * Creates subscription products and prices in Stripe
 *
 * Run: STRIPE_SECRET_KEY=sk_test_xxx node scripts/setup-stripe-products.js
 *
 * @nexus CIPHER deployment
 */

const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRODUCTS = [
  {
    name: 'GradeUp NIL - Starter',
    description: 'Perfect for small businesses starting with NIL. 5 athlete connections, 3 campaigns.',
    tier: 'starter',
    monthlyPrice: 9900, // $99
    yearlyPrice: 95000, // $950 (save ~20%)
    metadata: {
      max_athlete_connections: '5',
      max_active_campaigns: '3',
      api_access: 'false',
      priority_support: 'false',
    },
  },
  {
    name: 'GradeUp NIL - Growth',
    description: 'Scale your NIL campaigns with more athletes. 25 athlete connections, 10 campaigns.',
    tier: 'growth',
    monthlyPrice: 29900, // $299
    yearlyPrice: 299000, // $2990 (save ~17%)
    metadata: {
      max_athlete_connections: '25',
      max_active_campaigns: '10',
      api_access: 'false',
      priority_support: 'true',
    },
  },
  {
    name: 'GradeUp NIL - Enterprise',
    description: 'Unlimited access with API and custom features. Unlimited connections and campaigns.',
    tier: 'enterprise',
    monthlyPrice: 99900, // $999
    yearlyPrice: 999000, // $9990 (save ~17%)
    metadata: {
      max_athlete_connections: 'unlimited',
      max_active_campaigns: 'unlimited',
      api_access: 'true',
      priority_support: 'true',
    },
  },
];

async function setupStripeProducts() {
  console.log('🚀 Setting up Stripe products for GradeUp NIL...\n');

  const results = [];

  for (const product of PRODUCTS) {
    console.log(`Creating product: ${product.name}`);

    // Create Product
    const stripeProduct = await stripe.products.create({
      name: product.name,
      description: product.description,
      metadata: {
        tier: product.tier,
        ...product.metadata,
      },
    });

    console.log(`  ✓ Product created: ${stripeProduct.id}`);

    // Create Monthly Price
    const monthlyPrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: product.monthlyPrice,
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        tier: product.tier,
        billing_cycle: 'monthly',
      },
    });

    console.log(`  ✓ Monthly price: ${monthlyPrice.id} ($${product.monthlyPrice / 100}/month)`);

    // Create Yearly Price
    const yearlyPrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: product.yearlyPrice,
      currency: 'usd',
      recurring: {
        interval: 'year',
      },
      metadata: {
        tier: product.tier,
        billing_cycle: 'yearly',
      },
    });

    console.log(`  ✓ Yearly price: ${yearlyPrice.id} ($${product.yearlyPrice / 100}/year)\n`);

    results.push({
      tier: product.tier,
      productId: stripeProduct.id,
      monthlyPriceId: monthlyPrice.id,
      yearlyPriceId: yearlyPrice.id,
    });
  }

  console.log('=====================================');
  console.log('Add these to your Supabase database:');
  console.log('=====================================\n');

  for (const result of results) {
    console.log(`-- ${result.tier.toUpperCase()}`);
    console.log(`UPDATE subscription_plans SET`);
    console.log(`  stripe_product_id = '${result.productId}',`);
    console.log(`  stripe_price_id_monthly = '${result.monthlyPriceId}',`);
    console.log(`  stripe_price_id_yearly = '${result.yearlyPriceId}'`);
    console.log(`WHERE tier = '${result.tier}';\n`);
  }

  console.log('=====================================');
  console.log('Add these to your .env.local:');
  console.log('=====================================\n');

  for (const result of results) {
    console.log(`STRIPE_PRICE_${result.tier.toUpperCase()}_MONTHLY=${result.monthlyPriceId}`);
    console.log(`STRIPE_PRICE_${result.tier.toUpperCase()}_YEARLY=${result.yearlyPriceId}`);
  }

  console.log('\n✅ Stripe setup complete!');
}

setupStripeProducts().catch(console.error);
