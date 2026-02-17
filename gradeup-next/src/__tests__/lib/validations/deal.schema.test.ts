/**
 * Tests for Deal validation schemas
 * @module __tests__/lib/validations/deal.schema.test
 */

import {
  createDealSchema,
  updateDealSchema,
  dealTypeEnum,
  dealStatusEnum,
  compensationTypeEnum,
} from '@/lib/validations/deal.schema';

describe('Deal Validation Schemas', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  describe('dealTypeEnum', () => {
    const validTypes = [
      'social_post', 'appearance', 'endorsement', 'licensing',
      'autograph', 'camp', 'speaking', 'merchandise', 'other',
    ];

    it('accepts all valid deal types', () => {
      validTypes.forEach((type) => {
        const result = dealTypeEnum.safeParse(type);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid deal types', () => {
      const invalidTypes = ['sponsorship', 'contract', 'partnership', ''];

      invalidTypes.forEach((type) => {
        const result = dealTypeEnum.safeParse(type);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('dealStatusEnum', () => {
    const validStatuses = [
      'draft', 'pending', 'accepted', 'rejected',
      'in_progress', 'completed', 'cancelled', 'disputed',
    ];

    it('accepts all valid deal statuses', () => {
      validStatuses.forEach((status) => {
        const result = dealStatusEnum.safeParse(status);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid deal statuses', () => {
      const invalidStatuses = ['active', 'expired', 'paused', ''];

      invalidStatuses.forEach((status) => {
        const result = dealStatusEnum.safeParse(status);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('compensationTypeEnum', () => {
    const validTypes = [
      'fixed', 'hourly', 'per_post', 'revenue_share', 'product', 'hybrid',
    ];

    it('accepts all valid compensation types', () => {
      validTypes.forEach((type) => {
        const result = compensationTypeEnum.safeParse(type);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid compensation types', () => {
      const invalidTypes = ['salary', 'commission', 'bonus', ''];

      invalidTypes.forEach((type) => {
        const result = compensationTypeEnum.safeParse(type);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('createDealSchema', () => {
    it('validates a complete deal', () => {
      const input = {
        athlete_id: validUuid,
        brand_id: validUuid,
        opportunity_id: validUuid,
        title: 'Social Media Campaign',
        description: 'A comprehensive campaign involving multiple posts',
        deal_type: 'social_post',
        compensation_amount: 5000,
        compensation_type: 'fixed',
        start_date: '2024-01-01',
        end_date: '2024-06-30',
        deliverables: ['Instagram post', 'Story mention', 'TikTok video'],
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

    it('rejects missing athlete_id', () => {
      const input = {
        brand_id: validUuid,
        title: 'Test Deal',
        deal_type: 'endorsement',
        compensation_amount: 1000,
      };

      const result = createDealSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects missing brand_id', () => {
      const input = {
        athlete_id: validUuid,
        title: 'Test Deal',
        deal_type: 'endorsement',
        compensation_amount: 1000,
      };

      const result = createDealSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects invalid athlete_id format', () => {
      const input = {
        athlete_id: 'not-a-uuid',
        brand_id: validUuid,
        title: 'Test Deal',
        deal_type: 'endorsement',
        compensation_amount: 1000,
      };

      const result = createDealSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects empty title', () => {
      const input = {
        athlete_id: validUuid,
        brand_id: validUuid,
        title: '',
        deal_type: 'endorsement',
        compensation_amount: 1000,
      };

      const result = createDealSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects whitespace-only title', () => {
      const input = {
        athlete_id: validUuid,
        brand_id: validUuid,
        title: '   ',
        deal_type: 'endorsement',
        compensation_amount: 1000,
      };

      const result = createDealSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects title exceeding 200 characters', () => {
      const input = {
        athlete_id: validUuid,
        brand_id: validUuid,
        title: 'A'.repeat(201),
        deal_type: 'endorsement',
        compensation_amount: 1000,
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

    it('rejects compensation amount over 100 million', () => {
      const input = {
        athlete_id: validUuid,
        brand_id: validUuid,
        title: 'Test Deal',
        deal_type: 'endorsement',
        compensation_amount: 100000001,
      };

      const result = createDealSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('accepts zero compensation amount', () => {
      const input = {
        athlete_id: validUuid,
        brand_id: validUuid,
        title: 'Product Exchange Deal',
        deal_type: 'merchandise',
        compensation_amount: 0,
        compensation_type: 'fixed',
      };

      const result = createDealSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('defaults compensation_type to fixed', () => {
      const input = {
        athlete_id: validUuid,
        brand_id: validUuid,
        title: 'Test Deal',
        deal_type: 'endorsement',
        compensation_amount: 1000,
      };

      const result = createDealSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.compensation_type).toBe('fixed');
      }
    });

    it('accepts ISO datetime format for dates', () => {
      const input = {
        athlete_id: validUuid,
        brand_id: validUuid,
        title: 'Test Deal',
        deal_type: 'endorsement',
        compensation_amount: 1000,
        start_date: '2024-01-15T10:30:00Z',
        end_date: '2024-06-15T10:30:00Z',
      };

      const result = createDealSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts YYYY-MM-DD format for dates', () => {
      const input = {
        athlete_id: validUuid,
        brand_id: validUuid,
        title: 'Test Deal',
        deal_type: 'endorsement',
        compensation_amount: 1000,
        start_date: '2024-01-15',
        end_date: '2024-06-15',
      };

      const result = createDealSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts null dates', () => {
      const input = {
        athlete_id: validUuid,
        brand_id: validUuid,
        title: 'Test Deal',
        deal_type: 'endorsement',
        compensation_amount: 1000,
        start_date: null,
        end_date: null,
      };

      const result = createDealSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts deliverables array', () => {
      const input = {
        athlete_id: validUuid,
        brand_id: validUuid,
        title: 'Test Deal',
        deal_type: 'social_post',
        compensation_amount: 1000,
        deliverables: ['Post 1', 'Post 2', 'Video'],
      };

      const result = createDealSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.deliverables).toHaveLength(3);
      }
    });

    it('rejects deliverables exceeding 50 items', () => {
      const input = {
        athlete_id: validUuid,
        brand_id: validUuid,
        title: 'Test Deal',
        deal_type: 'social_post',
        compensation_amount: 1000,
        deliverables: Array(51).fill('Deliverable'),
      };

      const result = createDealSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects deliverable item exceeding 500 characters', () => {
      const input = {
        athlete_id: validUuid,
        brand_id: validUuid,
        title: 'Test Deal',
        deal_type: 'social_post',
        compensation_amount: 1000,
        deliverables: ['A'.repeat(501)],
      };

      const result = createDealSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('allows null opportunity_id', () => {
      const input = {
        athlete_id: validUuid,
        brand_id: validUuid,
        title: 'Direct Deal',
        deal_type: 'endorsement',
        compensation_amount: 1000,
        opportunity_id: null,
      };

      const result = createDealSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates description length', () => {
      const input = {
        athlete_id: validUuid,
        brand_id: validUuid,
        title: 'Test Deal',
        deal_type: 'endorsement',
        compensation_amount: 1000,
        description: 'A'.repeat(5001),
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

    it('allows partial updates', () => {
      const input = {
        title: 'Updated Title',
        compensation_amount: 7500,
      };

      const result = updateDealSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates title when provided', () => {
      const input = {
        title: 'Valid Updated Title',
      };

      const result = updateDealSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects title exceeding 200 characters', () => {
      const input = {
        title: 'A'.repeat(201),
      };

      const result = updateDealSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates all deal types', () => {
      const dealTypes = [
        'social_post', 'appearance', 'endorsement', 'licensing',
        'autograph', 'camp', 'speaking', 'merchandise', 'other',
      ];

      dealTypes.forEach((deal_type) => {
        const input = { deal_type };
        const result = updateDealSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
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

    it('rejects invalid deal status', () => {
      const input = {
        status: 'active',
      };

      const result = updateDealSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates contract URL', () => {
      const input = {
        contract_url: 'https://example.com/contracts/deal-123.pdf',
      };

      const result = updateDealSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects invalid contract URL', () => {
      const input = {
        contract_url: 'not-a-valid-url',
      };

      const result = updateDealSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects contract URL exceeding 2000 characters', () => {
      const input = {
        contract_url: 'https://example.com/' + 'a'.repeat(2000),
      };

      const result = updateDealSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('allows null contract URL', () => {
      const input = {
        contract_url: null,
      };

      const result = updateDealSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates notes length', () => {
      const input = {
        notes: 'A'.repeat(2001),
      };

      const result = updateDealSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('allows notes within limit', () => {
      const input = {
        notes: 'Important note about the deal progress.',
      };

      const result = updateDealSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('allows null notes', () => {
      const input = {
        notes: null,
      };

      const result = updateDealSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates compensation amount range', () => {
      const input = {
        compensation_amount: 50000,
      };

      const result = updateDealSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects negative compensation amount', () => {
      const input = {
        compensation_amount: -500,
      };

      const result = updateDealSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('updates deliverables', () => {
      const input = {
        deliverables: ['New deliverable 1', 'New deliverable 2'],
      };

      const result = updateDealSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.deliverables).toHaveLength(2);
      }
    });

    it('allows null deliverables', () => {
      const input = {
        deliverables: null,
      };

      const result = updateDealSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});
