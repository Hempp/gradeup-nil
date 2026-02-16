/**
 * Tests for the notifications service
 * @module __tests__/services/notifications.test
 */

import {
  getNotifications,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  getNotificationsWithFilters,
  createNotification,
  deleteReadNotifications,
  type Notification,
  type NotificationType,
  type NotificationFilters,
} from '@/lib/services/notifications';

// Mock the Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@/lib/supabase/client';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Helper to create a chainable mock query builder
function createChainableQuery(finalResult: { data: unknown; error: unknown; count?: number | null }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockQuery: any = {};

  const chainableMethods = ['select', 'eq', 'in', 'order', 'update', 'insert', 'delete', 'range', 'limit', 'single'];
  chainableMethods.forEach((method) => {
    mockQuery[method] = jest.fn().mockReturnValue(mockQuery);
  });

  // single() is terminal and returns a promise
  mockQuery.single = jest.fn().mockResolvedValue(finalResult);

  // Make the query thenable (awaitable)
  mockQuery.then = (onFulfilled: (value: unknown) => unknown) => {
    return Promise.resolve(finalResult).then(onFulfilled);
  };

  return mockQuery;
}

// Sample test data
const mockNotificationRecord = {
  id: 'notification-123',
  user_id: 'user-123',
  type: 'deal_offer',
  title: 'New Deal Offer',
  body: 'You have received a new deal offer from Nike',
  read: false,
  read_at: null,
  url: '/deals/deal-123',
  metadata: { deal_id: 'deal-123' },
  created_at: '2024-01-15T10:00:00Z',
};

const mockNotification: Notification = {
  id: 'notification-123',
  type: 'deal_offer',
  title: 'New Deal Offer',
  message: 'You have received a new deal offer from Nike',
  read: false,
  created_at: '2024-01-15T10:00:00Z',
  url: '/deals/deal-123',
  metadata: { deal_id: 'deal-123' },
};

