'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types';

export interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Callback when search query changes */
  onSearch?: (query: string) => void;
  /** Current search query */
  searchQuery?: string;
  /** Custom class name */
  className?: string;
  /** Empty state message */
  emptyMessage?: string;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  searchPlaceholder = 'Search conversations...',
  onSearch,
  searchQuery = '',
  className,
  emptyMessage = 'No conversations yet',
}: ConversationListProps) {
  // Sort conversations by most recent message
  const sortedConversations = [...conversations].sort((a, b) => {
    const aTime = a.lastMessage?.timestamp || a.last_message_at || '';
    const bTime = b.lastMessage?.timestamp || b.last_message_at || '';
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  // Get display info for a conversation
  const getDisplayInfo = (conv: Conversation) => {
    // Use the first participant that's not the current user (in a real app, filter by current user)
    const participant = conv.participants[0];
    const lastMessageContent = conv.lastMessage?.content || conv.last_message || '';
    const lastMessageTime = conv.lastMessage?.timestamp || conv.last_message_at || '';
    const unread = conv.unreadCount ?? conv.unread_count ?? 0;

    return {
      name: participant?.name || 'Unknown',
      avatar: participant?.avatar,
      subtitle: participant?.subtitle,
      lastMessage: lastMessageContent,
      lastMessageTime,
      unreadCount: unread,
    };
  };

  return (
    <div className={cn(
      'flex flex-col h-full bg-[var(--bg-card)]',
      className
    )}>
      {/* Search */}
      <div className="p-4 border-b border-[var(--border-color)] flex-shrink-0">
        <Input
          placeholder={searchPlaceholder}
          icon={<Search className="h-4 w-4" />}
          value={searchQuery}
          onChange={(e) => onSearch?.(e.target.value)}
        />
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto">
        {sortedConversations.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[var(--text-muted)] text-sm">
            {emptyMessage}
          </div>
        ) : (
          sortedConversations.map((conv) => {
            const info = getDisplayInfo(conv);
            const isSelected = selectedId === conv.id;

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  'w-full p-4 text-left border-b border-[var(--border-color)]',
                  'hover:bg-[var(--bg-tertiary)] transition-colors',
                  isSelected && 'bg-[var(--bg-tertiary)] border-l-2 border-l-[var(--color-primary)]'
                )}
              >
                <div className="flex items-start gap-3">
                  <Avatar
                    fallback={info.name.charAt(0)}
                    src={info.avatar}
                    alt={info.name}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={cn(
                        'font-medium truncate',
                        info.unreadCount > 0
                          ? 'text-[var(--text-primary)]'
                          : 'text-[var(--text-primary)]'
                      )}>
                        {info.name}
                      </span>
                      {info.lastMessageTime && (
                        <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
                          {formatRelativeTime(info.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    {info.subtitle && (
                      <p className="text-xs text-[var(--text-muted)] mb-1 truncate">
                        {info.subtitle}
                      </p>
                    )}
                    <p className={cn(
                      'text-sm truncate',
                      info.unreadCount > 0
                        ? 'text-[var(--text-primary)] font-medium'
                        : 'text-[var(--text-secondary)]'
                    )}>
                      {info.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                  {info.unreadCount > 0 && (
                    <Badge variant="primary" size="sm" className="flex-shrink-0">
                      {info.unreadCount}
                    </Badge>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
