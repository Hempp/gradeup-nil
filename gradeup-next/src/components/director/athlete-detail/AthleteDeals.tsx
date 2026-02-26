'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Deal } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface AthleteDealsProps {
  deals: Deal[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Table Columns
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

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export function AthleteDeals({ deals }: AthleteDealsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Deal History</CardTitle>
          <Badge variant="outline">{deals.length} Deals</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <DataTable
          columns={dealColumns}
          data={deals}
          keyExtractor={(row) => row.id}
        />
      </CardContent>
    </Card>
  );
}
