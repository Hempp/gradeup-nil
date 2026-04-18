/**
 * /hs/admin/audit — Read-only admin action audit log viewer.
 *
 * Lists the last N entries from public.admin_audit_log, most recent
 * first, with the actor's name/email resolved. Admin-gated (404s for
 * non-admins, same pattern as the other ops pages). No write actions
 * are available from this surface — it exists to answer "who did
 * what, when, and why".
 *
 * Pagination is offset-based via ?page=N (100 rows per page). The
 * audit table's indexes cover (created_at desc) so skip+take is
 * fine at expected volumes.
 *
 * The client-enhanced filter bar is intentionally lightweight today
 * (action + target_kind dropdowns are driven by the URL so the
 * server component does the filtering). Adding a date range or a
 * per-actor dropdown is a 10-minute change once we have >1 page of
 * data to validate against.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const metadata: Metadata = {
  title: 'Admin audit log — GradeUp HS',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE_SIZE = 100;

const ACTION_LABELS: Record<string, string> = {
  disclosure_retry: 'Retry disclosure',
  payout_resolve: 'Resolve payout',
  link_force_verify: 'Force-verify link',
  consent_renewal_nudge: 'Consent renewal nudge',
};

const TARGET_HREF_PREFIX: Record<string, string | null> = {
  disclosure: '/hs/admin/disclosures',
  payout: '/hs/admin/payouts',
  link: '/hs/admin/links',
  consent: '/hs/admin/consents',
};

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

interface AuditRow {
  id: string;
  actor_user_id: string;
  action: string;
  target_kind: string;
  target_id: string;
  reason: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface ActorInfo {
  name: string;
  email: string;
}

async function loadActors(
  actorIds: string[]
): Promise<Map<string, ActorInfo>> {
  const map = new Map<string, ActorInfo>();
  if (actorIds.length === 0) return map;

  // Prefer profiles for name + email; fall back to auth.users email via
  // service role if the profile row is missing / lacks an email.
  try {
    const supabase = await createClient();
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', actorIds);
    for (const p of profiles ?? []) {
      const fn = (p.first_name as string | null) ?? '';
      const ln = (p.last_name as string | null) ?? '';
      const name = `${fn} ${ln}`.trim() || 'Admin';
      map.set(p.id as string, {
        name,
        email: (p.email as string | null) ?? '(email unknown)',
      });
    }
  } catch {
    // non-fatal
  }

  // Fill in missing emails from auth.users via service role where possible.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const service = createServiceClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    for (const id of actorIds) {
      const existing = map.get(id);
      if (existing && existing.email !== '(email unknown)') continue;
      try {
        const { data } = await service.auth.admin.getUserById(id);
        const email = data?.user?.email ?? '(email unknown)';
        const name = existing?.name ?? 'Admin';
        map.set(id, { name, email });
      } catch {
        if (!existing) map.set(id, { name: 'Admin', email: '(email unknown)' });
      }
    }
  }

  return map;
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

function metadataSummary(metadata: Record<string, unknown>): string {
  if (!metadata || typeof metadata !== 'object') return '';
  const bits: string[] = [];
  if (typeof metadata.decision === 'string') bits.push(`decision=${metadata.decision}`);
  if (typeof metadata.reference === 'string' && metadata.reference)
    bits.push(`ref=${metadata.reference}`);
  if (typeof metadata.previousStatus === 'string')
    bits.push(`was=${metadata.previousStatus}`);
  if (typeof metadata.stateCode === 'string')
    bits.push(`state=${metadata.stateCode}`);
  if (typeof metadata.parentEmail === 'string')
    bits.push(`to=${metadata.parentEmail}`);
  if (
    metadata.delivery &&
    typeof metadata.delivery === 'object' &&
    metadata.delivery !== null &&
    'success' in metadata.delivery
  ) {
    const d = metadata.delivery as { success?: boolean };
    bits.push(`email=${d.success ? 'sent' : 'failed'}`);
  }
  if (metadata.silent === true) bits.push('silent');
  return bits.join(' · ');
}

const VALID_ACTIONS = new Set([
  'disclosure_retry',
  'payout_resolve',
  'link_force_verify',
  'consent_renewal_nudge',
]);
const VALID_TARGET_KINDS = new Set(['disclosure', 'payout', 'link', 'consent']);

interface SearchParams {
  page?: string;
  action?: string;
  target?: string;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminOr404();
  const sp = (await searchParams) ?? {};
  const page = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1);
  const actionFilter =
    sp.action && VALID_ACTIONS.has(sp.action) ? sp.action : null;
  const targetFilter =
    sp.target && VALID_TARGET_KINDS.has(sp.target) ? sp.target : null;

  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  let rows: AuditRow[] = [];
  let count = 0;
  try {
    let query = supabase
      .from('admin_audit_log')
      .select(
        'id, actor_user_id, action, target_kind, target_id, reason, metadata, created_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (actionFilter) query = query.eq('action', actionFilter);
    if (targetFilter) query = query.eq('target_kind', targetFilter);
    const { data, error, count: total } = await query;
    if (error) throw error;
    rows = (data ?? []) as AuditRow[];
    count = total ?? 0;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-admin/audit] query failed', err);
  }

  const actors = await loadActors(
    Array.from(new Set(rows.map((r) => r.actor_user_id)))
  );

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <nav
          aria-label="Breadcrumb"
          className="text-xs uppercase tracking-widest text-white/50"
        >
          <Link href="/hs/admin" className="hover:text-white">
            Ops dashboard
          </Link>
          <span className="mx-2 text-white/30">/</span>
          <span className="text-white/80">Audit log</span>
        </nav>

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Compliance · Admin audit
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Admin action log
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Every write action taken from the /hs/admin queues lands here.
            Read-only. Rows are immutable once written and persist even if
            their target (deal, payout, link, consent) is later deleted.
          </p>
        </header>

        {/* Filter bar — server-driven via URL params. */}
        <form
          method="get"
          className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
        >
          <label className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
              Action
            </span>
            <select
              name="action"
              defaultValue={actionFilter ?? ''}
              className="mt-1 rounded-md border border-white/20 bg-black/60 px-2 py-1 text-sm text-white"
            >
              <option value="">All</option>
              {Array.from(VALID_ACTIONS).map((a) => (
                <option key={a} value={a}>
                  {ACTION_LABELS[a] ?? a}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
              Target kind
            </span>
            <select
              name="target"
              defaultValue={targetFilter ?? ''}
              className="mt-1 rounded-md border border-white/20 bg-black/60 px-2 py-1 text-sm text-white"
            >
              <option value="">All</option>
              {Array.from(VALID_TARGET_KINDS).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md border border-[var(--accent-primary)]/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)] transition hover:bg-[var(--accent-primary)]/10"
          >
            Apply
          </button>
          <Link
            href="/hs/admin/audit"
            className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/70 transition hover:bg-white/10"
          >
            Clear
          </Link>
        </form>

        <p className="mt-6 text-sm text-white/60">
          {count.toLocaleString()} {count === 1 ? 'entry' : 'entries'} · page{' '}
          {page} of {totalPages}
        </p>

        {rows.length === 0 ? (
          <p className="mt-6 rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
            No audit entries match the current filters.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-white/5">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-black/40">
                <tr className="text-left text-[11px] uppercase tracking-widest text-white/50">
                  <th scope="col" className="px-3 py-2">
                    When
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Actor
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Action
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Target
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Reason
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Metadata
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-white/80">
                {rows.map((row) => {
                  const actor = actors.get(row.actor_user_id) ?? {
                    name: 'Admin',
                    email: '(email unknown)',
                  };
                  const prefix = TARGET_HREF_PREFIX[row.target_kind] ?? null;
                  return (
                    <tr key={row.id} className="align-top">
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-white/70">
                        {fmt(row.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs">
                        <div className="text-white/90">{actor.name}</div>
                        <div className="text-white/50">{actor.email}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs">
                        <span className="inline-flex items-center rounded-full border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 px-2 py-0.5 font-semibold text-[var(--accent-primary)]">
                          {ACTION_LABELS[row.action] ?? row.action}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div className="text-white/70">{row.target_kind}</div>
                        <div className="font-mono text-white/90">
                          {prefix ? (
                            <Link
                              href={prefix}
                              className="underline decoration-white/30 underline-offset-2 hover:text-white"
                            >
                              {row.target_id.slice(0, 8)}
                            </Link>
                          ) : (
                            row.target_id.slice(0, 8)
                          )}
                        </div>
                      </td>
                      <td className="max-w-xs px-3 py-2 text-xs text-white/80">
                        <span className="line-clamp-3">{row.reason}</span>
                      </td>
                      <td className="px-3 py-2 text-[11px] font-mono text-white/60">
                        {metadataSummary(row.metadata) || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 ? (
          <nav
            aria-label="Pagination"
            className="mt-6 flex items-center justify-between"
          >
            <PaginationLink
              to={page - 1}
              disabled={page <= 1}
              actionFilter={actionFilter}
              targetFilter={targetFilter}
              label="← Previous"
            />
            <span className="text-xs text-white/50">
              Page {page} of {totalPages}
            </span>
            <PaginationLink
              to={page + 1}
              disabled={page >= totalPages}
              actionFilter={actionFilter}
              targetFilter={targetFilter}
              label="Next →"
            />
          </nav>
        ) : null}
      </section>
    </main>
  );
}

function PaginationLink({
  to,
  disabled,
  actionFilter,
  targetFilter,
  label,
}: {
  to: number;
  disabled: boolean;
  actionFilter: string | null;
  targetFilter: string | null;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="cursor-not-allowed rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/30">
        {label}
      </span>
    );
  }
  const params = new URLSearchParams();
  params.set('page', String(to));
  if (actionFilter) params.set('action', actionFilter);
  if (targetFilter) params.set('target', targetFilter);
  return (
    <Link
      href={`/hs/admin/audit?${params.toString()}`}
      className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/80 transition hover:bg-white/10"
    >
      {label}
    </Link>
  );
}
