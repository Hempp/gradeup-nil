'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  GraduationCap,
  Users,
  TrendingUp,
  ArrowRight,
  Shield,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { MOCK_ATHLETES, SPORTS } from '@/lib/mock-data/athletes';

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC ATHLETE DIRECTORY — Lead Generation Page
// Brands can browse athletes WITHOUT signing up.
// CTA: "Sign up to connect with this athlete"
// This page is indexed by search engines for organic traffic.
// ═══════════════════════════════════════════════════════════════════════════

interface PublicAthlete {
  id: string;
  name: string;
  school: string;
  sport: string;
  position: string;
  gpa: number;
  instagramFollowers: number;
  tiktokFollowers: number;
  verified: boolean;
  avatarUrl?: string | null;
  major?: string;
  academicYear?: string;
}

function AthletePublicCard({ athlete }: { athlete: PublicAthlete }) {
  const totalFollowers = athlete.instagramFollowers + athlete.tiktokFollowers;
  const gpaColor = athlete.gpa >= 3.5 ? 'text-[var(--marketing-lime)]'
    : athlete.gpa >= 3.0 ? 'text-[var(--accent-primary)]'
    : 'text-[var(--text-muted)]';

  return (
    <div className="card-marketing p-5 group hover:-translate-y-1 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar
          src={athlete.avatarUrl || undefined}
          fallback={athlete.name.charAt(0)}
          size="lg"
          className="ring-2 ring-white/10"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white truncate">{athlete.name}</h3>
            {athlete.verified && (
              <Shield className="h-4 w-4 text-[var(--accent-primary)] flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-[var(--marketing-gray-400)] truncate">
            {athlete.sport} · {athlete.school}
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 rounded-lg bg-white/5">
          <p className={`text-lg font-bold ${gpaColor}`}>{athlete.gpa.toFixed(1)}</p>
          <p className="text-[10px] text-[var(--marketing-gray-500)] uppercase">GPA</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/5">
          <p className="text-lg font-bold text-white">
            {totalFollowers >= 1000 ? `${(totalFollowers / 1000).toFixed(0)}K` : totalFollowers}
          </p>
          <p className="text-[10px] text-[var(--marketing-gray-500)] uppercase">Followers</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/5">
          <p className="text-lg font-bold text-white">{athlete.position}</p>
          <p className="text-[10px] text-[var(--marketing-gray-500)] uppercase">Position</p>
        </div>
      </div>

      {/* GPA Badge */}
      {athlete.gpa >= 3.5 && (
        <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-full bg-[var(--marketing-lime)]/10 border border-[var(--marketing-lime)]/20 w-fit">
          <GraduationCap className="h-3.5 w-3.5 text-[var(--marketing-lime)]" />
          <span className="text-xs font-medium text-[var(--marketing-lime)]">
            Dean&apos;s List Scholar-Athlete
          </span>
        </div>
      )}

      {/* CTA */}
      <Link href="/signup/brand" className="block">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 border-[var(--accent-primary)]/30 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 group-hover:border-[var(--accent-primary)]"
        >
          Sign Up to Connect
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </Link>
    </div>
  );
}

export default function PublicDiscoverPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [minGpa, setMinGpa] = useState(0);

  // Filter athletes — in production, this would be a server-side API call
  const filteredAthletes = useMemo(() => {
    let athletes = MOCK_ATHLETES as PublicAthlete[];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      athletes = athletes.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.school.toLowerCase().includes(q) ||
        a.sport.toLowerCase().includes(q)
      );
    }

    if (selectedSport) {
      athletes = athletes.filter(a => a.sport === selectedSport);
    }

    if (minGpa > 0) {
      athletes = athletes.filter(a => a.gpa >= minGpa);
    }

    // Sort by GPA descending — our differentiator
    return athletes.sort((a, b) => b.gpa - a.gpa);
  }, [searchQuery, selectedSport, minGpa]);

  const stats = {
    totalAthletes: MOCK_ATHLETES.length,
    avgGpa: (MOCK_ATHLETES.reduce((sum, a) => sum + (a as PublicAthlete).gpa, 0) / MOCK_ATHLETES.length).toFixed(2),
    verified: MOCK_ATHLETES.filter(a => (a as PublicAthlete).verified).length,
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-24 overflow-hidden bg-black">
        <div className="absolute inset-0">
          <div className="hero-orb hero-orb-cyan absolute -top-40 -right-40 w-[400px] h-[400px]" />
          <div className="hero-orb hero-orb-lime absolute -bottom-40 -left-40 w-[500px] h-[500px]" />
          <div className="absolute inset-0 hero-grid opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-8">
            <Users className="h-4 w-4 text-[var(--accent-primary)]" />
            <span className="text-sm font-medium text-white/90">
              {stats.totalAthletes}+ Verified Athletes
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
            Discover{' '}
            <span className="gradient-text-cyan">Scholar-Athletes</span>
          </h1>

          <p className="text-lg sm:text-xl text-[var(--marketing-gray-400)] max-w-2xl mx-auto mb-10">
            Browse NCAA student-athletes ranked by academic excellence. Higher GPA = higher value partnerships.
          </p>

          {/* Quick Stats */}
          <div className="flex justify-center gap-8 mb-10">
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--accent-primary)]">{stats.avgGpa}</p>
              <p className="text-sm text-[var(--marketing-gray-500)]">Avg GPA</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--marketing-lime)]">{stats.verified}</p>
              <p className="text-sm text-[var(--marketing-gray-500)]">Verified</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--accent-gold)]">15+</p>
              <p className="text-sm text-[var(--marketing-gray-500)]">Sports</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--marketing-gray-500)]" />
            <input
              type="search"
              placeholder="Search athletes by name, school, or sport..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-4 rounded-xl bg-[var(--marketing-gray-900)] border border-[var(--marketing-gray-700)] text-white placeholder:text-[var(--marketing-gray-500)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 transition-all"
              aria-label="Search athletes"
            />
          </div>
        </div>
      </section>

      {/* Filters + Grid */}
      <section className="py-12 bg-[var(--marketing-gray-950)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <Filter className="h-4 w-4 text-[var(--marketing-gray-500)]" />

            {/* Sport Filter */}
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="h-10 px-3 rounded-lg bg-[var(--marketing-gray-900)] border border-[var(--marketing-gray-700)] text-white text-sm focus:outline-none focus:border-[var(--accent-primary)]"
              aria-label="Filter by sport"
            >
              <option value="">All Sports</option>
              {SPORTS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* GPA Filter */}
            <select
              value={minGpa}
              onChange={(e) => setMinGpa(Number(e.target.value))}
              className="h-10 px-3 rounded-lg bg-[var(--marketing-gray-900)] border border-[var(--marketing-gray-700)] text-white text-sm focus:outline-none focus:border-[var(--accent-primary)]"
              aria-label="Minimum GPA"
            >
              <option value={0}>Any GPA</option>
              <option value={3.0}>3.0+ GPA</option>
              <option value={3.5}>3.5+ GPA (Dean&apos;s List)</option>
              <option value={3.8}>3.8+ GPA</option>
            </select>

            <span className="text-sm text-[var(--marketing-gray-500)] ml-auto">
              {filteredAthletes.length} athletes found
            </span>
          </div>

          {/* Athlete Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAthletes.map(athlete => (
              <AthletePublicCard key={athlete.id} athlete={athlete} />
            ))}
          </div>

          {filteredAthletes.length === 0 && (
            <div className="text-center py-16">
              <Users className="h-12 w-12 text-[var(--marketing-gray-700)] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No athletes found</h3>
              <p className="text-[var(--marketing-gray-400)]">Try adjusting your filters</p>
            </div>
          )}

          {/* Bottom CTA */}
          <div className="mt-12 text-center">
            <div className="card-marketing inline-block p-8 max-w-lg">
              <TrendingUp className="h-8 w-8 text-[var(--accent-primary)] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                Ready to Partner?
              </h3>
              <p className="text-[var(--marketing-gray-400)] mb-6">
                Sign up as a brand to contact athletes, create campaigns, and track ROI.
              </p>
              <Link href="/signup/brand">
                <Button size="lg" className="btn-marketing-primary gap-2">
                  Get Started Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
