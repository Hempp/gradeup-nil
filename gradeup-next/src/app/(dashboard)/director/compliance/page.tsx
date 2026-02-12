'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Shield,
  Eye,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { formatDate, formatRelativeTime } from '@/lib/utils';

// Mock compliance data
const mockIssues = [
  {
    id: '1',
    type: 'contract_review',
    severity: 'high',
    athlete: 'Jordan Davis',
    description: 'Contract terms exceed NCAA guidelines for compensation',
    brand: 'Nike',
    createdAt: '2024-02-10T16:45:00Z',
    status: 'open',
  },
  {
    id: '2',
    type: 'documentation',
    severity: 'medium',
    athlete: 'Emma Chen',
    description: 'Missing tax documentation (W-9 form)',
    brand: null,
    createdAt: '2024-02-09T11:20:00Z',
    status: 'open',
  },
  {
    id: '3',
    type: 'disclosure',
    severity: 'low',
    athlete: 'Tyler Brooks',
    description: 'Social media post missing #ad disclosure',
    brand: 'Gatorade',
    createdAt: '2024-02-08T09:00:00Z',
    status: 'resolved',
  },
];

const mockAuditLog = [
  {
    id: '1',
    action: 'Deal approved',
    athlete: 'Marcus Johnson',
    brand: 'Nike',
    performedBy: 'John Smith (AD)',
    createdAt: '2024-02-11T10:30:00Z',
  },
  {
    id: '2',
    action: 'Verification completed',
    athlete: 'Sarah Williams',
    brand: null,
    performedBy: 'System',
    createdAt: '2024-02-11T09:15:00Z',
  },
  {
    id: '3',
    action: 'Contract flagged for review',
    athlete: 'Jordan Davis',
    brand: 'Nike',
    performedBy: 'System',
    createdAt: '2024-02-10T16:45:00Z',
  },
];

function IssueCard({ issue }: { issue: (typeof mockIssues)[0] }) {
  const severityColors = {
    high: 'bg-[var(--color-error-muted)] border-[var(--color-error)]',
    medium: 'bg-[var(--color-warning-muted)] border-[var(--color-warning)]',
    low: 'bg-[var(--bg-tertiary)] border-[var(--border-color)]',
  };

  const severityText = {
    high: 'text-[var(--color-error)]',
    medium: 'text-[var(--color-warning)]',
    low: 'text-[var(--text-muted)]',
  };

  return (
    <Card className={`border ${severityColors[issue.severity as keyof typeof severityColors]}`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div
            className={`h-10 w-10 rounded-full flex items-center justify-center ${
              issue.severity === 'high'
                ? 'bg-[var(--color-error-muted)] text-[var(--color-error)]'
                : issue.severity === 'medium'
                ? 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
            }`}
          >
            {issue.type === 'contract_review' && <FileText className="h-5 w-5" />}
            {issue.type === 'documentation' && <Shield className="h-5 w-5" />}
            {issue.type === 'disclosure' && <Eye className="h-5 w-5" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <p className="font-medium text-[var(--text-primary)]">
                  {issue.athlete}
                </p>
                <Badge
                  variant={
                    issue.severity === 'high'
                      ? 'error'
                      : issue.severity === 'medium'
                      ? 'warning'
                      : 'outline'
                  }
                  size="sm"
                >
                  {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
                </Badge>
              </div>
              {issue.status === 'resolved' ? (
                <Badge variant="success" size="sm">Resolved</Badge>
              ) : (
                <Badge variant="warning" size="sm">Open</Badge>
              )}
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-2">
              {issue.description}
            </p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--text-muted)]">
                {issue.brand && `${issue.brand} • `}
                {formatRelativeTime(issue.createdAt)}
              </p>
              {issue.status === 'open' && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Dismiss</Button>
                  <Button variant="primary" size="sm">Review</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AuditLogCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockAuditLog.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]"
            >
              <div className="h-8 w-8 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center text-[var(--color-accent)]">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--text-primary)]">
                  <span className="font-medium">{entry.action}</span>
                  {entry.athlete && (
                    <> for <span className="font-medium">{entry.athlete}</span></>
                  )}
                  {entry.brand && (
                    <> with <span className="font-medium">{entry.brand}</span></>
                  )}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {entry.performedBy} • {formatRelativeTime(entry.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DirectorCompliancePage() {
  const openIssues = mockIssues.filter((i) => i.status === 'open');
  const highSeverity = openIssues.filter((i) => i.severity === 'high');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Compliance</h1>
        <p className="text-[var(--text-muted)]">
          NCAA compliance monitoring and audit trail
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-[var(--text-muted)]">Open Issues</p>
            <p className="text-2xl font-bold text-[var(--color-warning)]">
              {openIssues.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-[var(--text-muted)]">High Severity</p>
            <p className="text-2xl font-bold text-[var(--color-error)]">
              {highSeverity.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-[var(--text-muted)]">Resolved (30d)</p>
            <p className="text-2xl font-bold text-[var(--color-success)]">12</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-[var(--text-muted)]">Avg Resolution</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">2.3 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Issues */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Open Issues ({openIssues.length})
          </h2>
          {mockIssues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>

        {/* Audit Log */}
        <AuditLogCard />
      </div>
    </div>
  );
}
