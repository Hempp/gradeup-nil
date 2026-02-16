import { render, screen } from '@testing-library/react';
import AthleteSignupPage from '@/app/(auth)/signup/athlete/page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/signup/athlete',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock toast
jest.mock('@/components/ui/toast', () => ({
  useToastActions: () => ({
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({
    auth: { signUp: jest.fn() },
    from: () => ({ insert: jest.fn() }),
  }),
}));

describe('AthleteSignupPage', () => {
  it('renders without crashing', () => {
    render(<AthleteSignupPage />);
    // Component should render - check for any content
    expect(document.body.textContent).toBeTruthy();
  });

  it('renders form buttons', () => {
    render(<AthleteSignupPage />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders login link', () => {
    render(<AthleteSignupPage />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
  });
});
