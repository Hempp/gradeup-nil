/**
 * /api/hs/brand/campaigns/[id]
 *
 * GET    — campaign detail (plus performance + participant list).
 * PATCH  — update mutable fields (title/description/timeline/deliverables).
 * DELETE — cancel a draft campaign.
 *
 * Only the owning brand can read or mutate. Uses RLS-bound SSR client
 * for authorization — no service role here.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getCampaignPerformance } from '@/lib/hs-nil/campaigns';

const patchSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  deliverables_template: z.string().trim().max(5000).optional().nullable(),
  timeline_start: z.string().optional().nullable(),
  timeline_end: z.string().optional().nullable(),
  max_athletes: z.number().int().min(1).max(500).optional(),
});

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!isFeatureEnabled('HS_NIL')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('id, profile_id')
    .eq('profile_id', user.id)
    .maybeSingle<{ id: string; profile_id: string }>();
  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 403 });
  }

  const { data: campaign } = await supabase
    .from('hs_brand_campaigns')
    .select('*')
    .eq('id', id)
    .eq('brand_id', brand.id)
    .maybeSingle();
  if (!campaign) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: participants } = await supabase
    .from('campaign_participations')
    .select('id, athlete_id, athlete_user_id, status, applied_at, accepted_at, individual_deal_id')
    .eq('campaign_id', id)
    .order('applied_at', { ascending: false });

  const performance = await getCampaignPerformance(id).catch(() => null);

  return NextResponse.json({
    campaign,
    participants: participants ?? [],
    performance,
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!isFeatureEnabled('HS_NIL')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
  if (rateLimited) return rateLimited;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join('; ') },
      { status: 400 },
    );
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('id, profile_id')
    .eq('profile_id', user.id)
    .maybeSingle<{ id: string; profile_id: string }>();
  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('hs_brand_campaigns')
    .update(parsed.data)
    .eq('id', id)
    .eq('brand_id', brand.id)
    .select('*')
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ campaign: data });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!isFeatureEnabled('HS_NIL')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
  if (rateLimited) return rateLimited;

  const { data: brand } = await supabase
    .from('brands')
    .select('id, profile_id')
    .eq('profile_id', user.id)
    .maybeSingle<{ id: string; profile_id: string }>();
  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 403 });
  }

  // Only draft campaigns can be hard-deleted. Non-draft campaigns
  // flip to 'cancelled' to keep participant references intact.
  const { data: existing } = await supabase
    .from('hs_brand_campaigns')
    .select('id, status')
    .eq('id', id)
    .eq('brand_id', brand.id)
    .maybeSingle<{ id: string; status: string }>();
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (existing.status === 'draft') {
    const { error } = await supabase
      .from('hs_brand_campaigns')
      .delete()
      .eq('id', id)
      .eq('brand_id', brand.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, deleted: true });
  }
  const { error } = await supabase
    .from('hs_brand_campaigns')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('brand_id', brand.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, cancelled: true });
}
