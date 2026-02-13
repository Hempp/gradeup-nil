'use client';

import { useState, useCallback } from 'react';
import { Building2, CreditCard, Smartphone, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  validators,
  paymentValidators,
  useFormValidation,
  type ValidationRules,
} from '@/lib/utils/validation';
import type { PaymentAccount, PaymentMethod } from '@/lib/services/payments';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface PaymentMethodFormProps {
  initialData?: PaymentAccount | null;
  onSubmit: (data: Omit<PaymentAccount, 'id' | 'user_id' | 'is_verified'>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface BankFormValues {
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  confirmAccountNumber: string;
  accountHolderName: string;
}

interface PayPalFormValues {
  paypalEmail: string;
}

interface VenmoFormValues {
  venmoUsername: string;
}

interface CheckFormValues {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Payment Type Selector
// ═══════════════════════════════════════════════════════════════════════════

const paymentTypes: { value: PaymentMethod; label: string; icon: typeof Building2 }[] = [
  { value: 'bank_transfer', label: 'Bank Account', icon: Building2 },
  { value: 'paypal', label: 'PayPal', icon: CreditCard },
  { value: 'venmo', label: 'Venmo', icon: Smartphone },
  { value: 'check', label: 'Check', icon: Mail },
];

// ═══════════════════════════════════════════════════════════════════════════
// Validation Rules
// ═══════════════════════════════════════════════════════════════════════════

const bankValidationRules: ValidationRules<BankFormValues> = {
  bankName: [validators.required, validators.minLength(2)],
  routingNumber: [validators.required, paymentValidators.routingNumber],
  accountNumber: [validators.required, paymentValidators.accountNumber],
  confirmAccountNumber: [validators.required],
  accountHolderName: [validators.required, validators.minLength(2)],
};

const paypalValidationRules: ValidationRules<PayPalFormValues> = {
  paypalEmail: [validators.required, paymentValidators.paypalAccount],
};

const venmoValidationRules: ValidationRules<VenmoFormValues> = {
  venmoUsername: [validators.required, paymentValidators.venmoUsername],
};

const checkValidationRules: ValidationRules<CheckFormValues> = {
  addressLine1: [validators.required, validators.minLength(5)],
  city: [validators.required, validators.minLength(2)],
  state: [validators.required, paymentValidators.stateCode],
  zipCode: [validators.required, paymentValidators.zipCode],
};

// ═══════════════════════════════════════════════════════════════════════════
// Sub-Forms
// ═══════════════════════════════════════════════════════════════════════════

function BankForm({
  initialValues,
  onSubmit,
  onCancel,
  isLoading,
  isPrimary,
  setIsPrimary,
}: {
  initialValues: BankFormValues;
  onSubmit: (values: BankFormValues) => void;
  onCancel: () => void;
  isLoading: boolean;
  isPrimary: boolean;
  setIsPrimary: (v: boolean) => void;
}) {
  const form = useFormValidation(initialValues, bankValidationRules);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Custom validation for account number match
    if (form.values.accountNumber !== form.values.confirmAccountNumber) {
      form.setFieldError('confirmAccountNumber', 'Account numbers do not match');
      return;
    }
    if (form.validate()) {
      onSubmit(form.values);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          Bank Name
        </label>
        <Input
          value={form.values.bankName}
          onChange={(e) => form.handleChange('bankName', e.target.value)}
          onBlur={() => form.handleBlur('bankName')}
          placeholder="e.g., Chase, Bank of America"
          error={form.touched.bankName && !!form.errors.bankName}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          Routing Number
        </label>
        <Input
          value={form.values.routingNumber}
          onChange={(e) => form.handleChange('routingNumber', e.target.value.replace(/\D/g, '').slice(0, 9))}
          onBlur={() => form.handleBlur('routingNumber')}
          placeholder="9 digit routing number"
          maxLength={9}
          error={form.touched.routingNumber && !!form.errors.routingNumber}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          Account Number
        </label>
        <Input
          type="password"
          value={form.values.accountNumber}
          onChange={(e) => form.handleChange('accountNumber', e.target.value.replace(/\D/g, ''))}
          onBlur={() => form.handleBlur('accountNumber')}
          placeholder="Account number"
          error={form.touched.accountNumber && !!form.errors.accountNumber}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          Confirm Account Number
        </label>
        <Input
          value={form.values.confirmAccountNumber}
          onChange={(e) => form.handleChange('confirmAccountNumber', e.target.value.replace(/\D/g, ''))}
          onBlur={() => form.handleBlur('confirmAccountNumber')}
          placeholder="Re-enter account number"
          error={form.touched.confirmAccountNumber && !!form.errors.confirmAccountNumber}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          Account Holder Name
        </label>
        <Input
          value={form.values.accountHolderName}
          onChange={(e) => form.handleChange('accountHolderName', e.target.value)}
          onBlur={() => form.handleBlur('accountHolderName')}
          placeholder="Name as it appears on account"
          error={form.touched.accountHolderName && !!form.errors.accountHolderName}
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isPrimary}
          onChange={(e) => setIsPrimary(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--border-color)] text-[var(--color-primary)]"
        />
        <span className="text-sm text-[var(--text-secondary)]">Set as primary payment method</span>
      </label>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Bank Account
        </Button>
      </div>
    </form>
  );
}

function PayPalForm({
  initialValues,
  onSubmit,
  onCancel,
  isLoading,
  isPrimary,
  setIsPrimary,
}: {
  initialValues: PayPalFormValues;
  onSubmit: (values: PayPalFormValues) => void;
  onCancel: () => void;
  isLoading: boolean;
  isPrimary: boolean;
  setIsPrimary: (v: boolean) => void;
}) {
  const form = useFormValidation(initialValues, paypalValidationRules);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.validate()) {
      onSubmit(form.values);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          PayPal Email or Phone
        </label>
        <Input
          value={form.values.paypalEmail}
          onChange={(e) => form.handleChange('paypalEmail', e.target.value)}
          onBlur={() => form.handleBlur('paypalEmail')}
          placeholder="email@example.com or phone number"
          error={form.touched.paypalEmail && !!form.errors.paypalEmail}
        />
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Enter the email or phone associated with your PayPal account
        </p>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isPrimary}
          onChange={(e) => setIsPrimary(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--border-color)] text-[var(--color-primary)]"
        />
        <span className="text-sm text-[var(--text-secondary)]">Set as primary payment method</span>
      </label>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save PayPal
        </Button>
      </div>
    </form>
  );
}

