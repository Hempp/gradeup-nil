/**
 * POST /api/hs/admin/actions/transcript-reprocess
 *
 * Admin action: re-run OCR on an existing transcript submission. Body:
 *   { submissionId: uuid, provider?: 'openai'|'google'|'stub' }
 *
 * Marks the existing (active) transcript_ocr_results row superseded and
 * inserts a fresh one using either the env-configured provider or the
 * caller-specified override. Emits an `admin_audit_log` row tagged
 * 'transcript_ocr_reprocessed' / 'transcript_submission'.
 *
 * Re-running also fires `confidenceGatedAutoApproval` so a reprocess with
 * a stronger provider can flip a previously-stuck submission into auto-
 * approval when confidence now clears 0.90 and the GPA matches.
 *
 * Auth: admin only. Feature-flag gated. Rate-limited.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createClient as createServiceClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import {
  confidenceGatedAutoApproval,
  reprocessSubmission,
} from '@/lib/hs-nil/ocr';
import type { OcrProviderName } from '@/lib/hs-nil/ocr-provider';

const schema = z
  .object({
    submissionId: z.string().uuid(),
    provider: z
      .enum(['openai', 'google', 'stub', 'openai_vision', 'google_vision'])
      .optional(),
  })
  .strict();

function normaliseProvider(
  v: z.infer<typeof schema>['provider']
): OcrProviderName | undefined {
  if (!v) return undefined;
  if (v === 'openai') return 'openai_vision';
  if (v === 'google') return 'google_vision';
  return v as OcrProviderName;
}

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-admin/transcript-reprocess] Supabase service role not configured.'
    );
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return rateLimited;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const v = validateInput(schema, body);
    if (!v.success) {
      return NextResponse.json(
        { error: formatValidationError(v.errors), code: 'invalid_body' },
        { status: 400 }
      );
    }

    const providerName = normaliseProvider(v.data.provider);
    const outcome = await reprocessSubmission(
      v.data.submissionId,
      providerName
    );

    // After OCR runs, attempt the confidence gate. Fail-soft — the OCR row
    // is already persisted, the gate is additive.
    let autoApproved = false;
    let autoApprovalReason: string | null = null;
    try {
      const gate = await confidenceGatedAutoApproval(v.data.submissionId);
      if (gate.ok) {
        autoApproved = gate.autoApproved;
        if (!gate.autoApproved) {
          autoApprovalReason = gate.reason;
        }
      } else {
        autoApprovalReason = gate.reason;
      }
    } catch (err) {
      autoApprovalReason = err instanceof Error ? err.message : String(err);
    }

    // Write the audit-log row (service role). Every admin action lands
    // here regardless of outcome — see admin-actions.ts pattern.
    const sb = getServiceRoleClient();
    const { data: audit, error: auditErr } = await sb
      .from('admin_audit_log')
      .insert({
        actor_user_id: user.id,
        action: 'transcript_ocr_reprocessed',
        target_kind: 'transcript_submission',
        target_id: v.data.submissionId,
        reason:
          `OCR reprocess requested${
            providerName ? ` with provider ${providerName}` : ''
          } — ${
            outcome.ok
              ? `confidence ${outcome.confidence.toFixed(2)}`
              : `failed: ${outcome.reason}`
          }`.slice(0, 1000),
        metadata: {
          providerOverride: providerName ?? null,
          outcome: outcome.ok
            ? {
                ok: true,
                resultId: outcome.resultId,
                provider: outcome.provider,
                confidence: outcome.confidence,
                extractedGpa: outcome.extractedGpa,
                extractedGpaScale: outcome.extractedGpaScale,
                matchesClaimed: outcome.matchesClaimed,
              }
            : { ok: false, reason: outcome.reason },
          autoApproved,
          autoApprovalReason,
        },
      })
      .select('id')
      .single();

    if (auditErr || !audit) {
      // eslint-disable-next-line no-console
      console.error(
        '[hs-admin/transcript-reprocess] audit log write failed',
        { error: auditErr?.message }
      );
      return NextResponse.json(
        {
          ok: outcome.ok,
          outcome,
          autoApproved,
          autoApprovalReason,
          auditError: auditErr?.message ?? 'audit insert failed',
        },
        { status: outcome.ok ? 200 : 500 }
      );
    }

    return NextResponse.json({
      ok: outcome.ok,
      outcome,
      autoApproved,
      autoApprovalReason,
      auditLogId: audit.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-admin/transcript-reprocess]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
