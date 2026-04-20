/**
 * GET /api/hs/brand/deals/[id]/export-pdf
 *
 * Streams a branded single-deal PDF report back to the signed-in brand
 * that owns the deal. Consumed by the "Download deal report" button on
 * /hs/brand/deals/[id].
 *
 * Runtime: nodejs (required — jsPDF has no edge build).
 *
 * Auth + scope:
 *   - Feature-flag gated (FEATURE_HS_NIL). 404 when off.
 *   - Authenticated session required. 401 otherwise.
 *   - Brand must own the deal. 404 otherwise (don't leak existence).
 *   - Deal must be in ('paid', 'completed') — otherwise the PDF is
 *     effectively empty, so return a 409 invalid_state rather than
 *     generating a misleading document.
 *
 * Rate limit: shared 'mutation' bucket — PDF generation is relatively
 * expensive (jsPDF render + arraybuffer serialization) so we lean on the
 * same 30/min cap used for other authenticated write paths.
 *
 * Response: application/pdf with Content-Disposition: attachment and a
 * deterministic filename `gradeup-deal-<brand-slug>-<YYYY-MM-DD>.pdf`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getShareCountsForDeal } from '@/lib/hs-nil/share';
import {
  buildDealReportPdf,
  type DealReportData,
  type DealReportDeliverable,
} from '@/lib/hs-nil/pdf/deal-report';
import { slugify, today } from '@/lib/hs-nil/pdf/client';

// jsPDF requires a Node runtime (the 'browser' build pulls in DOM APIs;
// the 'node' build pulls in Node Buffer). Edge runtime has neither fully
// compatible, so we explicitly pin to the Next.js Node runtime.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DealLookup {
  id: string;
  title: string;
  description: string | null;
  deliverables: string | null;
  status: string;
  compensation_amount: number | string;
  compensation_type: string | null;
  signed_at: string | null;
  completed_at: string | null;
  brand: { id: string; company_name: string; profile_id: string } | null;
  athlete: {
    id: string;
    profile_id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface HsAthleteSnapshot {
  state_code: string | null;
  school_name: string | null;
  sport: string | null;
}

interface DisclosureRow {
  state_code: string | null;
  sent_at: string | null;
  status: string | null;
}

interface SubmissionRow {
  id: string;
  submission_type: string | null;
  platform: string | null;
  status: string | null;
}

function dollarsToCents(v: number | string): number {
  const n = typeof v === 'string' ? Number(v) : v;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/**
 * Parse the deal.deliverables column into a list of strings. The column
 * accepts both a newline-delimited string and a JSON array — both have
 * shipped historically. We tolerate either and fall back to an empty
 * list when the shape is unrecognised.
 */
