'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, CreditCard, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { PaymentMethodCard } from './PaymentMethodCard';
import { PaymentMethodForm } from './PaymentMethodForm';
import {
  getPaymentAccounts,
  addPaymentAccount,
  updatePaymentAccount,
  deletePaymentAccount,
  type PaymentAccount,
} from '@/lib/services/payments';
import { useToastActions } from '@/components/ui/toast';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type ModalMode = 'add' | 'edit' | 'delete' | null;

// ═══════════════════════════════════════════════════════════════════════════
// Empty State
// ═══════════════════════════════════════════════════════════════════════════

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 rounded-full bg-[var(--bg-tertiary)] mb-4">
        <CreditCard className="h-8 w-8 text-[var(--text-muted)]" />
      </div>
      <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
        No Payment Methods
      </h3>
      <p className="text-sm text-[var(--text-muted)] max-w-sm mb-6">
        Add a payment method to receive earnings from your NIL deals. You can add
        bank accounts, PayPal, Venmo, or receive checks.
      </p>
      <Button variant="primary" onClick={onAdd}>
        <Plus className="h-4 w-4 mr-2" />
        Add Payment Method
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Delete Confirmation
// ═══════════════════════════════════════════════════════════════════════════

function DeleteConfirmation({
  account,
  onConfirm,
  onCancel,
  isLoading,
}: {
  account: PaymentAccount;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const getAccountName = () => {
    switch (account.account_type) {
      case 'bank_transfer':
        return account.account_details.bankName || 'Bank Account';
      case 'paypal':
        return 'PayPal';
      case 'venmo':
        return 'Venmo';
      case 'check':
        return 'Mailing Address';
      default:
        return 'Payment Method';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/20">
        <AlertCircle className="h-5 w-5 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Delete {getAccountName()}?
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            This action cannot be undone. Any pending payments to this account
            will need to be updated.
          </p>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Delete
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function PaymentMethodsSection() {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedAccount, setSelectedAccount] = useState<PaymentAccount | null>(null);

  const { success: showSuccess, error: showError } = useToastActions();

  // Fetch payment accounts
  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await getPaymentAccounts();

    if (result.error) {
      setError(result.error.message);
      setAccounts([]);
    } else {
      setAccounts(result.data || []);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Data fetching on mount is a valid pattern
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAccounts();
  }, [fetchAccounts]);

  // Modal handlers
  const openAddModal = () => {
    setSelectedAccount(null);
    setModalMode('add');
  };

  const openEditModal = (account: PaymentAccount) => {
    setSelectedAccount(account);
    setModalMode('edit');
  };

  const openDeleteModal = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    if (account) {
      setSelectedAccount(account);
      setModalMode('delete');
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedAccount(null);
  };

  // CRUD handlers
  const handleAdd = async (data: Omit<PaymentAccount, 'id' | 'user_id' | 'is_verified'>) => {
    setIsSaving(true);

    const result = await addPaymentAccount(data);

    if (result.error) {
      showError('Failed to add payment method', result.error.message);
    } else {
      showSuccess('Payment method added', 'Your payment method has been saved.');
      await fetchAccounts();
      closeModal();
    }

    setIsSaving(false);
  };

  const handleEdit = async (data: Omit<PaymentAccount, 'id' | 'user_id' | 'is_verified'>) => {
    if (!selectedAccount) return;

    setIsSaving(true);

    const result = await updatePaymentAccount(selectedAccount.id, data);

    if (result.error) {
      showError('Failed to update payment method', result.error.message);
    } else {
      showSuccess('Payment method updated', 'Your changes have been saved.');
      await fetchAccounts();
      closeModal();
    }

    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedAccount) return;

    setIsSaving(true);

    const result = await deletePaymentAccount(selectedAccount.id);

    if (result.error) {
      showError('Failed to delete payment method', result.error.message);
    } else {
      showSuccess('Payment method deleted', 'The payment method has been removed.');
      await fetchAccounts();
      closeModal();
    }

    setIsSaving(false);
  };

  const handleSetPrimary = async (accountId: string) => {
    const result = await updatePaymentAccount(accountId, { is_primary: true });

    if (result.error) {
      showError('Failed to set primary', result.error.message);
    } else {
      showSuccess('Primary payment method updated', 'Your default payment method has been changed.');
      await fetchAccounts();
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-8 w-8 text-[var(--color-error)] mb-4" />
            <p className="text-sm text-[var(--text-muted)]">{error}</p>
            <Button variant="outline" className="mt-4" onClick={fetchAccounts}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payment Methods</CardTitle>
          {accounts.length > 0 && (
            <Button variant="outline" size="sm" onClick={openAddModal}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <EmptyState onAdd={openAddModal} />
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <PaymentMethodCard
                  key={account.id}
                  account={account}
                  onSetPrimary={handleSetPrimary}
                  onEdit={openEditModal}
                  onDelete={openDeleteModal}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalMode === 'add' || modalMode === 'edit'}
        onClose={closeModal}
        title={modalMode === 'add' ? 'Add Payment Method' : 'Edit Payment Method'}
        size="md"
      >
        <PaymentMethodForm
          initialData={selectedAccount}
          onSubmit={modalMode === 'add' ? handleAdd : handleEdit}
          onCancel={closeModal}
          isLoading={isSaving}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={modalMode === 'delete'}
        onClose={closeModal}
        title="Delete Payment Method"
        size="sm"
      >
        {selectedAccount && (
          <DeleteConfirmation
            account={selectedAccount}
            onConfirm={handleDelete}
            onCancel={closeModal}
            isLoading={isSaving}
          />
        )}
      </Modal>
    </>
  );
}
