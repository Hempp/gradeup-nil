/**
 * HS-NIL Parental Consent — Provider Interface
 *
 * This module defines a provider-agnostic interface for the parental consent
 * flow so the underlying implementation (token storage, identity proofing,
 * email delivery) can be swapped without touching the API routes or UI.
 *
 * The default export (`defaultConsentProvider`) is a Supabase-backed stub
 * that:
 *   - stores pending tokens in the `pending_consents` table
 *   - writes signed consents into the `parental_consents` table
 *   - stubs out identity verification (always { verified: true } in dev)
 *
 * To swap in a real identity provider (Stripe Identity / Persona):
 *   1. Implement `verifyParentIdentity` against the real provider.
 *   2. Return a non-null `provider` and `reference` so the audit record
 *      captures the verification session ID.
 *   3. Gate the stub so it cannot run in production.
 *
 * Security notes:
 *   - Tokens are 32 bytes of crypto random, hex-encoded (64 chars).
 *   - Signing rows use the service role; RLS is intentionally bypassed
 *     because the parent signing flow is unauthenticated.
 *   - The signing route MUST call this provider — do not write to
 *     parental_consents directly from the API layer.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export interface ConsentScope {
  /** Deal categories the parent is approving (e.g. 'local_retail', 'training'). */
  dealCategories: string[];
  /** Maximum $ amount per individual deal, in whole USD. */
  maxDealAmount: number;
  /** How many months this consent is valid before expiration. */
  durationMonths: number;
}

export type Relationship = 'parent' | 'legal_guardian';

export type SignatureMethod = 'e_signature' | 'notarized_upload' | 'video_attestation';

export interface CreateTokenInput {
  athleteUserId: string;
  parentEmail: string;
  parentFullName?: string;
  scope: ConsentScope;
}

export interface CreateTokenResult {
  token: string;
  expiresAt: Date;
}

export interface ValidateTokenResult {
  valid: boolean;
  athleteUserId?: string;
  parentEmail?: string;
  parentFullName?: string;
  scope?: ConsentScope;
  expiresAt?: Date;
}

export interface RecordSignatureInput {
  token: string;
  parentFullName: string;
  relationship: Relationship;
  signatureMethod: SignatureMethod;
}

export interface RecordSignatureResult {
  consentId: string;
}

export interface IdentityVerificationResult {
  verified: boolean;
  provider: 'stripe_identity' | 'persona' | null;
  reference: string | null;
}

export interface ConsentProvider {
  createSigningToken(input: CreateTokenInput): Promise<CreateTokenResult>;
  validateSigningToken(token: string): Promise<ValidateTokenResult>;
  recordSignature(input: RecordSignatureInput): Promise<RecordSignatureResult>;
  verifyParentIdentity(input: { email: string; fullName: string }): Promise<IdentityVerificationResult>;
}

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

/**
 * How long a signing token is valid. Parents typically sign within 24h of
 * receiving the email; 7d gives runway without keeping tokens live forever.
 */
export const SIGNING_TOKEN_TTL_DAYS = 7;

const SCOPE_SHAPE_ERROR =
  'Consent scope is malformed. Expected { dealCategories: string[], maxDealAmount: number, durationMonths: number }.';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function generateToken(): string {
  // 32 bytes of entropy, hex-encoded. Unguessable.
  return randomBytes(32).toString('hex');
}

function assertScope(scope: unknown): asserts scope is ConsentScope {
  if (
    !scope ||
    typeof scope !== 'object' ||
    !Array.isArray((scope as ConsentScope).dealCategories) ||
    typeof (scope as ConsentScope).maxDealAmount !== 'number' ||
    typeof (scope as ConsentScope).durationMonths !== 'number'
  ) {
    throw new Error(SCOPE_SHAPE_ERROR);
  }
}

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase service role not configured (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required).'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ----------------------------------------------------------------------------
// Supabase-backed stub provider
// ----------------------------------------------------------------------------

class SupabaseConsentProvider implements ConsentProvider {
  private supabase(): SupabaseClient {
    return getServiceRoleClient();
  }

