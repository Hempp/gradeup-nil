'use client';

import { useState } from 'react';
import { Search, Send, Paperclip, MoreVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';

// Mock conversations
const mockConversations = [
  {
    id: '1',
    brand: { name: 'Nike', logo: null },
    dealTitle: 'Instagram Post Campaign',
    lastMessage: 'Great work on the first post! Looking forward to seeing the next one.',
    lastMessageAt: '2024-02-11T10:30:00Z',
    unreadCount: 2,
  },
  {
    id: '2',
    brand: { name: 'Gatorade', logo: null },
    dealTitle: 'Social Media Endorsement',
    lastMessage: 'We can discuss the contract terms. When are you available?',
    lastMessageAt: '2024-02-10T16:45:00Z',
    unreadCount: 0,
  },
  {
    id: '3',
    brand: { name: 'Foot Locker', logo: null },
    dealTitle: 'Store Opening Appearance',
    lastMessage: 'The event is scheduled for next Saturday at 2 PM.',
    lastMessageAt: '2024-02-09T11:20:00Z',
    unreadCount: 1,
  },
  {
    id: '4',
    brand: { name: 'Duke Athletics', logo: null },
    dealTitle: 'Youth Basketball Camp',
    lastMessage: 'Thank you for participating! The kids loved it.',
    lastMessageAt: '2024-01-18T17:00:00Z',
    unreadCount: 0,
  },
];

// Mock messages for selected conversation
const mockMessages = [
  {
    id: '1',
    senderId: 'brand',
    message: 'Hi Marcus! We loved your application for our Instagram campaign.',
    createdAt: '2024-02-10T09:00:00Z',
  },
  {
    id: '2',
    senderId: 'athlete',
    message: 'Thank you! I\'m excited about the opportunity to work with Nike.',
    createdAt: '2024-02-10T09:15:00Z',
  },
  {
    id: '3',
    senderId: 'brand',
    message: 'We\'d like to discuss the campaign details. The first post should feature our new running shoes.',
    createdAt: '2024-02-10T09:30:00Z',
  },
  {
    id: '4',
    senderId: 'athlete',
    message: 'Sounds great! I can create content that showcases the shoes during my training sessions.',
    createdAt: '2024-02-10T10:00:00Z',
  },
  {
    id: '5',
    senderId: 'brand',
    message: 'Great work on the first post! Looking forward to seeing the next one.',
    createdAt: '2024-02-11T10:30:00Z',
  },
];

function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: {
  conversations: typeof mockConversations;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="w-full lg:w-80 border-r border-[var(--border-color)] flex flex-col">
      {/* Search */}
      <div className="p-4 border-b border-[var(--border-color)]">
        <Input
          placeholder="Search conversations..."
          icon={<Search className="h-4 w-4" />}
        />
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full p-4 text-left border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors ${
              selectedId === conv.id ? 'bg-[var(--bg-tertiary)]' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <Avatar fallback={conv.brand.name.charAt(0)} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-medium text-[var(--text-primary)] truncate">
                    {conv.brand.name}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
                    {formatRelativeTime(conv.lastMessageAt)}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mb-1 truncate">
                  {conv.dealTitle}
                </p>
                <p className="text-sm text-[var(--text-secondary)] truncate">
                  {conv.lastMessage}
                </p>
              </div>
              {conv.unreadCount > 0 && (
                <Badge variant="primary" size="sm">
                  {conv.unreadCount}
                </Badge>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageThread({
  conversation,
  messages,
}: {
  conversation: (typeof mockConversations)[0] | null;
  messages: typeof mockMessages;
}) {
  const [newMessage, setNewMessage] = useState('');

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text-muted)]">
        Select a conversation to view messages
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <Avatar fallback={conversation.brand.name.charAt(0)} size="md" />
          <div>
            <p className="font-medium text-[var(--text-primary)]">
              {conversation.brand.name}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {conversation.dealTitle}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderId === 'athlete' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-[var(--radius-lg)] px-4 py-2 ${
                msg.senderId === 'athlete'
                  ? 'bg-[var(--color-primary)] text-[var(--text-inverse)]'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
              }`}
            >
              <p className="text-sm">{msg.message}</p>
              <p
                className={`text-xs mt-1 ${
                  msg.senderId === 'athlete'
                    ? 'text-[var(--text-inverse)]/60'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {formatRelativeTime(msg.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
          />
          <Button variant="primary" size="sm">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AthleteMessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    mockConversations[0]?.id || null
  );

  const currentConversation = mockConversations.find(
    (c) => c.id === selectedConversation
  );

  return (
    <div className="animate-fade-in -m-6 lg:-m-8">
      <Card className="rounded-none lg:rounded-[var(--radius-lg)] h-[calc(100vh-4rem)] lg:h-[calc(100vh-8rem)]">
        <CardContent className="p-0 h-full flex">
          <ConversationList
            conversations={mockConversations}
            selectedId={selectedConversation}
            onSelect={setSelectedConversation}
          />
          <MessageThread
            conversation={currentConversation || null}
            messages={mockMessages}
          />
        </CardContent>
      </Card>
    </div>
  );
}
