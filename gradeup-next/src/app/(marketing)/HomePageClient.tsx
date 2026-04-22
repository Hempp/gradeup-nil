'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  CheckCircle2,
  BadgeCheck,
  User,
  Shield,
  Zap,
  Star,
  Clock,
  Play,
  DollarSign,
  TrendingUp,
  Award,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useFeaturedAthletes,
  useLandingStats,
  useTestimonials,
  type FeaturedAthlete,
} from '@/lib/hooks/use-landing-data';
// Direct import (not barrel) — the marketing barrel re-exports server
// components like CaseStudyTagStrip that pull next/headers in via supabase/server.
// Bundling that into this client component's graph produces a runtime 500.
import { LazyDashboardPreview } from '@/components/marketing/lazy-dashboard-preview';

// ═══════════════════════════════════════════════════════════════════════════
// HERO SECTION
// ═══════════════════════════════════════════════════════════════════════════

// Memoized AnimatedCounter to prevent unnecessary re-renders
const AnimatedCounter = memo(function AnimatedCounter({
  target,
  suffix = '',
  prefix = '',
  skipAnimation = false
}: {
  target: number;
  suffix?: string;
  prefix?: string;
  skipAnimation?: boolean;
}) {
  // Initialize with target value if skipping animation to avoid cascading setState
  const [count, setCount] = useState(() => skipAnimation ? target : 0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimatedRef = useRef(skipAnimation);
  const animationFrameRef = useRef<number | null>(null);

  // Stable animation callback using useCallback
  const startAnimation = useCallback(() => {
    const duration = 1500;
    const startTime = performance.now();
    const targetValue = target;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing function for natural feel
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(targetValue * eased * 10) / 10);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCount(targetValue);
      }
    };
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [target]);

  useEffect(() => {
    // Skip observer setup entirely if animation disabled or already animated
    if (skipAnimation || hasAnimatedRef.current) {
      // Only update if different to avoid unnecessary re-render
      setCount(prevCount => prevCount === target ? prevCount : target);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimatedRef.current) {
          hasAnimatedRef.current = true;
          startAnimation();
        }
      },
      { threshold: 0.3, rootMargin: '50px' }
    );

    const currentRef = ref.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      observer.disconnect();
      // Cleanup animation frame on unmount
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [target, skipAnimation, startAnimation]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
});

