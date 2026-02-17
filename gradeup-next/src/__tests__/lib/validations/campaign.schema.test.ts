/**
 * Tests for Campaign validation schemas
 * @module __tests__/lib/validations/campaign.schema.test
 */

import {
  createCampaignSchema,
  updateCampaignSchema,
  campaignStatusEnum,
} from '@/lib/validations/campaign.schema';

describe('Campaign Validation Schemas', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  describe('campaignStatusEnum', () => {
    const validStatuses = ['draft', 'active', 'paused', 'completed', 'cancelled'];

    it('accepts all valid campaign statuses', () => {
      validStatuses.forEach((status) => {
        const result = campaignStatusEnum.safeParse(status);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid campaign statuses', () => {
      const invalidStatuses = ['pending', 'expired', 'scheduled', ''];

      invalidStatuses.forEach((status) => {
        const result = campaignStatusEnum.safeParse(status);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('createCampaignSchema', () => {
    it('validates a complete campaign', () => {
      const input = {
        title: 'Summer NIL Campaign 2024',
        description: 'A comprehensive summer campaign targeting college athletes',
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

    it('rejects missing title', () => {
      const input = {
        budget: 1000,
        start_date: '2024-01-01',
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects empty title', () => {
      const input = {
        title: '',
        budget: 1000,
        start_date: '2024-01-01',
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects whitespace-only title', () => {
      const input = {
        title: '   ',
        budget: 1000,
        start_date: '2024-01-01',
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects title exceeding 200 characters', () => {
      const input = {
        title: 'A'.repeat(201),
        budget: 1000,
        start_date: '2024-01-01',
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects missing budget', () => {
      const input = {
        title: 'Test Campaign',
        start_date: '2024-01-01',
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects negative budget', () => {
      const input = {
        title: 'Test Campaign',
        budget: -1000,
        start_date: '2024-01-01',
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects budget over 100 million', () => {
      const input = {
        title: 'Mega Campaign',
        budget: 100000001,
        start_date: '2024-01-01',
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('accepts zero budget', () => {
      const input = {
        title: 'Test Campaign',
        budget: 0,
        start_date: '2024-01-01',
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects missing start_date', () => {
      const input = {
        title: 'Test Campaign',
        budget: 1000,
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('accepts ISO datetime format for start_date', () => {
      const input = {
        title: 'Test Campaign',
        budget: 1000,
        start_date: '2024-01-15T10:30:00Z',
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts YYYY-MM-DD format for start_date', () => {
      const input = {
        title: 'Test Campaign',
        budget: 1000,
        start_date: '2024-01-15',
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects invalid start_date format', () => {
      const input = {
        title: 'Test Campaign',
        budget: 1000,
        start_date: '01-15-2024',
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('accepts null end_date', () => {
      const input = {
        title: 'Ongoing Campaign',
        budget: 1000,
        start_date: '2024-01-01',
        end_date: null,
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

    it('rejects invalid campaign status', () => {
      const input = {
        title: 'Test',
        budget: 1000,
        start_date: '2024-01-01',
        status: 'pending',
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates target_sports as array of UUIDs', () => {
      const input = {
        title: 'Test',
        budget: 1000,
        start_date: '2024-01-01',
        target_sports: [validUuid, '660e8400-e29b-41d4-a716-446655440001'],
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUIDs in target_sports', () => {
      const input = {
        title: 'Test',
        budget: 1000,
        start_date: '2024-01-01',
        target_sports: [validUuid, 'not-a-uuid'],
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects target_sports exceeding 50 items', () => {
      const input = {
        title: 'Test',
        budget: 1000,
        start_date: '2024-01-01',
        target_sports: Array(51).fill(validUuid),
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates target_divisions', () => {
      const input = {
        title: 'Test',
        budget: 1000,
        start_date: '2024-01-01',
        target_divisions: ['D1', 'D2', 'D3'],
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects target_divisions exceeding 10 items', () => {
      const input = {
        title: 'Test',
        budget: 1000,
        start_date: '2024-01-01',
        target_divisions: Array(11).fill('D1'),
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects division name exceeding 50 characters', () => {
      const input = {
        title: 'Test',
        budget: 1000,
        start_date: '2024-01-01',
        target_divisions: ['A'.repeat(51)],
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates target_min_gpa range', () => {
      const input = {
        title: 'Test',
        budget: 1000,
        start_date: '2024-01-01',
        target_min_gpa: 3.5,
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects target_min_gpa below 0', () => {
      const input = {
        title: 'Test',
        budget: 1000,
        start_date: '2024-01-01',
        target_min_gpa: -0.5,
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects target_min_gpa above 4.0', () => {
      const input = {
        title: 'Test',
        budget: 1000,
        start_date: '2024-01-01',
        target_min_gpa: 4.5,
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates target_min_followers', () => {
      const input = {
        title: 'Test',
        budget: 1000,
        start_date: '2024-01-01',
        target_min_followers: 50000,
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects negative target_min_followers', () => {
      const input = {
        title: 'Test',
        budget: 1000,
        start_date: '2024-01-01',
        target_min_followers: -100,
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates description length', () => {
      const input = {
        title: 'Test',
        budget: 1000,
        start_date: '2024-01-01',
        description: 'A'.repeat(5001),
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('allows null optional fields', () => {
      const input = {
        title: 'Test',
        budget: 1000,
        start_date: '2024-01-01',
        description: null,
        end_date: null,
        target_sports: null,
        target_divisions: null,
        target_min_gpa: null,
        target_min_followers: null,
      };

      const result = createCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
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
        title: 'Updated Campaign Title',
        budget: 75000,
      };

      const result = updateCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates title when provided', () => {
      const input = {
        title: 'Valid Updated Title',
      };

      const result = updateCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Valid Updated Title');
      }
    });

    it('rejects title exceeding 200 characters', () => {
      const input = {
        title: 'A'.repeat(201),
      };

      const result = updateCampaignSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates budget when provided', () => {
      const input = {
        budget: 100000,
      };

      const result = updateCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects negative budget', () => {
      const input = {
        budget: -5000,
      };

      const result = updateCampaignSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates all campaign statuses', () => {
      const statuses = ['draft', 'active', 'paused', 'completed', 'cancelled'];

      statuses.forEach((status) => {
        const input = { status };
        const result = updateCampaignSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid campaign status', () => {
      const input = {
        status: 'expired',
      };

      const result = updateCampaignSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('accepts ISO datetime for start_date', () => {
      const input = {
        start_date: '2024-02-15T10:30:00Z',
      };

      const result = updateCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts YYYY-MM-DD for start_date', () => {
      const input = {
        start_date: '2024-02-15',
      };

      const result = updateCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates end_date', () => {
      const input = {
        end_date: '2024-12-31',
      };

      const result = updateCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('allows null end_date', () => {
      const input = {
        end_date: null,
      };

      const result = updateCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('updates target_sports', () => {
      const input = {
        target_sports: [validUuid],
      };

      const result = updateCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('allows null target_sports', () => {
      const input = {
        target_sports: null,
      };

      const result = updateCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('updates target_divisions', () => {
      const input = {
        target_divisions: ['D1', 'D2'],
      };

      const result = updateCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('updates target_min_gpa', () => {
      const input = {
        target_min_gpa: 3.25,
      };

      const result = updateCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('allows null target_min_gpa', () => {
      const input = {
        target_min_gpa: null,
      };

      const result = updateCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('updates target_min_followers', () => {
      const input = {
        target_min_followers: 25000,
      };

      const result = updateCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('allows null target_min_followers', () => {
      const input = {
        target_min_followers: null,
      };

      const result = updateCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates description update', () => {
      const input = {
        description: 'Updated campaign description with new goals.',
      };

      const result = updateCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('allows null description', () => {
      const input = {
        description: null,
      };

      const result = updateCampaignSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});
