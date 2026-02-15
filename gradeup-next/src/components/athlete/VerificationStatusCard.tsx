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
import {
  CheckCircle2,
  Clock,
  XCircle,
  GraduationCap,
  Trophy,
  FileText,
  User,
  BarChart3,
  Send,
  Loader2,
} from 'lucide-react';
import { useVerificationRequests, getVerificationLabel } from '@/lib/hooks/use-verification-requests';
import type { VerificationType } from '@/lib/services/verification';
import { VerificationRequestModal } from './VerificationRequestModal';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface VerificationStatusCardProps {
  athleteId: string;
  className?: string;
}

interface VerificationItemProps {
  type: VerificationType;
  label: string;
  icon: React.ReactNode;
  isVerified: boolean;
  isPending: boolean;
  canRequest: boolean;
  onRequestClick: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Components
// ═══════════════════════════════════════════════════════════════════════════

function VerificationItem({
  type,
  label,
  icon,
  isVerified,
  isPending,
  canRequest,
  onRequestClick,
}: VerificationItemProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          isVerified
            ? "bg-green-500/10 text-green-500"
            : isPending
            ? "bg-yellow-500/10 text-yellow-500"
            : "bg-muted text-muted-foreground"
        )}>
          {icon}
        </div>
        <div>
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-muted-foreground">
            {isVerified
              ? 'Verified by Athletic Director'
              : isPending
              ? 'Pending review'
              : 'Not verified'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isVerified ? (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        ) : isPending ? (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        ) : canRequest ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onRequestClick}
            className="gap-1"
          >
            <Send className="h-3 w-3" />
            Request
          </Button>
        ) : (
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            <XCircle className="h-3 w-3 mr-1" />
            Not Verified
          </Badge>
        )}
      </div>
    </div>
  );
}

export function VerificationStatusCard({ athleteId, className }: VerificationStatusCardProps) {
  const { status, loading, canRequestVerification, submitRequest } = useVerificationRequests(athleteId);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<VerificationType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleRequestClick = (type: VerificationType) => {
    setSelectedType(type);
    setModalOpen(true);
  };

  const handleSubmitRequest = async (notes?: string): Promise<{ success: boolean; error?: string }> => {
    if (!selectedType) return { success: false, error: 'No verification type selected' };

    setSubmitting(true);
    const result = await submitRequest(selectedType, notes);
    setSubmitting(false);

    if (result.success) {
      setModalOpen(false);
      setSelectedType(null);
    }

    return result;
  };

  const verificationTypes: { type: VerificationType; label: string; icon: React.ReactNode }[] = [
    { type: 'enrollment', label: 'Enrollment', icon: <GraduationCap className="h-4 w-4" /> },
    { type: 'grades', label: 'Grades / GPA', icon: <FileText className="h-4 w-4" /> },
    { type: 'sport', label: 'Sport Participation', icon: <Trophy className="h-4 w-4" /> },
    { type: 'stats', label: 'Athletic Stats', icon: <BarChart3 className="h-4 w-4" /> },
  ];

  const isPending = (type: VerificationType) => {
    return status?.pending_requests.some(
      req => req.type === type && (req.status === 'pending' || req.status === 'in_review')
    ) ?? false;
  };

  const isVerified = (type: VerificationType): boolean => {
    if (!status) return false;
    const map: Record<VerificationType, boolean> = {
      enrollment: status.enrollment_verified,
      sport: status.sport_verified,
      grades: status.grades_verified,
      identity: status.identity_verified,
      stats: status.stats_verified,
      ncaa_eligibility: false,
    };
    return map[type] ?? false;
  };

  const verifiedCount = verificationTypes.filter(v => isVerified(v.type)).length;
  const totalCount = verificationTypes.length;

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
              <CardTitle className="text-lg">Verification Status</CardTitle>
              <CardDescription>
                Get verified by your Athletic Director to unlock more opportunities
              </CardDescription>
            </div>
            <Badge variant={verifiedCount === totalCount ? "success" : "outline"}>
              {verifiedCount}/{totalCount} Verified
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {verificationTypes.map(({ type, label, icon }) => (
              <VerificationItem
                key={type}
                type={type}
                label={label}
                icon={icon}
                isVerified={isVerified(type)}
                isPending={isPending(type)}
                canRequest={canRequestVerification(type)}
                onRequestClick={() => handleRequestClick(type)}
              />
            ))}
          </div>

          {verifiedCount < totalCount && (
            <div className="mt-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <p className="text-sm text-blue-400">
                <strong>Tip:</strong> Verified athletes get 3x more brand opportunities.
                Request verification from your Athletic Director today!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <VerificationRequestModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        type={selectedType}
        onSubmit={handleSubmitRequest}
        submitting={submitting}
      />
    </>
  );
}
