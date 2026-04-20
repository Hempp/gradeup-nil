/**
 * GET /api/hs/admin/annual-report/collect
 *
 * Admin-gated trigger for the annual-report data assembler. Accepts optional
 * query params:
 *   year   — integer, defaults to current UTC year.
 *   from   — YYYY-MM-DD, range start (ISO midnight UTC).
 *   to     — YYYY-MM-DD, range end inclusive (half-open in queries).
 *
 * Returns the AnnualReportData JSON blob. This is the input to the founder's
 * export-to-JSON button and the seed for a snapshot insert.
 *
 * Safety: SELECTs only. No mutations in this route.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import {
  collectAnnualReportData,
  parseAnnualRangeParams,
} from '@/lib/hs-nil/annual-report';

async function requireAdmin(): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profileErr || !profile || profile.role !== 'admin') {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true };
}

export async function GET(request: NextRequest) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const gate = await requireAdmin();
    if (!gate.ok) return gate.response;

    const supabase = await createClient();
    const url = new URL(request.url);
    const range = parseAnnualRangeParams({
      year: url.searchParams.get('year') ?? undefined,
      from: url.searchParams.get('from') ?? undefined,
      to: url.searchParams.get('to') ?? undefined,
    });

    const data = await collectAnnualReportData(supabase, range);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
