/**
 * Athlete-side dispute form — /hs/deals/[id]/dispute
 *
 * Server Component. Gates:
 *   - Unauthenticated → /login?next=/hs/deals/[id]/dispute
 *   - 404 when the deal doesn't exist or the signed-in user is not the
 *     athlete on it. Mirrors the athlete-side deal detail behavior so we
 *     don't leak deal existence to non-parties.
 *   - Disputes are only available once a deal is past 'pending'. We block
 *     early-stage disputes to keep the channel from being abused before
 *     there's anything to dispute about.
 *
 * The server re-resolves the raising role at API submit time, so parents
 * linked to a minor athlete can use this same page (they authenticate as
 * the athlete's parent and the API accepts their link).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DisputeRaiseForm } from '@/components/hs/DisputeRaiseForm';

export const metadata: Metadata = {
  title: 'Report a problem — GradeUp HS',
  description: 'Raise a dispute on your NIL deal.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface DealRow {
  id: string;
  title: string;
  status: string;
  athlete: {
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

export default async function AthleteDealDisputePage({
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
    redirect(`/login?next=/hs/deals/${id}/dispute`);
  }

  const { data: deal } = await supabase
    .from('deals')
    .select('id, title, status, athlete:athletes(profile_id)')
    .eq('id', id)
    .maybeSingle<DealRow>();

  if (!deal || !deal.athlete) {
    notFound();
  }

  // Authorization: allow the athlete on the deal, OR a parent linked to
  // that athlete (the same permission surface used on the athlete-side
  // deal detail once parent-linking is fully wired). We check for both.
  let allowed = deal.athlete.profile_id === user.id;
  if (!allowed) {
    try {
      const { data: links } = await supabase
        .from('hs_parent_athlete_links')
        .select('id, parent_profile_id, verified_at')
        .eq('athlete_user_id', deal.athlete.profile_id)
        .not('verified_at', 'is', null);
      for (const link of links ?? []) {
        const { data: pp } = await supabase
          .from('hs_parent_profiles')
          .select('user_id')
          .eq('id', link.parent_profile_id)
          .maybeSingle();
        if (pp && (pp.user_id as string) === user.id) {
          allowed = true;
          break;
        }
      }
    } catch {
      // fall through — allowed stays false
    }
  }

  if (!allowed) notFound();

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
            href={`/hs/deals/${deal.id}`}
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
            href={`/hs/deals/${deal.id}`}
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
          href={`/hs/deals/${deal.id}`}
          className="inline-flex min-h-[44px] items-center text-sm text-white/70 hover:text-white"
        >
          ← Back to the deal
        </Link>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24">
        <DisputeRaiseForm
          dealId={deal.id}
          dealTitle={deal.title}
          raisingRole="athlete"
        />
      </section>
    </main>
  );
}
