/**
 * Zod validation schemas for Brand API endpoints
 *
 * Provides input validation and sanitization for brand create/update operations.
 */

import { z } from 'zod';
import { safeText, requiredSafeText } from './common';

/* ===============================================================================
   ENUMS
   =============================================================================== */

/**
 * Valid brand industry types
 */
export const brandIndustryEnum = z.enum([
  'sports_apparel',
  'sports_equipment',
  'food_beverage',
  'fitness',
  'technology',
  'automotive',
  'financial_services',
  'entertainment',
  'healthcare',
  'education',
  'retail',
  'media',
  'other',
]);

/**
 * Valid brand verification statuses
 */
export const brandVerificationStatusEnum = z.enum([
  'pending',
  'verified',
  'rejected',
]);

/* ===============================================================================
   SCHEMAS
   =============================================================================== */

/**
 * Schema for creating a new brand profile
 */
export const createBrandSchema = z.object({
  company_name: requiredSafeText(200),
  description: safeText(2000).optional().nullable(),
  industry: brandIndustryEnum.optional().nullable(),
  website: z.string().url().max(500).optional().nullable(),
  logo_url: z.string().url().max(500).optional().nullable(),
  contact_name: safeText(100).optional().nullable(),
  contact_email: z.string().email().max(254).optional().nullable(),
  contact_phone: z.string().max(20).optional().nullable(),
  address_line1: safeText(200).optional().nullable(),
  address_line2: safeText(200).optional().nullable(),
  city: safeText(100).optional().nullable(),
  state: safeText(50).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  country: safeText(100).optional().nullable(),
  tax_id: z.string().max(50).optional().nullable(),
});

/**
 * Schema for updating a brand profile
 */
export const updateBrandSchema = z.object({
  company_name: safeText(200).optional(),
  description: safeText(2000).optional().nullable(),
  industry: brandIndustryEnum.optional().nullable(),
  website: z.string().url().max(500).optional().nullable(),
  logo_url: z.string().url().max(500).optional().nullable(),
  contact_name: safeText(100).optional().nullable(),
  contact_email: z.string().email().max(254).optional().nullable(),
  contact_phone: z.string().max(20).optional().nullable(),
  address_line1: safeText(200).optional().nullable(),
  address_line2: safeText(200).optional().nullable(),
  city: safeText(100).optional().nullable(),
  state: safeText(50).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  country: safeText(100).optional().nullable(),
  // Note: tax_id and verification_status should not be updated by regular users
});

/**
 * Schema for admin brand verification update
 */
export const adminUpdateBrandSchema = updateBrandSchema.extend({
  tax_id: z.string().max(50).optional().nullable(),
  verification_status: brandVerificationStatusEnum.optional(),
  verified_at: z.string().datetime().optional().nullable(),
});

/* ===============================================================================
   TYPES
   =============================================================================== */

export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
export type AdminUpdateBrandInput = z.infer<typeof adminUpdateBrandSchema>;
