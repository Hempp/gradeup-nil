/**
 * Zod validation schemas for Contract API endpoints
 *
 * Provides input validation and sanitization for contract management operations.
 */

import { z } from 'zod';
import { uuidSchema, safeText, requiredSafeText, optionalDateSchema } from './common';

/* ===============================================================================
   ENUMS
   =============================================================================== */

/**
 * Valid contract statuses
 */
export const contractStatusEnum = z.enum([
  'draft',
  'pending_signature',
  'partially_signed',
  'fully_signed',
  'active',
  'expired',
  'cancelled',
  'voided',
]);

/**
 * Valid contract template types
 */
export const contractTemplateEnum = z.enum([
  'standard_endorsement',
  'social_media_campaign',
  'appearance_agreement',
  'merchandise_licensing',
  'autograph_session',
  'camp_participation',
  'custom',
]);

/**
 * Signature status for individual signers
 */
export const signatureStatusEnum = z.enum([
  'pending',
  'signed',
  'declined',
  'expired',
]);

/* ===============================================================================
   CLAUSE SCHEMAS
   =============================================================================== */

/**
 * Individual contract clause
 */
export const contractClauseSchema = z.object({
  id: z.string().optional(),
  title: requiredSafeText(200),
  content: requiredSafeText(5000),
  is_required: z.boolean().default(true),
  is_editable: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
});

/**
 * Signature party information
 */
export const signaturePartySchema = z.object({
  party_type: z.enum(['athlete', 'brand', 'guardian', 'witness']),
  user_id: uuidSchema.optional(),
  name: requiredSafeText(200),
  email: z.string().email('Invalid email format'),
  title: safeText(100).optional().nullable(),
  signed_at: z.string().datetime().optional().nullable(),
  signature_ip: z.string().max(45).optional().nullable(),
  signature_status: signatureStatusEnum.default('pending'),
});

/* ===============================================================================
   CONTRACT SCHEMAS
   =============================================================================== */

/**
 * Schema for creating a new contract
 */
export const createContractSchema = z.object({
  deal_id: uuidSchema,
  template_type: contractTemplateEnum.default('custom'),
  title: requiredSafeText(300),
  description: safeText(2000).optional().nullable(),
  effective_date: optionalDateSchema,
  expiration_date: optionalDateSchema,
  compensation_amount: z.number().min(0).max(100000000),
  compensation_terms: safeText(2000).optional().nullable(),
  deliverables_summary: safeText(3000).optional().nullable(),
  clauses: z.array(contractClauseSchema).max(50).optional(),
  parties: z.array(signaturePartySchema).min(2).max(10),
  custom_terms: safeText(10000).optional().nullable(),
  requires_guardian_signature: z.boolean().default(false),
  requires_witness: z.boolean().default(false),
});

/**
 * Schema for updating a contract
 */
export const updateContractSchema = z.object({
  title: safeText(300).optional(),
  description: safeText(2000).optional().nullable(),
  effective_date: optionalDateSchema,
  expiration_date: optionalDateSchema,
  compensation_amount: z.number().min(0).max(100000000).optional(),
  compensation_terms: safeText(2000).optional().nullable(),
  deliverables_summary: safeText(3000).optional().nullable(),
  clauses: z.array(contractClauseSchema).max(50).optional(),
  custom_terms: safeText(10000).optional().nullable(),
  status: contractStatusEnum.optional(),
});

/**
 * Schema for signing a contract
 */
export const signContractSchema = z.object({
  contract_id: uuidSchema,
  party_type: z.enum(['athlete', 'brand', 'guardian', 'witness']),
  signature_data: requiredSafeText(50000), // Base64 signature image or typed signature
  signature_type: z.enum(['drawn', 'typed', 'uploaded']).default('typed'),
  agreed_to_terms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms to sign the contract',
  }),
  ip_address: z.string().max(45).optional(),
});

/**
 * Schema for declining a contract signature
 */
export const declineContractSchema = z.object({
  contract_id: uuidSchema,
  reason: requiredSafeText(1000),
});

/**
 * Schema for voiding a contract
 */
export const voidContractSchema = z.object({
  contract_id: uuidSchema,
  reason: requiredSafeText(1000),
  notify_parties: z.boolean().default(true),
});

/**
 * Schema for contract filters (query params)
 */
export const contractFiltersSchema = z.object({
  deal_id: uuidSchema.optional(),
  athlete_id: uuidSchema.optional(),
  brand_id: uuidSchema.optional(),
  status: z.array(contractStatusEnum).optional(),
  template_type: z.array(contractTemplateEnum).optional(),
  from_date: optionalDateSchema,
  to_date: optionalDateSchema,
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(10),
});

/* ===============================================================================
   TYPES
   =============================================================================== */

export type ContractStatus = z.infer<typeof contractStatusEnum>;
export type ContractTemplate = z.infer<typeof contractTemplateEnum>;
export type SignatureStatus = z.infer<typeof signatureStatusEnum>;

export type ContractClause = z.infer<typeof contractClauseSchema>;
export type SignatureParty = z.infer<typeof signaturePartySchema>;

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type SignContractInput = z.infer<typeof signContractSchema>;
export type DeclineContractInput = z.infer<typeof declineContractSchema>;
export type VoidContractInput = z.infer<typeof voidContractSchema>;
export type ContractFilters = z.infer<typeof contractFiltersSchema>;
