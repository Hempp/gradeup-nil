/**
 * HS-NIL Parent Payout Onboarding — POST /api/hs/payouts/onboard
 * ----------------------------------------------------------------------------
 * Authenticated endpoint that starts (or resumes) a parent's Stripe Connect
 * Express onboarding flow.
 *
 * Flow:
 *   1. Verify the caller is signed in AND has role=hs_parent.
 *   2. Look up the caller's hs_parent_profiles row.
 *   3. If no stripe_connect_account_id yet → ask the configured payout
 *      provider to `createDestination`. Provider:
 *        - creates an Express connected account on Stripe,
 *        - creates the onboarding account link,
 *        - stamps stripe_connect_account_id onto the profile row.
 *   4. If a connect_account_id already exists → the account is mid-flow or
 *      needs attention; create a fresh account link via
 *      StripeConnectPayoutProvider.createOnboardingLink() (only available on
 *      the real provider — stub doesn't need the distinction because it
 *      always returns a single fake URL).
 *   5. Return `{ onboardingUrl, refreshUrl, returnUrl }` for the UI to
 *      redirect into.
 *
 * Security:
 *   - Auth via SSR Supabase client (user session cookie).
 *   - Role gate: only hs_parent. Non-parents → 403.
 *   - Service-role writes only happen inside the provider; this route
 *     reads via the authenticated client and trusts RLS.
 *   - Errors never leak Stripe account IDs back to the client — only the
 *     onboarding URL that Stripe wants the browser to visit.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getPayoutProvider,
  StripeConnectPayoutProvider,
} from '@/lib/hs-nil/payouts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    'https://gradeupnil.com'
  );
}

export async function POST(_request: NextRequest) {
  const supabase = await createClient();

  // --- Auth --------------------------------------------------------------
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const meta = (user.user_metadata ?? {}) as { role?: string };
  if (meta.role !== 'hs_parent') {
    return NextResponse.json(
      { error: 'forbidden: parent role required' },
      { status: 403 },
    );
  }

  // --- Parent profile ----------------------------------------------------
  const { data: profile, error: profileErr } = await supabase
    .from('hs_parent_profiles')
    .select('id, stripe_connect_account_id')
    .eq('user_id', user.id)
    .maybeSingle<{
      id: string;
      stripe_connect_account_id: string | null;
    }>();

  if (profileErr) {
    return NextResponse.json(
      { error: 'parent profile lookup failed' },
      { status: 500 },
    );
  }
  if (!profile) {
    return NextResponse.json(
      {
        error:
          'parent profile not found — complete parent signup before setting up payouts',
      },
      { status: 404 },
    );
  }

  const provider = getPayoutProvider();
  const appUrl = getAppUrl();
  const refreshUrl = `${appUrl}/hs/onboarding/payouts?refresh=1`;
  const returnUrl = `${appUrl}/hs/onboarding/payouts/return`;

  try {
    let onboardingUrl: string;

    if (!profile.stripe_connect_account_id) {
      // First-time onboarding: create the Stripe account + first link.
      const result = await provider.createDestination({
        parentProfileId: profile.id,
        email: user.email ?? '',
        countryCode: 'US',
      });
      onboardingUrl = result.onboardingUrl;
    } else if (provider instanceof StripeConnectPayoutProvider) {
      // Resume: the account exists; just mint a fresh hosted session.
      onboardingUrl = await provider.createOnboardingLink(
        profile.stripe_connect_account_id,
      );
    } else {
      // Stub fallback: re-call createDestination to get its fake URL.
      // The stub's createDestination doesn't persist a second account,
      // but it does return a stable URL for the dev flow to poke at.
      const result = await provider.createDestination({
        parentProfileId: profile.id,
        email: user.email ?? '',
        countryCode: 'US',
      });
      onboardingUrl = result.onboardingUrl;
    }

    return NextResponse.json({
      onboardingUrl,
      refreshUrl,
      returnUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    // eslint-disable-next-line no-console
    console.error('[hs-nil payouts onboard] provider failure', {
      userId: user.id,
      parentProfileId: profile.id,
      error: message,
    });
    return NextResponse.json(
      { error: 'failed to start onboarding' },
      { status: 500 },
    );
  }
}
