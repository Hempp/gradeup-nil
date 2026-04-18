/**
 * POST /api/hs/athlete/links/[linkId]/remove
 *
 * Athlete removes one of their parent-athlete links. Handles BOTH:
 *   - Pending-decline (verified_at IS NULL) — equivalent to the sibling
 *     /decline route. Included here so the client can use a single
 *     endpoint when it doesn't care to distinguish.
 *   - Verified-unlink  (verified_at IS NOT NULL) — cuts forward-looking
 *     authority. The parent can no longer approve NEW deals for this
 *     athlete via this link. Existing signed parental consents remain
 *     legally binding for the deals they already cover (consent rows
 *     are independent of the link row; we never cascade).
 *
 * Both paths collapse to a DELETE on hs_parent_athlete_links because
 * migration 20260418_005 ships no `declined_at` / `unlinked_at` column.
 * Absence IS the state. The two are distinguished in ops audit by the
 * logged `action` field ('declined_pending' vs 'unlinked_verified').
 *
 * Authorization mirrors /verify and /decline.
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

    const wasVerified = Boolean(link.verified_at);

    const { declineLink, unlinkParent } = await import(
      '@/lib/services/hs-nil/athlete-links'
    );

    // Same row-deletion either way; the two service functions exist to
    // keep call sites semantically labelled rather than to branch
    // behaviour at the DB layer.
    const deleted = wasVerified
      ? await unlinkParent(linkId, user.id)
      : await declineLink(linkId, user.id);

    // eslint-disable-next-line no-console
    console.log(
      `[hs-nil link] ${wasVerified ? 'unlinked_verified' : 'declined_pending'}`,
      {
        linkId,
        athleteUserId: user.id,
        parentProfileId: link.parent_profile_id,
        wasVerified,
        rowDeleted: deleted,
      }
    );

    return NextResponse.json({
      ok: true,
      action: wasVerified ? 'unlinked' : 'declined',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
