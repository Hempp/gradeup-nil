/**
 * Tests for the MessageThread component
 * @module __tests__/components/shared/MessageThread.test
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageThread } from '@/components/shared/message-thread';
import type { Message, ConversationParticipant } from '@/types';

// Mock utils
jest.mock('@/lib/utils', () => ({
  formatRelativeTime: jest.fn((time) => {
    const date = new Date(time);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }),
  cn: (...args: (string | undefined | false | null)[]) => args.filter(Boolean).join(' '),
}));

describe('MessageThread', () => {
  const mockCurrentUserId = 'user-1';
  const mockOnSendMessage = jest.fn();

  const mockParticipant: ConversationParticipant = {
    id: 'user-2',
    name: 'John Doe',
    avatar: 'https://example.com/avatar.jpg',
    subtitle: 'Nike Brand Manager',
  };

  const mockMessages: Message[] = [
    {
      id: 'msg-1',
      conversationId: 'conv-1',
      content: 'Hello, I am interested in a partnership',
      timestamp: new Date('2024-01-15T10:00:00').toISOString(),
      senderId: 'user-2',
      read: true,
    },
    {
      id: 'msg-2',
      conversationId: 'conv-1',
      content: 'That sounds great! Tell me more.',
      timestamp: new Date('2024-01-15T10:05:00').toISOString(),
      senderId: 'user-1',
      read: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('empty state', () => {
    it('shows default empty message when no participant', () => {
      render(
        <MessageThread
          messages={[]}
          currentUserId={mockCurrentUserId}
          onSendMessage={mockOnSendMessage}
        />
      );

      expect(screen.getByText('Select a conversation to view messages')).toBeInTheDocument();
    });

    it('shows custom empty message when provided', () => {
      render(
        <MessageThread
          messages={[]}
          currentUserId={mockCurrentUserId}
          onSendMessage={mockOnSendMessage}
          emptyStateMessage="No conversation selected"
        />
      );

      expect(screen.getByText('No conversation selected')).toBeInTheDocument();
    });
  });

  describe('header', () => {
    it('displays participant name', () => {
      render(
        <MessageThread
          messages={mockMessages}
          currentUserId={mockCurrentUserId}
          onSendMessage={mockOnSendMessage}
          participant={mockParticipant}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('displays participant subtitle', () => {
      render(
        <MessageThread
          messages={mockMessages}
          currentUserId={mockCurrentUserId}
          onSendMessage={mockOnSendMessage}
          participant={mockParticipant}
        />
      );

      expect(screen.getByText('Nike Brand Manager')).toBeInTheDocument();
    });

    it('renders participant avatar', () => {
      render(
        <MessageThread
          messages={mockMessages}
          currentUserId={mockCurrentUserId}
          onSendMessage={mockOnSendMessage}
          participant={mockParticipant}
        />
      );

      // Multiple avatars with same alt text (header + message avatars)
      const avatars = screen.getAllByAltText('John Doe');
      expect(avatars.length).toBeGreaterThan(0);
    });
  });

  describe('messages display', () => {
    it('renders all messages', () => {
      render(
        <MessageThread
          messages={mockMessages}
          currentUserId={mockCurrentUserId}
          onSendMessage={mockOnSendMessage}
          participant={mockParticipant}
        />
      );

      expect(screen.getByText('Hello, I am interested in a partnership')).toBeInTheDocument();
      expect(screen.getByText('That sounds great! Tell me more.')).toBeInTheDocument();
    });

    it('displays date divider', () => {
      render(
        <MessageThread
          messages={mockMessages}
          currentUserId={mockCurrentUserId}
          onSendMessage={mockOnSendMessage}
          participant={mockParticipant}
        />
      );

      // Messages are from Jan 15, 2024 - should show a date
      expect(screen.getByText(/jan|january|monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|yesterday/i)).toBeInTheDocument();
    });
  });

  describe('message input', () => {
    it('renders textarea for message input', () => {
      render(
        <MessageThread
          messages={mockMessages}
          currentUserId={mockCurrentUserId}
          onSendMessage={mockOnSendMessage}
          participant={mockParticipant}
        />
      );

      expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument();
    });

    it('allows typing in textarea', async () => {
      const user = userEvent.setup();
      render(
        <MessageThread
          messages={mockMessages}
          currentUserId={mockCurrentUserId}
          onSendMessage={mockOnSendMessage}
          participant={mockParticipant}
        />
      );

      const textarea = screen.getByPlaceholderText(/type a message/i);
      await user.type(textarea, 'Hello!');

      expect(textarea).toHaveValue('Hello!');
    });

    it('sends message on Enter key', async () => {
      const user = userEvent.setup();
      render(
        <MessageThread
          messages={mockMessages}
          currentUserId={mockCurrentUserId}
          onSendMessage={mockOnSendMessage}
          participant={mockParticipant}
        />
      );

      const textarea = screen.getByPlaceholderText(/type a message/i);
      await user.type(textarea, 'Hello!');
      await user.keyboard('{Enter}');

      expect(mockOnSendMessage).toHaveBeenCalledWith('Hello!');
    });

    it('clears input after sending', async () => {
      const user = userEvent.setup();
      render(
        <MessageThread
          messages={mockMessages}
          currentUserId={mockCurrentUserId}
          onSendMessage={mockOnSendMessage}
          participant={mockParticipant}
        />
      );

      const textarea = screen.getByPlaceholderText(/type a message/i);
      await user.type(textarea, 'Hello!');
      await user.keyboard('{Enter}');

      expect(textarea).toHaveValue('');
    });

    it('does not send empty message', async () => {
      const user = userEvent.setup();
      render(
        <MessageThread
          messages={mockMessages}
          currentUserId={mockCurrentUserId}
          onSendMessage={mockOnSendMessage}
          participant={mockParticipant}
        />
      );

      const textarea = screen.getByPlaceholderText(/type a message/i);
      await user.click(textarea);
      await user.keyboard('{Enter}');

      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('allows newline with Shift+Enter', async () => {
      const user = userEvent.setup();
      render(
        <MessageThread
          messages={mockMessages}
          currentUserId={mockCurrentUserId}
          onSendMessage={mockOnSendMessage}
          participant={mockParticipant}
        />
      );

      const textarea = screen.getByPlaceholderText(/type a message/i);
      await user.type(textarea, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

      expect(textarea).toHaveValue('Line 1\nLine 2');
      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('className prop', () => {
    it('applies custom className', () => {
      const { container } = render(
        <MessageThread
          messages={mockMessages}
          currentUserId={mockCurrentUserId}
          onSendMessage={mockOnSendMessage}
          participant={mockParticipant}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
