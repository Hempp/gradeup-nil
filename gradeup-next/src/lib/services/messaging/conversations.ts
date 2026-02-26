'use client';

import { createClient } from '@/lib/supabase/client';
import type {
  Conversation,
  ConversationParticipant,
  Message,
  MessageAttachment,
  ServiceResult,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// Conversation Service Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all conversations for the current authenticated user
 *
 * Fetches conversations where the user is a participant, including
 * participant profiles, brand info, last message, and unread count.
 * Results are ordered by last update (most recent first).
 *
 * @returns Promise resolving to ServiceResult with Conversation array
 * @example
 * const { data: conversations } = await getConversations();
 * const unread = conversations?.filter(c => c.unread_count > 0);
 * console.log(`${unread?.length} conversations with unread messages`);
 */
export async function getConversations(): Promise<ServiceResult<Conversation[]>> {
  const supabase = createClient();

  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: userError || new Error('Not authenticated') };
    }

    // Get conversations where the user is a participant
    const { data: participantData, error: participantError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (participantError) {
      return { data: null, error: participantError };
    }

    if (!participantData || participantData.length === 0) {
      return { data: [], error: null };
    }

    const conversationIds = participantData.map((p) => p.conversation_id);

    // Fetch conversations with participants and last message
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select(
        `
        id,
        deal_id,
        created_at,
        updated_at,
        conversation_participants (
          id,
          conversation_id,
          user_id,
          role,
          profile:profiles (
            first_name,
            last_name,
            avatar_url
          ),
          brand:brands (
            company_name,
            logo_url
          )
        )
      `
      )
      .in('id', conversationIds)
      .order('updated_at', { ascending: false });

    if (conversationsError) {
      return { data: null, error: conversationsError };
    }

    // Fetch last message and unread count for each conversation
    const conversationsWithMetadata = await Promise.all(
      (conversations || []).map(async (conv) => {
        // Get last message
        const { data: lastMessageData } = await supabase
          .from('messages')
          .select(
            `
            id,
            conversation_id,
            sender_id,
            content,
            created_at,
            read_at,
            message_attachments (
              id,
              message_id,
              file_url,
              file_name,
              file_type,
              file_size
            )
          `
          )
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Get unread count
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', user.id)
          .is('read_at', null);

        const participants = (conv.conversation_participants || []).map(
          (p: Record<string, unknown>) => ({
            id: p.id as string,
            conversation_id: p.conversation_id as string,
            user_id: p.user_id as string,
            role: p.role as 'athlete' | 'brand',
            profile: p.profile as ConversationParticipant['profile'],
            brand: p.brand as ConversationParticipant['brand'],
          })
        );

        const conversation: Conversation = {
          id: conv.id,
          deal_id: conv.deal_id,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          participants,
          unread_count: unreadCount || 0,
        };

        if (lastMessageData) {
          conversation.last_message = {
            id: lastMessageData.id,
            conversation_id: lastMessageData.conversation_id,
            sender_id: lastMessageData.sender_id,
            content: lastMessageData.content,
            created_at: lastMessageData.created_at,
            read_at: lastMessageData.read_at,
            attachments: lastMessageData.message_attachments as MessageAttachment[],
          };
        }

        return conversation;
      })
    );

    return { data: conversationsWithMetadata, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Get a single conversation by ID with full details
 *
 * Fetches a conversation if the current user is a participant.
 * Includes participant profiles, brand info, last message, and unread count.
 *
 * @param conversationId - The unique identifier of the conversation
 * @returns Promise resolving to ServiceResult with Conversation or an error
 * @example
 * const { data: conversation, error } = await getConversationById('conv-123');
 * if (error?.message.includes('access denied')) {
 *   // User is not a participant
 * }
 */
export async function getConversationById(
  conversationId: string
): Promise<ServiceResult<Conversation>> {
  const supabase = createClient();

  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: userError || new Error('Not authenticated') };
    }

    // Verify user is a participant
    const { data: participantCheck, error: participantError } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participantCheck) {
      return {
        data: null,
        error: new Error('Conversation not found or access denied'),
      };
    }

    // Fetch conversation with participants
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select(
        `
        id,
        deal_id,
        created_at,
        updated_at,
        conversation_participants (
          id,
          conversation_id,
          user_id,
          role,
          profile:profiles (
            first_name,
            last_name,
            avatar_url
          ),
          brand:brands (
            company_name,
            logo_url
          )
        )
      `
      )
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      return {
        data: null,
        error: conversationError || new Error('Conversation not found'),
      };
    }

    // Get last message
    const { data: lastMessageData } = await supabase
      .from('messages')
      .select(
        `
        id,
        conversation_id,
        sender_id,
        content,
        created_at,
        read_at,
        message_attachments (
          id,
          message_id,
          file_url,
          file_name,
          file_type,
          file_size
        )
      `
      )
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .is('read_at', null);

    const participants = (conversation.conversation_participants || []).map(
      (p: Record<string, unknown>) => ({
        id: p.id as string,
        conversation_id: p.conversation_id as string,
        user_id: p.user_id as string,
        role: p.role as 'athlete' | 'brand',
        profile: p.profile as ConversationParticipant['profile'],
        brand: p.brand as ConversationParticipant['brand'],
      })
    );

    const result: Conversation = {
      id: conversation.id,
      deal_id: conversation.deal_id,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
      participants,
      unread_count: unreadCount || 0,
    };

    if (lastMessageData) {
      result.last_message = {
        id: lastMessageData.id,
        conversation_id: lastMessageData.conversation_id,
        sender_id: lastMessageData.sender_id,
        content: lastMessageData.content,
        created_at: lastMessageData.created_at,
        read_at: lastMessageData.read_at,
        attachments: lastMessageData.message_attachments as MessageAttachment[],
      };
    }

    return { data: result, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Create a new conversation with specified participants
 *
 * Creates a conversation and adds all participants including the current user.
 * Participant roles are determined from their profile roles.
 *
 * @param participantIds - Array of user IDs to add as participants
 * @param dealId - Optional deal ID to associate with the conversation
 * @returns Promise resolving to ServiceResult with the created Conversation
 * @example
 * const { data: conversation } = await createConversation(
 *   [brandUserId],
 *   'deal-123'
 * );
 */
export async function createConversation(
  participantIds: string[],
  dealId?: string
): Promise<ServiceResult<Conversation>> {
  const supabase = createClient();

  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: userError || new Error('Not authenticated') };
    }

    // Ensure current user is included in participants
    const allParticipantIds = [...new Set([user.id, ...participantIds])];

    if (allParticipantIds.length < 2) {
      return { data: null, error: new Error('At least 2 participants are required') };
    }

    // Get participant profiles to determine roles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, role')
      .in('id', allParticipantIds);

    if (profilesError || !profiles) {
      return { data: null, error: profilesError || new Error('Failed to fetch participant profiles') };
    }

    // Create the conversation
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        deal_id: dealId || null,
      })
      .select()
      .single();

    if (conversationError || !conversation) {
      return {
        data: null,
        error: conversationError || new Error('Failed to create conversation'),
      };
    }

    // Add participants
    const participantsToInsert = allParticipantIds.map((participantId) => {
      const profile = profiles.find((p) => p.id === participantId);
      return {
        conversation_id: conversation.id,
        user_id: participantId,
        role: profile?.role === 'brand' ? 'brand' : 'athlete',
      };
    });

    const { error: participantsError } = await supabase
      .from('conversation_participants')
      .insert(participantsToInsert);

    if (participantsError) {
      // Rollback: delete the conversation
      await supabase.from('conversations').delete().eq('id', conversation.id);
      return { data: null, error: participantsError };
    }

    // Fetch the full conversation with participants
    return getConversationById(conversation.id);
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Get or create a conversation for a specific deal
 *
 * Checks if a conversation exists for the deal and returns it, or creates
 * a new conversation between the deal's brand and athlete if none exists.
 * Only participants in the deal can access this conversation.
 *
 * @param dealId - The unique identifier of the deal
 * @returns Promise resolving to ServiceResult with the Conversation
 * @example
 * // Opens or creates conversation for a deal
 * const { data: conversation } = await getOrCreateConversationByDealId('deal-123');
 * if (conversation) {
 *   router.push(`/messages/${conversation.id}`);
 * }
 */
