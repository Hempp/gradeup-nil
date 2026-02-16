'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  FileText,
  Eye,
  TrendingUp,
  Users,
  Target,
  Search,
  Filter,
  Star,
  CheckCircle,
  Clock,
  ArrowRight,
  GraduationCap,
  Trophy,
  BarChart3,
  Handshake,
  ChevronRight,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type TabType = 'athlete' | 'brand';

interface DashboardPreviewProps {
  className?: string;
  defaultTab?: TabType;
  showCTA?: boolean;
  ctaText?: string;
  ctaHref?: string;
}

interface MockDeal {
  id: string;
  brand: string;
  brandInitial: string;
  amount: number;
  status: 'active' | 'pending' | 'completed';
  type: string;
}

interface MockAthlete {
  id: string;
  name: string;
  initials: string;
  school: string;
  sport: string;
  gpa: number;
  followers: string;
  matchScore: number;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockDeals: MockDeal[] = [
  { id: '1', brand: 'Nike', brandInitial: 'N', amount: 5000, status: 'active', type: 'Social Media' },
  { id: '2', brand: 'Gatorade', brandInitial: 'G', amount: 2500, status: 'pending', type: 'Appearance' },
  { id: '3', brand: 'Under Armour', brandInitial: 'U', amount: 3000, status: 'active', type: 'Content' },
];

const mockAthletes: MockAthlete[] = [
  { id: '1', name: 'Marcus Johnson', initials: 'MJ', school: 'Ohio State', sport: 'Football', gpa: 3.8, followers: '125K', matchScore: 95 },
  { id: '2', name: 'Sarah Williams', initials: 'SW', school: 'Stanford', sport: 'Basketball', gpa: 3.9, followers: '89K', matchScore: 92 },
  { id: '3', name: 'James Chen', initials: 'JC', school: 'UCLA', sport: 'Soccer', gpa: 3.7, followers: '67K', matchScore: 88 },
];

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

function PreviewBadge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'gold' }) {
  const variants = {
    default: 'bg-[var(--marketing-gray-800)] text-[var(--marketing-gray-300)] border-[var(--marketing-gray-700)]',
    success: 'bg-[rgba(34,197,94,0.15)] text-[#4ade80] border-[rgba(34,197,94,0.3)]',
    warning: 'bg-[rgba(245,158,11,0.15)] text-[#fbbf24] border-[rgba(245,158,11,0.3)]',
    gold: 'bg-[rgba(255,215,0,0.15)] text-[var(--marketing-gold)] border-[rgba(255,215,0,0.3)]',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${variants[variant]}`}>
      {children}
    </span>
  );
}

function PreviewStatCard({
  icon: Icon,
  label,
  value,
  trend
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  trend?: string;
}) {
  return (
    <div className="bg-[var(--marketing-gray-900)] rounded-xl p-4 border border-[var(--marketing-gray-800)] hover:border-[var(--marketing-gray-700)] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-[rgba(0,240,255,0.1)]">
          <Icon className="h-4 w-4 text-[var(--marketing-cyan)]" />
        </div>
        {trend && (
          <span className="text-xs text-[#4ade80] font-medium">+{trend}</span>
        )}
      </div>
      <div className="text-xl font-bold text-white mb-0.5">{value}</div>
      <div className="text-xs text-[var(--marketing-gray-400)]">{label}</div>
    </div>
  );
}

function StatusDot({ status }: { status: 'active' | 'pending' | 'completed' }) {
  const colors = {
    active: 'bg-[#4ade80]',
    pending: 'bg-[#fbbf24]',
    completed: 'bg-[var(--marketing-cyan)]',
  };
  return <span className={`h-2 w-2 rounded-full ${colors[status]}`} />;
}

// ============================================================================
// ATHLETE DASHBOARD PREVIEW
// ============================================================================

function AthleteDashboardMockup() {
  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <div className="bg-[var(--marketing-gray-900)] rounded-xl p-4 border border-[var(--marketing-gray-800)]">
        <div className="flex items-center gap-4">
          {/* Avatar placeholder */}
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[var(--marketing-cyan)] to-[var(--marketing-lime)] flex items-center justify-center text-black font-bold text-xl">
            JD
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-semibold text-white">Jordan Davis</span>
              <CheckCircle className="h-4 w-4 text-[var(--marketing-cyan)]" />
            </div>
            <p className="text-sm text-[var(--marketing-gray-400)]">Ohio State University - Football</p>
            <div className="flex items-center gap-3 mt-2">
              <PreviewBadge variant="gold">
                <GraduationCap className="h-3 w-3 mr-1" />
                3.8 GPA
              </PreviewBadge>
              <PreviewBadge variant="success">
                <Trophy className="h-3 w-3 mr-1" />
                Scholar Athlete
              </PreviewBadge>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <PreviewStatCard icon={DollarSign} label="Total Earnings" value="$12,500" trend="15%" />
        <PreviewStatCard icon={FileText} label="Active Deals" value="4" />
        <PreviewStatCard icon={Eye} label="Profile Views" value="2.4K" trend="8%" />
        <PreviewStatCard icon={TrendingUp} label="NIL Valuation" value="$45K" />
      </div>

      {/* Active Deals */}
      <div className="bg-[var(--marketing-gray-900)] rounded-xl p-4 border border-[var(--marketing-gray-800)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Active Deals</h3>
          <span className="text-xs text-[var(--marketing-cyan)] cursor-pointer hover:underline">View all</span>
        </div>
        <div className="space-y-3">
          {mockDeals.map((deal) => (
            <div
              key={deal.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-[var(--marketing-gray-800)]/50 hover:bg-[var(--marketing-gray-800)] transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-[var(--marketing-gray-700)] flex items-center justify-center text-white font-semibold">
                {deal.brandInitial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{deal.brand}</p>
                <p className="text-xs text-[var(--marketing-gray-400)]">{deal.type}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[var(--marketing-gold)]">
                  ${deal.amount.toLocaleString()}
                </p>
                <div className="flex items-center gap-1.5 justify-end mt-0.5">
                  <StatusDot status={deal.status} />
                  <span className="text-xs text-[var(--marketing-gray-400)] capitalize">{deal.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Matches Section */}
      <div className="bg-[var(--marketing-gray-900)] rounded-xl p-4 border border-[var(--marketing-gray-800)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Pending Opportunities</h3>
          <PreviewBadge variant="warning">3 New</PreviewBadge>
        </div>
        <div className="space-y-2">
          {[
            { brand: 'Adidas', type: 'Social Campaign', amount: '$4,000' },
            { brand: 'Red Bull', type: 'Content Creation', amount: '$2,500' },
            { brand: 'Beats', type: 'Brand Ambassador', amount: '$6,000' },
          ].map((opp, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--marketing-gray-800)]/30 border border-[var(--marketing-gray-700)]/50"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#fbbf24]" />
                <span className="text-sm text-white">{opp.brand}</span>
                <span className="text-xs text-[var(--marketing-gray-500)]">- {opp.type}</span>
              </div>
              <span className="text-sm font-medium text-[var(--marketing-gold)]">{opp.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// BRAND DASHBOARD PREVIEW
// ============================================================================

function BrandDashboardMockup() {
  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="bg-[var(--marketing-gray-900)] rounded-xl p-4 border border-[var(--marketing-gray-800)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--marketing-gray-500)]" />
            <div className="h-10 w-full rounded-lg bg-[var(--marketing-gray-800)] border border-[var(--marketing-gray-700)] pl-10 flex items-center">
              <span className="text-sm text-[var(--marketing-gray-500)]">Search athletes by name, school, sport...</span>
            </div>
          </div>
          <button className="h-10 px-4 rounded-lg bg-[var(--marketing-gray-800)] border border-[var(--marketing-gray-700)] flex items-center gap-2 text-sm text-white hover:border-[var(--marketing-gray-600)] transition-colors">
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          {['GPA 3.5+', 'Football', 'Basketball', '10K+ Followers', 'Verified'].map((filter) => (
            <span
              key={filter}
              className="px-3 py-1.5 text-xs rounded-full bg-[var(--marketing-gray-800)] text-[var(--marketing-gray-300)] border border-[var(--marketing-gray-700)] hover:border-[var(--marketing-cyan)] hover:text-[var(--marketing-cyan)] cursor-pointer transition-colors"
            >
              {filter}
            </span>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <PreviewStatCard icon={Users} label="Total Athletes" value="2,847" />
        <PreviewStatCard icon={Handshake} label="Active Deals" value="12" trend="3" />
        <PreviewStatCard icon={Target} label="Campaigns" value="5" />
        <PreviewStatCard icon={BarChart3} label="Avg ROI" value="3.2x" trend="0.4x" />
      </div>

      {/* Match Queue */}
      <div className="bg-[var(--marketing-gray-900)] rounded-xl p-4 border border-[var(--marketing-gray-800)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Recommended Athletes</h3>
          <span className="text-xs text-[var(--marketing-cyan)] cursor-pointer hover:underline">View all matches</span>
        </div>
        <div className="space-y-3">
          {mockAthletes.map((athlete) => (
            <div
              key={athlete.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-[var(--marketing-gray-800)]/50 hover:bg-[var(--marketing-gray-800)] transition-colors group cursor-pointer"
            >
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[var(--marketing-cyan)] to-[var(--marketing-magenta)] flex items-center justify-center text-black font-semibold text-sm">
                {athlete.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-white truncate">{athlete.name}</p>
                  <CheckCircle className="h-3.5 w-3.5 text-[var(--marketing-cyan)]" />
                </div>
                <p className="text-xs text-[var(--marketing-gray-400)]">
                  {athlete.school} - {athlete.sport}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <PreviewBadge variant="gold">
                    <GraduationCap className="h-3 w-3 mr-1" />
                    {athlete.gpa} GPA
                  </PreviewBadge>
                  <span className="text-xs text-[var(--marketing-gray-500)]">{athlete.followers} followers</span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 mb-1">
                  <Star className="h-4 w-4 text-[var(--marketing-gold)] fill-[var(--marketing-gold)]" />
                  <span className="text-sm font-semibold text-white">{athlete.matchScore}%</span>
                </div>
                <span className="text-xs text-[var(--marketing-gray-500)]">Match Score</span>
              </div>
              <ChevronRight className="h-5 w-5 text-[var(--marketing-gray-600)] group-hover:text-[var(--marketing-cyan)] transition-colors" />
            </div>
          ))}
        </div>
      </div>

      {/* ROI Metrics */}
      <div className="bg-[var(--marketing-gray-900)] rounded-xl p-4 border border-[var(--marketing-gray-800)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Campaign Performance</h3>
          <PreviewBadge variant="success">+18% this month</PreviewBadge>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--marketing-cyan)]">$47.2K</p>
            <p className="text-xs text-[var(--marketing-gray-400)] mt-1">Total Invested</p>
          </div>
          <div className="text-center border-x border-[var(--marketing-gray-700)]">
            <p className="text-2xl font-bold text-[var(--marketing-lime)]">$152K</p>
            <p className="text-xs text-[var(--marketing-gray-400)] mt-1">Estimated Value</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--marketing-gold)]">3.2x</p>
            <p className="text-xs text-[var(--marketing-gray-400)] mt-1">Average ROI</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DashboardPreview({
  className = '',
  defaultTab = 'athlete',
  showCTA = true,
  ctaText = 'Sign up to access your dashboard',
  ctaHref = '/signup',
}: DashboardPreviewProps) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for fade-in animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
        transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
      }}
    >
      {/* Container with glass effect */}
      <div className="relative rounded-2xl overflow-hidden border border-[var(--marketing-gray-800)] bg-[var(--marketing-black)]">
        {/* Tab Switcher */}
        <div className="flex items-center border-b border-[var(--marketing-gray-800)]">
          <button
            onClick={() => setActiveTab('athlete')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all ${
              activeTab === 'athlete'
                ? 'text-[var(--marketing-cyan)] border-b-2 border-[var(--marketing-cyan)] bg-[rgba(0,240,255,0.05)]'
                : 'text-[var(--marketing-gray-400)] hover:text-white'
            }`}
          >
            <Trophy className="h-4 w-4" />
            Athlete View
          </button>
          <button
            onClick={() => setActiveTab('brand')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all ${
              activeTab === 'brand'
                ? 'text-[var(--marketing-cyan)] border-b-2 border-[var(--marketing-cyan)] bg-[rgba(0,240,255,0.05)]'
                : 'text-[var(--marketing-gray-400)] hover:text-white'
            }`}
          >
            <Target className="h-4 w-4" />
            Brand View
          </button>
        </div>

        {/* Dashboard Preview Content */}
        <div className="relative p-4 lg:p-6 max-h-[650px] overflow-y-auto scrollbar-thin">
          {/* Preview Badge */}
          <div className="absolute top-6 right-6 z-10">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[var(--marketing-gray-900)] text-[var(--marketing-gray-400)] border border-[var(--marketing-gray-700)] backdrop-blur-sm">
              PREVIEW
            </span>
          </div>

          {/* Content with subtle blur effect */}
          <div
            className="transition-opacity duration-300"
            style={{
              filter: showCTA ? 'blur(0.5px)' : 'none',
            }}
          >
            {activeTab === 'athlete' ? <AthleteDashboardMockup /> : <BrandDashboardMockup />}
          </div>
        </div>

        {/* CTA Overlay */}
        {showCTA && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none">
            <div className="text-center pointer-events-auto">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-[var(--marketing-cyan)] mb-4">
                  {activeTab === 'athlete' ? (
                    <Trophy className="h-8 w-8 text-black" />
                  ) : (
                    <Target className="h-8 w-8 text-black" />
                  )}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {activeTab === 'athlete' ? 'Your NIL Journey Starts Here' : 'Find Your Perfect Athletes'}
              </h3>
              <p className="text-[var(--marketing-gray-400)] mb-6 max-w-md">
                {activeTab === 'athlete'
                  ? 'Track deals, manage earnings, and connect with top brands all in one place.'
                  : 'Access verified athletes, manage campaigns, and track ROI with powerful analytics.'
                }
              </p>
              <Link
                href={ctaHref}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--marketing-cyan)] text-black font-semibold hover:bg-[var(--marketing-lime)] transition-all hover:scale-105 hover:shadow-[0_0_30px_var(--marketing-cyan-glow)]"
              >
                {ctaText}
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Decorative glow effects */}
      <div
        className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, var(--marketing-cyan-glow) 0%, transparent 70%)',
          opacity: 0.3,
          filter: 'blur(40px)',
        }}
      />
    </div>
  );
}

export default DashboardPreview;
