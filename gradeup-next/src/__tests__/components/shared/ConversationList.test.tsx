import { render, screen, fireEvent } from '@testing-library/react';
import { ConversationList } from '@/components/shared/conversation-list';
import type { Conversation } from '@/types';

// Mock utils
jest.mock('@/lib/utils', () => ({
  formatRelativeTime: jest.fn((time) => {
    const date = new Date(time);
    return date.toLocaleDateString();
  }),
  cn: (...args: (string | undefined | false | null)[]) => args.filter(Boolean).join(' '),
}));

describe('ConversationList', () => {
  const mockConversations: Conversation[] = [
    {
      id: 'conv-1',
      participants: [
        {
          id: 'user-1',
          name: 'John Doe',
          avatar: 'https://example.com/avatar1.jpg',
          subtitle: 'Nike Brand Manager',
        },
      ],
      lastMessage: {
        id: 'msg-1',
        conversationId: 'conv-1',
        content: 'Hello, I would like to discuss a partnership',
        timestamp: new Date('2024-01-15').toISOString(),
        senderId: 'user-1',
        read: false,
      },
      unreadCount: 2,
      createdAt: new Date('2024-01-10').toISOString(),
    },
    {
      id: 'conv-2',
      participants: [
        {
          id: 'user-2',
          name: 'Jane Smith',
          subtitle: 'Adidas Sponsorship',
        },
      ],
      lastMessage: {
        id: 'msg-2',
        conversationId: 'conv-2',
        content: 'Thanks for your interest!',
        timestamp: new Date('2024-01-14').toISOString(),
        senderId: 'user-2',
        read: true,
      },
      unreadCount: 0,
      createdAt: new Date('2024-01-08').toISOString(),
    },
  ];

  const defaultProps = {
    conversations: mockConversations,
    selectedId: null,
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders conversation list', () => {
    render(<ConversationList {...defaultProps} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<ConversationList {...defaultProps} />);

    expect(screen.getByPlaceholderText(/search conversations/i)).toBeInTheDocument();
  });

  it('renders custom search placeholder', () => {
    render(<ConversationList {...defaultProps} searchPlaceholder="Find messages..." />);

    expect(screen.getByPlaceholderText('Find messages...')).toBeInTheDocument();
  });

  it('calls onSearch when search input changes', () => {
    const onSearch = jest.fn();
    render(<ConversationList {...defaultProps} onSearch={onSearch} />);

    const searchInput = screen.getByPlaceholderText(/search conversations/i);
    fireEvent.change(searchInput, { target: { value: 'John' } });

    expect(onSearch).toHaveBeenCalledWith('John');
  });

  it('displays search query value', () => {
    render(<ConversationList {...defaultProps} searchQuery="test" />);

    const searchInput = screen.getByPlaceholderText(/search conversations/i);
    expect(searchInput).toHaveValue('test');
  });

  it('renders last message content', () => {
    render(<ConversationList {...defaultProps} />);

    expect(screen.getByText('Hello, I would like to discuss a partnership')).toBeInTheDocument();
    expect(screen.getByText('Thanks for your interest!')).toBeInTheDocument();
  });

  it('renders participant subtitle', () => {
    render(<ConversationList {...defaultProps} />);

    expect(screen.getByText('Nike Brand Manager')).toBeInTheDocument();
    expect(screen.getByText('Adidas Sponsorship')).toBeInTheDocument();
  });

  it('shows unread count badge', () => {
    render(<ConversationList {...defaultProps} />);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('calls onSelect when conversation is clicked', () => {
    const onSelect = jest.fn();
    render(<ConversationList {...defaultProps} onSelect={onSelect} />);

    const conversationButton = screen.getByText('John Doe').closest('button');
    if (conversationButton) {
      fireEvent.click(conversationButton);
    }

    expect(onSelect).toHaveBeenCalledWith('conv-1');
  });

  it('highlights selected conversation', () => {
    const { container } = render(<ConversationList {...defaultProps} selectedId="conv-1" />);

    // Find the selected conversation button
    const selectedButton = container.querySelector('[class*="border-l-2"]');
    expect(selectedButton).toBeInTheDocument();
  });

  it('renders empty state when no conversations', () => {
    render(<ConversationList {...defaultProps} conversations={[]} />);

    expect(screen.getByText('No conversations yet')).toBeInTheDocument();
  });

  it('renders custom empty message', () => {
    render(
      <ConversationList
        {...defaultProps}
        conversations={[]}
        emptyMessage="Start a conversation!"
      />
    );

    expect(screen.getByText('Start a conversation!')).toBeInTheDocument();
  });

  it('sorts conversations by most recent message', () => {
    const conversations: Conversation[] = [
      {
        id: 'old',
        participants: [{ id: '1', name: 'Old Message' }],
        lastMessage: {
          id: 'm1',
          conversationId: 'old',
          content: 'Old',
          timestamp: new Date('2024-01-01').toISOString(),
          senderId: '1',
          read: true,
        },
        unreadCount: 0,
        createdAt: new Date('2024-01-01').toISOString(),
      },
      {
        id: 'new',
        participants: [{ id: '2', name: 'New Message' }],
        lastMessage: {
          id: 'm2',
          conversationId: 'new',
          content: 'New',
          timestamp: new Date('2024-01-15').toISOString(),
          senderId: '2',
          read: false,
        },
        unreadCount: 1,
        createdAt: new Date('2024-01-15').toISOString(),
      },
    ];

    render(<ConversationList {...defaultProps} conversations={conversations} />);

    const buttons = screen.getAllByRole('button');
    // First button should be the newer conversation
    expect(buttons[0]).toHaveTextContent('New Message');
  });

  it('applies custom className', () => {
    const { container } = render(
      <ConversationList {...defaultProps} className="custom-list" />
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-list');
  });

  it('renders avatar fallback when no avatar provided', () => {
    const conversations: Conversation[] = [
      {
        id: 'conv-1',
        participants: [{ id: '1', name: 'Test User' }],
        lastMessage: null,
        unreadCount: 0,
        createdAt: new Date().toISOString(),
      },
    ];

    render(<ConversationList {...defaultProps} conversations={conversations} />);

    // Avatar should show first letter of name
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('shows "No messages yet" when conversation has no last message', () => {
    const conversations: Conversation[] = [
      {
        id: 'conv-1',
        participants: [{ id: '1', name: 'Test User' }],
        lastMessage: null,
        unreadCount: 0,
        createdAt: new Date().toISOString(),
      },
    ];

    render(<ConversationList {...defaultProps} conversations={conversations} />);

    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });
});
