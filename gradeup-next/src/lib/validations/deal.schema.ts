/**
 * Zod validation schemas for Deal API endpoints
 *
 * Provides input validation and sanitization for deal create/update operations.
 */

import { z } from 'zod';
import { uuidSchema, safeText, requiredSafeText, optionalDateSchema } from './common';

/* ===============================================================================
   ENUMS
   =============================================================================== */

/**
 * Valid deal types
 */
export const dealTypeEnum = z.enum([
  'social_post',
  'appearance',
  'endorsement',
  'licensing',
  'autograph',
  'camp',
  'speaking',
  'merchandise',
  'other',
]);

/**
 * Valid deal statuses
 */
export const dealStatusEnum = z.enum([
  'draft',
  'pending',
  'accepted',
  'rejected',
  'in_progress',
  'completed',
  'cancelled',
  'disputed',
]);

/**
 * Valid compensation types
 */
export const compensationTypeEnum = z.enum([
  'fixed',
  'hourly',
  'per_post',
  'revenue_share',
  'product',
  'hybrid',
]);

/* ===============================================================================
   SCHEMAS
   =============================================================================== */

/**
 * Schema for creating a new deal
 */
export const createDealSchema = z.object({
  athlete_id: uuidSchema,
  brand_id: uuidSchema,
  opportunity_id: uuidSchema.optional().nullable(),
  title: requiredSafeText(200),
  description: safeText(5000).optional().nullable(),
  deal_type: dealTypeEnum,
  compensation_amount: z.number().min(0).max(100000000),
  compensation_type: compensationTypeEnum.default('fixed'),
  start_date: optionalDateSchema,
  end_date: optionalDateSchema,
  deliverables: z.array(safeText(500)).max(50).optional().nullable(),
});

/**
 * Schema for updating a deal
 */
export const updateDealSchema = z.object({
  title: safeText(200).optional(),
  description: safeText(5000).optional().nullable(),
  deal_type: dealTypeEnum.optional(),
  compensation_amount: z.number().min(0).max(100000000).optional(),
  compensation_type: compensationTypeEnum.optional(),
  start_date: optionalDateSchema,
  end_date: optionalDateSchema,
  deliverables: z.array(safeText(500)).max(50).optional().nullable(),
  status: dealStatusEnum.optional(),
  notes: safeText(2000).optional().nullable(),
  contract_url: z.string().url().max(2000).optional().nullable(),
});

/* ===============================================================================
   TYPES
   =============================================================================== */

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
