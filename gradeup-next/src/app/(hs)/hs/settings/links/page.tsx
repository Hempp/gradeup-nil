/**
 * HS Athlete Link Settings — /hs/settings/links
 *
 * The "Who manages me?" surface for HS athletes. Closes the symmetric-
 * trust loop the parent started at signup:
 *
 *   parent signup → pending hs_parent_athlete_links row →
 *   athlete sees it HERE → athlete confirms (verified_at set)
 *                       OR athlete declines (row deleted).
 *
 * Two sections:
 *   1. Pending requests — parents who claim a relationship but haven't
 *      been confirmed yet. Renders PendingLinkCard per row with
 *      Confirm + Decline actions.
 *   2. Verified links  — parents the athlete has confirmed. Renders
 *      VerifiedLinkCard per row with a destructive Unlink action.
 *
 * Empty state: one tile pointing the athlete back to the dashboard —
 * the parent side of the flow may simply not have happened yet.
 *
 * Privacy: the server-side service layer masks parent emails before
 * they reach the client. Full addresses never appear in this page's
 * server output or markup.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PendingLinkCard from '@/components/hs/PendingLinkCard';
import VerifiedLinkCard from '@/components/hs/VerifiedLinkCard';
import { getLinksForAthlete } from '@/lib/services/hs-nil/athlete-links';

export const metadata: Metadata = {
  title: 'Link settings — GradeUp HS',
  description:
    'Confirm, decline, or unlink the parents and guardians associated with your GradeUp HS account.',
};

// Every athlete sees their own data; never cache across users.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HsSettingsLinksPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/hs/settings/links');
  }

  // Fetch pending + verified links. Any service-layer error is logged
  // and degrades to an empty shell rather than throwing — worst case
  // the athlete sees "no one is linked to you yet" for one reload,
  // which is misleading but not a 500.
  let pending: Awaited<ReturnType<typeof getLinksForAthlete>>['pending'] = [];
  let verified: Awaited<ReturnType<typeof getLinksForAthlete>>['verified'] = [];
  try {
    const res = await getLinksForAthlete(user.id, supabase);
    pending = res.pending;
    verified = res.verified;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hs/settings/links] link fetch failed', err);
  }

  const hasAny = pending.length + verified.length > 0;

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-10">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Account settings
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight md:text-5xl">
            Who manages me?
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/70">
            These are the parents and guardians linked to your account. You
            control who&rsquo;s on this list.
          </p>
        </header>

        {/* Why-this-matters strip. Consent rules are a compliance blocker;
            explaining up-front means fewer "why do I need this" support tickets. */}
        <aside
          aria-labelledby="why-this-matters"
          className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/80"
        >
          <h2
            id="why-this-matters"
            className="font-semibold text-[var(--accent-primary)]"
          >
            Why this matters
          </h2>
          <p className="mt-2 leading-relaxed">
            NIL deals for minors require parental consent. The parent or
            guardian linked here is the one who can approve your deals. If
            someone claims to be your guardian who isn&rsquo;t, decline the
            request — they won&rsquo;t be notified.
          </p>
        </aside>
      </section>

      <section
        aria-labelledby="pending-heading"
        className="mx-auto max-w-3xl px-6 pb-10"
      >
        <div className="flex items-baseline justify-between">
          <h2 id="pending-heading" className="font-display text-2xl text-white">
            Pending requests
          </h2>
          <span className="text-xs text-white/50">
            {pending.length} {pending.length === 1 ? 'request' : 'requests'}
          </span>
        </div>

        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-white/50">
            No one is waiting on your confirmation.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {pending.map((row) => (
              <li key={row.linkId}>
                <PendingLinkCard
                  linkId={row.linkId}
                  parentFullName={row.parentFullName}
                  parentEmailMasked={row.parentEmailMasked}
                  relationship={row.relationship}
                  createdAt={row.createdAt}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="verified-heading"
        className="mx-auto max-w-3xl px-6 pb-16"
      >
        <div className="flex items-baseline justify-between">
          <h2
            id="verified-heading"
            className="font-display text-2xl text-white"
          >
            Linked parents &amp; guardians
          </h2>
          <span className="text-xs text-white/50">
            {verified.length} linked
          </span>
        </div>

        {verified.length === 0 ? (
          <p className="mt-3 text-sm text-white/50">
            You haven&rsquo;t confirmed any parent links yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {verified.map((row) => (
              <li key={row.linkId}>
                <VerifiedLinkCard
                  linkId={row.linkId}
                  parentFullName={row.parentFullName}
                  parentEmailMasked={row.parentEmailMasked}
                  relationship={row.relationship}
                  verifiedAt={row.verifiedAt ?? row.createdAt}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {!hasAny && (
        <section className="mx-auto max-w-3xl px-6 pb-24">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <h2 className="font-display text-2xl text-white">
              No one is linked to you yet.
            </h2>
            <p className="mt-3 text-sm text-white/70">
              If a parent or guardian tried to link, they&rsquo;ll appear here.
              You can come back any time.
            </p>
            <Link
              href="/hs/athlete"
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Back to your dashboard
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
