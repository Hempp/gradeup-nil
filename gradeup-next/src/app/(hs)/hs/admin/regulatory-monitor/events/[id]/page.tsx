/**
 * /hs/admin/regulatory-monitor/events/[id]
 *
 * Per-event admin review page. Shows the detection metadata + diff summary
 * and renders RegulatoryChangeReviewPanel so the admin can record an
 * outcome + notes. Admin-gated (404 for non-admins).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getChangeEvent } from '@/lib/hs-nil/regulatory-monitor';
import { RegulatoryChangeReviewPanel } from '@/components/hs/RegulatoryChangeReviewPanel';

export const metadata: Metadata = {
  title: 'Review regulatory change — GradeUp HS ops',
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

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toUTCString();
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RegulatoryEventReviewPage({ params }: PageProps) {
  await requireAdminOr404();
  const { id } = await params;

  const event = await getChangeEvent(id);
  if (!event) notFound();

  const alreadyReviewed = event.reviewedAt !== null;
  const defaultOutcome =
    event.diffSummary?.startsWith('FETCH FAILED') ? 'unable_to_parse' : 'no_change';

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-4xl px-6 py-16">
        <nav className="text-xs text-white/50">
          <Link
            href="/hs/admin/regulatory-monitor"
            className="underline decoration-white/30 underline-offset-2 hover:text-white/80"
          >
            ← Back to regulatory monitor
          </Link>
        </nav>

        <header className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            HS-NIL · Regulatory change review
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            {event.source.stateCode} &middot; {event.source.sourceType}
          </h1>
          <p className="mt-2 break-all text-sm text-white/60">
            {event.source.sourceUrl}
          </p>
        </header>

        <dl className="mt-8 grid grid-cols-1 gap-4 rounded-xl border border-white/10 bg-white/5 p-5 md:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-white/50">
              Detected
            </dt>
            <dd className="mt-1 text-sm text-white/90">
              {fmt(event.detectedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-white/50">
              Hash
            </dt>
            <dd className="mt-1 font-mono text-xs text-white/70">
              {(event.oldHash ?? '—').slice(0, 12)} →{' '}
              {(event.newHash ?? '—').slice(0, 12)}
            </dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-widest text-white/50">
              Diff summary
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-white/80">
              {event.diffSummary ?? '(none)'}
            </dd>
          </div>
        </dl>

        {alreadyReviewed ? (
          <section className="mt-8 rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-5 text-sm text-emerald-100">
            <p>
              This event was already reviewed:{' '}
              <strong>{event.reviewOutcome ?? 'unknown'}</strong> at{' '}
              {fmt(event.reviewedAt)}.
            </p>
            {event.reviewNotes && (
              <p className="mt-3 whitespace-pre-wrap text-sm text-emerald-100/80">
                {event.reviewNotes}
              </p>
            )}
          </section>
        ) : (
          <section
            className="mt-8"
            aria-labelledby="review-heading"
          >
            <h2
              id="review-heading"
              className="font-display text-xl text-white md:text-2xl"
            >
              Record your review
            </h2>
            <p className="mt-1 mb-4 text-sm text-white/60">
              Open the source page in a new tab, compare the change, then pick
              the outcome that matches. &quot;rule change&quot; writes an
              admin audit log entry.
            </p>
            <RegulatoryChangeReviewPanel
              eventId={event.id}
              stateCode={event.source.stateCode}
              sourceUrl={event.source.sourceUrl}
              defaultOutcome={defaultOutcome}
            />
          </section>
        )}
      </section>
    </main>
  );
}
