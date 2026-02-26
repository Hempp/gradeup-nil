'use client';

import { Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { DealDetail } from './types';
import { isDealExpired } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// DEAL HEADER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface DealHeaderProps {
  deal: DealDetail;
}

export function DealHeader({ deal }: DealHeaderProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Brand Info */}
          <div className="flex items-start gap-4 flex-1">
            <Avatar fallback={deal.brand.name.charAt(0)} size="xl" />
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm text-[var(--text-muted)]">{deal.brand.name}</p>
                  <h1 className="text-xl font-bold text-[var(--text-primary)] mt-1">
                    {deal.title}
                  </h1>
                </div>
                <StatusBadge status={deal.status} />
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
                <span className="flex items-center gap-1.5 text-[var(--color-primary)] font-semibold text-lg">
                  <DollarSign className="h-5 w-5" />
                  {formatCurrency(deal.amount)}
                </span>
                <span className="text-[var(--text-muted)] flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {isDealExpired(deal.expiresAt)
                    ? `Expired ${formatDate(deal.expiresAt)}`
                    : `Expires ${formatDate(deal.expiresAt)}`}
                </span>
                <Badge variant="outline">{deal.dealType.replace('_', ' ')}</Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default DealHeader;
