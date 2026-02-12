'use client';

import { useState } from 'react';
import { Search, Filter, CheckCircle, XCircle, Clock, MoreVertical } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { formatCurrency } from '@/lib/utils';

// Mock athletes data
const mockAthletes = [
  {
    id: '1',
    name: 'Marcus Johnson',
    sport: 'Basketball',
    gpa: 3.87,
    year: 'Junior',
    earnings: 45250,
    deals: 8,
    verified: true,
    complianceStatus: 'clear',
  },
  {
    id: '2',
    name: 'Sarah Williams',
    sport: 'Soccer',
    gpa: 3.92,
    year: 'Senior',
    earnings: 38900,
    deals: 6,
    verified: true,
    complianceStatus: 'clear',
  },
  {
    id: '3',
    name: 'Jordan Davis',
    sport: 'Football',
    gpa: 3.65,
    year: 'Junior',
    earnings: 52100,
    deals: 7,
    verified: true,
    complianceStatus: 'pending',
  },
  {
    id: '4',
    name: 'Emma Chen',
    sport: 'Gymnastics',
    gpa: 3.95,
    year: 'Sophomore',
    earnings: 28500,
    deals: 4,
    verified: false,
    complianceStatus: 'issue',
  },
  {
    id: '5',
    name: 'Tyler Brooks',
    sport: 'Basketball',
    gpa: 3.72,
    year: 'Senior',
    earnings: 31200,
    deals: 5,
    verified: true,
    complianceStatus: 'clear',
  },
];

const statusFilters = ['All', 'Verified', 'Pending', 'Issues'];

function AthleteRow({ athlete }: { athlete: (typeof mockAthletes)[0] }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-tertiary)] transition-colors">
      <Avatar fallback={athlete.name.charAt(0)} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium text-[var(--text-primary)]">{athlete.name}</p>
          {athlete.verified && (
            <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
          )}
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          {athlete.sport} • {athlete.year}
        </p>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-[var(--gpa-gold)]">
          {athlete.gpa.toFixed(2)}
        </p>
        <p className="text-xs text-[var(--text-muted)]">GPA</p>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {athlete.deals}
        </p>
        <p className="text-xs text-[var(--text-muted)]">Deals</p>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-[var(--color-success)]">
          {formatCurrency(athlete.earnings)}
        </p>
        <p className="text-xs text-[var(--text-muted)]">Earnings</p>
      </div>
      <div>
        {athlete.complianceStatus === 'clear' && (
          <Badge variant="success" size="sm">Clear</Badge>
        )}
        {athlete.complianceStatus === 'pending' && (
          <Badge variant="warning" size="sm">Pending</Badge>
        )}
        {athlete.complianceStatus === 'issue' && (
          <Badge variant="error" size="sm">Issue</Badge>
        )}
      </div>
      <Button variant="ghost" size="sm">
        <MoreVertical className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function DirectorAthletesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('All');

  const filteredAthletes = mockAthletes.filter((athlete) => {
    const matchesSearch = athlete.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      athlete.sport.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filter === 'All' ||
      (filter === 'Verified' && athlete.verified) ||
      (filter === 'Pending' && athlete.complianceStatus === 'pending') ||
      (filter === 'Issues' && athlete.complianceStatus === 'issue');
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Athletes</h1>
        <p className="text-[var(--text-muted)]">
          Manage and monitor your program's athletes
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-[var(--text-muted)]">Total Athletes</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">247</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-[var(--text-muted)]">Verified</p>
            <p className="text-2xl font-bold text-[var(--color-success)]">198</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-[var(--text-muted)]">Pending</p>
            <p className="text-2xl font-bold text-[var(--color-warning)]">42</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-[var(--text-muted)]">Issues</p>
            <p className="text-2xl font-bold text-[var(--color-error)]">7</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search athletes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="flex gap-2">
              {statusFilters.map((status) => (
                <Button
                  key={status}
                  variant={filter === status ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(status)}
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Athletes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Athlete Roster ({filteredAthletes.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredAthletes.length > 0 ? (
            filteredAthletes.map((athlete) => (
              <AthleteRow key={athlete.id} athlete={athlete} />
            ))
          ) : (
            <div className="p-12 text-center">
              <p className="text-[var(--text-muted)]">No athletes found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
