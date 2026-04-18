/**
 * HS-NIL Post-Signature Disclosure Pipeline
 * ----------------------------------------------------------------------------
 * Every permitting state requires NIL deals involving HS athletes to be
 * disclosed to the state athletic association, the school, or both, within
 * a statutory window after contract signature (e.g. 72h in CA, 168h in FL/GA).
 *
 * This module provides:
 *   1. `buildDisclosurePayload` — renders per-state email HTML + JSON stub.
 *   2. `enqueueDisclosure(dealId)` — called at deal-sign time. Writes a
 *      `pending` row into `hs_deal_disclosures` scheduled for 24h BEFORE
 *      the statutory deadline so ops has slack to intervene.
 *   3. `drainPendingDisclosures()` — invoked by the hourly cron. Batches
 *      up to 50 due disclosures, sends each via Resend, and marks the row
 *      `sent` or `failed`. Failures are NOT retried automatically — ops
 *      reviews failed rows.
 *
 * PII minimization — the disclosure payload deliberately OMITS:
 *   - Athlete date of birth
 *   - Parent email
 *   - Identity verification provider / reference
 * The receiving body needs to know WHO (athlete name + school + parent name)
 * and WHAT (brand, amount, categories, signed date, proof link), not raw PII.
 *
 * Source of truth: `supabase/migrations/20260418_002_hs_nil_foundations.sql`
 * (table `hs_deal_disclosures`).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/services/email';
import { STATE_RULES, type USPSStateCode } from './state-rules';
import { getDisclosureRecipient } from './disclosure-recipients';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface DisclosurePayloadInput {
  deal: {
    id: string;
    counterpartyName: string;   // brand / company
    amount: number;             // whole USD
    categories: string[];       // e.g. ['local_retail', 'training']
    signedAt: Date;
    consentRecordId: string | null;
    contractUrl: string | null; // deep link to signed contract (if stored)
  };
  athlete: {
    userId: string;
    fullName: string;
    schoolName: string;
  };
  parent: {
    fullName: string;           // consenting parent / guardian name
  };
  state: USPSStateCode;
}

export interface DisclosurePayload {
  format: 'email' | 'json';
  subject?: string;
  body?: string;                         // HTML body when format === 'email'
  attachments?: Array<{ filename: string; url: string }>;
  json?: Record<string, unknown>;        // Structured stub for future API
}

export interface DrainResult {
  processed: number;
  sent: number;
  failed: number;
}

// ----------------------------------------------------------------------------
// Infrastructure
// ----------------------------------------------------------------------------

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[hs-nil disclosures] Supabase service role not configured ' +
        '(NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(d: Date): string {
  return d.toISOString().replace('T', ' ').replace(/\..+/, ' UTC');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ----------------------------------------------------------------------------
// Per-state template registry
// ----------------------------------------------------------------------------

type TemplateFn = (input: DisclosurePayloadInput) => { subject: string; body: string };

function renderDisclosureTable(input: DisclosurePayloadInput): string {
  const rows: Array<[string, string]> = [
    ['Athlete', `${escapeHtml(input.athlete.fullName)}`],
    ['School', escapeHtml(input.athlete.schoolName)],
    ['Parent / Guardian (consenting)', escapeHtml(input.parent.fullName)],
    ['State', input.state],
    ['Brand / Counterparty', escapeHtml(input.deal.counterpartyName)],
    ['Deal Amount', formatUSD(input.deal.amount)],
    [
      'Deal Categories',
      input.deal.categories.length
        ? escapeHtml(input.deal.categories.join(', '))
        : '(unspecified)',
    ],
    ['Signed At (UTC)', formatDate(input.deal.signedAt)],
    ['Deal ID', escapeHtml(input.deal.id)],
    [
      'Parental Consent Record',
      input.deal.consentRecordId ? escapeHtml(input.deal.consentRecordId) : '(not linked)',
    ],
    [
      'Signed Contract',
      input.deal.contractUrl
        ? `<a href="${escapeHtml(input.deal.contractUrl)}">View contract</a>`
        : '(available on request)',
    ],
  ];

  const trs = rows
    .map(
      ([k, v]) =>
        `<tr><th align="left" style="padding:6px 12px;background:#f4f4f4;">${escapeHtml(k)}</th>` +
        `<td style="padding:6px 12px;">${v}</td></tr>`
    )
    .join('');

  return `<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #ddd;font-family:Arial,sans-serif;font-size:14px;">${trs}</table>`;
}

function baseTemplate(header: string, input: DisclosurePayloadInput): { subject: string; body: string } {
  const subject = `HS-NIL Deal Disclosure — ${input.athlete.fullName} (${input.state}) — ${input.deal.id}`;
  const body = `
<div style="font-family:Arial,sans-serif;font-size:14px;color:#111;max-width:720px;">
  <h2 style="margin:0 0 12px;">${escapeHtml(header)}</h2>
  <p>This notice is submitted by GradeUp NIL as required by state rules governing
  high-school Name, Image, and Likeness (NIL) activity. The agreement described
  below has been executed and is now in effect.</p>
  ${renderDisclosureTable(input)}
  <p style="margin-top:16px;color:#555;">
  GradeUp NIL retains the signed contract and parental consent record on file
  and can produce copies on request. This notification has been minimized to
  exclude athlete date of birth, parent contact email, and identity
  verification references.</p>
  <p style="margin-top:16px;color:#999;font-size:12px;">Automated disclosure from GradeUp NIL. Reply to this message to reach compliance.</p>
</div>`.trim();
  return { subject, body };
}

const TEMPLATES: Partial<Record<USPSStateCode, TemplateFn>> = {
  CA: (input) =>
    baseTemplate(
      'California (CIF) — HS NIL 72-Hour Deal Disclosure',
      input,
    ),
  FL: (input) =>
    baseTemplate(
      'Florida (FHSAA) — HS NIL 7-Day Deal Disclosure',
      input,
    ),
  GA: (input) =>
    baseTemplate(
      'Georgia (GHSA) — HS NIL 7-Day Deal Disclosure',
      input,
    ),
};

// ----------------------------------------------------------------------------
// Payload generator
// ----------------------------------------------------------------------------

export async function buildDisclosurePayload(
  input: DisclosurePayloadInput,
): Promise<DisclosurePayload> {
  const template = TEMPLATES[input.state];
  if (!template) {
    throw new Error(
      `[hs-nil disclosures] No disclosure template for state ${input.state}. ` +
        'Add a template in src/lib/hs-nil/disclosures.ts before accepting deals there.',
    );
  }

  const { subject, body } = template(input);

  // JSON stub: structured form the same payload could take when a state
  // publishes an API / webhook intake endpoint. Kept intentionally flat.
  const json: Record<string, unknown> = {
    schemaVersion: '2026-04-18',
    state: input.state,
    athlete: {
      fullName: input.athlete.fullName,
      school: input.athlete.schoolName,
    },
    parent: {
      fullName: input.parent.fullName,
    },
    deal: {
      id: input.deal.id,
      counterparty: input.deal.counterpartyName,
      amountUsd: input.deal.amount,
      categories: input.deal.categories,
      signedAt: input.deal.signedAt.toISOString(),
      consentRecordId: input.deal.consentRecordId,
      contractUrl: input.deal.contractUrl,
    },
  };

  const attachments = input.deal.contractUrl
    ? [{ filename: 'signed-contract.pdf', url: input.deal.contractUrl }]
    : undefined;

  return {
    format: 'email',
    subject,
    body,
    attachments,
    json,
  };
}

// ----------------------------------------------------------------------------
// Enqueue — called from the deal-signing flow
// ----------------------------------------------------------------------------

/**
 * Slack (in hours) subtracted from the statutory deadline so ops has time to
 * review / resolve failures before the hard cutoff.
 */
