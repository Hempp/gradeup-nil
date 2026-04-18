/**
 * POST /api/hs/admin/actions/consent-renew
 *
 * Admin action: send a renewal-nudge email to the parent on record. Body:
 *   { consentId: uuid }
 *
 * Does NOT mutate the consent row — parents must act via the existing
 * /hs/consent/request?renew=<id> surface. The audit log captures the
 * attempt (including delivery success/failure) regardless of email outcome.
 *
 * Auth: admin only. Feature-flag gated. Rate-limited.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import { sendConsentRenewalNudge } from '@/lib/hs-nil/admin-actions';

const schema = z
  .object({
    consentId: z.string().uuid(),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return rateLimited;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const v = validateInput(schema, body);
    if (!v.success) {
      return NextResponse.json(
        { error: formatValidationError(v.errors), code: 'invalid_body' },
        { status: 400 }
      );
    }

    const result = await sendConsentRenewalNudge(v.data.consentId, user.id);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.code === 'not_found' ? 404 : 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      auditLogId: result.auditLogId,
      metadata: result.metadata ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-admin/consent-renew]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
