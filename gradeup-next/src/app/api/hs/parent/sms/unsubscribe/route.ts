/**
 * GET / POST /api/hs/parent/sms/unsubscribe
 *
 * Public (tokenised) SMS unsubscribe endpoint. Parents who click the
 * unsubscribe link in an SMS we sent hit this route. We set
 * sms_enabled=false on the parent's preference row.
 *
 * Auth:
 *   - No auth required — parents don't need to be signed in to opt out.
 *   - "Token" is either a user_id uuid OR a raw phone number. Both are
 *     treated as opaque — we look up the matching parent profile via the
 *     service role and flip the flag.
 *   - In practice SMS bodies embed a short URL keyed on user_id (when
 *     known) and phone (always).
 *
 * Design notes:
 *   - We accept BOTH GET (from an SMS tap) and POST (from a form) so
 *     tap-to-opt-out works even if the target environment strips POST.
 *   - GET renders a minimal confirmation page; POST returns JSON.
 *   - FCC / CTIA compliance: Twilio also enforces STOP keyword unsubscribe
 *     at the carrier level. This endpoint is the parallel "click here"
 *     path so parents who prefer clicking have a path that works.
 *   - Rate-limited via the shared mutation preset.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import {
  findUserIdByPhone,
  markUserUnsubscribed,
} from '@/lib/hs-nil/sms';
import { normalizePhoneE164 } from '@/lib/hs-nil/sms-provider';

const querySchema = z.object({
  uid: z.string().uuid().optional(),
  phone: z.string().optional(),
  reason: z.string().max(500).optional(),
});

async function resolveUserId(args: {
  uid?: string;
  phone?: string;
}): Promise<string | null> {
  if (args.uid) return args.uid;
  if (args.phone) {
    const normalized = normalizePhoneE164(args.phone);
    if (!normalized) return null;
    return findUserIdByPhone(normalized);
  }
  return null;
}

export async function GET(request: NextRequest) {
  if (!isFeatureEnabled('HS_NIL')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const rateLimited = await enforceRateLimit(request, 'mutation', null);
  if (rateLimited) return rateLimited;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    uid: url.searchParams.get('uid') ?? undefined,
    phone: url.searchParams.get('phone') ?? undefined,
    reason: url.searchParams.get('reason') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters' },
      { status: 400 }
    );
  }

  const userId = await resolveUserId(parsed.data);
  if (!userId) {
    return new NextResponse(
      renderConfirmationPage({
        ok: false,
        message:
          'We could not match this unsubscribe link to an account. If you keep getting SMS, reply STOP to the message — it will stop immediately.',
      }),
      { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } }
    );
  }

  const result = await markUserUnsubscribed(
    userId,
    parsed.data.reason ?? 'user clicked unsubscribe link'
  );
  if (!result.ok) {
    return new NextResponse(
      renderConfirmationPage({
        ok: false,
        message: result.error ?? 'Could not record your preference.',
      }),
      { status: 500, headers: { 'content-type': 'text/html; charset=utf-8' } }
    );
  }
  return new NextResponse(
    renderConfirmationPage({
      ok: true,
      message:
        "You're unsubscribed. You won't receive any more SMS from GradeUp HS. Email still works as a backup.",
    }),
    { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }
  );
}

export async function POST(request: NextRequest) {
  if (!isFeatureEnabled('HS_NIL')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const rateLimited = await enforceRateLimit(request, 'mutation', null);
  if (rateLimited) return rateLimited;

  const body = (await request.json().catch(() => null)) as unknown;
  const parsed = querySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const userId = await resolveUserId(parsed.data);
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: 'No matching account.' },
      { status: 404 }
    );
  }
  const result = await markUserUnsubscribed(
    userId,
    parsed.data.reason ?? 'user posted unsubscribe'
  );
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}

function renderConfirmationPage(args: {
  ok: boolean;
  message: string;
}): string {
  const title = args.ok ? 'Unsubscribed' : 'Unsubscribe failed';
  const body = escapeForHtml(args.message);
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — GradeUp NIL</title>
</head>
<body style="margin:0;padding:0;background:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111;">
<main style="max-width:520px;margin:64px auto;padding:32px;background:#fff;border:1px solid #E4E4E7;border-radius:12px;">
  <h1 style="font-size:22px;margin:0 0 16px;">${title}</h1>
  <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">${body}</p>
  <p style="font-size:13px;color:#52525B;margin:0;">Questions? Email <a href="mailto:support@gradeupnil.com" style="color:#0070F3;">support@gradeupnil.com</a>.</p>
</main>
</body></html>`;
}

function escapeForHtml(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
