/**
 * /hs/admin/state-ads — Admin management surface for state-AD assignments.
 *
 * Admin-gated. Lists active assignments (grouped by state), pending
 * invitations (with resend + revoke affordances), and a link to the
 * invite form.
 *
 * Write actions (resend invite, revoke invite, deactivate assignment)
 * route through existing admin action endpoints.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { listInvitations } from '@/lib/hs-nil/state-ad-portal';
import { AdminActionButton } from '@/components/hs/AdminActionButton';

export const metadata: Metadata = {
  title: 'State AD management — GradeUp HS ops',
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

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface AssignmentRow {
  id: string;
  state_code: string;
  organization_name: string;
  contact_email: string | null;
  user_id: string;
  activated_at: string;
}

async function loadAssignments(): Promise<AssignmentRow[]> {
  const sb = getServiceRoleClient();
  if (!sb) return [];
  try {
    const { data } = await sb
      .from('state_ad_assignments')
      .select(
        'id, state_code, organization_name, contact_email, user_id, activated_at'
      )
      .is('deactivated_at', null)
      .order('state_code', { ascending: true })
      .order('activated_at', { ascending: true })
      .limit(500);
    return (data ?? []) as AssignmentRow[];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-admin/state-ads] loadAssignments failed', err);
    return [];
  }
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default async function StateAdsAdminPage() {
  await requireAdminOr404();

  const [assignments, invitations] = await Promise.all([
    loadAssignments(),
    listInvitations('all'),
  ]);

  // Group assignments by state.
  const byState = new Map<string, AssignmentRow[]>();
  for (const a of assignments) {
    const group = byState.get(a.state_code) ?? [];
    group.push(a);
    byState.set(a.state_code, group);
  }

  const openInvitations = invitations.filter(
    (i) => !i.acceptedAt && !i.rejectedAt
  );
  const acceptedInvitations = invitations.filter((i) => !!i.acceptedAt);
  const revokedInvitations = invitations.filter((i) => !!i.rejectedAt);

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
          <span className="text-white/80">State ADs</span>
        </nav>

        <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
              Compliance distribution
            </p>
            <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
              State AD portal access
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Grant read-only portal access to state athletic-association
              compliance offices. Invitations expire in 30 days.
            </p>
          </div>
          <Link
            href="/hs/admin/state-ads/invite"
            className="inline-flex items-center rounded-md border border-[var(--accent-primary)]/60 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)] transition hover:bg-[var(--accent-primary)]/10"
          >
            Send invitation
          </Link>
        </header>

        <Section title={`Active assignments (${assignments.length})`}>
          {byState.size === 0 ? (
            <p className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
              No state ADs assigned yet. Send an invitation to get started.
            </p>
          ) : (
            <ul className="space-y-3">
              {Array.from(byState.entries()).map(([state, rows]) => (
                <li
                  key={state}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-display text-xl text-white">{state}</p>
                    <span className="text-xs text-white/50">
                      {rows.length} AD{rows.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {rows.map((r) => (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-black/30 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-white/90">
                            {r.organization_name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-white/50">
                            {r.contact_email ?? 'No contact email'} · activated{' '}
                            {fmtDate(r.activated_at)}
                          </p>
                        </div>
                        <AdminActionButton
                          label="Deactivate"
                          tone="danger"
                          confirmTitle={`Deactivate ${r.organization_name}?`}
                          confirmDescription="This sets deactivated_at on the assignment. Historical audit rows remain. They will lose portal access immediately."
                          endpoint="/api/hs/admin/actions/state-ad/revoke"
                          payload={{ assignmentId: r.id }}
                          submitLabel="Deactivate AD"
                          ariaLabel={`Deactivate assignment ${r.id}`}
                          requireReason
                        />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={`Pending invitations (${openInvitations.length})`}>
          {openInvitations.length === 0 ? (
            <p className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
              No outstanding invitations.
            </p>
          ) : (
            <ul className="space-y-3">
              {openInvitations.map((inv) => (
                <li
                  key={inv.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {inv.organizationName}
                      </p>
                      <p className="mt-0.5 text-xs text-white/60">
                        {inv.stateCode} · {inv.invitedEmail}
                      </p>
                      <p className="mt-0.5 text-xs text-white/40">
                        Expires {fmtDate(inv.expiresAt)}
                      </p>
                    </div>
                    <AdminActionButton
                      label="Revoke"
                      tone="danger"
                      confirmTitle={`Revoke invitation to ${inv.invitedEmail}?`}
                      confirmDescription="Marks the invitation rejected. The recipient won't be able to accept it."
                      endpoint="/api/hs/admin/actions/state-ad/revoke"
                      payload={{ invitationId: inv.id }}
                      submitLabel="Revoke invitation"
                      ariaLabel={`Revoke invitation ${inv.id}`}
                      requireReason
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {acceptedInvitations.length > 0 || revokedInvitations.length > 0 ? (
          <Section title="Recent activity">
            <ul className="space-y-2">
              {acceptedInvitations.slice(0, 10).map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/70"
                >
                  <span>
                    Accepted · {inv.organizationName} ({inv.stateCode})
                  </span>
                  <span className="font-mono text-white/50">
                    {fmtDate(inv.acceptedAt ?? inv.invitedAt)}
                  </span>
                </li>
              ))}
              {revokedInvitations.slice(0, 10).map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/70"
                >
                  <span>
                    Revoked · {inv.organizationName} ({inv.stateCode})
                  </span>
                  <span className="font-mono text-white/50">
                    {fmtDate(inv.rejectedAt ?? inv.invitedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
