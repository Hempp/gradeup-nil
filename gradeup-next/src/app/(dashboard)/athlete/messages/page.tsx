'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MessageThread } from '@/components/shared/message-thread';
import { ConversationList } from '@/components/shared/conversation-list';
import { cn } from '@/lib/utils';
import type { Conversation, Message, ConversationParticipant } from '@/types';

// Mock conversations for athlete - conversations with brands
const mockConversations: Conversation[] = [
  {
    id: '1',
    participants: [
      { id: 'brand-1', name: 'Nike', avatar: undefined, subtitle: 'Instagram Post Campaign' }
    ],
    lastMessage: {
      id: 'msg-5',
      conversationId: '1',
      senderId: 'brand-1',
      content: 'Great work on the first post! Looking forward to seeing the next one.',
      timestamp: '2024-02-11T10:30:00Z',
      read: false,
    },
    unreadCount: 2,
  },
  {
    id: '2',
    participants: [
      { id: 'brand-2', name: 'Gatorade', avatar: undefined, subtitle: 'Social Media Endorsement' }
    ],
    lastMessage: {
      id: 'msg-8',
      conversationId: '2',
      senderId: 'brand-2',
      content: 'We can discuss the contract terms. When are you available?',
      timestamp: '2024-02-10T16:45:00Z',
      read: true,
    },
    unreadCount: 0,
  },
  {
    id: '3',
    participants: [
      { id: 'brand-3', name: 'Foot Locker', avatar: undefined, subtitle: 'Store Opening Appearance' }
    ],
    lastMessage: {
      id: 'msg-12',
      conversationId: '3',
      senderId: 'brand-3',
      content: 'The event is scheduled for next Saturday at 2 PM.',
      timestamp: '2024-02-09T11:20:00Z',
      read: false,
    },
    unreadCount: 1,
  },
  {
    id: '4',
    participants: [
      { id: 'brand-4', name: 'Duke Athletics', avatar: undefined, subtitle: 'Youth Basketball Camp' }
    ],
    lastMessage: {
      id: 'msg-15',
      conversationId: '4',
      senderId: 'brand-4',
      content: 'Thank you for participating! The kids loved it.',
      timestamp: '2024-01-18T17:00:00Z',
      read: true,
    },
    unreadCount: 0,
  },
];

// Mock messages for each conversation
const mockMessagesByConversation: Record<string, Message[]> = {
  '1': [
    {
      id: '1',
      conversationId: '1',
      senderId: 'brand-1',
      content: 'Hi Marcus! We loved your application for our Instagram campaign.',
      timestamp: '2024-02-10T09:00:00Z',
      read: true,
    },
    {
      id: '2',
      conversationId: '1',
      senderId: 'athlete',
      content: "Thank you! I'm excited about the opportunity to work with Nike.",
      timestamp: '2024-02-10T09:15:00Z',
      read: true,
    },
    {
      id: '3',
      conversationId: '1',
      senderId: 'brand-1',
      content: "We'd like to discuss the campaign details. The first post should feature our new running shoes.",
      timestamp: '2024-02-10T09:30:00Z',
      read: true,
    },
    {
      id: '4',
      conversationId: '1',
      senderId: 'athlete',
      content: 'Sounds great! I can create content that showcases the shoes during my training sessions.',
      timestamp: '2024-02-10T10:00:00Z',
      read: true,
    },
    {
      id: '5',
      conversationId: '1',
      senderId: 'brand-1',
      content: 'Great work on the first post! Looking forward to seeing the next one.',
      timestamp: '2024-02-11T10:30:00Z',
      read: false,
    },
  ],
  '2': [
    {
      id: '6',
      conversationId: '2',
      senderId: 'brand-2',
      content: "Hello! We've been following your athletic career and are impressed with your performance.",
      timestamp: '2024-02-08T14:00:00Z',
      read: true,
    },
    {
      id: '7',
      conversationId: '2',
      senderId: 'athlete',
      content: 'Thank you for reaching out! I use Gatorade products regularly.',
      timestamp: '2024-02-08T14:30:00Z',
      read: true,
    },
    {
      id: '8',
      conversationId: '2',
      senderId: 'brand-2',
      content: 'We can discuss the contract terms. When are you available?',
      timestamp: '2024-02-10T16:45:00Z',
      read: true,
    },
  ],
  '3': [
    {
      id: '9',
      conversationId: '3',
      senderId: 'brand-3',
      content: "We're opening a new store and would love to have you at the grand opening!",
      timestamp: '2024-02-07T10:00:00Z',
      read: true,
    },
    {
      id: '10',
      conversationId: '3',
      senderId: 'athlete',
      content: "That sounds exciting! What would be involved?",
      timestamp: '2024-02-07T11:00:00Z',
      read: true,
    },
    {
      id: '11',
      conversationId: '3',
      senderId: 'brand-3',
      content: "Just a 2-hour appearance, meeting fans, and signing some autographs.",
      timestamp: '2024-02-08T09:00:00Z',
      read: true,
    },
    {
      id: '12',
      conversationId: '3',
      senderId: 'brand-3',
      content: 'The event is scheduled for next Saturday at 2 PM.',
      timestamp: '2024-02-09T11:20:00Z',
      read: false,
    },
  ],
  '4': [
    {
      id: '13',
      conversationId: '4',
      senderId: 'brand-4',
      content: 'The youth basketball camp was a huge success!',
      timestamp: '2024-01-18T15:00:00Z',
      read: true,
    },
    {
      id: '14',
      conversationId: '4',
      senderId: 'athlete',
      content: 'I had a great time! The kids were so enthusiastic.',
      timestamp: '2024-01-18T16:00:00Z',
      read: true,
    },
    {
      id: '15',
      conversationId: '4',
      senderId: 'brand-4',
      content: 'Thank you for participating! The kids loved it.',
      timestamp: '2024-01-18T17:00:00Z',
      read: true,
    },
  ],
};

