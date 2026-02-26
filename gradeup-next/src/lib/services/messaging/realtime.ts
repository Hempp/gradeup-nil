'use client';

import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import type { Message, MessageAttachment } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// Realtime Subscription Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Subscribe to real-time new messages in a conversation
 *
 * Sets up a Supabase Realtime subscription to receive new messages
 * as they are inserted into the conversation. Automatically fetches
 * attachments for new messages.
 *
 * @param conversationId - The unique identifier of the conversation
 * @param callback - Function called when a new message arrives
 * @returns Unsubscribe function to clean up the subscription
 * @example
 * const unsubscribe = subscribeToMessages('conv-123', (message) => {
 *   setMessages(prev => [...prev, message]);
 * });
 *
 * // Cleanup on unmount
 * return () => unsubscribe();
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
