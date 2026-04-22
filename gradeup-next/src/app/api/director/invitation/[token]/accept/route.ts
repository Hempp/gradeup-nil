/**
 * POST /api/director/invitation/[token]/accept
 *
 * Accept a director invitation. NO prior auth required — the AD is creating
 * their account as part of this request.
 *
 * Flow:
 *   1. Validate token is open (not accepted / rejected / expired).
 *   2. Zod-validate body: password ≥ 8 chars, confirmPassword match,
 *      optional acceptedName / acceptedTitle.
 *   3. supabase.auth.signUp() with invited_email + password.
 *   4. Insert profiles row (role = 'athletic_director').
 *   5. Insert athletic_directors row (profile_id, school_id, title).
 *   6. Stamp director_invitations.accepted_at + accepted_by_user_id.
 *   7. Return { success: true } 201.
 *
 * Rollback: if athletic_directors insert fails, delete the profile row so the
 * auth account doesn't end up with a dangling profile.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { z } from 'zod';

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const acceptSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    acceptedName: z.string().max(200).optional(),
    acceptedTitle: z.string().max(200).optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  let newProfileId: string | null = null;

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

    // 1. Fetch and validate invitation
    const { data: inv } = await sb
      .from('director_invitations')
      .select('id, invited_email, invited_name, invited_title, school_id, invited_by_athlete_id, accepted_at, rejected_at, expires_at')
      .eq('invitation_token', token)
      .maybeSingle();

    if (!inv) {
      return NextResponse.json({ error: 'Invitation not found', code: 'not_found' }, { status: 404 });
    }
    if (inv.accepted_at) {
      return NextResponse.json({ error: 'Invitation already accepted', code: 'already_accepted' }, { status: 409 });
    }
    if (inv.rejected_at) {
      return NextResponse.json({ error: 'Invitation was declined', code: 'rejected' }, { status: 410 });
    }
    if (new Date(inv.expires_at as string).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Invitation has expired', code: 'expired' }, { status: 410 });
    }

    // 2. Validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = acceptSchema.safeParse(body);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message).join('; ');
      return NextResponse.json({ error: messages, code: 'validation' }, { status: 400 });
    }

    const { password, acceptedName, acceptedTitle } = parsed.data;

    // 3. Sign up the AD via Supabase auth
    const { data: signUpData, error: signUpError } = await sb.auth.signUp({
      email: inv.invited_email as string,
      password,
      options: {
        data: {
          role: 'athletic_director',
          invited_via_athlete_id: inv.invited_by_athlete_id,
        },
      },
    });

    if (signUpError || !signUpData.user) {
      const msg = signUpError?.message ?? 'Failed to create auth account';
      if (
        msg.toLowerCase().includes('already registered') ||
        msg.toLowerCase().includes('already exists')
      ) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.', code: 'email_taken' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: msg, code: 'signup_failed' }, { status: 500 });
    }

    const authUserId = signUpData.user.id;

    // Parse first / last name from acceptedName or invited_name
    const displayName = (acceptedName ?? inv.invited_name ?? '').trim();
    const nameParts = displayName.split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // 4. Insert profiles row
    const { data: newProfile, error: profileError } = await sb
      .from('profiles')
      .insert({
        id: authUserId,
        email: (inv.invited_email as string).toLowerCase(),
        first_name: firstName,
        last_name: lastName,
        role: 'athletic_director',
        is_active: true,
      })
      .select('id')
      .single();

    if (profileError || !newProfile) {
      // eslint-disable-next-line no-console
      console.error('[director/invitation/accept] profile insert failed', profileError?.message);
      return NextResponse.json(
        { error: 'Failed to create profile', code: 'profile_failed' },
        { status: 500 }
      );
    }

    newProfileId = newProfile.id;

    // 5. Insert athletic_directors row
    const { error: adError } = await sb
      .from('athletic_directors')
      .insert({
        profile_id: newProfileId,
        school_id: inv.school_id,
        title: (acceptedTitle ?? inv.invited_title) || null,
      });

    if (adError) {
      await sb.from('profiles').delete().eq('id', newProfileId);
      newProfileId = null;
      // eslint-disable-next-line no-console
      console.error('[director/invitation/accept] athletic_directors insert failed', adError.message);
      return NextResponse.json(
        { error: 'Failed to create director record', code: 'ad_insert_failed' },
        { status: 500 }
      );
    }

    // 6. Stamp invitation as accepted
    const { error: stampError } = await sb
      .from('director_invitations')
      .update({
        accepted_at: new Date().toISOString(),
        accepted_by_user_id: authUserId,
      })
      .eq('id', inv.id);

    if (stampError) {
      // eslint-disable-next-line no-console
      console.warn('[director/invitation/accept] failed to stamp accepted_at', stampError.message);
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[director/invitation/accept]', message);

    if (newProfileId) {
      try {
        const sb = getServiceRoleClient();
        if (sb) await sb.from('profiles').delete().eq('id', newProfileId);
      } catch {
        // Ignore rollback errors
      }
    }

    return NextResponse.json(
      { error: 'Internal error', code: 'internal' },
      { status: 500 }
    );
  }
}
