'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToastActions } from '@/components/ui/toast';

// Import refactored components
import {
  AthleteHeader,
  AthleteStats,
  AthleteVerification,
  AthleteAdminActions,
  AthleteDeals,
  AthleteAuditLog,
  AthleteModals,
  type AthleteData,
  type Deal,
  type AuditEntry,
  type VerificationType,
  type VerificationModalState,
  type AdminModalState,
} from '@/components/director/athlete-detail';

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════

const mockAthleteData: Record<string, AthleteData> = {
  '1': {
    id: '1',
    name: 'Marcus Johnson',
    email: 'marcus.johnson@duke.edu',
    phone: '+1 (919) 555-0142',
    location: 'Durham, NC',
    sport: 'Basketball',
    position: 'Point Guard',
    year: 'Junior',
    major: 'Business Administration',
    gpa: 3.87,
    followers: 125000,
    totalEarnings: 45250,
    activeDeals: 3,
    completedDeals: 5,
    verified: true,
    enrollmentVerified: true,
    sportVerified: true,
    gradesVerified: true,
    status: 'active',
    joinedAt: '2024-08-15T10:00:00Z',
    lastActive: '2026-02-11T09:30:00Z',
    profileImage: null,
    socialMedia: {
      instagram: '@marcusjohnson',
      twitter: '@mjhoops',
    },
  },
  '3': {
    id: '3',
    name: 'Jordan Davis',
    email: 'jordan.davis@duke.edu',
    phone: '+1 (919) 555-0198',
    location: 'Durham, NC',
    sport: 'Football',
    position: 'Wide Receiver',
    year: 'Junior',
    major: 'Sports Management',
    gpa: 3.65,
    followers: 85000,
    totalEarnings: 52100,
    activeDeals: 2,
    completedDeals: 5,
    verified: true,
    enrollmentVerified: true,
    sportVerified: true,
    gradesVerified: true,
    status: 'flagged',
    joinedAt: '2024-09-01T10:00:00Z',
    lastActive: '2026-02-10T14:00:00Z',
    profileImage: null,
    socialMedia: {
      instagram: '@jdavis_football',
      twitter: '@jdavis22',
    },
  },
};

const mockDeals: Deal[] = [
  {
    id: '1',
    brand: 'Nike',
    type: 'Social Media Campaign',
    amount: 5000,
    status: 'active',
    startDate: '2026-01-15',
    endDate: '2026-03-15',
  },
  {
    id: '2',
    brand: 'Gatorade',
    type: 'Product Endorsement',
    amount: 12500,
    status: 'active',
    startDate: '2025-11-01',
    endDate: '2026-04-30',
  },
  {
    id: '3',
    brand: 'Foot Locker',
    type: 'In-Store Appearance',
    amount: 2500,
    status: 'completed',
    startDate: '2025-12-10',
    endDate: '2025-12-10',
  },
  {
    id: '4',
    brand: 'Local Car Dealership',
    type: 'Social Media Post',
    amount: 1500,
    status: 'completed',
    startDate: '2025-10-05',
    endDate: '2025-10-15',
  },
  {
    id: '5',
    brand: 'Sports Memorabilia Inc',
    type: 'Autograph Session',
    amount: 3000,
    status: 'completed',
    startDate: '2025-09-20',
    endDate: '2025-09-20',
  },
];

