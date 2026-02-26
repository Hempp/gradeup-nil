'use client';

import { useState } from 'react';
import { DollarSign, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FormField, TextAreaField } from '@/components/ui/form-field';
import { formatCurrency } from '@/lib/utils';
import type { CounterOfferInput } from '@/lib/services/deals';
import type { DealDetail, CounterOfferFormData, CounterOfferFormErrors } from './types';
import { validateCounterOffer } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// COUNTER OFFER MODAL CONTENT
// ═══════════════════════════════════════════════════════════════════════════

interface CounterOfferModalContentProps {
  deal: DealDetail;
  onClose: () => void;
  onSubmit: (data: CounterOfferInput) => Promise<void>;
  isSubmitting: boolean;
}

function CounterOfferModalContent({
  deal,
  onClose,
  onSubmit,
  isSubmitting,
}: CounterOfferModalContentProps) {
  const [formData, setFormData] = useState<CounterOfferFormData>({
    amount: deal.amount.toString(),
    notes: '',
  });
  const [errors, setErrors] = useState<CounterOfferFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleChange = (field: keyof CounterOfferFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBlur = (field: keyof CounterOfferFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    // Validate on blur
    const validationErrors = validateCounterOffer(formData);
    if (validationErrors[field]) {
      setErrors((prev) => ({ ...prev, [field]: validationErrors[field] }));
    }
  };

  const handleSubmit = async () => {
    // Mark all fields as touched
    setTouched({ amount: true, notes: true });

    // Validate
    const validationErrors = validateCounterOffer(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    // Submit
    await onSubmit({
      compensation_amount: parseFloat(formData.amount),
      counter_notes: formData.notes || undefined,
    });
  };

  const proposedAmount = parseFloat(formData.amount) || 0;
  const difference = proposedAmount - deal.amount;
  const percentChange = deal.amount > 0 ? ((difference / deal.amount) * 100).toFixed(1) : '0';

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Make a Counter Offer"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Counter Offer'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Current Offer Summary */}
        <div className="p-4 bg-[var(--bg-tertiary)] rounded-[var(--radius-lg)]">
          <p className="text-sm text-[var(--text-muted)] mb-1">Current Offer</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {formatCurrency(deal.amount)}
          </p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {deal.brand.name} - {deal.title}
          </p>
        </div>

        {/* Counter Offer Form */}
        <FormField
          label="Your Proposed Amount"
          name="amount"
          type="number"
          value={formData.amount}
          onChange={(e) => handleChange('amount', e.target.value)}
          onBlur={() => handleBlur('amount')}
          error={touched.amount ? errors.amount : undefined}
          icon={<DollarSign className="h-4 w-4" />}
          placeholder="Enter your proposed amount"
          min={1}
          step={100}
          required
        />

        {/* Difference Indicator */}
        {proposedAmount > 0 && proposedAmount !== deal.amount && (
          <div
            className={`p-3 rounded-[var(--radius-md)] ${
              difference > 0
                ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
                : 'bg-[var(--color-error)]/10 text-[var(--color-error)]'
            }`}
          >
            <p className="text-sm font-medium">
              {difference > 0 ? '+' : ''}
              {formatCurrency(difference)} ({difference > 0 ? '+' : ''}
              {percentChange}%)
            </p>
            <p className="text-xs opacity-80">
              {difference > 0
                ? 'Your counter offer is higher than the original'
                : 'Your counter offer is lower than the original'}
            </p>
          </div>
        )}

        {/* Notes */}
        <TextAreaField
          label="Additional Notes (Optional)"
          name="notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          onBlur={() => handleBlur('notes')}
          error={touched.notes ? errors.notes : undefined}
          placeholder="Explain your reasoning or add any additional terms you'd like to discuss..."
          maxLength={1000}
          showCount
        />

        {/* Info Notice */}
        <div className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            Counter offers are typically responded to within 24-48 hours. The brand may accept,
            reject, or make a new counter offer.
          </p>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COUNTER OFFER MODAL WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

interface CounterOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal: DealDetail;
  onSubmit: (data: CounterOfferInput) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * Wrapper component that handles modal open/close and uses key-based reset
 * to properly reset form state when the modal reopens
 */
export function CounterOfferModal({
  isOpen,
  onClose,
  deal,
  onSubmit,
  isSubmitting,
}: CounterOfferModalProps) {
  // Use a key that changes when modal opens to reset the form state
  const [modalKey, setModalKey] = useState(0);

  // Increment key when modal opens to reset internal state
  const handleClose = () => {
    onClose();
    // Reset key after modal closes so next open gets fresh state
    setTimeout(() => setModalKey((k) => k + 1), 300);
  };

  if (!isOpen) return null;

  return (
    <CounterOfferModalContent
      key={modalKey}
      deal={deal}
      onClose={handleClose}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
    />
  );
}

export default CounterOfferModal;
