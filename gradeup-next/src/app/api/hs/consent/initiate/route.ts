/**
 * POST /api/hs/consent/initiate
 *
 * Authenticated athlete endpoint. Generates a signing token for a parent and
 * persists a pending-consent row. The parent is expected to receive an email
 * (TODO: Resend) with a link to /hs/consent/[token] to complete the signing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import { initiateConsent, initiateConsentSchema } from '@/lib/services/hs-nil/consent';

export async function POST(request: NextRequest) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

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

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = validateInput(initiateConsentSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationError(validation.errors) },
        { status: 400 }
      );
    }

    const result = await initiateConsent({
      athleteUserId: user.id,
      ...validation.data,
    });

    return NextResponse.json(
      {
        ok: true,
        expiresAt: result.expiresAt.toISOString(),
        // NOTE: we intentionally do NOT return the token to the athlete. The
        // token is delivered to the parent via email. Returning it here would
        // let an athlete self-sign their own consent from the client.
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
