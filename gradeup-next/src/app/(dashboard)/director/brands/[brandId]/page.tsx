'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Building,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Handshake,
  Ban,
  Trash2,
  RotateCcw,
  ExternalLink,
  Briefcase,
  TrendingUp,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';
import { formatCurrency, formatDate, formatDateTime, formatRelativeTime } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA - Brand Detail
// ═══════════════════════════════════════════════════════════════════════════

// Mock brand data - in production this would come from API
const mockBrandData = {
  '1': {
    id: '1',
    name: 'Nike',
    email: 'partnerships@nike.com',
    phone: '+1 (503) 555-9000',
    website: 'https://www.nike.com',
    location: 'Beaverton, OR',
    industry: 'Sports & Athletics',
    description: 'Global leader in athletic footwear, apparel, and equipment. Nike partners with top collegiate athletes to promote their brand and products.',
    logo: null,
    totalSpent: 125000,
    activeDeals: 12,
    completedDeals: 24,
    verified: true,
    status: 'active',
    joinedAt: '2023-06-15T10:00:00Z',
    lastActive: '2026-02-11T09:30:00Z',
    contactPerson: {
      name: 'Jennifer Martinez',
      title: 'Collegiate Partnerships Manager',
      email: 'j.martinez@nike.com',
    },
  },
  '2': {
    id: '2',
    name: 'Gatorade',
    email: 'sponsorships@gatorade.com',
    phone: '+1 (312) 555-4000',
    website: 'https://www.gatorade.com',
    location: 'Chicago, IL',
    industry: 'Beverages',
    description: 'Leading sports hydration brand focused on fueling athletic performance. Gatorade sponsors athletes across all collegiate sports.',
    logo: null,
    totalSpent: 85000,
    activeDeals: 8,
    completedDeals: 18,
    verified: true,
    status: 'active',
    joinedAt: '2023-08-20T10:00:00Z',
    lastActive: '2026-02-10T14:00:00Z',
    contactPerson: {
      name: 'Michael Chen',
      title: 'Sports Marketing Director',
      email: 'm.chen@gatorade.com',
    },
  },
  '4': {
    id: '4',
    name: 'Local Gym Chain',
    email: 'marketing@localgym.com',
    phone: '+1 (919) 555-1234',
    website: 'https://www.localgym.com',
    location: 'Durham, NC',
    industry: 'Fitness',
    description: 'Regional fitness center chain with 15 locations across North Carolina. Looking to partner with local college athletes for promotional campaigns.',
    logo: null,
    totalSpent: 15000,
    activeDeals: 3,
    completedDeals: 5,
    verified: false,
    status: 'pending_verification',
    joinedAt: '2024-01-15T10:00:00Z',
    lastActive: '2026-02-08T11:00:00Z',
    contactPerson: {
      name: 'David Wilson',
      title: 'Marketing Manager',
      email: 'd.wilson@localgym.com',
    },
  },
};

// Campaign history
interface Campaign extends Record<string, unknown> {
  id: string;
  name: string;
  type: string;
  budget: number;
  athleteCount: number;
  status: 'active' | 'completed' | 'planning' | 'cancelled';
  startDate: string;
  endDate: string | null;
}

const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'March Madness Social Push',
    type: 'Social Media Campaign',
    budget: 35000,
    athleteCount: 8,
    status: 'active',
    startDate: '2026-02-01',
    endDate: '2026-04-15',
  },
  {
    id: '2',
    name: 'Back to School 2025',
    type: 'Product Endorsement',
    budget: 25000,
    athleteCount: 5,
    status: 'completed',
    startDate: '2025-08-15',
    endDate: '2025-09-30',
  },
  {
    id: '3',
    name: 'Holiday Collection Launch',
    type: 'Content Creation',
    budget: 18000,
    athleteCount: 4,
    status: 'completed',
    startDate: '2025-11-15',
    endDate: '2025-12-31',
  },
  {
    id: '4',
    name: 'Summer Training Series',
    type: 'Video Content',
    budget: 30000,
    athleteCount: 6,
    status: 'completed',
    startDate: '2025-05-01',
    endDate: '2025-07-31',
  },
  {
    id: '5',
    name: 'Spring Preview 2026',
    type: 'In-Store Appearances',
    budget: 15000,
    athleteCount: 3,
    status: 'planning',
    startDate: '2026-03-15',
    endDate: '2026-04-30',
  },
];

// Associated athletes
interface AssociatedAthlete extends Record<string, unknown> {
  id: string;
  name: string;
  sport: string;
  gpa: number;
  dealValue: number;
  dealStatus: 'active' | 'completed' | 'pending';
  verified: boolean;
}

