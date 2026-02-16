import { render } from '@testing-library/react';
import DirectorDashboardPage from '@/app/(dashboard)/director/dashboard/page';

// Mock AuthContext
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    profile: { id: 'test-profile', role: 'director' },
    isLoading: false,
    signOut: jest.fn(),
  }),
  useRequireAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    profile: { id: 'test-profile', role: 'director' },
    isLoading: false,
  }),
}));

// Mock all hooks from use-data
jest.mock('@/lib/hooks/use-data', () => ({
  useDirectorStats: () => ({
    data: { total_athletes: 0, verified_athletes: 0, pending_verifications: 0, total_earnings: 0 },
    loading: false,
    error: null,
    refetch: jest.fn()
  }),
  useSchoolAthletes: () => ({
    data: { athletes: [] },
    loading: false,
    error: null,
    refetch: jest.fn()
  }),
  useComplianceAlerts: () => ({
    data: [],
    loading: false,
    error: null,
    refetch: jest.fn()
  }),
}));

jest.mock('@/lib/hooks/use-demo-mode', () => ({
  useDemoMode: () => ({ isDemoMode: false, demoRole: null }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/director/dashboard',
}));

describe('DirectorDashboardPage', () => {
  it('renders without crashing', () => {
    render(<DirectorDashboardPage />);
    expect(document.body.textContent).toBeTruthy();
  });
});
