'use client';

import { useState } from 'react';
import { FileText, Filter } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { FilterBar, type Filter as FilterType } from '@/components/ui/filter-bar';
import { formatDateTime } from '@/lib/utils';
import type { AuditLogEntry } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// TABLE COLUMNS
// ═══════════════════════════════════════════════════════════════════════════

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
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface AuditLogPanelProps {
  auditLog: AuditLogEntry[];
}

export function AuditLogPanel({ auditLog }: AuditLogPanelProps) {
  const [actionTypeFilter, setActionTypeFilter] = useState('');

  // Filter audit log
  const filteredAuditLog = auditLog.filter((entry) => {
    const matchesActionType = !actionTypeFilter || entry.actionType === actionTypeFilter;
    return matchesActionType;
  });

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

  return (
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
  );
}
