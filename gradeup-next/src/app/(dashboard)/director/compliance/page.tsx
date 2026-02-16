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
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronRight,
  Loader2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { FilterBar, type Filter as FilterType } from '@/components/ui/filter-bar';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { StatCard } from '@/components/ui/stat-card';
import { useToastActions } from '@/components/ui/toast';
import { formatCurrency, formatDateTime } from '@/lib/utils';

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
    dealId: 'NIL-2026-0847',
    athleteName: 'Jordan Davis',
    athleteId: '3',
    brandName: 'Nike',
    brandId: '1',
    dealAmount: 125000,
    dealType: 'Multi-Year Endorsement',
    flagReason: 'Deal value ($125,000) exceeds single-season compensation cap of $100,000 for football athletes under Big 12 Conference guidelines',
    severity: 'high',
    assignedReviewer: 'Dr. Michael Chen (AD)',
    createdAt: '2026-02-12T14:23:00Z',
    status: 'pending',
  },
  {
    id: '2',
    dealId: 'NIL-2026-0851',
    athleteName: 'Marcus Johnson',
    athleteId: '1',
    brandName: 'DraftKings',
    brandId: '8',
    dealAmount: 45000,
    dealType: 'Brand Ambassador',
    flagReason: 'Sports betting companies are restricted under university NIL policy. Requires Athletic Director and General Counsel review.',
    severity: 'high',
    assignedReviewer: null,
    createdAt: '2026-02-12T10:15:00Z',
    status: 'pending',
  },
  {
    id: '3',
    dealId: 'NIL-2026-0839',
    athleteName: 'Emma Chen',
    athleteId: '4',
    brandName: 'Topps Trading Cards',
    brandId: '5',
    dealAmount: 12500,
    dealType: 'Autograph Session Series',
    flagReason: 'Missing required tax documentation: W-9 form not submitted. IRS compliance requirement.',
    severity: 'medium',
    assignedReviewer: 'Sarah Martinez (Compliance)',
    createdAt: '2026-02-11T16:45:00Z',
    status: 'pending',
  },
  {
    id: '4',
    dealId: 'NIL-2026-0832',
    athleteName: 'Tyler Brooks',
    athleteId: '5',
    brandName: 'Gatorade',
    brandId: '2',
    dealAmount: 8500,
    dealType: 'Social Media Campaign',
    flagReason: 'FTC disclosure violation: Instagram posts missing required #ad or #sponsored hashtags. 3 posts identified.',
    severity: 'low',
    assignedReviewer: 'James Wilson (Digital Media)',
    createdAt: '2026-02-10T09:30:00Z',
    status: 'investigating',
  },
  {
    id: '5',
    dealId: 'NIL-2026-0828',
    athleteName: 'Mia Rodriguez',
    athleteId: '6',
    brandName: 'Tesla Motors',
    brandId: '9',
    dealAmount: 35000,
    dealType: 'Product Placement',
    flagReason: 'Automotive category requires additional insurance verification and liability waiver per Risk Management.',
    severity: 'medium',
    assignedReviewer: 'Dr. Michael Chen (AD)',
    createdAt: '2026-02-09T11:20:00Z',
    status: 'investigating',
  },
  {
    id: '6',
    dealId: 'NIL-2026-0815',
    athleteName: 'DeShawn Williams',
    athleteId: '7',
    brandName: 'Beats by Dre',
    brandId: '10',
    dealAmount: 75000,
    dealType: 'Equipment Endorsement',
    flagReason: 'Potential conflict with existing university equipment contract with Bose. Legal review required.',
    severity: 'high',
    assignedReviewer: 'Lisa Park (General Counsel)',
    createdAt: '2026-02-08T14:00:00Z',
    status: 'pending',
  },
  {
    id: '7',
    dealId: 'NIL-2026-0798',
    athleteName: 'Sarah Williams',
    athleteId: '2',
    brandName: 'Celsius Energy',
    brandId: '7',
    dealAmount: 28000,
    dealType: 'Product Endorsement',
    flagReason: 'Energy drink category flagged for review. University policy requires health advisory review for caffeinated products.',
    severity: 'medium',
    assignedReviewer: 'Sarah Martinez (Compliance)',
    createdAt: '2026-02-07T10:00:00Z',
    status: 'rejected',
  },
  {
    id: '8',
    dealId: 'NIL-2026-0785',
    athleteName: 'Andre Washington',
    athleteId: '8',
    brandName: 'State Farm Insurance',
    brandId: '11',
    dealAmount: 18500,
    dealType: 'Commercial Appearance',
    flagReason: 'Standard review: First NIL deal for freshman athlete. Academic eligibility verification required.',
    severity: 'low',
    assignedReviewer: 'Dr. Michael Chen (AD)',
    createdAt: '2026-02-06T15:30:00Z',
    status: 'approved',
  },
  {
    id: '9',
    dealId: 'NIL-2026-0772',
    athleteName: 'Zoe Thompson',
    athleteId: '9',
    brandName: 'Adidas',
    brandId: '12',
    dealAmount: 42000,
    dealType: 'Apparel Partnership',
    flagReason: 'Cleared after Nike exclusivity waiver received. No conflicts with university athletic contracts.',
    severity: 'low',
    assignedReviewer: 'James Wilson (Digital Media)',
    createdAt: '2026-02-05T09:15:00Z',
    status: 'approved',
  },
];

