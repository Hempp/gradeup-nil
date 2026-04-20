/**
 * /hs/admin — Ops landing page.
 *
 * Single pane of glass for the human operator (founder, ops lead) to see
 * what needs attention across the HS-NIL pilot: transcripts awaiting
 * review, failed compliance disclosures, expiring consents, stuck
 * payouts, pending parent-athlete link requests.
 *
 * Surface rules:
 *   - Server Component. Does all queries server-side, renders HTML.
 *   - READ-ONLY. Every write action is marked "coming soon" or links
 *     out to the existing transcripts admin UI (the only write surface
 *     that already exists).
 *   - Role-gated: profiles.role === 'admin'. Non-admins 404 — we don't
 *     want to reveal that admin routes exist.
 *   - Feature-gated: the (hs) layout already 404s when FEATURE_HS_NIL
 *     is off, so we don't duplicate that here.
 *
 * Graceful degradation: some co-agents' migrations (009 / 010) may not
 * yet be applied. Every per-domain query is wrapped in a try/catch and
 * logs server-side on failure so the page renders with empty-state
 * counts instead of throwing.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  AdminQueueCard,
  type AdminQueuePreview,
} from '@/components/hs/AdminQueueCard';
import { AdminSignalBadge } from '@/components/hs/AdminSignalBadge';
import { listOpenDisputes } from '@/lib/hs-nil/disputes';
import { countBulkOperationsByStatus } from '@/lib/hs-nil/bulk-actions';
import { listFlaggedForOps } from '@/lib/hs-nil/moderation';
import { countActiveStateAds } from '@/lib/hs-nil/state-ad-portal';
import {
  countUnreviewedChanges as countUnreviewedRegulatoryChanges,
  countSourcesStale as countRegulatorySourcesStale,
} from '@/lib/hs-nil/regulatory-monitor';

export const metadata: Metadata = {
  title: 'Ops dashboard — GradeUp HS',
  description:
    'Ops landing page aggregating HS-NIL action-worthy signals: transcripts, disclosures, consents, payouts, links.',
};

// Every query needs to re-run on each load; this is an operator surface.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ---------------------------------------------------------------------------
// Admin gate. 404s on failure rather than 403 so the existence of admin
// routes isn't leaked to unauthenticated visitors / crawlers. This mirrors
// the transcripts API's `profiles.role === 'admin'` lookup pattern.
// ---------------------------------------------------------------------------

async function requireAdminOr404(): Promise<{ userId: string }> {
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
  return { userId: user.id };
}

// ---------------------------------------------------------------------------
// Safe query wrapper. If a table doesn't exist yet (parallel-agent migration
// not applied), return an empty shape and warn server-side.
// ---------------------------------------------------------------------------

type QueueShape = {
  count: number;
  previews: AdminQueuePreview[];
  extra?: Record<string, number>;
};

async function safeLoad(
  label: string,
  loader: () => Promise<QueueShape>
): Promise<QueueShape> {
  try {
    return await loader();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-admin] queue load failed', {
      label,
      message: err instanceof Error ? err.message : String(err),
    });
    return { count: 0, previews: [] };
  }
}

function fmtShortDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Per-domain loaders. Each returns QueueShape so the page can render uniformly.
// ---------------------------------------------------------------------------

async function loadTranscripts(): Promise<QueueShape> {
  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from('transcript_submissions')
    .select('id, athlete_user_id, claimed_gpa, created_at', {
      count: 'exact',
    })
    .eq('status', 'pending_review')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) throw error;

  return {
    count: count ?? 0,
    previews: (data ?? []).map((row) => ({
      id: row.id,
      summary: `Athlete ${row.athlete_user_id.slice(0, 8)} — claimed GPA ${Number(
        row.claimed_gpa
      ).toFixed(2)}`,
      detail: 'Pending review',
      timestamp: row.created_at,
    })),
  };
}

async function loadDisclosures(): Promise<QueueShape> {
  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from('hs_deal_disclosures')
    .select('id, state_code, recipient, failure_reason, created_at', {
      count: 'exact',
    })
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(3);
  if (error) throw error;

  // Also count overdue-but-still-pending as a secondary signal.
  let overdueCount = 0;
  try {
    const { count: pendingOverdue } = await supabase
      .from('hs_deal_disclosures')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lt('scheduled_for', new Date().toISOString());
    overdueCount = pendingOverdue ?? 0;
  } catch {
    // Non-fatal — primary failed count is what we surface in the card.
  }

  return {
    count: count ?? 0,
    previews: (data ?? []).map((row) => ({
      id: row.id,
      summary:
        row.failure_reason?.slice(0, 80) ?? 'Unknown failure — check payload.',
      detail: `${row.state_code} · recipient: ${row.recipient}`,
      timestamp: row.created_at,
    })),
    extra: { overdue: overdueCount },
  };
}

async function loadPendingLinks(): Promise<QueueShape> {
  const supabase = await createClient();
  const threeDaysAgo = new Date(
    Date.now() - 3 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, count, error } = await supabase
    .from('hs_parent_athlete_links')
    .select('id, parent_profile_id, athlete_user_id, relationship, created_at', {
      count: 'exact',
    })
    .is('verified_at', null)
    .lt('created_at', threeDaysAgo)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) throw error;
  return {
    count: count ?? 0,
    previews: (data ?? []).map((row) => ({
      id: row.id,
      summary: `${row.relationship === 'legal_guardian' ? 'Guardian' : 'Parent'} → athlete ${row.athlete_user_id.slice(0, 8)}`,
      detail: 'Unverified > 3 days',
      timestamp: row.created_at,
    })),
  };
}

async function loadPayouts(): Promise<QueueShape> {
  const supabase = await createClient();
  const twoDaysAgo = new Date(
    Date.now() - 2 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from('hs_deal_parent_payouts')
    .select(
      'id, deal_id, status, payout_amount, payout_currency, failed_reason, created_at'
    )
    .in('status', ['failed', 'pending'])
    .lt('created_at', twoDaysAgo)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  const rows = data ?? [];
  const failedCount = rows.filter((r) => r.status === 'failed').length;
  const stuckCount = rows.filter((r) => r.status === 'pending').length;

  return {
    count: rows.length,
    previews: rows.slice(0, 3).map((row) => ({
      id: row.id,
      summary: `${row.status === 'failed' ? 'Failed' : 'Stuck pending'} payout — ${Number(
        row.payout_amount
      ).toFixed(2)} ${row.payout_currency}`,
      detail:
        row.status === 'failed'
          ? (row.failed_reason ?? 'No reason recorded').slice(0, 80)
          : `Deal ${row.deal_id.slice(0, 8)} · no transition in >2d`,
      timestamp: row.created_at,
    })),
    extra: { failed: failedCount, stuck: stuckCount },
  };
}

async function loadOpenDisputes(): Promise<QueueShape> {
  // Service-role driven list — deal_disputes doesn't expose all rows to
  // the auth client. See src/lib/hs-nil/disputes.ts.
  const rows = await listOpenDisputes();
  return {
    count: rows.length,
    previews: rows.slice(0, 3).map((row) => ({
      id: row.id,
      summary: `${row.deal_title} — ${row.reason_category.replace(/_/g, ' ')}`,
      detail: `${row.priority} · raised by ${row.raised_by_role}${
        row.athlete_name || row.brand_name
          ? ` · ${[row.athlete_name, row.brand_name]
              .filter((s): s is string => Boolean(s && s.trim()))
              .join(' × ')}`
          : ''
      }`,
      timestamp: row.created_at,
    })),
  };
}

async function loadModeration(): Promise<QueueShape> {
  // Service-role backed — admin auth client doesn't see cross-deal rows.
  const rows = await listFlaggedForOps(10, 0);
  return {
    count: rows.length,
    previews: rows.slice(0, 3).map((row) => ({
      id: row.id,
      summary:
        row.auto_reasons[0] ??
        (row.auto_categories.length
          ? `Triggered: ${row.auto_categories.join(', ')}`
          : 'Defaulted to human review.'),
      detail: `${row.deal_title ?? `Deal ${row.submission.deal_id.slice(0, 8)}`} · ${row.submission.submission_type.replace(/_/g, ' ')}`,
      timestamp: row.created_at,
    })),
  };
}

async function loadExpiringConsents(): Promise<QueueShape> {
  const supabase = await createClient();
  const now = new Date();
  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const { data, count, error } = await supabase
    .from('parental_consents')
    .select(
      'id, athlete_user_id, parent_full_name, expires_at, relationship',
      { count: 'exact' }
    )
    .is('revoked_at', null)
    .gte('expires_at', now.toISOString())
    .lte('expires_at', in14Days.toISOString())
    .order('expires_at', { ascending: true })
    .limit(3);

  if (error) throw error;
  return {
    count: count ?? 0,
    previews: (data ?? []).map((row) => ({
      id: row.id,
      summary: `${row.parent_full_name} (${row.relationship})`,
      detail: `Expires ${fmtShortDate(row.expires_at) ?? row.expires_at} · athlete ${row.athlete_user_id.slice(0, 8)}`,
      timestamp: row.expires_at,
    })),
  };
}

// ---------------------------------------------------------------------------
// Recent activity feed — last 10 signed consents, last 10 completed deals.
// ---------------------------------------------------------------------------

interface FeedItem {
  id: string;
  kind: 'consent_signed' | 'deal_completed';
  when: string;
  summary: string;
  detail?: string;
}

async function loadRecentActivity(): Promise<FeedItem[]> {
  const supabase = await createClient();
  const items: FeedItem[] = [];

  try {
    const { data } = await supabase
      .from('parental_consents')
      .select('id, parent_full_name, relationship, signed_at')
      .order('signed_at', { ascending: false })
      .limit(10);
    for (const row of data ?? []) {
      items.push({
        id: `consent-${row.id}`,
        kind: 'consent_signed',
        when: row.signed_at,
        summary: `Consent signed by ${row.parent_full_name}`,
        detail: row.relationship,
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-admin] consent feed load failed', err);
  }

  try {
    const { data } = await supabase
      .from('deals')
      .select('id, title, status, updated_at, target_bracket')
      .eq('status', 'completed')
      .eq('target_bracket', 'high_school')
      .order('updated_at', { ascending: false })
      .limit(10);
    for (const row of data ?? []) {
      items.push({
        id: `deal-${row.id}`,
        kind: 'deal_completed',
        when: row.updated_at,
        summary: `Deal completed: ${row.title}`,
        detail: row.target_bracket,
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-admin] deal feed load failed', err);
  }

  return items
    .filter((i) => i.when)
    .sort((a, b) => (a.when < b.when ? 1 : -1))
    .slice(0, 10);
}

function fmtFeedTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

async function loadWeeklyDealCount(): Promise<number> {
  const supabase = await createClient();
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();
  try {
    const { count } = await supabase
      .from('deals')
      .select('id', { count: 'exact', head: true })
      .eq('target_bracket', 'high_school')
      .gte('created_at', sevenDaysAgo);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function HsAdminLandingPage() {
  await requireAdminOr404();

  const [
    transcripts,
    disclosures,
    links,
    payouts,
    consents,
    disputes,
    moderation,
    feed,
    weeklyDealCount,
  ] = await Promise.all([
    safeLoad('transcripts', loadTranscripts),
    safeLoad('disclosures', loadDisclosures),
    safeLoad('pending_links', loadPendingLinks),
    safeLoad('payouts', loadPayouts),
    safeLoad('expiring_consents', loadExpiringConsents),
    safeLoad('open_disputes', loadOpenDisputes),
    safeLoad('moderation', loadModeration),
    loadRecentActivity(),
    loadWeeklyDealCount(),
  ]);

  // Bulk-op signal counts. Out-of-band try so a missing migration on a
  // preview env doesn't blank the rest of the page.
  let bulkCounts = { running: 0, partial_failure: 0 };
  try {
    bulkCounts = await countBulkOperationsByStatus();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-admin] bulk op count load failed', err);
  }

  // State-AD portal counts. Out-of-band so a missing migration doesn't
  // blank the page on a preview env.
  let stateAdCounts = { assignments: 0, openInvitations: 0 };
  try {
    stateAdCounts = await countActiveStateAds();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-admin] state-ad count load failed', err);
  }

  // Regulatory monitor counts. Same out-of-band posture — the Phase 14
  // migration (20260420_003_regulatory_monitoring.sql) may not be applied
  // on every preview environment.
  let regulatoryCounts = { unreviewed: 0, stale: 0 };
  try {
    const [unreviewed, stale] = await Promise.all([
      countUnreviewedRegulatoryChanges(),
      countRegulatorySourcesStale(14),
    ]);
    regulatoryCounts = { unreviewed, stale };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-admin] regulatory-monitor count load failed', err);
  }

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            HS-NIL · Operator console
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            What needs you today
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/60">
            A single pane of glass for the HS-NIL pilot. Everything here is
            read-only — drill into a card to see the full list and act
            through the existing per-domain tools. Write actions land in
            Phase&nbsp;6.
          </p>
        </header>

        {/* Signal bar */}
        <div
          className="mt-8 flex flex-wrap gap-2"
          aria-label="Ops signal summary"
        >
          <AdminSignalBadge
            label="transcripts pending"
            count={transcripts.count}
            href="/hs/admin/transcripts"
          />
          <AdminSignalBadge
            label="disclosures failed"
            count={disclosures.count}
            href="/hs/admin/disclosures"
          />
          <AdminSignalBadge
            label="consents expiring ≤14d"
            count={consents.count}
            href="/hs/admin/consents"
          />
          <AdminSignalBadge
            label="payouts stuck"
            count={payouts.count}
            href="/hs/admin/payouts"
          />
          <AdminSignalBadge
            label="parent links > 3d unverified"
            count={links.count}
            href="/hs/admin/links"
          />
          <AdminSignalBadge
            label="disputes open"
            count={disputes.count}
            href="/hs/admin/disputes"
          />
          <AdminSignalBadge
            label="moderation flagged"
            count={moderation.count}
            href="/hs/admin/moderation"
          />
        </div>

        {/* Queue grid */}
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <AdminQueueCard
            id="transcripts"
            title="Transcript reviews"
            subtitle="Athlete GPA proof queue (Tier B)."
            count={transcripts.count}
            href="/hs/admin/transcripts"
            linkLabel="Open review queue"
            previews={transcripts.previews}
            emptyMessage="No transcripts waiting."
            footnote="Full approve/reject flow lives in the existing transcripts admin UI."
          />

          <AdminQueueCard
            id="disclosures"
            title="Compliance disclosures"
            subtitle="Failed outbound disclosures to state / school."
            count={disclosures.count}
            href="/hs/admin/disclosures"
            linkLabel="Review failures"
            previews={disclosures.previews}
            emptyMessage="No failed disclosures."
            footnote={
              disclosures.extra?.overdue
                ? `Also: ${disclosures.extra.overdue} pending disclosures past their scheduled time.`
                : 'Retry action is a follow-up for Phase 6.'
            }
          />

          <AdminQueueCard
            id="pending-links"
            title="Parent-athlete link requests"
            subtitle="Guardianship claims unverified for more than 3 days."
            count={links.count}
            href="/hs/admin/links"
            linkLabel="Review pending links"
            previews={links.previews}
            emptyMessage="No stale link requests."
            footnote="Fresh (< 3d) requests aren't surfaced — athlete verification in progress."
          />

          <AdminQueueCard
            id="payouts"
            title="Parent payouts"
            subtitle="Failed or stuck-pending Stripe Connect transfers."
            count={payouts.count}
            href="/hs/admin/payouts"
            linkLabel="Open payout queue"
            previews={payouts.previews}
            emptyMessage="All payouts are current."
            footnote={
              payouts.extra
                ? `${payouts.extra.failed ?? 0} failed · ${payouts.extra.stuck ?? 0} stuck ≥ 2d`
                : 'No detail available.'
            }
          />

          <AdminQueueCard
            id="expiring-consents"
            title="Expiring consents"
            subtitle="Parental consents lapsing within 14 days."
            count={consents.count}
            href="/hs/admin/consents"
            linkLabel="See expiring consents"
            previews={consents.previews}
            emptyMessage="No expirations on the horizon."
            thresholds={{ warn: 1, urgent: 10 }}
            footnote="Renewals go through the existing athlete consent flow; nudge via email."
          />

          <AdminQueueCard
            id="disputes"
            title="Deal disputes"
            subtitle="Open + under-review disputes needing mediation."
            count={disputes.count}
            href="/hs/admin/disputes"
            linkLabel="Open mediation queue"
            previews={disputes.previews}
            emptyMessage="No disputes open."
            thresholds={{ warn: 1, urgent: 3 }}
            footnote="Disputes pause the deal until resolved; resolution transitions the deal automatically."
          />

          <AdminQueueCard
            id="moderation"
            title="Content moderation"
            subtitle="Flagged deliverables awaiting ops review."
            count={moderation.count}
            href="/hs/admin/moderation"
            linkLabel="Open moderation queue"
            previews={moderation.previews}
            emptyMessage="All deliverables cleared automatically."
            thresholds={{ warn: 1, urgent: 5 }}
            footnote="Images default to human review; text content auto-approves only at ≥ 85% confidence."
          />

          <AdminQueueCard
            id="regulatory-monitor"
            title="Regulatory monitor"
            subtitle="Weekly content-hash watch of state athletic association pages."
            count={regulatoryCounts.unreviewed}
            href="/hs/admin/regulatory-monitor"
            linkLabel="Open regulatory monitor"
            previews={[]}
            emptyMessage={
              regulatoryCounts.stale > 0
                ? `No unreviewed changes · ${regulatoryCounts.stale} source${regulatoryCounts.stale === 1 ? '' : 's'} stale >14d.`
                : 'No unreviewed changes. Next poll runs Monday 9am ET.'
            }
            thresholds={{ warn: 1, urgent: 5 }}
            footnote={
              regulatoryCounts.stale > 0
                ? `${regulatoryCounts.unreviewed} unreviewed · ${regulatoryCounts.stale} stale sources need attention`
                : 'Detects drift so STATE_RULES does not rot. Admin reviews every detected change.'
            }
          />

          <AdminQueueCard
            id="state-ads"
            title="State AD portal"
            subtitle="Read-only compliance portal access for state athletic associations."
            count={stateAdCounts.assignments}
            href="/hs/admin/state-ads"
            linkLabel="Manage state ADs"
            previews={[]}
            emptyMessage={
              stateAdCounts.openInvitations > 0
                ? `No active ADs yet · ${stateAdCounts.openInvitations} invitation${stateAdCounts.openInvitations === 1 ? '' : 's'} pending.`
                : 'No active ADs yet. Send an invitation to get started.'
            }
            thresholds={{ warn: 9999, urgent: 99999 }}
            footnote={
              stateAdCounts.openInvitations > 0
                ? `${stateAdCounts.assignments} active · ${stateAdCounts.openInvitations} invitation${stateAdCounts.openInvitations === 1 ? '' : 's'} pending acceptance`
                : `${stateAdCounts.assignments} active assignments across all states.`
            }
          />
        </div>

        {/* Ops tools + bulk operations callouts */}
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Link
            href="/hs/admin/ops-brief"
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/[0.04] p-6 transition-colors hover:bg-[var(--accent-primary)]/[0.10] md:col-span-2"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
                Ops brief
              </p>
              <h2 className="mt-1 font-display text-xl text-white">
                Today at a glance
              </h2>
              <p className="mt-1 text-sm text-white/60">
                One page covering every signal on this dashboard. Same data
                the 3:30am ET email delivers — check it live any time.
              </p>
            </div>
            <p className="text-xs font-semibold text-[var(--accent-primary)]">
              Open ops brief →
            </p>
          </Link>

          <Link
            href="/hs/admin/ops-tools"
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/15 bg-white/5 p-6 transition-colors hover:bg-white/10"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
                Ops tools
              </p>
              <h2 className="mt-1 font-display text-xl text-white">
                Bulk actions &amp; concierge cohort
              </h2>
              <p className="mt-1 text-sm text-white/60">
                Fan-out retries, retry-guard status, per-parent funnel
                dashboard for the pilot.
              </p>
            </div>
            <p className="text-xs font-semibold text-[var(--accent-primary)]">
              Open ops tools →
            </p>
          </Link>

          <Link
            href="/hs/admin/ops-tools/bulk-operations"
            className={[
              'flex flex-wrap items-center justify-between gap-4 rounded-xl border p-6 transition-colors',
              bulkCounts.running > 0 || bulkCounts.partial_failure > 0
                ? 'border-amber-400/40 bg-amber-400/5 hover:bg-amber-400/10'
                : 'border-white/15 bg-white/5 hover:bg-white/10',
            ].join(' ')}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
                Bulk operations
              </p>
              <h2 className="mt-1 font-display text-xl text-white">
                Bulk op history
              </h2>
              <p className="mt-1 text-sm text-white/60">
                {bulkCounts.running > 0
                  ? `${bulkCounts.running} running · ${bulkCounts.partial_failure} partial-failure`
                  : bulkCounts.partial_failure > 0
                    ? `${bulkCounts.partial_failure} partial-failure need review`
                    : 'No runs in flight.'}
              </p>
            </div>
            <p className="text-xs font-semibold text-[var(--accent-primary)]">
              See all runs →
            </p>
          </Link>

          <Link
            href="/hs/admin/nurture-sequences"
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/15 bg-white/5 p-6 transition-colors hover:bg-white/10 md:col-span-2"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
                Nurture sequences
              </p>
              <h2 className="mt-1 font-display text-xl text-white">
                Post-waitlist drip health
              </h2>
              <p className="mt-1 text-sm text-white/60">
                Enrollment, conversion, and unsubscribe rates for the
                per-role email nurture program.
              </p>
            </div>
            <p className="text-xs font-semibold text-[var(--accent-primary)]">
              Open sequence dashboard →
            </p>
          </Link>
        </div>

        {/* Analytics entry point */}
        <Link
          href="/hs/admin/analytics"
          className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/[0.06] p-6 transition-colors hover:bg-[var(--accent-primary)]/[0.10]"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
              Analytics
            </p>
            <h2 className="mt-1 font-display text-xl text-white md:text-2xl">
              Is this thing working?
            </h2>
            <p className="mt-1 text-sm text-white/60">
              Funnel, cohorts, deal volume, referral graph, ranker quality.
              Read-only, 60-second cache.
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
              Deals signed · last 7 days
            </p>
            <p className="mt-1 font-display text-3xl text-white">
              {weeklyDealCount}
            </p>
            <p className="mt-2 text-xs font-semibold text-[var(--accent-primary)]">
              Open analytics →
            </p>
          </div>
        </Link>

        {/* Recent activity */}
        <section
          className="mt-12 rounded-xl border border-white/10 bg-white/5 p-6"
          aria-labelledby="recent-activity-heading"
        >
          <header className="flex items-center justify-between">
            <div>
              <h2
                id="recent-activity-heading"
                className="font-display text-xl text-white md:text-2xl"
              >
                Recent activity
              </h2>
              <p className="mt-1 text-sm text-white/60">
                Last 10 signed consents and completed HS deals. Read-only.
              </p>
            </div>
          </header>

          {feed.length === 0 ? (
            <p className="mt-6 text-sm text-white/50">
              Nothing here yet — once consents get signed and deals complete
              they&rsquo;ll appear in this feed.
            </p>
          ) : (
            <ol className="mt-6 space-y-2">
              {feed.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-white/10 bg-black/30 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white/90">
                      <span
                        className={[
                          'mr-2 inline-block rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest',
                          item.kind === 'consent_signed'
                            ? 'border-emerald-400/40 text-emerald-200'
                            : 'border-[var(--accent-primary)]/50 text-[var(--accent-primary)]',
                        ].join(' ')}
                      >
                        {item.kind === 'consent_signed'
                          ? 'Consent'
                          : 'Deal'}
                      </span>
                      {item.summary}
                    </p>
                    {item.detail ? (
                      <p className="mt-0.5 truncate text-xs text-white/50">
                        {item.detail}
                      </p>
                    ) : null}
                  </div>
                  <time
                    dateTime={item.when}
                    className="whitespace-nowrap text-xs text-white/50"
                  >
                    {fmtFeedTime(item.when)}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </section>

        <p className="mt-10 text-xs text-white/40">
          Admin surface gated by <code>profiles.role = &apos;admin&apos;</code>.
          Non-admin users get a 404 to avoid leaking the existence of these
          routes.{' '}
          <Link
            href="/hs/admin/audit"
            className="underline decoration-white/30 underline-offset-2 hover:text-white/60"
          >
            View admin action log
          </Link>
          {' · '}
          <Link
            href="/hs"
            className="underline decoration-white/30 underline-offset-2 hover:text-white/60"
          >
            Back to HS home
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
