/**
 * Shortlist endpoints for HS brand.
 *
 *   POST   — add an athlete to the brand's shortlist (upsert). Also
 *            emits a saved_to_shortlist affinity signal.
 *   DELETE — remove an athlete from the brand's shortlist. Does NOT
 *            remove the underlying affinity signal.
 *   PATCH  — update notes on an existing shortlist row.
 *
 * Auth: same pattern as /api/hs/brand/match-feedback — authenticated
 * SSR user, brand row with is_hs_enabled=true, rate-limited mutation.
 * Athlete id is passed as a signed HMAC ref.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { verifyAthleteRef } from '@/lib/hs-nil/matching';
import {
  addToShortlist,
  removeFromShortlist,
  updateShortlistNotes,
} from '@/lib/hs-nil/match-feedback';

const postSchema = z.object({
  athleteRef: z.string().min(1),
  notes: z.string().trim().max(2000).optional(),
});

const deleteSchema = z.object({
  athleteRef: z.string().min(1),
});

const patchSchema = z.object({
  athleteRef: z.string().min(1),
  notes: z.string().trim().max(2000).nullable(),
});

async function resolveBrand(request: NextRequest) {
  if (!isFeatureEnabled('HS_NIL')) {
    return {
      error: NextResponse.json({ error: 'Not found' }, { status: 404 }),
    } as const;
  }
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    } as const;
  }

  const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
  if (rateLimited) return { error: rateLimited } as const;

  const { data: brand } = await supabase
    .from('brands')
    .select('id, is_hs_enabled')
    .eq('profile_id', user.id)
    .maybeSingle();
  if (!brand || brand.is_hs_enabled !== true) {
    return {
      error: NextResponse.json(
        { error: 'HS brand profile required' },
        { status: 403 }
      ),
    } as const;
  }

  return { brandId: brand.id as string } as const;
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveBrand(request);
    if ('error' in ctx) return ctx.error;

    const parsed = postSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const athleteId = verifyAthleteRef(parsed.data.athleteRef);
    if (!athleteId) {
      return NextResponse.json(
        { error: 'Invalid athlete reference' },
        { status: 400 }
      );
    }

    const row = await addToShortlist({
      brandId: ctx.brandId,
      athleteUserId: athleteId,
      notes: parsed.data.notes,
    });

    return NextResponse.json({ ok: true, row });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    // eslint-disable-next-line no-console
    console.error('[hs-brand-shortlist POST] failed', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await resolveBrand(request);
    if ('error' in ctx) return ctx.error;

    const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const athleteId = verifyAthleteRef(parsed.data.athleteRef);
    if (!athleteId) {
      return NextResponse.json(
        { error: 'Invalid athlete reference' },
        { status: 400 }
      );
    }

    const result = await removeFromShortlist(ctx.brandId, athleteId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    // eslint-disable-next-line no-console
    console.error('[hs-brand-shortlist DELETE] failed', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await resolveBrand(request);
    if ('error' in ctx) return ctx.error;

    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const athleteId = verifyAthleteRef(parsed.data.athleteRef);
    if (!athleteId) {
      return NextResponse.json(
        { error: 'Invalid athlete reference' },
        { status: 400 }
      );
    }

    const row = await updateShortlistNotes(
      ctx.brandId,
      athleteId,
      parsed.data.notes
    );
    if (!row) {
      return NextResponse.json(
        { error: 'Shortlist row not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, row });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    // eslint-disable-next-line no-console
    console.error('[hs-brand-shortlist PATCH] failed', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
