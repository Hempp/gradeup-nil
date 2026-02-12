'use client';

import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

export interface ServiceResult<T = null> {
  data: T | null;
  error: Error | null;
}

export interface Conversation {
  id: string;
  deal_id: string | null;
  created_at: string;
  updated_at: string;
  participants: ConversationParticipant[];
  last_message?: Message;
  unread_count: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'athlete' | 'brand';
  profile?: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
  brand?: {
    company_name: string;
    logo_url: string | null;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Messaging Service Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all conversations for the current user
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
 * Get a single conversation by ID
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
 * Get messages for a conversation with pagination
 */
export async function getMessages(
  conversationId: string,
  options?: { limit?: number; before?: string }
): Promise<ServiceResult<Message[]>> {
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

    const limit = options?.limit ?? 50;

    let query = supabase
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
      .limit(limit);

    if (options?.before) {
      query = query.lt('created_at', options.before);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      return { data: null, error: messagesError };
    }

    const formattedMessages: Message[] = (messages || []).map((msg) => ({
      id: msg.id,
      conversation_id: msg.conversation_id,
      sender_id: msg.sender_id,
      content: msg.content,
      created_at: msg.created_at,
      read_at: msg.read_at,
      attachments: msg.message_attachments as MessageAttachment[],
    }));

    // Return in chronological order
    return { data: formattedMessages.reverse(), error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Send a message to a conversation
 */
export async function sendMessage(
  conversationId: string,
  content: string,
  attachments?: File[]
): Promise<ServiceResult<Message>> {
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

    // Insert the message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
      })
      .select()
      .single();

    if (messageError || !message) {
      return { data: null, error: messageError || new Error('Failed to send message') };
    }

    // Handle attachments if provided
    const uploadedAttachments: MessageAttachment[] = [];

    if (attachments && attachments.length > 0) {
      for (const file of attachments) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${message.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Failed to upload attachment:', uploadError);
          continue;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('message-attachments').getPublicUrl(fileName);

        const { data: attachmentData, error: attachmentError } = await supabase
          .from('message_attachments')
          .insert({
            message_id: message.id,
            file_url: publicUrl,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
          })
          .select()
          .single();

        if (!attachmentError && attachmentData) {
          uploadedAttachments.push(attachmentData as MessageAttachment);
        }
      }
    }

    // Update conversation updated_at timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    const result: Message = {
      id: message.id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      content: message.content,
      created_at: message.created_at,
      read_at: message.read_at,
      attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
    };

    return { data: result, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Mark all messages in a conversation as read
 */
export async function markAsRead(conversationId: string): Promise<ServiceResult> {
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

    // Mark all unread messages from other users as read
    const { error: updateError } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .is('read_at', null);

    if (updateError) {
      return { data: null, error: updateError };
    }

    return { data: null, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Create a new conversation with specified participants
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
 * Get total unread message count for the current user
 */
export async function getUnreadCount(): Promise<ServiceResult<number>> {
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
      return { data: 0, error: null };
    }

    const conversationIds = participantData.map((p) => p.conversation_id);

    // Count unread messages
    const { count, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .neq('sender_id', user.id)
      .is('read_at', null);

    if (countError) {
      return { data: null, error: countError };
    }

    return { data: count || 0, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Subscribe to new messages in a conversation
 * Returns an unsubscribe function
 */
export function subscribeToMessages(
  conversationId: string,
  callback: (message: Message) => void
): () => void {
  const supabase = createClient();
  let channel: RealtimeChannel | null = null;

  // Create subscription
  channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        const newMessage = payload.new as Record<string, unknown>;

        // Fetch attachments for the new message
        const { data: attachments } = await supabase
          .from('message_attachments')
          .select('*')
          .eq('message_id', newMessage.id);

        const message: Message = {
          id: newMessage.id as string,
          conversation_id: newMessage.conversation_id as string,
          sender_id: newMessage.sender_id as string,
          content: newMessage.content as string,
          created_at: newMessage.created_at as string,
          read_at: newMessage.read_at as string | null,
          attachments: (attachments as MessageAttachment[]) || undefined,
        };

        callback(message);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}
