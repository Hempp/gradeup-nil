'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MessageThread } from '@/components/shared/message-thread';
import { ConversationList } from '@/components/shared/conversation-list';
import { cn } from '@/lib/utils';
import type { Conversation, Message, ConversationParticipant } from '@/types';

// Mock conversations for brand - conversations with athletes
const mockConversations: Conversation[] = [
  {
    id: '1',
    participants: [
      { id: 'athlete-1', name: 'Marcus Johnson', avatar: undefined, subtitle: 'Duke University - Basketball' }
    ],
    lastMessage: {
      id: 'msg-5',
      conversationId: '1',
      senderId: 'brand',
      content: 'Great work on the first post! Looking forward to seeing the next one.',
      timestamp: '2024-02-11T10:30:00Z',
      read: true,
    },
    unreadCount: 0,
  },
  {
    id: '2',
    participants: [
      { id: 'athlete-2', name: 'Sarah Williams', avatar: undefined, subtitle: 'Stanford University - Soccer' }
    ],
    lastMessage: {
      id: 'msg-8',
      conversationId: '2',
      senderId: 'athlete-2',
      content: "I've reviewed the offer. Can we discuss the deliverables?",
      timestamp: '2024-02-10T16:45:00Z',
      read: false,
    },
    unreadCount: 2,
  },
  {
    id: '3',
    participants: [
      { id: 'athlete-3', name: 'Jordan Davis', avatar: undefined, subtitle: 'Ohio State - Football' }
    ],
    lastMessage: {
      id: 'msg-12',
      conversationId: '3',
      senderId: 'athlete-3',
      content: 'What time should I arrive for the event?',
      timestamp: '2024-02-09T11:20:00Z',
      read: false,
    },
    unreadCount: 1,
  },
  {
    id: '4',
    participants: [
      { id: 'athlete-4', name: 'Emma Thompson', avatar: undefined, subtitle: 'UCLA - Volleyball' }
    ],
    lastMessage: {
      id: 'msg-18',
      conversationId: '4',
      senderId: 'brand',
      content: 'Looking forward to working with you on the summer campaign!',
      timestamp: '2024-02-08T14:00:00Z',
      read: true,
    },
    unreadCount: 0,
  },
  {
    id: '5',
    participants: [
      { id: 'athlete-5', name: 'Tyler Chen', avatar: undefined, subtitle: 'USC - Tennis' }
    ],
    lastMessage: {
      id: 'msg-22',
      conversationId: '5',
      senderId: 'athlete-5',
      content: 'Thank you for the opportunity. The photoshoot was great!',
      timestamp: '2024-02-05T09:30:00Z',
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
      senderId: 'brand',
      content: 'Hi Marcus! We loved your recent posts and would like to discuss a partnership.',
      timestamp: '2024-02-10T09:00:00Z',
      read: true,
    },
    {
      id: '2',
      conversationId: '1',
      senderId: 'athlete-1',
      content: "Thank you! I'm very interested in working with Nike.",
      timestamp: '2024-02-10T09:15:00Z',
      read: true,
    },
    {
      id: '3',
      conversationId: '1',
      senderId: 'brand',
      content: "Great! We're looking for content featuring our new running shoes line.",
      timestamp: '2024-02-10T09:30:00Z',
      read: true,
    },
    {
      id: '4',
      conversationId: '1',
      senderId: 'athlete-1',
      content: 'That sounds perfect. I can showcase them during my training sessions.',
      timestamp: '2024-02-10T10:00:00Z',
      read: true,
    },
    {
      id: '5',
      conversationId: '1',
      senderId: 'brand',
      content: 'Great work on the first post! Looking forward to seeing the next one.',
      timestamp: '2024-02-11T10:30:00Z',
      read: true,
    },
  ],
  '2': [
    {
      id: '6',
      conversationId: '2',
      senderId: 'brand',
      content: "Hello Sarah! We've been following your soccer career and are impressed.",
      timestamp: '2024-02-08T14:00:00Z',
      read: true,
    },
    {
      id: '7',
      conversationId: '2',
      senderId: 'athlete-2',
      content: "Thank you! I'm honored you reached out.",
      timestamp: '2024-02-08T14:30:00Z',
      read: true,
    },
    {
      id: '8',
      conversationId: '2',
      senderId: 'athlete-2',
      content: "I've reviewed the offer. Can we discuss the deliverables?",
      timestamp: '2024-02-10T16:45:00Z',
      read: false,
    },
  ],
  '3': [
    {
      id: '9',
      conversationId: '3',
      senderId: 'brand',
      content: "Hi Jordan! We'd love to have you at our store opening next week.",
      timestamp: '2024-02-07T10:00:00Z',
      read: true,
    },
    {
      id: '10',
      conversationId: '3',
      senderId: 'athlete-3',
      content: 'Sounds great! What does the appearance involve?',
      timestamp: '2024-02-07T11:00:00Z',
      read: true,
    },
    {
      id: '11',
      conversationId: '3',
      senderId: 'brand',
      content: "A 2-hour meet and greet, signing autographs for fans. We'll provide all materials.",
      timestamp: '2024-02-08T09:00:00Z',
      read: true,
    },
    {
      id: '12',
      conversationId: '3',
      senderId: 'athlete-3',
      content: 'What time should I arrive for the event?',
      timestamp: '2024-02-09T11:20:00Z',
      read: false,
    },
  ],
  '4': [
    {
      id: '13',
      conversationId: '4',
      senderId: 'brand',
      content: 'Hi Emma! Your volleyball content has caught our attention.',
      timestamp: '2024-02-06T10:00:00Z',
      read: true,
    },
    {
      id: '14',
      conversationId: '4',
      senderId: 'athlete-4',
      content: "Thanks! I'd love to learn more about what you have in mind.",
      timestamp: '2024-02-06T11:00:00Z',
      read: true,
    },
    {
      id: '15',
      conversationId: '4',
      senderId: 'brand',
      content: "We're planning a summer fitness campaign and think you'd be perfect.",
      timestamp: '2024-02-07T14:00:00Z',
      read: true,
    },
    {
      id: '16',
      conversationId: '4',
      senderId: 'athlete-4',
      content: "That sounds amazing! I'm definitely interested.",
      timestamp: '2024-02-07T15:00:00Z',
      read: true,
    },
    {
      id: '17',
      conversationId: '4',
      senderId: 'brand',
      content: "Perfect! I'll send over the contract details shortly.",
      timestamp: '2024-02-08T10:00:00Z',
      read: true,
    },
    {
      id: '18',
      conversationId: '4',
      senderId: 'brand',
      content: 'Looking forward to working with you on the summer campaign!',
      timestamp: '2024-02-08T14:00:00Z',
      read: true,
    },
  ],
  '5': [
    {
      id: '19',
      conversationId: '5',
      senderId: 'brand',
      content: 'Hi Tyler! Great job at the tournament last week.',
      timestamp: '2024-02-02T09:00:00Z',
      read: true,
    },
    {
      id: '20',
      conversationId: '5',
      senderId: 'athlete-5',
      content: 'Thank you! It was an exciting match.',
      timestamp: '2024-02-02T10:00:00Z',
      read: true,
    },
    {
      id: '21',
      conversationId: '5',
      senderId: 'brand',
      content: "The photoshoot is scheduled for this Friday at our studio.",
      timestamp: '2024-02-03T14:00:00Z',
      read: true,
    },
    {
      id: '22',
      conversationId: '5',
      senderId: 'athlete-5',
      content: 'Thank you for the opportunity. The photoshoot was great!',
      timestamp: '2024-02-05T09:30:00Z',
      read: true,
    },
  ],
};

// Current user ID for the brand
const CURRENT_USER_ID = 'brand';

export default function BrandMessagesPage() {
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
              searchPlaceholder="Search athletes..."
              searchQuery={searchQuery}
              onSearch={setSearchQuery}
              emptyMessage="No conversations with athletes yet"
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
