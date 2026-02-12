'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Message } from '@/lib/services/messaging';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface UseRealtimeMessagesOptions {
  conversationId: string | null;
  onNewMessage?: (message: Message) => void;
  onTypingStart?: (userId: string) => void;
  onTypingEnd?: (userId: string) => void;
}

export interface UseRealtimeMessagesResult {
  messages: Message[];
  isConnected: boolean;
  sendMessage: (content: string) => Promise<void>;
  setTyping: (isTyping: boolean) => void;
  typingUsers: string[];
  error: Error | null;
}

export interface TypingIndicator {
  userId: string;
  conversationId: string;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Real-time Messaging Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook for real-time messaging with Supabase subscriptions
 * Handles message delivery, typing indicators, and connection state
 */
export function useRealtimeMessages({
  conversationId,
  onNewMessage,
  onTypingStart,
  onTypingEnd,
}: UseRealtimeMessagesOptions): UseRealtimeMessagesResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const currentUserIdRef = useRef<string | null>(null);

  // Fetch initial messages
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        const { getMessages } = await import('@/lib/services/messaging');
        const result = await getMessages(conversationId);
        if (result.data) {
          setMessages(result.data);
        }
        if (result.error) {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch messages'));
      }
    };

    fetchMessages();
  }, [conversationId]);

  // Get current user ID
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      currentUserIdRef.current = user?.id || null;
    });
  }, []);

  // Subscribe to new messages
  useEffect(() => {
    if (!conversationId) return;

    const supabase = createClient();

    // Subscribe to messages channel
    channelRef.current = supabase
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
          const newMessageData = payload.new as Record<string, unknown>;

          // Fetch attachments if any
          const { data: attachments } = await supabase
            .from('message_attachments')
            .select('*')
            .eq('message_id', newMessageData.id);

          const newMessage: Message = {
            id: newMessageData.id as string,
            conversation_id: newMessageData.conversation_id as string,
            sender_id: newMessageData.sender_id as string,
            content: newMessageData.content as string,
            created_at: newMessageData.created_at as string,
            read_at: newMessageData.read_at as string | null,
            attachments: attachments || undefined,
          };

          // Add to messages (avoid duplicates)
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });

          // Remove typing indicator for sender
          setTypingUsers((prev) => prev.filter((id) => id !== newMessage.sender_id));

          // Trigger callback
          onNewMessage?.(newMessage);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'CHANNEL_ERROR') {
          setError(new Error('Failed to connect to message channel'));
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, onNewMessage]);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!conversationId) return;

    const supabase = createClient();

    typingChannelRef.current = supabase
      .channel(`typing:${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId, isTyping } = payload.payload as { userId: string; isTyping: boolean };

        // Don't show own typing indicator
        if (userId === currentUserIdRef.current) return;

        if (isTyping) {
          // Add to typing users
          setTypingUsers((prev) => {
            if (prev.includes(userId)) return prev;
            return [...prev, userId];
          });
          onTypingStart?.(userId);

          // Clear existing timeout
          const existingTimeout = typingTimeoutsRef.current.get(userId);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          // Auto-remove after 3 seconds
          const timeout = setTimeout(() => {
            setTypingUsers((prev) => prev.filter((id) => id !== userId));
            onTypingEnd?.(userId);
            typingTimeoutsRef.current.delete(userId);
          }, 3000);

          typingTimeoutsRef.current.set(userId, timeout);
        } else {
          // Remove from typing users
          setTypingUsers((prev) => prev.filter((id) => id !== userId));
          onTypingEnd?.(userId);

          const existingTimeout = typingTimeoutsRef.current.get(userId);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
            typingTimeoutsRef.current.delete(userId);
          }
        }
      })
      .subscribe();

    return () => {
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
        typingChannelRef.current = null;
      }

      // Clear all timeouts
      typingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutsRef.current.clear();
    };
  }, [conversationId, onTypingStart, onTypingEnd]);

  // Send message function
  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId || !content.trim()) return;

    try {
      const { sendMessage: sendMessageService } = await import('@/lib/services/messaging');

      // Optimistic update
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: currentUserIdRef.current || 'unknown',
        content: content.trim(),
        created_at: new Date().toISOString(),
        read_at: null,
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      // Send to server
      const result = await sendMessageService(conversationId, content.trim());

      if (result.error) {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
        setError(result.error);
      } else if (result.data) {
        // Replace optimistic message with real one
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMessage.id ? result.data! : m))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to send message'));
    }
  }, [conversationId]);

  // Set typing indicator
  const setTyping = useCallback((isTyping: boolean) => {
    if (!conversationId || !typingChannelRef.current || !currentUserIdRef.current) return;

    typingChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: currentUserIdRef.current,
        isTyping,
      },
    });
  }, [conversationId]);

  return {
    messages,
    isConnected,
    sendMessage,
    setTyping,
    typingUsers,
    error,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Real-time Notifications Hook
// ═══════════════════════════════════════════════════════════════════════════

export interface Notification {
  id: string;
  type: 'deal' | 'message' | 'payment' | 'system';
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface UseRealtimeNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  isConnected: boolean;
}

/**
 * Hook for real-time notifications
 */
export function useRealtimeNotifications(): UseRealtimeNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch initial notifications
      const { data: initialNotifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (initialNotifications) {
        setNotifications(initialNotifications as Notification[]);
      }

      // Subscribe to new notifications
      channelRef.current = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications((prev) => [newNotification, ...prev]);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const updatedNotification = payload.new as Notification;
            setNotifications((prev) =>
              prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
            );
          }
        )
        .subscribe((status) => {
          setIsConnected(status === 'SUBSCRIBED');
        });
    };

    setupSubscription();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback(async (id: string) => {
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isConnected,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Presence Hook (Online Status)
// ═══════════════════════════════════════════════════════════════════════════

export interface PresenceUser {
  id: string;
  online_at: string;
}

export interface UsePresenceResult {
  onlineUsers: PresenceUser[];
  isUserOnline: (userId: string) => boolean;
}

/**
 * Hook for tracking user presence/online status
 */
export function usePresence(roomId: string): UsePresenceResult {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const supabase = createClient();

    const setupPresence = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channelRef.current = supabase
        .channel(`presence:${roomId}`)
        .on('presence', { event: 'sync' }, () => {
          const state = channelRef.current?.presenceState() || {};
          const users: PresenceUser[] = [];

          Object.values(state).forEach((presences) => {
            (presences as unknown as PresenceUser[]).forEach((presence) => {
              if (presence.id && presence.online_at) {
                users.push(presence);
              }
            });
          });

          setOnlineUsers(users);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channelRef.current?.track({
              id: user.id,
              online_at: new Date().toISOString(),
            });
          }
        });
    };

    setupPresence();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomId]);

  const isUserOnline = useCallback(
    (userId: string) => onlineUsers.some((u) => u.id === userId),
    [onlineUsers]
  );

  return {
    onlineUsers,
    isUserOnline,
  };
}
