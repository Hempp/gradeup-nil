/**
 * Tests for the PaymentMethodCard component
 * @module __tests__/components/athlete/PaymentMethodCard.test
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentMethodCard } from '@/components/athlete/PaymentMethodCard';
import type { PaymentAccount } from '@/lib/services/payments';

describe('PaymentMethodCard', () => {
  const mockOnSetPrimary = jest.fn();
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  const bankAccount: PaymentAccount = {
    id: '1',
    user_id: 'user-1',
    account_type: 'bank_transfer',
    account_details: {
      bankName: 'Chase',
      accountNumber: '123456789',
    },
    is_primary: false,
    is_verified: false,
  };

  const paypalAccount: PaymentAccount = {
    id: '2',
    user_id: 'user-1',
    account_type: 'paypal',
    account_details: {
      paypalEmail: 'test@example.com',
    },
    is_primary: true,
    is_verified: true,
  };

  const venmoAccount: PaymentAccount = {
    id: '3',
    user_id: 'user-1',
    account_type: 'venmo',
    account_details: {
      venmoUsername: 'johndoe',
    },
    is_primary: false,
    is_verified: false,
  };

  const checkAccount: PaymentAccount = {
    id: '4',
    user_id: 'user-1',
    account_type: 'check',
    account_details: {
      city: 'New York',
      state: 'NY',
    },
    is_primary: false,
    is_verified: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('display', () => {
    it('renders bank account correctly', () => {
      render(
        <PaymentMethodCard
          account={bankAccount}
          onSetPrimary={mockOnSetPrimary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Bank Account')).toBeInTheDocument();
      expect(screen.getByText('Chase ****6789')).toBeInTheDocument();
    });

    it('renders PayPal account correctly', () => {
      render(
        <PaymentMethodCard
          account={paypalAccount}
          onSetPrimary={mockOnSetPrimary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('PayPal')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('renders Venmo account with @ prefix', () => {
      render(
        <PaymentMethodCard
          account={venmoAccount}
          onSetPrimary={mockOnSetPrimary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Venmo')).toBeInTheDocument();
      expect(screen.getByText('@johndoe')).toBeInTheDocument();
    });

    it('renders check account with city/state', () => {
      render(
        <PaymentMethodCard
          account={checkAccount}
          onSetPrimary={mockOnSetPrimary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Check')).toBeInTheDocument();
      expect(screen.getByText('New York, NY')).toBeInTheDocument();
    });

    it('shows Primary badge for primary accounts', () => {
      render(
        <PaymentMethodCard
          account={paypalAccount}
          onSetPrimary={mockOnSetPrimary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Primary')).toBeInTheDocument();
    });

    it('shows Verified badge for verified accounts', () => {
      render(
        <PaymentMethodCard
          account={paypalAccount}
          onSetPrimary={mockOnSetPrimary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Verified')).toBeInTheDocument();
    });

    it('does not show badges for non-primary, non-verified accounts', () => {
      render(
        <PaymentMethodCard
          account={bankAccount}
          onSetPrimary={mockOnSetPrimary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.queryByText('Primary')).not.toBeInTheDocument();
      expect(screen.queryByText('Verified')).not.toBeInTheDocument();
    });
  });

  describe('menu interactions', () => {
    it('opens menu when options button clicked', async () => {
      const user = userEvent.setup();
      render(
        <PaymentMethodCard
          account={bankAccount}
          onSetPrimary={mockOnSetPrimary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByRole('button', { name: /payment account options/i }));

      expect(screen.getByText('Set as Primary')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('hides Set as Primary option for already primary accounts', async () => {
      const user = userEvent.setup();
      render(
        <PaymentMethodCard
          account={paypalAccount}
          onSetPrimary={mockOnSetPrimary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByRole('button', { name: /payment account options/i }));

      expect(screen.queryByText('Set as Primary')).not.toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('calls onSetPrimary when Set as Primary clicked', async () => {
      const user = userEvent.setup();
      render(
        <PaymentMethodCard
          account={bankAccount}
          onSetPrimary={mockOnSetPrimary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByRole('button', { name: /payment account options/i }));
      await user.click(screen.getByText('Set as Primary'));

      expect(mockOnSetPrimary).toHaveBeenCalledWith('1');
    });

    it('calls onEdit when Edit clicked', async () => {
      const user = userEvent.setup();
      render(
        <PaymentMethodCard
          account={bankAccount}
          onSetPrimary={mockOnSetPrimary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByRole('button', { name: /payment account options/i }));
      await user.click(screen.getByText('Edit'));

      expect(mockOnEdit).toHaveBeenCalledWith(bankAccount);
    });

    it('calls onDelete when Delete clicked', async () => {
      const user = userEvent.setup();
      render(
        <PaymentMethodCard
          account={bankAccount}
          onSetPrimary={mockOnSetPrimary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByRole('button', { name: /payment account options/i }));
      await user.click(screen.getByText('Delete'));

      expect(mockOnDelete).toHaveBeenCalledWith('1');
    });

    it('closes menu after action', async () => {
      const user = userEvent.setup();
      render(
        <PaymentMethodCard
          account={bankAccount}
          onSetPrimary={mockOnSetPrimary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      await user.click(screen.getByRole('button', { name: /payment account options/i }));
      await user.click(screen.getByText('Edit'));

      expect(screen.queryByText('Set as Primary')).not.toBeInTheDocument();
    });

    it('closes menu on outside click', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <PaymentMethodCard
            account={bankAccount}
            onSetPrimary={mockOnSetPrimary}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </div>
      );

      await user.click(screen.getByRole('button', { name: /payment account options/i }));
      expect(screen.getByText('Edit')).toBeInTheDocument();

      fireEvent.mouseDown(screen.getByTestId('outside'));

      await waitFor(() => {
        expect(screen.queryByText('Edit')).not.toBeInTheDocument();
      });
    });
  });

  describe('edge cases', () => {
    it('handles bank account without account number', () => {
      const bankWithoutNumber: PaymentAccount = {
        ...bankAccount,
        account_details: { bankName: 'Wells Fargo' },
      };

      render(
        <PaymentMethodCard
          account={bankWithoutNumber}
          onSetPrimary={mockOnSetPrimary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Wells Fargo')).toBeInTheDocument();
    });

    it('handles check account without city/state', () => {
      const checkWithoutLocation: PaymentAccount = {
        ...checkAccount,
        account_details: {},
      };

      render(
        <PaymentMethodCard
          account={checkWithoutLocation}
          onSetPrimary={mockOnSetPrimary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Mailing Address')).toBeInTheDocument();
    });

    it('handles venmo with @ prefix already', () => {
      const venmoWithAt: PaymentAccount = {
        ...venmoAccount,
        account_details: { venmoUsername: '@jane_doe' },
      };

      render(
        <PaymentMethodCard
          account={venmoWithAt}
          onSetPrimary={mockOnSetPrimary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('@jane_doe')).toBeInTheDocument();
    });
  });
});
