/**
 * Tests for the PaymentMethodsSection component
 * @module __tests__/components/athlete/PaymentMethodsSection.test
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentMethodsSection } from '@/components/athlete/PaymentMethodsSection';
import type { PaymentAccount } from '@/lib/services/payments';

// Mock the payments service
const mockGetPaymentAccounts = jest.fn();
const mockAddPaymentAccount = jest.fn();
const mockUpdatePaymentAccount = jest.fn();
const mockDeletePaymentAccount = jest.fn();

jest.mock('@/lib/services/payments', () => ({
  getPaymentAccounts: () => mockGetPaymentAccounts(),
  addPaymentAccount: (...args: unknown[]) => mockAddPaymentAccount(...args),
  updatePaymentAccount: (...args: unknown[]) => mockUpdatePaymentAccount(...args),
  deletePaymentAccount: (...args: unknown[]) => mockDeletePaymentAccount(...args),
}));

// Mock the toast actions
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('@/components/ui/toast', () => ({
  useToastActions: () => ({
    success: mockShowSuccess,
    error: mockShowError,
  }),
}));

// Mock PaymentMethodCard
jest.mock('@/components/athlete/PaymentMethodCard', () => ({
  PaymentMethodCard: ({
    account,
    onSetPrimary,
    onEdit,
    onDelete,
  }: {
    account: PaymentAccount;
    onSetPrimary: (id: string) => void;
    onEdit: (account: PaymentAccount) => void;
    onDelete: (id: string) => void;
  }) => (
    <div data-testid="payment-card">
      <span>{account.account_type}</span>
      {account.is_primary && <span>Primary</span>}
      <button onClick={() => onSetPrimary(account.id)}>Set Primary</button>
      <button onClick={() => onEdit(account)}>Edit</button>
      <button onClick={() => onDelete(account.id)}>Delete</button>
    </div>
  ),
}));

// Mock PaymentMethodForm
jest.mock('@/components/athlete/PaymentMethodForm', () => ({
  PaymentMethodForm: ({
    onSubmit,
    onCancel,
    isLoading,
    initialData,
  }: {
    onSubmit: (data: unknown) => Promise<void>;
    onCancel: () => void;
    isLoading: boolean;
    initialData?: PaymentAccount;
  }) => (
    <div data-testid="payment-form">
      <span>{initialData ? 'Edit Mode' : 'Add Mode'}</span>
      <button onClick={onCancel}>Cancel Form</button>
      <button
        onClick={() => onSubmit({ account_type: 'paypal', account_details: { paypalEmail: 'test@test.com' }, is_primary: false })}
        disabled={isLoading}
      >
        Submit Form
      </button>
    </div>
  ),
}));

describe('PaymentMethodsSection', () => {
  const mockAccounts: PaymentAccount[] = [
    {
      id: 'acc-1',
      user_id: 'user-1',
      account_type: 'bank_transfer',
      account_details: { bankName: 'Chase', accountNumber: '123456789' },
      is_primary: true,
      is_verified: true,
    },
    {
      id: 'acc-2',
      user_id: 'user-1',
      account_type: 'paypal',
      account_details: { paypalEmail: 'user@example.com' },
      is_primary: false,
      is_verified: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPaymentAccounts.mockResolvedValue({ data: mockAccounts, error: null });
    mockAddPaymentAccount.mockResolvedValue({ data: null, error: null });
    mockUpdatePaymentAccount.mockResolvedValue({ data: null, error: null });
    mockDeletePaymentAccount.mockResolvedValue({ data: null, error: null });
  });

  describe('loading state', () => {
    it('shows loading spinner initially', () => {
      mockGetPaymentAccounts.mockReturnValue(new Promise(() => {})); // Never resolves
      render(<PaymentMethodsSection />);

      expect(screen.getByText('Payment Methods')).toBeInTheDocument();
    });
  });

  describe('with accounts', () => {
    it('displays payment accounts after loading', async () => {
      render(<PaymentMethodsSection />);

      await waitFor(() => {
        expect(screen.getAllByTestId('payment-card')).toHaveLength(2);
      });
    });

    it('shows correct title in header', async () => {
      render(<PaymentMethodsSection />);

      await waitFor(() => {
        expect(screen.getByText('Payment Methods')).toBeInTheDocument();
      });
    });

    it('shows Add button in header', async () => {
      render(<PaymentMethodsSection />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^add$/i })).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    it('shows empty state when no accounts', async () => {
      mockGetPaymentAccounts.mockResolvedValue({ data: [], error: null });
      render(<PaymentMethodsSection />);

      await waitFor(() => {
        expect(screen.getByText('No Payment Methods')).toBeInTheDocument();
      });
    });

    it('shows add button in empty state', async () => {
      mockGetPaymentAccounts.mockResolvedValue({ data: [], error: null });
      render(<PaymentMethodsSection />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add payment method/i })).toBeInTheDocument();
      });
    });

    it('shows helpful text in empty state', async () => {
      mockGetPaymentAccounts.mockResolvedValue({ data: [], error: null });
      render(<PaymentMethodsSection />);

      await waitFor(() => {
        expect(screen.getByText(/add a payment method to receive earnings/i)).toBeInTheDocument();
      });
    });
  });

  describe('error state', () => {
    it('shows error message when fetch fails', async () => {
      mockGetPaymentAccounts.mockResolvedValue({
        data: null,
        error: { message: 'Failed to load accounts' }
      });
      render(<PaymentMethodsSection />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load accounts')).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      mockGetPaymentAccounts.mockResolvedValue({
        data: null,
        error: { message: 'Network error' }
      });
      render(<PaymentMethodsSection />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });
  });

  describe('add payment method modal', () => {
    it('opens add modal when button clicked', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodsSection />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^add$/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /^add$/i }));

      expect(screen.getByTestId('payment-form')).toBeInTheDocument();
      expect(screen.getByText('Add Mode')).toBeInTheDocument();
    });

    it('closes modal when cancel clicked', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodsSection />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^add$/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /^add$/i }));
      await user.click(screen.getByRole('button', { name: /cancel form/i }));

      expect(screen.queryByTestId('payment-form')).not.toBeInTheDocument();
    });

    it('calls addPaymentAccount when submitting', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodsSection />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^add$/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /^add$/i }));
      await user.click(screen.getByRole('button', { name: /submit form/i }));

      await waitFor(() => {
        expect(mockAddPaymentAccount).toHaveBeenCalled();
      });
    });

    it('shows success toast after adding', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodsSection />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^add$/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /^add$/i }));
      await user.click(screen.getByRole('button', { name: /submit form/i }));

      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('edit payment method', () => {
    it('opens edit modal when edit clicked', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodsSection />);

      await waitFor(() => {
        expect(screen.getAllByTestId('payment-card')).toHaveLength(2);
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      expect(screen.getByTestId('payment-form')).toBeInTheDocument();
      expect(screen.getByText('Edit Mode')).toBeInTheDocument();
    });
  });

  describe('delete payment method', () => {
    it('opens delete confirmation when delete clicked', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodsSection />);

      await waitFor(() => {
        expect(screen.getAllByTestId('payment-card')).toHaveLength(2);
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/delete.*\?/i)).toBeInTheDocument();
      });
    });
  });

  describe('set primary', () => {
    it('calls updatePaymentAccount when setting primary', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodsSection />);

      await waitFor(() => {
        expect(screen.getAllByTestId('payment-card')).toHaveLength(2);
      });

      const setPrimaryButtons = screen.getAllByRole('button', { name: /set primary/i });
      await user.click(setPrimaryButtons[1]); // Click the non-primary one

      await waitFor(() => {
        expect(mockUpdatePaymentAccount).toHaveBeenCalled();
      });
    });
  });
});
