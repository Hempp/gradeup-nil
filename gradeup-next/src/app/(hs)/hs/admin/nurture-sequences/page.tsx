/**
 * /hs/admin/nurture-sequences
 *
 * Read-only ops dashboard for the post-waitlist nurture program.
 * Shows per-sequence enrollment counts + conversion + unsubscribe
 * rates so the operator can see at a glance which drip is earning
 * its keep.
 *
 * Scope for this pass: read-only, no template editing. Template-edit
 * surface is out of scope — copy lives in nurture-emails.ts and the
 * next-gen admin pass will add an in-DB overrides table.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  listSequenceSummaries,
  type SequenceSummary,
} from '@/lib/hs-nil/nurture-sequences';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Nurture sequences — GradeUp HS Ops',
  description:
    'Enrollment counts, conversion rates, and unsubscribe rates for the post-waitlist nurture program.',
};

async function requireAdminOr404(): Promise<void> {
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

function roleLabel(role: string): string {
  switch (role) {
    case 'hs_athlete':
      return 'Athlete';
    case 'hs_parent':
      return 'Parent';
    case 'coach':
      return 'Coach';
    case 'brand':
      return 'Brand';
    default:
      return role;
  }
}

function formatPct(value: number): string {
  return `${value.toFixed(2)}%`;
}

export default async function NurtureSequencesAdminPage() {
  await requireAdminOr404();

  let summaries: SequenceSummary[] = [];
  let loadError: string | null = null;
  try {
    summaries = await listSequenceSummaries();
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  const totals = summaries.reduce(
    (acc, s) => ({
      enrolled: acc.enrolled + s.enrolled,
      completed: acc.completed + s.completed,
      converted: acc.converted + s.converted,
      unsubscribed: acc.unsubscribed + s.unsubscribed,
      failed: acc.failed + s.failed,
    }),
    { enrolled: 0, completed: 0, converted: 0, unsubscribed: 0, failed: 0 }
  );

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            HS-NIL · Ops · Nurture sequences
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Post-waitlist drip health
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/60">
            Read-only. Conversion is defined as &ldquo;waitlist signup
            finished a GradeUp account&rdquo;. Unsubscribe is the user
            clicking the link in a nurture email. Counts include every
            enrollment ever created; rates are lifetime.
          </p>
        </header>

        {loadError ? (
          <div
            className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200"
            role="alert"
          >
            <p className="font-semibold">Could not load sequence summaries.</p>
            <p className="mt-1 text-xs text-red-200/80">{loadError}</p>
            <p className="mt-3 text-xs text-red-200/70">
              This usually means the Phase 15 migration has not been applied
              to this environment yet.
            </p>
          </div>
        ) : null}

        {/* Totals strip */}
        <div className="mt-8 grid gap-3 md:grid-cols-5">
          <StatCell label="Enrolled" value={totals.enrolled} />
          <StatCell label="Completed" value={totals.completed} />
          <StatCell label="Converted" value={totals.converted} tone="accent" />
          <StatCell label="Unsubscribed" value={totals.unsubscribed} />
          <StatCell label="Failed" value={totals.failed} />
        </div>

        {/* Per-sequence table */}
        <div className="mt-10 overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/30 text-xs uppercase tracking-widest text-white/60">
              <tr>
                <th className="px-4 py-3">Sequence</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Enrolled</th>
                <th className="px-4 py-3 text-right">Completed</th>
                <th className="px-4 py-3 text-right">Converted</th>
                <th className="px-4 py-3 text-right">Conv %</th>
                <th className="px-4 py-3 text-right">Unsub %</th>
                <th className="px-4 py-3 text-right">Failed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {summaries.length === 0 && !loadError ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-xs text-white/50"
                  >
                    No sequence definitions found. Check that the Phase 15
                    migration has been applied.
                  </td>
                </tr>
              ) : null}
              {summaries.map((s) => (
                <tr
                  key={s.sequence_id}
                  className={s.active ? '' : 'opacity-60'}
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">
                      {s.sequence_id}
                    </div>
                    <div className="mt-0.5 text-xs text-white/50">
                      {s.description}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] uppercase tracking-widest text-white/70">
                      {roleLabel(s.role)}
                    </span>
                    {!s.active ? (
                      <span className="ml-2 text-[11px] uppercase tracking-widest text-amber-300">
                        paused
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm">
                    {s.enrolled}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm">
                    {s.completed}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-[var(--accent-primary)]">
                    {s.converted}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-[var(--accent-primary)]">
                    {formatPct(s.conversion_rate)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-white/70">
                    {formatPct(s.unsubscribe_rate)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-white/70">
                    {s.failed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-8 text-xs text-white/40">
          Daily sequencer runs at 08:00 UTC via
          <code className="mx-1 rounded bg-white/10 px-1 py-0.5">
            /api/cron/hs-nurture-sequencer
          </code>
          . Template editing isn&rsquo;t exposed here yet — sequence copy
          lives in
          <code className="mx-1 rounded bg-white/10 px-1 py-0.5">
            src/lib/services/hs-nil/nurture-emails.ts
          </code>
          .{' '}
          <Link
            href="/hs/admin"
            className="underline decoration-white/30 underline-offset-2 hover:text-white/60"
          >
            Back to ops dashboard
          </Link>
          .
        </p>
      </section>
    </main>
  );
}

function StatCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'accent';
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
        {label}
      </p>
      <p
        className={[
          'mt-1 font-display text-2xl',
          tone === 'accent' ? 'text-[var(--accent-primary)]' : 'text-white',
        ].join(' ')}
      >
        {value}
      </p>
    </div>
  );
}