// Custom hook for reduced motion preference that avoids hydration mismatches
function useReducedMotion(): boolean {
  // Start with false on server and initial client render to ensure hydration match
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Only check media query after hydration
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Use functional update to avoid unnecessary re-render if value matches
    setPrefersReducedMotion(prev => prev === mediaQuery.matches ? prev : mediaQuery.matches);

    // Listen for changes
    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

function HeroSection() {
  const prefersReducedMotion = useReducedMotion();
  const { data: stats } = useLandingStats();

  return (
    <section
      className="relative min-h-[calc(100vh-64px)] sm:min-h-screen flex items-center overflow-hidden bg-black"
      aria-label="Hero - Turn your GPA into earnings"
      role="region"
    >
      {/* Background Effects - simplified for performance */}
      <div className="absolute inset-0">
        {/* Static gradient background for better performance */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background: 'radial-gradient(ellipse at 20% 20%, rgba(0, 240, 255, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(255, 0, 200, 0.1) 0%, transparent 50%)',
          }}
        />

        {/* Only show morphing blobs if reduced motion is not preferred */}
        {!prefersReducedMotion && (
          <>
            <div className="blob-cyan blob-morph absolute -top-40 -left-40 w-[500px] h-[500px] will-change-transform" />
            <div className="blob-magenta blob-morph absolute -bottom-40 -right-40 w-[600px] h-[600px] will-change-transform" style={{ animationDelay: '-3s' }} />
          </>
        )}

        {/* Grid pattern */}
        <div className="absolute inset-0 hero-grid opacity-30" />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-success)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-success)]"></span>
              </span>
              <span className="text-sm font-medium text-white/90">NCAA Compliant Platform</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-white mb-6">
              <span className="block animate-float-slow">Your GPA</span>
              <span className="block gradient-text-cyan text-glow-animated">Is Worth</span>
              <span className="block bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-success)] bg-clip-text text-transparent text-glow-gold">
                Money.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-[var(--marketing-gray-400)] max-w-xl mx-auto lg:mx-0 mb-8">
              The only NIL platform where grades unlock better deals. Higher GPA = higher value.
              Get paid for your excellence.
            </p>

            {/* Dual-audience acknowledgment */}
            <p className="text-sm text-[var(--marketing-gray-500)] max-w-xl mx-auto lg:mx-0 mb-8">
              Built for scholar-athletes from 8th grade through senior year of college, with the parents, coaches, and athletic directors who support them.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/signup/athlete">
                <Button
                  size="lg"
                  className="w-full sm:w-auto btn-marketing-primary gap-2 shadow-lg"
                  aria-label="Join GradeUp as a student athlete - free signup"
                >
                  Join as Athlete - It&apos;s Free
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/signup/brand">
                <Button
                  size="lg"
                  className="w-full sm:w-auto btn-marketing-outline"
                  aria-label="Partner with GradeUp as a brand"
                >
                  Partner as Brand
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 mt-6 text-sm text-[var(--marketing-gray-500)]">
              <div className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
                <span>NCAA Compliant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
                <span>No credit card</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-[var(--accent-success)]" aria-hidden="true" />
                <span>2-min signup</span>
              </div>
            </div>

            {/* Stats - Specific Numbers */}
            <div
              className="flex flex-wrap justify-center lg:justify-start gap-8 mt-12 pt-8 border-t border-white/10"
              role="list"
              aria-label="Platform statistics"
            >
              <div className="text-center" role="listitem">
                <div className="text-3xl sm:text-4xl font-bold text-[var(--accent-success)]" aria-live="polite">
                  <AnimatedCounter target={127450} prefix="$" skipAnimation={prefersReducedMotion} />
                </div>
                <div className="text-sm text-[var(--marketing-gray-500)] mt-1">Paid to Athletes</div>
              </div>
              <div className="w-px h-12 bg-white/10 hidden sm:block" aria-hidden="true" />
              <div className="text-center" role="listitem">
                <div className="text-3xl sm:text-4xl font-bold text-white" aria-live="polite">
                  <AnimatedCounter target={stats.athletes} skipAnimation={prefersReducedMotion} />
                </div>
                <div className="text-sm text-[var(--marketing-gray-500)] mt-1">Verified Athletes</div>
              </div>
              <div className="w-px h-12 bg-white/10 hidden sm:block" aria-hidden="true" />
              <div className="text-center" role="listitem">
                <div className="text-3xl sm:text-4xl font-bold text-[var(--accent-gold)]" aria-live="polite">
                  <AnimatedCounter target={stats.avgGpa} skipAnimation={prefersReducedMotion} />
                </div>
                <div className="text-sm text-[var(--marketing-gray-500)] mt-1">Avg Athlete GPA</div>
              </div>
            </div>
          </div>

          {/* Hero Card - Enhanced */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-[var(--accent-primary)]/20 to-[var(--accent-tertiary)]/20 rounded-3xl blur-2xl animate-marketing-glow" />

              {/* Athlete Card */}
              <div className="relative card-marketing p-1 shadow-2xl">
                <div className="bg-gradient-to-br from-white/5 to-transparent rounded-xl overflow-hidden">
                  {/* Image */}
                  <div className="relative h-64 sm:h-80 w-64 sm:w-72">
                    <Image
                      src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=500&fit=crop&crop=face"
                      alt="Jasmine Taylor, verified Stanford Women's Basketball player with 3.92 GPA"
                      fill
                      className="object-cover"
                      priority
                      sizes="(max-width: 640px) 256px, 288px"
                    />
                    {/* Verified Badge */}
                    <div className="absolute top-3 right-3 verified-badge-marketing p-1.5 shadow-lg">
                      <BadgeCheck className="h-5 w-5" />
                    </div>
                    {/* Earnings Badge */}
                    <div className="absolute top-3 left-3 bg-[var(--accent-success)]/90 text-black px-2 py-1 rounded-full text-xs font-bold">
                      $12,400 earned
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-5 bg-gradient-to-t from-[var(--marketing-gray-900)] to-transparent -mt-16 relative">
                    <div className="text-xs font-semibold text-[var(--accent-primary)] tracking-wider mb-1">
                      STANFORD UNIVERSITY
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">Jasmine Taylor</h3>
                    <p className="text-[var(--marketing-gray-400)] text-sm mb-4">Women&apos;s Basketball • Computer Science</p>

                    {/* GPA Badge */}
                    <div className="gpa-badge-marketing inline-flex items-center gap-2">
                      <span className="text-2xl font-bold">3.92</span>
                      <span className="text-xs font-medium opacity-80">GPA</span>
                    </div>

                    {/* Tags */}
                    <div className="flex gap-2 mt-4">
                      <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium">
                        Dean&apos;s List
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium">
                        6 Active Deals
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PARTNER LOGOS SECTION (Replaces plain text)
// ═══════════════════════════════════════════════════════════════════════════

function PartnerLogosSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // If reduced motion is preferred, set visible immediately but only after initial render
    if (prefersReducedMotion) {
      // Schedule state update to avoid synchronous setState during render
      const timeoutId = setTimeout(() => {
        setIsVisible(true);
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const currentRef = sectionRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  // School logos - only keeping ones that display correctly
  const schools = [
    { name: 'Stanford', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Stanford_Cardinal_logo.svg', color: '#8C1515' },
    { name: 'Ohio State', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Ohio_State_Buckeyes_logo.svg', color: '#BB0000' },
    { name: 'Michigan', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fb/Michigan_Wolverines_logo.svg', color: '#FFCB05' },
    { name: 'USC', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/94/USC_Trojans_logo.svg', color: '#990000' },
    { name: 'Alabama', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Alabama_Crimson_Tide_logo.svg', color: '#9E1B32' },
    { name: 'Texas', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/8d/Texas_Longhorns_logo.svg', color: '#BF5700' },
  ];

  // Brand logos - only keeping ones that display correctly
  const brands = [
    { name: 'Nike', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg', invert: true },
    { name: 'Under Armour', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Under_armour_logo.svg', invert: true },
    { name: 'Adidas', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg', invert: true },
    { name: 'Cricket Wireless', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Cricket_Wireless_logo.svg/1200px-Cricket_Wireless_logo.svg.png', invert: false },
    { name: 'Subway', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Subway_2016_logo.svg/1200px-Subway_2016_logo.svg.png', invert: false },
    { name: "Papa John's", logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Papa_John%27s_new_logo.svg/1200px-Papa_John%27s_new_logo.svg.png', invert: false },
    { name: 'Gatorade', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Gatorade_logo.svg/1200px-Gatorade_logo.svg.png', invert: true },
    { name: 'Chipotle', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Chipotle_Mexican_Grill_logo.svg/1200px-Chipotle_Mexican_Grill_logo.svg.png', invert: true },
  ];

  return (
    <section
      ref={sectionRef}
      className="py-16 bg-[var(--marketing-gray-950)] border-y border-[var(--marketing-gray-800)] overflow-hidden"
      aria-label="Trusted by top universities"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Animated Header */}
        <div
          className={`text-center mb-10 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <p className="text-sm font-medium text-[var(--marketing-gray-500)]">
            Athletes from 40+ universities trust GradeUp
          </p>
        </div>

        {/* School Logos Grid - Staggered Animation */}
        <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
          {schools.map((school, index) => (
            <div
              key={school.name}
              className={`group flex flex-col items-center gap-2 transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-90'
              }`}
              style={{ transitionDelay: isVisible ? `${index * 80}ms` : '0ms' }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center p-2 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg"
                style={{ backgroundColor: school.color + '25', boxShadow: `0 4px 20px ${school.color}30` }}
              >
                <Image
                  src={school.logo}
                  alt={`${school.name} logo`}
                  width={40}
                  height={40}
                  className="w-10 h-10 object-contain"
                  loading="lazy"
                />
              </div>
              <span className="text-xs text-[var(--marketing-gray-500)] group-hover:text-white transition-colors font-medium">
                {school.name}
              </span>
            </div>
          ))}
        </div>

        {/* Brand Partners - Animated */}
        <div
          className={`mt-12 pt-10 border-t border-[var(--marketing-gray-800)] transition-all duration-700 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDelay: isVisible ? '600ms' : '0ms' }}
        >
          <p className="text-center text-sm font-medium text-[var(--marketing-gray-500)] mb-8">
            Brand partners actively recruiting
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            {brands.map((brand, index) => (
              <div
                key={brand.name}
                className={`group flex items-center justify-center hover:scale-110 transition-all duration-300 px-4 py-3 rounded-lg hover:bg-white/5 ${
                  isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                }`}
                style={{ transitionDelay: isVisible ? `${700 + index * 100}ms` : '0ms' }}
                title={brand.name}
              >
                <Image
                  src={brand.logo}
                  alt={`${brand.name} logo`}
                  width={100}
                  height={36}
                  className={`h-7 md:h-9 w-auto object-contain transition-opacity ${
                    brand.invert ? 'brightness-0 invert opacity-70 group-hover:opacity-100' : 'opacity-90 group-hover:opacity-100'
                  }`}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FEATURED ATHLETES SECTION
// ═══════════════════════════════════════════════════════════════════════════

// Memoized AthleteCard to prevent re-renders when parent re-renders
const AthleteCard = memo(function AthleteCard({ athlete }: { athlete: FeaturedAthlete }) {
  return (
    <div className="group relative card-marketing overflow-hidden hover-lift animate-reveal-up card-shine spotlight-hover">
      {/* Image */}
      <div className="relative h-56 overflow-hidden">
        <Image
          src={athlete.image}
          alt={athlete.name}
          fill
          className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {athlete.verified && (
          <div className="absolute top-3 right-3 verified-badge-marketing p-1.5 shadow-md">
            <BadgeCheck className="h-4 w-4" />
          </div>
        )}
        {/* Earnings Badge - Top left */}
        {(athlete as FeaturedAthlete & { earnings?: string }).earnings && (
          <div className="absolute top-3 left-3 bg-[var(--accent-success)]/90 text-black px-2 py-1 rounded-full text-xs font-bold shadow-md">
            {(athlete as FeaturedAthlete & { earnings?: string }).earnings}
          </div>
        )}
        {/* GPA Badge - Bottom left */}
        <div className="absolute bottom-3 left-3 gpa-badge-marketing shadow-md">
          <span className="text-lg font-bold">{athlete.gpa.toFixed(2)}</span>
          <span className="text-xs ml-1 opacity-80">GPA</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="text-xs font-semibold text-[var(--accent-primary)] tracking-wider mb-1">
          {athlete.school.toUpperCase()}
        </div>
        <h3 className="text-lg font-bold text-white mb-1">{athlete.name}</h3>
        <p className="text-sm text-[var(--marketing-gray-400)] mb-3">
          {athlete.sport}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-[var(--marketing-gray-400)]">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {athlete.followers}
          </span>
          {athlete.deals > 0 && (
            <span>{athlete.deals} deals</span>
          )}
        </div>
      </div>
    </div>
  );
});

function FeaturedAthletesSection() {
  const { data: athletes, loading } = useFeaturedAthletes(4);

  return (
    <section
      id="athletes"
      className="section-spacing-md bg-[var(--marketing-gray-950)]"
      aria-label="Featured scholar-athletes"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-sm font-medium mb-4 border border-[var(--accent-primary)]/20">
            Real Athletes, Real Earnings
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Scholar-Athletes <span className="text-[var(--accent-gold)]">Getting Paid</span>
          </h2>
          <p className="text-[var(--marketing-gray-400)] max-w-2xl mx-auto">
            Meet verified athletes earning through GradeUp. Their GPA is their competitive advantage.
          </p>
        </div>

        {/* Athletes Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
          {loading ? (
            // Loading skeleton
            [...Array(4)].map((_, i) => (
              <div key={i} className="card-marketing animate-pulse">
                <div className="h-48 bg-[var(--marketing-gray-800)]" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-[var(--marketing-gray-800)] rounded w-1/2" />
                  <div className="h-5 bg-[var(--marketing-gray-800)] rounded w-3/4" />
                  <div className="h-4 bg-[var(--marketing-gray-800)] rounded w-1/3" />
                </div>
              </div>
            ))
          ) : (
            athletes.map((athlete) => (
              <AthleteCard key={athlete.id} athlete={athlete} />
            ))
          )}
        </div>

        {/* Enhanced CTA */}
        <div className="mt-16 text-center">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-white mb-2">See Yourself Here?</h3>
            <p className="text-[var(--marketing-gray-400)] text-lg">
              Your academic excellence + athletic talent = opportunity
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup/athlete">
              <Button
                size="lg"
                className="btn-marketing-primary gap-2 w-full sm:w-auto"
              >
                Create Your Profile - Free
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            </Link>
            <Link href="/opportunities">
              <Button size="lg" className="btn-marketing-outline w-full sm:w-auto">
                Browse Opportunities
              </Button>
            </Link>
          </div>

          {/* Trust Reinforcement */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-sm text-[var(--marketing-gray-500)]">
            <div className="flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
              <span>All athletes verified</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
              <span>NCAA compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[var(--accent-success)]" aria-hidden="true" />
              <span>Deals in 48hrs</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOW IT WORKS SECTION - Redesigned with Video
// ═══════════════════════════════════════════════════════════════════════════

const steps = [
  {
    number: '01',
    icon: User,
    title: 'Create Profile',
    description: 'Sign up and connect your academic records in minutes.',
    stat: '10 min avg',
    color: 'cyan' as const,
  },
  {
    number: '02',
    icon: Shield,
    title: 'Get Verified',
    description: 'We verify your enrollment, sport, and GPA for authenticity.',
    stat: '24hr verification',
    color: 'lime' as const,
  },
  {
    number: '03',
    icon: DollarSign,
    title: 'Get Paid',
    description: 'Match with brands and start earning based on your value.',
    stat: '$1,850 avg deal',
    color: 'gold' as const,
  },
];

function HowItWorksSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Stable callback for video toggle to prevent unnecessary re-renders
  const toggleVideo = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, []);

  // Stable callbacks for video events to avoid recreating on each render
  const handlePlay = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => setIsPlaying(false), []);
  const handleEnded = useCallback(() => setIsPlaying(false), []);

  return (
    <section
      id="how-it-works"
      className="section-spacing-lg bg-black"
      aria-label="How GradeUp works"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 lg:mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-[var(--accent-tertiary)]/10 text-[var(--accent-tertiary)] text-sm font-medium mb-4 border border-[var(--accent-tertiary)]/20">
            See It In Action
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            From <span className="text-[var(--accent-primary)]">Signup</span> to{' '}
            <span className="text-[var(--accent-gold)]">Payday</span>
          </h2>
          <p className="text-[var(--marketing-gray-400)] max-w-2xl mx-auto text-lg">
            Watch how GradeUp works, then follow the simple steps to start earning.
          </p>
        </div>

        {/* Two-column layout: Video + Steps */}
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">
          {/* Video Column - Takes 3/5 of space */}
          <div className="lg:col-span-3">
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-[var(--accent-primary)]/20 via-[var(--accent-tertiary)]/20 to-[var(--accent-success)]/20 rounded-3xl blur-2xl animate-marketing-glow" />

              <div className="relative card-marketing overflow-hidden gradient-border gradient-border-subtle">
                {/* Video container */}
                <div className="relative aspect-video bg-[var(--marketing-gray-900)]">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    poster="/videos/poster.jpg"
                    playsInline
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onEnded={handleEnded}
                  >
                    <source src="/videos/gradeup-demo.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>

                  {/* Play/Pause overlay - always visible on mobile, hover-reveal on desktop when playing */}
                  <button
                    onClick={toggleVideo}
                    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
                      isPlaying
                        ? 'opacity-100 md:opacity-0 md:hover:opacity-100'
                        : 'opacity-100'
                    }`}
                    aria-label={isPlaying ? 'Pause video' : 'Play video'}
                  >
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[var(--accent-primary)] flex items-center justify-center shadow-lg shadow-[var(--accent-primary)]/40 hover:scale-110 transition-transform">
                      {isPlaying ? (
                        <div className="flex gap-1">
                          <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-black rounded-sm" />
                          <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-black rounded-sm" />
                        </div>
                      ) : (
                        <Play className="h-6 w-6 sm:h-8 sm:w-8 text-black ml-1" fill="currentColor" />
                      )}
                    </div>
                  </button>

                  {/* Video info bar */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[var(--accent-success)] animate-pulse" />
                        <span className="text-sm text-white/80">GradeUp Platform Demo</span>
                      </div>
                      <span className="text-xs text-white/60">30 sec</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Video stats below */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6">
                <div className="text-center p-2 sm:p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-base sm:text-xl font-bold text-[var(--accent-primary)]">$127K</div>
                  <div className="text-[10px] sm:text-xs text-[var(--marketing-gray-500)]">Paid Out</div>
                </div>
                <div className="text-center p-2 sm:p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-base sm:text-xl font-bold text-[var(--accent-success)]">68%</div>
                  <div className="text-[10px] sm:text-xs text-[var(--marketing-gray-500)]">Match Rate</div>
                </div>
                <div className="text-center p-2 sm:p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-base sm:text-xl font-bold text-[var(--accent-gold)]">48hrs</div>
                  <div className="text-[10px] sm:text-xs text-[var(--marketing-gray-500)]">First Deal</div>
                </div>
              </div>
            </div>
          </div>

          {/* Steps Column - Takes 2/5 of space */}
          <div className="lg:col-span-2 space-y-4">
            <div className="mb-4 lg:mb-6 text-center lg:text-left">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Three Simple Steps</h3>
              <p className="text-xs sm:text-sm text-[var(--marketing-gray-500)]">
                Our 68% conversion rate means most athletes close deals within a week.
              </p>
            </div>

            {steps.map((step, index) => {
              const colorClasses = {
                cyan: {
                  bg: 'bg-[var(--accent-primary)]/10',
                  border: 'border-[var(--accent-primary)]/30',
                  text: 'text-[var(--accent-primary)]',
                  stat: 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]',
                },
                lime: {
                  bg: 'bg-[var(--accent-success)]/10',
                  border: 'border-[var(--accent-success)]/30',
                  text: 'text-[var(--accent-success)]',
                  stat: 'bg-[var(--accent-success)]/20 text-[var(--accent-success)]',
                },
                gold: {
                  bg: 'bg-[var(--accent-gold)]/10',
                  border: 'border-[var(--accent-gold)]/30',
                  text: 'text-[var(--accent-gold)]',
                  stat: 'bg-[var(--accent-gold)]/20 text-[var(--accent-gold)]',
                },
              };
              const colors = colorClasses[step.color];

              return (
                <div
                  key={step.number}
                  className={`relative card-marketing p-5 border-l-4 ${colors.border} hover:bg-white/5 transition-colors card-hover-glow`}
                >
                  {/* Connector */}
                  {index < steps.length - 1 && (
                    <div className="absolute left-[calc(2rem-1px)] -bottom-4 w-0.5 h-4 bg-gradient-to-b from-[var(--marketing-gray-700)] to-transparent" />
                  )}

                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center`}>
                      <step.icon className="h-6 w-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold ${colors.text}`}>{step.number}</span>
                        <h4 className="text-lg font-bold text-white">{step.title}</h4>
                      </div>
                      <p className="text-sm text-[var(--marketing-gray-400)] mb-2">{step.description}</p>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${colors.stat}`}>
                        {step.stat}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* CTA after steps */}
            <div className="pt-4">
              <Link href="/signup/athlete">
                <Button size="lg" className="w-full btn-marketing-primary gap-2">
                  Start Your Journey
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <p className="text-center text-xs text-[var(--marketing-gray-500)] mt-3">
                Free to join • No credit card required
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PLATFORM PREVIEW SECTION
// ═══════════════════════════════════════════════════════════════════════════

function PlatformPreviewSection() {
  return (
    <section
      id="preview"
      className="section-spacing-lg bg-[var(--marketing-gray-950)] relative overflow-hidden"
      aria-label="Platform dashboard preview"
      role="region"
    >
      {/* Background accent */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--accent-primary)]/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[var(--accent-tertiary)]/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 lg:mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-sm font-medium mb-6 border border-[var(--accent-primary)]/20">
            <Sparkles className="h-4 w-4" />
            Sneak Peek
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Your Dashboard <span className="text-[var(--accent-primary)]">Awaits</span>
          </h2>
          <p className="text-[var(--marketing-gray-400)] max-w-2xl mx-auto text-lg">
            See what you&apos;ll get access to. Track earnings, manage deals, and discover opportunities
            – all in one powerful dashboard.
          </p>
        </div>

        {/* Dashboard Preview Component (lazy-loaded for better initial load) */}
        <div className="max-w-5xl mx-auto">
          <LazyDashboardPreview
            showCTA={true}
            ctaText="Get Started Free"
            ctaHref="/signup/athlete"
          />
        </div>

        {/* Feature highlights below preview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-4xl mx-auto">
          {[
            { label: 'Real-time Analytics', icon: TrendingUp, color: 'cyan' },
            { label: 'Deal Management', icon: DollarSign, color: 'lime' },
            { label: 'Brand Matching', icon: Zap, color: 'gold' },
            { label: 'Verified Profiles', icon: Shield, color: 'magenta' },
          ].map((feature) => (
            <div
              key={feature.label}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
            >
              <feature.icon
                className={`h-6 w-6 text-[var(--marketing-${feature.color})]`}
              />
              <span className="text-sm text-[var(--marketing-gray-300)] text-center font-medium">
                {feature.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FOR BRANDS SECTION
// ═══════════════════════════════════════════════════════════════════════════

const brandFeatures = [
  { text: 'Verified academic & athletic credentials', icon: BadgeCheck },
  { text: 'NCAA-compliant deal management', icon: Shield },
  { text: 'Real-time analytics & ROI tracking', icon: TrendingUp },
  { text: 'GPA filters save hours of vetting', icon: Award },
];

function ForBrandsSection() {
  return (
    <section
      id="brands"
      className="section-spacing-md bg-[var(--marketing-gray-950)]"
      aria-label="Brand partnership opportunities"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] text-sm font-medium mb-4 border border-[var(--accent-gold)]/20">
              For Brands
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Partner with <span className="text-[var(--accent-gold)]">Tomorrow&apos;s Leaders</span>
            </h2>
            <p className="text-[var(--marketing-gray-400)] text-lg mb-8">
              Access a curated network of verified student-athletes who excel academically.
              Our GradeUp Score™ helps you find athletes who align with your brand values.
            </p>

            {/* Features */}
            <ul className="space-y-4 mb-8">
              {brandFeatures.map((feature) => (
                <li key={feature.text} className="flex items-center gap-3">
                  <feature.icon className="h-5 w-5 text-[var(--accent-success)] flex-shrink-0" />
                  <span className="text-[var(--marketing-gray-300)]">{feature.text}</span>
                </li>
              ))}
            </ul>

            {/* Brand stats */}
            <div className="grid grid-cols-3 gap-4 mb-8 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--accent-primary)]">340%</div>
                <div className="text-xs text-[var(--marketing-gray-500)]">Avg ROI increase</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--accent-success)]">68%</div>
                <div className="text-xs text-[var(--marketing-gray-500)]">Match-to-deal rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--accent-gold)]">63</div>
                <div className="text-xs text-[var(--marketing-gray-500)]">Active brands</div>
              </div>
            </div>

            <Link href="/signup/brand">
              <Button size="lg" className="btn-marketing-primary gap-2">
                Start Partnering
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>

          {/* Dashboard Preview */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-[var(--accent-primary)]/10 to-[var(--accent-tertiary)]/10 rounded-3xl blur-2xl" />
            <div className="relative card-marketing shadow-xl overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[var(--marketing-gray-800)] border-b border-[var(--marketing-gray-700)]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span className="text-xs text-[var(--marketing-gray-500)] ml-2">Brand Dashboard</span>
              </div>

              {/* Dashboard content */}
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-[var(--accent-primary)]/10 rounded-xl p-4 text-center border border-[var(--accent-primary)]/20">
                    <div className="text-3xl font-bold text-[var(--accent-primary)]">847</div>
                    <div className="text-xs text-[var(--marketing-gray-500)] mt-1">Athletes Found</div>
                  </div>
                  <div className="bg-[var(--accent-success)]/10 rounded-xl p-4 text-center border border-[var(--accent-success)]/20">
                    <div className="text-3xl font-bold text-[var(--accent-success)]">23</div>
                    <div className="text-xs text-[var(--marketing-gray-500)] mt-1">Active Deals</div>
                  </div>
                  <div className="bg-[var(--accent-gold)]/10 rounded-xl p-4 text-center border border-[var(--accent-gold)]/20">
                    <div className="text-3xl font-bold text-[var(--accent-gold)]">3.2M</div>
                    <div className="text-xs text-[var(--marketing-gray-500)] mt-1">Total Reach</div>
                  </div>
                </div>

                {/* Filter preview */}
                <div className="bg-[var(--marketing-gray-800)]/50 rounded-lg p-4">
                  <div className="text-xs text-[var(--marketing-gray-500)] mb-3">Active Filters</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] text-xs rounded-full">GPA ≥ 3.5</span>
                    <span className="px-2 py-1 bg-[var(--accent-success)]/20 text-[var(--accent-success)] text-xs rounded-full">Division I</span>
                    <span className="px-2 py-1 bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] text-xs rounded-full">10K+ followers</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTIMONIALS SECTION - Enhanced with specifics
// ═══════════════════════════════════════════════════════════════════════════

function TestimonialsSection() {
  const { data: testimonials } = useTestimonials();

  return (
    <section
      className="section-spacing-md bg-black"
      aria-label="Customer testimonials"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-white/5 text-white/80 text-sm font-medium mb-4 border border-white/10">
            Real Stories
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Don&apos;t Take Our <span className="text-[var(--accent-primary)]">Word For It</span>
          </h2>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="card-marketing p-6 relative"
            >
              {/* Verified badge */}
              {(testimonial as typeof testimonial & { verified?: boolean }).verified && (
                <div className="absolute top-4 right-4">
                  <BadgeCheck className="h-5 w-5 text-[var(--accent-primary)]" />
                </div>
              )}

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-[var(--accent-gold)] text-[var(--accent-gold)]" />
                ))}
              </div>

              <p className="text-[var(--marketing-gray-300)] mb-6 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>

              <div className="flex items-center gap-3">
                <Image
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  width={48}
                  height={48}
                  className="rounded-full object-cover"
                  loading="lazy"
                />
                <div className="flex-1">
                  <div className="font-semibold text-white">{testimonial.name}</div>
                  <div className="text-sm text-[var(--marketing-gray-500)]">{testimonial.role}</div>
                </div>
              </div>

              {/* Earnings/date badges */}
              <div className="mt-4 pt-4 border-t border-[var(--marketing-gray-800)] flex flex-wrap gap-2">
                {(testimonial as typeof testimonial & { earnings?: string }).earnings && (
                  <span className="px-2 py-1 bg-[var(--accent-success)]/10 text-[var(--accent-success)] text-xs rounded-full font-medium">
                    {(testimonial as typeof testimonial & { earnings?: string }).earnings}
                  </span>
                )}
                {(testimonial as typeof testimonial & { date?: string }).date && (
                  <span className="px-2 py-1 bg-white/5 text-[var(--marketing-gray-400)] text-xs rounded-full">
                    {(testimonial as typeof testimonial & { date?: string }).date}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FINAL CTA SECTION
// ═══════════════════════════════════════════════════════════════════════════

function FinalCTASection() {
  return (
    <section
      className="section-spacing-lg aurora-bg relative overflow-hidden"
      aria-label="Sign up call-to-action"
      role="region"
    >
      {/* Background effects */}
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.3)_0%,transparent_60%)]" />
      <div className="absolute inset-0 opacity-10 hero-grid" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Social proof */}
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-black/20 backdrop-blur-sm mb-8">
          <div className="flex -space-x-2">
            {[
              'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=64&h=64&fit=crop&crop=face',
              'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=64&h=64&fit=crop&crop=face',
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=face',
              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face',
            ].map((src, i) => (
              <Image
                key={i}
                src={src}
                alt={`Athlete ${i + 1}`}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full border-2 border-black/20 object-cover"
                loading="lazy"
              />
            ))}
          </div>
          <span className="text-sm text-black/80 font-medium">847 athletes already earning</span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-6">
          Ready to Turn Your
          <span className="block">GPA Into Opportunity?</span>
        </h2>
        <p className="text-xl text-black/70 mb-10 max-w-2xl mx-auto">
          Join hundreds of scholar-athletes already earning through GradeUp. Your academic
          excellence deserves to be rewarded.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup/athlete">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-black hover:bg-[var(--marketing-gray-900)] text-white font-semibold gap-2"
            >
              Join as Athlete
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/signup/brand">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-white/20 hover:bg-white/30 text-black font-semibold border-2 border-black/20"
            >
              Partner as Brand
            </Button>
          </Link>
        </div>

        {/* Final trust indicators */}
        <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-black/60">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            $127,450+ paid out
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            412 deals completed
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            3.72 avg GPA
          </span>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// VALUATION CTA SECTION — Added by VALUATION agent
// ═══════════════════════════════════════════════════════════════════════════
// Non-destructive addition for the /hs/valuation public calculator funnel.
// Placed after PartnerLogosSection + FeaturedAthletesSection so hero + trust
// come first, then a clear "find out what your athlete is worth" entry point
// for parents. Separate component so the CASE-STUDIES agent's additions can
// coexist without a merge conflict.
function ValuationCTASection() {
  return (
    <section
      aria-label="NIL Valuation Calculator entry point"
      className="bg-black py-12 sm:py-16"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--accent-primary)]/30 bg-gradient-to-br from-[var(--accent-primary)]/10 via-black to-[var(--accent-gold)]/10 p-6 sm:p-10">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[var(--accent-primary)]/15 blur-3xl" />
          <div className="relative grid gap-6 md:grid-cols-[2fr_1fr] md:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
                New · Free
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
                What&rsquo;s your scholar-athlete worth?
              </h2>
              <p className="mt-3 max-w-xl text-white/70">
                Sport, state, grades, followers — answer five questions and
                get an honest NIL value range. No signup needed to see the
                number.
              </p>
            </div>
            <div className="flex md:justify-end">
              <Link href="/hs/valuation" className="w-full md:w-auto">
                <Button
                  size="lg"
                  className="btn-marketing-primary w-full gap-2 sm:w-auto"
                  aria-label="Open the NIL Valuation Calculator"
                >
                  Find out what your athlete is worth
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROVEN RESULTS CTA — links to /business/case-studies (CASE-STUDIES agent)
// ═══════════════════════════════════════════════════════════════════════════

function ProvenResultsCTASection() {
  return (
    <section
      aria-label="Proven case-study results"
      className="bg-black py-20 border-y border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[var(--marketing-gray-950)] p-8 md:p-12">
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 20% 20%, rgba(0, 240, 255, 0.12) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(255, 200, 0, 0.08) 0%, transparent 55%)',
            }}
          />
          <div className="relative grid gap-6 md:grid-cols-[2fr_1fr] md:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
                Proven results
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
                Real deals. Verified earnings. Public case studies.
              </h2>
              <p className="mt-3 max-w-xl text-white/70">
                Every study is tied to a completed deal, on-platform share
                events, and a real scholar-athlete. See exactly how brand ROI
                adds up — before you spend a dollar.
              </p>
            </div>
            <div className="flex md:justify-end">
              <Link href="/business/case-studies" className="w-full md:w-auto">
                <Button
                  size="lg"
                  className="btn-marketing-outline w-full gap-2 sm:w-auto"
                  aria-label="Browse GradeUp HS case studies"
                >
                  See the case studies
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePageClient() {
  return (
    <>
      <HeroSection />
      <PartnerLogosSection />
      <ValuationCTASection />
      <FeaturedAthletesSection />
      <HowItWorksSection />
      <PlatformPreviewSection />
      <ForBrandsSection />
      <ProvenResultsCTASection />
      <TestimonialsSection />
      <FinalCTASection />
    </>
  );
}
