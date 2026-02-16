import { render, screen } from '@testing-library/react';
import BrandSignupPage from '@/app/(auth)/signup/brand/page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/signup/brand',
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

describe('BrandSignupPage', () => {
  it('renders without crashing', () => {
    render(<BrandSignupPage />);
    expect(document.body.textContent).toBeTruthy();
  });

  it('renders form buttons', () => {
    render(<BrandSignupPage />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders links', () => {
    render(<BrandSignupPage />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
  });
});