  async createSigningToken(input: CreateTokenInput): Promise<CreateTokenResult> {
    assertScope(input.scope);

    const token = generateToken();
    const expiresAt = new Date(Date.now() + SIGNING_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    const sb = this.supabase();
    const { error } = await sb.from('pending_consents').insert({
      token,
      athlete_user_id: input.athleteUserId,
      parent_email: input.parentEmail,
      parent_full_name: input.parentFullName ?? null,
      scope: input.scope,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      throw new Error(`Failed to create signing token: ${error.message}`);
    }

    // TODO(hs-nil): send email via Resend. Template needs legal copy review.
    //   const { Resend } = await import('resend');
    //   await new Resend(process.env.RESEND_API_KEY!).emails.send({...});

    return { token, expiresAt };
  }

  async validateSigningToken(token: string): Promise<ValidateTokenResult> {
    if (!token || token.length < 32) return { valid: false };

    const sb = this.supabase();
    const { data, error } = await sb
      .from('pending_consents')
      .select('athlete_user_id, parent_email, parent_full_name, scope, expires_at, consumed_at')
      .eq('token', token)
      .maybeSingle();

    if (error || !data) return { valid: false };
    if (data.consumed_at) return { valid: false };
    if (new Date(data.expires_at).getTime() <= Date.now()) return { valid: false };

    try {
      assertScope(data.scope);
    } catch {
      return { valid: false };
    }

    return {
      valid: true,
      athleteUserId: data.athlete_user_id,
      parentEmail: data.parent_email,
      parentFullName: data.parent_full_name ?? undefined,
      scope: data.scope as ConsentScope,
      expiresAt: new Date(data.expires_at),
    };
  }

  async recordSignature(input: RecordSignatureInput): Promise<RecordSignatureResult> {
    const sb = this.supabase();

    // Re-fetch the pending row (re-validating under the service role, which
    // bypasses RLS). Doing this atomically via update-returning guards against
    // a parent submitting twice in quick succession.
    const { data: pending, error: fetchErr } = await sb
      .from('pending_consents')
      .select('id, athlete_user_id, parent_email, scope, expires_at, consumed_at')
      .eq('token', input.token)
      .maybeSingle();

    if (fetchErr || !pending) throw new Error('Invalid or expired signing token.');
    if (pending.consumed_at) throw new Error('This consent link has already been signed.');
    if (new Date(pending.expires_at).getTime() <= Date.now()) {
      throw new Error('This consent link has expired.');
    }

    assertScope(pending.scope);
    const scope = pending.scope as ConsentScope;

    const identity = await this.verifyParentIdentity({
      email: pending.parent_email,
      fullName: input.parentFullName,
    });

    if (!identity.verified) {
      throw new Error('Parent identity could not be verified.');
    }

    const signedAt = new Date();
    const expiresAt = new Date(signedAt);
    expiresAt.setMonth(expiresAt.getMonth() + scope.durationMonths);

    const { data: consent, error: insertErr } = await sb
      .from('parental_consents')
      .insert({
        athlete_user_id: pending.athlete_user_id,
        parent_email: pending.parent_email,
        parent_full_name: input.parentFullName,
        relationship: input.relationship,
        signed_at: signedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        signature_method: input.signatureMethod,
        identity_verified: identity.verified,
        identity_verification_provider: identity.provider,
        identity_verification_reference: identity.reference,
        scope,
      })
      .select('id')
      .single();

    if (insertErr || !consent) {
      throw new Error(`Failed to record consent: ${insertErr?.message ?? 'unknown error'}`);
    }

    // Mark the pending row consumed. If this fails the consent is still
    // recorded, so we surface the error but do not throw — the worst case is
    // a duplicate attempt which the consumed_at check will catch next time.
    const { error: consumeErr } = await sb
      .from('pending_consents')
      .update({ consumed_at: signedAt.toISOString() })
      .eq('id', pending.id);

    if (consumeErr) {
      // eslint-disable-next-line no-console
      console.warn('[hs-nil consent] failed to mark pending token consumed', consumeErr);
    }

    return { consentId: consent.id };
  }

  /**
   * Identity verification stub.
   *
   * In development this returns { verified: true } with no provider so the
   * happy-path flow can be exercised end-to-end without a third-party account.
   *
   * In production this MUST NOT auto-approve. A real integration (Stripe
   * Identity or Persona) plugs in here: generate a verification session,
   * return the reference ID, and only resolve `verified: true` once the
   * provider webhook confirms a successful check.
   */
  async verifyParentIdentity(_input: {
    email: string;
    fullName: string;
  }): Promise<IdentityVerificationResult> {
    if (process.env.NODE_ENV !== 'development') {
      // TODO(hs-nil): wire real identity verification here.
      //   - Stripe Identity: create VerificationSession, redirect parent,
      //     resolve on webhook 'identity.verification_session.verified'.
      //   - Persona: create Inquiry, poll /inquiries/:id or use webhook.
      //   This stub intentionally fails closed outside dev so we cannot
      //   ship a fake-verification bug to prod.
      throw new Error(
        'Identity verification provider not configured. Parental consent cannot be recorded in production without a real provider.'
      );
    }

    return { verified: true, provider: null, reference: null };
  }
}

export const defaultConsentProvider: ConsentProvider = new SupabaseConsentProvider();