// Current user ID for the athlete
const CURRENT_USER_ID = 'athlete';

export default function AthleteMessagesPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    mockConversations[0]?.id || null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState(mockConversations);
  const [messagesByConversation, setMessagesByConversation] = useState(mockMessagesByConversation);
  // Mobile: track if we're viewing the thread (vs the list)
  const [mobileShowThread, setMobileShowThread] = useState(false);

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter((conv) => {
      const participant = conv.participants[0];
      return (
        participant?.name.toLowerCase().includes(query) ||
        participant?.subtitle?.toLowerCase().includes(query) ||
        conv.lastMessage?.content.toLowerCase().includes(query)
      );
    });
  }, [conversations, searchQuery]);

  // Get current conversation and its participant
  const currentConversation = conversations.find((c) => c.id === selectedConversationId);
  const currentParticipant: ConversationParticipant | undefined = currentConversation?.participants[0];
  const currentMessages = selectedConversationId
    ? messagesByConversation[selectedConversationId] || []
    : [];

  // Handle selecting a conversation
  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setMobileShowThread(true);
  };

  // Handle going back to list on mobile
  const handleBack = () => {
    setMobileShowThread(false);
  };

  // Handle sending a message
  const handleSendMessage = (content: string) => {
    if (!selectedConversationId) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId: selectedConversationId,
      senderId: CURRENT_USER_ID,
      content,
      timestamp: new Date().toISOString(),
      read: true,
    };

    // Add to messages
    setMessagesByConversation((prev) => ({
      ...prev,
      [selectedConversationId]: [...(prev[selectedConversationId] || []), newMessage],
    }));

    // Update conversation's last message
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedConversationId
          ? { ...conv, lastMessage: newMessage }
          : conv
      )
    );
  };

  return (
    <div className="animate-fade-in -m-6 lg:-m-8">
      <Card className="rounded-none lg:rounded-[var(--radius-lg)] h-[calc(100vh-4rem)] lg:h-[calc(100vh-8rem)] overflow-hidden">
        <CardContent className="p-0 h-full flex">
          {/* Conversation List - 35% on desktop, full width on mobile when not viewing thread */}
          <div
            className={cn(
              'border-r border-[var(--border-color)]',
              // Desktop: always visible at 35%
              'lg:w-[35%] lg:flex lg:flex-col',
              // Mobile: full width when not viewing thread, hidden when viewing thread
              mobileShowThread ? 'hidden' : 'w-full flex flex-col'
            )}
          >
            <ConversationList
              conversations={filteredConversations}
              selectedId={selectedConversationId}
              onSelect={handleSelectConversation}
              searchPlaceholder="Search brands..."
              searchQuery={searchQuery}
              onSearch={setSearchQuery}
              emptyMessage="No conversations with brands yet"
            />
          </div>

          {/* Message Thread - 65% on desktop, full width on mobile when viewing thread */}
          <div
            className={cn(
              // Desktop: always visible at 65%
              'lg:w-[65%] lg:flex lg:flex-col',
              // Mobile: full width when viewing thread, hidden when viewing list
              mobileShowThread ? 'w-full flex flex-col' : 'hidden'
            )}
          >
            <MessageThread
              messages={currentMessages}
              currentUserId={CURRENT_USER_ID}
              onSendMessage={handleSendMessage}
              participant={currentParticipant}
              onBack={handleBack}
              showBackButton={mobileShowThread}
              emptyStateMessage="Select a conversation to view messages"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
