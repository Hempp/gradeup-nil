/**
 * POST /api/athlete/invite-director
 *
 * Athlete action: invite an athletic director (or coach) to GradeUp
 * so they can verify the athlete's enrollment and grades.
 *
 * Auth: profiles.role === 'athlete' (401 otherwise).
 * Body: { directorEmail, directorName, directorTitle? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { validateInput, formatValidationError } from '@/lib/validations';
import { sendEmail } from '@/lib/services/email';

const schema = z
  .object({
    directorEmail: z.string().email().max(320),
    directorName:  z.string().min(1).max(200),
    directorTitle: z.string().max(100).optional(),
  })
  .strict();

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://gradeupnil.com';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'athlete') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve athlete row
    const { data: athlete } = await supabase
      .from('athletes')
      .select('id, school_id')
      .eq('profile_id', user.id)
      .single();
    if (!athlete) {
      return NextResponse.json(
        { success: false, error: 'Athlete profile not found' },
        { status: 422 }
      );
    }
    if (!athlete.school_id) {
      return NextResponse.json(
        { success: false, error: 'No school associated with your profile' },
        { status: 422 }
      );
    }

    // Validate body
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    const v = validateInput(schema, body);
    if (!v.success) {
      return NextResponse.json(
        { success: false, error: formatValidationError(v.errors), code: 'invalid_body' },
        { status: 400 }
      );
    }

    const invitationToken = crypto.randomUUID();

    const { data: invitation, error: insertError } = await supabase
      .from('director_invitations')
      .insert({
        invited_email:          v.data.directorEmail,
        invited_name:           v.data.directorName,
        invited_title:          v.data.directorTitle ?? null,
        invited_by_athlete_id:  athlete.id,
        school_id:              athlete.school_id,
        invitation_token:       invitationToken,
      })
      .select('id, expires_at')
      .single();

    if (insertError || !invitation) {
      // eslint-disable-next-line no-console
      console.error('[athlete/invite-director] insert error', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create invitation' },
        { status: 500 }
      );
    }

    // Best-effort email — invitation row is already durable
    const inviteUrl = `${SITE_URL}/director/invite/${encodeURIComponent(invitationToken)}`;
    const expiryStr = new Date(invitation.expires_at).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const titleLine = v.data.directorTitle
      ? `<p style="margin:0 0 16px;">Hi ${escapeHtml(v.data.directorName)} (${escapeHtml(v.data.directorTitle)}),</p>`
      : `<p style="margin:0 0 16px;">Hi ${escapeHtml(v.data.directorName)},</p>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Verify student-athlete on GradeUp</title>
</head>
<body style="margin:0;padding:0;background-color:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#FFFFFF;border-radius:12px;border:1px solid #E4E4E7;">
        <tr>
          <td style="padding:24px 32px;border-bottom:1px solid #E4E4E7;">
            <div style="font-size:14px;font-weight:700;letter-spacing:1.5px;color:#111;">GRADEUP NIL</div>
            <div style="font-size:12px;color:#52525B;margin-top:2px;">Academic Verification</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#18181B;font-size:16px;line-height:1.6;">
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">You've been invited to verify student-athletes on GradeUp</h1>
            ${titleLine}
            <p style="margin:0 0 16px;">A student-athlete at your school has invited you to join <strong>GradeUp NIL</strong> — the platform that connects scholar-athletes with NIL brand opportunities based on their academic performance.</p>
            <p style="margin:0 0 16px;">As their Athletic Director or coach, you can confirm their enrollment status and verify their academic standing so they can participate on the platform.</p>
            <h2 style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#111;">What you'll be able to do</h2>
            <ul style="margin:0 0 16px;padding-left:20px;color:#18181B;">
              <li style="margin:0 0 6px;">Confirm athlete enrollment at your school</li>
              <li style="margin:0 0 6px;">Verify academic standing (GPA / transcript)</li>
              <li style="margin:0 0 6px;">Monitor NIL activity for athletes in your program</li>
            </ul>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr><td style="background:#0070F3;border-radius:8px;">
                <a href="${inviteUrl}" style="display:inline-block;padding:14px 28px;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:16px;">Accept invitation</a>
              </td></tr>
            </table>
            <p style="margin:0 0 16px;font-size:13px;color:#52525B;">Or copy this link into your browser:<br><span style="word-break:break-all;">${inviteUrl}</span></p>
            <p style="margin:0 0 24px;font-size:13px;color:#52525B;">This invitation expires on <strong>${escapeHtml(expiryStr)}</strong>.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #E4E4E7;background:#FAFAFA;font-size:12px;color:#52525B;line-height:1.5;">
            Questions? Email <a href="mailto:support@gradeupnil.com" style="color:#0070F3;">support@gradeupnil.com</a>.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

    // NB: sendEmail reads sender from EMAIL_FROM_ADDRESS / EMAIL_FROM_NAME env vars.
    await sendEmail({
      to: v.data.directorEmail,
      subject: "You've been invited to verify student-athletes on GradeUp",
      html,
    });

    return NextResponse.json(
      { success: true, invitationId: invitation.id },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[athlete/invite-director]', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
