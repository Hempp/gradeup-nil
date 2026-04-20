/**
 * /hs/admin/regulatory-monitor — Admin landing for REGULATORY-MONITOR.
 *
 * Server Component, admin-gated (404 for non-admins).
 *
 * Signal strip:
 *   - changes_detected_this_week
 *   - states_with_stale_checks (>14 days)
 *   - sources_needing_real_urls (placeholder URLs from seed)
 *
 * Main surfaces:
 *   - Unreviewed changes queue (detected_at desc)
 *   - All sources with per-source last_checked / last_changed + force-recheck
 *
 * This page does NOT surface rules edits. It surfaces *signals* that a human
 * should go look at something; the edit still happens via migrations or the
 * state_nil_rules table out-of-band.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  listSources,
  listUnreviewedChanges,
  countUnreviewedChanges,
  countSourcesStale,
  countSourcesNeedingRealUrls,
  countChangesInLastDays,
  type RegulatorySource,
} from '@/lib/hs-nil/regulatory-monitor';
import { RegulatoryChangeCard } from '@/components/hs/RegulatoryChangeCard';
import { RegulatorySourceStatus } from '@/components/hs/RegulatorySourceStatus';
import { AdminSignalBadge } from '@/components/hs/AdminSignalBadge';

export const metadata: Metadata = {
  title: 'Regulatory monitor — GradeUp HS ops',
  description:
    'Weekly content-hash monitor of state athletic association announcement pages. Detects drift so STATE_RULES does not rot.',
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

function isPlaceholderUrl(source: RegulatorySource): boolean {
  return Boolean(source.notes?.toLowerCase().includes('placeholder url'));
}

export default async function RegulatoryMonitorPage() {
  await requireAdminOr404();

  const [
    unreviewed,
    totalUnreviewed,
    sources,
    staleCount,
    placeholderCount,
    weekCount,
  ] = await Promise.all([
    listUnreviewedChanges(50),
    countUnreviewedChanges(),
    listSources(),
    countSourcesStale(14),
    countSourcesNeedingRealUrls(),
    countChangesInLastDays(7),
  ]);

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            HS-NIL · Regulatory monitor
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            What the state associations just changed
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/60">
            Weekly content-hash polling of state-athletic-association pages.
            This page shows what moved — we don&apos;t auto-update the
            per-state rules engine; admin reviews each change and updates
            STATE_RULES by hand when warranted. Best-effort, not magic.
          </p>
        </header>

        {/* Signal strip */}
        <div
          className="mt-8 flex flex-wrap gap-2"
          aria-label="Regulatory monitor signal summary"
        >
          <AdminSignalBadge
            label="changes this week"
            count={weekCount}
            href="#unreviewed"
          />
          <AdminSignalBadge
            label="unreviewed total"
            count={totalUnreviewed}
            href="#unreviewed"
          />
          <AdminSignalBadge
            label="states stale >14d"
            count={staleCount}
            href="#sources"
          />
          <AdminSignalBadge
            label="placeholder URLs"
            count={placeholderCount}
            href="#sources"
          />
        </div>

        {/* Unreviewed queue */}
        <section
          id="unreviewed"
          className="mt-10"
          aria-labelledby="unreviewed-heading"
        >
          <header className="flex items-center justify-between">
            <div>
              <h2
                id="unreviewed-heading"
                className="font-display text-xl text-white md:text-2xl"
              >
                Unreviewed change events
              </h2>
              <p className="mt-1 text-sm text-white/60">
                Ordered newest first. Open each event to record an outcome.
                &quot;rule change&quot; is the only outcome that writes an
                audit log entry — the others are noise-filtering.
              </p>
            </div>
          </header>

          {unreviewed.length === 0 ? (
            <p className="mt-6 rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
              No unreviewed events. Next weekly poll runs Monday 9am ET.
            </p>
          ) : (
            <ol className="mt-6 space-y-3">
              {unreviewed.map((evt) => (
                <RegulatoryChangeCard
                  key={evt.id}
                  eventId={evt.id}
                  stateCode={evt.source.stateCode}
                  sourceUrl={evt.source.sourceUrl}
                  detectedAt={evt.detectedAt}
                  diffSummary={evt.diffSummary}
                  reviewOutcome={evt.reviewOutcome}
                  unreviewed
                />
              ))}
            </ol>
          )}
        </section>

        {/* All sources */}
        <section
          id="sources"
          className="mt-12"
          aria-labelledby="sources-heading"
        >
          <header className="flex items-center justify-between">
            <div>
              <h2
                id="sources-heading"
                className="font-display text-xl text-white md:text-2xl"
              >
                All tracked sources
              </h2>
              <p className="mt-1 text-sm text-white/60">
                Each pilot state plus AL (currently prohibited — we watch for
                status change). Placeholder URLs were seeded with best-guess
                values; admin confirms them before these become trusted.
              </p>
            </div>
          </header>

          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {sources.map((s) => (
              <RegulatorySourceStatus
                key={s.id}
                id={s.id}
                stateCode={s.stateCode}
                sourceUrl={s.sourceUrl}
                sourceType={s.sourceType}
                lastCheckedAt={s.lastCheckedAt}
                lastChangedAt={s.lastChangedAt}
                placeholderUrl={isPlaceholderUrl(s)}
                active={s.active}
              />
            ))}
          </ul>
        </section>

        <p className="mt-10 text-xs text-white/40">
          Cron: <code>/api/cron/regulatory-monitor</code> runs{' '}
          <code>0 14 * * 1</code> (Mon 9am ET).{' '}
          <Link
            href="/hs/admin"
            className="underline decoration-white/30 underline-offset-2 hover:text-white/60"
          >
            Back to admin console
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
