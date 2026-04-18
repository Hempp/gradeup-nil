/**
 * /hs/admin/disputes/[id] — Admin mediation detail page.
 *
 * Server Component, admin-gated. Loads the dispute + deal parties via the
 * service-role service (disputes table has no admin SELECT policy that
 * spans all deals, and even if it did we want the unified view that
 * joins in counterparties, deliverables, and approvals).
 *
 * Renders the DisputeResolutionPanel for the admin to mediate.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getDispute } from '@/lib/hs-nil/disputes';
import { DisputeResolutionPanel } from '@/components/hs/DisputeResolutionPanel';

export const metadata: Metadata = {
  title: 'Dispute mediation — GradeUp HS ops',
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

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface SupplementaryContext {
  deliverableSummary: string | null;
  approvalSummary: string | null;
}

async function loadSupplementaryContext(
  dealId: string
): Promise<SupplementaryContext> {
  const sb = getServiceRoleClient();
  const result: SupplementaryContext = {
    deliverableSummary: null,
    approvalSummary: null,
  };
  if (!sb) return result;

  try {
    const { data } = await sb
      .from('deal_deliverable_submissions')
      .select('id, status, note, created_at')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      const fields: string[] = [];
      if (data.status) fields.push(`status: ${String(data.status)}`);
      if (data.note)
        fields.push(
          `note: ${String(data.note).slice(0, 160)}${String(data.note).length > 160 ? '…' : ''}`
        );
      if (data.created_at)
        fields.push(`submitted: ${new Date(String(data.created_at)).toLocaleString()}`);
      result.deliverableSummary = fields.length ? fields.join(' · ') : null;
    }
  } catch {
    // Table may not exist yet (DELIVERABLE-FORGE runs in parallel) — swallow.
  }

  try {
    const { data } = await sb
      .from('deal_approvals')
      .select('id, decision, note, created_at')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      const fields: string[] = [];
      if (data.decision) fields.push(`decision: ${String(data.decision)}`);
      if (data.note)
        fields.push(
          `note: ${String(data.note).slice(0, 160)}${String(data.note).length > 160 ? '…' : ''}`
        );
      if (data.created_at)
        fields.push(`reviewed: ${new Date(String(data.created_at)).toLocaleString()}`);
      result.approvalSummary = fields.length ? fields.join(' · ') : null;
    }
  } catch {
    // Table may not exist yet (BRAND-REVIEW runs in parallel) — swallow.
  }

  return result;
}

export default async function AdminDisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOr404();
  const { id } = await params;

  const { dispute, parties } = await getDispute(id);
  if (!dispute || !parties) notFound();

  const athleteName =
    [parties.athleteFirstName, parties.athleteLastName]
      .filter((s): s is string => Boolean(s && s.trim()))
      .join(' ')
      .trim() || null;

  const supplemental = await loadSupplementaryContext(dispute.deal_id);

  const isResolved = !['open', 'under_review'].includes(dispute.status);

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-4xl px-6 pt-12 pb-6">
        <Link
          href="/hs/admin/disputes"
          className="inline-flex min-h-[44px] items-center text-sm text-white/70 hover:text-white"
        >
          ← Back to dispute queue
        </Link>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          HS-NIL · Mediation
        </p>
        <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
          Dispute <code className="text-xl text-white/60">{dispute.id.slice(0, 8)}</code>
        </h1>

        {isResolved ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
            <p className="text-sm text-white/80">
              This dispute is already resolved (<code>{dispute.status}</code>).
              Resolution summary:
            </p>
            {dispute.resolution_summary && (
              <p className="mt-3 whitespace-pre-wrap rounded-md bg-black/30 p-4 text-sm text-white/90">
                {dispute.resolution_summary}
              </p>
            )}
            {dispute.resolved_at && (
              <p className="mt-3 text-xs text-white/50">
                Resolved on {new Date(dispute.resolved_at).toLocaleString()}.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-8">
            <DisputeResolutionPanel
              disputeId={dispute.id}
              dealId={dispute.deal_id}
              dealTitle={parties.dealTitle}
              dealStatusBeforeDispute={dispute.deal_status_before_dispute}
              reasonCategory={dispute.reason_category}
              priority={dispute.priority}
              raisedByRole={dispute.raised_by_role}
              description={dispute.description}
              evidenceUrls={dispute.evidence_urls ?? []}
              athleteName={athleteName}
              brandName={parties.brandCompanyName}
              deliverableSummary={supplemental.deliverableSummary}
              approvalSummary={supplemental.approvalSummary}
            />
          </div>
        )}
      </section>
    </main>
  );
}
