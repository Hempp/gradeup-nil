/**
 * /api/hs/brand/campaigns
 *
 * POST — create a draft campaign.
 * GET  — list the signed-in brand's campaigns.
 *
 * Feature-flag gated. HS-enabled brands only. Rate-limited with the
 * shared 'mutation' bucket on POST.
 *
 * State-rule pre-evaluation at creation happens inside
 * createCampaign() against the MOST RESTRICTIVE pilot state among the
 * submitted target_states. If any state would block the category for a
 * hypothetical 15-year-old applicant, creation is rejected with
 * { code: 'state_rule_violation', violations: [...] }.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import {
  createCampaign,
  type CampaignAthleteSelection,
  type CampaignCompensationType,
  type CampaignDealCategory,
} from '@/lib/hs-nil/campaigns';
import type { USPSStateCode } from '@/lib/hs-nil/state-rules';

const createSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  deal_category: z.enum([
    'apparel',
    'food_beverage',
    'local_business',
    'training',
    'autograph',
    'social_media_promo',
  ]),
  compensation_type: z.enum([
    'fixed_per_deliverable',
    'per_conversion',
    'tiered',
  ]),
  base_compensation_cents: z.number().int().min(0).max(100_000_000),
  max_athletes: z.number().int().min(1).max(500),
  target_states: z.array(z.string().length(2)).min(1).max(51),
  athlete_selection: z.enum(['open_to_apply', 'invited_only', 'hybrid']),
  deliverables_template: z.string().trim().max(5000).optional().nullable(),
  timeline_start: z.string().optional().nullable(),
  timeline_end: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  if (!isFeatureEnabled('HS_NIL')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
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
    .select('id, profile_id, is_hs_enabled')
    .eq('profile_id', user.id)
    .maybeSingle<{ id: string; profile_id: string; is_hs_enabled: boolean }>();
  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 403 });
  }
  if (brand.is_hs_enabled !== true) {
    return NextResponse.json(
      { error: 'Brand not HS-enabled' },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join('; ') },
      { status: 400 },
    );
  }
  const p = parsed.data;

  const result = await createCampaign({
    brandId: brand.id,
    fields: {
      title: p.title,
      description: p.description ?? null,
      dealCategory: p.deal_category as CampaignDealCategory,
      compensationType: p.compensation_type as CampaignCompensationType,
      baseCompensationCents: p.base_compensation_cents,
      maxAthletes: p.max_athletes,
      targetStates: p.target_states as USPSStateCode[],
      athleteSelection: p.athlete_selection as CampaignAthleteSelection,
      deliverablesTemplate: p.deliverables_template ?? null,
      timelineStart: p.timeline_start ?? null,
      timelineEnd: p.timeline_end ?? null,
    },
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.code, violations: result.violations },
      { status: result.code === 'state_rule_violation' ? 422 : 400 },
    );
  }
  return NextResponse.json(
    { campaign: result.campaign },
    { status: 201 },
  );
}

export async function GET(request: NextRequest) {
  if (!isFeatureEnabled('HS_NIL')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
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

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let query = supabase
    .from('hs_brand_campaigns')
    .select('*')
    .eq('brand_id', brand.id)
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ campaigns: data ?? [] });
}
