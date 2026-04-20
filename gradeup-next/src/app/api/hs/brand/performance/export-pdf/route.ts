/**
 * GET /api/hs/brand/performance/export-pdf
 *
 * Streams a branded brand-performance PDF report. Consumed by the
 * "Download performance report" button on /hs/brand/performance.
 *
 * Runtime: nodejs (required — jsPDF has no edge build).
 *
 * Query params:
 *   rangeStart     ISO date (defaults to now − 90d)
 *   rangeEnd       ISO date (defaults to now)
 *   perDeal        '0' to omit the per-deal table (default on)
 *   athletes       '0' to omit the athlete list (default on)
 *   timeline       '0' to omit the timeline chart (default on)
 *
 * Auth + scope:
 *   - Feature-flag gated. 404 when off.
 *   - Authenticated + HS-enabled brand only. 401 / 403 otherwise.
 *
 * Rate limit: shared 'mutation' bucket.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import {
  getBrandPerformanceSummary,
  getBrandCompletedDeals,
} from '@/lib/hs-nil/earnings';
import {
  buildBrandPerformanceReportPdf,
  type PerformanceReportData,
  type PerformanceReportDeal,
  type TopAthlete,
  type TopBreakdown,
  type TimelineBucket,
} from '@/lib/hs-nil/pdf/performance-report';
import { slugify, today } from '@/lib/hs-nil/pdf/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_RANGE_DAYS = 90;

interface AthleteProfileMini {
  profile_id: string;
  sport: string | null;
  state_code: string | null;
}

function parseIsoDate(input: string | null, fallback: Date): Date {
  if (!input) return fallback;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function monthKeyUtc(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01T00:00:00.000Z`;
}

function summarizeBreakdown<T extends { compensationCents: number }>(
  deals: T[],
  keyFn: (d: T) => string | null,
): TopBreakdown[] {
  const map = new Map<string, { count: number; cents: number }>();
  for (const d of deals) {
    const k = keyFn(d);
    if (!k) continue;
    const existing = map.get(k) ?? { count: 0, cents: 0 };
    existing.count += 1;
    existing.cents += d.compensationCents;
    map.set(k, existing);
  }
  return Array.from(map.entries())
    .map(([label, { count, cents }]) => ({
      label,
      dealCount: count,
      totalCents: cents,
    }))
    .sort((a, b) => b.dealCount - a.dealCount || b.totalCents - a.totalCents);
}

export async function GET(request: NextRequest) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return rateLimited;

    const { data: brand } = await supabase
      .from('brands')
      .select('id, company_name, profile_id, is_hs_enabled')
      .eq('profile_id', user.id)
      .maybeSingle<{
        id: string;
        company_name: string;
        profile_id: string;
        is_hs_enabled: boolean | null;
      }>();

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 403 });
    }
    if (brand.is_hs_enabled !== true) {
      return NextResponse.json(
        { error: 'Brand not HS-enabled' },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const now = new Date();
    const defaultStart = new Date(
      now.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000,
    );

    const rangeStart = parseIsoDate(url.searchParams.get('rangeStart'), defaultStart);
    const rangeEnd = parseIsoDate(url.searchParams.get('rangeEnd'), now);
    // Guard against reversed ranges — simpler to swap than to 400.
    const start = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
    const end = rangeStart <= rangeEnd ? rangeEnd : rangeStart;

    const include = {
      perDealBreakdown: url.searchParams.get('perDeal') !== '0',
      athleteList: url.searchParams.get('athletes') !== '0',
      timelineChart: url.searchParams.get('timeline') !== '0',
    };

    // Aggregated brand summary (across all time — the hero numbers on
    // the page work that way, and the screen stays consistent).
    const summary = await getBrandPerformanceSummary(supabase, brand.id);

    // Completed deals, bounded by the range, up to 200 rows — the PDF
    // table only surfaces the top 25 but the timeline + top-athletes
    // breakdowns benefit from more rows.
    const allCompleted = await getBrandCompletedDeals(supabase, brand.id, {
      limit: 200,
    });
    const inRange = allCompleted.filter((d) => {
      const ts = d.completedAt ?? d.createdAt;
      if (!ts) return false;
      const t = new Date(ts).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });

    // Completion-rate — denominator is "deals created by this brand in
    // the window" regardless of terminal status. Best-effort lookup;
    // degrade to null if the count query fails.
    let completionRate: number | null = null;
    try {
      const { count: attempted } = await supabase
        .from('deals')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', brand.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
      if (typeof attempted === 'number' && attempted > 0) {
        completionRate = Math.min(1, inRange.length / attempted);
      }
    } catch {
      completionRate = null;
    }

    // Sport + state come from hs_athlete_profiles, which is keyed by
    // the athlete profile_id (not available on CompletedDeal). We do a
    // narrow deal-id→profile_id→sport/state lookup so we can join those
    // onto the display rows without widening the CompletedDeal shape.
    const sportByDealId = new Map<string, string | null>();
    const stateByDealId = new Map<string, string | null>();
    try {
      if (inRange.length > 0) {
        const ids = inRange.map((d) => d.id);
        const { data: dealAthleteRows } = await supabase
          .from('deals')
          .select('id, athlete:athletes(profile_id)')
          .in('id', ids);
        const rows = (dealAthleteRows ?? []) as unknown as Array<{
          id: string;
          athlete: { profile_id: string } | null;
        }>;
        const profileIds = Array.from(
          new Set(
            rows
              .map((r) => r.athlete?.profile_id)
              .filter((v): v is string => typeof v === 'string'),
          ),
        );
        if (profileIds.length > 0) {
          const { data: profiles } = await supabase
            .from('hs_athlete_profiles')
            .select('user_id, sport, state_code')
            .in('user_id', profileIds);
          const profileMap = new Map<string, AthleteProfileMini>();
          for (const p of (profiles ?? []) as Array<{
            user_id: string;
            sport: string | null;
            state_code: string | null;
          }>) {
            profileMap.set(p.user_id, {
              profile_id: p.user_id,
              sport: p.sport,
              state_code: p.state_code,
            });
          }
          for (const r of rows) {
            if (!r.athlete?.profile_id) continue;
            const p = profileMap.get(r.athlete.profile_id);
            sportByDealId.set(r.id, p?.sport ?? null);
            stateByDealId.set(r.id, p?.state_code ?? null);
          }
        }
      }
    } catch {
      /* degrade — sport/state will render as "—" */
    }

    // Shape the deals into PDF rows.
    const pdfDeals: PerformanceReportDeal[] = inRange.map((d) => ({
      id: d.id,
      title: d.title,
      athleteFirstName: d.athleteFirstName,
      athleteLastName: d.athleteLastName,
      athleteSchool: d.athleteSchool,
      athleteSport: sportByDealId.get(d.id) ?? null,
      athleteState: stateByDealId.get(d.id) ?? null,
      compensationCents: d.compensationCents,
      completedAt: d.completedAt,
      completionDays: d.completionDays,
      shareCount: d.shareCount,
    }));

    // Top athletes — grouped by first+last+school+sport+state (masked
    // in the PDF layer). Avoids joining on athlete PII at the DB edge.
    const athleteMap = new Map<
      string,
      TopAthlete
    >();
    for (const d of pdfDeals) {
      const key = [
        d.athleteFirstName ?? '',
        d.athleteLastName ?? '',
        d.athleteSchool ?? '',
        d.athleteSport ?? '',
        d.athleteState ?? '',
      ].join('|');
      const existing = athleteMap.get(key) ?? {
        firstName: d.athleteFirstName,
        lastName: d.athleteLastName,
        school: d.athleteSchool,
        sport: d.athleteSport,
        state: d.athleteState,
        dealCount: 0,
        totalCents: 0,
      };
      existing.dealCount += 1;
      existing.totalCents += d.compensationCents;
      athleteMap.set(key, existing);
    }
    const topAthletes = Array.from(athleteMap.values()).sort(
      (a, b) => b.totalCents - a.totalCents || b.dealCount - a.dealCount,
    );

    const topSports = summarizeBreakdown(pdfDeals, (d) => d.athleteSport);
    const topStates = summarizeBreakdown(pdfDeals, (d) => d.athleteState);

    // Monthly timeline buckets — only months that had activity.
    const bucketMap = new Map<string, TimelineBucket>();
    for (const d of pdfDeals) {
      const k = monthKeyUtc(d.completedAt);
      if (!k) continue;
      const existing = bucketMap.get(k) ?? {
        month: k,
        dealCount: 0,
        totalCents: 0,
      };
      existing.dealCount += 1;
      existing.totalCents += d.compensationCents;
      bucketMap.set(k, existing);
    }
    const timeline = Array.from(bucketMap.values()).sort(
      (a, b) => a.month.localeCompare(b.month),
    );

    const payload: PerformanceReportData = {
      brandName: brand.company_name,
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      summary: {
        totalSpendCents: summary.totalSpendCents,
        totalDeals: summary.totalDeals,
        averageDealCents:
          summary.totalDeals > 0
            ? Math.round(summary.totalSpendCents / summary.totalDeals)
            : 0,
        averageCompletionDays: summary.averageCompletionDays,
        totalShareEvents: summary.totalShareEvents,
        avgSharesPerDeal: summary.avgSharesPerDeal,
        completionRate,
      },
      deals: pdfDeals,
      topAthletes,
      topSports,
      topStates,
      timeline,
      insight: null,
      include,
    };

    const buffer = buildBrandPerformanceReportPdf(payload);
    const filename = `gradeup-performance-${slugify(brand.company_name)}-${today()}.pdf`;

    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Length', String(buffer.length));
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Cache-Control', 'private, max-age=0, must-revalidate');

    return new NextResponse(new Uint8Array(buffer), { status: 200, headers });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[brand/performance/export-pdf] unhandled', err);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 },
    );
  }
}
