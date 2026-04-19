/**
 * GET /api/hs/referrals/leaderboard
 *
 * Admin-only. Returns the top N referrers by converted signups.
 * Non-admins get 404 (existence-hiding — don't advertise the route).
 *
 * Query params:
 *   ?limit=10   default 10, hard max 50.
 *   ?mask=true  if set, last names are masked ("Maya C." instead of
 *               "Maya Chen"). Used by the parent-facing leaderboard
 *               component so it can hit this route with the service
 *               role OFF and still show a public-safe roster.
 *
 * Note: the parent-facing /hs/parent/referrals page renders the
 * leaderboard server-side via getLeaderboard() directly — it doesn't
 * call this route. The route exists for the admin dashboard + any
 * future CSR widget.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { getLeaderboard, maskLastName } from '@/lib/hs-nil/referrals';

export async function GET(request: NextRequest) {
  if (!isFeatureEnabled('HS_NIL')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Admin gate — mirrors /hs/admin route pattern.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get('limit') ?? '10');
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 10, 1), 50);
  const mask = url.searchParams.get('mask') === 'true';

  try {
    const entries = await getLeaderboard(limit);
    const payload = entries.map((e) => ({
      referringUserId: e.referringUserId,
      displayName: mask
        ? maskLastName(e.firstName, e.lastName)
        : [e.firstName, e.lastName].filter(Boolean).join(' ').trim() ||
          'Unknown',
      signupsCompleted: e.signupsCompleted,
      totalClicks: e.totalClicks,
    }));
    return NextResponse.json({ entries: payload, limit, masked: mask });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Leaderboard failed';
    // eslint-disable-next-line no-console
    console.warn('[hs-referrals-leaderboard] failure', { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
