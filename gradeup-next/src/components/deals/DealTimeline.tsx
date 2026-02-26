'use client';

import { Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import type { DealDetail } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// DEAL TIMELINE / OVERVIEW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface DealTimelineProps {
  deal: DealDetail;
}

export function DealTimeline({ deal }: DealTimelineProps) {
  return (
    <div className="space-y-6">
      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>Deal Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[var(--text-secondary)] leading-relaxed">{deal.description}</p>
        </CardContent>
      </Card>

      {/* Key Terms */}
      <Card>
        <CardHeader>
          <CardTitle>Key Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {deal.keyTerms.map((term, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-[var(--color-primary)] flex-shrink-0" />
                <span className="text-[var(--text-secondary)]">{term}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-[var(--border-color)]" />

            <div className="space-y-4">
              {deal.timeline.map((item, index) => (
                <div key={index} className="flex items-start gap-4 relative">
                  <div className="h-6 w-6 rounded-full bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] flex items-center justify-center z-10">
                    <Calendar className="h-3 w-3 text-[var(--text-muted)]" />
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{item.event}</p>
                    <p className="text-xs text-[var(--text-muted)]">{formatDate(item.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DealTimeline;
