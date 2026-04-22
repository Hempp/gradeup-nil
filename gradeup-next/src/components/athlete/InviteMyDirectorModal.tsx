'use client';

import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, type SelectOption } from '@/components/ui/select';
import { useToastActions } from '@/components/ui/toast';

const TITLE_OPTIONS: SelectOption[] = [
  { value: '', label: 'Select title (optional)' },
  { value: 'Athletic Director',  label: 'Athletic Director' },
  { value: 'Assistant AD',       label: 'Assistant AD' },
  { value: 'Head Coach',         label: 'Head Coach' },
  { value: 'Other',              label: 'Other' },
];

interface InviteMyDirectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteComplete?: () => void;
}

interface FormState {
  directorName:  string;
  directorEmail: string;
  directorTitle: string;
}

const EMPTY_FORM: FormState = {
  directorName:  '',
  directorEmail: '',
  directorTitle: '',
};

export function InviteMyDirectorModal({
  isOpen,
  onClose,
  onInviteComplete,
}: InviteMyDirectorModalProps) {
  const toast = useToastActions();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleClose() {
    setForm(EMPTY_FORM);
    setErrors({});
    onClose();
  }

  function validate(): boolean {
    const next: Partial<FormState> = {};
    if (!form.directorName.trim()) next.directorName = 'Name is required.';
    if (!form.directorEmail.trim()) {
      next.directorEmail = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.directorEmail)) {
      next.directorEmail = 'Enter a valid email.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        directorEmail: form.directorEmail.trim(),
        directorName:  form.directorName.trim(),
      };
      if (form.directorTitle) payload.directorTitle = form.directorTitle;

      const res = await fetch('/api/athlete/invite-director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error('Invite Failed', data.error ?? 'Something went wrong.');
        return;
      }

      toast.success(
        'Invitation Sent',
        `An invitation email has been sent to ${form.directorEmail.trim()}.`
      );
      handleClose();
      onInviteComplete?.();
    } catch {
      toast.error('Invite Failed', 'Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite My Athletic Director"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            <UserPlus className="h-4 w-4 mr-2" aria-hidden="true" />
            {isSubmitting ? 'Sending invite...' : 'Send Invite'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-muted)]">
          Your Athletic Director or coach will receive an email invitation to join GradeUp
          and verify your enrollment and academic standing.
        </p>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            Director Name <span className="text-[var(--color-error)]">*</span>
          </label>
          <Input
            placeholder="e.g. Jordan Williams"
            value={form.directorName}
            onChange={e => setForm(f => ({ ...f, directorName: e.target.value }))}
            error={!!errors.directorName}
          />
          {errors.directorName && (
            <p className="mt-1 text-xs text-[var(--color-error)]">{errors.directorName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            Director Email <span className="text-[var(--color-error)]">*</span>
          </label>
          <Input
            type="email"
            placeholder="director@university.edu"
            value={form.directorEmail}
            onChange={e => setForm(f => ({ ...f, directorEmail: e.target.value }))}
            error={!!errors.directorEmail}
          />
          {errors.directorEmail && (
            <p className="mt-1 text-xs text-[var(--color-error)]">{errors.directorEmail}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            Title
          </label>
          <Select
            options={TITLE_OPTIONS}
            value={form.directorTitle}
            onChange={v => setForm(f => ({ ...f, directorTitle: v }))}
            placeholder="Select title (optional)"
            fullWidth
          />
        </div>
      </div>
    </Modal>
  );
}
