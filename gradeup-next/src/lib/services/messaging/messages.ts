'use client';

import { createClient } from '@/lib/supabase/client';
import type {
  GetMessagesOptions,
  Message,
  MessageAttachment,
  ServiceResult,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// Message Service Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get messages for a conversation with pagination support
 *
 * Fetches messages with attachments for a conversation. Supports cursor-based
 * pagination using the 'before' timestamp. Messages are returned in
 * chronological order (oldest to newest).
 *
 * @param conversationId - The unique identifier of the conversation
 * @param options - Optional pagination parameters
 * @param options.limit - Maximum messages to return (default: 50)
 * @param options.before - Fetch messages before this timestamp (for infinite scroll)
 * @returns Promise resolving to ServiceResult with Message array
 * @example
 * // Initial load
 * const { data: messages } = await getMessages('conv-123', { limit: 30 });
 *
 * // Load more (older messages)
 * const oldestMessage = messages?.[0];
 * const { data: older } = await getMessages('conv-123', {
 *   limit: 30,
 *   before: oldestMessage?.created_at
 * });
 */
export async function getMessages(
  conversationId: string,
  options?: GetMessagesOptions
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
 * Send a message to a conversation with optional file attachments
 *
 * Creates a new message in the conversation and uploads any attachments
 * to storage. Updates the conversation's updated_at timestamp.
 *
 * @param conversationId - The unique identifier of the conversation
 * @param content - The text content of the message
 * @param attachments - Optional array of files to attach to the message
 * @returns Promise resolving to ServiceResult with the created Message
 * @example
 * const { data: message } = await sendMessage(
 *   'conv-123',
 *   'Here are the contract details',
 *   [contractFile]
 * );
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
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to upload attachment:', uploadError);
          }
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
 * Mark all unread messages in a conversation as read
 *
 * Updates the read_at timestamp for all messages from other users
 * that haven't been read yet.
 *
 * @param conversationId - The unique identifier of the conversation
 * @returns Promise resolving to ServiceResult indicating success or error
 * @example
 * // Call when user opens a conversation
 * await markAsRead('conv-123');
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
