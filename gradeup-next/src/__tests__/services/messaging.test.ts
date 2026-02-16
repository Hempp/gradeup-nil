/**
 * Tests for the messaging service
 * @module __tests__/services/messaging.test
 */

import {
  getConversations,
  getConversationById,
  getMessages,
  sendMessage,
  markAsRead,
  createConversation,
  getOrCreateConversationByDealId,
  getUnreadCount,
  type Conversation,
  type Message,
} from '@/lib/services/messaging';

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

  const chainableMethods = ['select', 'eq', 'in', 'neq', 'is', 'order', 'update', 'insert', 'delete', 'range', 'limit', 'lt', 'single'];
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
const mockMessage: Message = {
  id: 'message-123',
  conversation_id: 'conversation-123',
  sender_id: 'user-456',
  content: 'Hello, interested in a deal!',
  created_at: '2024-01-15T10:00:00Z',
  read_at: null,
  attachments: [],
};

const _mockConversation: Conversation = {
  id: 'conversation-123',
  deal_id: 'deal-123',
  created_at: '2024-01-10T00:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  participants: [
    {
      id: 'participant-1',
      conversation_id: 'conversation-123',
      user_id: 'profile-123',
      role: 'athlete',
      profile: { first_name: 'John', last_name: 'Doe', avatar_url: null },
    },
    {
      id: 'participant-2',
      conversation_id: 'conversation-123',
      user_id: 'brand-user-123',
      role: 'brand',
      brand: { company_name: 'Nike', logo_url: null },
    },
  ],
  unread_count: 2,
  last_message: mockMessage,
};

