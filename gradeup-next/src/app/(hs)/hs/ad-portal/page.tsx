/**
 * /hs/ad-portal — State-AD landing dashboard.
 *
 * - Resolves the authenticated user's state_ad_assignments rows.
 * - If 0 assignments → 404 (AD guard).
 * - If 1 assignment → default to that state.
 * - If >1 → render a state picker; selected state persisted via `?state=XX`.
 *
 * Calls getPortalMetricsForState() for the selected state and renders the
 * signal header, on-time disclosure rate card, and navigation tiles into
 * deals/disclosures/settings.
 *
 * Read-only. Every fetch goes through the service layer which logs
 * state_ad_portal_views.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  listAssignmentsForUser,
  getPortalMetricsForState,
  logPortalView,
  type StateAdAssignment,
} from '@/lib/hs-nil/state-ad-portal';
import { STATE_RULES, type USPSStateCode } from '@/lib/hs-nil/state-rules';
import { ADPortalMetricsHeader } from '@/components/hs/ADPortalMetricsHeader';
import { ADComplianceRateCard } from '@/components/hs/ADComplianceRateCard';

export const metadata: Metadata = {
  title: 'State Athletic Association Reports — GradeUp NIL',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Guard helper: require the authenticated user to be an active state_ad
 * with at least one assignment. Returns the full assignment list and the
 * selected-state assignment. 404s on any failure — consistent hiding.
 */
async function requireStateAd(
  selectedState: string | undefined
): Promise<{
  userId: string;
  assignments: StateAdAssignment[];
  active: StateAdAssignment;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const assignments = await listAssignmentsForUser(user.id);
  if (assignments.length === 0) notFound();

  let active: StateAdAssignment | undefined;
  if (selectedState) {
    active = assignments.find((a) => a.stateCode === selectedState);
  }
  if (!active) active = assignments[0];
  if (!active) notFound();

  return { userId: user.id, assignments, active };
}

function stateDisplayName(code: USPSStateCode): string {
  const rule = STATE_RULES[code];
  if (rule?.notes) {
    const match = rule.notes.match(/^([A-Z]{2,}[A-Za-z ]*)/);
    if (match) return match[1].trim();
  }
  return code;
}

export default async function AdPortalPage({ searchParams }: PageProps) {
  const search = await searchParams;
  const rawState = Array.isArray(search.state) ? search.state[0] : search.state;
  const { userId, assignments, active } = await requireStateAd(rawState);

  // Dashboard-level audit row.
  await logPortalView(userId, active.stateCode, 'dashboard');

  const rangeEnd = new Date();
  const rangeStart = new Date(rangeEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
  const metrics = await getPortalMetricsForState(
    active.stateCode,
    rangeStart,
    rangeEnd
  );

  const qs = `?state=${encodeURIComponent(active.stateCode)}`;

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
              State Athletic Association Reports · On request
            </p>
            <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
              {active.organizationName}
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Request a per-school transcript covering every HS-NIL deal and
              disclosure from a member school in{' '}
              <strong>{active.stateCode}</strong>. Every report generation
              is audit-logged.
            </p>
          </div>
          {assignments.length > 1 ? (
            <StatePicker
              assignments={assignments}
              activeCode={active.stateCode}
            />
          ) : null}
        </header>

        <ADPortalMetricsHeader
          metrics={metrics}
          stateDisplayName={stateDisplayName(active.stateCode)}
        />

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <ADComplianceRateCard
            rate={metrics.disclosureSuccessRate}
            totalEmitted={metrics.totalDisclosuresEmitted}
            totalFailed={metrics.totalDisclosuresFailed}
          />

          <article className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="font-display text-xl text-white md:text-2xl">
              Disputes &amp; exceptions
            </h3>
            <p className="mt-1 text-sm text-white/60">
              Disputes raised during the last 30 days across all states.
              Read-only; GradeUp ops mediates.
            </p>
            <p className="mt-6 font-display text-5xl tabular-nums text-white">
              {metrics.totalDisputes}
            </p>
            <p className="mt-2 text-sm text-white/50">disputes in window</p>
          </article>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <NavTile
            href={`/hs/ad-portal/deals${qs}`}
            eyebrow="Deals"
            title="Signed deals list"
            body="Paginated, filterable list of every HS-NIL deal in this state. Links to per-deal compliance detail."
          />
          <NavTile
            href={`/hs/ad-portal/disclosures${qs}`}
            eyebrow="Disclosures"
            title="Disclosure history"
            body="Every outbound disclosure emitted to your office, with status and payload preview."
          />
          <NavTile
            href={`/hs/ad-portal/settings${qs}`}
            eyebrow="Settings"
            title="Your assignment"
            body="Your assigned state(s), organization, and support contact."
          />
        </section>

        <p className="mt-10 text-xs text-white/40">
          PII minimization: athletes are referenced by first name + last
          initial only. No contact info, DOB, or parent PII is exposed
          anywhere in this portal.
        </p>
      </section>
    </main>
  );
}

function NavTile({
  href,
  eyebrow,
  title,
  body,
}: {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/[0.08]"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          {eyebrow}
        </p>
        <h3 className="mt-2 font-display text-xl text-white">{title}</h3>
        <p className="mt-2 text-sm text-white/60">{body}</p>
      </div>
      <p className="mt-6 text-xs font-semibold text-[var(--accent-primary)]">
        Open →
      </p>
    </Link>
  );
}

function StatePicker({
  assignments,
  activeCode,
}: {
  assignments: StateAdAssignment[];
  activeCode: USPSStateCode;
}) {
  return (
    <nav
      aria-label="State picker"
      className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
    >
      {assignments.map((a) => {
        const isActive = a.stateCode === activeCode;
        return (
          <Link
            key={a.id}
            href={`/hs/ad-portal?state=${encodeURIComponent(a.stateCode)}`}
            aria-current={isActive ? 'page' : undefined}
            className={[
              'inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-widest transition',
              isActive
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-white/20 text-white/70 hover:bg-white/10',
            ].join(' ')}
          >
            {a.stateCode}
          </Link>
        );
      })}
    </nav>
  );
}
