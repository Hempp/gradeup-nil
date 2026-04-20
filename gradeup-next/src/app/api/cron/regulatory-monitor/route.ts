import { NextRequest, NextResponse } from 'next/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import {
  checkSource,
  listDueSources,
  type CheckSourceResult,
} from '@/lib/hs-nil/regulatory-monitor';
import { sendRegulatoryChangeAlertToAdmin } from '@/lib/services/hs-nil/regulatory-emails';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════
// HS-NIL REGULATORY MONITOR CRON (Phase 14 — REGULATORY-MONITOR)
// Weekly (Monday 9am ET) per vercel.json. Picks up to 20 due sources, fetches
// each with retry+timeout, SHA-256 hashes the response body, diffs against
// last_content_hash, and logs a regulatory_change_events row when the hash
// has shifted (or when the fetch failed).
//
// Admin receives ONE grouped email per cron run if ≥ 1 event was created.
//
// Auth: `Authorization: Bearer <CRON_SECRET>` (matches /api/cron/digest).
// Feature flag: no-op when FEATURE_HS_NIL is off.
// ═══════════════════════════════════════════════════════════════════════════

const MAX_PER_RUN = 20;

interface RunSummary {
  checked: number;
  changes_detected: number;
  failures: number;
  unchanged: number;
  details: CheckSourceResult[];
  email: { attempted: boolean; success?: boolean; error?: string } | null;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isFeatureEnabled('HS_NIL')) {
    // eslint-disable-next-line no-console
    console.warn(
      '[regulatory-monitor cron] FEATURE_HS_NIL disabled — skipping run.'
    );
    return NextResponse.json({
      skipped: true,
      reason: 'FEATURE_HS_NIL disabled',
      checked: 0,
      changes_detected: 0,
      failures: 0,
    });
  }

  try {
    const due = await listDueSources(MAX_PER_RUN);

    const summary: RunSummary = {
      checked: 0,
      changes_detected: 0,
      failures: 0,
      unchanged: 0,
      details: [],
      email: null,
    };

    for (const source of due) {
      try {
        const result = await checkSource(source.id);
        summary.details.push(result);
        summary.checked += 1;
        if (result.outcome === 'changed' || result.outcome === 'first_seen') {
          summary.changes_detected += 1;
        } else if (result.outcome === 'fetch_failed') {
          summary.failures += 1;
        } else {
          summary.unchanged += 1;
        }
      } catch (err) {
        // One bad source should never kill the cron.
        const message = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line no-console
        console.error('[regulatory-monitor cron] source crashed', {
          sourceId: source.id,
          error: message,
        });
        summary.failures += 1;
        summary.checked += 1;
        summary.details.push({
          sourceId: source.id,
          stateCode: source.stateCode,
          sourceUrl: source.sourceUrl,
          outcome: 'fetch_failed',
          error: message,
        });
      }
    }

    // Email grouping — ONE email per run, only if something happened.
    const eventIds = summary.details
      .map((d) => d.eventId)
      .filter((id): id is string => Boolean(id));

    if (eventIds.length > 0) {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (url && key) {
          const sb = createServiceClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: rows } = await sb
            .from('regulatory_change_events')
            .select(
              `id, detected_at, diff_summary, review_outcome,
               source:regulatory_monitor_sources ( state_code, source_url )`
            )
            .in('id', eventIds);

          const items = (rows ?? []).map((raw) => {
            type SourceJoin = { state_code: string; source_url: string };
            type JoinedRow = {
              id: string;
              detected_at: string;
              diff_summary: string | null;
              review_outcome: string | null;
              source: SourceJoin | SourceJoin[] | null;
            };
            const r = raw as unknown as JoinedRow;
            const src: SourceJoin | null = Array.isArray(r.source)
              ? (r.source[0] ?? null)
              : (r.source ?? null);
            const outcome: 'changed' | 'first_seen' | 'fetch_failed' =
              r.review_outcome === 'unable_to_parse'
                ? 'fetch_failed'
                : r.diff_summary?.startsWith('FIRST SEEN')
                  ? 'first_seen'
                  : 'changed';
            return {
              eventId: r.id,
              stateCode: src?.state_code ?? 'UNK',
              sourceUrl: src?.source_url ?? '',
              detectedAt: r.detected_at,
              diffSummary: r.diff_summary,
              outcome,
            };
          });

          if (items.length > 0) {
            const emailResult = await sendRegulatoryChangeAlertToAdmin({
              items,
              totals: {
                checked: summary.checked,
                changesDetected: summary.changes_detected,
                failures: summary.failures,
              },
            });
            summary.email = {
              attempted: true,
              success: emailResult.success,
              error: emailResult.error,
            };
          }
        } else {
          summary.email = {
            attempted: false,
            error: 'SUPABASE service role not configured.',
          };
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line no-console
        console.error('[regulatory-monitor cron] email dispatch failed', message);
        summary.email = { attempted: true, success: false, error: message };
      }
    }

    return NextResponse.json({
      checked: summary.checked,
      changes_detected: summary.changes_detected,
      failures: summary.failures,
      unchanged: summary.unchanged,
      email: summary.email,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'run failed';
    // eslint-disable-next-line no-console
    console.error('[regulatory-monitor cron] fatal', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
