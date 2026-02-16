import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ForgotPasswordPage from '@/app/(auth)/forgot-password/page';

// Mock Supabase client
const mockResetPasswordForEmail = jest.fn();
jest.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  }),
}));

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('renders the forgot password form', () => {
      render(<ForgotPasswordPage />);

      expect(screen.getByRole('heading', { name: /forgot password/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /back to login/i })).toBeInTheDocument();
    });

    it('renders description text', () => {
      render(<ForgotPasswordPage />);

      expect(screen.getByText(/no worries, we'll send you reset instructions/i)).toBeInTheDocument();
    });

    it('has email input with correct attributes', () => {
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('name', 'email');
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
      expect(emailInput).toBeRequired();
    });
  });

  describe('Form Validation', () => {
    it('requires email to submit', async () => {
      render(<ForgotPasswordPage />);

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      const form = submitButton.closest('form');

      expect(form).toBeInTheDocument();
    });

    it('accepts valid email', async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });
  });

  describe('Form Submission', () => {
    it('calls resetPasswordForEmail on submit', async () => {
      const user = userEvent.setup();
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
          'test@example.com',
          expect.objectContaining({
            redirectTo: expect.stringContaining('/reset-password'),
          })
        );
      });
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      mockResetPasswordForEmail.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
      );

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
    });

    it('disables email input during submission', async () => {
      const user = userEvent.setup();
      mockResetPasswordForEmail.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
      );

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      expect(emailInput).toBeDisabled();
    });
  });

  describe('Success State', () => {
    it('shows success message after successful submission', async () => {
      const user = userEvent.setup();
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });

    it('displays the submitted email in success message', async () => {
      const user = userEvent.setup();
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('shows try again button in success state', async () => {
      const user = userEvent.setup();
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('resets form when clicking try again', async () => {
      const user = userEvent.setup();
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email address/i)).toHaveValue('');
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message on API error', async () => {
      const user = userEvent.setup();
      mockResetPasswordForEmail.mockResolvedValue({
        error: { message: 'Rate limit exceeded' },
      });

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Rate limit exceeded');
      });
    });

    it('displays generic error on exception', async () => {
      const user = userEvent.setup();
      mockResetPasswordForEmail.mockRejectedValue(new Error('Network error'));

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/unexpected error/i);
      });
    });

    it('clears error when user starts typing', async () => {
      const user = userEvent.setup();
      mockResetPasswordForEmail.mockResolvedValue({
        error: { message: 'Some error' },
      });

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      await user.clear(emailInput);
      await user.type(emailInput, 'new@example.com');

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible error message', async () => {
      const user = userEvent.setup();
      mockResetPasswordForEmail.mockResolvedValue({
        error: { message: 'Error message' },
      });

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveAttribute('tabindex', '-1');
      });
    });

    it('has back to login link', () => {
      render(<ForgotPasswordPage />);

      const backLink = screen.getByRole('link', { name: /back to login/i });
      expect(backLink).toHaveAttribute('href', '/login');
    });
  });
});