const mockComplianceRules: ComplianceRule[] = [
  // Compensation Limits
  {
    id: '1',
    name: 'Single-Season Cap - Football',
    description: 'Maximum total NIL compensation per season for football athletes (Big 12 guideline)',
    category: 'Compensation Limits',
    enabled: true,
    threshold: 100000,
    unit: 'USD',
  },
  {
    id: '2',
    name: 'Single-Season Cap - Basketball',
    description: 'Maximum total NIL compensation per season for basketball athletes',
    category: 'Compensation Limits',
    enabled: true,
    threshold: 85000,
    unit: 'USD',
  },
  {
    id: '3',
    name: 'Single-Season Cap - Olympic Sports',
    description: 'Maximum total NIL compensation per season for Olympic sport athletes',
    category: 'Compensation Limits',
    enabled: true,
    threshold: 50000,
    unit: 'USD',
  },
  {
    id: '4',
    name: 'Individual Deal Cap',
    description: 'Maximum value for a single NIL deal (requires AD approval above this amount)',
    category: 'Compensation Limits',
    enabled: true,
    threshold: 25000,
    unit: 'USD',
  },
  // Restricted Categories
  {
    id: '5',
    name: 'Alcohol & Tobacco',
    description: 'Block all deals with alcohol, tobacco, and vaping companies (NCAA required)',
    category: 'Restricted Categories',
    enabled: true,
  },
  {
    id: '6',
    name: 'Sports Betting & Gambling',
    description: 'Block deals with sportsbooks, casinos, and gambling platforms (Conference required)',
    category: 'Restricted Categories',
    enabled: true,
  },
  {
    id: '7',
    name: 'Adult Entertainment',
    description: 'Block deals with adult entertainment and dating services',
    category: 'Restricted Categories',
    enabled: true,
  },
  {
    id: '8',
    name: 'Cannabis & CBD',
    description: 'Block deals with cannabis dispensaries and CBD product companies',
    category: 'Restricted Categories',
    enabled: true,
  },
  {
    id: '9',
    name: 'Energy Drinks (Review)',
    description: 'Flag energy drink deals for health advisory review (not blocked)',
    category: 'Restricted Categories',
    enabled: true,
  },
  {
    id: '10',
    name: 'Competing Athletic Brands',
    description: 'Flag deals that may conflict with university athletic contracts',
    category: 'Restricted Categories',
    enabled: true,
  },
  // Disclosure Requirements
  {
    id: '11',
    name: 'FTC Social Media Disclosure',
    description: 'Require #ad or #sponsored disclosure on all paid social media posts',
    category: 'Disclosure Requirements',
    enabled: true,
  },
  {
    id: '12',
    name: 'Material Connection Disclosure',
    description: 'Require disclosure of material connection in testimonials and reviews',
    category: 'Disclosure Requirements',
    enabled: true,
  },
  {
    id: '13',
    name: 'University Disclaimer',
    description: 'Require "Not affiliated with [University]" disclaimer in brand content',
    category: 'Disclosure Requirements',
    enabled: false,
  },
  // Documentation Requirements
  {
    id: '14',
    name: 'W-9 Tax Form',
    description: 'Require IRS W-9 form before deal activation (federal requirement)',
    category: 'Documentation',
    enabled: true,
  },
  {
    id: '15',
    name: 'Contract Review',
    description: 'All contracts over $10,000 must be reviewed by university legal counsel',
    category: 'Documentation',
    enabled: true,
  },
  {
    id: '16',
    name: 'Agent Disclosure',
    description: 'Require disclosure of agent/representative information if applicable',
    category: 'Documentation',
    enabled: true,
  },
  {
    id: '17',
    name: 'Insurance Verification',
    description: 'Verify liability insurance for physical appearance and event deals',
    category: 'Documentation',
    enabled: true,
  },
  // Academic Requirements
  {
    id: '18',
    name: 'Minimum GPA',
    description: 'Athletes must maintain minimum GPA for NIL eligibility',
    category: 'Academic Requirements',
    enabled: true,
    threshold: 2.5,
    unit: 'GPA',
  },
  {
    id: '19',
    name: 'Full-Time Enrollment',
    description: 'Athletes must be enrolled full-time (12+ credit hours)',
    category: 'Academic Requirements',
    enabled: true,
    threshold: 12,
    unit: 'credits',
  },
  {
    id: '20',
    name: 'Academic Good Standing',
    description: 'Athletes must not be on academic probation',
    category: 'Academic Requirements',
    enabled: true,
  },
  // Practice & Competition
  {
    id: '21',
    name: 'Practice Conflict Check',
    description: 'NIL activities cannot conflict with scheduled practices or team meetings',
    category: 'Practice & Competition',
    enabled: true,
  },
  {
    id: '22',
    name: 'Game Day Restrictions',
    description: 'No NIL commercial activities within 4 hours of scheduled competitions',
    category: 'Practice & Competition',
    enabled: true,
    threshold: 4,
    unit: 'hours',
  },
  {
    id: '23',
    name: 'Travel Approval',
    description: 'NIL activities requiring travel must be approved by coaching staff',
    category: 'Practice & Competition',
    enabled: false,
  },
];

