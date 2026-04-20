/**
 * Brand Deal Detail — /hs/brand/deals/[id]
 *
 * Server Component. Renders the brand's view of a single HS deal with:
 *   - deal summary (title, brand copy, timeline, compensation)
 *   - athlete card (name / school / sport, resolved via the SECURITY
 *     DEFINER RPC when available, else a direct athletes+hs_profile read)
 *   - full list of deliverable submissions via DeliverableItemCard
 *     (shared component exported by DELIVERABLE-FORGE)
 *   - prior approval history (each revision_requested + approved row)
 *   - action panel (BrandReviewPanel) when status='in_review'
 *
 * Auth + scoping:
 *   - Route-group layout already flags-gates the surface.
 *   - Unauthenticated → /login?next=/hs/brand/deals/[id]
 *   - Authenticated but not the brand on this deal → notFound() (don't
 *     leak deal existence to random brands).
 *
 * Graceful degradation: any supplemental query (approvals, submissions,
 * linked parents) that fails is logged and its section degrades to an
 * empty state — the review action itself must always be reachable.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DeliverableItemCard } from '@/components/hs/DeliverableItemCard';
import type { DeliverableItemCardSubmission } from '@/components/hs/DeliverableItemCard';
import { BrandReviewPanel } from '@/components/hs/BrandReviewPanel';
import { ExportPdfButton } from '@/components/hs/ExportPdfButton';

export const metadata: Metadata = {
  title: 'Review deal — GradeUp HS brand',
  description: 'Review submitted deliverables and release payout.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─────────────────────────────────────────────────────────────────────────────
// Row shapes (local — narrow projections of what we query)
// ─────────────────────────────────────────────────────────────────────────────

interface DealRow {
  id: string;
  title: string;
  description: string | null;
  deliverables: string | null;
  status: string;
  compensation_amount: number;
  compensation_type: string;
  start_date: string | null;
  end_date: string | null;
  athlete_id: string;
  brand: {
    id: string;
    company_name: string;
    profile_id: string;
  } | null;
  athlete: {
    id: string;
    profile_id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface ApprovalRow {
  id: string;
  decision: 'approved' | 'revision_requested';
  notes: string | null;
  created_at: string;
}

interface HsAthleteSnapshotRow {
  state_code: string | null;
  school_name: string | null;
  sport: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'TBD';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'TBD';
  return d.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusPill(status: string) {
  const styles: Record<string, { tone: string; label: string }> = {
    in_review: {
      tone: 'border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]',
      label: 'Awaiting your review',
    },
    in_delivery: {
      tone: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
      label: 'Athlete is working on it',
    },
    approved: {
      tone: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
      label: 'Approved — payout releasing',
    },
    paid: {
      tone: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
      label: 'Paid',
    },
    revision_requested: {
      tone: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
      label: 'Revision requested',
    },
  };
  const meta = styles[status] ?? {
    tone: 'border-white/15 bg-white/5 text-white/70',
    label: status.replace(/_/g, ' '),
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${meta.tone}`}
    >
      {meta.label}
    </span>
  );
}

function parseDeliverables(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed))
      return parsed.filter((s): s is string => typeof s === 'string');
  } catch {
    /* not JSON */
  }
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function BrandDealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/hs/brand/deals/${id}`);
  }

  const { data: deal, error: dealErr } = await supabase
    .from('deals')
    .select(
      `id, title, description, deliverables, status, compensation_amount,
       compensation_type, start_date, end_date, athlete_id,
       brand:brands(id, company_name, profile_id),
       athlete:athletes(id, profile_id, first_name, last_name)`,
    )
    .eq('id', id)
    .maybeSingle<DealRow>();

  if (dealErr) {
    // eslint-disable-next-line no-console
    console.warn('[brand-deal-detail] deal fetch failed', dealErr.message);
  }

  if (!deal || !deal.brand || deal.brand.profile_id !== user.id) {
    // Either missing or not our brand — 404 either way so we don't leak.
    notFound();
  }

  // Athlete snapshot — state / school / sport. Best-effort.
  let snapshot: HsAthleteSnapshotRow | null = null;
  if (deal.athlete?.profile_id) {
    const { data: snap } = await supabase
      .from('hs_athlete_profiles')
      .select('state_code, school_name, sport')
      .eq('user_id', deal.athlete.profile_id)
      .maybeSingle<HsAthleteSnapshotRow>();
    snapshot = snap ?? null;
  }

  // Submissions. Best-effort — DELIVERABLE-FORGE's table may not be on
  // yet on some environments; degrade to empty list.
  let submissions: DeliverableItemCardSubmission[] = [];
  try {
    const { data, error } = await supabase
      .from('deal_deliverable_submissions')
      .select(
        'id, submission_type, content_url, storage_path, note, platform, status, review_notes, created_at',
      )
      .eq('deal_id', id)
      .order('created_at', { ascending: false });
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[brand-deal-detail] submissions fetch failed', error.message);
    } else {
      submissions = (data ?? []) as unknown as DeliverableItemCardSubmission[];
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[brand-deal-detail] submissions fetch threw', err);
  }

  // Prior approvals (review history).
  let approvals: ApprovalRow[] = [];
  try {
    const { data, error } = await supabase
      .from('deal_approvals')
      .select('id, decision, notes, created_at')
      .eq('deal_id', id)
      .order('created_at', { ascending: false });
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[brand-deal-detail] approvals fetch failed', error.message);
    } else {
      approvals = (data ?? []) as ApprovalRow[];
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[brand-deal-detail] approvals fetch threw', err);
  }

  const athleteName =
    [deal.athlete?.first_name, deal.athlete?.last_name]
      .filter(Boolean)
      .join(' ') || 'the athlete';

  const deliverableLines = parseDeliverables(deal.deliverables);
  const showReviewPanel = deal.status === 'in_review';

  // When a submission exists, pin the newest submitted one to the
  // approval row. Falls back to undefined → server handles.
  const pinSubmissionId =
    submissions.find((s) => s.status === 'submitted')?.id ?? null;

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-4xl px-6 pt-12 pb-4">
        <Link
          href="/hs/brand"
          className="inline-flex min-h-[44px] items-center text-sm text-white/70 hover:text-white"
        >
          ← Back to brand dashboard
        </Link>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
                Deal review
              </p>
              {statusPill(deal.status)}
            </div>
            <h1 className="mt-3 font-display text-4xl md:text-5xl">
              {deal.title}
            </h1>
            <p className="mt-3 text-sm text-white/70 md:text-base">
              With{' '}
              <span className="font-semibold text-white">{athleteName}</span>
              {snapshot?.school_name ? ` · ${snapshot.school_name}` : ''}
              {snapshot?.sport ? ` · ${snapshot.sport}` : ''}
              {snapshot?.state_code ? ` · ${snapshot.state_code}` : ''}
            </p>
          </div>
          {['paid', 'completed'].includes(deal.status) && (
            <ExportPdfButton
              href={`/api/hs/brand/deals/${deal.id}/export-pdf`}
              filename={`gradeup-deal-${deal.id.slice(0, 8)}.pdf`}
              label="Download deal report"
              variant="outline"
            />
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-4xl gap-6 px-6 pb-10 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Compensation
          </p>
          <p className="mt-2 font-display text-5xl text-white">
            {formatCurrency(deal.compensation_amount)}
          </p>
          <p className="mt-2 text-sm text-white/60">
            {deal.compensation_type.replace(/_/g, ' ')}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Timeline
          </p>
          <dl className="mt-2 space-y-1 text-sm text-white">
            <div className="flex justify-between gap-3">
              <dt className="text-white/60">Starts</dt>
              <dd className="font-medium">{formatDate(deal.start_date)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-white/60">Ends</dt>
              <dd className="font-medium">{formatDate(deal.end_date)}</dd>
            </div>
          </dl>
        </div>
      </section>

      {(deal.description || deliverableLines.length > 0) && (
        <section className="mx-auto max-w-4xl px-6 pb-10">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8">
            {deal.description && (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
                  Brief
                </p>
                <p className="mt-3 whitespace-pre-line text-sm text-white/80 md:text-base">
                  {deal.description}
                </p>
              </>
            )}
            {deliverableLines.length > 0 && (
              <div className={deal.description ? 'mt-6' : ''}>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
                  Deliverables
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/80">
                  {deliverableLines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-4xl px-6 pb-10">
        <h2 className="font-display text-2xl text-white md:text-3xl">
          Submissions
        </h2>
        {submissions.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
            {deal.status === 'in_delivery'
              ? `${athleteName} hasn${String.fromCharCode(0x2019)}t submitted anything yet. You${String.fromCharCode(0x2019)}ll get an email when they do.`
              : 'No submissions on this deal yet.'}
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {submissions.map((s) => (
              <li key={s.id}>
                <DeliverableItemCard submission={s} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {showReviewPanel && (
        <section className="mx-auto max-w-4xl px-6 pb-10">
          <BrandReviewPanel
            dealId={deal.id}
            athleteDisplayName={athleteName}
            submissionId={pinSubmissionId}
          />
        </section>
      )}

      {!showReviewPanel && (
        <section className="mx-auto max-w-4xl px-6 pb-10">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 md:p-8">
            {deal.status === 'approved' &&
              `You${String.fromCharCode(0x2019)}ve approved this deal. Payout is releasing to the custodian account.`}
            {deal.status === 'paid' && 'This deal is complete and fully paid.'}
            {deal.status === 'in_delivery' &&
              `Waiting on ${athleteName} to submit.`}
            {deal.status === 'revision_requested' &&
              `You asked for revisions. ${athleteName} will resubmit here.`}
            {![
              'approved',
              'paid',
              'in_delivery',
              'revision_requested',
            ].includes(deal.status) &&
              'This deal is not currently awaiting your review.'}
          </div>
        </section>
      )}

      {approvals.length > 0 && (
        <section className="mx-auto max-w-4xl px-6 pb-24">
          <h2 className="font-display text-2xl text-white md:text-3xl">
            Review history
          </h2>
          <ol className="mt-4 space-y-3">
            {approvals.map((a) => (
              <li
                key={a.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`text-xs font-semibold uppercase tracking-widest ${
                      a.decision === 'approved'
                        ? 'text-emerald-200'
                        : 'text-amber-200'
                    }`}
                  >
                    {a.decision === 'approved'
                      ? 'Approved'
                      : 'Revision requested'}
                  </span>
                  <span className="text-xs text-white/50">
                    {formatWhen(a.created_at)}
                  </span>
                </div>
                {a.notes && (
                  <p className="mt-2 whitespace-pre-line text-sm text-white/80">
                    {a.notes}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
