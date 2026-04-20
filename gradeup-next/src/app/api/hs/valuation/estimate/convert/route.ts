/**
 * POST /api/hs/valuation/estimate/convert
 *
 * Fire-and-forget attribution endpoint. Called by the post-result CTA
 * after a successful waitlist signup to mark the corresponding
 * valuation_requests row as converted.
 *
 * Not rate-limited as aggressively as /estimate because this is a
 * narrow update — but still rate-limited against abuse.
 *
 * Best-effort semantics: the waitlist signup is always the source of
 * truth. A failure here drops an attribution breadcrumb on the floor
 * but never breaks the user flow.
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enforceRateLimit } from '@/lib/rate-limit';
import { markValuationConverted } from '@/lib/hs-nil/valuation';
import { validateInput, formatValidationError } from '@/lib/validations';

const convertSchema = z.object({
  valuationRequestId: z.string().uuid(),
  waitlistId: z.string().uuid().nullable().optional(),
});

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimit(req, 'mutation', null);
    if (limited) return limited;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = validateInput(convertSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationError(validation.errors) },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();
    if (!supabase) {
      // No service client in this environment → silently accept (the
      // waitlist row is what matters; this is attribution-only).
      return NextResponse.json({ ok: true, logged: false });
    }

    await markValuationConverted(
      supabase,
      validation.data.valuationRequestId,
      validation.data.waitlistId ?? null
    );

    return NextResponse.json({ ok: true, logged: true });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
