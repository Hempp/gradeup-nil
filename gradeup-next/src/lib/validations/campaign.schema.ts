/**
 * Zod validation schemas for Campaign API endpoints
 *
 * Provides input validation and sanitization for campaign create/update operations.
 */

import { z } from 'zod';
import { uuidSchema, safeText, requiredSafeText, dateSchema, optionalDateSchema } from './common';

/* ===============================================================================
   ENUMS
   =============================================================================== */

/**
 * Valid campaign statuses
 */
export const campaignStatusEnum = z.enum([
  'draft',
  'active',
  'paused',
  'completed',
  'cancelled',
]);

/* ===============================================================================
   SCHEMAS
   =============================================================================== */

/**
 * Schema for creating a new campaign
 */
export const createCampaignSchema = z.object({
  title: requiredSafeText(200),
  description: safeText(5000).optional().nullable(),
  budget: z.number().min(0).max(100000000),
  start_date: dateSchema,
  end_date: optionalDateSchema,
  status: campaignStatusEnum.default('draft'),
  target_sports: z.array(uuidSchema).max(50).optional().nullable(),
  target_divisions: z.array(z.string().max(50)).max(10).optional().nullable(),
  target_min_gpa: z.number().min(0).max(4.0).optional().nullable(),
  target_min_followers: z.number().int().min(0).optional().nullable(),
});

/**
 * Schema for updating a campaign
 */
export const updateCampaignSchema = z.object({
  title: safeText(200).optional(),
  description: safeText(5000).optional().nullable(),
  budget: z.number().min(0).max(100000000).optional(),
  start_date: z.string().datetime().optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  end_date: optionalDateSchema,
  status: campaignStatusEnum.optional(),
  target_sports: z.array(uuidSchema).max(50).optional().nullable(),
  target_divisions: z.array(z.string().max(50)).max(10).optional().nullable(),
  target_min_gpa: z.number().min(0).max(4.0).optional().nullable(),
  target_min_followers: z.number().int().min(0).optional().nullable(),
});

/* ===============================================================================
   TYPES
   =============================================================================== */

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
