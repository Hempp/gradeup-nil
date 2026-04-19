/**
 * GET /api/hs/referrals/code
 *
 * Returns the caller's personal referral code, creating one on first
 * access. Idempotent.
 *
 * Role gate: only `hs_parent` and `hs_athlete` get codes — brands and
 * other roles don't participate in the parent-to-parent referral loop
 * (they fall under a different attribution bucket if ever needed).
 *
 * Response shape:
 *   {
 *     code: "ab12cd34",
 *     shareUrl: "https://gradeupnil.com/hs?ref=ab12cd34",
 *     role: "hs_parent"
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import {
  getOrCreateCodeForUser,
  type ReferralUserRole,
} from '@/lib/hs-nil/referrals';

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    'https://gradeupnil.com'
  );
}

export async function GET(_request: NextRequest) {
  if (!isFeatureEnabled('HS_NIL')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const meta = (user.user_metadata ?? {}) as { role?: string };
  const role = meta.role;
  if (role !== 'hs_parent' && role !== 'hs_athlete') {
    return NextResponse.json(
      { error: 'Referral codes are only available for HS parents and athletes.' },
      { status: 403 }
    );
  }

  try {
    const row = await getOrCreateCodeForUser({
      userId: user.id,
      role: role as ReferralUserRole,
    });
    const shareUrl = `${appUrl()}/hs?ref=${encodeURIComponent(row.code)}`;
    return NextResponse.json(
      { code: row.code, shareUrl, role: row.role },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to allocate code';
    // eslint-disable-next-line no-console
    console.warn('[hs-referrals-code] failure', { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
