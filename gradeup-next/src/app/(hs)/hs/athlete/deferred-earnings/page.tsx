/**
 * HS Athlete Deferred Earnings — /hs/athlete/deferred-earnings
 *
 * Server Component. Shows every hs_deferred_payouts row tied to this
 * athlete — amounts held in trust, release dates, and (post-release)
 * the transfer confirmation. Today this only matters for TX athletes
 * under 18 per UIL's escrow-until-18 rule, but the page is
 * state-agnostic.
 *
 * RLS limits the SSR Supabase client to this athlete's own rows, so
 * the query is inherently scoped — no extra filter needed.
 *
 * Auth + role gating mirrors /hs/athlete/earnings:
 *   - Unauthenticated → /login?next=/hs/athlete/deferred-earnings
 *   - No hs_athlete_profiles row → /hs/signup/athlete?notice=convert
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { listDeferralsForAthlete } from '@/lib/hs-nil/deferred-payouts';

export const metadata: Metadata = {
  title: 'Held earnings — GradeUp HS',
  description: 'Earnings held in trust until your 18th birthday.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatMoney(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function daysUntil(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  if (days < 0) return `Due (released ${Math.abs(days)}d ago)`;
  if (days === 0) return 'Releases today';
  if (days === 1) return 'Releases tomorrow';
  if (days < 30) return `Releases in ${days} days`;
  const months = Math.round(days / 30);
  return `Releases in ~${months} month${months === 1 ? '' : 's'}`;
}

export default async function HSAthleteDeferredEarningsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/hs/athlete/deferred-earnings');
  }

  const { data: profile } = await supabase
    .from('hs_athlete_profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile) {
    redirect('/hs/signup/athlete?notice=convert');
  }

  const rows = await listDeferralsForAthlete(user.id, supabase);

  const holding = rows.filter((r) => r.status === 'holding');
  const released = rows.filter((r) => r.status === 'released');
  const other = rows.filter(
    (r) => r.status !== 'holding' && r.status !== 'released',
  );

  const totalHeldCents = holding.reduce((sum, r) => sum + r.amount_cents, 0);
  const totalReleasedCents = released.reduce(
    (sum, r) => sum + r.amount_cents,
    0,
  );

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-10">
        <Link
          href="/hs/athlete/earnings"
          className="text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white"
        >
          ← Earnings
        </Link>

        <h1 className="mt-3 font-display text-4xl text-white md:text-5xl">
          Held earnings
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/70">
          Some states require NIL compensation for athletes under 18 to be
          held in custodial trust. GradeUp holds these funds for you and
          automatically releases them to your parent&rsquo;s custodian
          account on your 18th birthday. No action required.
        </p>

        {rows.length === 0 ? (
          <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            You don&rsquo;t have any earnings held in trust. If you&rsquo;re
            in a state that requires escrow-until-18, completed deals will
            appear here until the release date.
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-200">
                  Held in trust
                </p>
                <p className="mt-2 font-display text-4xl text-white">
                  {formatMoney(totalHeldCents)}
                </p>
                <p className="mt-1 text-xs text-white/60">
                  Across {holding.length} deal{holding.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200">
                  Released
                </p>
                <p className="mt-2 font-display text-4xl text-white">
                  {formatMoney(totalReleasedCents)}
                </p>
                <p className="mt-1 text-xs text-white/60">
                  Across {released.length} deal{released.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            {holding.length > 0 && (
              <section className="mt-10">
                <h2 className="font-display text-2xl text-white">
                  Pending release
                </h2>
                <ul className="mt-4 space-y-3">
                  {holding.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">
                            {formatMoney(row.amount_cents)}
                          </p>
                          <p className="mt-1 text-xs text-white/60">
                            {daysUntil(row.release_eligible_at)} ·{' '}
                            {formatDate(row.release_eligible_at)}
                          </p>
                        </div>
                        <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-widest text-amber-200">
                          {row.state_code}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {released.length > 0 && (
              <section className="mt-10">
                <h2 className="font-display text-2xl text-white">
                  Already released
                </h2>
                <ul className="mt-4 space-y-3">
                  {released.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-5 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">
                            {formatMoney(row.amount_cents)}
                          </p>
                          <p className="mt-1 text-xs text-white/60">
                            Transferred{' '}
                            {row.released_at && formatDate(row.released_at)}
                          </p>
                        </div>
                        <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-widest text-emerald-200">
                          Released
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {other.length > 0 && (
              <section className="mt-10">
                <h2 className="font-display text-2xl text-white">Other</h2>
                <ul className="mt-4 space-y-3">
                  {other.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-white/70"
                    >
                      <p className="font-semibold text-white">
                        {formatMoney(row.amount_cents)} · {row.status}
                      </p>
                      {row.forfeiture_reason && (
                        <p className="mt-1 text-xs">
                          Reason: {row.forfeiture_reason}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}
