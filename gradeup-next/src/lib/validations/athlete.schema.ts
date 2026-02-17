/**
 * Zod validation schemas for Athlete API endpoints
 *
 * Provides input validation and sanitization for athlete create/update operations.
 */

import { z } from 'zod';
import { uuidSchema, safeText } from './common';

/* ===============================================================================
   ENUMS
   =============================================================================== */

/**
 * Valid academic years for student athletes
 */
export const academicYearEnum = z.enum([
  'freshman',
  'sophomore',
  'junior',
  'senior',
  'graduate',
  'redshirt_freshman',
  'redshirt_sophomore',
  'redshirt_junior',
  'redshirt_senior',
]);

/* ===============================================================================
   SCHEMAS
   =============================================================================== */

/**
 * Schema for creating a new athlete profile
 */
export const createAthleteSchema = z.object({
  school_id: uuidSchema,
  sport_id: uuidSchema,
  position: safeText(100).optional(),
  jersey_number: z.string().max(10).optional(),
  academic_year: academicYearEnum.optional(),
  gpa: z.number().min(0).max(4.0).optional()
    .or(z.string().transform((val) => {
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error('Invalid GPA');
      return num;
    }).pipe(z.number().min(0).max(4.0))),
  major: safeText(200).optional(),
  hometown: safeText(200).optional(),
  height_inches: z.number().int().min(36).max(108).optional()
    .or(z.string().transform((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num)) throw new Error('Invalid height');
      return num;
    }).pipe(z.number().int().min(36).max(108)).optional()),
  weight_lbs: z.number().int().min(50).max(500).optional()
    .or(z.string().transform((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num)) throw new Error('Invalid weight');
      return num;
    }).pipe(z.number().int().min(50).max(500)).optional()),
  is_searchable: z.boolean().default(true),
});

/**
 * Schema for updating an athlete profile
 */
export const updateAthleteSchema = z.object({
  school_id: uuidSchema.optional(),
  sport_id: uuidSchema.optional(),
  position: safeText(100).optional().nullable(),
  jersey_number: z.string().max(10).optional().nullable(),
  academic_year: academicYearEnum.optional().nullable(),
  gpa: z.number().min(0).max(4.0).optional().nullable()
    .or(z.string().transform((val) => {
      if (!val) return null;
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error('Invalid GPA');
      return num;
    }).pipe(z.number().min(0).max(4.0).nullable()).optional()),
  major: safeText(200).optional().nullable(),
  hometown: safeText(200).optional().nullable(),
  height_inches: z.number().int().min(36).max(108).optional().nullable()
    .or(z.string().transform((val) => {
      if (!val) return null;
      const num = parseInt(val, 10);
      if (isNaN(num)) throw new Error('Invalid height');
      return num;
    }).pipe(z.number().int().min(36).max(108).nullable()).optional()),
  weight_lbs: z.number().int().min(50).max(500).optional().nullable()
    .or(z.string().transform((val) => {
      if (!val) return null;
      const num = parseInt(val, 10);
      if (isNaN(num)) throw new Error('Invalid weight');
      return num;
    }).pipe(z.number().int().min(50).max(500).nullable()).optional()),
  is_searchable: z.boolean().optional(),
  nil_valuation: z.number().min(0).max(100000000).optional().nullable(),
  social_followers: z.number().int().min(0).optional().nullable(),
  instagram_handle: safeText(30).optional().nullable(),
  twitter_handle: safeText(15).optional().nullable(),
  tiktok_handle: safeText(24).optional().nullable(),
});

/* ===============================================================================
   TYPES
   =============================================================================== */

export type CreateAthleteInput = z.infer<typeof createAthleteSchema>;
export type UpdateAthleteInput = z.infer<typeof updateAthleteSchema>;