export async function getOrCreateConversationByDealId(
  dealId: string
): Promise<ServiceResult<Conversation>> {
  const supabase = createClient();

  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: userError || new Error('Not authenticated') };
    }

    // First, check if a conversation already exists for this deal
    const { data: existingConv, error: existingError } = await supabase
      .from('conversations')
      .select('id')
      .eq('deal_id', dealId)
      .single();

    if (existingConv && !existingError) {
      // Conversation exists, return it
      return getConversationById(existingConv.id);
    }

    // No existing conversation, need to create one
    // First, get the deal to find participants
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select(
        `
        id,
        athlete_id,
        brand_id,
        athletes!inner(profile_id),
        brands!inner(profile_id)
      `
      )
      .eq('id', dealId)
      .single();

    if (dealError || !deal) {
      return {
        data: null,
        error: dealError || new Error('Deal not found'),
      };
    }

    // Extract profile IDs from the deal
    // Supabase returns joined data as objects when using single()
    const athletes = deal.athletes as unknown as { profile_id: string } | null;
    const brands = deal.brands as unknown as { profile_id: string } | null;
    const athleteProfileId = athletes?.profile_id;
    const brandProfileId = brands?.profile_id;

    if (!athleteProfileId || !brandProfileId) {
      return {
        data: null,
        error: new Error('Could not determine deal participants'),
      };
    }

    // Verify current user is a participant
    if (user.id !== athleteProfileId && user.id !== brandProfileId) {
      return {
        data: null,
        error: new Error('Access denied: You are not a participant in this deal'),
      };
    }

    // Create the conversation
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        deal_id: dealId,
      })
      .select()
      .single();

    if (conversationError || !conversation) {
      return {
        data: null,
        error: conversationError || new Error('Failed to create conversation'),
      };
    }

    // Add participants
    const participantsToInsert = [
      {
        conversation_id: conversation.id,
        user_id: athleteProfileId,
        role: 'athlete',
      },
      {
        conversation_id: conversation.id,
        user_id: brandProfileId,
        role: 'brand',
      },
    ];

    const { error: participantsError } = await supabase
      .from('conversation_participants')
      .insert(participantsToInsert);

    if (participantsError) {
      // Rollback: delete the conversation
      await supabase.from('conversations').delete().eq('id', conversation.id);
      return { data: null, error: participantsError };
    }

    // Fetch the full conversation with participants
    return getConversationById(conversation.id);
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}
