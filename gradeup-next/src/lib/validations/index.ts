/**
 * Validation Schemas Index
 *
 * Re-exports all validation schemas and utilities for easy importing.
 *
 * Usage:
 *   import { createAthleteSchema, validateInput, formatValidationError } from '@/lib/validations';
 */

// Common utilities
export { validateInput, formatValidationError, uuidSchema, safeText, requiredSafeText, dateSchema, optionalDateSchema } from './common';

// Athlete schemas
export { createAthleteSchema, updateAthleteSchema, academicYearEnum } from './athlete.schema';
export type { CreateAthleteInput, UpdateAthleteInput } from './athlete.schema';

// Deal schemas
export { createDealSchema, updateDealSchema, dealTypeEnum, dealStatusEnum, compensationTypeEnum } from './deal.schema';
export type { CreateDealInput, UpdateDealInput } from './deal.schema';

// Campaign schemas
export { createCampaignSchema, updateCampaignSchema, campaignStatusEnum } from './campaign.schema';
export type { CreateCampaignInput, UpdateCampaignInput } from './campaign.schema';

// Brand schemas
export { createBrandSchema, updateBrandSchema, adminUpdateBrandSchema, brandIndustryEnum, brandVerificationStatusEnum } from './brand.schema';
export type { CreateBrandInput, UpdateBrandInput, AdminUpdateBrandInput } from './brand.schema';

// Contract schemas
export {
  createContractSchema,
  updateContractSchema,
  signContractSchema,
  declineContractSchema,
  voidContractSchema,
  contractFiltersSchema,
  contractStatusEnum,
  contractTemplateEnum,
  signatureStatusEnum,
  contractClauseSchema,
  signaturePartySchema,
} from './contract.schema';
export type {
  ContractStatus,
  ContractTemplate,
  SignatureStatus,
  ContractClause,
  SignatureParty,
  CreateContractInput,
  UpdateContractInput,
  SignContractInput,
  DeclineContractInput,
  VoidContractInput,
  ContractFilters,
} from './contract.schema';
