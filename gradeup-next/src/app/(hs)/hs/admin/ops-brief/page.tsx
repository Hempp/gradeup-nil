/**
 * /hs/admin/ops-brief — Live ops-brief admin page.
 *
 * Renders today's brief in the browser using the same service that feeds
 * the daily email cron. Useful for ops leads who want to check state
 * without waiting for the next morning's delivery, or for verifying that
 * a signal-producing migration is wired up.
 *
 * This page also exposes a per-admin opt-in toggle (server action) so an
 * individual admin can unsubscribe themselves from the email without
 * touching anyone else's preference.
 *
 * Admin-gated (404 for non-admins, matches every other admin page).
 */

import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  collectDailyOpsBrief,
  setOpsBriefEnabled,
  type OpsBriefDomainStatus,
  type OpsBriefUrgency,
} from '@/lib/hs-nil/ops-brief';

export const metadata: Metadata = {
  title: 'Ops brief — GradeUp HS',
  description:
    "Live view of today's HS-NIL ops brief. Same data the daily email renders.",
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ---------------------------------------------------------------------------
// Admin gate + self lookup (we need the current user's preference row to
// render the opt-in toggle).
// ---------------------------------------------------------------------------

interface AdminContext {
  userId: string;
  opsBriefEnabled: boolean;
  lastSentAt: string | null;
}

async function requireAdminOr404(): Promise<AdminContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, ops_brief_enabled, ops_brief_sent_at')
    .eq('id', user.id)
    .single();

  if (error || !profile || profile.role !== 'admin') notFound();
  return {
    userId: user.id,
    // Default to true if the migration hasn't rolled yet (column returns null/undefined).
    opsBriefEnabled:
      (profile.ops_brief_enabled as boolean | null | undefined) ?? true,
    lastSentAt: (profile.ops_brief_sent_at as string | null | undefined) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Server action — toggle the current admin's opt-in.
// ---------------------------------------------------------------------------

async function toggleOpsBriefAction(formData: FormData): Promise<void> {
  'use server';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || profile.role !== 'admin') return;

  const target = formData.get('enabled') === 'true';
  await setOpsBriefEnabled(user.id, target);
  redirect('/hs/admin/ops-brief');
}

// ---------------------------------------------------------------------------
// Rendering helpers — intentionally mirror the email template's visual
// conventions so the on-screen preview matches the inbox experience.
// ---------------------------------------------------------------------------

function urgencyClasses(u: OpsBriefUrgency): string {
  switch (u) {
    case 'urgent':
      return 'border-rose-500/60 bg-rose-500/5';
    case 'warn':
      return 'border-amber-500/60 bg-amber-500/5';
    case 'clear':
    default:
      return 'border-emerald-500/40 bg-emerald-500/5';
  }
}

function urgencyBadge(u: OpsBriefUrgency): React.ReactElement {
  const styles: Record<OpsBriefUrgency, string> = {
    urgent: 'bg-rose-500 text-white',
    warn: 'bg-amber-500 text-white',
    clear: 'bg-emerald-500 text-white',
  };
  const labels: Record<OpsBriefUrgency, string> = {
    urgent: 'URGENT',
    warn: 'WATCH',
    clear: 'CLEAR',
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-widest ${styles[u]}`}
    >
      {labels[u]}
    </span>
  );
}

function DomainCard({
  title,
  domain,
}: {
  title: string;
  domain: OpsBriefDomainStatus;
}): React.ReactElement {
  return (
    <section
      className={`rounded-xl border p-5 ${urgencyClasses(domain.urgency)}`}
      aria-label={title}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg text-white">{title}</h3>
          {urgencyBadge(domain.urgency)}
        </div>
        <div className="font-display text-3xl text-white">
          {domain.count.toLocaleString()}
        </div>
      </header>
      <p
        className={`mt-2 text-sm ${
          domain.unavailable ? 'italic text-rose-300' : 'text-white/70'
        }`}
      >
        {domain.unavailable
          ? `Data unavailable — ${domain.error ?? 'source query failed'}`
          : domain.summary}
      </p>
      {!domain.unavailable && domain.preview.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-white/80">
          {domain.preview.slice(0, 5).map((p) => (
            <li
              key={p.id}
              className="truncate rounded border border-white/10 bg-black/30 px-2 py-1"
            >
              {p.summary}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-4">
        <Link
          href={domain.deepLink}
          className="text-xs font-semibold text-[var(--accent-primary)] hover:underline"
        >
          Open {title.toLowerCase()} →
        </Link>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function HsOpsBriefPage() {
  const ctx = await requireAdminOr404();

  const now = new Date();
  const rangeEnd = now.toISOString();
  const rangeStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const brief = await collectDailyOpsBrief(rangeStart, rangeEnd);

  const domainOrder: Array<{ title: string; key: keyof typeof brief.domains }> = [
    { title: 'Compliance disclosures', key: 'disclosures' },
    { title: 'Transcript reviews', key: 'transcripts' },
    { title: 'Parent-athlete links', key: 'parentLinks' },
    { title: 'Dispute SLA', key: 'disputes' },
    { title: 'Deferred payouts releasing today', key: 'deferredPayouts' },
    { title: 'Expiring parental consents', key: 'expiringConsents' },
    { title: 'Regulatory changes', key: 'regulatoryChanges' },
    { title: 'Payout failures', key: 'payoutFailures' },
    { title: 'Moderation queue', key: 'moderationQueue' },
    { title: 'Waitlist inflow (last 24h)', key: 'waitlistInflow' },
    { title: 'Deal activity', key: 'dealActivity' },
    { title: 'Brand onboarding (last 7 days)', key: 'brandOnboarding' },
  ];

  const tallyTone =
    brief.tally.urgent > 0
      ? 'border-rose-400/40 bg-rose-400/10 text-rose-100'
      : brief.tally.warn > 0
        ? 'border-amber-400/40 bg-amber-400/10 text-amber-100'
        : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100';

  const lastSentLabel = ctx.lastSentAt
    ? new Date(ctx.lastSentAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'never';

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
              HS-NIL · Operator console
            </p>
            <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
              Daily ops brief
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/60">
              A single at-a-glance view of what needs attention today. Same
              data the morning email renders. Deep-link into any domain to
              act on it.
            </p>
          </div>

          <form
            action={toggleOpsBriefAction}
            className="rounded-xl border border-white/15 bg-white/5 p-4 text-sm"
          >
            <p className="text-[11px] uppercase tracking-widest text-white/50">
              Email delivery
            </p>
            <p className="mt-1 text-white/90">
              {ctx.opsBriefEnabled ? 'Subscribed' : 'Unsubscribed'}
            </p>
            <p className="mt-1 text-xs text-white/50">
              Last sent: {lastSentLabel}
            </p>
            <input
              type="hidden"
              name="enabled"
              value={ctx.opsBriefEnabled ? 'false' : 'true'}
            />
            <button
              type="submit"
              className="mt-3 rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
            >
              {ctx.opsBriefEnabled ? 'Pause email' : 'Resume email'}
            </button>
          </form>
        </header>

        <div
          className={`mt-8 rounded-xl border p-5 ${tallyTone}`}
          aria-label="Today's tally"
        >
          <p className="text-xs font-semibold uppercase tracking-widest">
            Today&rsquo;s tally
          </p>
          <p className="mt-2 font-display text-3xl">
            {brief.tally.total.toLocaleString()} open items ·{' '}
            {brief.tally.urgent} urgent · {brief.tally.warn} to watch
          </p>
          <p className="mt-2 text-xs opacity-80">
            Generated {new Date(brief.generatedAt).toLocaleString('en-US')}
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {domainOrder.map(({ title, key }) => (
            <DomainCard key={key} title={title} domain={brief.domains[key]} />
          ))}
        </div>

        <p className="mt-10 text-xs text-white/40">
          Read-only view — every action lives on the underlying admin page.
          This brief is also emailed daily at 08:30 UTC / 3:30am ET. Use the
          toggle above to pause delivery without affecting other admins.
          {' · '}
          <Link
            href="/hs/admin"
            className="underline decoration-white/30 underline-offset-2 hover:text-white/60"
          >
            Back to ops landing
          </Link>
        </p>
      </section>
    </main>
  );
}
