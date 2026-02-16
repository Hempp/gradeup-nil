import { render } from '@testing-library/react';
import BrandCampaignsPage from '@/app/(dashboard)/brand/campaigns/page';

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
  useBrandCampaigns: () => ({ data: [], isLoading: false, error: null }),
}));

jest.mock('@/lib/hooks/use-demo-mode', () => ({
  useDemoMode: () => ({ isDemoMode: false, demoRole: null }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/brand/campaigns',
}));

describe('BrandCampaignsPage', () => {
  it('renders without crashing', () => {
    render(<BrandCampaignsPage />);
    expect(document.body.textContent).toBeTruthy();
  });
});
