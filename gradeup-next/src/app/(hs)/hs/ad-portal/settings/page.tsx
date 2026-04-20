/**
 * /hs/ad-portal/settings — AD's profile/assignment info.
 *
 * Read-only display of the AD's current assignments, organisation names,
 * contact email, and support contact. No edits. Assignment changes route
 * through GradeUp admin.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  listAssignmentsForUser,
  type StateAdAssignment,
} from '@/lib/hs-nil/state-ad-portal';
import {
  listAllAssignmentsForAdmin,
  toggleDigest,
} from '@/lib/hs-nil/state-ad-digest';

export const metadata: Metadata = {
  title: 'Settings — State Compliance Portal',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface DigestPref {
  assignmentId: string;
  digestEnabled: boolean;
  digestDayOfWeek: number;
  digestLastSentAt: string | null;
}

const DOW_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

async function requireStateAd(): Promise<{
  userId: string;
  userEmail: string | null;
  assignments: StateAdAssignment[];
  digestPrefs: Map<string, DigestPref>;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const assignments = await listAssignmentsForUser(user.id);
  if (assignments.length === 0) notFound();

  // Join digest prefs — we reuse listAllAssignmentsForAdmin and filter
  // to this user's assignments. It's a small table so the over-fetch is
  // fine; avoids a second targeted query path.
  const all = await listAllAssignmentsForAdmin();
  const prefs = new Map<string, DigestPref>();
  for (const row of all) {
    if (row.userId !== user.id) continue;
    prefs.set(row.assignmentId, {
      assignmentId: row.assignmentId,
      digestEnabled: row.digestEnabled,
      digestDayOfWeek: row.digestDayOfWeek,
      digestLastSentAt: row.digestLastSentAt,
    });
  }
  return {
    userId: user.id,
    userEmail: user.email ?? null,
    assignments,
    digestPrefs: prefs,
  };
}

// ---------------------------------------------------------------------------
// Server action — AD updates their own digest preferences. Access control is
// self-scoped: we re-derive the user's own assignments before touching any
// row, so a crafted assignmentId that doesn't belong to this user is ignored.
// ---------------------------------------------------------------------------

async function updateDigestPrefs(formData: FormData): Promise<void> {
  'use server';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const assignmentId = String(formData.get('assignmentId') ?? '');
  if (!assignmentId) return;

  const enabled = formData.get('enabled') === 'true';
  const dowRaw = formData.get('dayOfWeek');
  const dow = dowRaw !== null ? Number(dowRaw) : undefined;

  // Self-scope check: only touch assignments that belong to this user.
  const mine = await listAssignmentsForUser(user.id);
  if (!mine.some((a) => a.id === assignmentId)) return;

  await toggleDigest(
    assignmentId,
    enabled,
    user.id,
    Number.isFinite(dow) && dow !== undefined ? dow : undefined
  );

  redirect('/hs/ad-portal/settings');
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
  const { userEmail, assignments, digestPrefs } = await requireStateAd();

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

        <section className="mt-10">
          <h2 className="font-display text-xl text-white">Weekly digest</h2>
          <p className="mt-2 text-sm text-white/60">
            Every week we email a compliance summary covering new deals,
            disclosures, top schools, and any flagged events for your state.
            Pick the day of the week that works for your office, or pause
            delivery entirely. You can always revisit the portal directly for
            live data.
          </p>
          <ul className="mt-4 space-y-3">
            {assignments.map((a) => {
              const pref = digestPrefs.get(a.id);
              const enabled = pref?.digestEnabled ?? true;
              const dow = pref?.digestDayOfWeek ?? 1;
              const lastSent = pref?.digestLastSentAt ?? null;
              return (
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
                        {a.stateCode} ·{' '}
                        {enabled ? 'Subscribed' : 'Paused'}
                        {lastSent
                          ? ` · last sent ${fmt(lastSent)}`
                          : ' · never sent'}
                      </p>
                    </div>
                  </div>

                  <form
                    action={updateDigestPrefs}
                    className="mt-4 flex flex-wrap items-end gap-4"
                  >
                    <input
                      type="hidden"
                      name="assignmentId"
                      value={a.id}
                    />
                    <label className="flex flex-col gap-1 text-xs text-white/70">
                      <span className="uppercase tracking-widest text-white/40">
                        Delivery
                      </span>
                      <select
                        name="enabled"
                        defaultValue={enabled ? 'true' : 'false'}
                        className="rounded-md border border-white/20 bg-black/40 px-3 py-1.5 text-sm text-white"
                      >
                        <option value="true">On</option>
                        <option value="false">Paused</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-white/70">
                      <span className="uppercase tracking-widest text-white/40">
                        Preferred day
                      </span>
                      <select
                        name="dayOfWeek"
                        defaultValue={String(dow)}
                        className="rounded-md border border-white/20 bg-black/40 px-3 py-1.5 text-sm text-white"
                      >
                        {DOW_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="submit"
                      className="rounded-md border border-[var(--accent-primary)]/60 bg-[var(--accent-primary)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)] transition hover:bg-[var(--accent-primary)]/20"
                    >
                      Save preferences
                    </button>
                  </form>
                </li>
              );
            })}
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
