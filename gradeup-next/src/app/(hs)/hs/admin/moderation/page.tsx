/**
 * /hs/admin/moderation — Ops queue for deliverable content-moderation review.
 *
 * Server Component, admin-gated (404 for non-admins). Reads via the
 * service-role helper because auth-client RLS does not expose all
 * moderation rows to admins cross-deal. Rows shown: flagged +
 * ops_reviewing, oldest first (fairness).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  listFlaggedForOps,
  type ModeratedSubmissionView,
} from '@/lib/hs-nil/moderation';

export const metadata: Metadata = {
  title: 'Moderation queue — GradeUp HS ops',
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

function fmtAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'just now';
  const minutes = Math.floor(ms / (60 * 1000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function submissionPreview(row: ModeratedSubmissionView): string {
  const s = row.submission;
  switch (s.submission_type) {
    case 'image_proof':
      return 'Image upload';
    case 'social_post_url':
      return s.content_url
        ? `${s.platform ?? 'Social'}: ${s.content_url}`
        : 'Social post';
    case 'external_link':
      return s.content_url ?? 'External link';
    case 'receipt':
      return s.content_url ? `Receipt: ${s.content_url}` : 'Receipt file';
    case 'text_note':
      return s.note ? s.note.slice(0, 120) : 'Text note';
    default:
      return 'Submission';
  }
}

function renderRow(row: ModeratedSubmissionView) {
  return (
    <li
      key={row.id}
      className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-[var(--accent-primary)]/40"
    >
      <Link
        href={`/hs/admin/moderation/${row.id}`}
        className="flex flex-wrap items-start justify-between gap-3"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {row.deal_title ?? `Deal ${row.submission.deal_id.slice(0, 8)}`}
          </p>
          <p className="mt-1 truncate text-xs text-white/60">
            {row.athlete_first_name ?? 'Athlete'} &middot;{' '}
            {submissionPreview(row)}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {row.auto_categories.length === 0 ? (
              <span className="text-[11px] text-white/50">
                Needs human eyes
              </span>
            ) : (
              row.auto_categories.slice(0, 4).map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-200"
                >
                  {c.replace(/_/g, ' ')}
                </span>
              ))
            )}
          </div>
          {row.auto_reasons.length > 0 && (
            <p className="mt-2 line-clamp-2 text-xs text-white/60">
              {row.auto_reasons[0]}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="inline-flex items-center rounded-full border border-white/30 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white/80">
            Review
          </span>
          <span className="text-[11px] text-white/50">
            {fmtAge(row.created_at)} old
          </span>
        </div>
      </Link>
    </li>
  );
}

export default async function AdminModerationPage() {
  await requireAdminOr404();

  let rows: ModeratedSubmissionView[] = [];
  try {
    rows = await listFlaggedForOps(100, 0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[hs-admin/moderation] list failed', err);
  }

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 pt-12 pb-6">
        <Link
          href="/hs/admin"
          className="inline-flex min-h-[44px] items-center text-sm text-white/70 hover:text-white"
        >
          ← Back to ops dashboard
        </Link>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          HS-NIL · Moderation
        </p>
        <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
          Deliverable moderation queue
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/60">
          {rows.length === 0
            ? 'No deliverables need human review right now.'
            : `${rows.length} deliverable${rows.length === 1 ? '' : 's'} flagged by the classifier or defaulting to human review (images, unreachable links). Oldest first.`}
        </p>

        {rows.length > 0 && <ul className="mt-8 space-y-3">{rows.map(renderRow)}</ul>}

        <p className="mt-10 text-xs text-white/40">
          Approving a row releases the deliverable to the brand; rejecting
          blocks it and notifies the athlete. Rerun the classifier when the
          keyword lists change.
        </p>
      </section>
    </main>
  );
}