const mockAuditLog: AuditLogEntry[] = [
  {
    id: '1',
    timestamp: '2026-02-13T09:45:00Z',
    adminUser: 'Dr. Michael Chen (AD)',
    actionType: 'deal_approved',
    target: 'Andre Washington - State Farm Deal (NIL-2026-0785)',
    details: 'Freshman eligibility verified. Academic standing confirmed at 3.62 GPA. Deal value: $18,500',
  },
  {
    id: '2',
    timestamp: '2026-02-13T08:30:00Z',
    adminUser: 'System',
    actionType: 'flag_raised',
    target: 'Marcus Johnson - DraftKings Deal (NIL-2026-0851)',
    details: 'Auto-flagged: Sports betting category restricted under university NIL policy Section 4.2',
  },
  {
    id: '3',
    timestamp: '2026-02-12T16:20:00Z',
    adminUser: 'Lisa Park (General Counsel)',
    actionType: 'flag_raised',
    target: 'DeShawn Williams - Beats by Dre (NIL-2026-0815)',
    details: 'Potential conflict identified with existing Bose equipment contract. Forwarded to legal review.',
  },
  {
    id: '4',
    timestamp: '2026-02-12T14:23:00Z',
    adminUser: 'System',
    actionType: 'flag_raised',
    target: 'Jordan Davis - Nike Deal (NIL-2026-0847)',
    details: 'Auto-flagged: Deal value ($125,000) exceeds Big 12 single-season cap ($100,000)',
  },
  {
    id: '5',
    timestamp: '2026-02-12T11:00:00Z',
    adminUser: 'Dr. Michael Chen (AD)',
    actionType: 'rule_changed',
    target: 'Single-Season Cap - Football',
    details: 'Threshold updated: $75,000 -> $100,000 per Big 12 Conference guideline update effective Feb 2026',
  },
  {
    id: '6',
    timestamp: '2026-02-11T15:45:00Z',
    adminUser: 'Sarah Martinez (Compliance)',
    actionType: 'athlete_verified',
    target: 'Zoe Thompson',
    details: 'Full verification completed: enrollment (confirmed), sport eligibility (basketball), academic standing (3.75 GPA)',
  },
  {
    id: '7',
    timestamp: '2026-02-10T14:30:00Z',
    adminUser: 'James Wilson (Digital Media)',
    actionType: 'flag_resolved',
    target: 'Tyler Brooks - Gatorade (NIL-2026-0832)',
    details: 'FTC disclosure compliance verified. Athlete added required #ad hashtags to 3 Instagram posts.',
  },
  {
    id: '8',
    timestamp: '2026-02-09T10:15:00Z',
    adminUser: 'System',
    actionType: 'flag_raised',
    target: 'Mia Rodriguez - Tesla Motors (NIL-2026-0828)',
    details: 'Auto-flagged: Automotive category requires additional insurance verification per Risk Management policy',
  },
  {
    id: '9',
    timestamp: '2026-02-08T16:00:00Z',
    adminUser: 'Sarah Martinez (Compliance)',
    actionType: 'deal_rejected',
    target: 'Sarah Williams - Celsius Energy (NIL-2026-0798)',
    details: 'Rejected: Energy drink product failed health advisory review. Contains 300mg caffeine per serving.',
  },
  {
    id: '10',
    timestamp: '2026-02-07T09:30:00Z',
    adminUser: 'Dr. Michael Chen (AD)',
    actionType: 'deal_approved',
    target: 'Zoe Thompson - Adidas Deal (NIL-2026-0772)',
    details: 'Nike exclusivity waiver received and verified. No conflicts with university contracts.',
  },
  {
    id: '11',
    timestamp: '2026-02-06T14:20:00Z',
    adminUser: 'System',
    actionType: 'athlete_verified',
    target: 'Marcus Johnson',
    details: 'Automatic re-verification: Spring semester enrollment confirmed, GPA maintained at 3.87',
  },
  {
    id: '12',
    timestamp: '2026-02-05T11:45:00Z',
    adminUser: 'Sarah Martinez (Compliance)',
    actionType: 'rule_changed',
    target: 'W-9 Tax Form',
    details: 'Rule enabled: All NIL payments now require W-9 on file before disbursement (IRS requirement)',
  },
];

