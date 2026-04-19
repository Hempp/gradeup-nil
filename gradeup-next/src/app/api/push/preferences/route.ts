/**
 * /api/push/preferences
 *
 * GET  — returns the authenticated user's push_preferences row (all
 *        defaults = true if no row exists).
 * PATCH — updates any subset of the toggle columns. Upserts so the
 *         row always exists after the first write.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';

const DEFAULTS = {
  consent_requests: true,
  deal_review: true,
  deal_completed: true,
  referral_milestones: true,
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data } = await supabase
      .from('push_preferences')
      .select(
        'consent_requests, deal_review, deal_completed, referral_milestones, updated_at'
      )
      .eq('user_id', user.id)
      .maybeSingle();

    return NextResponse.json({
      preferences: data ?? { ...DEFAULTS, updated_at: null },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const patchSchema = z
  .object({
    consent_requests: z.boolean().optional(),
    deal_review: z.boolean().optional(),
    deal_completed: z.boolean().optional(),
    referral_milestones: z.boolean().optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one preference must be provided',
  });

export async function PATCH(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const v = validateInput(patchSchema, body);
    if (!v.success) {
      return NextResponse.json(
        { error: formatValidationError(v.errors) },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('push_preferences')
      .upsert(
        { user_id: user.id, ...v.data },
        { onConflict: 'user_id' }
      )
      .select(
        'consent_requests, deal_review, deal_completed, referral_milestones, updated_at'
      )
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error('[push/preferences] upsert failed', error);
      return NextResponse.json(
        { error: 'Could not update preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({ preferences: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
