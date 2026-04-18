/**
 * POST /api/hs/deals/[id]/share-templates
 *
 * Upserts a brand-authored share template for one platform. Used by the
 * BrandDealCreateForm to persist per-deal share copy at deal-creation time
 * (and later, via an edit flow not yet in scope for this pass).
 *
 * Auth: brand owner of the deal only. RLS on deal_share_templates
 * already enforces this, but we gate at the route layer too so we
 * return a clean 403 (not an RLS-swallowed 204/empty insert).
 *
 * Rate limit: mutation bucket.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { enforceRateLimit } from '@/lib/rate-limit';

const bodySchema = z.object({
  platform: z.enum(['instagram', 'linkedin', 'x', 'tiktok', 'generic']),
  copy_template: z.string().min(1).max(4000),
  hashtags: z.array(z.string().min(1).max(60)).max(20).nullish(),
});

interface DealOwnerRow {
  id: string;
  brand: { profile_id: string } | { profile_id: string }[] | null;
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

    const { data: deal } = await supabase
      .from('deals')
      .select('id, brand:brands(profile_id)')
      .eq('id', dealId)
      .maybeSingle<DealOwnerRow>();

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const brand = Array.isArray(deal.brand) ? deal.brand[0] : deal.brand;
    if (!brand || brand.profile_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Upsert via onConflict unique(deal_id, platform). We hand-roll it with a
    // delete+insert to keep the path schema-portable; the unique constraint
    // on (deal_id, platform) already exists, so on-conflict-update would be
    // the ideal shape but supabase-js requires the full upsert config.
    await supabase
      .from('deal_share_templates')
      .delete()
      .eq('deal_id', dealId)
      .eq('platform', parsed.data.platform);

    const { data: inserted, error: insertError } = await supabase
      .from('deal_share_templates')
      .insert({
        deal_id: dealId,
        platform: parsed.data.platform,
        copy_template: parsed.data.copy_template,
        hashtags: parsed.data.hashtags ?? null,
      })
      .select('id')
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { ok: true, id: (inserted as { id: string }).id },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
