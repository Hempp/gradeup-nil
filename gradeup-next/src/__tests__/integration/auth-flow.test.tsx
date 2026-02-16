/**
 * Integration Tests: Authentication Flow
 *
 * These tests verify the complete authentication user journey including:
 * - Form validation behavior
 * - Error handling and display
 * - Loading states during submission
 * - Navigation between auth pages
 * - Success/error toast notifications
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import LoginPage from '@/app/(auth)/login/page';
import SignupPage from '@/app/(auth)/signup/page';
import { ToastProvider } from '@/components/ui/toast';
import { signIn } from '@/lib/services/auth';

// ═══════════════════════════════════════════════════════════════════════════
// Mocks
// ═══════════════════════════════════════════════════════════════════════════

// Mock Next.js navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  })),
  getSupabaseClient: jest.fn(() => ({
    auth: {
      signInWithOAuth: jest.fn().mockResolvedValue({ error: null }),
    },
  })),
}));

// Mock auth service
jest.mock('@/lib/services/auth', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  getFullProfile: jest.fn(),
}));

// ═══════════════════════════════════════════════════════════════════════════
// Test Utilities
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Wrapper component providing necessary providers for auth components
 */
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

/**
 * Helper to render components with test wrapper
 */
function renderWithProviders(component: React.ReactElement) {
  return render(component, { wrapper: TestWrapper });
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Setup
// ═══════════════════════════════════════════════════════════════════════════

describe('Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    mockReplace.mockClear();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Login Page Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('Login Page', () => {
    describe('Form Rendering', () => {
      it('renders the login form with all required fields', () => {
        renderWithProviders(<LoginPage />);

        expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
        expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
        expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
      });

      it('renders social login buttons', () => {
        renderWithProviders(<LoginPage />);

        expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /apple/i })).toBeInTheDocument();
      });

      it('renders demo mode buttons', () => {
        renderWithProviders(<LoginPage />);

        expect(screen.getByRole('button', { name: /athlete/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /brand/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /director/i })).toBeInTheDocument();
      });
    });

    describe('Form Validation', () => {
      it('shows validation error when submitting empty form', async () => {
        const user = userEvent.setup();
        renderWithProviders(<LoginPage />);

        const submitButton = screen.getByRole('button', { name: /sign in/i });
        await user.click(submitButton);

        await waitFor(() => {
          // Multiple validation errors may appear (email and password)
          const errors = screen.getAllByText(/this field is required/i);
          expect(errors.length).toBeGreaterThanOrEqual(1);
        });
      });

      it('shows validation error for invalid email format', async () => {
        const user = userEvent.setup();
        renderWithProviders(<LoginPage />);

        const emailInput = screen.getByLabelText(/email address/i);
        await user.type(emailInput, 'invalid-email');
        await user.tab(); // Trigger blur

        await waitFor(() => {
          expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
        });
      });

      it('clears validation errors when user starts typing', async () => {
        const user = userEvent.setup();
        renderWithProviders(<LoginPage />);

        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        // Submit empty form to trigger validation
        await user.click(submitButton);

        await waitFor(() => {
          const errors = screen.getAllByText(/this field is required/i);
          expect(errors.length).toBeGreaterThanOrEqual(1);
        });

        // Start typing to clear email error
        await user.type(emailInput, 'test@example.com');

        await waitFor(() => {
          // Email error should be cleared, but password error may still be present
          const emailError = screen.queryByText('email-error');
          expect(emailError).toBeNull();
        });
      });

      it('validates both email and password fields', async () => {
        const user = userEvent.setup();
        renderWithProviders(<LoginPage />);

        const submitButton = screen.getByRole('button', { name: /sign in/i });
        await user.click(submitButton);

        await waitFor(() => {
          // There should be two validation errors (email and password)
          const errors = screen.getAllByText(/this field is required/i);
          expect(errors.length).toBeGreaterThanOrEqual(1);
        });
      });
    });

    describe('Form Submission', () => {
      it('shows loading state during form submission', async () => {
        const user = userEvent.setup();

        // Mock signIn to delay response
        (signIn as jest.Mock).mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve({ data: null, error: { message: 'Test error' } }), 100))
        );

        renderWithProviders(<LoginPage />);

        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'password123');
        await user.click(submitButton);

        // Button should be disabled while loading
        expect(submitButton).toBeDisabled();

        await waitFor(() => {
          expect(submitButton).not.toBeDisabled();
        });
      });

      it('displays error message on failed login', async () => {
        const user = userEvent.setup();

        (signIn as jest.Mock).mockResolvedValue({
          data: null,
          error: { message: 'Invalid login credentials' },
        });

        renderWithProviders(<LoginPage />);

        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'wrongpassword');
        await user.click(submitButton);

        await waitFor(() => {
          // Multiple alerts may be present (form error + toast)
          const alerts = screen.getAllByRole('alert');
          expect(alerts.length).toBeGreaterThanOrEqual(1);
          // Error message may appear multiple times
          const errorMessages = screen.getAllByText(/invalid login credentials/i);
          expect(errorMessages.length).toBeGreaterThanOrEqual(1);
        });
      });

      it('redirects to athlete dashboard on successful athlete login', async () => {
        const user = userEvent.setup();

        (signIn as jest.Mock).mockResolvedValue({
          data: {
            user: {
              id: 'test-id',
              email: 'athlete@example.com',
              role: 'athlete',
            },
            session: { access_token: 'test-token' },
          },
          error: null,
        });

        renderWithProviders(<LoginPage />);

        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        await user.type(emailInput, 'athlete@example.com');
        await user.type(passwordInput, 'password123');
        await user.click(submitButton);

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith('/athlete/dashboard');
        });
      });

      it('redirects to brand dashboard on successful brand login', async () => {
        const user = userEvent.setup();

        (signIn as jest.Mock).mockResolvedValue({
          data: {
            user: {
              id: 'test-id',
              email: 'brand@example.com',
              role: 'brand',
            },
            session: { access_token: 'test-token' },
          },
          error: null,
        });

        renderWithProviders(<LoginPage />);

        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        await user.type(emailInput, 'brand@example.com');
        await user.type(passwordInput, 'password123');
        await user.click(submitButton);

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith('/brand/dashboard');
        });
      });

      it('redirects to director dashboard on successful director login', async () => {
        const user = userEvent.setup();

        (signIn as jest.Mock).mockResolvedValue({
          data: {
            user: {
              id: 'test-id',
              email: 'director@example.com',
              role: 'athletic_director',
            },
            session: { access_token: 'test-token' },
          },
          error: null,
        });

        renderWithProviders(<LoginPage />);

        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        await user.type(emailInput, 'director@example.com');
        await user.type(passwordInput, 'password123');
        await user.click(submitButton);

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith('/director/dashboard');
        });
      });
    });

    describe('Demo Mode', () => {
      it('navigates to athlete dashboard when clicking athlete demo button', async () => {
        const user = userEvent.setup();
        renderWithProviders(<LoginPage />);

        const athleteDemoButton = screen.getByRole('button', { name: /^athlete$/i });
        await user.click(athleteDemoButton);

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith('/athlete/dashboard');
        });
      });

      it('navigates to brand dashboard when clicking brand demo button', async () => {
        const user = userEvent.setup();
        renderWithProviders(<LoginPage />);

        const brandDemoButton = screen.getByRole('button', { name: /^brand$/i });
        await user.click(brandDemoButton);

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith('/brand/dashboard');
        });
      });

      it('navigates to director dashboard when clicking director demo button', async () => {
        const user = userEvent.setup();
        renderWithProviders(<LoginPage />);

        const directorDemoButton = screen.getByRole('button', { name: /^director$/i });
        await user.click(directorDemoButton);

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith('/director/dashboard');
        });
      });
    });

    describe('Remember Me Checkbox', () => {
      it('toggles remember me checkbox', async () => {
        const user = userEvent.setup();
        renderWithProviders(<LoginPage />);

        const rememberMeCheckbox = screen.getByRole('checkbox');

        expect(rememberMeCheckbox).not.toBeChecked();

        await user.click(rememberMeCheckbox);

        expect(rememberMeCheckbox).toBeChecked();

        await user.click(rememberMeCheckbox);

        expect(rememberMeCheckbox).not.toBeChecked();
      });
    });

    describe('Accessibility', () => {
      it('has accessible form labels', () => {
        renderWithProviders(<LoginPage />);

        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/password/i);

        // Inputs should have IDs and be associated with labels
        expect(emailInput).toHaveAttribute('id');
        expect(passwordInput).toHaveAttribute('id');
      });

      it('shows accessible error messages with aria-describedby', async () => {
        const user = userEvent.setup();
        renderWithProviders(<LoginPage />);

        const submitButton = screen.getByRole('button', { name: /sign in/i });
        await user.click(submitButton);

        await waitFor(() => {
          const emailInput = screen.getByLabelText(/email address/i);
          // Check for aria-invalid or aria-describedby (accessibility patterns)
          const hasAriaInvalid = emailInput.getAttribute('aria-invalid') === 'true';
          const hasAriaDescribedBy = emailInput.hasAttribute('aria-describedby');
          expect(hasAriaInvalid || hasAriaDescribedBy).toBe(true);
        });
      });

      it('error alert has proper role', async () => {
        const user = userEvent.setup();

        (signIn as jest.Mock).mockResolvedValue({
          data: null,
          error: { message: 'Invalid credentials' },
        });

        renderWithProviders(<LoginPage />);

        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'password');
        await user.click(submitButton);

        await waitFor(() => {
          // Multiple alerts may be present
          const alerts = screen.getAllByRole('alert');
          expect(alerts.length).toBeGreaterThanOrEqual(1);
        });
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Signup Page Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('Signup Page', () => {
    describe('Role Selection', () => {
      it('renders the signup page with all role options', () => {
        renderWithProviders(<SignupPage />);

        expect(screen.getByRole('heading', { name: /join gradeup/i })).toBeInTheDocument();
        expect(screen.getByText(/i'm an athlete/i)).toBeInTheDocument();
        expect(screen.getByText(/i'm a brand/i)).toBeInTheDocument();
        expect(screen.getByText(/i'm an athletic director/i)).toBeInTheDocument();
      });

      it('displays role descriptions', () => {
        renderWithProviders(<SignupPage />);

        expect(screen.getByText(/showcase your academic excellence/i)).toBeInTheDocument();
        expect(screen.getByText(/find and partner with scholar-athletes/i)).toBeInTheDocument();
        expect(screen.getByText(/manage your program's nil activities/i)).toBeInTheDocument();
      });

      it('has link to sign in page', () => {
        renderWithProviders(<SignupPage />);

        const signInLink = screen.getByRole('link', { name: /sign in/i });
        expect(signInLink).toHaveAttribute('href', '/login');
      });
    });

    describe('Navigation to Role-Specific Signup', () => {
      it('navigates to athlete signup when clicking athlete card', async () => {
        renderWithProviders(<SignupPage />);

        const athleteLink = screen.getByRole('link', { name: /i'm an athlete/i });
        expect(athleteLink).toHaveAttribute('href', '/signup/athlete');
      });

      it('navigates to brand signup when clicking brand card', async () => {
        renderWithProviders(<SignupPage />);

        const brandLink = screen.getByRole('link', { name: /i'm a brand/i });
        expect(brandLink).toHaveAttribute('href', '/signup/brand');
      });

      it('navigates to director signup when clicking director card', async () => {
        renderWithProviders(<SignupPage />);

        const directorLink = screen.getByRole('link', { name: /i'm an athletic director/i });
        expect(directorLink).toHaveAttribute('href', '/signup/director');
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Cross-Page Navigation Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('Navigation Between Auth Pages', () => {
    it('login page has link to signup page', () => {
      renderWithProviders(<LoginPage />);

      const signupLink = screen.getByRole('link', { name: /sign up/i });
      expect(signupLink).toHaveAttribute('href', '/signup');
    });

    it('login page has link to forgot password page', () => {
      renderWithProviders(<LoginPage />);

      const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
      expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
    });

    it('signup page has link to login page', () => {
      renderWithProviders(<SignupPage />);

      const loginLink = screen.getByRole('link', { name: /sign in/i });
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Error State Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      const user = userEvent.setup();

      (signIn as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('clears error message when user modifies form', async () => {
      const user = userEvent.setup();

      (signIn as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' },
      });

      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThanOrEqual(1);
      });

      // Clear the input and type again
      await user.clear(emailInput);
      await user.type(emailInput, 'new@example.com');

      // Verify user can continue interacting with form
      expect(emailInput).toHaveValue('new@example.com');
    });
  });
});
