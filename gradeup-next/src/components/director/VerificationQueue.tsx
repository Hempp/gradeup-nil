'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import {
  CheckCircle2,
  XCircle,
  Clock,
  GraduationCap,
  Trophy,
  FileText,
  BarChart3,
  Loader2,
  AlertTriangle,
  CheckCheck,
} from 'lucide-react';
import { useDirectorVerifications, type VerificationRequestWithAthlete } from '@/lib/hooks/use-director-verifications';
import { getVerificationLabel } from '@/lib/hooks/use-verification-requests';
import type { VerificationType } from '@/lib/services/verification';
import { useToastActions } from '@/components/ui/toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface VerificationQueueProps {
  schoolId: string;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper Components
// ═══════════════════════════════════════════════════════════════════════════

function getTypeIcon(type: VerificationType) {
  const icons: Record<VerificationType, React.ReactNode> = {
    enrollment: <GraduationCap className="h-4 w-4" />,
    grades: <FileText className="h-4 w-4" />,
    sport: <Trophy className="h-4 w-4" />,
    stats: <BarChart3 className="h-4 w-4" />,
    identity: <GraduationCap className="h-4 w-4" />,
    ncaa_eligibility: <Trophy className="h-4 w-4" />,
  };
  return icons[type] || <Clock className="h-4 w-4" />;
}

function getTypeBadgeColor(type: VerificationType): string {
  const colors: Record<VerificationType, string> = {
    enrollment: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    grades: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    sport: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    stats: 'bg-green-500/10 text-green-500 border-green-500/20',
    identity: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    ncaa_eligibility: 'bg-red-500/10 text-red-500 border-red-500/20',
  };
  return colors[type] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
}

// ═══════════════════════════════════════════════════════════════════════════
// Request Card Component
// ═══════════════════════════════════════════════════════════════════════════

interface RequestCardProps {
  request: VerificationRequestWithAthlete;
  isSelected: boolean;
  onToggleSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
  isProcessing: boolean;
}

