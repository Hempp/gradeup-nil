'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { useToastActions } from '@/components/ui/toast';
import { formatRelativeTime } from '@/lib/utils';
import {
  sendMessage,
  getMessages,
  getOrCreateConversationByDealId,
  subscribeToMessages,
  markAsRead,
  type Message as MessagingMessage,
} from '@/lib/services/messaging';
import type { DealDetail } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGES PANEL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface MessagesPanelProps {
  deal: DealDetail;
}

export function MessagesPanel({ deal }: MessagesPanelProps) {
  const toast = useToastActions();
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<MessagingMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      node.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Initialize conversation and load messages
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeMessaging = async () => {
      setIsLoadingMessages(true);

      try {
        // Get or create conversation for this deal
        const conversationResult = await getOrCreateConversationByDealId(deal.id);

        if (conversationResult.error || !conversationResult.data) {
          // Fallback to mock messages if conversation setup fails
          if (process.env.NODE_ENV === 'development') {
            console.warn('Failed to load conversation, using mock data:', conversationResult.error);
          }
          // Convert mock messages to MessagingMessage format
          const mockMessages: MessagingMessage[] = deal.messages.map((msg) => ({
            id: msg.id,
            conversation_id: 'mock',
            sender_id: msg.senderId === 'athlete' ? 'current-user' : 'brand-user',
            content: msg.message,
            created_at: msg.timestamp,
            read_at: null,
          }));
          setMessages(mockMessages);
          setCurrentUserId('current-user');
          setIsLoadingMessages(false);
          return;
        }

        const conversation = conversationResult.data;
        setConversationId(conversation.id);

        // Determine current user from participants
        const currentParticipant = conversation.participants.find(
          (p) => p.role === 'athlete'
        );
        if (currentParticipant) {
          setCurrentUserId(currentParticipant.user_id);
        }

        // Load existing messages
        const messagesResult = await getMessages(conversation.id);

        if (messagesResult.error) {
          toast.error('Failed to load messages', messagesResult.error.message);
        } else if (messagesResult.data) {
          setMessages(messagesResult.data);

          // Mark messages as read
          await markAsRead(conversation.id);
        }

        // Subscribe to new messages
        unsubscribe = subscribeToMessages(conversation.id, (newMsg) => {
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) {
              return prev;
            }
            return [...prev, newMsg];
          });

          // Mark as read if it's from the other party
          if (currentParticipant && newMsg.sender_id !== currentParticipant.user_id) {
            markAsRead(conversation.id);
          }
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error initializing messaging:', error);
        }
        toast.error(
          'Failed to load messages',
          error instanceof Error ? error.message : 'An unexpected error occurred'
        );
      } finally {
        setIsLoadingMessages(false);
      }
    };

    initializeMessaging();

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [deal.id, deal.messages, toast]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    // If no conversation (mock mode), show info toast
    if (!conversationId) {
      toast.info(
        'Demo Mode',
        'Message sending is available when connected to the backend.'
      );
      setNewMessage('');
      return;
    }

    setIsSending(true);
    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX

    try {
      const result = await sendMessage(conversationId, messageContent);

      if (result.error) {
        // Restore the message if sending failed
        setNewMessage(messageContent);
        toast.error('Failed to send message', result.error.message);
        return;
      }

      if (result.data) {
        // Add the message to local state (realtime subscription should also handle this)
        setMessages((prev) => {
          // Avoid duplicates from realtime subscription
          if (prev.some((m) => m.id === result.data!.id)) {
            return prev;
          }
          return [...prev, result.data!];
        });
      }
    } catch (error) {
      // Restore the message if sending failed
      setNewMessage(messageContent);
      if (process.env.NODE_ENV === 'development') {
        console.error('Error sending message:', error);
      }
      toast.error(
        'Failed to send message',
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <Avatar fallback={deal.brand.contactName.charAt(0)} size="md" />
          <div>
            <CardTitle className="text-base">{deal.brand.contactName}</CardTitle>
            <p className="text-sm text-[var(--text-muted)]">{deal.brand.name}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto py-4">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[var(--text-muted)]">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-sm text-[var(--text-muted)]">No messages yet</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Send a message to start the conversation
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isCurrentUser = message.sender_id === currentUserId;
              return (
                <div
                  key={message.id}
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] ${
                      isCurrentUser
                        ? 'bg-[var(--color-primary)] text-black'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                    } rounded-[var(--radius-lg)] px-4 py-3`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isCurrentUser ? 'text-white/70' : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {formatRelativeTime(message.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t border-[var(--border-color)]">
        <div className="flex items-center gap-2 w-full">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isSending}
            className="flex-1 h-10 px-4 rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button
            variant="primary"
            size="md"
            disabled={!newMessage.trim() || isSending}
            onClick={handleSendMessage}
          >
            {isSending ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export default MessagesPanel;
