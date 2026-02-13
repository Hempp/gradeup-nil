'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Filter, Grid, List, Calendar, DollarSign, GraduationCap, ChevronDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLandingOpportunities, type LandingOpportunity } from '@/lib/hooks/use-landing-data';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type ViewMode = 'grid' | 'list';
type CompensationType = 'all' | 'cash' | 'product' | 'hybrid';

// ═══════════════════════════════════════════════════════════════════════════
// Skeleton Loading Card
// ═══════════════════════════════════════════════════════════════════════════

function OpportunityCardSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'list') {
    return (
      <div className="card-marketing p-4 animate-pulse">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="w-16 h-16 bg-[var(--marketing-gray-800)] rounded-lg" />
          <div className="flex-1 space-y-3">
            <div className="h-5 bg-[var(--marketing-gray-800)] rounded w-3/4" />
            <div className="h-4 bg-[var(--marketing-gray-800)] rounded w-1/2" />
            <div className="flex gap-4">
              <div className="h-4 bg-[var(--marketing-gray-800)] rounded w-20" />
              <div className="h-4 bg-[var(--marketing-gray-800)] rounded w-24" />
            </div>
          </div>
          <div className="h-10 bg-[var(--marketing-gray-800)] rounded w-28" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-marketing overflow-hidden animate-pulse">
      <div className="p-4 border-b border-[var(--marketing-gray-800)]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[var(--marketing-gray-800)] rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-[var(--marketing-gray-800)] rounded w-3/4" />
            <div className="h-4 bg-[var(--marketing-gray-800)] rounded w-1/2" />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="h-4 bg-[var(--marketing-gray-800)] rounded w-full" />
          <div className="h-4 bg-[var(--marketing-gray-800)] rounded w-2/3" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 bg-[var(--marketing-gray-800)] rounded w-16" />
          <div className="h-6 bg-[var(--marketing-gray-800)] rounded w-20" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-[var(--marketing-gray-800)] rounded w-full" />
          <div className="h-4 bg-[var(--marketing-gray-800)] rounded w-full" />
          <div className="h-4 bg-[var(--marketing-gray-800)] rounded w-full" />
        </div>
        <div className="h-10 bg-[var(--marketing-gray-800)] rounded w-full" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Hero Section
// ═══════════════════════════════════════════════════════════════════════════

function HeroSection() {
  return (
    <section className="relative pt-20 lg:pt-24 pb-12 px-4 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--marketing-gray-900)] to-black" />

      {/* Accent orbs - positioned absolutely and marked as decorative */}
      <div
        className="absolute w-[300px] h-[300px] rounded-full opacity-30 blur-[100px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--marketing-cyan) 0%, transparent 70%)',
          top: '-100px',
          left: '-100px',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute w-[250px] h-[250px] rounded-full opacity-25 blur-[80px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--marketing-magenta) 0%, transparent 70%)',
          bottom: '-50px',
          right: '-50px',
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-4xl mx-auto text-center">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
          Find Your Perfect{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--marketing-cyan)] to-[var(--marketing-lime)]">
            NIL Opportunity
          </span>
        </h1>
        <p className="text-base md:text-lg text-[var(--marketing-gray-400)] max-w-2xl mx-auto mb-6">
          Browse exclusive deals from top brands. Your GPA unlocks better opportunities.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/signup/athlete">
            <Button className="btn-marketing-primary px-6 py-2.5">
              Join as Athlete
            </Button>
          </Link>
          <Link href="/signup/brand">
            <Button
              variant="outline"
              className="border-[var(--marketing-cyan)] text-[var(--marketing-cyan)] hover:bg-[var(--marketing-cyan)]/10 px-6 py-2.5"
            >
              Post an Opportunity
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Filter Bar
// ═══════════════════════════════════════════════════════════════════════════

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  compensationType: CompensationType;
  onCompensationTypeChange: (value: CompensationType) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  resultCount: number;
}

function FilterBar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  compensationType,
  onCompensationTypeChange,
  viewMode,
  onViewModeChange,
  resultCount,
}: FilterBarProps) {
  const categories = ['all', 'Ambassador', 'Social Media', 'Product', 'Local', 'Feature'];
  const compensationTypes: { value: CompensationType; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: 'cash', label: 'Cash' },
    { value: 'product', label: 'Product' },
    { value: 'hybrid', label: 'Hybrid' },
  ];

  return (
    <div className="sticky top-16 lg:top-20 z-40 glass-marketing py-4 border-b border-[var(--marketing-gray-800)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Search */}
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--marketing-gray-500)]" />
            <Input
              type="text"
              placeholder="Search opportunities..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-[var(--marketing-gray-900)] border-[var(--marketing-gray-700)] text-white placeholder:text-[var(--marketing-gray-500)] focus:border-[var(--marketing-cyan)]"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Category filter */}
            <div className="relative">
              <select
                value={category}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="appearance-none bg-[var(--marketing-gray-900)] border border-[var(--marketing-gray-700)] text-white rounded-lg px-4 py-2 pr-10 text-sm focus:border-[var(--marketing-cyan)] focus:outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.slice(1).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--marketing-gray-500)] pointer-events-none" />
            </div>

            {/* Compensation type filter */}
            <div className="relative">
              <select
                value={compensationType}
                onChange={(e) => onCompensationTypeChange(e.target.value as CompensationType)}
                className="appearance-none bg-[var(--marketing-gray-900)] border border-[var(--marketing-gray-700)] text-white rounded-lg px-4 py-2 pr-10 text-sm focus:border-[var(--marketing-cyan)] focus:outline-none cursor-pointer"
              >
                {compensationTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--marketing-gray-500)] pointer-events-none" />
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-1 bg-[var(--marketing-gray-900)] border border-[var(--marketing-gray-700)] rounded-lg p-1">
              <button
                onClick={() => onViewModeChange('grid')}
                className={cn(
                  'p-2 rounded transition-colors',
                  viewMode === 'grid'
                    ? 'bg-[var(--marketing-cyan)] text-black'
                    : 'text-[var(--marketing-gray-400)] hover:text-white'
                )}
                aria-label="Grid view"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => onViewModeChange('list')}
                className={cn(
                  'p-2 rounded transition-colors',
                  viewMode === 'list'
                    ? 'bg-[var(--marketing-cyan)] text-black'
                    : 'text-[var(--marketing-gray-400)] hover:text-white'
                )}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results count */}
        <p className="mt-4 text-sm text-[var(--marketing-gray-400)]">
          Showing <span className="text-[var(--marketing-cyan)] font-semibold">{resultCount}</span>{' '}
          {resultCount === 1 ? 'opportunity' : 'opportunities'}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Opportunity Card (Grid View)
