'use client';

import type { ReactNode } from 'react';
import {
  CheckCircle,
  Clock,
  Shield,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { formatDateTime } from '@/lib/utils';
import type { AuditEntry } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface AthleteAuditLogProps {
  auditLog: AuditEntry[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Table Columns
// ═══════════════════════════════════════════════════════════════════════════

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
// Component
// ═══════════════════════════════════════════════════════════════════════════

export function AthleteAuditLog({ auditLog }: AthleteAuditLogProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[var(--color-primary)]" />
            <CardTitle>Compliance Audit Log</CardTitle>
          </div>
          <Badge variant="outline">{auditLog.length} Entries</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <DataTable
          columns={auditColumns}
          data={auditLog}
          keyExtractor={(row) => row.id}
        />
      </CardContent>
    </Card>
  );
}
