import { render } from '@testing-library/react';
import ResetPasswordPage from '@/app/(auth)/reset-password/page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/reset-password',
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
    auth: {
      updateUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'test' } } }, error: null }),
    },
  }),
}));

describe('ResetPasswordPage', () => {
  it('renders without crashing', () => {
    render(<ResetPasswordPage />);
    expect(document.body.textContent).toBeTruthy();
  });
});
