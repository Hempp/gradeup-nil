import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Topbar, type TopbarProps } from '@/components/layout/topbar';

// Mock the notifications hook
jest.mock('@/lib/hooks/use-notifications', () => ({
  useNotifications: jest.fn(() => ({
    notifications: [
      {
        id: 'notif-1',
        type: 'deal',
        title: 'New Deal',
        message: 'You have a new deal offer',
        created_at: new Date().toISOString(),
        read: false,
        url: '/athlete/deals/1',
      },
    ],
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
  })),
}));

// Mock the NotificationDropdown component
jest.mock('@/components/notifications', () => ({
  NotificationDropdown: ({ className }: { className: string }) => (
    <button className={className} data-testid="notification-dropdown">
      Notifications
    </button>
  ),
}));

describe('Topbar', () => {
  const defaultProps: TopbarProps = {
    breadcrumbs: [
      { label: 'Dashboard', href: '/athlete/dashboard' },
      { label: 'Profile' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders topbar', () => {
    render(<Topbar {...defaultProps} />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders breadcrumbs', () => {
    render(<Topbar {...defaultProps} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('renders notification dropdown', () => {
    render(<Topbar {...defaultProps} />);

    expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
  });

  it('renders user dropdown button', () => {
    render(<Topbar {...defaultProps} />);

    expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
  });

  it('renders default user when not provided', () => {
    render(<Topbar {...defaultProps} />);

    // Click to open dropdown
    const userButton = screen.getByRole('button', { name: /user menu/i });
    fireEvent.click(userButton);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Athlete')).toBeInTheDocument();
  });

  it('renders provided user info', () => {
    render(
      <Topbar
        {...defaultProps}
        user={{ name: 'Test User', role: 'Brand Manager' }}
      />
    );

    const userButton = screen.getByRole('button', { name: /user menu/i });
    fireEvent.click(userButton);

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Brand Manager')).toBeInTheDocument();
  });

  it('opens user dropdown when clicked', async () => {
    render(<Topbar {...defaultProps} />);

    const userButton = screen.getByRole('button', { name: /user menu/i });
    fireEvent.click(userButton);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  it('closes user dropdown when clicked again', async () => {
    render(<Topbar {...defaultProps} />);

    const userButton = screen.getByRole('button', { name: /user menu/i });
    fireEvent.click(userButton);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    fireEvent.click(userButton);

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('renders settings link in dropdown', async () => {
    render(<Topbar {...defaultProps} />);

    const userButton = screen.getByRole('button', { name: /user menu/i });
    fireEvent.click(userButton);

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /settings/i })).toBeInTheDocument();
    });
  });

  it('renders logout button in dropdown', async () => {
    render(<Topbar {...defaultProps} />);

    const userButton = screen.getByRole('button', { name: /user menu/i });
    fireEvent.click(userButton);

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /logout/i })).toBeInTheDocument();
    });
  });

  it('closes dropdown when clicking outside', async () => {
    render(
      <div>
        <Topbar {...defaultProps} />
        <div data-testid="outside">Outside</div>
      </div>
    );

    const userButton = screen.getByRole('button', { name: /user menu/i });
    fireEvent.click(userButton);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByTestId('outside'));

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('closes dropdown on Escape key', async () => {
    render(<Topbar {...defaultProps} />);

    const userButton = screen.getByRole('button', { name: /user menu/i });
    fireEvent.click(userButton);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('renders hamburger menu button when onMenuClick is provided', () => {
    const onMenuClick = jest.fn();
    render(<Topbar {...defaultProps} onMenuClick={onMenuClick} />);

    expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeInTheDocument();
  });

  it('calls onMenuClick when hamburger is clicked', () => {
    const onMenuClick = jest.fn();
    render(<Topbar {...defaultProps} onMenuClick={onMenuClick} />);

    const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
    fireEvent.click(menuButton);

    expect(onMenuClick).toHaveBeenCalled();
  });

  it('does not render hamburger when onMenuClick is not provided', () => {
    render(<Topbar {...defaultProps} />);

    expect(screen.queryByRole('button', { name: /open navigation menu/i })).not.toBeInTheDocument();
  });

  it('renders user avatar when provided', () => {
    render(
      <Topbar
        {...defaultProps}
        user={{
          name: 'Test User',
          role: 'Athlete',
          avatar: 'https://example.com/avatar.jpg',
        }}
      />
    );

    const avatar = screen.getByAltText('Test User');
    expect(avatar).toBeInTheDocument();
  });

  it('renders avatar fallback when no avatar provided', () => {
    render(<Topbar {...defaultProps} />);

    // Should show first letter of name
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Topbar {...defaultProps} className="custom-topbar" />);

    const header = screen.getByRole('banner');
    expect(header).toHaveClass('custom-topbar');
  });

  it('has proper aria-expanded attribute on user button', async () => {
    render(<Topbar {...defaultProps} />);

    const userButton = screen.getByRole('button', { name: /user menu/i });
    expect(userButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(userButton);

    await waitFor(() => {
      expect(userButton).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('has proper aria-haspopup attribute', () => {
    render(<Topbar {...defaultProps} />);

    const userButton = screen.getByRole('button', { name: /user menu/i });
    expect(userButton).toHaveAttribute('aria-haspopup', 'menu');
  });
});
