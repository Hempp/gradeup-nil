import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import type { Notification } from '@/components/notifications/NotificationItem';

describe('NotificationDropdown', () => {
  const mockNotifications: Notification[] = [
    {
      id: 'notif-1',
      type: 'deal_offer',
      title: 'New Deal Offer',
      message: 'Nike wants to sponsor you!',
      timestamp: new Date('2024-01-15'),
      read: false,
    },
    {
      id: 'notif-2',
      type: 'verification_approved',
      title: 'Verification Approved',
      message: 'Your GPA has been verified',
      timestamp: new Date('2024-01-14'),
      read: true,
    },
  ];

  const defaultProps = {
    notifications: mockNotifications,
    onMarkAsRead: jest.fn(),
    onMarkAllAsRead: jest.fn(),
    onNotificationClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders trigger button', () => {
    render(<NotificationDropdown {...defaultProps} />);

    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
  });

  it('shows unread count badge', () => {
    render(<NotificationDropdown {...defaultProps} />);

    // Should show 1 unread (only first notification is unread)
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('does not show badge when no unread notifications', () => {
    const allReadNotifications = mockNotifications.map(n => ({ ...n, read: true }));
    render(<NotificationDropdown {...defaultProps} notifications={allReadNotifications} />);

    // Should not have any badge showing count
    expect(screen.queryByText('1')).not.toBeInTheDocument();
    expect(screen.queryByText('2')).not.toBeInTheDocument();
  });

  it('opens dropdown when trigger is clicked', () => {
    render(<NotificationDropdown {...defaultProps} />);

    const trigger = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(trigger);

    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('shows notification list when open', () => {
    render(<NotificationDropdown {...defaultProps} />);

    const trigger = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(trigger);

    expect(screen.getByText('New Deal Offer')).toBeInTheDocument();
    expect(screen.getByText('Verification Approved')).toBeInTheDocument();
  });

  it('shows "Mark all read" button when there are unread notifications', () => {
    render(<NotificationDropdown {...defaultProps} />);

    const trigger = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(trigger);

    expect(screen.getByRole('button', { name: /mark all as read/i })).toBeInTheDocument();
  });

  it('calls onMarkAllAsRead when "Mark all read" is clicked', () => {
    const onMarkAllAsRead = jest.fn();
    render(<NotificationDropdown {...defaultProps} onMarkAllAsRead={onMarkAllAsRead} />);

    const trigger = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(trigger);

    const markAllButton = screen.getByRole('button', { name: /mark all as read/i });
    fireEvent.click(markAllButton);

    expect(onMarkAllAsRead).toHaveBeenCalled();
  });

  it('shows settings button when onSettingsClick is provided', () => {
    const onSettingsClick = jest.fn();
    render(<NotificationDropdown {...defaultProps} onSettingsClick={onSettingsClick} />);

    const trigger = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(trigger);

    expect(screen.getByRole('button', { name: /notification settings/i })).toBeInTheDocument();
  });

  it('calls onSettingsClick when settings button is clicked', () => {
    const onSettingsClick = jest.fn();
    render(<NotificationDropdown {...defaultProps} onSettingsClick={onSettingsClick} />);

    const trigger = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(trigger);

    const settingsButton = screen.getByRole('button', { name: /notification settings/i });
    fireEvent.click(settingsButton);

    expect(onSettingsClick).toHaveBeenCalled();
  });

  it('shows empty state when no notifications', () => {
    render(<NotificationDropdown {...defaultProps} notifications={[]} />);

    const trigger = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(trigger);

    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });

  it('shows "View all" link when there are more notifications than maxVisible', () => {
    const manyNotifications = Array.from({ length: 10 }, (_, i) => ({
      ...mockNotifications[0],
      id: `notif-${i}`,
    }));
    render(
      <NotificationDropdown
        {...defaultProps}
        notifications={manyNotifications}
        viewAllHref="/notifications"
        maxVisible={5}
      />
    );

    const trigger = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(trigger);

    expect(screen.getByText(/view all notifications/i)).toBeInTheDocument();
  });

  it('closes dropdown when notification is clicked', async () => {
    const onNotificationClick = jest.fn();
    render(<NotificationDropdown {...defaultProps} onNotificationClick={onNotificationClick} />);

    const trigger = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(trigger);

    const notification = screen.getByText('New Deal Offer').closest('[role="button"]');
    if (notification) {
      fireEvent.click(notification);
    }

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('closes dropdown on Escape key', async () => {
    render(<NotificationDropdown {...defaultProps} />);

    const trigger = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(trigger);

    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('closes dropdown when clicking outside', async () => {
    render(
      <div>
        <NotificationDropdown {...defaultProps} />
        <div data-testid="outside">Outside</div>
      </div>
    );

    const trigger = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(trigger);

    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('has proper aria-expanded attribute', () => {
    render(<NotificationDropdown {...defaultProps} />);

    const trigger = screen.getByRole('button', { name: /notifications/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('applies custom className to trigger', () => {
    render(<NotificationDropdown {...defaultProps} className="custom-trigger" />);

    const trigger = screen.getByRole('button', { name: /notifications/i });
    expect(trigger).toHaveClass('custom-trigger');
  });

  it('includes unread count in aria-label', () => {
    render(<NotificationDropdown {...defaultProps} />);

    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-label', expect.stringContaining('1 unread'));
  });
});