const mockAssociatedAthletes: AssociatedAthlete[] = [
  {
    id: '1',
    name: 'Marcus Johnson',
    sport: 'Basketball',
    gpa: 3.87,
    dealValue: 5000,
    dealStatus: 'active',
    verified: true,
  },
  {
    id: '2',
    name: 'Sarah Williams',
    sport: 'Soccer',
    gpa: 3.92,
    dealValue: 4500,
    dealStatus: 'active',
    verified: true,
  },
  {
    id: '3',
    name: 'Jordan Davis',
    sport: 'Football',
    gpa: 3.65,
    dealValue: 8000,
    dealStatus: 'pending',
    verified: true,
  },
  {
    id: '4',
    name: 'Emma Chen',
    sport: 'Gymnastics',
    gpa: 3.95,
    dealValue: 3500,
    dealStatus: 'completed',
    verified: false,
  },
  {
    id: '5',
    name: 'Tyler Brooks',
    sport: 'Basketball',
    gpa: 3.72,
    dealValue: 4000,
    dealStatus: 'completed',
    verified: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// TABLE COLUMNS
// ═══════════════════════════════════════════════════════════════════════════

const campaignColumns: DataTableColumn<Campaign>[] = [
  {
    key: 'name',
    header: 'Campaign',
    render: (_, row) => (
      <div>
        <p className="font-medium text-[var(--text-primary)]">{row.name}</p>
        <p className="text-xs text-[var(--text-muted)]">{row.type}</p>
      </div>
    ),
  },
  {
    key: 'budget',
    header: 'Budget',
    render: (_, row) => (
      <span className="font-semibold text-[var(--color-success)]">
        {formatCurrency(row.budget)}
      </span>
    ),
  },
  {
    key: 'athleteCount',
    header: 'Athletes',
    render: (_, row) => (
      <div className="flex items-center gap-1">
        <Users className="h-4 w-4 text-[var(--text-muted)]" />
        <span className="text-[var(--text-secondary)]">{row.athleteCount}</span>
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (_, row) => {
      const variants: Record<Campaign['status'], 'success' | 'warning' | 'primary' | 'error'> = {
        active: 'success',
        completed: 'primary',
        planning: 'warning',
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
    header: 'Duration',
    render: (_, row) => (
      <span className="text-[var(--text-muted)] text-sm">
        {formatDate(row.startDate)} - {row.endDate ? formatDate(row.endDate) : 'Ongoing'}
      </span>
    ),
  },
];

const athleteColumns: DataTableColumn<AssociatedAthlete>[] = [
  {
    key: 'name',
    header: 'Athlete',
    render: (_, row) => (
      <div className="flex items-center gap-2">
        <Avatar fallback={row.name.charAt(0)} size="sm" />
        <div>
          <div className="flex items-center gap-1">
            <p className="font-medium text-[var(--text-primary)]">{row.name}</p>
            {row.verified && (
              <CheckCircle className="h-3 w-3 text-[var(--color-success)]" />
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)]">{row.sport}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'gpa',
    header: 'GPA',
    render: (_, row) => (
      <span className="font-semibold text-[var(--gpa-gold)]">{row.gpa.toFixed(2)}</span>
    ),
  },
  {
    key: 'dealValue',
    header: 'Deal Value',
    render: (_, row) => (
      <span className="font-semibold text-[var(--color-success)]">
        {formatCurrency(row.dealValue)}
      </span>
    ),
  },
  {
    key: 'dealStatus',
    header: 'Status',
    render: (_, row) => {
      const variants: Record<AssociatedAthlete['dealStatus'], 'success' | 'warning' | 'primary'> = {
        active: 'success',
        pending: 'warning',
        completed: 'primary',
      };
      return (
        <Badge variant={variants[row.dealStatus]} size="sm">
          {row.dealStatus.charAt(0).toUpperCase() + row.dealStatus.slice(1)}
        </Badge>
      );
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function BrandDetailPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brandId as string;

  // Modal states
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showReinstateModal, setShowReinstateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get brand data (mock)
  const brand = mockBrandData[brandId as keyof typeof mockBrandData];

  // Handle case where brand is not found
  if (!brand) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          Brand Not Found
        </h2>
        <p className="text-[var(--text-muted)] mb-4">
          The brand you are looking for does not exist.
        </p>
        <Button variant="outline" onClick={() => router.push('/director/brands')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Brands
        </Button>
      </div>
    );
  }

  // Admin action handlers
  const handleVerify = async () => {
    setIsLoading(true);
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
    router.push('/director/brands');
  };

  // Calculate stats
  const activeDealValue = mockAssociatedAthletes
    .filter((a) => a.dealStatus === 'active')
    .reduce((sum, a) => sum + a.dealValue, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Navigation */}
      <Button variant="ghost" onClick={() => router.push('/director/brands')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Brands
      </Button>

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Company Info Card */}
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Logo and Status */}
              <div className="flex flex-col items-center gap-3">
                <div className="h-24 w-24 rounded-[var(--radius-xl)] bg-[var(--bg-tertiary)] flex items-center justify-center border border-[var(--border-color)]">
                  <Building className="h-12 w-12 text-[var(--text-muted)]" />
                </div>
                <div className="flex flex-col items-center gap-2">
                  {brand.verified && (
                    <Badge variant="success" size="sm">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  {brand.status === 'pending_verification' && (
                    <Badge variant="warning" size="sm">
                      Pending Verification
                    </Badge>
                  )}
                  {brand.status === 'suspended' && (
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
                    {brand.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Briefcase className="h-4 w-4 text-[var(--text-muted)]" />
                    <span className="text-[var(--text-muted)]">{brand.industry}</span>
                  </div>
                </div>

                <p className="text-sm text-[var(--text-secondary)]">
                  {brand.description}
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-[var(--text-muted)]" />
                    <span className="text-[var(--text-secondary)]">{brand.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-[var(--text-muted)]" />
                    <span className="text-[var(--text-secondary)]">{brand.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-[var(--text-muted)]" />
                    <span className="text-[var(--text-secondary)]">{brand.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-[var(--text-muted)]" />
                    <a
                      href={brand.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-primary)] hover:underline flex items-center gap-1"
                    >
                      Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {/* Contact Person */}
                <div className="pt-4 border-t border-[var(--border-color)]">
                  <p className="text-xs text-[var(--text-muted)] mb-2">Primary Contact</p>
                  <div className="flex items-center gap-3">
                    <Avatar fallback={brand.contactPerson.name.charAt(0)} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {brand.contactPerson.name}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {brand.contactPerson.title}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 lg:w-80">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <DollarSign className="h-6 w-6 mx-auto mb-2 text-[var(--color-success)]" />
              <p className="text-2xl font-bold text-[var(--color-success)]">
                {formatCurrency(brand.totalSpent)}
              </p>
              <p className="text-xs text-[var(--text-muted)]">Total Spent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Handshake className="h-6 w-6 mx-auto mb-2 text-[var(--color-primary)]" />
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {brand.activeDeals + brand.completedDeals}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {brand.activeDeals} Active / {brand.completedDeals} Completed
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Users className="h-6 w-6 mx-auto mb-2 text-[var(--color-secondary)]" />
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {mockAssociatedAthletes.length}
              </p>
              <p className="text-xs text-[var(--text-muted)]">Athletes Partnered</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-[var(--text-muted)]" />
              <p className="text-lg font-bold text-[var(--text-primary)]">
                {formatDate(brand.joinedAt)}
              </p>
              <p className="text-xs text-[var(--text-muted)]">Member Since</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Admin Actions */}
      <Card className="border-l-4 border-l-[var(--color-primary)]">
        <CardHeader>
          <CardTitle>Admin Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {!brand.verified && (
              <Button variant="primary" onClick={() => setShowVerifyModal(true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify Brand
              </Button>
            )}
            {brand.status !== 'suspended' && (
              <Button variant="outline" onClick={() => setShowSuspendModal(true)}>
                <Ban className="h-4 w-4 mr-2" />
                Suspend Account
              </Button>
            )}
            {brand.status === 'suspended' && (
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

      {/* Campaign History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[var(--color-primary)]" />
              <CardTitle>Campaign History</CardTitle>
            </div>
            <Badge variant="outline">{mockCampaigns.length} Campaigns</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={campaignColumns}
            data={mockCampaigns}
            keyExtractor={(row) => row.id}
          />
        </CardContent>
      </Card>

      {/* Associated Athletes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[var(--color-primary)]" />
              <CardTitle>Associated Athletes</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{mockAssociatedAthletes.length} Athletes</Badge>
              <Badge variant="success" size="sm">
                {formatCurrency(activeDealValue)} Active
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={athleteColumns}
            data={mockAssociatedAthletes}
            keyExtractor={(row) => row.id}
            onRowClick={(row) => router.push(`/director/athletes/${row.id}`)}
          />
        </CardContent>
      </Card>

      {/* Verify Modal */}
      <Modal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        title="Verify Brand"
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
          Are you sure you want to verify <strong>{brand.name}</strong>? This will
          mark them as a trusted brand partner on the platform.
        </p>
      </Modal>

      {/* Suspend Modal */}
      <Modal
        isOpen={showSuspendModal}
        onClose={() => setShowSuspendModal(false)}
        title="Suspend Brand Account"
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
            Are you sure you want to suspend <strong>{brand.name}</strong>&apos;s
            account? This will:
          </p>
          <ul className="list-disc list-inside text-sm text-[var(--text-muted)] space-y-1">
            <li>Prevent them from creating new deals</li>
            <li>Pause all active campaigns</li>
            <li>Hide their brand from athletes</li>
            <li>Notify all associated athletes</li>
          </ul>
        </div>
      </Modal>

      {/* Reinstate Modal */}
      <Modal
        isOpen={showReinstateModal}
        onClose={() => setShowReinstateModal(false)}
        title="Reinstate Brand Account"
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
          Are you sure you want to reinstate <strong>{brand.name}</strong>&apos;s
          account? They will regain full access to the platform and can resume
          creating deals with athletes.
        </p>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Brand Account"
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
            Are you sure you want to permanently delete <strong>{brand.name}</strong>&apos;s
            account? All campaign data and deal history will be removed.
          </p>
        </div>
      </Modal>
    </div>
  );
}
