/**
 * GET /api/hs/athlete/campaigns/available
 *
 * Athlete browse endpoint. Returns the open campaigns that target the
 * athlete's state, annotated with invitation status and per-campaign
 * consent coverage so the UI can render the right CTA on each card.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { listOpenCampaignsForAthlete } from '@/lib/hs-nil/campaigns';

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

  const { searchParams } = new URL(request.url);
  const all = searchParams.get('all') === '1';
  const limit = Math.min(
    Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)),
    200,
  );

  const rows = await listOpenCampaignsForAthlete(user.id, {
    restrictByState: !all,
    limit,
  });
  return NextResponse.json({ campaigns: rows });
}
