/**
 * /api/hs/brand/campaign-templates/[slug]/clone
 *
 * POST — authenticated brand clones a published template.
 *
 * Returns a CampaignTemplateClone payload the brand-side UI feeds into
 * CampaignCreateForm as initialTemplate. Does NOT create the campaign —
 * the brand still has to submit the pre-filled form so createCampaign()
 * can run its state-rule pre-eval and consent-scope mapping.
 *
 * Side effect: logs a campaign_template_uses row. The clone-to-convert
 * funnel is the point of the log.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { cloneTemplate } from '@/lib/hs-nil/campaign-templates';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  if (!isFeatureEnabled('HS_NIL')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const { slug } = await context.params;
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
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
    .maybeSingle<{ id: string; profile_id: string; is_hs_enabled: boolean | null }>();
  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 403 });
  }
  if (brand.is_hs_enabled !== true) {
    return NextResponse.json(
      { error: 'Brand not HS-enabled' },
      { status: 403 },
    );
  }

  const result = await cloneTemplate({
    templateSlug: slug,
    brandId: brand.id,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      template: {
        id: result.template.id,
        slug: result.template.slug,
        title: result.template.title,
        category: result.template.category,
        dealCategory: result.template.dealCategory,
      },
      clone: result.clone,
    },
    { status: 200 },
  );
}
