'use client';

import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Ban,
  Instagram,
  Twitter,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { formatDate } from '@/lib/utils';
import type { AthleteData } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface AthleteHeaderProps {
  athlete: AthleteData;
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export function AthleteHeader({ athlete }: AthleteHeaderProps) {
  return (
    <Card className="flex-1">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar and Status */}
          <div className="flex flex-col items-center gap-3">
            <Avatar fallback={athlete.name.charAt(0)} size="xl" />
            <div className="flex flex-col items-center gap-2">
              {athlete.verified && (
                <Badge variant="success" size="sm">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
              {athlete.status === 'flagged' && (
                <Badge variant="warning" size="sm">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Flagged
                </Badge>
              )}
              {athlete.status === 'suspended' && (
                <Badge variant="error" size="sm">
                  <Ban className="h-3 w-3 mr-1" />
                  Suspended
                </Badge>
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                {athlete.name}
              </h1>
              <p className="text-[var(--text-muted)]">
                {athlete.sport} - {athlete.position}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="text-[var(--text-secondary)]">{athlete.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="text-[var(--text-secondary)]">{athlete.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="text-[var(--text-secondary)]">{athlete.location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="text-[var(--text-secondary)]">
                  Joined {formatDate(athlete.joinedAt)}
                </span>
              </div>
            </div>

            {/* Social Media */}
            <div className="flex items-center gap-4 pt-2">
              {athlete.socialMedia.instagram && (
                <a
                  href={`https://instagram.com/${athlete.socialMedia.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
                >
                  <Instagram className="h-4 w-4" />
                  {athlete.socialMedia.instagram}
                </a>
              )}
              {athlete.socialMedia.twitter && (
                <a
                  href={`https://twitter.com/${athlete.socialMedia.twitter.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
                >
                  <Twitter className="h-4 w-4" />
                  {athlete.socialMedia.twitter}
                </a>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
