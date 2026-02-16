'use client';

import { useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Trophy,
  DollarSign,
  Calendar,
  Shield,
  AlertTriangle,
  Ban,
  Trash2,
  RotateCcw,
  Instagram,
  Twitter,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA - Athlete Detail
// ═══════════════════════════════════════════════════════════════════════════

// Mock athlete data - in production this would come from API
const mockAthleteData = {
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

// Deal history
interface Deal extends Record<string, unknown> {
  id: string;
  brand: string;
  type: string;
  amount: number;
  status: 'active' | 'completed' | 'pending' | 'cancelled';
  startDate: string;
  endDate: string | null;
}

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

// Compliance audit log
interface AuditEntry extends Record<string, unknown> {
  id: string;
  action: string;
  performedBy: string;
  details: string;
  createdAt: string;
  type: 'verification' | 'compliance' | 'admin' | 'deal' | 'warning';
}

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
// TABLE COLUMNS
// ═══════════════════════════════════════════════════════════════════════════

const dealColumns: DataTableColumn<Deal>[] = [
  {
    key: 'brand',
    header: 'Brand',
    render: (_, row) => (
      <span className="font-medium text-[var(--text-primary)]">{row.brand}</span>
    ),
  },
  {
    key: 'type',
    header: 'Type',
    render: (_, row) => (
      <span className="text-[var(--text-secondary)]">{row.type}</span>
    ),
  },
  {
    key: 'amount',
    header: 'Amount',
    render: (_, row) => (
      <span className="font-semibold text-[var(--color-success)]">
        {formatCurrency(row.amount)}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (_, row) => {
      const variants: Record<Deal['status'], 'success' | 'warning' | 'primary' | 'error'> = {
        active: 'success',
        completed: 'primary',
        pending: 'warning',
        cancelled: 'error',
      };
      return (
        <Badge variant={variants[row.status]} size="sm">
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </Badge>
      );
    },
  },
  {
    key: 'startDate',
    header: 'Start Date',
    render: (_, row) => (
      <span className="text-[var(--text-muted)]">{formatDate(row.startDate)}</span>
    ),
  },
  {
    key: 'endDate',
    header: 'End Date',
    render: (_, row) => (
      <span className="text-[var(--text-muted)]">
        {row.endDate ? formatDate(row.endDate) : '-'}
      </span>
    ),
  },
];

const auditColumns: DataTableColumn<AuditEntry>[] = [
  {
    key: 'createdAt',
    header: 'Timestamp',
    render: (_, row) => (
      <span className="text-[var(--text-muted)] text-xs">
        {formatDateTime(row.createdAt)}
      </span>
    ),
  },
  {
    key: 'action',
    header: 'Action',
    render: (_, row) => {
      const icons: Record<AuditEntry['type'], ReactNode> = {
        verification: <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />,
        compliance: <Shield className="h-4 w-4 text-[var(--color-primary)]" />,
        admin: <Clock className="h-4 w-4 text-[var(--text-muted)]" />,
        deal: <DollarSign className="h-4 w-4 text-[var(--color-success)]" />,
        warning: <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />,
      };
      return (
        <div className="flex items-center gap-2">
          {icons[row.type]}
          <span className="font-medium text-[var(--text-primary)]">{row.action}</span>
        </div>
      );
    },
  },
  {
    key: 'performedBy',
    header: 'Performed By',
    render: (_, row) => (
      <span className="text-[var(--text-secondary)]">{row.performedBy}</span>
    ),
  },
  {
    key: 'details',
    header: 'Details',
    render: (_, row) => (
      <span className="text-[var(--text-muted)] text-sm">{row.details}</span>
    ),
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function AthleteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const athleteId = params.athleteId as string;

  // Modal states
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showReinstateModal, setShowReinstateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Individual verification modal states
  const [showVerifyEnrollmentModal, setShowVerifyEnrollmentModal] = useState(false);
  const [showVerifyGradesModal, setShowVerifyGradesModal] = useState(false);
  const [showVerifyStatsModal, setShowVerifyStatsModal] = useState(false);
  const [showRevokeEnrollmentModal, setShowRevokeEnrollmentModal] = useState(false);
  const [showRevokeGradesModal, setShowRevokeGradesModal] = useState(false);
  const [showRevokeStatsModal, setShowRevokeStatsModal] = useState(false);

  // Verification notes state
  const [verificationNotes, setVerificationNotes] = useState('');

  // Get athlete data (mock)
  const athlete = mockAthleteData[athleteId as keyof typeof mockAthleteData];

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

  // Admin action handlers
  const handleVerify = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setShowVerifyModal(false);
  };

  const handleSuspend = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setShowSuspendModal(false);
  };

  const handleReinstate = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setShowReinstateModal(false);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setShowDeleteModal(false);
    router.push('/director/athletes');
  };

  // Individual verification handlers
  const handleVerifyEnrollment = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // In production, this would update the database
    setIsLoading(false);
    setShowVerifyEnrollmentModal(false);
    setVerificationNotes('');
  };

  const handleVerifyGrades = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setShowVerifyGradesModal(false);
    setVerificationNotes('');
  };

  const handleVerifyStats = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setShowVerifyStatsModal(false);
    setVerificationNotes('');
  };

  const handleRevokeEnrollment = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setShowRevokeEnrollmentModal(false);
    setVerificationNotes('');
  };

  const handleRevokeGrades = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setShowRevokeGradesModal(false);
    setVerificationNotes('');
  };

  const handleRevokeStats = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setShowRevokeStatsModal(false);
    setVerificationNotes('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Navigation */}
      <Button variant="ghost" onClick={() => router.push('/director/athletes')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Athletes
      </Button>

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Profile Card */}
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar and Status */}
              <div className="flex flex-col items-center gap-3">
                <Avatar fallback={athlete.name.charAt(0)} size="xl" />
                <div className="flex flex-col items-center gap-2">
                  {athlete.verified && (
                    <Badge variant="success" size="sm">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  {athlete.status === 'flagged' && (
                    <Badge variant="warning" size="sm">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Flagged
                    </Badge>
                  )}
                  {athlete.status === 'suspended' && (
                    <Badge variant="error" size="sm">
                      <Ban className="h-3 w-3 mr-1" />
                      Suspended
                    </Badge>
                  )}
                </div>
              </div>

              {/* Basic Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                    {athlete.name}
                  </h1>
                  <p className="text-[var(--text-muted)]">
                    {athlete.sport} - {athlete.position}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-[var(--text-muted)]" />
                    <span className="text-[var(--text-secondary)]">{athlete.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-[var(--text-muted)]" />
                    <span className="text-[var(--text-secondary)]">{athlete.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-[var(--text-muted)]" />
                    <span className="text-[var(--text-secondary)]">{athlete.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                    <span className="text-[var(--text-secondary)]">
                      Joined {formatDate(athlete.joinedAt)}
                    </span>
                  </div>
                </div>

                {/* Social Media */}
                <div className="flex items-center gap-4 pt-2">
                  {athlete.socialMedia.instagram && (
                    <a
                      href={`https://instagram.com/${athlete.socialMedia.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
                    >
                      <Instagram className="h-4 w-4" />
                      {athlete.socialMedia.instagram}
                    </a>
                  )}
                  {athlete.socialMedia.twitter && (
                    <a
                      href={`https://twitter.com/${athlete.socialMedia.twitter.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
                    >
                      <Twitter className="h-4 w-4" />
                      {athlete.socialMedia.twitter}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 lg:w-80">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <GraduationCap className="h-6 w-6 mx-auto mb-2 text-[var(--gpa-gold)]" />
              <p className="text-2xl font-bold text-[var(--gpa-gold)]">
                {athlete.gpa.toFixed(2)}
              </p>
              <p className="text-xs text-[var(--text-muted)]">GPA</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Trophy className="h-6 w-6 mx-auto mb-2 text-[var(--color-primary)]" />
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {athlete.year}
              </p>
              <p className="text-xs text-[var(--text-muted)]">{athlete.major}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <DollarSign className="h-6 w-6 mx-auto mb-2 text-[var(--color-success)]" />
              <p className="text-2xl font-bold text-[var(--color-success)]">
                {formatCurrency(athlete.totalEarnings)}
              </p>
              <p className="text-xs text-[var(--text-muted)]">Total Earnings</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-[var(--color-primary)]" />
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {athlete.activeDeals + athlete.completedDeals}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {athlete.activeDeals} Active / {athlete.completedDeals} Completed
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Verification Status - Interactive Controls */}
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
            <div className="flex items-center justify-between p-4 rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
              <div className="flex items-center gap-4">
                {athlete.enrollmentVerified ? (
                  <div className="h-10 w-10 rounded-full bg-[var(--color-success)]/20 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-[var(--color-success)]" />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-[var(--color-warning)]/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-[var(--color-warning)]" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Enrollment Verification</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    Confirms student is actively enrolled at the institution
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {athlete.enrollmentVerified ? (
                  <>
                    <Badge variant="success" size="sm">Verified</Badge>
                    <Button variant="ghost" size="sm" onClick={() => setShowRevokeEnrollmentModal(true)}>
                      <XCircle className="h-4 w-4 mr-1" />
                      Revoke
                    </Button>
                  </>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => setShowVerifyEnrollmentModal(true)}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Verify Enrollment
                  </Button>
                )}
              </div>
            </div>

            {/* Grades Verification */}
            <div className="flex items-center justify-between p-4 rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
              <div className="flex items-center gap-4">
                {athlete.gradesVerified ? (
                  <div className="h-10 w-10 rounded-full bg-[var(--color-success)]/20 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-[var(--color-success)]" />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-[var(--color-warning)]/20 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-[var(--color-warning)]" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Academic Standing (Grades)</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    Current GPA: <span className="font-semibold text-[var(--gpa-gold)]">{athlete.gpa.toFixed(2)}</span> — Verifies academic eligibility
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {athlete.gradesVerified ? (
                  <>
                    <Badge variant="success" size="sm">Verified</Badge>
                    <Button variant="ghost" size="sm" onClick={() => setShowRevokeGradesModal(true)}>
                      <XCircle className="h-4 w-4 mr-1" />
                      Revoke
                    </Button>
                  </>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => setShowVerifyGradesModal(true)}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Verify Grades
                  </Button>
                )}
              </div>
            </div>

            {/* Sport/Stats Verification */}
            <div className="flex items-center justify-between p-4 rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
              <div className="flex items-center gap-4">
                {athlete.sportVerified ? (
                  <div className="h-10 w-10 rounded-full bg-[var(--color-success)]/20 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-[var(--color-success)]" />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-[var(--color-warning)]/20 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-[var(--color-warning)]" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Sport Eligibility & Stats</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {athlete.sport} — {athlete.position} — Verifies roster status and athletic data
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {athlete.sportVerified ? (
                  <>
                    <Badge variant="success" size="sm">Verified</Badge>
                    <Button variant="ghost" size="sm" onClick={() => setShowRevokeStatsModal(true)}>
                      <XCircle className="h-4 w-4 mr-1" />
                      Revoke
                    </Button>
                  </>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => setShowVerifyStatsModal(true)}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Verify Stats
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
              <p className="text-sm text-[var(--text-muted)]">
                {athlete.enrollmentVerified && athlete.gradesVerified && athlete.sportVerified
                  ? 'All verifications complete'
                  : `${[!athlete.enrollmentVerified, !athlete.gradesVerified, !athlete.sportVerified].filter(Boolean).length} verification(s) pending`}
              </p>
              {!athlete.verified && athlete.enrollmentVerified && athlete.gradesVerified && athlete.sportVerified && (
                <Button variant="primary" onClick={() => setShowVerifyModal(true)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Full Verification
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Actions */}
      <Card className="border-l-4 border-l-[var(--color-primary)]">
        <CardHeader>
          <CardTitle>Admin Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {!athlete.verified && (
              <Button variant="primary" onClick={() => setShowVerifyModal(true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify Athlete
              </Button>
            )}
            {athlete.status !== 'suspended' && (
              <Button variant="outline" onClick={() => setShowSuspendModal(true)}>
                <Ban className="h-4 w-4 mr-2" />
                Suspend Account
              </Button>
            )}
            {athlete.status === 'suspended' && (
              <Button variant="primary" onClick={() => setShowReinstateModal(true)}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reinstate Account
              </Button>
            )}
            <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deal History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Deal History</CardTitle>
            <Badge variant="outline">{mockDeals.length} Deals</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={dealColumns}
            data={mockDeals}
            keyExtractor={(row) => row.id}
          />
        </CardContent>
      </Card>

      {/* Compliance Audit Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[var(--color-primary)]" />
              <CardTitle>Compliance Audit Log</CardTitle>
            </div>
            <Badge variant="outline">{mockAuditLog.length} Entries</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={auditColumns}
            data={mockAuditLog}
            keyExtractor={(row) => row.id}
          />
        </CardContent>
      </Card>

      {/* Verify Modal */}
      <Modal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        title="Verify Athlete"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowVerifyModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleVerify} isLoading={isLoading}>
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
        isOpen={showSuspendModal}
        onClose={() => setShowSuspendModal(false)}
        title="Suspend Account"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowSuspendModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleSuspend} isLoading={isLoading}>
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
        isOpen={showReinstateModal}
        onClose={() => setShowReinstateModal(false)}
        title="Reinstate Account"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowReinstateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleReinstate} isLoading={isLoading}>
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
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} isLoading={isLoading}>
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

      {/* Verify Enrollment Modal */}
      <Modal
        isOpen={showVerifyEnrollmentModal}
        onClose={() => { setShowVerifyEnrollmentModal(false); setVerificationNotes(''); }}
        title="Verify Enrollment"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowVerifyEnrollmentModal(false); setVerificationNotes(''); }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleVerifyEnrollment} isLoading={isLoading}>
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
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Verification Notes (Optional)
            </label>
            <textarea
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              placeholder="Add any notes about this verification..."
              className="w-full h-20 px-3 py-2 text-sm rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>
      </Modal>

      {/* Verify Grades Modal */}
      <Modal
        isOpen={showVerifyGradesModal}
        onClose={() => { setShowVerifyGradesModal(false); setVerificationNotes(''); }}
        title="Verify Academic Standing"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowVerifyGradesModal(false); setVerificationNotes(''); }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleVerifyGrades} isLoading={isLoading}>
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
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Verification Notes (Optional)
            </label>
            <textarea
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              placeholder="Add any notes about transcript review, academic standing, etc..."
              className="w-full h-20 px-3 py-2 text-sm rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>
      </Modal>

      {/* Verify Stats Modal */}
      <Modal
        isOpen={showVerifyStatsModal}
        onClose={() => { setShowVerifyStatsModal(false); setVerificationNotes(''); }}
        title="Verify Sport Eligibility & Stats"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowVerifyStatsModal(false); setVerificationNotes(''); }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleVerifyStats} isLoading={isLoading}>
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
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Verification Notes (Optional)
            </label>
            <textarea
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              placeholder="Add any notes about roster verification, stats accuracy, etc..."
              className="w-full h-20 px-3 py-2 text-sm rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>
      </Modal>

      {/* Revoke Enrollment Modal */}
      <Modal
        isOpen={showRevokeEnrollmentModal}
        onClose={() => { setShowRevokeEnrollmentModal(false); setVerificationNotes(''); }}
        title="Revoke Enrollment Verification"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowRevokeEnrollmentModal(false); setVerificationNotes(''); }}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRevokeEnrollment} isLoading={isLoading}>
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
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Reason for Revocation <span className="text-[var(--color-error)]">*</span>
            </label>
            <textarea
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              placeholder="Explain why enrollment verification is being revoked..."
              className="w-full h-20 px-3 py-2 text-sm rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              required
            />
          </div>
        </div>
      </Modal>

      {/* Revoke Grades Modal */}
      <Modal
        isOpen={showRevokeGradesModal}
        onClose={() => { setShowRevokeGradesModal(false); setVerificationNotes(''); }}
        title="Revoke Academic Verification"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowRevokeGradesModal(false); setVerificationNotes(''); }}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRevokeGrades} isLoading={isLoading}>
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
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Reason for Revocation <span className="text-[var(--color-error)]">*</span>
            </label>
            <textarea
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              placeholder="Explain why academic verification is being revoked..."
              className="w-full h-20 px-3 py-2 text-sm rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              required
            />
          </div>
        </div>
      </Modal>

      {/* Revoke Stats Modal */}
      <Modal
        isOpen={showRevokeStatsModal}
        onClose={() => { setShowRevokeStatsModal(false); setVerificationNotes(''); }}
        title="Revoke Sport Verification"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowRevokeStatsModal(false); setVerificationNotes(''); }}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRevokeStats} isLoading={isLoading}>
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
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Reason for Revocation <span className="text-[var(--color-error)]">*</span>
            </label>
            <textarea
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              placeholder="Explain why sport verification is being revoked..."
              className="w-full h-20 px-3 py-2 text-sm rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              required
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
