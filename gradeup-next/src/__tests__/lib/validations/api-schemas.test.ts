/**
 * Tests for API validation schemas
 * @module __tests__/lib/validations/api-schemas.test
 */

import {
  createAthleteSchema,
  updateAthleteSchema,
  createDealSchema,
  updateDealSchema,
  createCampaignSchema,
  updateCampaignSchema,
  validateInput,
  formatValidationError,
} from '@/lib/validations/api-schemas';

describe('API Validation Schemas', () => {
  describe('createAthleteSchema', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';

    it('validates a complete athlete profile', () => {
      const input = {
        school_id: validUuid,
        sport_id: validUuid,
        position: 'Point Guard',
        jersey_number: '23',
        academic_year: 'junior',
        gpa: 3.8,
        major: 'Computer Science',
        hometown: 'Chicago, IL',
        height_inches: 75,
        weight_lbs: 185,
        is_searchable: true,
      };

      const result = createAthleteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates minimum required fields', () => {
      const input = {
        school_id: validUuid,
        sport_id: validUuid,
      };

      const result = createAthleteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects invalid school_id format', () => {
      const input = {
        school_id: 'not-a-uuid',
        sport_id: validUuid,
      };

      const result = createAthleteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects invalid sport_id format', () => {
      const input = {
        school_id: validUuid,
        sport_id: 'invalid',
      };

      const result = createAthleteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates GPA as number', () => {
      const input = {
        school_id: validUuid,
        sport_id: validUuid,
        gpa: 3.5,
      };

      const result = createAthleteSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gpa).toBe(3.5);
      }
    });

    it('transforms GPA from string to number', () => {
      const input = {
        school_id: validUuid,
        sport_id: validUuid,
        gpa: '3.75',
      };

      const result = createAthleteSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gpa).toBe(3.75);
      }
    });

    it('rejects GPA below 0', () => {
      const input = {
        school_id: validUuid,
        sport_id: validUuid,
        gpa: -0.5,
      };

      const result = createAthleteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects GPA above 4.0', () => {
      const input = {
        school_id: validUuid,
        sport_id: validUuid,
        gpa: 4.5,
      };

      const result = createAthleteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates all academic years', () => {
      const academicYears = [
        'freshman', 'sophomore', 'junior', 'senior', 'graduate',
        'redshirt_freshman', 'redshirt_sophomore', 'redshirt_junior', 'redshirt_senior',
      ];

      academicYears.forEach((year) => {
        const input = {
          school_id: validUuid,
          sport_id: validUuid,
          academic_year: year,
        };

        const result = createAthleteSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid academic year', () => {
      const input = {
        school_id: validUuid,
        sport_id: validUuid,
        academic_year: 'super_senior',
      };

      const result = createAthleteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates height range', () => {
      const input = {
        school_id: validUuid,
        sport_id: validUuid,
        height_inches: 72,
      };

      const result = createAthleteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects height below 36 inches', () => {
      const input = {
        school_id: validUuid,
        sport_id: validUuid,
        height_inches: 30,
      };

      const result = createAthleteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects height above 108 inches', () => {
      const input = {
        school_id: validUuid,
        sport_id: validUuid,
        height_inches: 120,
      };

      const result = createAthleteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates weight range', () => {
      const input = {
        school_id: validUuid,
        sport_id: validUuid,
        weight_lbs: 200,
      };

      const result = createAthleteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects weight below 50 lbs', () => {
      const input = {
        school_id: validUuid,
        sport_id: validUuid,
        weight_lbs: 40,
      };

      const result = createAthleteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('strips control characters from text fields', () => {
      const input = {
        school_id: validUuid,
        sport_id: validUuid,
        position: 'Point\x00Guard',
        major: 'Computer\x1FScience',
      };

      const result = createAthleteSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.position).toBe('PointGuard');
        expect(result.data.major).toBe('ComputerScience');
      }
    });

    it('defaults is_searchable to true', () => {
      const input = {
        school_id: validUuid,
        sport_id: validUuid,
      };

      const result = createAthleteSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_searchable).toBe(true);
      }
    });
  });

  describe('updateAthleteSchema', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';

    it('allows empty update', () => {
      const input = {};

      const result = updateAthleteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('allows partial updates', () => {
      const input = {
        position: 'Shooting Guard',
        gpa: 3.9,
      };

      const result = updateAthleteSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.position).toBe('Shooting Guard');
        expect(result.data.gpa).toBe(3.9);
      }
    });

    it('allows nullable fields', () => {
      const input = {
        position: null,
        major: null,
        hometown: null,
      };

      const result = updateAthleteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates social handles length', () => {
      const input = {
        instagram_handle: 'johnsmith123',
        twitter_handle: 'johnsmith',
        tiktok_handle: 'johnsmith_athlete',
      };

      const result = updateAthleteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects instagram handle over 30 characters', () => {
      const input = {
        instagram_handle: 'a'.repeat(31),
      };

      const result = updateAthleteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects twitter handle over 15 characters', () => {
      const input = {
        twitter_handle: 'a'.repeat(16),
      };

      const result = updateAthleteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates nil_valuation range', () => {
      const input = {
        nil_valuation: 50000,
      };

      const result = updateAthleteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects negative nil_valuation', () => {
      const input = {
        nil_valuation: -1000,
      };

      const result = updateAthleteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('createDealSchema', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';

    it('validates a complete deal', () => {
      const input = {
        athlete_id: validUuid,
        brand_id: validUuid,
        title: 'Social Media Campaign',
        deal_type: 'social_post',
        compensation_amount: 5000,
        compensation_type: 'fixed',
        start_date: '2024-01-01',
        end_date: '2024-06-30',
        deliverables: ['Instagram post', 'Story mention'],
      };

      const result = createDealSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates minimum required fields', () => {
      const input = {
        athlete_id: validUuid,
        brand_id: validUuid,
        title: 'Test Deal',
        deal_type: 'endorsement',
        compensation_amount: 1000,
      };

      const result = createDealSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates all deal types', () => {
      const dealTypes = [
        'social_post', 'appearance', 'endorsement', 'licensing',
        'autograph', 'camp', 'speaking', 'merchandise', 'other',
      ];

      dealTypes.forEach((type) => {
        const input = {
          athlete_id: validUuid,
          brand_id: validUuid,
          title: 'Test',
          deal_type: type,
          compensation_amount: 100,
        };

        const result = createDealSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('validates all compensation types', () => {
      const compensationTypes = [
        'fixed', 'hourly', 'per_post', 'revenue_share', 'product', 'hybrid',
      ];

      compensationTypes.forEach((type) => {
        const input = {
          athlete_id: validUuid,
          brand_id: validUuid,
          title: 'Test',
          deal_type: 'endorsement',
          compensation_amount: 100,
          compensation_type: type,
        };

        const result = createDealSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('rejects empty title', () => {
      const input = {
        athlete_id: validUuid,
        brand_id: validUuid,
        title: '',
        deal_type: 'endorsement',
        compensation_amount: 100,
      };

      const result = createDealSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects title with only whitespace', () => {
      const input = {
        athlete_id: validUuid,
        brand_id: validUuid,
        title: '   ',
        deal_type: 'endorsement',
        compensation_amount: 100,
      };

      const result = createDealSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects negative compensation amount', () => {
      const input = {
        athlete_id: validUuid,
        brand_id: validUuid,
        title: 'Test Deal',
        deal_type: 'endorsement',
        compensation_amount: -100,
      };

      const result = createDealSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('accepts datetime format for dates', () => {
      const input = {
        athlete_id: validUuid,
        brand_id: validUuid,
        title: 'Test Deal',
        deal_type: 'endorsement',
        compensation_amount: 100,
        start_date: '2024-01-01T00:00:00.000Z',
      };

      const result = createDealSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('limits deliverables to 50 items', () => {
      const input = {
        athlete_id: validUuid,
        brand_id: validUuid,
        title: 'Test Deal',
        deal_type: 'endorsement',
        compensation_amount: 100,
        deliverables: Array(51).fill('Deliverable'),
      };

      const result = createDealSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('updateDealSchema', () => {
    it('allows empty update', () => {
      const input = {};

      const result = updateDealSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates all deal statuses', () => {
      const statuses = [
        'draft', 'pending', 'accepted', 'rejected',
        'in_progress', 'completed', 'cancelled', 'disputed',
      ];

      statuses.forEach((status) => {
        const input = { status };

        const result = updateDealSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('validates contract URL', () => {
      const input = {
        contract_url: 'https://example.com/contract.pdf',
      };

      const result = updateDealSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects invalid contract URL', () => {
      const input = {
        contract_url: 'not-a-url',
      };

      const result = updateDealSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('limits notes to 2000 characters', () => {
      const input = {
        notes: 'a'.repeat(2001),
      };

      const result = updateDealSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('createCampaignSchema', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';

    it('validates a complete campaign', () => {
      const input = {
        title: 'Summer NIL Campaign',
        description: 'A campaign for summer sports',
        budget: 50000,
        start_date: '2024-06-01',
        end_date: '2024-08-31',
        status: 'draft',
        target_sports: [validUuid],
        target_divisions: ['D1', 'D2'],
        target_min_gpa: 3.0,
        target_min_followers: 10000,
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates minimum required fields', () => {
      const input = {
        title: 'Test Campaign',
        budget: 1000,
        start_date: '2024-01-01',
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('defaults status to draft', () => {
      const input = {
        title: 'Test Campaign',
        budget: 1000,
        start_date: '2024-01-01',
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('draft');
      }
    });

    it('validates all campaign statuses', () => {
      const statuses = ['draft', 'active', 'paused', 'completed', 'cancelled'];

      statuses.forEach((status) => {
        const input = {
          title: 'Test',
          budget: 1000,
          start_date: '2024-01-01',
          status,
        };

        const result = createCampaignSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('rejects budget over 100 million', () => {
      const input = {
        title: 'Big Campaign',
        budget: 100000001,
        start_date: '2024-01-01',
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('limits target_sports to 50 items', () => {
      const input = {
        title: 'Test',
        budget: 1000,
        start_date: '2024-01-01',
        target_sports: Array(51).fill(validUuid),
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('limits target_divisions to 10 items', () => {
      const input = {
        title: 'Test',
        budget: 1000,
        start_date: '2024-01-01',
        target_divisions: Array(11).fill('D1'),
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('updateCampaignSchema', () => {
    it('allows empty update', () => {
      const input = {};

      const result = updateCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('allows partial updates', () => {
      const input = {
        title: 'Updated Title',
        budget: 75000,
      };

      const result = updateCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('validateInput helper', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';

    it('returns success with data for valid input', () => {
      const input = {
        school_id: validUuid,
        sport_id: validUuid,
      };

      const result = validateInput(createAthleteSchema, input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.school_id).toBe(validUuid);
      }
    });

    it('returns errors for invalid input', () => {
      const input = {
        school_id: 'invalid-uuid',
        sport_id: validUuid,
      };

      const result = validateInput(createAthleteSchema, input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toHaveProperty('school_id');
      }
    });

    it('groups multiple errors by field', () => {
      const input = {
        school_id: 'invalid',
        sport_id: 'invalid',
      };

      const result = validateInput(createAthleteSchema, input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('formatValidationError helper', () => {
    it('formats single field error', () => {
      const errors = {
        school_id: ['Invalid ID format'],
      };

      const result = formatValidationError(errors);
      expect(result).toBe('Validation failed: school_id: Invalid ID format');
    });

    it('formats multiple field errors', () => {
      const errors = {
        school_id: ['Invalid ID format'],
        gpa: ['Must be between 0 and 4.0'],
      };

      const result = formatValidationError(errors);
      expect(result).toContain('school_id: Invalid ID format');
      expect(result).toContain('gpa: Must be between 0 and 4.0');
    });

    it('formats multiple errors on same field', () => {
      const errors = {
        title: ['Required', 'Must be at least 3 characters'],
      };

      const result = formatValidationError(errors);
      expect(result).toBe('Validation failed: title: Required, Must be at least 3 characters');
    });
  });
});
