'use client';

import {
  GraduationCap,
  Trophy,
  DollarSign,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { AthleteData } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface AthleteStatsProps {
  athlete: AthleteData;
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export function AthleteStats({ athlete }: AthleteStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:w-80">
      {/* GPA Card */}
      <Card>
        <CardContent className="pt-4 pb-4 text-center">
          <GraduationCap className="h-6 w-6 mx-auto mb-2 text-[var(--gpa-gold)]" />
          <p className="text-2xl font-bold text-[var(--gpa-gold)]">
            {athlete.gpa.toFixed(2)}
          </p>
          <p className="text-xs text-[var(--text-muted)]">GPA</p>
        </CardContent>
      </Card>

      {/* Year/Major Card */}
      <Card>
        <CardContent className="pt-4 pb-4 text-center">
          <Trophy className="h-6 w-6 mx-auto mb-2 text-[var(--color-primary)]" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {athlete.year}
          </p>
          <p className="text-xs text-[var(--text-muted)]">{athlete.major}</p>
        </CardContent>
      </Card>

      {/* Earnings Card */}
      <Card>
        <CardContent className="pt-4 pb-4 text-center">
          <DollarSign className="h-6 w-6 mx-auto mb-2 text-[var(--color-success)]" />
          <p className="text-2xl font-bold text-[var(--color-success)]">
            {formatCurrency(athlete.totalEarnings)}
          </p>
          <p className="text-xs text-[var(--text-muted)]">Total Earnings</p>
        </CardContent>
      </Card>

      {/* Deals Card */}
      <Card>
        <CardContent className="pt-4 pb-4 text-center">
          <CheckCircle className="h-6 w-6 mx-auto mb-2 text-[var(--color-primary)]" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {athlete.activeDeals + athlete.completedDeals}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {athlete.activeDeals} Active / {athlete.completedDeals} Completed
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