function parseDeliverableLines(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((s): s is string => typeof s === 'string');
    }
  } catch {
    /* not JSON */
  }
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// State disclosure windows (hours after signing). Shipped pilot states
// only — any state not listed will render "Not required in this state"
// on the PDF, which is the conservative default.
const DISCLOSURE_WINDOW_HOURS: Record<string, number> = {
  CA: 72,
  TX: 48,
  FL: 72,
  GA: 72,
  NY: 72,
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { id: dealId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return rateLimited;

    const { data: deal } = await supabase
      .from('deals')
      .select(
        `id, title, description, deliverables, status, compensation_amount,
         compensation_type, signed_at, completed_at,
         brand:brands(id, company_name, profile_id),
         athlete:athletes(id, profile_id, first_name, last_name)`,
      )
      .eq('id', dealId)
      .maybeSingle<DealLookup>();

    if (!deal || !deal.brand || deal.brand.profile_id !== user.id) {
      // 404 either way — don't leak deal existence to the wrong brand.
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (!['paid', 'completed'].includes(deal.status)) {
      return NextResponse.json(
        {
          error:
            'Deal must be paid or completed before a report can be exported.',
          code: 'invalid_state',
        },
        { status: 409 },
      );
    }

    // Athlete snapshot (best-effort — a missing snapshot yields "—" on the PDF).
    let snapshot: HsAthleteSnapshot | null = null;
    if (deal.athlete?.profile_id) {
      const { data } = await supabase
        .from('hs_athlete_profiles')
        .select('state_code, school_name, sport')
        .eq('user_id', deal.athlete.profile_id)
        .maybeSingle<HsAthleteSnapshot>();
      snapshot = data ?? null;
    }

    // Deliverable submissions — used to mark per-line status where we can.
    let submissions: SubmissionRow[] = [];
    try {
      const { data } = await supabase
        .from('deal_deliverable_submissions')
        .select('id, submission_type, platform, status')
        .eq('deal_id', dealId);
      submissions = (data ?? []) as SubmissionRow[];
    } catch {
      /* degrade to empty — PDF is still renderable */
    }

    // Share breakdown.
    const shareCounts = await getShareCountsForDeal(supabase, dealId).catch(
      () => ({
        total: 0,
        byPlatform: {
          instagram: 0,
          linkedin: 0,
          x: 0,
          tiktok: 0,
          copy_link: 0,
        },
        firstShareAt: null,
        lastShareAt: null,
      }),
    );

    // Most-recent sent disclosure (if any) — used for the compliance block.
    let disclosure: DisclosureRow | null = null;
    try {
      const { data } = await supabase
        .from('hs_deal_disclosures')
        .select('state_code, sent_at, status')
        .eq('deal_id', dealId)
        .order('sent_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle<DisclosureRow>();
      disclosure = data ?? null;
    } catch {
      /* degrade to null */
    }

    // Parental-consent reference — the deal row carries `consent_id` or
    // a related FK on many schemas; we don't assume, so we pull the most
    // recent signed consent for the athlete + this deal_id when possible.
    let parentalConsentRef: string | null = null;
    try {
      const { data } = await supabase
        .from('hs_parent_consents')
        .select('id, signed_at')
        .eq('deal_id', dealId)
        .not('signed_at', 'is', null)
        .order('signed_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle<{ id: string; signed_at: string }>();
      if (data?.id) {
        parentalConsentRef = `hs_parent_consents #${data.id.slice(0, 8)}`;
      }
    } catch {
      /* degrade to null — "Not on file" renders */
    }

    // Assemble deliverables list. We cross-reference submissions where we
    // can so "Instagram post" shows as "[Accepted]" vs "[Submitted]".
    const rawLines = parseDeliverableLines(deal.deliverables);
    const deliverables: DealReportDeliverable[] = rawLines.map((label) => {
      // Heuristic: match platform substring from label to submissions.
      const lower = label.toLowerCase();
      const match = submissions.find((s) => {
        const plat = (s.platform ?? '').toLowerCase();
        return plat && lower.includes(plat);
      });
      return { label, status: match?.status ?? null };
    });

    const stateCode = snapshot?.state_code ?? disclosure?.state_code ?? null;

    const payload: DealReportData = {
      brandName: deal.brand.company_name,
      dealTitle: deal.title,
      dealDescription: deal.description,
      athleteFirstName: deal.athlete?.first_name ?? null,
      athleteLastName: deal.athlete?.last_name ?? null,
      athleteSport: snapshot?.sport ?? null,
      athleteSchool: snapshot?.school_name ?? null,
      athleteState: stateCode,
      compensationCents: dollarsToCents(deal.compensation_amount),
      compensationType: deal.compensation_type,
      deliverables,
      signedAt: deal.signed_at,
      completedAt: deal.completed_at,
      shareBreakdown: {
        total: shareCounts.total,
        byPlatform: shareCounts.byPlatform,
        firstShareAt: shareCounts.firstShareAt,
        lastShareAt: shareCounts.lastShareAt,
      },
      compliance: {
        stateCode,
        disclosureWindowHours: stateCode
          ? (DISCLOSURE_WINDOW_HOURS[stateCode] ?? null)
          : null,
        disclosedOn: disclosure?.sent_at ?? null,
        parentalConsentRef,
      },
      status: deal.status,
    };

    const buffer = buildDealReportPdf(payload);
    const filename = `gradeup-deal-${slugify(deal.brand.company_name)}-${today()}.pdf`;

    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Length', String(buffer.length));
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Cache-Control', 'private, max-age=0, must-revalidate');

    return new NextResponse(new Uint8Array(buffer), { status: 200, headers });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[brand/deals/export-pdf] unhandled', err);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 },
    );
  }
}
