'use client';

import {
  CheckCircle,
  Ban,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { AthleteData } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface AthleteAdminActionsProps {
  athlete: AthleteData;
  onVerify: () => void;
  onSuspend: () => void;
  onReinstate: () => void;
  onDelete: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export function AthleteAdminActions({
  athlete,
  onVerify,
  onSuspend,
  onReinstate,
  onDelete,
}: AthleteAdminActionsProps) {
  return (
    <Card className="border-l-4 border-l-[var(--color-primary)]">
      <CardHeader>
        <CardTitle>Admin Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {!athlete.verified && (
            <Button variant="primary" onClick={onVerify}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Verify Athlete
            </Button>
          )}
          {athlete.status !== 'suspended' && (
            <Button variant="outline" onClick={onSuspend}>
              <Ban className="h-4 w-4 mr-2" />
              Suspend Account
            </Button>
          )}
          {athlete.status === 'suspended' && (
            <Button variant="primary" onClick={onReinstate}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reinstate Account
            </Button>
          )}
          <Button variant="danger" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Account
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