// ═══════════════════════════════════════════════════════════════════════════

interface OpportunityCardProps {
  opportunity: LandingOpportunity;
  viewMode: ViewMode;
}

function OpportunityCard({ opportunity, viewMode }: OpportunityCardProps) {
  const deadlineDate = new Date(opportunity.deadline);
  const isExpiringSoon = deadlineDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000; // 7 days

  const compensationBadgeColor = {
    cash: 'bg-[var(--marketing-lime)]/20 text-[var(--marketing-lime)] border-[var(--marketing-lime)]/30',
    product: 'bg-[var(--marketing-cyan)]/20 text-[var(--marketing-cyan)] border-[var(--marketing-cyan)]/30',
    hybrid: 'bg-[var(--marketing-gold)]/20 text-[var(--marketing-gold)] border-[var(--marketing-gold)]/30',
  };

  if (viewMode === 'list') {
    return (
      <div className="card-marketing p-4 hover:border-[var(--marketing-cyan)]/50 transition-all group hover-lift animate-reveal-up">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          {/* Brand logo placeholder */}
          <div className="w-16 h-16 bg-[var(--marketing-gray-800)] rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-[var(--marketing-cyan)]">
              {opportunity.brandName.charAt(0)}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white group-hover:text-[var(--marketing-cyan)] transition-colors">
                  {opportunity.title}
                </h3>
                <p className="text-sm text-[var(--marketing-gray-400)]">{opportunity.brandName}</p>
              </div>
              {opportunity.featured && (
                <span className="px-2 py-1 text-xs font-medium bg-[var(--marketing-gold)]/20 text-[var(--marketing-gold)] rounded border border-[var(--marketing-gold)]/30">
                  Featured
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mt-3 text-sm text-[var(--marketing-gray-400)]">
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {opportunity.compensation}
              </span>
              <span className="flex items-center gap-1">
                <GraduationCap className="h-4 w-4" />
                Min GPA: {opportunity.minGpa}
              </span>
              <span className={cn('flex items-center gap-1', isExpiringSoon && 'text-[var(--marketing-gold)]')}>
                <Calendar className="h-4 w-4" />
                {deadlineDate.toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Action */}
          <Link href="/signup/athlete">
            <Button className="btn-marketing-primary whitespace-nowrap">Apply Now</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className="card-marketing overflow-hidden hover:border-[var(--marketing-cyan)]/50 transition-all group flex flex-col hover-lift animate-reveal-up">
      {/* Header */}
      <div className="p-4 border-b border-[var(--marketing-gray-800)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Brand logo placeholder */}
            <div className="w-12 h-12 bg-[var(--marketing-gray-800)] rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-[var(--marketing-cyan)]">
                {opportunity.brandName.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-white group-hover:text-[var(--marketing-cyan)] transition-colors line-clamp-1">
                {opportunity.title}
              </h3>
              <p className="text-sm text-[var(--marketing-gray-400)]">{opportunity.brandName}</p>
            </div>
          </div>
          {opportunity.featured && (
            <span className="px-2 py-1 text-xs font-medium bg-[var(--marketing-gold)]/20 text-[var(--marketing-gold)] rounded border border-[var(--marketing-gold)]/30 flex-shrink-0">
              Featured
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex-1">
        <p className="text-sm text-[var(--marketing-gray-400)] line-clamp-2 mb-4">
          {opportunity.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span
            className={cn(
              'px-2 py-1 text-xs font-medium rounded border',
              compensationBadgeColor[opportunity.compensationType]
            )}
          >
            {opportunity.compensationType.charAt(0).toUpperCase() + opportunity.compensationType.slice(1)}
          </span>
          <span className="px-2 py-1 text-xs font-medium bg-[var(--marketing-gray-800)] text-[var(--marketing-gray-300)] rounded border border-[var(--marketing-gray-700)]">
            {opportunity.category}
          </span>
        </div>

        {/* Meta */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between text-[var(--marketing-gray-400)]">
            <span className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Compensation
            </span>
            <span className="text-white font-medium">{opportunity.compensation}</span>
          </div>
          <div className="flex items-center justify-between text-[var(--marketing-gray-400)]">
            <span className="flex items-center gap-1">
              <GraduationCap className="h-4 w-4" />
              Min GPA
            </span>
            <span className="gpa-badge-marketing text-xs px-2 py-0.5">{opportunity.minGpa}</span>
          </div>
          <div className="flex items-center justify-between text-[var(--marketing-gray-400)]">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Deadline
            </span>
            <span className={cn('font-medium', isExpiringSoon ? 'text-[var(--marketing-gold)]' : 'text-white')}>
              {deadlineDate.toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--marketing-gray-800)]">
        <Link href="/signup/athlete" className="block">
          <Button className="w-full btn-marketing-primary">Apply Now</Button>
        </Link>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CTA Section with Scroll Animation
// ═══════════════════════════════════════════════════════════════════════════

function CTASection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-20 px-4 bg-gradient-to-r from-[var(--marketing-cyan)]/10 via-[var(--marketing-magenta)]/5 to-[var(--marketing-cyan)]/10 border-t border-[var(--marketing-gray-800)] overflow-hidden"
    >
      <div className="max-w-4xl mx-auto text-center">
        {/* Stats row */}
        <div
          className={`flex flex-wrap justify-center gap-8 mb-10 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="text-center">
            <div className="text-3xl font-bold text-[var(--marketing-cyan)]">$127K+</div>
            <div className="text-sm text-[var(--marketing-gray-500)]">Paid to Athletes</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[var(--marketing-lime)]">847</div>
            <div className="text-sm text-[var(--marketing-gray-500)]">Active Athletes</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[var(--marketing-gold)]">68%</div>
            <div className="text-sm text-[var(--marketing-gray-500)]">Match Rate</div>
          </div>
        </div>

        <div
          className={`transition-all duration-700 delay-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-6">
            <Sparkles className="h-4 w-4 text-[var(--marketing-gold)]" />
            <span className="text-sm text-white/80">Join 847 athletes already earning</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Start Earning?
          </h2>
          <p className="text-lg text-[var(--marketing-gray-400)] mb-8 max-w-2xl mx-auto">
            Your GPA is your competitive advantage. Higher grades unlock better deals.
          </p>
        </div>

        <div
          className={`flex flex-col sm:flex-row gap-4 justify-center transition-all duration-700 delay-300 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <Link href="/signup/athlete">
            <Button className="btn-marketing-primary px-8 py-3 text-lg">
              Create Your Profile
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="border-white/30 text-white hover:bg-white/10 px-8 py-3 text-lg"
          >
            Browse More Deals
          </Button>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════

export default function OpportunitiesPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [compensationType, setCompensationType] = useState<CompensationType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const { data: opportunities, loading } = useLandingOpportunities({
    search,
    category: category === 'all' ? undefined : category,
    compensationType: compensationType === 'all' ? undefined : compensationType,
  });

  // Sort: featured first, then by deadline
  const sortedOpportunities = useMemo(() => {
    return [...opportunities].sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }, [opportunities]);

  return (
    <div className="min-h-screen bg-black">
      <HeroSection />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        compensationType={compensationType}
        onCompensationTypeChange={setCompensationType}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        resultCount={sortedOpportunities.length}
      />

      {/* Opportunities Grid/List */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'flex flex-col gap-4'
            )}
          >
            {[...Array(6)].map((_, i) => (
              <OpportunityCardSkeleton key={i} viewMode={viewMode} />
            ))}
          </div>
        ) : sortedOpportunities.length === 0 ? (
          <div className="text-center py-20">
            <Filter className="h-16 w-16 text-[var(--marketing-gray-600)] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No opportunities found</h3>
            <p className="text-[var(--marketing-gray-400)] mb-6">
              Try adjusting your filters or search query.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearch('');
                setCategory('all');
                setCompensationType('all');
              }}
              className="border-[var(--marketing-cyan)] text-[var(--marketing-cyan)] hover:bg-[var(--marketing-cyan)]/10"
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children'
                : 'flex flex-col gap-4 stagger-children'
            )}
          >
            {sortedOpportunities.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} viewMode={viewMode} />
            ))}
          </div>
        )}
      </section>

      {/* CTA Section with Stats */}
      <CTASection />
    </div>
  );
}
