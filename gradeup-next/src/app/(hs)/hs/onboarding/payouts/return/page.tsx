/**
 * HS Parent — Stripe Connect Return URL (/hs/onboarding/payouts/return)
 *
 * Stripe redirects here after the parent finishes (or exits) the hosted
 * onboarding flow. It does NOT guarantee onboarding is complete — the
 * parent may have closed the tab, skipped required fields, or saved and
 * left. We must verify server-to-server via
 * `provider.refreshDestination`.
 *
 * Flow:
 *   1. Auth + role gate.
 *   2. Load hs_parent_profiles; if no account id, bounce to landing.
 *   3. Call `provider.refreshDestination(accountId)` — this hits Stripe
 *      and updates the DB in one go.
 *   4. Render a branching UI:
 *        - complete            → success state + "Back to dashboard" CTA
 *        - requires_attention  → list requirements_due, CTA to resume
 *        - in_progress         → "We need more info" + resume CTA
 *
 * The refresh is best-effort. If Stripe is unreachable we render the
 * "we'll keep checking" state rather than 500.
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { OnboardingCard } from '@/components/hs/OnboardingCard';
import PayoutSetupCard, {
  type PayoutOnboardingState,
} from '@/components/hs/PayoutSetupCard';
import {
  getPayoutProvider,
  StripeConnectPayoutProvider,
} from '@/lib/hs-nil/payouts';

export const metadata: Metadata = {
  title: 'Onboarding status — GradeUp HS',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ParentProfileRow {
  id: string;
  stripe_connect_account_id: string | null;
  stripe_connect_onboarding_complete: boolean;
  stripe_connect_requirements_due: string[] | null;
}

function deriveState(profile: ParentProfileRow): PayoutOnboardingState {
  if (!profile.stripe_connect_account_id) return 'not_started';
  if (profile.stripe_connect_onboarding_complete) return 'complete';
  if (
    profile.stripe_connect_requirements_due &&
    profile.stripe_connect_requirements_due.length > 0
  ) {
    return 'requires_attention';
  }
  return 'in_progress';
}

export default async function HSPayoutsReturnPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirectTo=/hs/onboarding/payouts/return');
  }

  const meta = (user.user_metadata ?? {}) as { role?: string };
  if (meta.role !== 'hs_parent') {
    redirect('/hs');
  }

  // Initial DB read (pre-refresh). If no account id exists at all,
  // the user landed here without starting onboarding — redirect to
  // the landing page so they can start.
  const { data: initialProfile } = await supabase
    .from('hs_parent_profiles')
    .select(
      'id, stripe_connect_account_id, stripe_connect_onboarding_complete, stripe_connect_requirements_due',
    )
    .eq('user_id', user.id)
    .maybeSingle<ParentProfileRow>();

  if (!initialProfile?.stripe_connect_account_id) {
    redirect('/hs/onboarding/payouts');
  }

  // Re-pull fresh state from Stripe (provider also updates the DB).
  const provider = getPayoutProvider();
  let refreshError: string | null = null;
  if (provider instanceof StripeConnectPayoutProvider) {
    try {
      await provider.refreshDestination(initialProfile.stripe_connect_account_id);
    } catch (err) {
      refreshError =
        err instanceof Error ? err.message : 'Stripe refresh failed';
      // eslint-disable-next-line no-console
      console.warn('[hs payouts return] refreshDestination failed', {
        accountId: initialProfile.stripe_connect_account_id,
        error: refreshError,
      });
    }
  }

  // Re-read the profile after refresh to get the latest persisted state.
  const { data: refreshedProfile } = await supabase
    .from('hs_parent_profiles')
    .select(
      'id, stripe_connect_account_id, stripe_connect_onboarding_complete, stripe_connect_requirements_due',
    )
    .eq('user_id', user.id)
    .maybeSingle<ParentProfileRow>();

  const profile: ParentProfileRow = refreshedProfile ?? initialProfile;
  const state = deriveState(profile);

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          Payout setup
        </p>

        {state === 'complete' && (
          <>
            <h1 className="mt-3 font-display text-4xl leading-tight md:text-5xl">
              You&rsquo;re all set.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-white/70 md:text-lg">
              Your custodial account is verified. Future deal payouts will
              transfer to your linked bank automatically.
            </p>
          </>
        )}

        {state === 'requires_attention' && (
          <>
            <h1 className="mt-3 font-display text-4xl leading-tight md:text-5xl">
              Stripe needs a little more.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-white/70 md:text-lg">
              We got you back — there are just a few fields left before
              payouts can go through.
            </p>
          </>
        )}

        {state === 'in_progress' && (
          <>
            <h1 className="mt-3 font-display text-4xl leading-tight md:text-5xl">
              Onboarding isn&rsquo;t quite finished.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-white/70 md:text-lg">
              Resume to pick up where you left off. It saves your progress.
            </p>
          </>
        )}

        {state === 'not_started' && (
          <>
            <h1 className="mt-3 font-display text-4xl leading-tight md:text-5xl">
              Let&rsquo;s start your custodial account.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-white/70 md:text-lg">
              Stripe handles ID + bank verification. Takes about 5 minutes.
            </p>
          </>
        )}

        {state === 'deauthorized' && (
          <>
            <h1 className="mt-3 font-display text-4xl leading-tight md:text-5xl">
              Your Stripe connection was removed.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-white/70 md:text-lg">
              Restart onboarding to receive future payouts.
            </p>
          </>
        )}
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-10">
        <OnboardingCard
          title={
            state === 'complete' ? 'Verified' : 'Custodial account status'
          }
          description={
            refreshError
              ? 'We couldn\u2019t refresh Stripe just now. Your status is the latest we have on file.'
              : undefined
          }
        >
          {state === 'complete' ? (
            <div className="flex flex-wrap gap-3">
              <Link href="/hs/parent" className="inline-block">
                <Button size="lg" variant="primary">
                  Back to dashboard
                </Button>
              </Link>
              <PayoutSetupCard
                state={state}
                requirementsDue={profile.stripe_connect_requirements_due ?? []}
              />
            </div>
          ) : (
            <PayoutSetupCard
              state={state}
              requirementsDue={profile.stripe_connect_requirements_due ?? []}
            />
          )}
        </OnboardingCard>
      </section>
    </main>
  );
}
