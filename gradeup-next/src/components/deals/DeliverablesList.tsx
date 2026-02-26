'use client';

import { Clock, CheckCircle2, Circle, XCircle, Upload } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import type { DealDetail, DeliverableStatus } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// DELIVERABLES LIST COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface DeliverablesListProps {
  deal: DealDetail;
}

function getStatusIcon(status: DeliverableStatus) {
  switch (status) {
    case 'approved':
      return <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />;
    case 'submitted':
      return <Clock className="h-5 w-5 text-[var(--color-warning)]" />;
    case 'rejected':
      return <XCircle className="h-5 w-5 text-[var(--color-error)]" />;
    default:
      return <Circle className="h-5 w-5 text-[var(--text-muted)]" />;
  }
}

function getStatusLabel(status: DeliverableStatus) {
  switch (status) {
    case 'approved':
      return { text: 'Approved', variant: 'success' as const };
    case 'submitted':
      return { text: 'Awaiting Approval', variant: 'warning' as const };
    case 'rejected':
      return { text: 'Rejected', variant: 'error' as const };
    default:
      return { text: 'Pending', variant: 'default' as const };
  }
}

export function DeliverablesList({ deal }: DeliverablesListProps) {
  return (
    <div className="space-y-4">
      {deal.deliverables.map((deliverable) => {
        const statusLabel = getStatusLabel(deliverable.status);
        return (
          <Card key={deliverable.id}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="mt-0.5">{getStatusIcon(deliverable.status)}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h4 className="font-medium text-[var(--text-primary)]">
                        {deliverable.title}
                      </h4>
                      <p className="text-sm text-[var(--text-muted)]">{deliverable.description}</p>
                    </div>
                    <Badge variant={statusLabel.variant}>{statusLabel.text}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Due {formatDate(deliverable.dueDate)}
                    </span>
                    {deliverable.submittedAt && (
                      <span>Submitted {formatRelativeTime(deliverable.submittedAt)}</span>
                    )}
                  </div>
                </div>
              </div>
              {deliverable.status === 'pending' && (
                <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Deliverable
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default DeliverablesList;
