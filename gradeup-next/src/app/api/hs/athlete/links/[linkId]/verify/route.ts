/**
 * POST /api/hs/athlete/links/[linkId]/verify
 *
 * Athlete confirms a pending hs_parent_athlete_links row. This is the
 * athlete's half of the symmetric-trust contract — the parent created
 * the pending row at signup via `/api/hs/parent/link-athlete`, and
 * until this route runs, the link is not "valid" (parent has no
 * consent / deal authority because every downstream check looks for
 * `verified_at IS NOT NULL`).
 *
 * Authorization model:
 *   - Feature-flag gated (FEATURE_HS_NIL). Unknown route when disabled.
 *   - Authenticated SSR session (no service role on ingress).
 *   - Mutation rate limiter (30/min/user) via the shared bucket.
 *   - Defensive ownership check: the link's `athlete_user_id` must
 *     equal the caller's `auth.uid()`, on top of the SELECT RLS that
 *     already hides other athletes' links from the fetch.
 *
 * Idempotency: we 409 when `verified_at IS NOT NULL` rather than
 * silently no-opping, because a verify call against an already-
 * verified row almost always indicates a stale UI the client should
 * refresh. Decline-then-re-request should go through a fresh pending
 * row, not re-verifying.
 *
 * Side effect: best-effort parent notification. We fire
 * `sendParentLinkConfirmed` after the DB write commits and never let
 * its failure bubble up — the link IS verified whether or not Resend
 * is configured.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
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

    // Ownership check rides on the SELECT RLS (athlete-read policy). If
    // the row belongs to a different athlete we get no rows — emit a
    // uniform 404 so the route never distinguishes "missing" from
    // "not yours" to an attacker probing IDs.
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
        { error: 'This link is already verified.', code: 'already_verified' },
        { status: 409 }
      );
    }

    // Delegate to the service-layer mutation. The settings page is the
    // canonical entry point today, so we label the verification as
    // 'email_invite_click' per the product contract (the eventual
    // tokenised invite link will flow through this same route, which
    // is why 'email_invite_click' is the right value even when the
    // click happens from the settings-page UI).
    const { verifyLink, sendParentLinkConfirmed } = await Promise.all([
      import('@/lib/services/hs-nil/athlete-links'),
      import('@/lib/services/hs-nil/emails'),
    ]).then(([a, b]) => ({
      verifyLink: a.verifyLink,
      sendParentLinkConfirmed: b.sendParentLinkConfirmed,
    }));

    const result = await verifyLink(linkId, user.id, 'email_invite_click');

    // Audit log — distinct from decline/unlink so ops can grep by action.
    // eslint-disable-next-line no-console
    console.log('[hs-nil link] verified', {
      linkId: result.linkId,
      athleteUserId: user.id,
      parentProfileId: link.parent_profile_id,
      verificationMethod: result.verificationMethod,
    });

    // Best-effort parent email notification. Look up the parent's
    // current email via service role (auth.users is not browser-
    // readable) and fire-and-forget the send.
    void (async () => {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key || !result.parentUserId) return;

        const service = createServiceClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: parentUser } =
          await service.auth.admin.getUserById(result.parentUserId);
        const parentEmail = parentUser?.user?.email;
        if (!parentEmail) return;

        // Athlete display name for the subject line. Prefer the
        // auth metadata `first_name`; fall back to "your athlete".
        const meta = (user.user_metadata ?? {}) as { first_name?: string };
        const athleteName = meta.first_name?.trim() || 'your athlete';

        await sendParentLinkConfirmed({
          parentEmail,
          parentFullName: result.parentFullName,
          athleteName,
        });
      } catch (notifyErr) {
        // eslint-disable-next-line no-console
        console.warn(
          '[hs-nil link] parent-confirmed notification failed',
          notifyErr instanceof Error ? notifyErr.message : notifyErr
        );
      }
    })();

    return NextResponse.json({ ok: true, linkId: result.linkId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
