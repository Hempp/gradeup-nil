/**
 * POST /api/hs/valuation/brand-estimate
 *
 * Anonymous brand-perspective Fair-Market-Value calculator logger.
 *
 * Authed? No — the tool is public marketing (brands should be able to
 * play before signing up). Rate-limited by IP via the `mutation` preset
 * to cap abuse.
 *
 * Reuses the athlete-side `estimateValuation` engine via
 * `estimateBrandCampaignValuation`, which layers the deliverable
 * multiplier + multi-athlete count on top. No separate math, no
 * divergent truth.
 *
 * Privacy
 * ───────
 *   - Same hashed-IP + coarse UA as the athlete side.
 *   - No brand email captured here; opt-in lead capture is a separate
 *     "Talk to our team" endpoint not wired by this route.
 *
 * Response shape
 * ──────────────
 *   {
 *     requestId: string | null,
 *     perDeliverableCents: { low, mid, high },
 *     campaignTotalCents:  { low, mid, high },
 *     caveats: string[],
 *     complianceCallouts: string[],
 *     volumeDiscountApplied: boolean,
 *     topSuggestedCategories: string[],
 *     methodologyVersion: string
 *   }
 */

import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enforceRateLimit } from '@/lib/rate-limit';
import {
  estimateBrandCampaignValuation,
  logBrandValuationRequest,
  type BrandValuationInput,
  type ValuationInput,
  type BrandValuationContext,
} from '@/lib/hs-nil/valuation';
import { validateInput, formatValidationError } from '@/lib/validations';

const brandEstimateSchema = z.object({
  // Athlete-side shape (mirrors /api/hs/valuation/estimate).
  sport: z.enum([
    'football',
    'basketball_m',
    'basketball_w',
    'baseball',
    'softball',
    'soccer_m',
    'soccer_w',
    'volleyball',
    'track_field',
    'cross_country',
    'wrestling',
    'swimming',
    'tennis',
    'golf',
    'lacrosse',
    'hockey',
    'gymnastics',
    'cheer',
    'other',
  ]),
  stateCode: z
    .string()
    .trim()
    .toUpperCase()
    .length(2, 'State code must be 2 letters'),
  gradLevel: z.enum([
    'freshman',
    'sophomore',
    'junior',
    'senior',
    'college_freshman',
  ]),
  followerCountBucket: z.enum([
    'under_500',
    '500_to_2k',
    '2k_to_10k',
    '10k_to_50k',
    '50k_plus',
  ]),
  gpaBucket: z.enum(['under_3_0', '3_0_to_3_5', '3_5_to_3_9', '3_9_plus']),
  verifiedGpa: z.boolean().default(false),
  tierBSubmitted: z.boolean().default(false),

  // Brand-side shape.
  brand: z.object({
    vertical: z.enum([
      'qsr',
      'apparel',
      'training',
      'local_services',
      'education',
      'other',
    ]),
    deliverableType: z.enum([
      'single_post',
      'three_post_series',
      'in_person_appearance',
      'multi_month_campaign',
    ]),
    // Bounded to prevent a single request from materializing a
    // million-dollar campaign total that would skew analytics.
    athleteCount: z
      .number()
      .int()
      .min(1, 'At least one athlete required')
      .max(500, 'Too many athletes for one campaign'),
    campaignNotes: z.string().trim().max(500).optional().nullable(),
  }),
});

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function hashIp(ip: string): string {
  // Reuse the athlete-side salt so a repeat visitor moving between
  // /hs/valuation and /solutions/brands/fmv hashes to the same bucket
  // for session analytics. Falls back to a default if unset.
  const salt = process.env.VALUATION_IP_HASH_SALT ?? 'gradeup-hs-valuation';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  const vercelIp = req.headers.get('x-vercel-forwarded-for');
  if (vercelIp) return vercelIp.split(',')[0].trim();
  return 'unknown';
}

function coarseUserAgent(ua: string | null): string | null {
  if (!ua) return null;
  const lower = ua.toLowerCase();
  let browser = 'other';
  if (lower.includes('edg/')) browser = 'edge';
  else if (lower.includes('chrome/') && !lower.includes('edg/')) browser = 'chrome';
  else if (lower.includes('safari/') && !lower.includes('chrome/')) browser = 'safari';
  else if (lower.includes('firefox/')) browser = 'firefox';

  let os = 'other';
  if (lower.includes('iphone') || lower.includes('ipad')) os = 'ios';
  else if (lower.includes('android')) os = 'android';
  else if (lower.includes('macintosh') || lower.includes('mac os x')) os = 'macos';
  else if (lower.includes('windows')) os = 'windows';
  else if (lower.includes('linux')) os = 'linux';

  return `${browser} / ${os}`.slice(0, 40);
}

function coarseReferrer(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    const u = new URL(referrer);
    return `${u.protocol}//${u.host}${u.pathname}`.slice(0, 2048);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimit(req, 'mutation', null);
    if (limited) return limited;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = validateInput(brandEstimateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationError(validation.errors) },
        { status: 400 }
      );
    }

    // Narrow validated data into the BrandValuationInput shape. Zod has
    // already shaped + coerced; we reassemble to satisfy the split type.
    const v = validation.data;
    const athletePart: ValuationInput = {
      sport: v.sport,
      stateCode: v.stateCode as ValuationInput['stateCode'],
      gradLevel: v.gradLevel,
      followerCountBucket: v.followerCountBucket,
      gpaBucket: v.gpaBucket,
      verifiedGpa: v.verifiedGpa ?? false,
      tierBSubmitted: v.tierBSubmitted ?? false,
    };
    const brandContext: BrandValuationContext = {
      vertical: v.brand.vertical,
      deliverableType: v.brand.deliverableType,
      athleteCount: v.brand.athleteCount,
      campaignNotes: v.brand.campaignNotes ?? null,
    };
    const input: BrandValuationInput = { ...athletePart, brand: brandContext };

    if (!/^[A-Z]{2}$/.test(input.stateCode)) {
      return NextResponse.json(
        { error: 'Invalid state code' },
        { status: 400 }
      );
    }

    const result = estimateBrandCampaignValuation(input);

    let requestId: string | null = null;
    const supabase = getServiceClient();
    if (supabase) {
      try {
        const ip = getClientIp(req);
        const ipHash = hashIp(ip);
        const uaHint = coarseUserAgent(req.headers.get('user-agent'));
        const refUrl = coarseReferrer(req.headers.get('referer'));
        requestId = await logBrandValuationRequest(supabase, {
          inputs: athletePart,
          brandContext,
          result,
          ipHash,
          userAgentHint: uaHint,
          referrerUrl: refUrl,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[hs-nil brand-fmv] log POST failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      requestId,
      perDeliverableCents: result.perDeliverableCents,
      campaignTotalCents: result.campaignTotalCents,
      caveats: result.caveats,
      complianceCallouts: result.complianceCallouts,
      volumeDiscountApplied: result.volumeDiscountApplied,
      topSuggestedCategories: result.topSuggestedCategories,
      methodologyVersion: result.methodologyVersion,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
