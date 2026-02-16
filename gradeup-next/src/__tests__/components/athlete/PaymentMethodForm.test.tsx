/**
 * Tests for the PaymentMethodForm component
 * @module __tests__/components/athlete/PaymentMethodForm.test
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentMethodForm } from '@/components/athlete/PaymentMethodForm';
import type { PaymentAccount } from '@/lib/services/payments';

// Mock validation module
jest.mock('@/lib/utils/validation', () => ({
  validators: {
    required: (value: string) => (value ? null : 'Required'),
    minLength: (min: number) => (value: string) =>
      value.length >= min ? null : `Min ${min} characters`,
  },
  paymentValidators: {
    routingNumber: (value: string) => (/^\d{9}$/.test(value) ? null : 'Invalid routing number'),
    accountNumber: (value: string) => (/^\d{4,17}$/.test(value) ? null : 'Invalid account number'),
    paypalAccount: (value: string) => (value.includes('@') ? null : 'Invalid PayPal account'),
    venmoUsername: (value: string) => (value.length > 0 ? null : 'Invalid Venmo username'),
    stateCode: (value: string) => (/^[A-Z]{2}$/.test(value) ? null : 'Invalid state code'),
    zipCode: (value: string) => (/^\d{5}(-\d{4})?$/.test(value) ? null : 'Invalid ZIP code'),
  },
  useFormValidation: (initialValues: Record<string, string>, _rules: unknown) => {
    const [values, setValues] = React.useState(initialValues);
    const [errors, setErrors] = React.useState<Record<string, string | null>>({});
    const [touched, setTouched] = React.useState<Record<string, boolean>>({});

    return {
      values,
      errors,
      touched,
      handleChange: (field: string, value: string) => {
        setValues((prev: Record<string, string>) => ({ ...prev, [field]: value }));
      },
      handleBlur: (field: string) => {
        setTouched((prev: Record<string, boolean>) => ({ ...prev, [field]: true }));
      },
      setFieldError: (field: string, error: string) => {
        setErrors((prev: Record<string, string | null>) => ({ ...prev, [field]: error }));
      },
      validate: () => true,
    };
  },
}));

describe('PaymentMethodForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('payment type selection', () => {
    it('renders payment type selector when adding new', () => {
      render(
        <PaymentMethodForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Bank Account')).toBeInTheDocument();
      expect(screen.getByText('PayPal')).toBeInTheDocument();
      expect(screen.getByText('Venmo')).toBeInTheDocument();
      expect(screen.getByText('Check')).toBeInTheDocument();
    });

    it('hides payment type selector when editing existing', () => {
      const existingAccount: PaymentAccount = {
        id: '1',
        user_id: 'user-1',
        account_type: 'paypal',
        account_details: { paypalEmail: 'test@example.com' },
        is_primary: false,
        is_verified: false,
      };

      render(
        <PaymentMethodForm
          initialData={existingAccount}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByText('Payment Method Type')).not.toBeInTheDocument();
    });

    it('switches forms when selecting different payment types', async () => {
      const user = userEvent.setup();
      render(
        <PaymentMethodForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Bank form is shown by default
      expect(screen.getByPlaceholderText('e.g., Chase, Bank of America')).toBeInTheDocument();

      // Switch to PayPal
      await user.click(screen.getByText('PayPal'));
      expect(screen.getByPlaceholderText('email@example.com or phone number')).toBeInTheDocument();

      // Switch to Venmo
      await user.click(screen.getByText('Venmo'));
      expect(screen.getByPlaceholderText('@username')).toBeInTheDocument();

      // Switch to Check
      await user.click(screen.getByText('Check'));
      expect(screen.getByPlaceholderText('Street address')).toBeInTheDocument();
    });
  });

  describe('BankForm', () => {
    it('renders bank form fields', () => {
      render(
        <PaymentMethodForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Bank Name')).toBeInTheDocument();
      expect(screen.getByText('Routing Number')).toBeInTheDocument();
      expect(screen.getByText('Account Number')).toBeInTheDocument();
      expect(screen.getByText('Confirm Account Number')).toBeInTheDocument();
      expect(screen.getByText('Account Holder Name')).toBeInTheDocument();
    });

    it('handles bank form input changes', async () => {
      const user = userEvent.setup();
      render(
        <PaymentMethodForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const bankNameInput = screen.getByPlaceholderText('e.g., Chase, Bank of America');
      await user.type(bankNameInput, 'Chase');
      expect(bankNameInput).toHaveValue('Chase');
    });

    it('shows Save Bank Account button', () => {
      render(
        <PaymentMethodForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('button', { name: /save bank account/i })).toBeInTheDocument();
    });
  });

  describe('PayPalForm', () => {
    it('renders PayPal form fields', async () => {
      const user = userEvent.setup();
      render(
        <PaymentMethodForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByText('PayPal'));

      expect(screen.getByText('PayPal Email or Phone')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('email@example.com or phone number')).toBeInTheDocument();
    });

    it('shows helper text for PayPal', async () => {
      const user = userEvent.setup();
      render(
        <PaymentMethodForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByText('PayPal'));

      expect(screen.getByText(/enter the email or phone associated with your paypal account/i)).toBeInTheDocument();
    });
  });

  describe('VenmoForm', () => {
    it('renders Venmo form fields', async () => {
      const user = userEvent.setup();
      render(
        <PaymentMethodForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByText('Venmo'));

      expect(screen.getByText('Venmo Username')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('@username')).toBeInTheDocument();
    });
  });

  describe('CheckForm', () => {
    it('renders check/mailing address form fields', async () => {
      const user = userEvent.setup();
      render(
        <PaymentMethodForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByText('Check'));

      expect(screen.getByText('Address Line 1')).toBeInTheDocument();
      expect(screen.getByText(/address line 2/i)).toBeInTheDocument();
      expect(screen.getByText('City')).toBeInTheDocument();
      expect(screen.getByText('State')).toBeInTheDocument();
      expect(screen.getByText('ZIP Code')).toBeInTheDocument();
    });

    it('marks Address Line 2 as optional', async () => {
      const user = userEvent.setup();
      render(
        <PaymentMethodForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByText('Check'));

      expect(screen.getByText('(Optional)')).toBeInTheDocument();
    });
  });

  describe('primary checkbox', () => {
    it('renders set as primary checkbox', () => {
      render(
        <PaymentMethodForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Set as primary payment method')).toBeInTheDocument();
    });

    it('checkbox can be toggled', async () => {
      const user = userEvent.setup();
      render(
        <PaymentMethodForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });

  describe('cancel button', () => {
    it('calls onCancel when cancel button clicked', async () => {
      const user = userEvent.setup();
      render(
        <PaymentMethodForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('disables buttons when loading', () => {
      render(
        <PaymentMethodForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /save bank account/i })).toBeDisabled();
    });
  });

  describe('editing existing account', () => {
    it('pre-fills bank account data', () => {
      const existingAccount: PaymentAccount = {
        id: '1',
        user_id: 'user-1',
        account_type: 'bank_transfer',
        account_details: {
          bankName: 'Chase',
          routingNumber: '123456789',
          accountNumber: '987654321',
          accountHolderName: 'John Doe',
        },
        is_primary: true,
        is_verified: true,
      };

      render(
        <PaymentMethodForm
          initialData={existingAccount}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByPlaceholderText('e.g., Chase, Bank of America')).toHaveValue('Chase');
    });

    it('pre-fills PayPal data', () => {
      const existingAccount: PaymentAccount = {
        id: '1',
        user_id: 'user-1',
        account_type: 'paypal',
        account_details: { paypalEmail: 'test@example.com' },
        is_primary: false,
        is_verified: false,
      };

      render(
        <PaymentMethodForm
          initialData={existingAccount}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByPlaceholderText('email@example.com or phone number')).toHaveValue('test@example.com');
    });
  });
});
