/**
 * GET /api/director/invitation/[token]
 *
 * Unauthenticated invitation landing endpoint. Returns a safe projection of
 * the director_invitations row so the /director/invite/[token] accept page
 * can render without requiring a session.
 *
 * Joins athletes (for the inviting athlete's display name) and schools
 * (for the school name) so the page can greet the AD with meaningful context.
 *
 * NO auth required — the token itself is the credential.
 */

import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token || typeof token !== 'string' || token.length > 200) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const sb = getServiceRoleClient();
    if (!sb) {
      return NextResponse.json(
        { error: 'Service unavailable', code: 'internal' },
        { status: 500 }
      );
    }

    const { data } = await sb
      .from('director_invitations')
      .select(
        `
        invited_email,
        invited_name,
        invited_title,
        invited_at,
        expires_at,
        accepted_at,
        rejected_at,
        athletes (
          id,
          profiles ( first_name, last_name )
        ),
        schools ( id, name )
        `
      )
      .eq('invitation_token', token)
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const now = Date.now();

    if (data.accepted_at) {
      return NextResponse.json(
        { error: 'This invitation has already been accepted', code: 'already_accepted' },
        { status: 410 }
      );
    }
    if (data.rejected_at) {
      return NextResponse.json(
        { error: 'This invitation was declined', code: 'rejected' },
        { status: 410 }
      );
    }
    if (new Date(data.expires_at as string).getTime() < now) {
      return NextResponse.json(
        { error: 'This invitation has expired. Please contact the athlete for a new one.', code: 'expired' },
        { status: 410 }
      );
    }

    // Supabase's typed client models joined rows as arrays. Cast through `unknown`
    // and take the first row defensively.
    const athleteRows = (data.athletes as unknown) as
      | { id: string; profiles: { first_name: string; last_name: string } | null }[]
      | { id: string; profiles: { first_name: string; last_name: string } | null }
      | null;
    const athleteRow = Array.isArray(athleteRows) ? athleteRows[0] : athleteRows;
    const athleteName = athleteRow?.profiles
      ? `${athleteRow.profiles.first_name} ${athleteRow.profiles.last_name}`.trim()
      : 'An athlete';

    const schoolRows = (data.schools as unknown) as
      | { id: string; name: string }[]
      | { id: string; name: string }
      | null;
    const schoolRow = Array.isArray(schoolRows) ? schoolRows[0] : schoolRows;
    const schoolName = schoolRow?.name ?? 'your school';

    return NextResponse.json({
      ok: true,
      invitation: {
        invitedEmail: data.invited_email,
        invitedName: data.invited_name,
        invitedTitle: data.invited_title,
        athleteName,
        schoolName,
        expiresAt: data.expires_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[director/invitation GET]', message);
    return NextResponse.json(
      { error: 'Internal error', code: 'internal' },
      { status: 500 }
    );
  }
}
