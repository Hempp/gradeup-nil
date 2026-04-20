/**
 * /hs/ad-portal/settings — AD's profile/assignment info.
 *
 * Read-only display of the AD's current assignments, organisation names,
 * contact email, and support contact. No edits. Assignment changes route
 * through GradeUp admin.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  listAssignmentsForUser,
  type StateAdAssignment,
} from '@/lib/hs-nil/state-ad-portal';

export const metadata: Metadata = {
  title: 'Settings — State Compliance Portal',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function requireStateAd(): Promise<{
  userEmail: string | null;
  assignments: StateAdAssignment[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const assignments = await listAssignmentsForUser(user.id);
  if (assignments.length === 0) notFound();
  return { userEmail: user.email ?? null, assignments };
}

function fmt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function AdPortalSettingsPage() {
  const { userEmail, assignments } = await requireStateAd();

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-3xl px-6 py-16">
        <nav
          aria-label="Breadcrumb"
          className="text-xs uppercase tracking-widest text-white/50"
        >
          <Link href="/hs/ad-portal" className="hover:text-white">
            Portal
          </Link>
          <span className="mx-2 text-white/30">/</span>
          <span className="text-white/80">Settings</span>
        </nav>

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Your assignment
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Settings
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Read-only. Assignment changes (add a state, remove access, change
            organization) go through GradeUp admin.
          </p>
        </header>

        <section className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-display text-xl text-white">Account</h2>
          <dl className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-white/40">
                Signed-in email
              </dt>
              <dd className="mt-0.5 font-mono text-sm text-white/80">
                {userEmail ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-white/40">
                States covered
              </dt>
              <dd className="mt-0.5 font-mono text-sm text-white/80">
                {assignments.map((a) => a.stateCode).join(' · ')}
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-6">
          <h2 className="font-display text-xl text-white">Assignments</h2>
          <ul className="mt-4 space-y-3">
            {assignments.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {a.organizationName}
                    </p>
                    <p className="mt-0.5 text-xs text-white/60">
                      {a.stateCode} · activated {fmt(a.activatedAt)}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-200">
                    Active
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-1 gap-3 text-xs text-white/70 md:grid-cols-2">
                  <div>
                    <dt className="uppercase tracking-widest text-white/40">
                      Contact email (on file)
                    </dt>
                    <dd className="mt-0.5 font-mono text-white/80">
                      {a.contactEmail ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-widest text-white/40">
                      Contact phone
                    </dt>
                    <dd className="mt-0.5 font-mono text-white/80">
                      {a.contactPhone ?? '—'}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-display text-xl text-white">Support</h2>
          <p className="mt-2 text-sm text-white/70">
            Need access added to another state, a new deputy added, or your
            organisation name corrected? Reach out to GradeUp support.
          </p>
          <div className="mt-4">
            <Link
              href="mailto:support@gradeupnil.com"
              className="inline-flex items-center rounded-md border border-[var(--accent-primary)]/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)] transition hover:bg-[var(--accent-primary)]/10"
            >
              Contact GradeUp
            </Link>
          </div>
        </section>

        <p className="mt-10 text-xs text-white/40">
          Every resource view from your portal session is written to
          state_ad_portal_views and is mutually auditable — GradeUp admins and
          you see the same log.
        </p>
      </section>
    </main>
  );
}
