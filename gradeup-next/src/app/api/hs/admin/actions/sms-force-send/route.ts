/**
 * POST /api/hs/admin/actions/sms-force-send
 *
 * Admin action: manually re-send an SMS that previously failed or was
 * deemed undeliverable. Body:
 *   { messageId: uuid, reason: string (min 10 chars) }
 *
 * Auth: profiles.role === 'admin' (404 otherwise, never reveals route).
 * Feature-flag gated via FEATURE_HS_NIL.
 * Rate-limited via the shared mutation preset.
 * Writes an admin_audit_log row tagged `sms_force_send` / `sms`.
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
import { getSmsProvider } from '@/lib/hs-nil/sms-provider';
import type { SmsStatus } from '@/lib/hs-nil/sms';

const schema = z
  .object({
    messageId: z.string().uuid(),
    reason: z.string().min(10).max(2000),
  })
  .strict();

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-admin/sms-force-send] Supabase service role not configured.'
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

    const sb = getServiceRoleClient();

    // Pull the row we're resending. Force-send bypasses rate limits and
    // unsubscribe checks intentionally — admin has human judgement.
    const { data: row, error: rowErr } = await sb
      .from('sms_messages')
      .select(
        'id, recipient_phone, body_text, status, retries_remaining, recipient_user_id'
      )
      .eq('id', v.data.messageId)
      .maybeSingle();

    if (rowErr || !row) {
      return NextResponse.json(
        { error: 'SMS row not found', code: 'not_found' },
        { status: 404 }
      );
    }

    if (row.status === 'sent') {
      return NextResponse.json(
        { error: 'SMS already sent.', code: 'invalid_state' },
        { status: 400 }
      );
    }

    const provider = getSmsProvider();
    let sendResult;
    try {
      sendResult = await provider.sendSms({
        to: row.recipient_phone as string,
        body: row.body_text as string,
        messageId: row.id as string,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await sb
        .from('sms_messages')
        .update({
          status: 'failed' as SmsStatus,
          error_code: 'exception',
          error_message: message.slice(0, 500),
        })
        .eq('id', row.id);
      return NextResponse.json(
        { error: message, code: 'internal' },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();
    const nextStatus: SmsStatus =
      sendResult.status === 'sent'
        ? 'sent'
        : sendResult.status === 'queued'
          ? 'sending'
          : 'failed';

    await sb
      .from('sms_messages')
      .update({
        status: nextStatus,
        twilio_sid: sendResult.sid || null,
        error_code: sendResult.errorCode ?? null,
        error_message: sendResult.errorMessage ?? null,
        sent_at: sendResult.status === 'sent' ? now : null,
      })
      .eq('id', row.id);

    // Audit. Non-fatal on failure — we log but don't roll back the send.
    const { data: auditRow, error: auditErr } = await sb
      .from('admin_audit_log')
      .insert({
        actor_user_id: user.id,
        action: 'sms_force_send',
        target_kind: 'sms',
        target_id: row.id,
        reason: v.data.reason.trim(),
        metadata: {
          providerName: provider.name,
          providerStatus: sendResult.status,
          twilioSid: sendResult.sid,
          errorCode: sendResult.errorCode ?? null,
        },
      })
      .select('id')
      .single();

    if (auditErr) {
      // eslint-disable-next-line no-console
      console.error('[hs-admin/sms-force-send] audit write failed', {
        messageId: row.id,
        error: auditErr.message,
      });
    }

    return NextResponse.json({
      ok: true,
      status: nextStatus,
      sid: sendResult.sid,
      auditLogId: auditRow?.id ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-admin/sms-force-send]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
