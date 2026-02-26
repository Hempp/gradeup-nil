'use client';

import { CheckCircle, GraduationCap, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type { AthleteData, VerificationType, VerificationModalState, AdminModalState } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface AthleteModalsProps {
  athlete: AthleteData;
  // Admin modal states
  adminModals: AdminModalState;
  setAdminModals: (update: Partial<AdminModalState>) => void;
  // Verification modal states
  verificationModals: VerificationModalState;
  setVerificationModals: (update: Partial<VerificationModalState>) => void;
  // Loading state
  isLoading: boolean;
  // Verification notes
  verificationNotes: string;
  setVerificationNotes: (notes: string) => void;
  // Handlers
  onVerify: () => Promise<void>;
  onSuspend: () => Promise<void>;
  onReinstate: () => Promise<void>;
  onDelete: () => Promise<void>;
  onVerifyType: (type: VerificationType) => Promise<void>;
  onRevokeType: (type: VerificationType) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Textarea Component (reusable)
// ═══════════════════════════════════════════════════════════════════════════

interface NotesTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  required?: boolean;
}

function NotesTextarea({ value, onChange, placeholder, label, required }: NotesTextareaProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
        {label} {required && <span className="text-[var(--color-error)]">*</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-20 px-3 py-2 text-sm rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
        required={required}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function AthleteModals({
  athlete,
  adminModals,
  setAdminModals,
  verificationModals,
  setVerificationModals,
  isLoading,
  verificationNotes,
  setVerificationNotes,
  onVerify,
  onSuspend,
  onReinstate,
  onDelete,
  onVerifyType,
  onRevokeType,
}: AthleteModalsProps) {
  const closeAndClearNotes = (modalKey: keyof VerificationModalState) => {
    setVerificationModals({ [modalKey]: false });
    setVerificationNotes('');
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ADMIN MODALS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {/* Verify Modal */}
      <Modal
        isOpen={adminModals.verify}
        onClose={() => setAdminModals({ verify: false })}
        title="Verify Athlete"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setAdminModals({ verify: false })}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onVerify} isLoading={isLoading}>
              Verify
            </Button>
          </>
        }
      >
        <p className="text-[var(--text-secondary)]">
          Are you sure you want to verify <strong>{athlete.name}</strong>? This will
          mark them as fully verified on the platform.
        </p>
      </Modal>

      {/* Suspend Modal */}
      <Modal
        isOpen={adminModals.suspend}
        onClose={() => setAdminModals({ suspend: false })}
        title="Suspend Account"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setAdminModals({ suspend: false })}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onSuspend} isLoading={isLoading}>
              Suspend
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-[var(--text-secondary)]">
            Are you sure you want to suspend <strong>{athlete.name}</strong>&apos;s
            account? This will:
          </p>
          <ul className="list-disc list-inside text-sm text-[var(--text-muted)] space-y-1">
            <li>Prevent them from accessing the platform</li>
            <li>Pause all active deals</li>
            <li>Hide their profile from brands</li>
          </ul>
        </div>
      </Modal>

      {/* Reinstate Modal */}
      <Modal
        isOpen={adminModals.reinstate}
        onClose={() => setAdminModals({ reinstate: false })}
        title="Reinstate Account"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setAdminModals({ reinstate: false })}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onReinstate} isLoading={isLoading}>
              Reinstate
            </Button>
          </>
        }
      >
        <p className="text-[var(--text-secondary)]">
          Are you sure you want to reinstate <strong>{athlete.name}</strong>&apos;s
          account? They will regain full access to the platform.
        </p>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={adminModals.delete}
        onClose={() => setAdminModals({ delete: false })}
        title="Delete Account"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setAdminModals({ delete: false })}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onDelete} isLoading={isLoading}>
              Delete Permanently
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-error-muted)] border border-[var(--color-error)]">
            <p className="text-sm text-[var(--color-error)] font-medium">
              Warning: This action cannot be undone.
            </p>
          </div>
          <p className="text-[var(--text-secondary)]">
            Are you sure you want to permanently delete <strong>{athlete.name}</strong>&apos;s
            account? All data including deal history and audit logs will be removed.
          </p>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VERIFICATION MODALS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {/* Verify Enrollment Modal */}
      <Modal
        isOpen={verificationModals.enrollment}
        onClose={() => closeAndClearNotes('enrollment')}
        title="Verify Enrollment"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => closeAndClearNotes('enrollment')}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => onVerifyType('enrollment')} isLoading={isLoading}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Enrollment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[var(--text-muted)]">Student Name</p>
                <p className="font-medium text-[var(--text-primary)]">{athlete.name}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Email</p>
                <p className="font-medium text-[var(--text-primary)]">{athlete.email}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Year</p>
                <p className="font-medium text-[var(--text-primary)]">{athlete.year}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Major</p>
                <p className="font-medium text-[var(--text-primary)]">{athlete.major}</p>
              </div>
            </div>
          </div>
          <p className="text-[var(--text-secondary)]">
            By verifying enrollment, you confirm that <strong>{athlete.name}</strong> is currently enrolled as a student at your institution.
          </p>
          <NotesTextarea
            value={verificationNotes}
            onChange={setVerificationNotes}
            placeholder="Add any notes about this verification..."
            label="Verification Notes (Optional)"
          />
        </div>
      </Modal>

      {/* Verify Grades Modal */}
      <Modal
        isOpen={verificationModals.grades}
        onClose={() => closeAndClearNotes('grades')}
        title="Verify Academic Standing"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => closeAndClearNotes('grades')}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => onVerifyType('grades')} isLoading={isLoading}>
              <GraduationCap className="h-4 w-4 mr-2" />
              Confirm Grades
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[var(--text-muted)] text-sm">Current GPA</p>
                <p className="text-3xl font-bold text-[var(--gpa-gold)]">{athlete.gpa.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-[var(--text-muted)] text-sm">NCAA Minimum</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">2.30</p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--color-success)] to-[var(--gpa-gold)]"
                style={{ width: `${Math.min((athlete.gpa / 4.0) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-[var(--text-muted)]">
              <span>0.0</span>
              <span>2.0</span>
              <span>3.0</span>
              <span>4.0</span>
            </div>
          </div>
          <p className="text-[var(--text-secondary)]">
            By verifying grades, you confirm that <strong>{athlete.name}</strong>&apos;s academic records have been reviewed and they meet NCAA academic eligibility requirements.
          </p>
          <NotesTextarea
            value={verificationNotes}
            onChange={setVerificationNotes}
            placeholder="Add any notes about transcript review, academic standing, etc..."
            label="Verification Notes (Optional)"
          />
        </div>
      </Modal>

      {/* Verify Stats Modal */}
      <Modal
        isOpen={verificationModals.stats}
        onClose={() => closeAndClearNotes('stats')}
        title="Verify Sport Eligibility & Stats"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => closeAndClearNotes('stats')}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => onVerifyType('stats')} isLoading={isLoading}>
              <Trophy className="h-4 w-4 mr-2" />
              Confirm Stats
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[var(--text-muted)]">Sport</p>
                <p className="font-medium text-[var(--text-primary)]">{athlete.sport}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Position</p>
                <p className="font-medium text-[var(--text-primary)]">{athlete.position}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Year</p>
                <p className="font-medium text-[var(--text-primary)]">{athlete.year}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Social Following</p>
                <p className="font-medium text-[var(--text-primary)]">{athlete.followers.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
            <p className="text-sm text-[var(--text-secondary)]">
              <strong>Verification confirms:</strong> Active roster status, sport eligibility, position accuracy, and that athletic stats/data are accurate.
            </p>
          </div>
          <p className="text-[var(--text-secondary)]">
            By verifying stats, you confirm that <strong>{athlete.name}</strong> is on the official {athlete.sport} roster and their athletic information is accurate.
          </p>
          <NotesTextarea
            value={verificationNotes}
            onChange={setVerificationNotes}
            placeholder="Add any notes about roster verification, stats accuracy, etc..."
            label="Verification Notes (Optional)"
          />
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* REVOKE VERIFICATION MODALS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {/* Revoke Enrollment Modal */}
      <Modal
        isOpen={verificationModals.revokeEnrollment}
        onClose={() => closeAndClearNotes('revokeEnrollment')}
        title="Revoke Enrollment Verification"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => closeAndClearNotes('revokeEnrollment')}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => onRevokeType('enrollment')} isLoading={isLoading}>
              Revoke Verification
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-[var(--text-secondary)]">
            Are you sure you want to revoke enrollment verification for <strong>{athlete.name}</strong>?
          </p>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20">
            <p className="text-sm text-[var(--color-warning)]">
              This will mark the athlete as unverified and may affect their ability to participate in NIL deals.
            </p>
          </div>
          <NotesTextarea
            value={verificationNotes}
            onChange={setVerificationNotes}
            placeholder="Explain why enrollment verification is being revoked..."
            label="Reason for Revocation"
            required
          />
        </div>
      </Modal>

      {/* Revoke Grades Modal */}
      <Modal
        isOpen={verificationModals.revokeGrades}
        onClose={() => closeAndClearNotes('revokeGrades')}
        title="Revoke Academic Verification"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => closeAndClearNotes('revokeGrades')}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => onRevokeType('grades')} isLoading={isLoading}>
              Revoke Verification
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-[var(--text-secondary)]">
            Are you sure you want to revoke academic standing verification for <strong>{athlete.name}</strong>?
          </p>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20">
            <p className="text-sm text-[var(--color-warning)]">
              This may indicate the athlete no longer meets academic eligibility requirements.
            </p>
          </div>
          <NotesTextarea
            value={verificationNotes}
            onChange={setVerificationNotes}
            placeholder="Explain why academic verification is being revoked..."
            label="Reason for Revocation"
            required
          />
        </div>
      </Modal>

      {/* Revoke Stats Modal */}
      <Modal
        isOpen={verificationModals.revokeStats}
        onClose={() => closeAndClearNotes('revokeStats')}
        title="Revoke Sport Verification"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => closeAndClearNotes('revokeStats')}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => onRevokeType('stats')} isLoading={isLoading}>
              Revoke Verification
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-[var(--text-secondary)]">
            Are you sure you want to revoke sport eligibility verification for <strong>{athlete.name}</strong>?
          </p>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20">
            <p className="text-sm text-[var(--color-warning)]">
              This may indicate the athlete is no longer on the active roster or their stats need review.
            </p>
          </div>
          <NotesTextarea
            value={verificationNotes}
            onChange={setVerificationNotes}
            placeholder="Explain why sport verification is being revoked..."
            label="Reason for Revocation"
            required
          />
        </div>
      </Modal>
    </>
  );
}
