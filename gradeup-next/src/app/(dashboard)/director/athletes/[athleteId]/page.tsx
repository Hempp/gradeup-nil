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
  ExternalLink,
  Instagram,
  Twitter,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';
import { formatCurrency, formatDate, formatDateTime, formatRelativeTime } from '@/lib/utils';

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

      {/* Verification Status */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
              {athlete.enrollmentVerified ? (
                <CheckCircle className="h-5 w-5 text-[var(--color-success)]" />
              ) : (
                <XCircle className="h-5 w-5 text-[var(--color-error)]" />
              )}
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Enrollment
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {athlete.enrollmentVerified ? 'Verified' : 'Pending'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
              {athlete.sportVerified ? (
                <CheckCircle className="h-5 w-5 text-[var(--color-success)]" />
              ) : (
                <XCircle className="h-5 w-5 text-[var(--color-error)]" />
              )}
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Sport Eligibility
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {athlete.sportVerified ? 'Verified' : 'Pending'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
              {athlete.gradesVerified ? (
                <CheckCircle className="h-5 w-5 text-[var(--color-success)]" />
              ) : (
                <XCircle className="h-5 w-5 text-[var(--color-error)]" />
              )}
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Academic Standing
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {athlete.gradesVerified ? 'Verified' : 'Pending'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
              {athlete.verified ? (
                <CheckCircle className="h-5 w-5 text-[var(--color-success)]" />
              ) : (
                <Clock className="h-5 w-5 text-[var(--color-warning)]" />
              )}
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Overall Status
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {athlete.verified ? 'Fully Verified' : 'In Progress'}
                </p>
              </div>
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
    </div>
  );
}
