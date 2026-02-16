import { render, screen } from '@testing-library/react';
import DirectorSignupPage from '@/app/(auth)/signup/director/page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/signup/director',
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

describe('DirectorSignupPage', () => {
  it('renders without crashing', () => {
    render(<DirectorSignupPage />);
    expect(document.body.textContent).toBeTruthy();
  });

  it('renders form buttons', () => {
    render(<DirectorSignupPage />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders links', () => {
    render(<DirectorSignupPage />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
  });
});
