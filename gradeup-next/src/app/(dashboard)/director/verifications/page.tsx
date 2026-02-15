'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  BadgeCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  GraduationCap,
  Trophy,
  FileText,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { VerificationQueue } from '@/components/director/VerificationQueue';
import { useDirectorVerifications } from '@/lib/hooks/use-director-verifications';

// ═══════════════════════════════════════════════════════════════════════════
// Stats Cards
// ═══════════════════════════════════════════════════════════════════════════

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  description?: string;
}

function StatsCard({ title, value, icon, color, description }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${color}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════

export default function VerificationsPage() {
  // Mock school ID - in production this would come from auth context
  const schoolId = 'mock-school-id';

  const { pendingCount, requests, refresh } = useDirectorVerifications(schoolId);

  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate stats by type
  const enrollmentPending = requests.filter(r => r.type === 'enrollment').length;
  const gradesPending = requests.filter(r => r.type === 'grades').length;
  const sportPending = requests.filter(r => r.type === 'sport').length;
  const statsPending = requests.filter(r => r.type === 'stats').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BadgeCheck className="h-6 w-6 text-primary" />
            Verification Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and approve athlete verification requests
          </p>
        </div>
        <Button variant="outline" onClick={() => refresh()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Total Pending"
          value={pendingCount}
          icon={<Clock className="h-5 w-5 text-yellow-500" />}
          color="bg-yellow-500/10"
          description="Awaiting review"
        />
        <StatsCard
          title="Enrollment"
          value={enrollmentPending}
          icon={<GraduationCap className="h-5 w-5 text-blue-500" />}
          color="bg-blue-500/10"
        />
        <StatsCard
          title="Grades"
          value={gradesPending}
          icon={<FileText className="h-5 w-5 text-purple-500" />}
          color="bg-purple-500/10"
        />
        <StatsCard
          title="Sport"
          value={sportPending}
          icon={<Trophy className="h-5 w-5 text-orange-500" />}
          color="bg-orange-500/10"
        />
        <StatsCard
          title="Stats"
          value={statsPending}
          icon={<BarChart3 className="h-5 w-5 text-green-500" />}
          color="bg-green-500/10"
        />
      </div>

      {/* Quick Tips */}
      {pendingCount > 5 && (
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="py-4">
            <p className="text-sm text-blue-400">
              <strong>Tip:</strong> You have {pendingCount} pending verifications. Use the &ldquo;Select All&rdquo; and &ldquo;Approve Selected&rdquo; buttons to process multiple requests at once.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by athlete name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filterType}
              onChange={setFilterType}
              placeholder="Filter by type"
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'enrollment', label: 'Enrollment' },
                { value: 'grades', label: 'Grades' },
                { value: 'sport', label: 'Sport' },
                { value: 'stats', label: 'Stats' },
              ]}
              className="w-full sm:w-[180px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Verification Queue */}
      <VerificationQueue schoolId={schoolId} />

      {/* Verification Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Verification Guidelines</CardTitle>
          <CardDescription>
            Best practices for reviewing athlete verification requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                When to Approve
              </h4>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                <li>Athlete&apos;s enrollment is confirmed in school records</li>
                <li>GPA matches official transcript</li>
                <li>Sport participation confirmed on roster</li>
                <li>Stats verified against official team records</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                When to Reject
              </h4>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                <li>Information doesn&apos;t match school records</li>
                <li>Athlete is no longer enrolled or on roster</li>
                <li>Academic probation or eligibility issues</li>
                <li>Incomplete or inaccurate data submitted</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
