/**
 * POST /api/hs/valuation/estimate
 *
 * Anonymous valuation request logger.
 *
 * Authed? No — the calculator is public marketing.
 * Auth'd-equivalent gating? Rate limit by IP, validate inputs, reject
 * malformed payloads. The risk profile is low (anonymous row insert)
 * but the abuse risk (flooding the table) is real, so we cap it.
 *
 * Privacy
 * ───────
 *   - IP is SHA-256 hashed with a server-side salt before insert.
 *   - User-agent is coarsened to "browser-family / os-family" (40 char
 *     cap) so admin analytics can segment by device class without
 *     storing a fingerprint.
 *   - No user id (endpoint is public / anon).
 *
 * Response
 * ────────
 *   { requestId, result } on success.
 *   { error } on failure.
 */

import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enforceRateLimit } from '@/lib/rate-limit';
import { STATE_RULES, type USPSStateCode } from '@/lib/hs-nil/state-rules';
import {
  estimateValuation,
  logValuationRequest,
  type ValuationInput,
} from '@/lib/hs-nil/valuation';
import { validateInput, formatValidationError } from '@/lib/validations';

// The client may send any permitting or unmodeled state. The calculator
// handles prohibited states by returning caveats rather than refusing,
// so we do minimal server-side validation: shape only.
const VALID_STATE_CODES = Object.keys(STATE_RULES) as USPSStateCode[];

const estimateSchema = z.object({
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
});

// ─────────────────────────────────────────────────────────────────────
// Service-role client (server-only — this API path never runs in
// the browser). We use it because the valuation_requests table
// permits service-role writes only.
// ─────────────────────────────────────────────────────────────────────
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function hashIp(ip: string): string {
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

/**
 * Coarse user-agent hint: pull the browser name + OS family out of the
 * raw header. Never store the full UA string.
 */
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
    // Drop query + hash. Keep protocol + host + path.
    return `${u.protocol}//${u.host}${u.pathname}`.slice(0, 2048);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Anonymous — rate-limit by IP.
    const limited = await enforceRateLimit(req, 'mutation', null);
    if (limited) return limited;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = validateInput(estimateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationError(validation.errors) },
        { status: 400 }
      );
    }

    const input = validation.data as ValuationInput;

    // Accept any 2-letter state code shape; the calculator handles
    // unmodeled states gracefully. We still sanity-check it exists in
    // our state-rules map OR is a plausible USPS code (we allow
    // unmodeled states for forward-compatibility with ad-hoc users).
    if (
      input.stateCode.length !== 2 ||
      !/^[A-Z]{2}$/.test(input.stateCode)
    ) {
      return NextResponse.json(
        { error: 'Invalid state code' },
        { status: 400 }
      );
    }

    const result = estimateValuation(input);

    // Log the request to valuation_requests. Best-effort — if the
    // service client is missing or the insert fails, we still return
    // the computed estimate to the caller (the UI is already rendering
    // from the client-side compute).
    let requestId: string | null = null;
    const supabase = getServiceClient();
    if (supabase) {
      try {
        const ip = getClientIp(req);
        const ipHash = hashIp(ip);
        const uaHint = coarseUserAgent(req.headers.get('user-agent'));
        const refUrl = coarseReferrer(req.headers.get('referer'));
        requestId = await logValuationRequest(supabase, {
          inputs: input,
          result,
          ipHash,
          userAgentHint: uaHint,
          referrerUrl: refUrl,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[hs-nil valuation] log POST failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      requestId,
      result,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// Suppress the unused-variable warning for VALID_STATE_CODES — it's
// kept as documentation of "states we have modeled" for when we
// tighten the allow-list.
void VALID_STATE_CODES;
