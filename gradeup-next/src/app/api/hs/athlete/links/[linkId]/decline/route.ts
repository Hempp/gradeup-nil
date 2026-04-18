/**
 * POST /api/hs/athlete/links/[linkId]/decline
 *
 * Athlete declines a PENDING parent-athlete link (verified_at IS NULL).
 *
 * Product semantics (spec from LINK-VERIFIER scope):
 *   - A decline is distinct from an unlink. Decline happens BEFORE any
 *     authority was granted — no consent has been signed, no deal has
 *     used this link. Remove the row and do NOT notify the parent; a
 *     bad-faith claimer should see the link simply never complete, not
 *     a confirmation they got the wrong athlete.
 *   - For after-the-fact unlinking of a verified link, use the sibling
 *     /api/hs/athlete/links/[linkId]/remove route, which handles both
 *     pending-decline and verified-unlink behind one endpoint with a
 *     different audit-log wording.
 *
 * This route is deliberately pending-only so the UI can't accidentally
 * revoke a verified link through the "decline" code path — if the row
 * is already verified, we return 409 and point the caller at /remove.
 *
 * Authorization mirrors the verify route: HS_NIL flag, authenticated
 * session, mutation rate-limit, defensive ownership check on top of RLS.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';

interface RouteContext {
  params: Promise<{ linkId: string }>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, context: RouteContext) {
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

    const { linkId } = await context.params;
    if (!UUID_RE.test(linkId)) {
      return NextResponse.json({ error: 'Invalid link id.' }, { status: 400 });
    }

    const { data: link, error: fetchErr } = await supabase
      .from('hs_parent_athlete_links')
      .select('id, athlete_user_id, verified_at, parent_profile_id')
      .eq('id', linkId)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json(
        { error: 'Could not look up link.' },
        { status: 500 }
      );
    }

    if (!link || link.athlete_user_id !== user.id) {
      return NextResponse.json({ error: 'Link not found.' }, { status: 404 });
    }

    if (link.verified_at) {
      return NextResponse.json(
        {
          error:
            'This link is already verified. Use the remove endpoint to unlink a verified parent.',
          code: 'already_verified',
        },
        { status: 409 }
      );
    }

    const { declineLink } = await import(
      '@/lib/services/hs-nil/athlete-links'
    );

    const deleted = await declineLink(linkId, user.id);

    // Audit log. Action label 'declined_pending' distinguishes this
    // from 'unlinked_verified' so ops can separate the two even though
    // both end states are identical (row absent).
    // eslint-disable-next-line no-console
    console.log('[hs-nil link] declined_pending', {
      linkId,
      athleteUserId: user.id,
      parentProfileId: link.parent_profile_id,
      rowDeleted: deleted,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
