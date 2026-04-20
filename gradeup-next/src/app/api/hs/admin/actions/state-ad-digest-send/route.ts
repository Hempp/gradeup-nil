/**
 * POST /api/hs/admin/actions/state-ad-digest-send
 *
 * Admin force-trigger for a single state-AD weekly digest. Used for:
 *   - demos ("show me what the weekly email looks like for CA")
 *   - ops ("resend for an AD who reported the email didn't arrive")
 *   - testing in preview envs before the 09:00 UTC cron fires
 *
 * Body:
 *   { assignmentId: uuid, reason?: string }
 *
 * Auth: profiles.role === 'admin' (404 otherwise).
 * Feature-flag gated via FEATURE_HS_NIL.
 * Rate-limited via the shared mutation preset.
 *
 * Writes admin_audit_log row with action='state_ad_digest_force_sent',
 * target_kind='state_ad_assignment', target_id=assignmentId. Delivery
 * outcome (success / error) is captured in the metadata JSON.
 *
 * Bypasses the 6-day idempotency guard and the empty-week suppression
 * rule by design — admin is explicitly opting into the send. On success
 * we still stamp digest_last_sent_at so the regular cron sees the
 * delivery on its next tick.
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
  collectWeeklyStateAdBrief,
  getAssignmentForDigest,
  markDigestSent,
} from '@/lib/hs-nil/state-ad-digest';
import { sendWeeklyStateAdDigest } from '@/lib/services/hs-nil/state-ad-emails';
import { STATE_NAMES } from '@/lib/hs-nil/state-blog-content';

const schema = z
  .object({
    assignmentId: z.string().uuid(),
    reason: z.string().max(500).optional(),
  })
  .strict();

function getServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function writeAudit(
  sb: SupabaseClient,
  input: {
    actorUserId: string;
    assignmentId: string;
    reason: string;
    metadata: Record<string, unknown>;
  }
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data, error } = await sb
    .from('admin_audit_log')
    .insert({
      actor_user_id: input.actorUserId,
      action: 'state_ad_digest_force_sent',
      target_kind: 'state_ad_assignment',
      target_id: input.assignmentId,
      reason: input.reason,
      metadata: input.metadata,
    })
    .select('id')
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? 'audit insert failed' };
  }
  return { ok: true, id: data.id as string };
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

    const sb = getServiceRoleClient();
    if (!sb) {
      return NextResponse.json(
        { error: 'Service role not configured', code: 'internal' },
        { status: 500 }
      );
    }

    const assignment = await getAssignmentForDigest(v.data.assignmentId);
    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found or deactivated', code: 'not_found' },
        { status: 404 }
      );
    }
    if (!assignment.contactEmail) {
      return NextResponse.json(
        { error: 'Assignment has no email on file', code: 'invalid_state' },
        { status: 400 }
      );
    }

    const reason = (v.data.reason?.trim() || 'Admin force-send via state-ad digest page').slice(0, 500);
    // Admin action requires reason >= 10 chars per admin_audit_log CHECK.
    const auditReason =
      reason.length >= 10 ? reason : 'Admin force-send of weekly digest';

    const now = new Date();
    const brief = await collectWeeklyStateAdBrief(assignment.stateCode, now);

    let sendError: string | null = null;
    let messageId: string | null = null;
    let success = false;

    try {
      const result = await sendWeeklyStateAdDigest({
        recipientEmail: assignment.contactEmail,
        stateCode: assignment.stateCode,
        stateName: STATE_NAMES[assignment.stateCode] ?? assignment.stateCode,
        organizationName: assignment.organizationName,
        rangeStart: new Date(brief.rangeStart),
        rangeEnd: new Date(brief.rangeEnd),
        newDealCount: brief.newDealCount,
        deals: brief.newDeals,
        totalCompensation: brief.totalCompensation,
        disclosuresEmitted: brief.disclosuresEmitted,
        disclosuresFailed: brief.disclosuresFailed,
        unreviewedComplianceEvents: brief.unreviewedComplianceEvents,
        complianceRate: brief.complianceRate,
        topSchools: brief.topSchools,
      });
      success = result.success;
      messageId = result.data?.id ?? null;
      sendError = result.success ? null : result.error ?? 'Email provider reported failure';
    } catch (err) {
      success = false;
      sendError = err instanceof Error ? err.message : String(err);
    }

    if (success) {
      await markDigestSent(assignment.assignmentId);
    }

    const audit = await writeAudit(sb, {
      actorUserId: user.id,
      assignmentId: assignment.assignmentId,
      reason: auditReason,
      metadata: {
        stateCode: assignment.stateCode,
        organizationName: assignment.organizationName,
        recipientEmail: assignment.contactEmail,
        bypassedIdempotency: true,
        bypassedEmptyWeekSuppression: true,
        briefTally: {
          newDealCount: brief.newDealCount,
          disclosuresEmitted: brief.disclosuresEmitted,
          disclosuresFailed: brief.disclosuresFailed,
          unreviewedComplianceEvents: brief.unreviewedComplianceEvents,
        },
        delivery: { success, messageId, error: sendError },
      },
    });

    if (!success) {
      return NextResponse.json(
        {
          ok: false,
          error: sendError ?? 'Email delivery failed',
          code: 'email_failed',
          auditLogId: audit.ok ? audit.id : null,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      auditLogId: audit.ok ? audit.id : null,
      assignmentId: assignment.assignmentId,
      stateCode: assignment.stateCode,
      messageId,
      briefTally: {
        newDealCount: brief.newDealCount,
        disclosuresEmitted: brief.disclosuresEmitted,
        disclosuresFailed: brief.disclosuresFailed,
        unreviewedComplianceEvents: brief.unreviewedComplianceEvents,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-admin/state-ad-digest-send]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
