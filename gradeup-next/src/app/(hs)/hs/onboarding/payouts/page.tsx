/**
 * HS Parent — Payout Setup Landing (/hs/onboarding/payouts)
 *
 * Server Component. Entry point for custodial-payout onboarding:
 *   - Gates on auth + role=hs_parent.
 *   - Loads the hs_parent_profiles row (Connect fields included).
 *   - Computes the onboarding state (not_started / in_progress / complete
 *     / requires_attention / deauthorized).
 *   - Lists this parent's existing payouts across their linked athletes.
 *
 * We deliberately do NOT call Stripe from this page — the refresh page
 * (/hs/onboarding/payouts/return) is responsible for re-pulling fresh
 * state from Stripe. Here we trust what's in the DB (kept current by the
 * webhook).
 *
 * Note: `?refresh=1` is how Stripe's hosted onboarding tells us "my link
 * expired, give me a new one". The PayoutSetupCard handles that by
 * POSTing to the onboard route, which mints a new link.
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingCard } from '@/components/hs/OnboardingCard';
import PayoutSetupCard, {
  type PayoutOnboardingState,
} from '@/components/hs/PayoutSetupCard';

export const metadata: Metadata = {
  title: 'Set up payouts — GradeUp HS',
  description:
    'Connect your bank account so deal earnings can land in your custodial account.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ParentProfileRow {
  id: string;
  stripe_connect_account_id: string | null;
  stripe_connect_onboarding_complete: boolean;
  stripe_connect_requirements_due: string[] | null;
}

interface PayoutRow {
  id: string;
  deal_id: string;
  payout_amount: number;
  payout_currency: string;
  status: 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded';
  authorized_at: string | null;
  paid_at: string | null;
  failed_reason: string | null;
  created_at: string;
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

function formatUsd(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function statusLabel(status: PayoutRow['status']): string {
  switch (status) {
    case 'pending':
      return 'Pending — waiting on deal completion';
    case 'authorized':
      return 'Authorized — transfer in progress';
    case 'paid':
      return 'Paid';
    case 'failed':
      return 'Failed';
    case 'refunded':
      return 'Refunded';
  }
}

export default async function HSPayoutsLandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirectTo=/hs/onboarding/payouts');
  }

  const meta = (user.user_metadata ?? {}) as { role?: string };
  if (meta.role !== 'hs_parent') {
    redirect('/hs');
  }

  // --- Parent profile ----------------------------------------------------
  let profile: ParentProfileRow | null = null;
  try {
    const { data } = await supabase
      .from('hs_parent_profiles')
      .select(
        'id, stripe_connect_account_id, stripe_connect_onboarding_complete, stripe_connect_requirements_due',
      )
      .eq('user_id', user.id)
      .maybeSingle();
    profile = (data as ParentProfileRow | null) ?? null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs payouts landing] profile lookup failed', err);
  }

  // If the parent profile row doesn't exist yet (stale session, dropped
  // signup), send them back to finish signup rather than render a dead
  // page.
  if (!profile) {
    return (
      <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
        <section className="mx-auto max-w-3xl px-6 pt-20 pb-24">
          <OnboardingCard
            eyebrow="Finish parent signup first"
            title="We can't find your parent profile"
            description="Complete parent signup before setting up payouts. If you already did, try signing out and back in."
          />
        </section>
      </main>
    );
  }

  // --- Payouts list ------------------------------------------------------
  const { data: payoutsData } = await supabase
    .from('hs_deal_parent_payouts')
    .select(
      'id, deal_id, payout_amount, payout_currency, status, authorized_at, paid_at, failed_reason, created_at',
    )
    .eq('parent_profile_id', profile.id)
    .order('created_at', { ascending: false });

  const payouts = (payoutsData as PayoutRow[] | null) ?? [];

  const state = deriveState(profile);

  const headingByState: Record<PayoutOnboardingState, string> = {
    not_started: "Let's set up your custodial account",
    in_progress: "Finish setting up your custodial account",
    complete: 'Your custodial account is ready',
    requires_attention: 'Stripe needs a few more details',
    deauthorized: 'Reconnect your custodial account',
  };

  const descriptionByState: Record<PayoutOnboardingState, string> = {
    not_started:
      'Deals pay out to your custodial account, not your athlete. Stripe handles ID, bank, and tax info — GradeUp never sees your full bank details.',
    in_progress:
      'You started onboarding but didn\u2019t finish. Resume to connect your bank.',
    complete:
      'Bank details are verified. Future deals will pay out here. You can re-verify if your bank changes.',
    requires_attention:
      'Stripe is asking for more info before payouts can go through. Resolve below.',
    deauthorized:
      'Your connection to Stripe was deauthorized. Restart onboarding to receive future payouts.',
  };

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          Payouts
        </p>
        <h1 className="mt-3 font-display text-4xl leading-tight md:text-5xl">
          {headingByState[state]}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-white/70 md:text-lg">
          {descriptionByState[state]}
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-10">
        <OnboardingCard
          title="Custodial account status"
          description={
            state === 'complete'
              ? 'Verified and ready to receive transfers.'
              : 'Stripe Connect hosts the ID + bank flow. It takes about 5 minutes.'
          }
        >
          <PayoutSetupCard
            state={state}
            requirementsDue={profile.stripe_connect_requirements_due ?? []}
          />
        </OnboardingCard>
      </section>

      {payouts.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 pb-24">
          <OnboardingCard
            title="Payouts on record"
            description="Every payout tied to a deal involving your linked athlete(s)."
          >
            <ul className="divide-y divide-white/10">
              {payouts.map((p) => (
                <li
                  key={p.id}
                  className="flex items-start justify-between gap-4 py-4 text-sm"
                >
                  <div>
                    <p className="font-semibold text-white">
                      {formatUsd(p.payout_amount, p.payout_currency)}
                    </p>
                    <p className="mt-1 text-white/60">{statusLabel(p.status)}</p>
                    {p.failed_reason && (
                      <p className="mt-1 text-red-300/80">{p.failed_reason}</p>
                    )}
                  </div>
                  <div className="text-right text-xs text-white/40">
                    <p>
                      {p.paid_at
                        ? `Paid ${new Date(p.paid_at).toLocaleDateString()}`
                        : p.authorized_at
                          ? `Authorized ${new Date(p.authorized_at).toLocaleDateString()}`
                          : `Created ${new Date(p.created_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </OnboardingCard>
        </section>
      )}
    </main>
  );
}
