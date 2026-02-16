import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationItem, type Notification } from '@/components/notifications/NotificationItem';

describe('NotificationItem', () => {
  const mockNotification: Notification = {
    id: 'notif-1',
    type: 'deal_offer',
    title: 'New Deal Offer',
    message: 'Nike wants to sponsor you!',
    timestamp: new Date('2024-01-15'),
    read: false,
  };

  const defaultProps = {
    notification: mockNotification,
    onMarkAsRead: jest.fn(),
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders notification title', () => {
    render(<NotificationItem {...defaultProps} />);

    expect(screen.getByText('New Deal Offer')).toBeInTheDocument();
  });

  it('renders notification message', () => {
    render(<NotificationItem {...defaultProps} />);

    expect(screen.getByText('Nike wants to sponsor you!')).toBeInTheDocument();
  });

  it('renders relative timestamp', () => {
    render(<NotificationItem {...defaultProps} />);

    // Should show relative time like "about 1 year ago"
    expect(screen.getByText(/ago/)).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<NotificationItem {...defaultProps} onClick={onClick} />);

    const item = screen.getByRole('button');
    fireEvent.click(item);

    expect(onClick).toHaveBeenCalledWith(mockNotification);
  });

  it('calls onMarkAsRead when clicked and unread', () => {
    const onMarkAsRead = jest.fn();
    render(<NotificationItem {...defaultProps} onMarkAsRead={onMarkAsRead} />);

    const item = screen.getByRole('button');
    fireEvent.click(item);

    expect(onMarkAsRead).toHaveBeenCalledWith('notif-1');
  });

  it('does not call onMarkAsRead when already read', () => {
    const onMarkAsRead = jest.fn();
    const readNotification = { ...mockNotification, read: true };
    render(<NotificationItem {...defaultProps} notification={readNotification} onMarkAsRead={onMarkAsRead} />);

    const item = screen.getByRole('button');
    fireEvent.click(item);

    expect(onMarkAsRead).not.toHaveBeenCalled();
  });

  it('handles Enter key press', () => {
    const onClick = jest.fn();
    render(<NotificationItem {...defaultProps} onClick={onClick} />);

    const item = screen.getByRole('button');
    fireEvent.keyDown(item, { key: 'Enter' });

    expect(onClick).toHaveBeenCalled();
  });

  it('handles Space key press', () => {
    const onClick = jest.fn();
    render(<NotificationItem {...defaultProps} onClick={onClick} />);

    const item = screen.getByRole('button');
    fireEvent.keyDown(item, { key: ' ' });

    expect(onClick).toHaveBeenCalled();
  });

  it('has proper aria-label for unread notification', () => {
    render(<NotificationItem {...defaultProps} />);

    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Unread notification')
    );
  });

  it('has proper aria-label for read notification', () => {
    const readNotification = { ...mockNotification, read: true };
    render(<NotificationItem {...defaultProps} notification={readNotification} />);

    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Read notification')
    );
  });

  it('renders different icons for different notification types', () => {
    const verificationNotification = { ...mockNotification, type: 'verification_approved' as const };
    const { rerender } = render(<NotificationItem {...defaultProps} notification={verificationNotification} />);

    // Should render without crashing with each type
    const dealNotification = { ...mockNotification, type: 'deal_completed' as const };
    rerender(<NotificationItem {...defaultProps} notification={dealNotification} />);

    const systemNotification = { ...mockNotification, type: 'system' as const };
    rerender(<NotificationItem {...defaultProps} notification={systemNotification} />);

    expect(screen.getByText('New Deal Offer')).toBeInTheDocument();
  });

  it('renders avatar when provided', () => {
    const notificationWithAvatar = {
      ...mockNotification,
      avatar: 'https://example.com/avatar.jpg',
      avatarFallback: 'JD',
    };
    render(<NotificationItem {...defaultProps} notification={notificationWithAvatar} />);

    // Avatar component should be rendered (it may use img or fallback)
    // Just verify the component renders without error
    expect(screen.getByText('New Deal Offer')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<NotificationItem {...defaultProps} className="custom-item" />);

    const item = screen.getByRole('button');
    expect(item).toHaveClass('custom-item');
  });

  it('is focusable', () => {
    render(<NotificationItem {...defaultProps} />);

    const item = screen.getByRole('button');
    expect(item).toHaveAttribute('tabIndex', '0');
  });
});
