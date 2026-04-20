/**
 * /hs/brand/campaigns/[id] — campaign detail + participants +
 * performance aggregate.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CampaignParticipantRow from '@/components/hs/CampaignParticipantRow';
import { CampaignPerformanceCard } from '@/components/hs/CampaignPerformanceCard';
import CampaignLifecycleButton from '@/components/hs/CampaignLifecycleButton';
import { getCampaignPerformance } from '@/lib/hs-nil/campaigns';

export const metadata: Metadata = {
  title: 'Campaign detail — GradeUp HS',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface BrandRow {
  id: string;
  company_name: string;
  is_hs_enabled: boolean | null;
}

interface CampaignRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  deal_category: string;
  compensation_type: string;
  base_compensation_cents: number;
  max_athletes: number;
  target_states: string[] | null;
  athlete_selection: string;
  timeline_start: string | null;
  timeline_end: string | null;
  deliverables_template: string | null;
}

interface ParticipantRow {
  id: string;
  athlete_id: string;
  athlete_user_id: string;
  status: string;
  applied_at: string;
  accepted_at: string | null;
  individual_deal_id: string | null;
}

export default async function HSBrandCampaignDetailPage({
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
    redirect(`/login?next=/hs/brand/campaigns/${id}`);
  }

  const { data: brandData } = await supabase
    .from('brands')
    .select('id, company_name, is_hs_enabled')
    .eq('profile_id', user.id)
    .maybeSingle();
  const brand = (brandData as BrandRow | null) ?? null;
  if (!brand) {
    redirect('/hs/signup/brand?notice=convert');
  }
  if (brand.is_hs_enabled !== true) {
    redirect('/brand/dashboard');
  }

  const { data: campData } = await supabase
    .from('hs_brand_campaigns')
    .select(
      'id, title, description, status, deal_category, compensation_type, base_compensation_cents, max_athletes, target_states, athlete_selection, timeline_start, timeline_end, deliverables_template',
    )
    .eq('id', id)
    .eq('brand_id', brand.id)
    .maybeSingle();
  const campaign = (campData as CampaignRow | null) ?? null;
  if (!campaign) {
    redirect('/hs/brand/campaigns');
  }

  const { data: partData } = await supabase
    .from('campaign_participations')
    .select(
      'id, athlete_id, athlete_user_id, status, applied_at, accepted_at, individual_deal_id',
    )
    .eq('campaign_id', id)
    .order('applied_at', { ascending: false });
  const participants = (partData ?? []) as ParticipantRow[];

  const ids = participants.map((p) => p.athlete_id);
  let nameByAthleteId = new Map<string, string>();
  if (ids.length > 0) {
    const { data: athleteRows } = await supabase
      .from('athletes')
      .select('id, first_name, last_name')
      .in('id', ids);
    nameByAthleteId = new Map(
      ((athleteRows ?? []) as Array<{
        id: string;
        first_name: string | null;
        last_name: string | null;
      }>).map((a) => [
        a.id,
        [a.first_name, a.last_name].filter(Boolean).join(' ') || 'Athlete',
      ]),
    );
  }

  const performance = await getCampaignPerformance(id).catch(() => null);

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-24">
        <Link
          href="/hs/brand/campaigns"
          className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
        >
          ← All campaigns
        </Link>
        <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          {campaign.status}
        </p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl">
          {campaign.title}
        </h1>
        {campaign.description && (
          <p className="mt-3 max-w-3xl text-sm text-white/70">
            {campaign.description}
          </p>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetaTile
            label="Category"
            value={campaign.deal_category.replace(/_/g, ' ')}
          />
          <MetaTile
            label="Base comp"
            value={`$${(campaign.base_compensation_cents / 100).toLocaleString()}`}
          />
          <MetaTile
            label="Max athletes"
            value={campaign.max_athletes.toString()}
          />
          <MetaTile
            label="States"
            value={(campaign.target_states ?? []).join(', ') || '—'}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {campaign.status === 'draft' && (
            <CampaignLifecycleButton
              action="open"
              campaignId={id}
              label="Open campaign"
            />
          )}
          {campaign.status === 'open' && (
            <CampaignLifecycleButton
              action="close"
              campaignId={id}
              label="Close campaign"
            />
          )}
        </div>

        {performance && (
          <div className="mt-10">
            <CampaignPerformanceCard
              participantCount={performance.participantCount}
              completedCount={performance.completedCount}
              activeCount={performance.activeCount}
              totalShares={performance.totalShares}
              totalCompensationCents={performance.totalCompensationCents}
            />
          </div>
        )}

        <section aria-labelledby="participants-heading" className="mt-10">
          <h2
            id="participants-heading"
            className="font-display text-2xl md:text-3xl"
          >
            Participants
          </h2>
          {participants.length === 0 ? (
            <p className="mt-4 text-sm text-white/60">No applicants yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {participants.map((p) => (
                <CampaignParticipantRow
                  key={p.id}
                  campaignId={id}
                  participationId={p.id}
                  athleteDisplay={
                    nameByAthleteId.get(p.athlete_id) ?? 'Athlete'
                  }
                  status={p.status}
                  appliedAt={p.applied_at}
                  acceptedAt={p.accepted_at}
                  individualDealId={p.individual_deal_id}
                />
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}

function MetaTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
        {label}
      </p>
      <p className="mt-1 text-sm text-white">{value}</p>
    </div>
  );
}