function RequestCard({
  request,
  isSelected,
  onToggleSelect,
  onApprove,
  onReject,
  isProcessing,
}: RequestCardProps) {
  const athlete = request.athlete;
  const athleteName = `${athlete.first_name} ${athlete.last_name}`;
  const submittedAgo = formatDistanceToNow(new Date(request.submitted_at), { addSuffix: true });

  return (
    <div className={cn(
      "flex items-center gap-4 p-4 rounded-lg border transition-colors",
      isSelected
        ? "border-primary bg-primary/5"
        : "border-border hover:border-border/80 hover:bg-muted/30"
    )}>
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
        disabled={isProcessing}
        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
      />

      {/* Avatar */}
      <Avatar
        src={athlete.avatar_url}
        fallback={athlete.first_name.charAt(0)}
        size="md"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium truncate">{athleteName}</span>
          <Badge variant="outline" className={cn("text-xs", getTypeBadgeColor(request.type))}>
            {getTypeIcon(request.type)}
            <span className="ml-1">{getVerificationLabel(request.type)}</span>
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{athlete.sport?.name || 'Unknown Sport'}</span>
          <span>GPA: {athlete.gpa.toFixed(2)}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {submittedAgo}
          </span>
        </div>
        {request.notes && (
          <p className="mt-2 text-sm text-muted-foreground italic">
            &ldquo;{request.notes}&rdquo;
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onReject}
          disabled={isProcessing}
          className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <XCircle className="h-4 w-4" />
          Reject
        </Button>
        <Button
          size="sm"
          onClick={onApprove}
          disabled={isProcessing}
          className="gap-1"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Approve
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Reject Modal
// ═══════════════════════════════════════════════════════════════════════════

interface RejectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  athleteName: string;
  verificationType: VerificationType;
  isProcessing: boolean;
}

function RejectModal({
  open,
  onOpenChange,
  onConfirm,
  athleteName,
  verificationType,
  isProcessing,
}: RejectModalProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason.trim());
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={
        <span className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Reject Verification
        </span>
      }
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={isProcessing || !reason.trim()}
            className="gap-2"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Reject Verification
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Reject {getVerificationLabel(verificationType).toLowerCase()} verification for {athleteName}.
          Please provide a reason.
        </p>
        <div className="space-y-2">
          <label htmlFor="reject-reason" className="text-sm font-medium">
            Reason for Rejection
          </label>
          <textarea
            id="reject-reason"
            placeholder="Enter the reason for rejecting this verification request..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            disabled={isProcessing}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function VerificationQueue({ schoolId, className }: VerificationQueueProps) {
  const {
    requests,
    pendingCount,
    loading,
    error,
    approve,
    reject,
    bulkApprove,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
  } = useDirectorVerifications(schoolId);

  const toast = useToastActions();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    request: VerificationRequestWithAthlete | null;
  }>({ open: false, request: null });
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const handleApprove = async (request: VerificationRequestWithAthlete) => {
    setProcessingIds(prev => new Set(prev).add(request.id));

    const result = await approve(request.id, request.athlete_id, request.type);

    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(request.id);
      return next;
    });

    if (result.success) {
      toast.success('Verification Approved', `${request.athlete.first_name}'s ${getVerificationLabel(request.type).toLowerCase()} has been verified.`);
    } else {
      toast.error('Approval Failed', result.error || 'Unable to approve verification.');
    }
  };

  const handleRejectClick = (request: VerificationRequestWithAthlete) => {
    setRejectModal({ open: true, request });
  };

  const handleRejectConfirm = async (reason: string) => {
    const request = rejectModal.request;
    if (!request) return;

    setProcessingIds(prev => new Set(prev).add(request.id));

    const result = await reject(request.id, request.athlete_id, request.type, reason);

    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(request.id);
      return next;
    });

    setRejectModal({ open: false, request: null });

    if (result.success) {
      toast.success('Verification Rejected', `${request.athlete.first_name}'s request has been rejected.`);
    } else {
      toast.error('Rejection Failed', result.error || 'Unable to reject verification.');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;

    setBulkProcessing(true);
    const result = await bulkApprove(selectedIds);
    setBulkProcessing(false);

    if (result.approved > 0) {
      toast.success('Bulk Approval Complete', `Approved ${result.approved} verification${result.approved > 1 ? 's' : ''}.${result.failed > 0 ? ` ${result.failed} failed.` : ''}`);
    } else {
      toast.error('Bulk Approval Failed', 'No verifications were approved.');
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mb-4" />
          <p className="text-sm text-muted-foreground">Failed to load verification requests.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Verification Requests
                {pendingCount > 0 && (
                  <Badge variant="primary">{pendingCount}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Review and approve athlete verification requests
              </CardDescription>
            </div>

            {/* Bulk Actions */}
            {requests.length > 0 && (
              <div className="flex items-center gap-2">
                {selectedIds.length > 0 ? (
                  <>
                    <span className="text-sm text-muted-foreground">
                      {selectedIds.length} selected
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearSelection}
                      disabled={bulkProcessing}
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleBulkApprove}
                      disabled={bulkProcessing}
                      className="gap-1"
                    >
                      {bulkProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCheck className="h-4 w-4" />
                      )}
                      Approve Selected
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={selectAll}
                  >
                    Select All
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg font-medium">All Caught Up!</p>
              <p className="text-sm text-muted-foreground mt-1">
                No pending verification requests
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  isSelected={selectedIds.includes(request.id)}
                  onToggleSelect={() => toggleSelect(request.id)}
                  onApprove={() => handleApprove(request)}
                  onReject={() => handleRejectClick(request)}
                  isProcessing={processingIds.has(request.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Modal */}
      <RejectModal
        open={rejectModal.open}
        onOpenChange={(open) => setRejectModal({ open, request: open ? rejectModal.request : null })}
        onConfirm={handleRejectConfirm}
        athleteName={rejectModal.request ? `${rejectModal.request.athlete.first_name} ${rejectModal.request.athlete.last_name}` : ''}
        verificationType={rejectModal.request?.type || 'enrollment'}
        isProcessing={rejectModal.request ? processingIds.has(rejectModal.request.id) : false}
      />
    </>
  );
}
