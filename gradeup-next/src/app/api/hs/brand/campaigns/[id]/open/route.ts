/**
 * POST /api/hs/brand/campaigns/[id]/open
 *
 * Flip a draft → open campaign and fire the candidate fan-out emails.
 * Only the owning brand may open. Rate-limited with 'mutation' bucket.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { openCampaign } from '@/lib/hs-nil/campaigns';

export async function POST(
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

  const result = await openCampaign({ brandId: brand.id, campaignId: id });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? 'Could not open campaign.' },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}
