/**
 * GET /api/cron/hs-match-alerts
 *
 * Daily cron (9am ET / 14:00 UTC) that finds new HS athlete matches
 * per HS-enabled brand since their `last_match_alert_sent_at` and
 * sends `sendNewAthleteMatchAlert` when the match score crosses the
 * alert threshold.
 *
 * Auth:
 *   Authorization: Bearer $CRON_SECRET (matches /api/cron/digest
 *   and /api/cron/hs-disclosures).
 *
 * Feature flag: no-op when FEATURE_HS_NIL is off. Returns
 *   { skipped: true, brands_notified: 0, emails_sent: 0 }.
 *
 * Throttle: any brand that was alerted within the last 24h is
 * skipped, so if the cron misfires or runs twice in a window we
 * don't double-send.
 *
 * Per-brand flow:
 *   1. Pull top matches via match_hs_athletes_for_brand (min_gpa=3.0).
 *   2. Filter to matches with score >= ALERT_THRESHOLD (0.7).
 *   3. Intersect with athletes whose profile was created after the
 *      brand's last_match_alert_sent_at. If none, skip.
 *   4. Send the email.
 *   5. Update brands.last_match_alert_sent_at to now().
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isFeatureEnabled } from '@/lib/feature-flags';
import {
  getSuggestedAthletes,
  getNewMatchesForBrand,
} from '@/lib/hs-nil/matching';
import { sendNewAthleteMatchAlert } from '@/lib/services/hs-nil/matching-emails';

const ALERT_THRESHOLD = 0.7;
const MIN_GPA = 3.0;
const MATCH_LIMIT = 25;
const THROTTLE_HOURS = 24;

interface BrandRow {
  id: string;
  company_name: string;
  contact_email: string | null;
  contact_name: string | null;
  profile_id: string;
  last_match_alert_sent_at: string | null;
}

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  'https://gradeupnil.com';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isFeatureEnabled('HS_NIL')) {
    // eslint-disable-next-line no-console
    console.warn('[hs-match-alerts cron] FEATURE_HS_NIL disabled — skipping.');
    return NextResponse.json({
      skipped: true,
      reason: 'FEATURE_HS_NIL disabled',
      brands_notified: 0,
      emails_sent: 0,
    });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    // eslint-disable-next-line no-console
    console.warn('[hs-match-alerts cron] service credentials missing.');
    return NextResponse.json(
      {
        skipped: true,
        reason: 'service credentials missing',
        brands_notified: 0,
        emails_sent: 0,
      },
      { status: 500 }
    );
  }

  const service = createServiceClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Pull every HS-enabled brand. Throttle applied per-row below so a
  // single DB query gives us enough context.
  const { data: brandRows, error: brandsError } = await service
    .from('brands')
    .select(
      'id, company_name, contact_email, contact_name, profile_id, last_match_alert_sent_at'
    )
    .eq('is_hs_enabled', true);

  if (brandsError) {
    // eslint-disable-next-line no-console
    console.error('[hs-match-alerts cron] brands fetch failed', brandsError);
    return NextResponse.json({ error: brandsError.message }, { status: 500 });
  }

  const brands = (brandRows ?? []) as BrandRow[];
  const now = new Date();
  const throttleCutoff = new Date(
    now.getTime() - THROTTLE_HOURS * 60 * 60 * 1000
  );

  let brandsNotified = 0;
  let emailsSent = 0;
  const failures: Array<{ brandId: string; reason: string }> = [];

  for (const brand of brands) {
    try {
      // Throttle: skip brands alerted within the last 24h.
      if (brand.last_match_alert_sent_at) {
        const lastSent = new Date(brand.last_match_alert_sent_at);
        if (lastSent > throttleCutoff) continue;
      }

      // Pull ranked matches.
      const matches = await getSuggestedAthletes(service, brand.id, {
        minGpa: MIN_GPA,
        limit: MATCH_LIMIT,
      });
      const qualifying = matches.filter(
        (m) => m.matchScore >= ALERT_THRESHOLD
      );
      if (qualifying.length === 0) continue;

      // Filter by "since" so we only alert when there are genuinely
      // new profiles.
      const sinceTs = brand.last_match_alert_sent_at
        ? new Date(brand.last_match_alert_sent_at)
        : null;
      const { newSince } = await getNewMatchesForBrand(
        service,
        brand.id,
        sinceTs,
        { minGpa: MIN_GPA, limit: MATCH_LIMIT }
      );
      if (newSince === 0) continue;

      // Resolve the brand's email. `contact_email` on the brands
      // row is the canonical channel for brand-directed mail.
      const brandEmail = brand.contact_email?.trim();
      if (!brandEmail) {
        failures.push({
          brandId: brand.id,
          reason: 'no contact_email on brand',
        });
        continue;
      }

      const topSummary = qualifying.slice(0, 3).map((m) => ({
        firstName: m.firstName,
        schoolName: m.schoolName,
        gpa: m.gpa,
        gpaTier: m.gpaVerificationTier,
      }));

      const sendResult = await sendNewAthleteMatchAlert({
        brandEmail,
        brandName:
          brand.contact_name?.split(/\s+/)[0] ?? brand.company_name ?? null,
        matchCount: newSince,
        topMatchesSummary: topSummary,
        dashboardUrl: `${APP_URL}/hs/brand/suggested`,
      });

      if (!sendResult.success) {
        failures.push({
          brandId: brand.id,
          reason: sendResult.error ?? 'email send failed',
        });
        continue;
      }

      // Stamp brands.last_match_alert_sent_at so subsequent runs
      // throttle and so the next alert only counts athletes that
      // signed up after this one.
      const { error: stampError } = await service
        .from('brands')
        .update({ last_match_alert_sent_at: now.toISOString() })
        .eq('id', brand.id);
      if (stampError) {
        // We already sent the email, so log but don't fail the row.
        // eslint-disable-next-line no-console
        console.warn(
          '[hs-match-alerts cron] stamp update failed',
          brand.id,
          stampError.message
        );
      }

      brandsNotified += 1;
      emailsSent += 1;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      failures.push({ brandId: brand.id, reason });
      // eslint-disable-next-line no-console
      console.error(
        '[hs-match-alerts cron] brand loop error',
        brand.id,
        reason
      );
    }
  }

  return NextResponse.json({
    brands_notified: brandsNotified,
    emails_sent: emailsSent,
    brands_considered: brands.length,
    failures,
    timestamp: now.toISOString(),
  });
}
