'use client';

import { useState } from 'react';
import { Search, Filter, Heart, Star, GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { formatCompactNumber } from '@/lib/utils';

// Mock athletes data
const mockAthletes = [
  {
    id: '1',
    name: 'Marcus Johnson',
    school: 'Duke University',
    sport: 'Basketball',
    position: 'Point Guard',
    gpa: 3.87,
    followers: 125000,
    nilValue: 125000,
    verified: true,
    saved: false,
  },
  {
    id: '2',
    name: 'Sarah Williams',
    school: 'Stanford University',
    sport: 'Soccer',
    position: 'Forward',
    gpa: 3.92,
    followers: 89000,
    nilValue: 95000,
    verified: true,
    saved: true,
  },
  {
    id: '3',
    name: 'Jordan Davis',
    school: 'Ohio State',
    sport: 'Football',
    position: 'Quarterback',
    gpa: 3.65,
    followers: 210000,
    nilValue: 250000,
    verified: true,
    saved: false,
  },
  {
    id: '4',
    name: 'Emma Chen',
    school: 'UCLA',
    sport: 'Gymnastics',
    position: 'All-Around',
    gpa: 3.95,
    followers: 150000,
    nilValue: 180000,
    verified: true,
    saved: false,
  },
  {
    id: '5',
    name: 'Tyler Brooks',
    school: 'Michigan',
    sport: 'Basketball',
    position: 'Shooting Guard',
    gpa: 3.72,
    followers: 95000,
    nilValue: 110000,
    verified: true,
    saved: true,
  },
  {
    id: '6',
    name: 'Mia Rodriguez',
    school: 'Texas',
    sport: 'Volleyball',
    position: 'Setter',
    gpa: 3.88,
    followers: 78000,
    nilValue: 85000,
    verified: true,
    saved: false,
  },
];

const sports = ['All Sports', 'Basketball', 'Football', 'Soccer', 'Volleyball', 'Gymnastics'];
const gpaFilters = ['Any GPA', '3.5+', '3.7+', '3.9+'];

function AthleteCard({ athlete }: { athlete: (typeof mockAthletes)[0] }) {
  const [isSaved, setIsSaved] = useState(athlete.saved);

  return (
    <Card hover className="group overflow-hidden">
      <CardContent className="p-0">
        {/* Header with gradient */}
        <div className="h-24 bg-gradient-to-br from-[var(--color-secondary)] to-[var(--color-magenta)] relative">
          <button
            onClick={() => setIsSaved(!isSaved)}
            className={`absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
              isSaved
                ? 'bg-[var(--color-error)] text-white'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Heart className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Avatar overlapping */}
        <div className="px-4 -mt-10 relative">
          <Avatar
            fallback={athlete.name.charAt(0)}
            size="xl"
            className="h-20 w-20 text-2xl border-4 border-[var(--bg-card)]"
          />
        </div>

        {/* Content */}
        <div className="p-4 pt-3">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                {athlete.name}
              </h3>
              <p className="text-sm text-[var(--text-muted)]">
                {athlete.school}
              </p>
            </div>
            {athlete.verified && (
              <Badge variant="success" size="sm">
                Verified
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 mb-4 text-sm">
            <Badge variant="outline">{athlete.sport}</Badge>
            <Badge variant="outline">{athlete.position}</Badge>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center p-2 rounded-[var(--radius-sm)] bg-[var(--bg-tertiary)]">
              <p className="text-xs text-[var(--text-muted)]">GPA</p>
              <p className="font-semibold text-[var(--gpa-gold)]">
                {athlete.gpa.toFixed(2)}
              </p>
            </div>
            <div className="text-center p-2 rounded-[var(--radius-sm)] bg-[var(--bg-tertiary)]">
              <p className="text-xs text-[var(--text-muted)]">Followers</p>
              <p className="font-semibold text-[var(--text-primary)]">
                {formatCompactNumber(athlete.followers)}
              </p>
            </div>
            <div className="text-center p-2 rounded-[var(--radius-sm)] bg-[var(--bg-tertiary)]">
              <p className="text-xs text-[var(--text-muted)]">NIL Value</p>
              <p className="font-semibold text-[var(--color-primary)]">
                ${formatCompactNumber(athlete.nilValue)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="primary" size="sm" className="flex-1">
              View Profile
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              Send Offer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BrandDiscoverPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('All Sports');
  const [selectedGPA, setSelectedGPA] = useState('Any GPA');

  const filteredAthletes = mockAthletes.filter((athlete) => {
    const matchesSearch = athlete.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      athlete.school.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSport = selectedSport === 'All Sports' || athlete.sport === selectedSport;
    const matchesGPA = selectedGPA === 'Any GPA' ||
      (selectedGPA === '3.5+' && athlete.gpa >= 3.5) ||
      (selectedGPA === '3.7+' && athlete.gpa >= 3.7) ||
      (selectedGPA === '3.9+' && athlete.gpa >= 3.9);
    return matchesSearch && matchesSport && matchesGPA;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Discover Athletes
        </h1>
        <p className="text-[var(--text-muted)]">
          Find and connect with student-athletes for your campaigns
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search athletes by name or school..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                className="h-10 px-3 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                {sports.map((sport) => (
                  <option key={sport} value={sport}>
                    {sport}
                  </option>
                ))}
              </select>
              <select
                value={selectedGPA}
                onChange={(e) => setSelectedGPA(e.target.value)}
                className="h-10 px-3 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                {gpaFilters.map((gpa) => (
                  <option key={gpa} value={gpa}>
                    {gpa}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          Showing {filteredAthletes.length} athletes
        </p>
      </div>

      {/* Athletes Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAthletes.map((athlete) => (
          <AthleteCard key={athlete.id} athlete={athlete} />
        ))}
      </div>

      {filteredAthletes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-[var(--text-muted)]">No athletes found matching your criteria</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
