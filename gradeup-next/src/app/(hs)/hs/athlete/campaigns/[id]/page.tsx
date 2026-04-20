/**
 * /hs/athlete/campaigns/[id] — campaign detail for the athlete.
 *
 * The apply CTA lives in a Client Component (CampaignApplyPanel)
 * that handles consent-gap redirects. Everything else is SSR.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CampaignApplyPanel from '@/components/hs/CampaignApplyPanel';
import {
  checkConsentScope,
  computeDurationMonths,
} from '@/lib/hs-nil/deal-validation';

export const metadata: Metadata = {
  title: 'Campaign — GradeUp HS',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface CampaignRow {
  id: string;
  brand_id: string;
  title: string;
  description: string | null;
  status: string;
  deal_category: string;
  base_compensation_cents: number;
  target_states: string[] | null;
  athlete_selection: string;
  timeline_start: string | null;
  timeline_end: string | null;
  deliverables_template: string | null;
}

export default async function HSAthleteCampaignDetailPage({
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
    redirect(`/login?next=/hs/athlete/campaigns/${id}`);
  }

  const { data: profile } = await supabase
    .from('hs_athlete_profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile) {
    redirect('/hs/signup/athlete?notice=convert');
  }

  const { data: campData } = await supabase
    .from('hs_brand_campaigns')
    .select(
      'id, brand_id, title, description, status, deal_category, base_compensation_cents, target_states, athlete_selection, timeline_start, timeline_end, deliverables_template',
    )
    .eq('id', id)
    .maybeSingle();
  const campaign = (campData as CampaignRow | null) ?? null;

  if (!campaign || campaign.status !== 'open') {
    redirect('/hs/athlete/campaigns');
  }

  // Already applied?
  const { data: existing } = await supabase
    .from('campaign_participations')
    .select('id, status')
    .eq('campaign_id', id)
    .eq('athlete_user_id', user.id)
    .maybeSingle();
  const alreadyApplied = Boolean(existing);

  // Consent coverage.
  const durationMonths = computeDurationMonths(
    campaign.timeline_start,
    campaign.timeline_end,
  );
  const consent = await checkConsentScope({
    athleteUserId: user.id,
    category: campaign.deal_category,
    amount: campaign.base_compensation_cents / 100,
    durationMonths,
    supabase,
  });

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-24">
        <Link
          href="/hs/athlete/campaigns"
          className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
        >
          ← All campaigns
        </Link>
        <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          {campaign.deal_category.replace(/_/g, ' ')}
        </p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl">
          {campaign.title}
        </h1>
        {campaign.description && (
          <p className="mt-3 text-sm text-white/70">{campaign.description}</p>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Meta label="Base comp" value={`$${(campaign.base_compensation_cents / 100).toLocaleString()}`} />
          <Meta label="States" value={(campaign.target_states ?? []).join(', ') || '—'} />
          <Meta
            label="Window"
            value={
              campaign.timeline_start && campaign.timeline_end
                ? `${campaign.timeline_start} → ${campaign.timeline_end}`
                : '—'
            }
          />
        </div>

        {campaign.deliverables_template && (
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="font-display text-xl text-white/80">Deliverables</h2>
            <pre className="mt-3 whitespace-pre-wrap text-sm text-white/80">
              {campaign.deliverables_template}
            </pre>
          </section>
        )}

        <div className="mt-8">
          <CampaignApplyPanel
            campaignId={id}
            initialCovered={consent.covered}
            alreadyApplied={alreadyApplied}
          />
        </div>
      </section>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
        {label}
      </p>
      <p className="mt-1 text-sm text-white">{value}</p>
    </div>
  );
}
