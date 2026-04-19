/**
 * POST /api/hs/referrals/invite
 *
 * "Email a friend" endpoint. A signed-in parent sends a personalized
 * invite to a target email. The target email is NOT an account — we
 * send an invitation that lands at `/hs?ref=CODE` (where CODE is the
 * caller's personal referral code). If the target later signs up, the
 * RefCapture cookie flow does the attribution.
 *
 * Abuse controls:
 *   - Mutation rate limit (shared limiter — 30/min/user/path).
 *   - Per-user-per-day cap of 20 invite emails. Counted via the
 *     referral_attributions log (`metadata.invite_sent=true` plus
 *     created_at within the last 24h). We don't create a separate
 *     invite-audit table; the attributions table is already the
 *     canonical record.
 *   - Normalized + de-duped target email: trim + lowercase. Self-invite
 *     (target === caller) is rejected.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { createClient as createSsrClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import {
  getOrCreateCodeForUser,
  type ReferralUserRole,
} from '@/lib/hs-nil/referrals';
import { sendInviteFromParent } from '@/lib/services/hs-nil/referral-emails';

const PER_USER_DAILY_CAP = 20;

const bodySchema = z
  .object({
    toEmail: z.string().trim().email().max(254),
    personalNote: z.string().trim().max(500).optional(),
  })
  .strict();

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    'https://gradeupnil.com'
  );
}

function serviceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase service role not configured.');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: NextRequest) {
  if (!isFeatureEnabled('HS_NIL')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const ssr = await createSsrClient();
  const {
    data: { user },
    error,
  } = await ssr.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const meta = (user.user_metadata ?? {}) as {
    role?: string;
    first_name?: string;
    last_name?: string;
  };
  const role = meta.role;
  if (role !== 'hs_parent' && role !== 'hs_athlete') {
    return NextResponse.json(
      { error: 'Only HS parents and athletes can send invites.' },
      { status: 403 }
    );
  }

  // Mutation rate limit — shared across mutation endpoints.
  const limited = await enforceRateLimit(request, 'mutation', user.id);
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join('; ') },
      { status: 400 }
    );
  }

  const toEmail = parsed.data.toEmail.toLowerCase();
  if (user.email && toEmail === user.email.toLowerCase()) {
    return NextResponse.json(
      { error: 'You cannot invite your own email.' },
      { status: 400 }
    );
  }

  // Daily cap — count attributions logged from this user with invite
  // metadata in the last 24h. Service-role bypasses RLS for the count.
  const svc = serviceRoleClient();
  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: sentToday, error: countErr } = await svc
    .from('referral_attributions')
    .select('id', { count: 'exact', head: true })
    .eq('referring_user_id', user.id)
    .gte('created_at', sinceIso)
    .contains('metadata', { invite_sent: true });

  if (countErr) {
    // eslint-disable-next-line no-console
    console.warn('[hs-referrals-invite] daily-cap count failed', countErr);
  } else if ((sentToday ?? 0) >= PER_USER_DAILY_CAP) {
    return NextResponse.json(
      {
        error: `Daily invite cap reached (${PER_USER_DAILY_CAP}/day). Try again tomorrow.`,
      },
      { status: 429 }
    );
  }

  // Allocate (or fetch) the caller's code.
  let code: string;
  try {
    const row = await getOrCreateCodeForUser({
      userId: user.id,
      role: role as ReferralUserRole,
    });
    code = row.code;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Code allocation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const inviteUrl = `${appUrl()}/hs?ref=${encodeURIComponent(code)}`;
  const fromParentName =
    [meta.first_name, meta.last_name].filter(Boolean).join(' ').trim() ||
    user.email?.split('@')[0] ||
    'A GradeUp user';

  // Log the invite first — this is our audit trail + daily-cap signal.
  // If this write fails we don't send (we'd rather lose a send than
  // skip the audit record).
  const logRes = await svc
    .from('referral_attributions')
    .insert({
      referring_user_id: user.id,
      referred_email: toEmail,
      referral_code: code,
      metadata: {
        invite_sent: true,
        source: 'email_a_friend',
        has_note: Boolean(parsed.data.personalNote?.trim()),
      },
    })
    .select('id')
    .single();

  if (logRes.error || !logRes.data) {
    // eslint-disable-next-line no-console
    console.warn('[hs-referrals-invite] audit insert failed', logRes.error);
    return NextResponse.json(
      { error: 'Could not record the invite.' },
      { status: 500 }
    );
  }

  // Fire the email. Fail-closed — we already have the audit row, so a
  // failed send still counts against the daily cap (that's the right
  // side to err on — otherwise a broken Resend key becomes a spam
  // amplifier).
  const result = await sendInviteFromParent({
    toEmail,
    fromParentName,
    fromParentEmail: user.email ?? null,
    personalNote: parsed.data.personalNote ?? null,
    inviteUrl,
  });

  return NextResponse.json(
    {
      ok: result.success,
      messageId: result.data?.id ?? null,
      error: result.error ?? null,
    },
    { status: result.success ? 200 : 502 }
  );
}
