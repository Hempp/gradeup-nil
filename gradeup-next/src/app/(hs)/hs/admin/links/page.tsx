/**
 * /hs/admin/links — Pending parent-athlete link requests.
 *
 * A parent claimed guardianship of an athlete but the athlete hasn't
 * confirmed yet. Fresh requests (<3 days old) aren't ops problems — the
 * athlete simply hasn't acted yet. Stale ones (>3d) may need ops to
 * manually verify via support. Read-only here.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Pending links — GradeUp HS',
};
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

interface LinkRow {
  id: string;
  parent_profile_id: string;
  athlete_user_id: string;
  relationship: string;
  verification_method: string | null;
  created_at: string;
}

function fmt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function daysAgo(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
}

export default async function AdminLinksPage() {
  await requireAdminOr404();

  const supabase = await createClient();
  let rows: LinkRow[] = [];
  try {
    const threeDaysAgo = new Date(
      Date.now() - 3 * 24 * 60 * 60 * 1000
    ).toISOString();
    const { data, error } = await supabase
      .from('hs_parent_athlete_links')
      .select(
        'id, parent_profile_id, athlete_user_id, relationship, verification_method, created_at'
      )
      .is('verified_at', null)
      .lt('created_at', threeDaysAgo)
      .order('created_at', { ascending: true })
      .limit(100);
    if (error) throw error;
    rows = (data ?? []) as LinkRow[];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-admin/links] query failed', err);
  }

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <nav
          aria-label="Breadcrumb"
          className="text-xs uppercase tracking-widest text-white/50"
        >
          <Link href="/hs/admin" className="hover:text-white">
            Ops dashboard
          </Link>
          <span className="mx-2 text-white/30">/</span>
          <span className="text-white/80">Parent-athlete links</span>
        </nav>

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Identity · Ops queue
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Stale parent-athlete link requests
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Requests created more than 3 days ago that the athlete still
            hasn&rsquo;t confirmed. Fresh requests are excluded so you only
            see the ones that might need a nudge or manual verification.
          </p>
        </header>

        <aside className="mt-6 rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 p-5 text-sm text-white/80">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            What to do next
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>
              Check the athlete&rsquo;s inbox first — most stalls are just
              an unread invite.
            </li>
            <li>
              If the relationship is real and the athlete can&rsquo;t
              self-serve, use <code>manual_support</code> verification via
              service-role SQL. Document in the concierge log.
            </li>
            <li>
              If the request looks fraudulent (unknown parent claiming a
              minor), revoke via service-role SQL and flag the parent
              account.
            </li>
            <li>
              A dedicated &ldquo;verify&rdquo; / &ldquo;revoke&rdquo; action
              is a <span className="text-amber-200">TODO for Phase 6</span>.
            </li>
          </ol>
        </aside>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-white">
            Pending ({rows.length})
          </h2>
          <div className="mt-4">
            {rows.length === 0 ? (
              <p className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                No stale link requests right now.
              </p>
            ) : (
              <ul className="space-y-3">
                {rows.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-widest text-amber-200">
                          Unverified · {daysAgo(row.created_at)}d
                        </p>
                        <p className="mt-1 text-sm text-white/90">
                          {row.relationship === 'legal_guardian'
                            ? 'Legal guardian'
                            : 'Parent'}{' '}
                          claimed on athlete{' '}
                          <span className="font-mono text-white">
                            {row.athlete_user_id.slice(0, 8)}
                          </span>
                        </p>
                      </div>
                      <dl className="flex flex-wrap gap-4 text-xs text-white/60">
                        <div>
                          <dt className="text-[10px] uppercase tracking-widest text-white/40">
                            Parent profile
                          </dt>
                          <dd className="font-mono text-white/80">
                            {row.parent_profile_id.slice(0, 8)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[10px] uppercase tracking-widest text-white/40">
                            Requested
                          </dt>
                          <dd className="text-white/80">
                            {fmt(row.created_at)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[10px] uppercase tracking-widest text-white/40">
                            Channel
                          </dt>
                          <dd className="text-white/80">
                            {row.verification_method ?? '—'}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    <p className="mt-3 text-xs text-white/40">
                      Verify / revoke actions —{' '}
                      <span className="text-amber-200">coming soon</span>.
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
