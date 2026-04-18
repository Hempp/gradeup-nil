/**
 * GET  /api/hs/consent/[token] — fetch consent details for the signing UI.
 * POST /api/hs/consent/[token] — submit the parent's signature.
 *
 * Both are unauthenticated (parent lands via email link). Protection comes
 * from the token's unguessable entropy + server-side TTL + single-use
 * consumption.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import {
  getConsentForSigning,
  signConsent,
  signConsentSchema,
} from '@/lib/services/hs-nil/consent';

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  if (!isFeatureEnabled('HS_NIL')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { token } = await context.params;
  const result = await getConsentForSigning(token);

  if (!result.valid) {
    return NextResponse.json(
      { ok: false, error: 'This consent link is invalid or has expired.' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    parentEmail: result.parentEmail,
    parentFullName: result.parentFullName ?? null,
    scope: result.scope,
    expiresAt: result.expiresAt?.toISOString() ?? null,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Rate-limited by IP (parent is unauthenticated).
    const rateLimited = await enforceRateLimit(request, 'mutation', null);
    if (rateLimited) return rateLimited;

    const { token } = await context.params;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = validateInput(signConsentSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationError(validation.errors) },
        { status: 400 }
      );
    }

    // Only e-signature is live for v1; UI also enforces this, but the server
    // is the source of truth.
    if (validation.data.signatureMethod !== 'e_signature') {
      return NextResponse.json(
        { error: 'Only e-signature is supported at this time.' },
        { status: 400 }
      );
    }

    const { consentId } = await signConsent(token, validation.data);

    return NextResponse.json({ ok: true, consentId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    // Token / identity failures surface as 400 rather than 500.
    const isClientError =
      error instanceof Error &&
      /invalid|expired|already|identity/i.test(error.message);
    return NextResponse.json({ error: message }, { status: isClientError ? 400 : 500 });
  }
}