describe('messaging service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConversations', () => {
    it('returns conversations for authenticated user', async () => {
      const participantQuery = createChainableQuery({
        data: [{ conversation_id: 'conversation-123' }],
        error: null
      });
      participantQuery.eq = jest.fn().mockResolvedValue({
        data: [{ conversation_id: 'conversation-123' }],
        error: null
      });

      const conversationsData = [{
        id: 'conversation-123',
        deal_id: 'deal-123',
        created_at: '2024-01-10T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        conversation_participants: [
          {
            id: 'participant-1',
            conversation_id: 'conversation-123',
            user_id: 'profile-123',
            role: 'athlete',
            profile: { first_name: 'John', last_name: 'Doe', avatar_url: null },
          },
        ],
      }];

      const conversationsQuery = createChainableQuery({ data: conversationsData, error: null });

      const _lastMessageQuery = createChainableQuery({
        data: { ...mockMessage, message_attachments: [] },
        error: null
      });

      const unreadCountQuery = createChainableQuery({ data: null, error: null, count: 2 });
      unreadCountQuery.is = jest.fn().mockResolvedValue({ count: 2, error: null });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      let _callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          _callCount++;
          if (table === 'conversation_participants' && _callCount === 1) {
            return participantQuery;
          }
          if (table === 'conversations') {
            return conversationsQuery;
          }
          if (table === 'messages') {
            // Return different queries for last message vs unread count
            const messageQuery = createChainableQuery({ data: mockMessage, error: null });
            messageQuery.single = jest.fn().mockResolvedValue({ data: { ...mockMessage, message_attachments: [] }, error: null });
            // For count query
            const returnValue = { ...messageQuery };
            returnValue.is = jest.fn().mockResolvedValue({ count: 2, error: null });
            return returnValue;
          }
          return createChainableQuery({ data: null, error: null });
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getConversations();

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
    });

    it('returns error when not authenticated', async () => {
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      };
      const mockSupabase = {
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getConversations();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });

    it('returns empty array when no conversations', async () => {
      const participantQuery = createChainableQuery({ data: [], error: null });
      participantQuery.eq = jest.fn().mockResolvedValue({ data: [], error: null });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue(participantQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getConversations();

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });

    it('returns error when participant query fails', async () => {
      const participantQuery = createChainableQuery({ data: null, error: { message: 'Database error' } });
      participantQuery.eq = jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue(participantQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getConversations();

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
    });
  });

  describe('getConversationById', () => {
    it('returns conversation when user is participant', async () => {
      const participantCheckQuery = createChainableQuery({ data: { id: 'participant-1' }, error: null });
      const conversationQuery = createChainableQuery({
        data: {
          id: 'conversation-123',
          deal_id: 'deal-123',
          created_at: '2024-01-10T00:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          conversation_participants: [],
        },
        error: null
      });

      const _messageQuery = createChainableQuery({ data: mockMessage, error: null });
      const countQuery = createChainableQuery({ data: null, error: null, count: 0 });
      countQuery.is = jest.fn().mockResolvedValue({ count: 0, error: null });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      let _callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          _callCount++;
          if (table === 'conversation_participants' && _callCount === 1) {
            return participantCheckQuery;
          }
          if (table === 'conversations') {
            return conversationQuery;
          }
          if (table === 'messages') {
            // Return a mock that handles both single message and count
            const mq = createChainableQuery({ data: { ...mockMessage, message_attachments: [] }, error: null });
            mq.is = jest.fn().mockResolvedValue({ count: 0, error: null });
            return mq;
          }
          return createChainableQuery({ data: null, error: null });
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getConversationById('conversation-123');

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.id).toBe('conversation-123');
    });

    it('returns error when not authenticated', async () => {
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      };
      const mockSupabase = {
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getConversationById('conversation-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });

    it('returns error when user is not a participant', async () => {
      const participantCheckQuery = createChainableQuery({ data: null, error: { message: 'Not found' } });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue(participantCheckQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getConversationById('conversation-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Conversation not found or access denied');
    });
  });

  describe('getMessages', () => {
    const mockMessages = [
      { ...mockMessage, id: 'message-1', message_attachments: [] },
      { ...mockMessage, id: 'message-2', content: 'Follow up', message_attachments: [] },
    ];

    it('returns messages for conversation', async () => {
      const participantCheckQuery = createChainableQuery({ data: { id: 'participant-1' }, error: null });
      const messagesQuery = createChainableQuery({ data: mockMessages, error: null });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'conversation_participants') {
            return participantCheckQuery;
          }
          return messagesQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getMessages('conversation-123');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
    });

    it('returns error when not authenticated', async () => {
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      };
      const mockSupabase = {
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getMessages('conversation-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });

    it('returns error when not a participant', async () => {
      const participantCheckQuery = createChainableQuery({ data: null, error: { message: 'Not found' } });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue(participantCheckQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getMessages('conversation-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Conversation not found or access denied');
    });

    it('applies pagination options', async () => {
      const participantCheckQuery = createChainableQuery({ data: { id: 'participant-1' }, error: null });
      const messagesQuery = createChainableQuery({ data: mockMessages, error: null });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'conversation_participants') {
            return participantCheckQuery;
          }
          return messagesQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      await getMessages('conversation-123', { limit: 25, before: '2024-01-15T00:00:00Z' });

      expect(messagesQuery.limit).toHaveBeenCalledWith(25);
      expect(messagesQuery.lt).toHaveBeenCalledWith('created_at', '2024-01-15T00:00:00Z');
    });
  });

  describe('sendMessage', () => {
    it('sends message successfully', async () => {
      const participantCheckQuery = createChainableQuery({ data: { id: 'participant-1' }, error: null });
      const insertedMessage = {
        id: 'new-message-123',
        conversation_id: 'conversation-123',
        sender_id: 'profile-123',
        content: 'Hello!',
        created_at: '2024-01-15T12:00:00Z',
        read_at: null,
      };
      const insertQuery = createChainableQuery({ data: insertedMessage, error: null });
      const updateQuery = createChainableQuery({ data: null, error: null });
      updateQuery.eq = jest.fn().mockResolvedValue({ error: null });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'conversation_participants') {
            return participantCheckQuery;
          }
          if (table === 'messages') {
            return insertQuery;
          }
          if (table === 'conversations') {
            return updateQuery;
          }
          return createChainableQuery({ data: null, error: null });
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await sendMessage('conversation-123', 'Hello!');

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.content).toBe('Hello!');
    });

    it('returns error when not authenticated', async () => {
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      };
      const mockSupabase = {
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await sendMessage('conversation-123', 'Hello!');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });

    it('returns error when not a participant', async () => {
      const participantCheckQuery = createChainableQuery({ data: null, error: { message: 'Not found' } });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue(participantCheckQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await sendMessage('conversation-123', 'Hello!');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Conversation not found or access denied');
    });

    it('returns error when insert fails', async () => {
      const participantCheckQuery = createChainableQuery({ data: { id: 'participant-1' }, error: null });
      const insertQuery = createChainableQuery({ data: null, error: { message: 'Insert failed' } });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'conversation_participants') {
            return participantCheckQuery;
          }
          return insertQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await sendMessage('conversation-123', 'Hello!');

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
    });
  });

  describe('markAsRead', () => {
    it('marks messages as read successfully', async () => {
      const participantCheckQuery = createChainableQuery({ data: { id: 'participant-1' }, error: null });
      const updateQuery = createChainableQuery({ data: null, error: null });
      updateQuery.is = jest.fn().mockResolvedValue({ error: null });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'conversation_participants') {
            return participantCheckQuery;
          }
          return updateQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await markAsRead('conversation-123');

      expect(result.error).toBeNull();
    });

    it('returns error when not authenticated', async () => {
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      };
      const mockSupabase = {
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await markAsRead('conversation-123');

      expect(result.error?.message).toBe('Not authenticated');
    });

    it('returns error when not a participant', async () => {
      const participantCheckQuery = createChainableQuery({ data: null, error: { message: 'Not found' } });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue(participantCheckQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await markAsRead('conversation-123');

      expect(result.error?.message).toBe('Conversation not found or access denied');
    });
  });

  describe('createConversation', () => {
    it('creates conversation with participants', async () => {
      const profilesQuery = createChainableQuery({
        data: [
          { id: 'profile-123', role: 'athlete' },
          { id: 'user-456', role: 'brand' },
        ],
        error: null
      });
      profilesQuery.in = jest.fn().mockResolvedValue({
        data: [
          { id: 'profile-123', role: 'athlete' },
          { id: 'user-456', role: 'brand' },
        ],
        error: null
      });

      const conversationInsertQuery = createChainableQuery({
        data: { id: 'new-conversation-123' },
        error: null
      });

      const participantsInsertQuery = createChainableQuery({ data: null, error: null });
      participantsInsertQuery.insert = jest.fn().mockResolvedValue({ error: null });

      // For getConversationById call at the end
      const participantCheckQuery = createChainableQuery({ data: { id: 'participant-1' }, error: null });
      const finalConversationQuery = createChainableQuery({
        data: {
          id: 'new-conversation-123',
          deal_id: null,
          created_at: '2024-01-15T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
          conversation_participants: [],
        },
        error: null
      });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      let _fromCallCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          _fromCallCount++;
          if (table === 'profiles') {
            return profilesQuery;
          }
          if (table === 'conversations' && _fromCallCount <= 2) {
            return conversationInsertQuery;
          }
          if (table === 'conversation_participants' && _fromCallCount === 3) {
            return participantsInsertQuery;
          }
          if (table === 'conversation_participants') {
            return participantCheckQuery;
          }
          if (table === 'conversations') {
            return finalConversationQuery;
          }
          // For messages query in getConversationById
          const mq = createChainableQuery({ data: null, error: null });
          mq.is = jest.fn().mockResolvedValue({ count: 0, error: null });
          return mq;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await createConversation(['user-456']);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
    });

    it('returns error when not authenticated', async () => {
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      };
      const mockSupabase = {
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await createConversation(['user-456']);

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });

    it('returns error when less than 2 participants', async () => {
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };
      const mockSupabase = {
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      // Pass empty array - only current user will be added
      const result = await createConversation([]);

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('At least 2 participants are required');
    });
  });

  describe('getOrCreateConversationByDealId', () => {
    it('returns existing conversation for deal', async () => {
      const existingConvQuery = createChainableQuery({ data: { id: 'existing-conv-123' }, error: null });

      // For getConversationById
      const participantCheckQuery = createChainableQuery({ data: { id: 'participant-1' }, error: null });
      const conversationQuery = createChainableQuery({
        data: {
          id: 'existing-conv-123',
          deal_id: 'deal-123',
          created_at: '2024-01-10T00:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          conversation_participants: [],
        },
        error: null
      });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      let fromCallCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          fromCallCount++;
          if (table === 'conversations' && fromCallCount === 1) {
            return existingConvQuery;
          }
          if (table === 'conversation_participants') {
            return participantCheckQuery;
          }
          if (table === 'conversations') {
            return conversationQuery;
          }
          // For messages query
          const mq = createChainableQuery({ data: null, error: null });
          mq.is = jest.fn().mockResolvedValue({ count: 0, error: null });
          return mq;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getOrCreateConversationByDealId('deal-123');

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.id).toBe('existing-conv-123');
    });

    it('returns error when not authenticated', async () => {
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      };
      const mockSupabase = {
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getOrCreateConversationByDealId('deal-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });

    it('returns error when deal not found', async () => {
      const existingConvQuery = createChainableQuery({ data: null, error: { code: 'PGRST116' } });
      const dealQuery = createChainableQuery({ data: null, error: null });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      let fromCallCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          fromCallCount++;
          if (table === 'conversations' && fromCallCount === 1) {
            return existingConvQuery;
          }
          if (table === 'deals') {
            return dealQuery;
          }
          return createChainableQuery({ data: null, error: null });
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getOrCreateConversationByDealId('deal-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Deal not found');
    });

    it('returns error when user is not a participant in deal', async () => {
      const existingConvQuery = createChainableQuery({ data: null, error: { code: 'PGRST116' } });
      const dealQuery = createChainableQuery({
        data: {
          id: 'deal-123',
          athlete_id: 'athlete-1',
          brand_id: 'brand-1',
          athletes: { profile_id: 'other-user' },
          brands: { profile_id: 'other-brand-user' },
        },
        error: null
      });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      let fromCallCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          fromCallCount++;
          if (table === 'conversations' && fromCallCount === 1) {
            return existingConvQuery;
          }
          if (table === 'deals') {
            return dealQuery;
          }
          return createChainableQuery({ data: null, error: null });
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getOrCreateConversationByDealId('deal-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Access denied: You are not a participant in this deal');
    });
  });

  describe('getUnreadCount', () => {
    it('returns unread message count', async () => {
      const participantQuery = createChainableQuery({
        data: [{ conversation_id: 'conversation-123' }],
        error: null
      });
      participantQuery.eq = jest.fn().mockResolvedValue({
        data: [{ conversation_id: 'conversation-123' }],
        error: null
      });

      const countQuery = createChainableQuery({ data: null, error: null, count: 5 });
      countQuery.is = jest.fn().mockResolvedValue({ count: 5, error: null });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'conversation_participants') {
            return participantQuery;
          }
          return countQuery;
        }),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getUnreadCount();

      expect(result.error).toBeNull();
      expect(result.data).toBe(5);
    });

    it('returns zero when no conversations', async () => {
      const participantQuery = createChainableQuery({ data: [], error: null });
      participantQuery.eq = jest.fn().mockResolvedValue({ data: [], error: null });

      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'profile-123' } },
          error: null,
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue(participantQuery),
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getUnreadCount();

      expect(result.error).toBeNull();
      expect(result.data).toBe(0);
    });

    it('returns error when not authenticated', async () => {
      const mockAuth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      };
      const mockSupabase = {
        auth: mockAuth,
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getUnreadCount();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });
  });
});