describe('notifications service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNotifications', () => {
    it('returns notifications for user', async () => {
      const mockRecords = [mockNotificationRecord];
      const mockQuery = createChainableQuery({ data: mockRecords, error: null });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getNotifications('user-123');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].id).toBe('notification-123');
      expect(result.data![0].message).toBe('You have received a new deal offer from Nike');
      expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('applies default limit of 50', async () => {
      const mockQuery = createChainableQuery({ data: [], error: null });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await getNotifications('user-123');

      expect(mockQuery.limit).toHaveBeenCalledWith(50);
    });

    it('applies custom limit', async () => {
      const mockQuery = createChainableQuery({ data: [], error: null });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await getNotifications('user-123', 10);

      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('returns error on database failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: { message: 'Database error' } });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getNotifications('user-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to fetch notifications');
    });

    it('returns empty array when no notifications', async () => {
      const mockQuery = createChainableQuery({ data: [], error: null });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getNotifications('user-123');

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });

    it('orders by created_at descending', async () => {
      const mockQuery = createChainableQuery({ data: [], error: null });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await getNotifications('user-123');

      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('markNotificationAsRead', () => {
    it('marks notification as read successfully', async () => {
      const readRecord = { ...mockNotificationRecord, read: true, read_at: '2024-01-15T11:00:00Z' };
      const mockQuery = createChainableQuery({ data: readRecord, error: null });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await markNotificationAsRead('notification-123');

      expect(result.error).toBeNull();
      expect(result.data?.read).toBe(true);
      expect(mockQuery.update).toHaveBeenCalledWith(expect.objectContaining({ read: true }));
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'notification-123');
    });

    it('scopes to user when userId provided', async () => {
      const readRecord = { ...mockNotificationRecord, read: true };
      const mockQuery = createChainableQuery({ data: readRecord, error: null });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await markNotificationAsRead('notification-123', 'user-123');

      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'notification-123');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('returns error on update failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: { message: 'Update failed' } });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await markNotificationAsRead('notification-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to mark notification as read');
    });
  });

  describe('markAllAsRead', () => {
    it('marks all notifications as read for user', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      // Make eq chainable - return mockQuery for first call, then resolve for second
      let eqCallCount = 0;
      mockQuery.eq = jest.fn().mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount === 1) {
          return mockQuery;
        }
        return Promise.resolve({ error: null });
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await markAllAsRead('user-123');

      expect(result.error).toBeNull();
      expect(mockQuery.update).toHaveBeenCalledWith(expect.objectContaining({ read: true }));
    });

    it('only updates unread notifications', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      // Track the chain of eq calls
      const eqCalls: Array<[string, unknown]> = [];
      mockQuery.eq = jest.fn().mockImplementation((col: string, val: unknown) => {
        eqCalls.push([col, val]);
        if (col === 'read') {
          return Promise.resolve({ error: null });
        }
        return mockQuery;
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await markAllAsRead('user-123');

      expect(eqCalls).toContainEqual(['user_id', 'user-123']);
      expect(eqCalls).toContainEqual(['read', false]);
    });

    it('returns error on update failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      // Make eq chainable - return mockQuery for first call, then resolve with error for second
      let eqCallCount = 0;
      mockQuery.eq = jest.fn().mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount === 1) {
          return mockQuery;
        }
        return Promise.resolve({ error: { message: 'Update failed' } });
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await markAllAsRead('user-123');

      expect(result.error?.message).toContain('Failed to mark all notifications as read');
    });
  });

  describe('deleteNotification', () => {
    it('deletes notification successfully', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      mockQuery.eq = jest.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await deleteNotification('notification-123');

      expect(result.error).toBeNull();
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'notification-123');
    });

    it('scopes to user when userId provided', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      const eqCalls: Array<[string, string]> = [];
      mockQuery.eq = jest.fn().mockImplementation((col: string, val: string) => {
        eqCalls.push([col, val]);
        if (col === 'user_id') {
          return { error: null };
        }
        return mockQuery;
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await deleteNotification('notification-123', 'user-123');

      expect(eqCalls).toContainEqual(['id', 'notification-123']);
      expect(eqCalls).toContainEqual(['user_id', 'user-123']);
    });

    it('returns error on delete failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      mockQuery.eq = jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await deleteNotification('notification-123');

      expect(result.error?.message).toContain('Failed to delete notification');
    });
  });

  describe('getUnreadCount', () => {
    it('returns unread count', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null, count: 5 });
      // Make eq chainable - return mockQuery for first call, then resolve for second
      let eqCallCount = 0;
      mockQuery.eq = jest.fn().mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount === 1) {
          return mockQuery;
        }
        return Promise.resolve({ count: 5, error: null });
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getUnreadCount('user-123');

      expect(result.error).toBeNull();
      expect(result.data).toBe(5);
    });

    it('returns zero when no unread notifications', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null, count: 0 });
      // Make eq chainable
      let eqCallCount = 0;
      mockQuery.eq = jest.fn().mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount === 1) {
          return mockQuery;
        }
        return Promise.resolve({ count: 0, error: null });
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getUnreadCount('user-123');

      expect(result.error).toBeNull();
      expect(result.data).toBe(0);
    });

    it('returns zero on error', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null, count: null });
      // Make eq chainable
      let eqCallCount = 0;
      mockQuery.eq = jest.fn().mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount === 1) {
          return mockQuery;
        }
        return Promise.resolve({ count: null, error: { message: 'Error' } });
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getUnreadCount('user-123');

      expect(result.data).toBe(0);
      expect(result.error).not.toBeNull();
    });
  });

  describe('getNotificationsWithFilters', () => {
    it('returns notifications with pagination', async () => {
      const mockRecords = [mockNotificationRecord];
      const mockQuery = createChainableQuery({ data: mockRecords, error: null, count: 1 });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getNotificationsWithFilters('user-123', { limit: 10, offset: 0 });

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockQuery.range).toHaveBeenCalledWith(0, 9);
    });

    it('applies type filter', async () => {
      const mockQuery = createChainableQuery({ data: [], error: null, count: 0 });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const filters: NotificationFilters = {
        type: ['deal_offer', 'deal_accepted'],
      };

      await getNotificationsWithFilters('user-123', filters);

      expect(mockQuery.in).toHaveBeenCalledWith('type', ['deal_offer', 'deal_accepted']);
    });

    it('applies read filter', async () => {
      const mockQuery = createChainableQuery({ data: [], error: null, count: 0 });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const filters: NotificationFilters = {
        read: false,
      };

      await getNotificationsWithFilters('user-123', filters);

      expect(mockQuery.eq).toHaveBeenCalledWith('read', false);
    });

    it('uses default pagination values', async () => {
      const mockQuery = createChainableQuery({ data: [], error: null, count: 0 });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await getNotificationsWithFilters('user-123');

      // Default limit is 20, offset is 0
      expect(mockQuery.range).toHaveBeenCalledWith(0, 19);
    });

    it('returns error on database failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: { message: 'Database error' }, count: null });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getNotificationsWithFilters('user-123');

      expect(result.data).toBeNull();
      expect(result.total).toBe(0);
      expect(result.error?.message).toContain('Failed to fetch notifications');
    });
  });

  describe('createNotification', () => {
    const notificationInput = {
      user_id: 'user-123',
      type: 'deal_offer' as NotificationType,
      title: 'New Offer',
      message: 'You received a new offer',
      url: '/deals/new',
      metadata: { deal_id: 'deal-123' },
    };

    it('creates notification successfully', async () => {
      const createdRecord = {
        id: 'new-notification-123',
        user_id: 'user-123',
        type: 'deal_offer',
        title: 'New Offer',
        body: 'You received a new offer',
        read: false,
        read_at: null,
        url: '/deals/new',
        metadata: { deal_id: 'deal-123' },
        created_at: '2024-01-15T12:00:00Z',
      };
      const mockQuery = createChainableQuery({ data: createdRecord, error: null });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await createNotification(notificationInput);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.id).toBe('new-notification-123');
      expect(mockQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 'user-123',
        type: 'deal_offer',
        title: 'New Offer',
        body: 'You received a new offer',
        read: false,
      }));
    });

    it('handles optional fields', async () => {
      const minimalInput = {
        user_id: 'user-123',
        type: 'system' as NotificationType,
        title: 'System Message',
        message: 'Maintenance scheduled',
      };

      const createdRecord = {
        id: 'notification-456',
        user_id: 'user-123',
        type: 'system',
        title: 'System Message',
        body: 'Maintenance scheduled',
        read: false,
        read_at: null,
        url: null,
        metadata: {},
        created_at: '2024-01-15T12:00:00Z',
      };
      const mockQuery = createChainableQuery({ data: createdRecord, error: null });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await createNotification(minimalInput);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(mockQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
        url: null,
        metadata: {},
      }));
    });

    it('returns error on insert failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: { message: 'Insert failed' } });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await createNotification(notificationInput);

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to create notification');
    });
  });

  describe('deleteReadNotifications', () => {
    it('deletes all read notifications for user', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      // Make eq chainable - return mockQuery for first call, then resolve for second
      let eqCallCount = 0;
      mockQuery.eq = jest.fn().mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount === 1) {
          return mockQuery;
        }
        return Promise.resolve({ error: null });
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await deleteReadNotifications('user-123');

      expect(result.error).toBeNull();
      expect(mockQuery.delete).toHaveBeenCalled();
    });

    it('only deletes read notifications', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      const eqCalls: Array<[string, unknown]> = [];
      mockQuery.eq = jest.fn().mockImplementation((col: string, val: unknown) => {
        eqCalls.push([col, val]);
        if (col === 'read') {
          return Promise.resolve({ error: null });
        }
        return mockQuery;
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await deleteReadNotifications('user-123');

      expect(eqCalls).toContainEqual(['user_id', 'user-123']);
      expect(eqCalls).toContainEqual(['read', true]);
    });

    it('returns error on delete failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      // Make eq chainable - return mockQuery for first call, then resolve with error for second
      let eqCallCount = 0;
      mockQuery.eq = jest.fn().mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount === 1) {
          return mockQuery;
        }
        return Promise.resolve({ error: { message: 'Delete failed' } });
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await deleteReadNotifications('user-123');

      expect(result.error?.message).toContain('Failed to delete read notifications');
    });
  });
});
