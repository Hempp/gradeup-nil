/**
 * HS-NIL Parental Consent — Service Layer
 *
 * Thin business-logic wrapper around the provider interface. Keeps the API
 * routes declarative and makes the provider swappable (Stripe Identity,
 * Persona, custom) in one place.
 */

import { z } from 'zod';
import {
  defaultConsentProvider,
  type ConsentProvider,
  type ConsentScope,
  type CreateTokenResult,
  type RecordSignatureResult,
  type ValidateTokenResult,
} from '@/lib/hs-nil/consent-provider';

// ----------------------------------------------------------------------------
// Shared validation schemas
// ----------------------------------------------------------------------------

export const consentScopeSchema = z
  .object({
    dealCategories: z.array(z.string().min(1).max(64)).min(1).max(32),
    maxDealAmount: z.number().int().positive().max(1_000_000),
    durationMonths: z.number().int().min(1).max(24),
  })
  .strict();

export const initiateConsentSchema = z
  .object({
    parentEmail: z.string().email().max(254),
    parentFullName: z.string().min(2).max(200).trim(),
    scope: consentScopeSchema,
  })
  .strict();

export const signConsentSchema = z
  .object({
    parentFullName: z.string().min(2).max(200).trim(),
    relationship: z.enum(['parent', 'legal_guardian']),
    signatureAcknowledged: z.literal(true),
    scopeAcknowledged: z.literal(true),
    signatureMethod: z.enum(['e_signature', 'notarized_upload', 'video_attestation']),
  })
  .strict();

export type InitiateConsentInput = z.infer<typeof initiateConsentSchema>;
export type SignConsentInput = z.infer<typeof signConsentSchema>;

// ----------------------------------------------------------------------------
// Service functions
// ----------------------------------------------------------------------------

/**
 * Athlete-initiated: generate a signing token and persist a pending-consent
 * row. Returns the token + expiration (caller is responsible for sending
 * the email to the parent; TODO in the provider for the Resend hookup).
 */
export async function initiateConsent(
  input: { athleteUserId: string } & InitiateConsentInput,
  provider: ConsentProvider = defaultConsentProvider
): Promise<CreateTokenResult> {
  return provider.createSigningToken({
    athleteUserId: input.athleteUserId,
    parentEmail: input.parentEmail,
    parentFullName: input.parentFullName,
    scope: input.scope,
  });
}

/**
 * Parent-side: fetch the consent details for the signing page UI. Does NOT
 * expose the athlete email or other PII beyond what the parent needs to
 * confirm they are signing the right thing.
 */
export async function getConsentForSigning(
  token: string,
  provider: ConsentProvider = defaultConsentProvider
): Promise<ValidateTokenResult> {
  return provider.validateSigningToken(token);
}

/**
 * Parent-side: record the signature.
 */
export async function signConsent(
  token: string,
  input: SignConsentInput,
  provider: ConsentProvider = defaultConsentProvider
): Promise<RecordSignatureResult> {
  return provider.recordSignature({
    token,
    parentFullName: input.parentFullName,
    relationship: input.relationship,
    signatureMethod: input.signatureMethod,
  });
}

// Re-export the scope type for UI code.
export type { ConsentScope };