function VenmoForm({
  initialValues,
  onSubmit,
  onCancel,
  isLoading,
  isPrimary,
  setIsPrimary,
}: {
  initialValues: VenmoFormValues;
  onSubmit: (values: VenmoFormValues) => void;
  onCancel: () => void;
  isLoading: boolean;
  isPrimary: boolean;
  setIsPrimary: (v: boolean) => void;
}) {
  const form = useFormValidation(initialValues, venmoValidationRules);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.validate()) {
      onSubmit(form.values);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          Venmo Username
        </label>
        <Input
          value={form.values.venmoUsername}
          onChange={(e) => form.handleChange('venmoUsername', e.target.value)}
          onBlur={() => form.handleBlur('venmoUsername')}
          placeholder="@username"
          error={form.touched.venmoUsername && !!form.errors.venmoUsername}
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isPrimary}
          onChange={(e) => setIsPrimary(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--border-color)] text-[var(--color-primary)]"
        />
        <span className="text-sm text-[var(--text-secondary)]">Set as primary payment method</span>
      </label>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Venmo
        </Button>
      </div>
    </form>
  );
}

function CheckForm({
  initialValues,
  onSubmit,
  onCancel,
  isLoading,
  isPrimary,
  setIsPrimary,
}: {
  initialValues: CheckFormValues;
  onSubmit: (values: CheckFormValues) => void;
  onCancel: () => void;
  isLoading: boolean;
  isPrimary: boolean;
  setIsPrimary: (v: boolean) => void;
}) {
  const form = useFormValidation(initialValues, checkValidationRules);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.validate()) {
      onSubmit(form.values);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          Address Line 1
        </label>
        <Input
          value={form.values.addressLine1}
          onChange={(e) => form.handleChange('addressLine1', e.target.value)}
          onBlur={() => form.handleBlur('addressLine1')}
          placeholder="Street address"
          error={form.touched.addressLine1 && !!form.errors.addressLine1}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          Address Line 2 <span className="text-[var(--text-muted)]">(Optional)</span>
        </label>
        <Input
          value={form.values.addressLine2}
          onChange={(e) => form.handleChange('addressLine2', e.target.value)}
          placeholder="Apt, suite, unit, etc."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            City
          </label>
          <Input
            value={form.values.city}
            onChange={(e) => form.handleChange('city', e.target.value)}
            onBlur={() => form.handleBlur('city')}
            placeholder="City"
            error={form.touched.city && !!form.errors.city}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            State
          </label>
          <Input
            value={form.values.state}
            onChange={(e) => form.handleChange('state', e.target.value.toUpperCase().slice(0, 2))}
            onBlur={() => form.handleBlur('state')}
            placeholder="CA"
            maxLength={2}
            error={form.touched.state && !!form.errors.state}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          ZIP Code
        </label>
        <Input
          value={form.values.zipCode}
          onChange={(e) => form.handleChange('zipCode', e.target.value)}
          onBlur={() => form.handleBlur('zipCode')}
          placeholder="12345"
          error={form.touched.zipCode && !!form.errors.zipCode}
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isPrimary}
          onChange={(e) => setIsPrimary(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--border-color)] text-[var(--color-primary)]"
        />
        <span className="text-sm text-[var(--text-secondary)]">Set as primary payment method</span>
      </label>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Mailing Address
        </Button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function PaymentMethodForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: PaymentMethodFormProps) {
  const [selectedType, setSelectedType] = useState<PaymentMethod>(
    initialData?.account_type || 'bank_transfer'
  );
  const [isPrimary, setIsPrimary] = useState(initialData?.is_primary || false);

  // Extract initial values from existing data
  const getInitialBankValues = (): BankFormValues => ({
    bankName: initialData?.account_details?.bankName || '',
    routingNumber: initialData?.account_details?.routingNumber || '',
    accountNumber: initialData?.account_details?.accountNumber || '',
    confirmAccountNumber: initialData?.account_details?.accountNumber || '',
    accountHolderName: initialData?.account_details?.accountHolderName || '',
  });

  const getInitialPayPalValues = (): PayPalFormValues => ({
    paypalEmail: initialData?.account_details?.paypalEmail || '',
  });

  const getInitialVenmoValues = (): VenmoFormValues => ({
    venmoUsername: initialData?.account_details?.venmoUsername || '',
  });

  const getInitialCheckValues = (): CheckFormValues => ({
    addressLine1: initialData?.account_details?.addressLine1 || '',
    addressLine2: initialData?.account_details?.addressLine2 || '',
    city: initialData?.account_details?.city || '',
    state: initialData?.account_details?.state || '',
    zipCode: initialData?.account_details?.zipCode || '',
  });

  // Handle form submission based on type
  const handleBankSubmit = useCallback(async (values: BankFormValues) => {
    await onSubmit({
      account_type: 'bank_transfer',
      account_details: {
        bankName: values.bankName,
        routingNumber: values.routingNumber,
        accountNumber: values.accountNumber,
        accountHolderName: values.accountHolderName,
      },
      is_primary: isPrimary,
    });
  }, [onSubmit, isPrimary]);

  const handlePayPalSubmit = useCallback(async (values: PayPalFormValues) => {
    await onSubmit({
      account_type: 'paypal',
      account_details: { paypalEmail: values.paypalEmail },
      is_primary: isPrimary,
    });
  }, [onSubmit, isPrimary]);

  const handleVenmoSubmit = useCallback(async (values: VenmoFormValues) => {
    await onSubmit({
      account_type: 'venmo',
      account_details: { venmoUsername: values.venmoUsername },
      is_primary: isPrimary,
    });
  }, [onSubmit, isPrimary]);

  const handleCheckSubmit = useCallback(async (values: CheckFormValues) => {
    await onSubmit({
      account_type: 'check',
      account_details: {
        addressLine1: values.addressLine1,
        addressLine2: values.addressLine2,
        city: values.city,
        state: values.state,
        zipCode: values.zipCode,
      },
      is_primary: isPrimary,
    });
  }, [onSubmit, isPrimary]);

  return (
    <div className="space-y-6">
      {/* Payment Type Selector (only show when adding new) */}
      {!initialData && (
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
            Payment Method Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {paymentTypes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedType(value)}
                className={`
                  flex flex-col items-center gap-2 p-4 rounded-[var(--radius-md)] border-2 transition-all
                  ${selectedType === value
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                    : 'border-[var(--border-color)] hover:border-[var(--text-muted)]'
                  }
                `}
              >
                <Icon className={`h-6 w-6 ${selectedType === value ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)]'}`} />
                <span className={`text-sm font-medium ${selectedType === value ? 'text-[var(--color-primary)]' : 'text-[var(--text-secondary)]'}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conditional Form Based on Type */}
      {selectedType === 'bank_transfer' && (
        <BankForm
          initialValues={getInitialBankValues()}
          onSubmit={handleBankSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
          isPrimary={isPrimary}
          setIsPrimary={setIsPrimary}
        />
      )}

      {selectedType === 'paypal' && (
        <PayPalForm
          initialValues={getInitialPayPalValues()}
          onSubmit={handlePayPalSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
          isPrimary={isPrimary}
          setIsPrimary={setIsPrimary}
        />
      )}

      {selectedType === 'venmo' && (
        <VenmoForm
          initialValues={getInitialVenmoValues()}
          onSubmit={handleVenmoSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
          isPrimary={isPrimary}
          setIsPrimary={setIsPrimary}
        />
      )}

      {selectedType === 'check' && (
        <CheckForm
          initialValues={getInitialCheckValues()}
          onSubmit={handleCheckSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
          isPrimary={isPrimary}
          setIsPrimary={setIsPrimary}
        />
      )}
    </div>
  );
}