// Compliance score breakdown with trend data
const mockComplianceScore = {
  overall: 94,
  previousMonth: 91,
  breakdown: {
    documentation: 98,
    dealCompliance: 92,
    disclosureAdherence: 95,
    academicStanding: 91,
  },
  trends: {
    documentation: { current: 98, previous: 96, trend: 'up' },
    dealCompliance: { current: 92, previous: 94, trend: 'down' },
    disclosureAdherence: { current: 95, previous: 92, trend: 'up' },
    academicStanding: { current: 91, previous: 91, trend: 'stable' },
  },
};

// Key metrics for the stats row
const mockMetrics = {
  totalDealsReviewed: 168,
  dealsThisMonth: 23,
  avgResolutionHours: 18.5,
  complianceRate: 94.2,
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

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-[var(--color-success)]';
    if (score >= 70) return 'bg-[var(--color-warning)]';
    return 'bg-[var(--color-error)]';
  };

  const scoreDiff = mockComplianceScore.overall - mockComplianceScore.previousMonth;

  const trendLabels: Record<string, string> = {
    documentation: 'Documentation',
    dealCompliance: 'Deal Compliance',
    disclosureAdherence: 'FTC Disclosure',
    academicStanding: 'Academic Standing',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[var(--color-primary)]" />
            <CardTitle>Compliance Score</CardTitle>
          </div>
          <Badge variant={mockComplianceScore.overall >= 90 ? 'success' : 'warning'} size="sm">
            {mockComplianceScore.overall >= 95 ? 'Excellent' : mockComplianceScore.overall >= 90 ? 'Good' : 'Needs Work'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Main Score Circle */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="var(--bg-tertiary)"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke={mockComplianceScore.overall >= 90 ? 'var(--color-success)' : mockComplianceScore.overall >= 70 ? 'var(--color-warning)' : 'var(--color-error)'}
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(mockComplianceScore.overall / 100) * 351.86} 351.86`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${getScoreColor(mockComplianceScore.overall)}`}>
                {mockComplianceScore.overall}
              </span>
              <span className="text-xs text-[var(--text-muted)]">out of 100</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            {scoreDiff > 0 ? (
              <TrendingUp className="h-4 w-4 text-[var(--color-success)]" />
            ) : scoreDiff < 0 ? (
              <TrendingDown className="h-4 w-4 text-[var(--color-error)]" />
            ) : (
              <Activity className="h-4 w-4 text-[var(--text-muted)]" />
            )}
            <span className={`text-sm font-medium ${scoreDiff > 0 ? 'text-[var(--color-success)]' : scoreDiff < 0 ? 'text-[var(--color-error)]' : 'text-[var(--text-muted)]'}`}>
              {scoreDiff > 0 ? '+' : ''}{scoreDiff}% from last month
            </span>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="space-y-3">
          {Object.entries(mockComplianceScore.trends).map(([key, data]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-[var(--text-secondary)]">
                  {trendLabels[key] || key}
                </span>
                <div className="flex items-center gap-2">
                  {data.trend === 'up' && <TrendingUp className="h-3 w-3 text-[var(--color-success)]" />}
                  {data.trend === 'down' && <TrendingDown className="h-3 w-3 text-[var(--color-error)]" />}
                  <span className={`text-sm font-semibold ${getScoreColor(data.current)}`}>
                    {data.current}%
                  </span>
                </div>
              </div>
              <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getScoreBg(data.current)}`}
                  style={{ width: `${data.current}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-6 pt-4 border-t border-[var(--border-color)]">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
              <p className="text-lg font-bold text-[var(--text-primary)]">{mockMetrics.totalDealsReviewed}</p>
              <p className="text-xs text-[var(--text-muted)]">Deals Reviewed</p>
            </div>
            <div className="text-center p-2 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
              <p className="text-lg font-bold text-[var(--color-success)]">{mockMetrics.complianceRate}%</p>
              <p className="text-xs text-[var(--text-muted)]">Pass Rate</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ComplianceRulesPanel() {
  const [rules, setRules] = useState(mockComplianceRules);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Compensation Limits', 'Restricted Categories']);
  const [pendingToggle, setPendingToggle] = useState<{ rule: ComplianceRule; newState: boolean } | null>(null);
  const [isToggling, setIsToggling] = useState<string | null>(null);
  const toast = useToastActions();

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleToggleRequest = (rule: ComplianceRule) => {
    const newState = !rule.enabled;
    // Critical rules require confirmation when disabling
    const criticalRules = ['1', '2', '3', '5', '6', '7', '8', '14', '18']; // IDs of critical rules
    if (criticalRules.includes(rule.id) && rule.enabled) {
      setPendingToggle({ rule, newState });
    } else {
      executeToggle(rule.id, newState);
    }
  };

  const executeToggle = async (ruleId: string, newState: boolean) => {
    setIsToggling(ruleId);
    // Simulate API call with optimistic update
    await new Promise((resolve) => setTimeout(resolve, 300));

    setRules((prev) =>
      prev.map((r) =>
        r.id === ruleId ? { ...r, enabled: newState } : r
      )
    );

    const rule = rules.find(r => r.id === ruleId);
    toast.success(
      newState ? 'Rule Enabled' : 'Rule Disabled',
      `"${rule?.name}" has been ${newState ? 'enabled' : 'disabled'}.`
    );

    setIsToggling(null);
  };

  const handleConfirmToggle = async () => {
    if (!pendingToggle) return;
    await executeToggle(pendingToggle.rule.id, pendingToggle.newState);
    setPendingToggle(null);
  };

  const groupedRules = rules.reduce((acc, rule) => {
    if (!acc[rule.category]) acc[rule.category] = [];
    acc[rule.category].push(rule);
    return acc;
  }, {} as Record<string, ComplianceRule[]>);

  // Category icons
  const categoryIcons: Record<string, React.ReactNode> = {
    'Compensation Limits': <DollarSign className="h-4 w-4" />,
    'Restricted Categories': <XCircle className="h-4 w-4" />,
    'Disclosure Requirements': <FileText className="h-4 w-4" />,
    'Documentation': <FileText className="h-4 w-4" />,
    'Academic Requirements': <Activity className="h-4 w-4" />,
    'Practice & Competition': <Calendar className="h-4 w-4" />,
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-[var(--color-primary)]" />
              <CardTitle>Compliance Rules</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success" size="sm">
                {rules.filter((r) => r.enabled).length} Active
              </Badge>
              <Badge variant="outline" size="sm">
                {rules.filter((r) => !r.enabled).length} Inactive
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(groupedRules).map(([category, categoryRules]) => {
              const enabledCount = categoryRules.filter((r) => r.enabled).length;
              const allEnabled = enabledCount === categoryRules.length;
              const noneEnabled = enabledCount === 0;

              return (
                <div key={category} className="border border-[var(--border-color)] rounded-[var(--radius-md)] overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between p-3 hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text-muted)]">
                        {categoryIcons[category] || <Settings className="h-4 w-4" />}
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">{category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={allEnabled ? 'success' : noneEnabled ? 'error' : 'warning'}
                        size="sm"
                      >
                        {enabledCount}/{categoryRules.length}
                      </Badge>
                      {expandedCategories.includes(category) ? (
                        <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                      )}
                    </div>
                  </button>
                  {expandedCategories.includes(category) && (
                    <div className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
                      {categoryRules.map((rule) => (
                        <div
                          key={rule.id}
                          className={`flex items-center justify-between p-3 border-b border-[var(--border-color)] last:border-b-0 transition-colors ${
                            isToggling === rule.id ? 'bg-[var(--bg-tertiary)]' : ''
                          }`}
                        >
                          <div className="flex-1 pr-4">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-[var(--text-primary)]">
                                {rule.name}
                              </p>
                              {!rule.enabled && (
                                <Badge variant="outline" size="sm" className="text-[var(--text-muted)]">
                                  Disabled
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">{rule.description}</p>
                            {rule.threshold !== undefined && (
                              <p className="text-xs text-[var(--color-primary)] mt-1 font-medium">
                                Threshold: {rule.unit === 'USD' ? formatCurrency(rule.threshold) : `${rule.threshold} ${rule.unit}`}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleToggleRequest(rule)}
                            disabled={isToggling === rule.id}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 ${
                              rule.enabled ? 'bg-[var(--color-success)]' : 'bg-[var(--bg-tertiary)]'
                            } ${isToggling === rule.id ? 'opacity-70' : ''}`}
                            role="switch"
                            aria-checked={rule.enabled}
                            aria-label={`Toggle ${rule.name}`}
                          >
                            {isToggling === rule.id ? (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
                              </span>
                            ) : (
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  rule.enabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Critical Rules */}
      <ConfirmDialog
        isOpen={!!pendingToggle}
        onClose={() => setPendingToggle(null)}
        onConfirm={handleConfirmToggle}
        variant="warning"
        title="Disable Compliance Rule?"
        description={pendingToggle ? `You are about to disable "${pendingToggle.rule.name}". This is a critical compliance rule and disabling it may affect NCAA compliance monitoring. Are you sure you want to proceed?` : ''}
        confirmLabel="Disable Rule"
        cancelLabel="Keep Enabled"
      />
    </>
  );
}

function EmptyDealsState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
        {hasFilters ? (
          <Search className="h-8 w-8 text-[var(--text-muted)]" />
        ) : (
          <CheckCircle className="h-8 w-8 text-[var(--color-success)]" />
        )}
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
        {hasFilters ? 'No matching deals found' : 'All clear!'}
      </h3>
      <p className="text-[var(--text-muted)] max-w-sm mb-4">
        {hasFilters
          ? 'Try adjusting your filters or search terms to find what you\'re looking for.'
          : 'There are no flagged deals requiring review. Great job maintaining compliance!'}
      </p>
      {hasFilters && (
        <Badge variant="outline" className="cursor-pointer hover:bg-[var(--bg-tertiary)]">
          Clear filters to see all deals
        </Badge>
      )}
    </div>
  );
}

function EmptyAuditLogState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-14 h-14 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-3">
        {hasFilters ? (
          <Filter className="h-6 w-6 text-[var(--text-muted)]" />
        ) : (
          <FileText className="h-6 w-6 text-[var(--text-muted)]" />
        )}
      </div>
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
        {hasFilters ? 'No matching audit entries' : 'No activity yet'}
      </h3>
      <p className="text-sm text-[var(--text-muted)] max-w-xs">
        {hasFilters
          ? 'Try a different action type filter to see more results.'
          : 'Compliance actions will appear here as they happen.'}
      </p>
    </div>
  );
}

function FlaggedDealsActions({ deal }: { deal: FlaggedDeal }) {
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showInvestigateModal, setShowInvestigateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [investigationNotes, setInvestigationNotes] = useState('');
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
    } catch {
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
    } catch {
      toast.error('Rejection Failed', 'Unable to reject deal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvestigate = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(
        'Investigation Started',
        `An investigation has been opened for the deal between ${deal.athleteName} and ${deal.brandName}.`
      );
      setShowInvestigateModal(false);
      setInvestigationNotes('');
    } catch {
      toast.error('Action Failed', 'Unable to start investigation. Please try again.');
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
        <Button variant="outline" size="sm" onClick={() => setShowInvestigateModal(true)}>
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

      <Modal
        isOpen={showInvestigateModal}
        onClose={() => { setShowInvestigateModal(false); setInvestigationNotes(''); }}
        title="Open Investigation"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowInvestigateModal(false); setInvestigationNotes(''); }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleInvestigate} isLoading={isLoading}>
              <Eye className="h-4 w-4 mr-2" />
              Start Investigation
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[var(--text-muted)]">Athlete</p>
                <p className="font-medium text-[var(--text-primary)]">{deal.athleteName}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Brand</p>
                <p className="font-medium text-[var(--text-primary)]">{deal.brandName}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Deal Value</p>
                <p className="font-semibold text-[var(--color-success)]">{formatCurrency(deal.dealAmount)}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Deal Type</p>
                <p className="font-medium text-[var(--text-primary)]">{deal.dealType}</p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20">
            <p className="text-sm font-medium text-[var(--color-warning)] mb-1">Flag Reason:</p>
            <p className="text-sm text-[var(--text-secondary)]">{deal.flagReason}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Investigation Notes
            </label>
            <textarea
              value={investigationNotes}
              onChange={(e) => setInvestigationNotes(e.target.value)}
              placeholder="Add notes about this investigation..."
              className="w-full h-24 px-3 py-2 text-sm rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>

          <p className="text-sm text-[var(--text-muted)]">
            Starting an investigation will change the deal status to &quot;Investigating&quot; and notify the compliance team.
          </p>
        </div>
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
  const [_dateFilter, _setDateFilter] = useState('');

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
          subtitle={highSeverityCount > 0 ? `${highSeverityCount} high severity` : 'No urgent items'}
        />
        <StatCard
          title="High Severity Flags"
          value={highSeverityCount.toString()}
          icon={<AlertTriangle className="h-5 w-5" />}
          trend={-2}
          trendDirection="down"
          subtitle="vs. last week"
        />
        <StatCard
          title="Resolved This Month"
          value={mockMetrics.dealsThisMonth.toString()}
          icon={<CheckCircle className="h-5 w-5" />}
          trend={18}
          trendDirection="up"
          subtitle={`${mockMetrics.complianceRate}% compliance rate`}
        />
        <StatCard
          title="Avg Resolution Time"
          value={`${mockMetrics.avgResolutionHours}h`}
          icon={<Activity className="h-5 w-5" />}
          trend={12}
          trendDirection="down"
          subtitle="Faster than target (24h)"
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
              {filteredDeals.length === 0 ? (
                <EmptyDealsState hasFilters={!!(searchQuery || severityFilter || statusFilter)} />
              ) : (
                <div className="overflow-x-auto -mx-6">
                  <div className="min-w-[800px] px-6">
                    <DataTable
                      columns={extendedDealColumns}
                      data={filteredDeals}
                      keyExtractor={(row) => row.id}
                    />
                  </div>
                </div>
              )}
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
            {filteredAuditLog.length === 0 ? (
              <EmptyAuditLogState hasFilters={!!actionTypeFilter} />
            ) : (
              <div className="overflow-x-auto -mx-6">
                <div className="min-w-[600px] px-6">
                  <DataTable
                    columns={auditLogColumns}
                    data={filteredAuditLog}
                    keyExtractor={(row) => row.id}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
