/**
 * POST /api/hs/deals/[id]/share-event
 *
 * Records a share-intent click. Called by ShareButtonStack and ShareCopyCard
 * BEFORE the share window opens — if this call fails, the UI still proceeds
 * with the share. Analytics must never block the viral action.
 *
 * Auth: athlete or linked parent on the deal. Service-role bypasses RLS but
 * does not hit this route.
 *
 * Deal guard: only `fully_signed` deals may register share events. A share
 * event on a non-signed deal is an obvious bug or a replay — reject 409.
 *
 * Rate limit: mutation bucket (30 / minute / user). Parents will hit this a
 * few times per deal; 30/min is generous but caps abuse.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { enforceRateLimit } from '@/lib/rate-limit';
import { recordShareEvent } from '@/lib/hs-nil/share';
import type { EventPlatform, UserRole } from '@/lib/hs-nil/share';

const bodySchema = z.object({
  platform: z.enum(['instagram', 'linkedin', 'x', 'tiktok', 'copy_link']),
  templateId: z.string().uuid().nullish(),
});

interface DealRow {
  id: string;
  status: string;
  athlete: { profile_id: string } | null;
}

async function resolveUserRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  deal: DealRow,
): Promise<UserRole | null> {
  // Athlete on the deal?
  if (deal.athlete?.profile_id === userId) {
    return 'athlete';
  }
  // Linked (verified) parent on the athlete?
  if (!deal.athlete?.profile_id) return null;

  const { data: link } = await supabase
    .from('hs_parent_athlete_links')
    .select('id, parent_profile_id, verified_at, hs_parent_profiles!inner(user_id)')
    .eq('athlete_user_id', deal.athlete.profile_id)
    .not('verified_at', 'is', null)
    .maybeSingle();

  if (!link) return null;
  const joined = link as unknown as {
    hs_parent_profiles: { user_id: string } | { user_id: string }[];
  };
  const parentUser = Array.isArray(joined.hs_parent_profiles)
    ? joined.hs_parent_profiles[0]
    : joined.hs_parent_profiles;
  if (parentUser?.user_id === userId) return 'parent';
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: dealId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return rateLimited;

    const rawBody = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('id, status, athlete:athletes(profile_id)')
      .eq('id', dealId)
      .maybeSingle<DealRow>();

    if (dealError || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Contract-derived state. The deals.status column tracks the deal's
    // business phase (pending/accepted/active/completed), not the contract's
    // signing phase. We still want to gate on the contract being fully
    // signed — look up the contract by deal_id and check its status.
    const { data: contract } = await supabase
      .from('contracts')
      .select('status')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ status: string }>();

    if (!contract || contract.status !== 'fully_signed') {
      return NextResponse.json(
        { error: 'Deal is not fully signed yet.' },
        { status: 409 },
      );
    }

    const role = await resolveUserRole(supabase, user.id, deal);
    if (!role) {
      return NextResponse.json(
        { error: 'You do not have permission to share this deal.' },
        { status: 403 },
      );
    }

    const userAgent = request.headers.get('user-agent')?.slice(0, 500) ?? null;

    const result = await recordShareEvent(supabase, {
      dealId,
      userId: user.id,
      userRole: role,
      platform: parsed.data.platform as EventPlatform,
      templateId: parsed.data.templateId ?? null,
      userAgent,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.reason ?? 'Could not record share event.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, eventId: result.eventId }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
