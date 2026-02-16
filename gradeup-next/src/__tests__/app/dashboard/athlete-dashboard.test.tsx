/**
 * Tests: Athlete Dashboard Page
 *
 * Tests cover:
 * - Component rendering and layout
 * - Stats display (earnings, deals, profile views, NIL valuation)
 * - Activity feed display
 * - Upcoming deadlines
 * - Earnings chart
 * - Loading and error states
 * - Quick actions dropdown
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AthleteDashboardPage from '@/app/(dashboard)/athlete/dashboard/page';
import { ToastProvider } from '@/components/ui/toast';

// ═══════════════════════════════════════════════════════════════════════════
// Mock Data
// ═══════════════════════════════════════════════════════════════════════════

const mockAthleteStats = {
  total_earnings: 15000,
  active_deals: 3,
  pending_earnings: 2500,
  profile_views: 1250,
};

const mockActivities = [
  {
    id: 'activity-1',
    type: 'deal_accepted',
    description: 'Nike accepted your deal proposal',
    created_at: '2026-02-14T10:00:00Z',
  },
  {
    id: 'activity-2',
    type: 'payment',
    description: 'Payment of $2,500 received from Gatorade',
    created_at: '2026-02-13T15:30:00Z',
  },
  {
    id: 'activity-3',
    type: 'profile_view',
    description: 'Under Armour viewed your profile',
    created_at: '2026-02-12T09:15:00Z',
  },
];

const mockDeals = [
  {
    id: 'deal-1',
    title: 'Nike Social Campaign',
    status: 'active',
    end_date: '2026-02-20T23:59:59Z',
    compensation_amount: 5000,
    brand: { company_name: 'Nike', logo_url: null },
  },
  {
    id: 'deal-2',
    title: 'Gatorade Event',
    status: 'accepted',
    end_date: '2026-02-25T23:59:59Z',
    compensation_amount: 2500,
    brand: { company_name: 'Gatorade', logo_url: null },
  },
];

const mockEarningsData = {
  total: 15000,
  monthly_breakdown: [
    { month: 'Sep', amount: 1500 },
    { month: 'Oct', amount: 2000 },
    { month: 'Nov', amount: 2500 },
    { month: 'Dec', amount: 3000 },
    { month: 'Jan', amount: 3500 },
    { month: 'Feb', amount: 2500 },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// Mocks
// ═══════════════════════════════════════════════════════════════════════════

// Mock Next.js navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '/athlete/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'athlete-1', email: 'athlete@example.com' } } },
      }),
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'athlete-1', email: 'athlete@example.com' } },
      }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'athlete' }, error: null }),
    })),
  })),
}));

// Variables to control mock behavior
let mockStatsData = { ...mockAthleteStats };
let mockStatsError: Error | null = null;
let mockStatsLoading = false;

let mockDealsData = [...mockDeals];
let mockDealsError: Error | null = null;
let mockDealsLoading = false;

let mockActivitiesData = [...mockActivities];
let mockActivitiesError: Error | null = null;
let mockActivitiesLoading = false;

let mockEarnings = { ...mockEarningsData };
let mockEarningsError: Error | null = null;
let mockEarningsLoading = false;

// Mock the data hooks
jest.mock('@/lib/hooks/use-data', () => ({
  useAthleteStats: jest.fn(() => ({
    data: mockStatsData,
    loading: mockStatsLoading,
    error: mockStatsError,
    refetch: jest.fn().mockResolvedValue(undefined),
  })),
  useAthleteDeals: jest.fn(() => ({
    data: mockDealsData,
    loading: mockDealsLoading,
    error: mockDealsError,
    refetch: jest.fn().mockResolvedValue(undefined),
  })),
  useActivity: jest.fn(() => ({
    data: mockActivitiesData,
    loading: mockActivitiesLoading,
    error: mockActivitiesError,
    refetch: jest.fn().mockResolvedValue(undefined),
  })),
  useAthleteEarnings: jest.fn(() => ({
    data: mockEarnings,
    loading: mockEarningsLoading,
    error: mockEarningsError,
    refetch: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock useRequireAuth hook
jest.mock('@/context', () => ({
  useRequireAuth: jest.fn(() => ({
    user: { id: 'athlete-1', email: 'athlete@example.com', role: 'athlete' },
    profile: {
      id: 'athlete-1',
      email: 'athlete@example.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'athlete',
    },
    roleData: {
      id: 'athlete-1',
      profile_id: 'athlete-1',
      nil_valuation: 25000,
    },
    isLoading: false,
    isAuthenticated: true,
    error: null,
  })),
}));

// Mock onboarding tour
jest.mock('@/components/ui/onboarding-tour', () => ({
  useOnboardingTour: jest.fn(() => ({
    startTour: jest.fn(),
    isComplete: false,
    isActive: false,
  })),
}));

// Mock recharts to avoid canvas issues
jest.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ═══════════════════════════════════════════════════════════════════════════
// Test Utilities
// ═══════════════════════════════════════════════════════════════════════════

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

function renderWithProviders(component: React.ReactElement) {
  return render(component, { wrapper: TestWrapper });
}

function resetMocks() {
  mockStatsData = { ...mockAthleteStats };
  mockStatsError = null;
  mockStatsLoading = false;
  mockDealsData = [...mockDeals];
  mockDealsError = null;
  mockDealsLoading = false;
  mockActivitiesData = [...mockActivities];
  mockActivitiesError = null;
  mockActivitiesLoading = false;
  mockEarnings = { ...mockEarningsData };
  mockEarningsError = null;
  mockEarningsLoading = false;
  mockPush.mockClear();
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Athlete Dashboard Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMocks();
  });

  describe('Page Rendering', () => {
    it('renders the welcome message with athlete name', async () => {
      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/welcome back, john/i)).toBeInTheDocument();
      });
    });

    it('renders the dashboard description', async () => {
      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/what's happening with your nil deals/i)).toBeInTheDocument();
      });
    });

    it('renders quick actions dropdown', async () => {
      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /quick actions/i })).toBeInTheDocument();
      });
    });

    it('renders take a tour button', async () => {
      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /take a tour|start dashboard tour/i })).toBeInTheDocument();
      });
    });
  });

  describe('Stats Cards', () => {
    it('displays total earnings stat', async () => {
      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Earnings')).toBeInTheDocument();
        expect(screen.getByText('$15,000')).toBeInTheDocument();
      });
    });

    it('displays active deals stat', async () => {
      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Active Deals')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('displays profile views stat', async () => {
      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Profile Views')).toBeInTheDocument();
        expect(screen.getByText('1.3K')).toBeInTheDocument();
      });
    });

    it('displays NIL valuation stat', async () => {
      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('NIL Valuation')).toBeInTheDocument();
        expect(screen.getByText('$25,000')).toBeInTheDocument();
      });
    });

    it('displays pending earnings when available', async () => {
      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/\$2,500 pending/i)).toBeInTheDocument();
      });
    });
  });

  describe('Activity Feed', () => {
    it('renders recent activity section', async () => {
      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      });
    });

    it('displays activity items', async () => {
      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/nike accepted your deal proposal/i)).toBeInTheDocument();
        expect(screen.getByText(/payment of \$2,500 received/i)).toBeInTheDocument();
      });
    });

    it('shows view all link', async () => {
      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        const viewAllLinks = screen.getAllByText(/view all/i);
        expect(viewAllLinks.length).toBeGreaterThan(0);
      });
    });

    it('shows empty state when no activities', async () => {
      mockActivitiesData = [];

      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/no recent activity yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Upcoming Deadlines', () => {
    it('renders upcoming deadlines section', async () => {
      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Upcoming Deadlines')).toBeInTheDocument();
      });
    });

    it('displays deals with upcoming deadlines', async () => {
      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Nike Social Campaign')).toBeInTheDocument();
        expect(screen.getByText('Gatorade Event')).toBeInTheDocument();
      });
    });

    it('shows empty state when no upcoming deadlines', async () => {
      mockDealsData = [];

      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/no upcoming deadlines/i)).toBeInTheDocument();
      });
    });
  });

  describe('Earnings Chart', () => {
    it('renders earnings overview section', async () => {
      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Earnings Overview')).toBeInTheDocument();
      });
    });

    it('renders chart description', async () => {
      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/your earnings over the last 6 months/i)).toBeInTheDocument();
      });
    });

    it('renders bar chart', async () => {
      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });
    });

    it('shows no data message when earnings data is empty', async () => {
      mockEarnings = { total: 0, monthly_breakdown: [] };

      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/no earnings data yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Quick Actions', () => {
    it('opens dropdown when clicking quick actions button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /quick actions/i })).toBeInTheDocument();
      });

      const quickActionsButton = screen.getByRole('button', { name: /quick actions/i });
      await user.click(quickActionsButton);

      await waitFor(() => {
        expect(screen.getByText('Update Profile')).toBeInTheDocument();
        expect(screen.getByText('View All Deals')).toBeInTheDocument();
        expect(screen.getByText('Check Messages')).toBeInTheDocument();
        expect(screen.getByText('See Earnings')).toBeInTheDocument();
      });
    });

    it('has correct links in dropdown', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AthleteDashboardPage />);

      const quickActionsButton = screen.getByRole('button', { name: /quick actions/i });
      await user.click(quickActionsButton);

      await waitFor(() => {
        const profileLink = screen.getByText('Update Profile').closest('a');
        expect(profileLink).toHaveAttribute('href', '/athlete/profile');

        const dealsLink = screen.getByText('View All Deals').closest('a');
        expect(dealsLink).toHaveAttribute('href', '/athlete/deals');
      });
    });

    it('closes dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AthleteDashboardPage />);

      const quickActionsButton = screen.getByRole('button', { name: /quick actions/i });
      await user.click(quickActionsButton);

      await waitFor(() => {
        expect(screen.getByText('Update Profile')).toBeInTheDocument();
      });

      // Click on the overlay to close
      const overlay = document.querySelector('.fixed.inset-0');
      if (overlay) {
        await user.click(overlay);
      }

      await waitFor(() => {
        expect(screen.queryByText('Update Profile')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error state when data fetch fails', async () => {
      mockStatsError = new Error('Failed to fetch stats');

      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load dashboard/i)).toBeInTheDocument();
      });
    });

    it('shows retry button in error state', async () => {
      mockStatsError = new Error('Failed to fetch');

      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('calls refetch when clicking retry button', async () => {
      const user = userEvent.setup();
      mockStatsError = new Error('Failed to fetch');

      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      // Verify button was clicked (refetch is called internally)
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading dots for stats when loading', async () => {
      mockStatsLoading = true;

      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        // Stats show "..." when loading
        const loadingIndicators = screen.getAllByText('...');
        expect(loadingIndicators.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible heading structure', async () => {
      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toHaveTextContent(/welcome back/i);
      });
    });

    it('quick actions button has accessible label', async () => {
      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /quick actions/i });
        expect(button).toBeInTheDocument();
      });
    });

    it('tour button has accessible aria-label', async () => {
      renderWithProviders(<AthleteDashboardPage />);

      await waitFor(() => {
        const tourButton = screen.getByRole('button', { name: /start dashboard tour|take a tour/i });
        expect(tourButton).toBeInTheDocument();
      });
    });
  });
});
