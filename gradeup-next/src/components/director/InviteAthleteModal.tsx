'use client';

import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, type SelectOption } from '@/components/ui/select';
import { useToastActions } from '@/components/ui/toast';

const SPORT_OPTIONS: SelectOption[] = [
  { value: '', label: 'Select sport (optional)' },
  ...['Basketball', 'Football', 'Soccer', 'Volleyball', 'Swimming', 'Track & Field', 'Tennis', 'Baseball', 'Softball', 'Other']
    .map(s => ({ value: s, label: s })),
];

const YEAR_OPTIONS: SelectOption[] = [
  { value: '', label: 'Select year (optional)' },
  { value: 'freshman', label: 'Freshman' },
  { value: 'sophomore', label: 'Sophomore' },
  { value: 'junior', label: 'Junior' },
  { value: 'senior', label: 'Senior' },
  { value: 'graduate', label: 'Graduate' },
];

interface InviteAthleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteComplete: () => void;
}

interface FormState {
  email: string;
  firstName: string;
  lastName: string;
  sport: string;
  academicYear: string;
  gpa: string;
}

const EMPTY_FORM: FormState = {
  email: '',
  firstName: '',
  lastName: '',
  sport: '',
  academicYear: '',
  gpa: '',
};

export function InviteAthleteModal({ isOpen, onClose, onInviteComplete }: InviteAthleteModalProps) {
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
    if (!form.email.trim()) next.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email.';
    if (!form.firstName.trim()) next.firstName = 'First name is required.';
    if (!form.lastName.trim()) next.lastName = 'Last name is required.';
    if (form.gpa !== '') {
      const n = parseFloat(form.gpa);
      if (isNaN(n) || n < 0 || n > 4.0) next.gpa = 'GPA must be between 0.0 and 4.0.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      };
      if (form.sport) payload.sport = form.sport;
      if (form.academicYear) payload.academicYear = form.academicYear;
      if (form.gpa !== '') payload.gpa = parseFloat(form.gpa);

      const res = await fetch('/api/director/athletes/invite', {
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
        'Athlete Invited',
        `An invitation email has been sent to ${form.email.trim()}.`
      );
      handleClose();
      onInviteComplete();
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
      title="Invite Athlete"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            <UserPlus className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Sending invite...' : 'Send Invite'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-muted)]">
          The athlete will receive a confirmation email to set up their account.
        </p>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            Email <span className="text-[var(--color-error)]">*</span>
          </label>
          <Input
            type="email"
            placeholder="athlete@university.edu"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            error={!!errors.email}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-[var(--color-error)]">{errors.email}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              First Name <span className="text-[var(--color-error)]">*</span>
            </label>
            <Input
              placeholder="Jane"
              value={form.firstName}
              onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
              error={!!errors.firstName}
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-[var(--color-error)]">{errors.firstName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Last Name <span className="text-[var(--color-error)]">*</span>
            </label>
            <Input
              placeholder="Smith"
              value={form.lastName}
              onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
              error={!!errors.lastName}
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-[var(--color-error)]">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            Sport
          </label>
          <Select
            options={SPORT_OPTIONS}
            value={form.sport}
            onChange={v => setForm(f => ({ ...f, sport: v }))}
            placeholder="Select sport (optional)"
            fullWidth
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            Academic Year
          </label>
          <Select
            options={YEAR_OPTIONS}
            value={form.academicYear}
            onChange={v => setForm(f => ({ ...f, academicYear: v }))}
            placeholder="Select year (optional)"
            fullWidth
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            GPA (optional)
          </label>
          <Input
            type="number"
            placeholder="e.g. 3.75"
            min={0}
            max={4.0}
            step={0.01}
            value={form.gpa}
            onChange={e => setForm(f => ({ ...f, gpa: e.target.value }))}
            error={!!errors.gpa}
          />
          {errors.gpa && (
            <p className="mt-1 text-xs text-[var(--color-error)]">{errors.gpa}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
