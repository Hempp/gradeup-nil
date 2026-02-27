'use client';

import {
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  GraduationCap,
  Trophy,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AthleteData, VerificationType } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface AthleteVerificationProps {
  athlete: AthleteData;
  onVerify: (type: VerificationType) => void;
  onRevoke: (type: VerificationType) => void;
  onCompleteFullVerification: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Verification Item Component
// ═══════════════════════════════════════════════════════════════════════════

interface VerificationItemProps {
  isVerified: boolean;
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  onVerify: () => void;
  onRevoke: () => void;
  verifyLabel: string;
}

function VerificationItem({
  isVerified,
  icon,
  title,
  description,
  onVerify,
  onRevoke,
  verifyLabel,
}: VerificationItemProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
      <div className="flex items-center gap-4">
        <div
          className={`h-10 w-10 rounded-full flex items-center justify-center ${
            isVerified
              ? 'bg-[var(--color-success)]/20'
              : 'bg-[var(--color-warning)]/20'
          }`}
        >
          {icon}
        </div>
        <div>
          <p className="font-medium text-[var(--text-primary)]">{title}</p>
          <p className="text-sm text-[var(--text-muted)]">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isVerified ? (
          <>
            <Badge variant="success" size="sm">
              Verified
            </Badge>
            <Button variant="ghost" size="sm" onClick={onRevoke}>
              <XCircle className="h-4 w-4 mr-1" />
              Revoke
            </Button>
          </>
        ) : (
          <Button variant="primary" size="sm" onClick={onVerify}>
            <CheckCircle className="h-4 w-4 mr-1" />
            {verifyLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function AthleteVerification({
  athlete,
  onVerify,
  onRevoke,
  onCompleteFullVerification,
}: AthleteVerificationProps) {
  const pendingCount = [
    !athlete.enrollmentVerified,
    !athlete.gradesVerified,
    !athlete.sportVerified,
  ].filter(Boolean).length;

  const allVerificationsComplete =
    athlete.enrollmentVerified && athlete.gradesVerified && athlete.sportVerified;

  return (
    <Card className="border-l-4 border-l-[var(--color-success)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[var(--color-success)]" />
            <CardTitle>Verification Management</CardTitle>
          </div>
          <Badge variant={athlete.verified ? 'success' : 'warning'}>
            {athlete.verified ? 'Fully Verified' : 'Pending Verification'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Enrollment Verification */}
          <VerificationItem
            isVerified={athlete.enrollmentVerified}
            icon={
              athlete.enrollmentVerified ? (
                <CheckCircle className="h-5 w-5 text-[var(--color-success)]" />
              ) : (
                <Clock className="h-5 w-5 text-[var(--color-warning)]" />
              )
            }
            title="Enrollment Verification"
            description="Confirms student is actively enrolled at the institution"
            onVerify={() => onVerify('enrollment')}
            onRevoke={() => onRevoke('enrollment')}
            verifyLabel="Verify Enrollment"
          />

          {/* Grades Verification */}
          <VerificationItem
            isVerified={athlete.gradesVerified}
            icon={
              <GraduationCap
                className={`h-5 w-5 ${
                  athlete.gradesVerified
                    ? 'text-[var(--color-success)]'
                    : 'text-[var(--color-warning)]'
                }`}
              />
            }
            title="Academic Standing (Grades)"
            description={
              <>
                Current GPA:{' '}
                <span className="font-semibold text-[var(--gpa-gold)]">
                  {athlete.gpa.toFixed(2)}
                </span>{' '}
                — Verifies academic eligibility
              </>
            }
            onVerify={() => onVerify('grades')}
            onRevoke={() => onRevoke('grades')}
            verifyLabel="Verify Grades"
          />

          {/* Sport/Stats Verification */}
          <VerificationItem
            isVerified={athlete.sportVerified}
            icon={
              <Trophy
                className={`h-5 w-5 ${
                  athlete.sportVerified
                    ? 'text-[var(--color-success)]'
                    : 'text-[var(--color-warning)]'
                }`}
              />
            }
            title="Sport Eligibility & Stats"
            description={`${athlete.sport} — ${athlete.position} — Verifies roster status and athletic data`}
            onVerify={() => onVerify('stats')}
            onRevoke={() => onRevoke('stats')}
            verifyLabel="Verify Stats"
          />

          {/* Quick Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
            <p className="text-sm text-[var(--text-muted)]">
              {allVerificationsComplete
                ? 'All verifications complete'
                : `${pendingCount} verification(s) pending`}
            </p>
            {!athlete.verified && allVerificationsComplete && (
              <Button variant="primary" onClick={onCompleteFullVerification}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Full Verification
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
