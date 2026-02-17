'use client';

import { useState, useCallback } from 'react';
import {
  FileText,
  Download,
  PenTool,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Building2,
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import type { Contract, ContractSignature } from '@/lib/services/contracts';
import type { ContractStatus, SignatureStatus } from '@/lib/validations/contract.schema';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ContractViewerProps {
  contract: Contract;
  userRole?: 'athlete' | 'brand' | 'admin';
  onSign?: (partyType: 'athlete' | 'brand' | 'guardian' | 'witness') => void;
  onDownload?: () => void;
  onDecline?: (partyType: 'athlete' | 'brand' | 'guardian' | 'witness') => void;
  isLoading?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const contractStatusConfig: Record<ContractStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  draft: {
    label: 'Draft',
    className: 'bg-[var(--surface-100)] text-[var(--neutral-400)]',
    icon: FileText,
  },
  pending_signature: {
    label: 'Pending Signature',
    className: 'bg-[var(--warning-100)] text-[var(--warning-600)]',
    icon: Clock,
  },
  partially_signed: {
    label: 'Partially Signed',
    className: 'bg-[var(--secondary-100)] text-[var(--secondary-700)]',
    icon: PenTool,
  },
  fully_signed: {
    label: 'Fully Signed',
    className: 'bg-[var(--success-100)] text-[var(--success-600)]',
    icon: CheckCircle2,
  },
  active: {
    label: 'Active',
    className: 'bg-[var(--success-100)] text-[var(--success-600)]',
    icon: CheckCircle2,
  },
  expired: {
    label: 'Expired',
    className: 'bg-[var(--surface-100)] text-[var(--neutral-400)]',
    icon: Clock,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-[var(--error-100)] text-[var(--error-600)]',
    icon: XCircle,
  },
  voided: {
    label: 'Voided',
    className: 'bg-[var(--error-100)] text-[var(--error-600)]',
    icon: XCircle,
  },
};

const signatureStatusConfig: Record<SignatureStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  pending: {
    label: 'Pending',
    className: 'text-[var(--warning-600)]',
    icon: Clock,
  },
  signed: {
    label: 'Signed',
    className: 'text-[var(--success-600)]',
    icon: CheckCircle2,
  },
  declined: {
    label: 'Declined',
    className: 'text-[var(--error-600)]',
    icon: XCircle,
  },
  expired: {
    label: 'Expired',
    className: 'text-[var(--neutral-400)]',
    icon: AlertCircle,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const config = contractStatusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full',
        config.className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

function SignatureStatusIndicator({ signature }: { signature: ContractSignature }) {
  const config = signatureStatusConfig[signature.signature_status];
  const Icon = config.icon;
  const PartyIcon = signature.party_type === 'brand' ? Building2 : User;

  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border-color)] last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
          <PartyIcon className="w-4 h-4 text-[var(--text-muted)]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{signature.name}</p>
          <p className="text-xs text-[var(--text-muted)] capitalize">
            {signature.party_type.replace('_', ' ')}
            {signature.title && ` - ${signature.title}`}
          </p>
        </div>
      </div>
      <div className={cn('flex items-center gap-1.5 text-sm', config.className)}>
        <Icon className="w-4 h-4" />
        <span>{config.label}</span>
        {signature.signed_at && (
          <span className="text-xs text-[var(--text-muted)] ml-2">
            {new Date(signature.signed_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ContractViewer({
  contract,
  userRole = 'athlete',
  onSign,
  onDownload,
  onDecline,
  isLoading = false,
  className,
}: ContractViewerProps) {
  const [expandedClauses, setExpandedClauses] = useState<Set<number>>(new Set([0]));
  const [showAllClauses, setShowAllClauses] = useState(false);

  const toggleClause = useCallback((index: number) => {
    setExpandedClauses((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // Determine if the current user can sign
  const canSign = ['pending_signature', 'partially_signed'].includes(contract.status);
  const userPartyType = userRole === 'brand' ? 'brand' : 'athlete';
  const userSignature = contract.parties?.find((p) => p.party_type === userPartyType);
  const userCanSign = canSign && userSignature?.signature_status === 'pending';

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not specified';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const visibleClauses = showAllClauses ? contract.clauses : contract.clauses?.slice(0, 3);

  return (
    <div className={cn('bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]', className)}>
      {/* Header */}
      <div className="p-6 border-b border-[var(--border-color)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-6 h-6 text-[var(--color-primary)]" />
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                {contract.title}
              </h2>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              {contract.description || 'NIL Contract Agreement'}
            </p>
          </div>
          <ContractStatusBadge status={contract.status} />
        </div>

        {/* Key Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
            <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">Compensation</span>
            </div>
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              {formatCurrency(contract.compensation_amount)}
            </p>
          </div>

          <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
            <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs">Effective Date</span>
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {formatDate(contract.effective_date)}
            </p>
          </div>

          <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
            <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs">Expiration Date</span>
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {formatDate(contract.expiration_date)}
            </p>
          </div>

          <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
            <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-xs">Template</span>
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)] capitalize">
              {contract.template_type.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </div>

      {/* Signature Status Section */}
      <div className="p-6 border-b border-[var(--border-color)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <PenTool className="w-4 h-4" />
          Signature Status
        </h3>
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          {contract.parties?.map((signature, index) => (
            <SignatureStatusIndicator key={index} signature={signature} />
          ))}
        </div>
      </div>

      {/* Deliverables Summary */}
      {contract.deliverables_summary && (
        <div className="p-6 border-b border-[var(--border-color)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            Deliverables
          </h3>
          <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line">
            {contract.deliverables_summary}
          </p>
        </div>
      )}

      {/* Compensation Terms */}
      {contract.compensation_terms && (
        <div className="p-6 border-b border-[var(--border-color)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            Compensation Terms
          </h3>
          <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line">
            {contract.compensation_terms}
          </p>
        </div>
      )}

      {/* Contract Clauses */}
      {contract.clauses && contract.clauses.length > 0 && (
        <div className="p-6 border-b border-[var(--border-color)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Contract Terms
          </h3>
          <div className="space-y-2">
            {visibleClauses?.map((clause, index) => (
              <div
                key={index}
                className="border border-[var(--border-color)] rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleClause(index)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--bg-secondary)] transition-colors"
                  aria-expanded={expandedClauses.has(index)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {clause.title}
                    </span>
                    {clause.is_required && (
                      <span className="text-xs text-[var(--warning-600)] bg-[var(--warning-100)] px-1.5 py-0.5 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  {expandedClauses.has(index) ? (
                    <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                  )}
                </button>
                {expandedClauses.has(index) && (
                  <div className="px-4 pb-4 text-sm text-[var(--text-secondary)]">
                    {clause.content}
                  </div>
                )}
              </div>
            ))}
          </div>

          {contract.clauses.length > 3 && (
            <button
              onClick={() => setShowAllClauses(!showAllClauses)}
              className="mt-4 text-sm text-[var(--color-primary)] hover:underline flex items-center gap-1"
            >
              {showAllClauses ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show all {contract.clauses.length} clauses
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Custom Terms */}
      {contract.custom_terms && (
        <div className="p-6 border-b border-[var(--border-color)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            Additional Terms
          </h3>
          <div className="prose prose-sm max-w-none text-[var(--text-secondary)]">
            <p className="whitespace-pre-line">{contract.custom_terms}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download PDF
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {userCanSign && onDecline && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDecline(userPartyType)}
              disabled={isLoading}
              className="text-[var(--color-error)] hover:bg-[var(--error-100)]"
            >
              Decline
            </Button>
          )}

          {userCanSign && onSign && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onSign(userPartyType)}
              disabled={isLoading}
              className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PenTool className="w-4 h-4" />
              )}
              Sign Contract
            </Button>
          )}

          {!userCanSign && contract.status === 'draft' && userRole === 'brand' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onSign?.(userPartyType)}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              Send for Signature
            </Button>
          )}
        </div>
      </div>

      {/* Void Reason (if applicable) */}
      {contract.status === 'voided' && contract.void_reason && (
        <div className="px-6 pb-6">
          <div className="p-4 bg-[var(--error-100)] rounded-lg border border-[var(--color-error)]">
            <div className="flex items-start gap-2">
              <XCircle className="w-5 h-5 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[var(--color-error)]">Contract Voided</p>
                <p className="text-sm text-[var(--error-600)] mt-1">{contract.void_reason}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContractViewer;
