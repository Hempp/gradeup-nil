/**
 * /hs/admin/analytics/referrals — referral funnel + top referrers.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DateRangePicker from '@/components/hs/analytics/DateRangePicker';
import ReferralGraphCard from '@/components/hs/analytics/ReferralGraphCard';
import {
  getReferralGraphSummary,
  parseRangeParams,
  type ReferralSummary,
} from '@/lib/hs-nil/analytics';

export const metadata: Metadata = {
  title: 'Referrals — HS-NIL analytics',
};
export const revalidate = 60;

async function requireAdminOr404() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (error || !profile || profile.role !== 'admin') notFound();
}

const EMPTY: ReferralSummary = {
  totalReferredClicks: 0,
  totalReferredSignups: 0,
  totalReferredConsents: 0,
  totalReferredFirstDeals: 0,
  clickToSignupRate: 0,
  signupToConsentRate: 0,
  topReferrers: [],
  referredSignupToConsent: 0,
  organicSignupToConsent: 0,
};

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function ReferralsAnalyticsPage({
  searchParams,
}: PageProps) {
  await requireAdminOr404();

  const sp = await searchParams;
  const range = parseRangeParams({ from: sp.from, to: sp.to }, 30);

  const supabase = await createClient();
  let summary: ReferralSummary = EMPTY;
  try {
    summary = await getReferralGraphSummary(supabase, range);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[analytics/referrals] load failed', err);
  }

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            HS-NIL · Analytics
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Referrals
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/60">
            Parent-to-parent attribution. Showing activity in the selected
            window only.
          </p>

          <div className="mt-4">
            <DateRangePicker defaultDays={30} />
          </div>
        </header>

        <section
          className="mt-10 rounded-xl border border-white/10 bg-white/5 p-6"
          aria-labelledby="ref-body"
        >
          <h2 id="ref-body" className="sr-only">
            Referral metrics
          </h2>
          <ReferralGraphCard summary={summary} />
        </section>

        <p className="mt-10 text-xs text-white/40">
          <Link
            href="/hs/admin/analytics"
            className="underline decoration-white/30 underline-offset-2 hover:text-white/60"
          >
            ← Analytics home
          </Link>
        </p>
      </section>
    </main>
  );
}
