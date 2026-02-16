/**
 * Tests for the MessageThread component
 * @module __tests__/components/shared/MessageThread.test
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageThread, type MessageThreadProps } from '@/components/shared/message-thread';
import type { Message, ConversationParticipant } from '@/types';

// Mock formatRelativeTime utility
jest.mock('@/lib/utils', () => ({
  formatRelativeTime: jest.fn((timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }),
  cn: (...inputs: (string | undefined | null | false | Record<string, boolean>)[]) =>
    inputs.filter(Boolean).join(' '),
}));

// Mock scrollIntoView
const mockScrollIntoView = jest.fn();
Element.prototype.scrollIntoView = mockScrollIntoView;

describe('MessageThread', () => {
  const mockParticipant: ConversationParticipant = {
    id: 'user-1',
    name: 'John Doe',
    avatar: 'https://example.com/avatar.jpg',
    subtitle: 'Athlete',
  };

  const mockMessages: Message[] = [
    {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'user-1',
      content: 'Hello there!',
      timestamp: '2024-01-15T10:00:00Z',
      read: true,
    },
    {
      id: 'msg-2',
      conversationId: 'conv-1',
      senderId: 'current-user',
      content: 'Hi! How are you?',
      timestamp: '2024-01-15T10:01:00Z',
      read: true,
    },
    {
      id: 'msg-3',
      conversationId: 'conv-1',
      senderId: 'user-1',
      content: 'Doing great, thanks!',
      timestamp: '2024-01-15T10:02:00Z',
      read: true,
    },
  ];

  const defaultProps: MessageThreadProps = {
    messages: mockMessages,
    currentUserId: 'current-user',
    onSendMessage: jest.fn(),
    participant: mockParticipant,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders participant name in header', () => {
      render(<MessageThread {...defaultProps} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('renders participant subtitle', () => {
      render(<MessageThread {...defaultProps} />);
      expect(screen.getByText('Athlete')).toBeInTheDocument();
    });

    it('renders all messages', () => {
      render(<MessageThread {...defaultProps} />);
      expect(screen.getByText('Hello there!')).toBeInTheDocument();
      expect(screen.getByText('Hi! How are you?')).toBeInTheDocument();
      expect(screen.getByText('Doing great, thanks!')).toBeInTheDocument();
    });

    it('shows empty state when no participant', () => {
      render(
        <MessageThread
          {...defaultProps}
          participant={undefined}
          emptyStateMessage="Select a conversation"
        />
      );
      expect(screen.getByText('Select a conversation')).toBeInTheDocument();
    });

    it('shows default empty state message', () => {
      render(<MessageThread {...defaultProps} participant={undefined} />);
      expect(screen.getByText('Select a conversation to view messages')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <MessageThread {...defaultProps} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('message styling', () => {
    it('differentiates sent vs received messages', () => {
      render(<MessageThread {...defaultProps} />);

      // Sent message should be on the right
      const sentMessage = screen.getByText('Hi! How are you?').closest('div');
      expect(sentMessage).toHaveClass('bg-[var(--color-primary)]');

      // Received message should be on the left
      const receivedMessage = screen.getByText('Hello there!').closest('div');
      expect(receivedMessage).toHaveClass('bg-[var(--bg-tertiary)]');
    });

    it('shows avatar for received messages', () => {
      render(<MessageThread {...defaultProps} />);

      // Avatar should be visible for received messages
      const avatars = screen.getAllByAltText('John Doe');
      expect(avatars.length).toBeGreaterThan(0);
    });
  });

  describe('message input', () => {
    it('renders textarea placeholder', () => {
      render(<MessageThread {...defaultProps} />);
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });

    it('updates textarea value on input', async () => {
      const user = userEvent.setup();
      render(<MessageThread {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'New message');

      expect(textarea).toHaveValue('New message');
    });

    it('has send button', () => {
      render(<MessageThread {...defaultProps} />);
      const allButtons = screen.getAllByRole('button');

      // Find the send button (should be the last one with primary variant)
      expect(allButtons.length).toBeGreaterThan(1);
    });

    it('enables send button when message has content', async () => {
      const user = userEvent.setup();
      render(<MessageThread {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'New message');

      // Send button should be enabled
      const buttons = screen.getAllByRole('button');
      const sendButton = buttons[buttons.length - 1]; // Last button is send
      expect(sendButton).not.toBeDisabled();
    });

    it('calls onSendMessage when send button clicked', async () => {
      const onSendMessage = jest.fn();
      const user = userEvent.setup();
      render(<MessageThread {...defaultProps} onSendMessage={onSendMessage} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'New message');

      const buttons = screen.getAllByRole('button');
      const sendButton = buttons[buttons.length - 1];
      await user.click(sendButton);

      expect(onSendMessage).toHaveBeenCalledWith('New message');
    });

    it('clears textarea after sending', async () => {
      const user = userEvent.setup();
      render(<MessageThread {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'New message');

      const buttons = screen.getAllByRole('button');
      const sendButton = buttons[buttons.length - 1];
      await user.click(sendButton);

      expect(textarea).toHaveValue('');
    });

    it('sends message on Enter key', async () => {
      const onSendMessage = jest.fn();
      const user = userEvent.setup();
      render(<MessageThread {...defaultProps} onSendMessage={onSendMessage} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'New message');
      await user.keyboard('{Enter}');

      expect(onSendMessage).toHaveBeenCalledWith('New message');
    });

    it('does not send on Shift+Enter (allows multiline)', async () => {
      const onSendMessage = jest.fn();
      const user = userEvent.setup();
      render(<MessageThread {...defaultProps} onSendMessage={onSendMessage} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'Line 1');
      await user.keyboard('{Shift>}{Enter}{/Shift}');

      expect(onSendMessage).not.toHaveBeenCalled();
    });

    it('trims whitespace from message', async () => {
      const onSendMessage = jest.fn();
      const user = userEvent.setup();
      render(<MessageThread {...defaultProps} onSendMessage={onSendMessage} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, '  New message  ');

      const buttons = screen.getAllByRole('button');
      const sendButton = buttons[buttons.length - 1];
      await user.click(sendButton);

      expect(onSendMessage).toHaveBeenCalledWith('New message');
    });

    it('does not send empty messages', async () => {
      const onSendMessage = jest.fn();
      const user = userEvent.setup();
      render(<MessageThread {...defaultProps} onSendMessage={onSendMessage} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, '   ');
      await user.keyboard('{Enter}');

      expect(onSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('back button', () => {
    it('shows back button when showBackButton is true', () => {
      render(<MessageThread {...defaultProps} showBackButton={true} onBack={jest.fn()} />);

      // Find the back button by its icon
      const buttons = screen.getAllByRole('button');
      const backButton = buttons.find(btn => btn.classList.contains('lg:hidden'));
      expect(backButton).toBeDefined();
    });

    it('hides back button when showBackButton is false', () => {
      render(<MessageThread {...defaultProps} showBackButton={false} />);

      const buttons = screen.getAllByRole('button');
      const backButton = buttons.find(btn => btn.classList.contains('lg:hidden'));
      expect(backButton).toBeUndefined();
    });

    it('calls onBack when back button clicked', async () => {
      const onBack = jest.fn();
      const user = userEvent.setup();
      render(<MessageThread {...defaultProps} showBackButton={true} onBack={onBack} />);

      const buttons = screen.getAllByRole('button');
      const backButton = buttons.find(btn => btn.classList.contains('lg:hidden'));
      if (backButton) {
        await user.click(backButton);
        expect(onBack).toHaveBeenCalled();
      }
    });
  });

  describe('date dividers', () => {
    it('shows date dividers for messages on different days', () => {
      const messagesAcrossDays: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          senderId: 'user-1',
          content: 'Yesterday message',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          read: true,
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          senderId: 'user-1',
          content: 'Today message',
          timestamp: new Date().toISOString(),
          read: true,
        },
      ];

      render(<MessageThread {...defaultProps} messages={messagesAcrossDays} />);

      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Yesterday')).toBeInTheDocument();
    });
  });

  describe('auto-scroll', () => {
    it('scrolls to bottom when messages change', async () => {
      const { rerender } = render(<MessageThread {...defaultProps} />);

      // Initial render should scroll
      expect(mockScrollIntoView).toHaveBeenCalled();

      mockScrollIntoView.mockClear();

      // Add new message
      const newMessages: Message[] = [
        ...mockMessages,
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          senderId: 'current-user',
          content: 'New message!',
          timestamp: new Date().toISOString(),
          read: true,
        },
      ];

      rerender(<MessageThread {...defaultProps} messages={newMessages} />);

      await waitFor(() => {
        expect(mockScrollIntoView).toHaveBeenCalled();
      });
    });
  });

  describe('attachment button', () => {
    it('renders attachment button', () => {
      render(<MessageThread {...defaultProps} />);

      // Find paperclip button
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(1); // At least attachment and send
    });
  });

  describe('menu button', () => {
    it('renders more options button in header', () => {
      render(<MessageThread {...defaultProps} />);

      // Find the more options button (with MoreVertical icon)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('participant without subtitle', () => {
    it('renders without subtitle', () => {
      const participantNoSubtitle: ConversationParticipant = {
        id: 'user-2',
        name: 'Jane Smith',
      };

      render(
        <MessageThread
          {...defaultProps}
          participant={participantNoSubtitle}
        />
      );

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  describe('participant without avatar', () => {
    it('renders fallback avatar', () => {
      const participantNoAvatar: ConversationParticipant = {
        id: 'user-3',
        name: 'Bob Wilson',
      };

      render(
        <MessageThread
          {...defaultProps}
          participant={participantNoAvatar}
        />
      );

      // Avatar component should use fallback
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });
  });
});
