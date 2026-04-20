/**
 * GET /api/hs/admin/annual-report/export/csv
 *
 * Streams a single section of the annual report as CSV. The client picks the
 * section via ?section= to keep the response small and sanity-check-friendly.
 * Admin can iterate through sections in the admin UI.
 *
 * Query params:
 *   section — one of the CsvSection union from src/lib/hs-nil/annual-report.
 *   year    — optional (defaults to current UTC year)
 *   from    — optional YYYY-MM-DD
 *   to      — optional YYYY-MM-DD
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import {
  CSV_SECTIONS,
  collectAnnualReportData,
  parseAnnualRangeParams,
  sectionToCsv,
  type CsvSection,
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

function isCsvSection(v: string | null): v is CsvSection {
  return !!v && (CSV_SECTIONS as string[]).includes(v);
}

export async function GET(request: NextRequest) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const gate = await requireAdmin();
    if (!gate.ok) return gate.response;

    const url = new URL(request.url);
    const section = url.searchParams.get('section');
    if (!isCsvSection(section)) {
      return NextResponse.json(
        {
          error: `Missing or invalid ?section= param. Valid values: ${CSV_SECTIONS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const range = parseAnnualRangeParams({
      year: url.searchParams.get('year') ?? undefined,
      from: url.searchParams.get('from') ?? undefined,
      to: url.searchParams.get('to') ?? undefined,
    });

    const data = await collectAnnualReportData(supabase, range);
    const csv = sectionToCsv(data, section);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="hs-nil-at-${Math.max(1, range.year - 2025)}-${section}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
