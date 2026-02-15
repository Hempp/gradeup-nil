'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Loader2, Send } from 'lucide-react';
import { getVerificationLabel } from '@/lib/hooks/use-verification-requests';
import type { VerificationType } from '@/lib/services/verification';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface VerificationRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: VerificationType | null;
  onSubmit: (notes?: string) => Promise<{ success: boolean; error?: string }>;
  submitting: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export function VerificationRequestModal({
  open,
  onOpenChange,
  type,
  onSubmit,
  submitting,
}: VerificationRequestModalProps) {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    const result = await onSubmit(notes || undefined);

    if (result.success) {
      setSuccess(true);
      setNotes('');
      // Close after showing success briefly
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
      }, 1500);
    } else {
      setError(result.error || 'Failed to submit request');
    }
  };

  const handleClose = () => {
    setNotes('');
    setError(null);
    setSuccess(false);
    onOpenChange(false);
  };

  if (!type) return null;

  const label = getVerificationLabel(type);

  const getDescription = (type: VerificationType): string => {
    const descriptions: Record<VerificationType, string> = {
      enrollment: 'Your Athletic Director will verify your current enrollment status with the registrar.',
      grades: 'Your Athletic Director will verify your GPA and academic standing.',
      sport: 'Your Athletic Director will verify your participation on the team roster.',
      stats: 'Your Athletic Director will verify your athletic statistics and performance data.',
      identity: 'Your Athletic Director will verify your identity.',
      ncaa_eligibility: 'Your Athletic Director will verify your NCAA eligibility status.',
    };
    return descriptions[type];
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={`Request ${label} Verification`}
      size="md"
      footer={
        success ? null : (
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Request
                </>
              )}
            </Button>
          </div>
        )
      }
    >
      {success ? (
        <div className="flex flex-col items-center justify-center py-8">
          <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
          <p className="text-lg font-medium">Request Sent!</p>
          <p className="text-sm text-muted-foreground text-center mt-2">
            Your Athletic Director will review your verification request.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {getDescription(type)}
          </p>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Additional Notes (Optional)
            </label>
            <textarea
              id="notes"
              placeholder="Add any notes or context for your Athletic Director..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={submitting}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">
              Your Athletic Director will be notified and can verify your {label.toLowerCase()} through school records.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