const OPS_SLACK_HOURS = 24;

/**
 * Enqueue a disclosure for a freshly-signed HS NIL deal.
 *
 * MUST be called from the deal-signing transition (status -> 'signed' /
 * contract status -> 'fully_signed') for any deal where the athlete is a
 * registered HS athlete. The deal-signing flow itself does NOT exist yet —
 * see the TODO placed in `src/app/api/contracts/[id]/route.ts` inside
 * `handleSign` at the `fully_signed` transition.
 *
 * Idempotency — enqueuing twice for the same deal is safe in a dev context
 * (no unique constraint on deal_id in the table schema) but the drain job
 * will then send duplicate disclosures. Callers should guard against double
 * calls at the deal-flow level.
 */
export async function enqueueDisclosure(dealId: string): Promise<{
  enqueued: boolean;
  reason?: string;
  disclosureId?: string;
}> {
  const sb = getServiceRoleClient();

  // 1. Load deal
  const { data: deal, error: dealErr } = await sb
    .from('deals')
    .select(
      'id, athlete_id, brand_id, status, signed_at, compensation_amount, deal_type, created_at',
    )
    .eq('id', dealId)
    .maybeSingle();

  if (dealErr || !deal) {
    return { enqueued: false, reason: `deal not found: ${dealErr?.message ?? 'missing'}` };
  }

  const signedAt = deal.signed_at ? new Date(deal.signed_at as string) : new Date();

  // 2. Resolve athlete's HS profile (state + school) — no state, no disclosure.
  const { data: athlete, error: athleteErr } = await sb
    .from('athletes')
    .select('id, profile_id, first_name, last_name')
    .eq('id', deal.athlete_id)
    .maybeSingle();

  if (athleteErr || !athlete) {
    return { enqueued: false, reason: 'athlete record not found' };
  }

  const { data: hsProfile } = await sb
    .from('hs_athlete_profiles')
    .select('state_code, school_name')
    .eq('user_id', athlete.profile_id)
    .maybeSingle();

  if (!hsProfile?.state_code) {
    // Not an HS athlete (or profile not filled in). Silently skip.
    return { enqueued: false, reason: 'not an HS athlete profile' };
  }

  const state = hsProfile.state_code as USPSStateCode;
  const rules = STATE_RULES[state];
  if (!rules || rules.status === 'prohibited' || !rules.disclosureWindowHours) {
    return { enqueued: false, reason: `state ${state} has no disclosure window` };
  }

  const recipient = getDisclosureRecipient(state);
  if (!recipient) {
    return { enqueued: false, reason: `no disclosure recipient configured for ${state}` };
  }

  // 3. Schedule: signed_at + (window - slack). Minimum 1h from now.
  const windowMs = rules.disclosureWindowHours * 3600 * 1000;
  const slackMs = Math.min(OPS_SLACK_HOURS, rules.disclosureWindowHours / 2) * 3600 * 1000;
  const scheduledMs = Math.max(
    signedAt.getTime() + windowMs - slackMs,
    Date.now() + 3600 * 1000,
  );
  const scheduledFor = new Date(scheduledMs);

  // 4. Snapshot payload inputs on the row so the drain job can reconstruct
  //    the email without re-joining every table later.
  const payloadSnapshot = {
    dealId: deal.id,
    athleteId: deal.athlete_id,
    athleteName: [athlete.first_name, athlete.last_name].filter(Boolean).join(' ').trim(),
    schoolName: hsProfile.school_name,
    state,
    signedAt: signedAt.toISOString(),
    amount: (deal.compensation_amount as number) ?? 0,
    dealType: deal.deal_type ?? null,
  };

  const { data: inserted, error: insertErr } = await sb
    .from('hs_deal_disclosures')
    .insert({
      deal_id: deal.id,
      athlete_user_id: athlete.profile_id,
      state_code: state,
      scheduled_for: scheduledFor.toISOString(),
      recipient: recipient.email,
      payload: payloadSnapshot,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertErr || !inserted) {
    return { enqueued: false, reason: `insert failed: ${insertErr?.message}` };
  }

  return { enqueued: true, disclosureId: inserted.id };
}

// ----------------------------------------------------------------------------
// Drain — called by the hourly cron
// ----------------------------------------------------------------------------

const DRAIN_BATCH_LIMIT = 50;

interface PendingRow {
  id: string;
  deal_id: string;
  athlete_user_id: string;
  state_code: string;
  scheduled_for: string;
  recipient: string;
  payload: Record<string, unknown>;
  status: string;
}

export async function drainPendingDisclosures(): Promise<DrainResult> {
  const sb = getServiceRoleClient();
  const nowIso = new Date().toISOString();

  const { data: due, error } = await sb
    .from('hs_deal_disclosures')
    .select('id, deal_id, athlete_user_id, state_code, scheduled_for, recipient, payload, status')
    .eq('status', 'pending')
    .lte('scheduled_for', nowIso)
    .order('scheduled_for', { ascending: true })
    .limit(DRAIN_BATCH_LIMIT);

  if (error) {
    throw new Error(`[hs-nil disclosures] drain query failed: ${error.message}`);
  }

  const rows = (due ?? []) as PendingRow[];
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const state = row.state_code as USPSStateCode;
      const snapshot = row.payload as Record<string, unknown>;

      // Fetch parent consent name and counterparty name fresh — these are
      // small lookups and keep the snapshot narrow.
      const { data: consent } = await sb
        .from('parental_consents')
        .select('id, parent_full_name')
        .eq('athlete_user_id', row.athlete_user_id)
        .is('revoked_at', null)
        .order('signed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let counterpartyName = '(unknown brand)';
      const { data: deal } = await sb
        .from('deals')
        .select('brand_id')
        .eq('id', row.deal_id)
        .maybeSingle();
      if (deal?.brand_id) {
        const { data: brand } = await sb
          .from('brands')
          .select('company_name')
          .eq('id', deal.brand_id)
          .maybeSingle();
        if (brand?.company_name) counterpartyName = brand.company_name as string;
      }

      const signedAt = snapshot.signedAt
        ? new Date(snapshot.signedAt as string)
        : new Date();

      const payload = await buildDisclosurePayload({
        deal: {
          id: row.deal_id,
          counterpartyName,
          amount: (snapshot.amount as number) ?? 0,
          categories: snapshot.dealType ? [snapshot.dealType as string] : [],
          signedAt,
          consentRecordId: consent?.id ?? null,
          contractUrl: null,
        },
        athlete: {
          userId: row.athlete_user_id,
          fullName: (snapshot.athleteName as string) ?? '(unknown athlete)',
          schoolName: (snapshot.schoolName as string) ?? '(unknown school)',
        },
        parent: {
          fullName: consent?.parent_full_name ?? '(consent record not found)',
        },
        state,
      });

      const emailResult = await sendEmail({
        to: row.recipient,
        subject: payload.subject ?? 'HS-NIL Deal Disclosure',
        html: payload.body ?? '',
      });

      if (!emailResult.success) {
        throw new Error(emailResult.error ?? 'email send failed');
      }

      const { error: updateErr } = await sb
        .from('hs_deal_disclosures')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', row.id);

      if (updateErr) {
        throw new Error(`email sent but status update failed: ${updateErr.message}`);
      }

      sent++;
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.warn('[hs-nil disclosures] drain failure', {
        disclosureId: row.id,
        dealId: row.deal_id,
        state: row.state_code,
        error: message,
      });
      await sb
        .from('hs_deal_disclosures')
        .update({
          status: 'failed',
          failure_reason: message.slice(0, 500),
        })
        .eq('id', row.id);
    }
  }

  return { processed: rows.length, sent, failed };
}
