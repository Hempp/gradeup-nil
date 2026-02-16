import { render } from '@testing-library/react';
import AthleteDealsPage from '@/app/(dashboard)/athlete/deals/page';

// Mock AuthContext
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    profile: { id: 'test-profile', role: 'athlete' },
    isLoading: false,
    signOut: jest.fn(),
  }),
  useRequireAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    profile: { id: 'test-profile', role: 'athlete' },
    isLoading: false,
  }),
}));

// Mock all hooks
jest.mock('@/lib/hooks/use-data', () => ({
  useAthleteDeals: () => ({ data: [], isLoading: false, error: null }),
}));

jest.mock('@/lib/hooks/use-demo-mode', () => ({
  useDemoMode: () => ({ isDemoMode: false, demoRole: null }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/athlete/deals',
}));

describe('AthleteDealsPage', () => {
  it('renders without crashing', () => {
    render(<AthleteDealsPage />);
    expect(document.body.textContent).toBeTruthy();
  });
});
