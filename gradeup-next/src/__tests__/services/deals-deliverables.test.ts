/**
 * Tests for the deals service - deliverable functions
 * @module __tests__/services/deals-deliverables.test
 */

import {
  getCampaignDeliverables,
  getDeliverableById,
  updateDeliverableStatus,
  submitDeliverable,
  requestDeliverableRevision,
  createDeliverable,
  deleteDeliverable,
  type Deliverable,
  type DeliverableStatus,
  type ContentPlatform,
  type ContentType,
  type CreateDeliverableInput,
} from '@/lib/services/deals';

// Mock the Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@/lib/supabase/client';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Helper to create a chainable mock query builder
function createChainableQuery(finalResult: { data: unknown; error: unknown; code?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockQuery: any = {};

  const chainableMethods = ['select', 'eq', 'in', 'order', 'update', 'insert', 'delete'];
  chainableMethods.forEach((method) => {
    mockQuery[method] = jest.fn().mockReturnValue(mockQuery);
  });

  mockQuery.single = jest.fn().mockResolvedValue(finalResult);

  mockQuery.then = (onFulfilled: (value: unknown) => unknown) => {
    return Promise.resolve(finalResult).then(onFulfilled);
  };

  return mockQuery;
}

// Sample test data
const mockDeliverable: Deliverable = {
  id: 'deliverable-123',
  deal_id: 'deal-123',
  athlete_id: 'athlete-123',
  campaign_id: 'campaign-123',
  platform: 'instagram',
  content_type: 'reel',
  title: 'Brand Promotion Reel',
  description: 'Create a 30-second reel showcasing the product',
  requirements: 'Include brand hashtag and product tag',
  status: 'pending',
  due_date: '2024-02-15',
  submitted_at: null,
  reviewed_at: null,
  content_url: null,
  draft_url: null,
  feedback: null,
  reviewed_by: null,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  athlete: {
    id: 'athlete-123',
    first_name: 'John',
    last_name: 'Doe',
    avatar_url: 'https://example.com/avatar.jpg',
  },
};

describe('deals service - deliverables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCampaignDeliverables', () => {
    it('returns deliverables for a campaign', async () => {
      const mockQuery = createChainableQuery({
        data: [mockDeliverable],
        error: null,
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getCampaignDeliverables('campaign-123');

      expect(result.data).toEqual([mockDeliverable]);
      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('deliverables');
      expect(mockQuery.eq).toHaveBeenCalledWith('campaign_id', 'campaign-123');
    });

    it('returns error on failure', async () => {
      const mockQuery = createChainableQuery({
        data: null,
        error: { message: 'Query failed', code: 'ERROR' },
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getCampaignDeliverables('campaign-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Query failed');
    });
  });

  describe('getDeliverableById', () => {
    it('returns a single deliverable', async () => {
      const mockQuery = createChainableQuery({
        data: mockDeliverable,
        error: null,
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getDeliverableById('deliverable-123');

      expect(result.data).toEqual(mockDeliverable);
      expect(result.error).toBeNull();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'deliverable-123');
    });

    it('returns error when deliverable not found', async () => {
      const mockQuery = createChainableQuery({
        data: null,
        error: { message: 'Not found', code: 'PGRST116' },
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getDeliverableById('nonexistent');

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
    });
  });

  describe('updateDeliverableStatus', () => {
    it('approves a deliverable', async () => {
      const approvedDeliverable = {
        ...mockDeliverable,
        status: 'approved' as DeliverableStatus,
        reviewed_at: expect.any(String),
      };
      const mockQuery = createChainableQuery({
        data: approvedDeliverable,
        error: null,
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await updateDeliverableStatus('deal-123', 'deliverable-123', 'approved');

      expect(result.data?.status).toBe('approved');
      expect(result.error).toBeNull();
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved',
          reviewed_at: expect.any(String),
        })
      );
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'deliverable-123');
      expect(mockQuery.eq).toHaveBeenCalledWith('deal_id', 'deal-123');
    });

    it('rejects a deliverable with feedback', async () => {
      const rejectedDeliverable = {
        ...mockDeliverable,
        status: 'rejected' as DeliverableStatus,
        feedback: 'Does not meet brand guidelines',
      };
      const mockQuery = createChainableQuery({
        data: rejectedDeliverable,
        error: null,
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await updateDeliverableStatus(
        'deal-123',
        'deliverable-123',
        'rejected',
        'Does not meet brand guidelines'
      );

      expect(result.data?.status).toBe('rejected');
      expect(result.data?.feedback).toBe('Does not meet brand guidelines');
      expect(result.error).toBeNull();
    });

    it('returns error on failure', async () => {
      const mockQuery = createChainableQuery({
        data: null,
        error: { message: 'Update failed', code: 'ERROR' },
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await updateDeliverableStatus('deal-123', 'deliverable-123', 'approved');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Update failed');
    });
  });

  describe('submitDeliverable', () => {
    it('submits a deliverable with content URL', async () => {
      const submittedDeliverable = {
        ...mockDeliverable,
        status: 'submitted' as DeliverableStatus,
        content_url: 'https://instagram.com/reel/123',
        submitted_at: expect.any(String),
      };
      const mockQuery = createChainableQuery({
        data: submittedDeliverable,
        error: null,
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await submitDeliverable(
        'deliverable-123',
        'https://instagram.com/reel/123'
      );

      expect(result.data?.status).toBe('submitted');
      expect(result.data?.content_url).toBe('https://instagram.com/reel/123');
      expect(result.error).toBeNull();
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'submitted',
          content_url: 'https://instagram.com/reel/123',
          submitted_at: expect.any(String),
        })
      );
    });

    it('submits deliverable with draft URL', async () => {
      const submittedDeliverable = {
        ...mockDeliverable,
        status: 'submitted' as DeliverableStatus,
        content_url: 'https://instagram.com/reel/123',
        draft_url: 'https://drive.google.com/draft/123',
      };
      const mockQuery = createChainableQuery({
        data: submittedDeliverable,
        error: null,
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await submitDeliverable(
        'deliverable-123',
        'https://instagram.com/reel/123',
        'https://drive.google.com/draft/123'
      );

      expect(result.data?.draft_url).toBe('https://drive.google.com/draft/123');
      expect(result.error).toBeNull();
    });

    it('returns error on failure', async () => {
      const mockQuery = createChainableQuery({
        data: null,
        error: { message: 'Submit failed', code: 'ERROR' },
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await submitDeliverable('deliverable-123', 'https://example.com');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Submit failed');
    });
  });

  describe('requestDeliverableRevision', () => {
    it('requests revision with feedback', async () => {
      const revisionDeliverable = {
        ...mockDeliverable,
        status: 'revision' as DeliverableStatus,
        feedback: 'Please update the hashtag placement',
      };
      const mockQuery = createChainableQuery({
        data: revisionDeliverable,
        error: null,
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await requestDeliverableRevision(
        'deliverable-123',
        'Please update the hashtag placement'
      );

      expect(result.data?.status).toBe('revision');
      expect(result.data?.feedback).toBe('Please update the hashtag placement');
      expect(result.error).toBeNull();
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'revision',
          feedback: 'Please update the hashtag placement',
          reviewed_at: expect.any(String),
        })
      );
    });

    it('returns error on failure', async () => {
      const mockQuery = createChainableQuery({
        data: null,
        error: { message: 'Update failed', code: 'ERROR' },
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await requestDeliverableRevision('deliverable-123', 'feedback');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Update failed');
    });
  });

  describe('createDeliverable', () => {
    it('creates a new deliverable', async () => {
      const input: CreateDeliverableInput = {
        deal_id: 'deal-123',
        athlete_id: 'athlete-123',
        campaign_id: 'campaign-123',
        platform: 'instagram' as ContentPlatform,
        content_type: 'reel' as ContentType,
        title: 'New Reel',
        description: 'Create promotional reel',
        requirements: 'Must include product showcase',
        due_date: '2024-03-01',
      };

      const createdDeliverable = {
        ...mockDeliverable,
        ...input,
        status: 'pending' as DeliverableStatus,
      };
      const mockQuery = createChainableQuery({
        data: createdDeliverable,
        error: null,
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await createDeliverable(input);

      expect(result.data).toEqual(createdDeliverable);
      expect(result.error).toBeNull();
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ...input,
          status: 'pending',
        })
      );
    });

    it('creates deliverable with minimal data', async () => {
      const input: CreateDeliverableInput = {
        deal_id: 'deal-123',
        athlete_id: 'athlete-123',
        platform: 'tiktok' as ContentPlatform,
        content_type: 'video' as ContentType,
      };

      const createdDeliverable = {
        ...mockDeliverable,
        ...input,
        campaign_id: null,
        title: null,
        description: null,
        requirements: null,
        due_date: null,
        status: 'pending' as DeliverableStatus,
      };
      const mockQuery = createChainableQuery({
        data: createdDeliverable,
        error: null,
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await createDeliverable(input);

      expect(result.data).not.toBeNull();
      expect(result.error).toBeNull();
    });

    it('returns error on failure', async () => {
      const input: CreateDeliverableInput = {
        deal_id: 'deal-123',
        athlete_id: 'athlete-123',
        platform: 'instagram' as ContentPlatform,
        content_type: 'reel' as ContentType,
      };

      const mockQuery = createChainableQuery({
        data: null,
        error: { message: 'Insert failed', code: 'ERROR' },
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await createDeliverable(input);

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Insert failed');
    });
  });

  describe('deleteDeliverable', () => {
    it('deletes a deliverable', async () => {
      const mockQuery = createChainableQuery({
        data: null,
        error: null,
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await deleteDeliverable('deliverable-123');

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('deliverables');
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'deliverable-123');
    });

    it('returns error on failure', async () => {
      const mockQuery = createChainableQuery({
        data: null,
        error: { message: 'Delete failed', code: 'ERROR' },
      });
      // Override delete to resolve with error
      mockQuery.eq = jest.fn().mockResolvedValue({ error: { message: 'Delete failed', code: 'ERROR' } });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await deleteDeliverable('deliverable-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Delete failed');
    });
  });

  describe('deliverable platforms and content types', () => {
    const platforms: ContentPlatform[] = ['instagram', 'tiktok', 'youtube', 'twitter', 'facebook', 'linkedin', 'other'];
    const contentTypes: ContentType[] = ['reel', 'story', 'feed_post', 'video', 'short', 'live', 'carousel', 'blog', 'other'];

    it('handles all content platforms', () => {
      platforms.forEach((platform) => {
        const deliverable: Deliverable = { ...mockDeliverable, platform };
        expect(deliverable.platform).toBe(platform);
      });
    });

    it('handles all content types', () => {
      contentTypes.forEach((contentType) => {
        const deliverable: Deliverable = { ...mockDeliverable, content_type: contentType };
        expect(deliverable.content_type).toBe(contentType);
      });
    });
  });

  describe('deliverable statuses', () => {
    const statuses: DeliverableStatus[] = ['pending', 'in_progress', 'submitted', 'approved', 'rejected', 'revision'];

    it('handles all deliverable statuses', () => {
      statuses.forEach((status) => {
        const deliverable: Deliverable = { ...mockDeliverable, status };
        expect(deliverable.status).toBe(status);
      });
    });
  });
});
