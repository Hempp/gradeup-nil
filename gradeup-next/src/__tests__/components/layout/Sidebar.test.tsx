import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar, type SidebarProps } from '@/components/layout/sidebar';
import type { NavItem } from '@/types';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/athlete/dashboard',
}));

describe('Sidebar', () => {
  const mockNavItems: NavItem[] = [
    { href: '/athlete/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    { href: '/athlete/profile', label: 'Profile', icon: 'User' },
    { href: '/athlete/deals', label: 'Deals', icon: 'DollarSign', badge: 3 },
  ];

  const defaultProps: SidebarProps = {
    navItems: mockNavItems,
    variant: 'athlete',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  it('renders without crashing', () => {
    render(<Sidebar {...defaultProps} />);
    expect(document.body.textContent).toBeTruthy();
  });

  it('renders navigation with nav items', () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Deals')).toBeInTheDocument();
  });

  it('renders GradeUp logo', () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.getByText('GradeUp')).toBeInTheDocument();
  });

  it('renders badge count', () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders collapse button', () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeInTheDocument();
  });

  it('collapses sidebar when button is clicked', () => {
    const { container } = render(<Sidebar {...defaultProps} />);

    const collapseButton = screen.getByRole('button', { name: /collapse sidebar/i });
    fireEvent.click(collapseButton);

    const sidebar = container.querySelector('aside');
    expect(sidebar).toHaveClass('w-20');
  });

  it('renders user info', () => {
    render(<Sidebar {...defaultProps} user={{ name: 'Test User', role: 'Athlete' }} />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Athlete')).toBeInTheDocument();
  });
});
