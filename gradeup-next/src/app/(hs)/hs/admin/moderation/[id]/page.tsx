/**
 * /hs/admin/moderation/[id] — Ops review detail page.
 *
 * Shows:
 *   - The full submission content (image preview, URL, text note).
 *   - Classifier reasons + categories.
 *   - Human decision form (approve/reject + reviewer notes).
 *   - Rerun-classifier escape hatch.
 *
 * Server Component, admin-gated. The write form is a Client Component
 * (ModerationReviewPanel) posting to /api/hs/admin/moderation/decide.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  getModerationById,
  moderationStatusLabel,
} from '@/lib/hs-nil/moderation';
import { getSignedDeliverableUrl } from '@/lib/hs-nil/deliverables';
import { ModerationReviewPanel } from '@/components/hs/ModerationReviewPanel';

export const metadata: Metadata = {
  title: 'Moderation review — GradeUp HS ops',
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

function fmtWhen(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function AdminModerationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOr404();
  const { id } = await params;
  const row = await getModerationById(id);
  if (!row) notFound();

  // Signed URL for image_proof preview. Short TTL — admins can refresh.
  let signedUrl: string | null = null;
  if (row.submission.storage_path) {
    signedUrl = await getSignedDeliverableUrl(row.submission.storage_path, 600);
  }

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-4xl px-6 pt-12 pb-6">
        <Link
          href="/hs/admin/moderation"
          className="inline-flex min-h-[44px] items-center text-sm text-white/70 hover:text-white"
        >
          ← Back to moderation queue
        </Link>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          HS-NIL · Moderation review
        </p>
        <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
          {row.deal_title ?? `Deal ${row.submission.deal_id.slice(0, 8)}`}
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Athlete: {row.athlete_first_name ?? 'Unknown'} &middot; Submitted{' '}
          {fmtWhen(row.submission.created_at) ?? row.submission.created_at}
          &middot; Status: {moderationStatusLabel(row.status)}
        </p>

        {/* Submission content */}
        <section className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Submission
          </p>
          <p className="mt-2 text-sm text-white/80">
            Type: {row.submission.submission_type.replace(/_/g, ' ')}
            {row.submission.platform ? ` · ${row.submission.platform}` : ''}
          </p>

          {row.submission.submission_type === 'image_proof' && signedUrl && (
            <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-black/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signedUrl}
                alt="Deliverable proof"
                className="h-auto w-full object-contain"
                style={{ maxHeight: 480 }}
              />
            </div>
          )}
          {row.submission.submission_type === 'image_proof' && !signedUrl && (
            <p className="mt-3 text-sm text-white/60">
              Image uploaded (preview unavailable).
            </p>
          )}
          {row.submission.content_url && (
            <p className="mt-3 break-all text-sm">
              <a
                href={row.submission.content_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent-primary)] underline underline-offset-2"
              >
                {row.submission.content_url}
              </a>
            </p>
          )}
          {row.submission.note && (
            <p className="mt-3 whitespace-pre-line rounded-lg bg-white/5 p-3 text-sm text-white/80">
              {row.submission.note}
            </p>
          )}
        </section>

        <section className="mt-6">
          <ModerationReviewPanel
            moderationId={row.id}
            currentStatus={row.status}
            confidence={row.auto_confidence}
            categories={row.auto_categories}
            reasons={row.auto_reasons}
            reviewerNotes={row.reviewer_notes}
          />
        </section>

        {row.reviewed_at && (
          <p className="mt-6 text-xs text-white/50">
            Last reviewed {fmtWhen(row.reviewed_at)} by{' '}
            {row.reviewer_user_id?.slice(0, 8) ?? 'unknown'}.
          </p>
        )}
      </section>
    </main>
  );
}
