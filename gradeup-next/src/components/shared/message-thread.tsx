'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, ArrowLeft, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Message, ConversationParticipant } from '@/types';

export interface MessageThreadProps {
  messages: Message[];
  currentUserId: string;
  onSendMessage: (content: string) => void;
  /** Header info for the conversation */
  participant?: ConversationParticipant;
  /** Called when back button is clicked (mobile) */
  onBack?: () => void;
  /** Show back button (typically for mobile) */
  showBackButton?: boolean;
  /** Placeholder for empty state */
  emptyStateMessage?: string;
  /** Custom class name */
  className?: string;
}

// Group messages by date for timestamp display
function groupMessagesByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  let currentDate = '';

  messages.forEach((msg) => {
    const msgDate = new Date(msg.timestamp).toDateString();
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groups.push({ date: msgDate, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  });

  return groups;
}

function formatDateDivider(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
}

export function MessageThread({
  messages,
  currentUserId,
  onSendMessage,
  participant,
  onBack,
  showBackButton = false,
  emptyStateMessage = 'Select a conversation to view messages',
  className,
}: MessageThreadProps) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Empty state when no conversation selected
  if (!participant) {
    return (
      <div className={cn(
        'flex-1 flex items-center justify-center text-[var(--text-muted)]',
        className
      )}>
        {emptyStateMessage}
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className={cn('flex-1 flex flex-col h-full', className)}>
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-card)] flex-shrink-0">
        <div className="flex items-center gap-3">
          {showBackButton && onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="mr-1 lg:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Avatar
            fallback={participant.name.charAt(0)}
            src={participant.avatar}
            alt={participant.name}
            size="md"
          />
          <div className="min-w-0">
            <p className="font-medium text-[var(--text-primary)] truncate">
              {participant.name}
            </p>
            {participant.subtitle && (
              <p className="text-xs text-[var(--text-muted)] truncate">
                {participant.subtitle}
              </p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messageGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            {/* Date divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-[var(--border-color)]" />
              <span className="text-xs text-[var(--text-muted)] font-medium px-2">
                {formatDateDivider(group.date)}
              </span>
              <div className="flex-1 h-px bg-[var(--border-color)]" />
            </div>

            {/* Messages in this group */}
            <div className="space-y-3">
              {group.messages.map((msg, msgIndex) => {
                const isSent = msg.senderId === currentUserId;
                const showAvatar = !isSent && (
                  msgIndex === 0 ||
                  group.messages[msgIndex - 1]?.senderId === currentUserId
                );

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-2',
                      isSent ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {/* Avatar for received messages */}
                    {!isSent && (
                      <div className="w-8 flex-shrink-0">
                        {showAvatar && (
                          <Avatar
                            fallback={participant.name.charAt(0)}
                            src={participant.avatar}
                            alt={participant.name}
                            size="sm"
                          />
                        )}
                      </div>
                    )}

                    {/* Message bubble */}
                    <div
                      className={cn(
                        'max-w-[70%] rounded-[var(--radius-lg)] px-4 py-2',
                        isSent
                          ? 'bg-[var(--color-primary)] text-[var(--text-inverse)]'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                      <p
                        className={cn(
                          'text-xs mt-1',
                          isSent
                            ? 'text-[var(--text-inverse)]/60'
                            : 'text-[var(--text-muted)]'
                        )}
                      >
                        {formatRelativeTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex-shrink-0">
        <div className="flex items-end gap-3">
          <Button variant="ghost" size="sm" className="flex-shrink-0 mb-1">
            <Paperclip className="h-4 w-4" />
          </Button>
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              placeholder="Type a message..."
              value={newMessage}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              rows={1}
              className={cn(
                'w-full resize-none rounded-[var(--radius-md)]',
                'bg-[var(--bg-secondary)] border border-[var(--border-color)]',
                'px-3 py-2 text-sm text-[var(--text-primary)]',
                'placeholder:text-[var(--text-muted)]',
                'transition-colors duration-[var(--transition-fast)]',
                'focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]',
                'max-h-[120px] overflow-y-auto'
              )}
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="flex-shrink-0 mb-1"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