const mockAuditLog: AuditEntry[] = [
  {
    id: '1',
    action: 'Compliance flag raised',
    performedBy: 'System',
    details: 'Contract with Nike exceeds NCAA compensation guidelines',
    createdAt: '2026-02-10T16:45:00Z',
    type: 'warning',
  },
  {
    id: '2',
    action: 'Deal approved',
    performedBy: 'John Smith (AD)',
    details: 'Gatorade endorsement deal approved',
    createdAt: '2025-10-28T14:00:00Z',
    type: 'deal',
  },
  {
    id: '3',
    action: 'Grades verified',
    performedBy: 'Registrar System',
    details: 'GPA verification completed: 3.87',
    createdAt: '2025-09-05T10:00:00Z',
    type: 'verification',
  },
  {
    id: '4',
    action: 'Sport eligibility verified',
    performedBy: 'Athletics Dept',
    details: 'Basketball team roster confirmed',
    createdAt: '2025-08-20T09:00:00Z',
    type: 'verification',
  },
  {
    id: '5',
    action: 'Account created',
    performedBy: 'System',
    details: 'Athlete registration completed',
    createdAt: '2024-08-15T10:00:00Z',
    type: 'admin',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function AthleteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const athleteId = params.athleteId as string;
  const toast = useToastActions();

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Verification notes state
  const [verificationNotes, setVerificationNotes] = useState('');

  // GPA update state — defaults are set once athlete data is loaded (see below)
  const [gpaInput, setGpaInput] = useState('');
  const [displayedGpa, setDisplayedGpa] = useState<number | null>(null);
  const [gpaLoading, setGpaLoading] = useState(false);

  // Admin modal states
  const [adminModals, setAdminModalsState] = useState<AdminModalState>({
    verify: false,
    suspend: false,
    reinstate: false,
    delete: false,
  });

  // Verification modal states
  const [verificationModals, setVerificationModalsState] = useState<VerificationModalState>({
    enrollment: false,
    grades: false,
    stats: false,
    revokeEnrollment: false,
    revokeGrades: false,
    revokeStats: false,
  });

  // Helper to update admin modal state
  const setAdminModals = useCallback((update: Partial<AdminModalState>) => {
    setAdminModalsState((prev) => ({ ...prev, ...update }));
  }, []);

  // Helper to update verification modal state
  const setVerificationModals = useCallback((update: Partial<VerificationModalState>) => {
    setVerificationModalsState((prev) => ({ ...prev, ...update }));
  }, []);

  // Get athlete data (mock)
  const athlete = mockAthleteData[athleteId];

  // Seed GPA inputs once the athlete is known
  useEffect(() => {
    if (athlete) {
      setGpaInput(athlete.gpa.toFixed(2));
      setDisplayedGpa(athlete.gpa);
    }
  }, [athlete]);

  const handleUpdateGpa = async () => {
    const parsed = parseFloat(gpaInput);
    if (isNaN(parsed) || parsed < 0 || parsed > 4.0) {
      toast.error('Invalid GPA', 'GPA must be between 0.0 and 4.0.');
      return;
    }
    setGpaLoading(true);
    try {
      const res = await fetch(`/api/director/athletes/${athleteId}/grades`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gpa: parsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to update GPA');
      setDisplayedGpa(data.updated.gpa);
      toast.success('GPA updated', `GPA set to ${data.updated.gpa.toFixed(2)} and grades verified.`);
    } catch (err) {
      toast.error('GPA update failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setGpaLoading(false);
    }
  };

  // Handle case where athlete is not found
  if (!athlete) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          Athlete Not Found
        </h2>
        <p className="text-[var(--text-muted)] mb-4">
          The athlete you are looking for does not exist.
        </p>
        <Button variant="outline" onClick={() => router.push('/director/athletes')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Athletes
        </Button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTION HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleVerify = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setAdminModals({ verify: false });
  };

  const handleSuspend = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setAdminModals({ suspend: false });
  };

  const handleReinstate = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setAdminModals({ reinstate: false });
  };

  const handleDelete = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setAdminModals({ delete: false });
    router.push('/director/athletes');
  };

  const handleVerifyType = async (type: VerificationType) => {
    setIsLoading(true);
    try {
      // Map 'stats' modal type to 'sport' DB flag (column is sport_verified)
      const flag = type === 'stats' ? 'sport' : type;
      const res = await fetch(`/api/director/athletes/${athleteId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag, value: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to verify');
      toast.success('Verification updated', `${type} verified successfully.`);
    } catch (err) {
      toast.error('Update failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
      setVerificationModals({ [type]: false });
      setVerificationNotes('');
    }
  };

  const handleRevokeType = async (type: VerificationType) => {
    setIsLoading(true);
    try {
      const flag = type === 'stats' ? 'sport' : type;
      const res = await fetch(`/api/director/athletes/${athleteId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag, value: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to revoke');
      toast.success('Verification revoked', `${type} verification removed.`);
    } catch (err) {
      toast.error('Update failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
      const revokeKey = `revoke${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof VerificationModalState;
      setVerificationModals({ [revokeKey]: false });
      setVerificationNotes('');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // VERIFICATION HANDLERS (for AthleteVerification component)
  // ═══════════════════════════════════════════════════════════════════════════

  const handleOpenVerifyModal = (type: VerificationType) => {
    setVerificationModals({ [type]: true });
  };

  const handleOpenRevokeModal = (type: VerificationType) => {
    const revokeKey = `revoke${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof VerificationModalState;
    setVerificationModals({ [revokeKey]: true });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Navigation */}
      <Button variant="ghost" onClick={() => router.push('/director/athletes')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Athletes
      </Button>

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row gap-6">
        <AthleteHeader athlete={athlete} />
        <AthleteStats athlete={{ ...athlete, gpa: displayedGpa ?? athlete.gpa }} />
      </div>

      {/* Verification Management */}
      <AthleteVerification
        athlete={athlete}
        onVerify={handleOpenVerifyModal}
        onRevoke={handleOpenRevokeModal}
        onCompleteFullVerification={() => setAdminModals({ verify: true })}
      />

      {/* GPA Update (director-only) */}
      <div className="flex items-center gap-3 p-4 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--bg-card)]">
        <label className="text-sm font-medium text-[var(--text-primary)] whitespace-nowrap">
          Update GPA
        </label>
        <Input
          type="number"
          min={0}
          max={4}
          step={0.01}
          value={gpaInput}
          onChange={(e) => setGpaInput(e.target.value)}
          className="w-28"
          aria-label="GPA value"
        />
        <Button
          variant="primary"
          size="sm"
          onClick={handleUpdateGpa}
          isLoading={gpaLoading}
        >
          Save GPA
        </Button>
      </div>

      {/* Admin Actions */}
      <AthleteAdminActions
        athlete={athlete}
        onVerify={() => setAdminModals({ verify: true })}
        onSuspend={() => setAdminModals({ suspend: true })}
        onReinstate={() => setAdminModals({ reinstate: true })}
        onDelete={() => setAdminModals({ delete: true })}
      />

      {/* Deal History */}
      <AthleteDeals deals={mockDeals} />

      {/* Compliance Audit Log */}
      <AthleteAuditLog auditLog={mockAuditLog} />

      {/* All Modals */}
      <AthleteModals
        athlete={athlete}
        adminModals={adminModals}
        setAdminModals={setAdminModals}
        verificationModals={verificationModals}
        setVerificationModals={setVerificationModals}
        isLoading={isLoading}
        verificationNotes={verificationNotes}
        setVerificationNotes={setVerificationNotes}
        onVerify={handleVerify}
        onSuspend={handleSuspend}
        onReinstate={handleReinstate}
        onDelete={handleDelete}
        onVerifyType={handleVerifyType}
        onRevokeType={handleRevokeType}
      />
    </div>
  );
}
