/**
 * Brand-side dispute form — /hs/brand/deals/[id]/dispute
 *
 * Server Component. Gates:
 *   - Unauthenticated → /login?next=/hs/brand/deals/[id]/dispute
 *   - 404 when the deal doesn't exist or the signed-in user isn't the
 *     brand on it.
 *
 * Mirror of the athlete-side dispute page but scoped to the brand's
 * perspective. Uses the same DisputeRaiseForm with raisingRole='brand'.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DisputeRaiseForm } from '@/components/hs/DisputeRaiseForm';

export const metadata: Metadata = {
  title: 'Report a problem — GradeUp HS Brand',
  description: 'Raise a dispute on a NIL deal you signed.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface DealRow {
  id: string;
  title: string;
  status: string;
  brand: {
    profile_id: string;
  } | null;
}

const DISPUTE_DISALLOWED_STATUSES = new Set([
  'draft',
  'pending',
  'negotiating',
  'rejected',
  'expired',
]);

export default async function BrandDealDisputePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/hs/brand/deals/${id}/dispute`);
  }

  const { data: deal } = await supabase
    .from('deals')
    .select('id, title, status, brand:brands(profile_id)')
    .eq('id', id)
    .maybeSingle<DealRow>();

  if (!deal || !deal.brand || deal.brand.profile_id !== user.id) {
    notFound();
  }

  if (DISPUTE_DISALLOWED_STATUSES.has(deal.status)) {
    return (
      <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
        <section className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="font-display text-3xl text-white md:text-4xl">
            Can&rsquo;t raise a dispute yet
          </h1>
          <p className="mt-3 text-sm text-white/70">
            Disputes are only available once a deal is signed and in motion.
            This deal is currently in <strong>{deal.status}</strong>.
          </p>
          <Link
            href={`/hs/brand/deals/${deal.id}`}
            className="mt-6 inline-flex min-h-[44px] items-center rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
          >
            Back to the deal
          </Link>
        </section>
      </main>
    );
  }

  if (deal.status === 'disputed') {
    return (
      <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
        <section className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="font-display text-3xl text-white md:text-4xl">
            A dispute is already open
          </h1>
          <p className="mt-3 text-sm text-white/70">
            This deal already has an open dispute. A GradeUp admin will follow
            up by email once it&rsquo;s resolved.
          </p>
          <Link
            href={`/hs/brand/deals/${deal.id}`}
            className="mt-6 inline-flex min-h-[44px] items-center rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
          >
            Back to the deal
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-6">
        <Link
          href={`/hs/brand/deals/${deal.id}`}
          className="inline-flex min-h-[44px] items-center text-sm text-white/70 hover:text-white"
        >
          ← Back to the deal
        </Link>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24">
        <DisputeRaiseForm
          dealId={deal.id}
          dealTitle={deal.title}
          raisingRole="brand"
        />
      </section>
    </main>
  );
}
