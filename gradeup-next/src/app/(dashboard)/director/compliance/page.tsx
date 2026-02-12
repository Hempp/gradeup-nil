'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Shield,
  Eye,
  Search,
  Filter,
  XCircle,
  Settings,
  Activity,
  Users,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { FilterBar, type Filter as FilterType } from '@/components/ui/filter-bar';
import { Modal } from '@/components/ui/modal';
import { StatCard } from '@/components/ui/stat-card';
import { useToastActions } from '@/components/ui/toast';
import { formatCurrency, formatDate, formatDateTime, formatRelativeTime } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface FlaggedDeal extends Record<string, unknown> {
  id: string;
  dealId: string;
  athleteName: string;
  athleteId: string;
  brandName: string;
  brandId: string;
  dealAmount: number;
  dealType: string;
  flagReason: string;
  severity: 'high' | 'medium' | 'low';
  assignedReviewer: string | null;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'investigating';
}

interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  threshold?: number;
  unit?: string;
}

interface AuditLogEntry extends Record<string, unknown> {
  id: string;
  timestamp: string;
  adminUser: string;
  actionType: 'deal_approved' | 'deal_rejected' | 'rule_changed' | 'athlete_verified' | 'flag_raised' | 'flag_resolved';
  target: string;
  details: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════

const mockFlaggedDeals: FlaggedDeal[] = [
  {
    id: '1',
    dealId: 'D-001',
    athleteName: 'Jordan Davis',
    athleteId: '3',
    brandName: 'Nike',
    brandId: '1',
    dealAmount: 75000,
    dealType: 'Endorsement Contract',
    flagReason: 'Deal value exceeds NCAA compensation guidelines for football athletes',
    severity: 'high',
    assignedReviewer: 'John Smith (AD)',
    createdAt: '2026-02-10T16:45:00Z',
    status: 'pending',
  },
  {
    id: '2',
    dealId: 'D-002',
    athleteName: 'Emma Chen',
    athleteId: '4',
    brandName: 'Sports Memorabilia Inc',
    brandId: '5',
    dealAmount: 8500,
    dealType: 'Autograph Session',
    flagReason: 'Missing tax documentation (W-9 form)',
    severity: 'medium',
    assignedReviewer: null,
    createdAt: '2026-02-09T11:20:00Z',
    status: 'pending',
  },
  {
    id: '3',
    dealId: 'D-003',
    athleteName: 'Tyler Brooks',
    athleteId: '5',
    brandName: 'Gatorade',
    brandId: '2',
    dealAmount: 3500,
    dealType: 'Social Media Campaign',
    flagReason: 'Social media post missing required #ad disclosure',
    severity: 'low',
    assignedReviewer: 'Jane Doe (Compliance)',
    createdAt: '2026-02-08T09:00:00Z',
    status: 'investigating',
  },
  {
    id: '4',
    dealId: 'D-004',
    athleteName: 'Marcus Johnson',
    athleteId: '1',
    brandName: 'Local Auto Dealer',
    brandId: '6',
    dealAmount: 15000,
    dealType: 'TV Commercial',
    flagReason: 'Brand category requires additional approval (automotive)',
    severity: 'medium',
    assignedReviewer: 'John Smith (AD)',
    createdAt: '2026-02-07T14:30:00Z',
    status: 'approved',
  },
  {
    id: '5',
    dealId: 'D-005',
    athleteName: 'Sarah Williams',
    athleteId: '2',
    brandName: 'Energy Drink Co',
    brandId: '7',
    dealAmount: 25000,
    dealType: 'Product Endorsement',
    flagReason: 'Restricted category (energy drinks)',
    severity: 'high',
    assignedReviewer: 'Jane Doe (Compliance)',
    createdAt: '2026-02-06T10:00:00Z',
    status: 'rejected',
  },
];

const mockComplianceRules: ComplianceRule[] = [
  {
    id: '1',
    name: 'Maximum Deal Value - Basketball',
    description: 'Maximum single deal value for basketball athletes',
    category: 'Compensation Limits',
    enabled: true,
    threshold: 50000,
    unit: 'USD',
  },
  {
    id: '2',
    name: 'Maximum Deal Value - Football',
    description: 'Maximum single deal value for football athletes',
    category: 'Compensation Limits',
    enabled: true,
    threshold: 75000,
    unit: 'USD',
  },
  {
    id: '3',
    name: 'Maximum Deal Value - Other Sports',
    description: 'Maximum single deal value for other sports',
    category: 'Compensation Limits',
    enabled: true,
    threshold: 25000,
    unit: 'USD',
  },
  {
    id: '4',
    name: 'Restricted Category - Alcohol',
    description: 'Block deals with alcohol brands',
    category: 'Restricted Categories',
    enabled: true,
  },
  {
    id: '5',
    name: 'Restricted Category - Gambling',
    description: 'Block deals with gambling companies',
    category: 'Restricted Categories',
    enabled: true,
  },
  {
    id: '6',
    name: 'Restricted Category - Tobacco',
    description: 'Block deals with tobacco companies',
    category: 'Restricted Categories',
    enabled: true,
  },
  {
    id: '7',
    name: 'Restricted Category - Energy Drinks',
    description: 'Flag deals with energy drink companies for review',
    category: 'Restricted Categories',
    enabled: true,
  },
  {
    id: '8',
    name: 'Required Disclosure - Social Media',
    description: 'Require #ad disclosure on all sponsored posts',
    category: 'Disclosure Requirements',
    enabled: true,
  },
  {
    id: '9',
    name: 'Required Documentation - W-9',
    description: 'Require W-9 form before deal activation',
    category: 'Documentation',
    enabled: true,
  },
  {
    id: '10',
    name: 'GPA Minimum',
    description: 'Minimum GPA requirement for NIL eligibility',
    category: 'Academic Requirements',
    enabled: true,
    threshold: 2.5,
    unit: 'GPA',
  },
];

const mockAuditLog: AuditLogEntry[] = [
  {
    id: '1',
    timestamp: '2026-02-11T10:30:00Z',
    adminUser: 'John Smith (AD)',
    actionType: 'deal_approved',
    target: 'Marcus Johnson - Nike Deal',
    details: 'Deal approved after compliance review',
  },
  {
    id: '2',
    timestamp: '2026-02-11T09:15:00Z',
    adminUser: 'System',
    actionType: 'flag_raised',
    target: 'Jordan Davis - Nike Deal',
    details: 'Auto-flagged: Deal exceeds compensation limit',
  },
  {
    id: '3',
    timestamp: '2026-02-10T16:45:00Z',
    adminUser: 'Jane Doe (Compliance)',
    actionType: 'athlete_verified',
    target: 'Sarah Williams',
    details: 'Verification completed: enrollment, sport, grades',
  },
  {
    id: '4',
    timestamp: '2026-02-10T14:00:00Z',
    adminUser: 'John Smith (AD)',
    actionType: 'rule_changed',
    target: 'Max Deal Value - Basketball',
    details: 'Threshold updated: $40,000 -> $50,000',
  },
  {
    id: '5',
    timestamp: '2026-02-09T11:20:00Z',
    adminUser: 'System',
    actionType: 'flag_raised',
    target: 'Emma Chen',
    details: 'Missing documentation: W-9 form required',
  },
  {
    id: '6',
    timestamp: '2026-02-08T09:00:00Z',
    adminUser: 'Jane Doe (Compliance)',
    actionType: 'deal_rejected',
    target: 'Sarah Williams - Energy Drink Co',
    details: 'Rejected: Restricted category (energy drinks)',
  },
  {
    id: '7',
    timestamp: '2026-02-07T14:30:00Z',
    adminUser: 'John Smith (AD)',
    actionType: 'flag_resolved',
    target: 'Tyler Brooks - Gatorade',
    details: 'Disclosure added; issue resolved',
  },
];

// Compliance score breakdown
const mockComplianceScore = {
  overall: 94,
  breakdown: {
    documentation: 98,
    dealCompliance: 92,
    disclosureAdherence: 95,
    academicStanding: 91,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// TABLE COLUMNS
// ═══════════════════════════════════════════════════════════════════════════

const flaggedDealColumns: DataTableColumn<FlaggedDeal>[] = [
  {
    key: 'athleteName',
    header: 'Athlete',
    render: (_, row) => (
      <div className="flex items-center gap-2">
        <Avatar fallback={row.athleteName.charAt(0)} size="sm" />
        <div>
          <p className="font-medium text-[var(--text-primary)]">{row.athleteName}</p>
          <p className="text-xs text-[var(--text-muted)]">{row.brandName}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'dealAmount',
    header: 'Deal Value',
    render: (_, row) => (
      <span className="font-semibold text-[var(--text-primary)]">
        {formatCurrency(row.dealAmount)}
      </span>
    ),
  },
  {
    key: 'flagReason',
    header: 'Flag Reason',
    render: (_, row) => (
      <p className="text-sm text-[var(--text-secondary)] max-w-xs truncate" title={row.flagReason}>
        {row.flagReason}
      </p>
    ),
  },
  {
    key: 'severity',
    header: 'Severity',
    render: (_, row) => {
      const variants: Record<FlaggedDeal['severity'], 'error' | 'warning' | 'primary'> = {
        high: 'error',
        medium: 'warning',
        low: 'primary',
      };
      return (
        <Badge variant={variants[row.severity]} size="sm">
          {row.severity.charAt(0).toUpperCase() + row.severity.slice(1)}
        </Badge>
      );
    },
  },
  {
    key: 'assignedReviewer',
    header: 'Reviewer',
    render: (_, row) => (
      <span className="text-[var(--text-muted)] text-sm">
        {row.assignedReviewer || 'Unassigned'}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (_, row) => {
      const statusConfig: Record<FlaggedDeal['status'], { variant: 'warning' | 'success' | 'error' | 'primary'; label: string }> = {
        pending: { variant: 'warning', label: 'Pending' },
        approved: { variant: 'success', label: 'Approved' },
        rejected: { variant: 'error', label: 'Rejected' },
        investigating: { variant: 'primary', label: 'Investigating' },
      };
      const config = statusConfig[row.status];
      return <Badge variant={config.variant} size="sm">{config.label}</Badge>;
    },
  },
];

const auditLogColumns: DataTableColumn<AuditLogEntry>[] = [
  {
    key: 'timestamp',
    header: 'Timestamp',
    render: (_, row) => (
      <span className="text-[var(--text-muted)] text-xs whitespace-nowrap">
        {formatDateTime(row.timestamp)}
      </span>
    ),
  },
  {
    key: 'adminUser',
    header: 'Admin User',
    render: (_, row) => (
      <span className="font-medium text-[var(--text-primary)]">{row.adminUser}</span>
    ),
  },
  {
    key: 'actionType',
    header: 'Action Type',
    render: (_, row) => {
      const actionLabels: Record<AuditLogEntry['actionType'], { label: string; color: string }> = {
        deal_approved: { label: 'Deal Approved', color: 'text-[var(--color-success)]' },
        deal_rejected: { label: 'Deal Rejected', color: 'text-[var(--color-error)]' },
        rule_changed: { label: 'Rule Changed', color: 'text-[var(--color-primary)]' },
        athlete_verified: { label: 'Athlete Verified', color: 'text-[var(--color-success)]' },
        flag_raised: { label: 'Flag Raised', color: 'text-[var(--color-warning)]' },
        flag_resolved: { label: 'Flag Resolved', color: 'text-[var(--color-success)]' },
      };
      const config = actionLabels[row.actionType];
      return <span className={`font-medium ${config.color}`}>{config.label}</span>;
    },
  },
  {
    key: 'target',
    header: 'Target',
    render: (_, row) => (
      <span className="text-[var(--text-secondary)]">{row.target}</span>
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
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function ComplianceScoreCard() {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-[var(--color-success)]';
    if (score >= 70) return 'text-[var(--color-warning)]';
    return 'text-[var(--color-error)]';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[var(--color-primary)]" />
          <CardTitle>Compliance Score</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center mb-6">
          <div className={`text-6xl font-bold ${getScoreColor(mockComplianceScore.overall)}`}>
            {mockComplianceScore.overall}%
          </div>
          <p className="text-[var(--text-muted)] mt-1">Overall Score</p>
        </div>
        <div className="space-y-4">
          {Object.entries(mockComplianceScore.breakdown).map(([key, value]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-[var(--text-secondary)] capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className={`text-sm font-semibold ${getScoreColor(value)}`}>
                  {value}%
                </span>
              </div>
              <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    value >= 90 ? 'bg-[var(--color-success)]' :
                    value >= 70 ? 'bg-[var(--color-warning)]' :
                    'bg-[var(--color-error)]'
                  }`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ComplianceRulesPanel() {
  const [rules, setRules] = useState(mockComplianceRules);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Compensation Limits']);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const toggleRule = (ruleId: string) => {
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
      )
    );
  };

  const groupedRules = rules.reduce((acc, rule) => {
    if (!acc[rule.category]) acc[rule.category] = [];
    acc[rule.category].push(rule);
    return acc;
  }, {} as Record<string, ComplianceRule[]>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-[var(--color-primary)]" />
            <CardTitle>Compliance Rules</CardTitle>
          </div>
          <Badge variant="outline">{rules.filter((r) => r.enabled).length} Active</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(groupedRules).map(([category, categoryRules]) => (
            <div key={category} className="border border-[var(--border-color)] rounded-[var(--radius-md)]">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-3 hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <span className="font-medium text-[var(--text-primary)]">{category}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" size="sm">
                    {categoryRules.filter((r) => r.enabled).length}/{categoryRules.length}
                  </Badge>
                  {expandedCategories.includes(category) ? (
                    <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                  )}
                </div>
              </button>
              {expandedCategories.includes(category) && (
                <div className="border-t border-[var(--border-color)]">
                  {categoryRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-3 border-b border-[var(--border-color)] last:border-b-0"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {rule.name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">{rule.description}</p>
                        {rule.threshold && (
                          <p className="text-xs text-[var(--color-primary)] mt-1">
                            Threshold: {rule.unit === 'USD' ? formatCurrency(rule.threshold) : rule.threshold} {rule.unit !== 'USD' && rule.unit}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => toggleRule(rule.id)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 ${
                          rule.enabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--bg-tertiary)]'
                        }`}
                        role="switch"
                        aria-checked={rule.enabled}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            rule.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FlaggedDealsActions({ deal }: { deal: FlaggedDeal }) {
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToastActions();

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(
        'Deal Approved',
        `The deal between ${deal.athleteName} and ${deal.brandName} has been approved.`
      );
      setShowApproveModal(false);
    } catch (error) {
      toast.error('Approval Failed', 'Unable to approve deal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(
        'Deal Rejected',
        `The deal between ${deal.athleteName} and ${deal.brandName} has been rejected.`
      );
      setShowRejectModal(false);
    } catch (error) {
      toast.error('Rejection Failed', 'Unable to reject deal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (deal.status !== 'pending' && deal.status !== 'investigating') {
    return null;
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={() => setShowApproveModal(true)}>
          <CheckCircle className="h-3 w-3 mr-1" />
          Approve
        </Button>
        <Button variant="danger" size="sm" onClick={() => setShowRejectModal(true)}>
          <XCircle className="h-3 w-3 mr-1" />
          Reject
        </Button>
        <Button variant="outline" size="sm">
          <Eye className="h-3 w-3 mr-1" />
          Investigate
        </Button>
      </div>

      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="Approve Deal"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowApproveModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleApprove} isLoading={isLoading}>
              Approve
            </Button>
          </>
        }
      >
        <p className="text-[var(--text-secondary)]">
          Are you sure you want to approve the deal between{' '}
          <strong>{deal.athleteName}</strong> and <strong>{deal.brandName}</strong> for{' '}
          <strong>{formatCurrency(deal.dealAmount)}</strong>?
        </p>
      </Modal>

      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Deal"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReject} isLoading={isLoading}>
              Reject
            </Button>
          </>
        }
      >
        <p className="text-[var(--text-secondary)]">
          Are you sure you want to reject this deal? The athlete and brand will be
          notified of the rejection.
        </p>
      </Modal>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function DirectorCompliancePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Filter flagged deals
  const filteredDeals = mockFlaggedDeals.filter((deal) => {
    const matchesSearch =
      deal.athleteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.flagReason.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = !severityFilter || deal.severity === severityFilter;
    const matchesStatus = !statusFilter || deal.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  // Filter audit log
  const filteredAuditLog = mockAuditLog.filter((entry) => {
    const matchesActionType = !actionTypeFilter || entry.actionType === actionTypeFilter;
    return matchesActionType;
  });

  // Stats
  const pendingCount = mockFlaggedDeals.filter((d) => d.status === 'pending').length;
  const highSeverityCount = mockFlaggedDeals.filter(
    (d) => d.severity === 'high' && d.status === 'pending'
  ).length;

  // Filter configurations
  const dealFilters: FilterType[] = [
    {
      id: 'severity',
      label: 'Severity',
      options: [
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
      ],
      value: severityFilter,
      onChange: setSeverityFilter,
    },
    {
      id: 'status',
      label: 'Status',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'investigating', label: 'Investigating' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
      ],
      value: statusFilter,
      onChange: setStatusFilter,
    },
  ];

  const auditFilters: FilterType[] = [
    {
      id: 'actionType',
      label: 'Action Type',
      options: [
        { value: 'deal_approved', label: 'Deal Approved' },
        { value: 'deal_rejected', label: 'Deal Rejected' },
        { value: 'rule_changed', label: 'Rule Changed' },
        { value: 'athlete_verified', label: 'Athlete Verified' },
        { value: 'flag_raised', label: 'Flag Raised' },
        { value: 'flag_resolved', label: 'Flag Resolved' },
      ],
      value: actionTypeFilter,
      onChange: setActionTypeFilter,
    },
  ];

  // Extended columns with actions
  const extendedDealColumns: DataTableColumn<FlaggedDeal>[] = [
    ...flaggedDealColumns,
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => <FlaggedDealsActions deal={row} />,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Compliance Center
        </h1>
        <p className="text-[var(--text-muted)]">
          NCAA compliance monitoring, rules management, and audit trail
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Pending Reviews"
          value={pendingCount.toString()}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          title="High Severity"
          value={highSeverityCount.toString()}
          icon={<AlertTriangle className="h-5 w-5" />}
          trendDirection="down"
        />
        <StatCard
          title="Resolved (30d)"
          value="12"
          icon={<CheckCircle className="h-5 w-5" />}
          trend={25}
          trendDirection="up"
        />
        <StatCard
          title="Avg Resolution"
          value="2.3 days"
          icon={<Activity className="h-5 w-5" />}
          trend={15}
          trendDirection="down"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Flagged Deals Queue - 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-[var(--color-warning)]" />
                  <CardTitle>Flagged Deals Queue</CardTitle>
                  <Badge variant="warning">{pendingCount} Pending</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <FilterBar
                filters={dealFilters}
                searchValue={searchQuery}
                searchPlaceholder="Search deals..."
                onSearchChange={setSearchQuery}
                className="mb-4"
              />
              <div className="overflow-x-auto -mx-6">
                <div className="min-w-[800px] px-6">
                  <DataTable
                    columns={extendedDealColumns}
                    data={filteredDeals}
                    keyExtractor={(row) => row.id}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Compliance Score - 1 column */}
        <div>
          <ComplianceScoreCard />
        </div>
      </div>

      {/* Rules Panel and Audit Log */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Compliance Rules */}
        <ComplianceRulesPanel />

        {/* Audit Log */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[var(--color-primary)]" />
                <CardTitle>Audit Log</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FilterBar
              filters={auditFilters}
              className="mb-4"
            />
            <div className="overflow-x-auto -mx-6">
              <div className="min-w-[600px] px-6">
                <DataTable
                  columns={auditLogColumns}
                  data={filteredAuditLog}
                  keyExtractor={(row) => row.id}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
