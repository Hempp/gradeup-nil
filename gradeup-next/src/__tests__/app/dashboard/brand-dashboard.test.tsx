import { render } from '@testing-library/react';
import BrandDashboardPage from '@/app/(dashboard)/brand/dashboard/page';

// Mock AuthContext
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    profile: { id: 'test-profile', role: 'brand' },
    isLoading: false,
    signOut: jest.fn(),
  }),
  useRequireAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    profile: { id: 'test-profile', role: 'brand' },
    isLoading: false,
  }),
}));

// Mock all hooks
jest.mock('@/lib/hooks/use-data', () => ({
  useBrandAnalytics: () => ({ data: null, isLoading: false, error: null }),
  useBrandCampaigns: () => ({ data: [], isLoading: false, error: null }),
  useBrandShortlist: () => ({ data: [], isLoading: false, error: null }),
  useBrandDeals: () => ({ data: [], isLoading: false, error: null }),
}));

jest.mock('@/lib/hooks/use-demo-mode', () => ({
  useDemoMode: () => ({ isDemoMode: false, demoRole: null }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/brand/dashboard',
}));

describe('BrandDashboardPage', () => {
  it('renders without crashing', () => {
    render(<BrandDashboardPage />);
    expect(document.body.textContent).toBeTruthy();
  });
});
