'use client';

import { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useFeaturedAthletes,
  useLandingStats,
  useTestimonials,
  type FeaturedAthlete,
} from '@/lib/hooks/use-landing-data';

// ═══════════════════════════════════════════════════════════════════════════
// HERO SECTION
// ═══════════════════════════════════════════════════════════════════════════

function AnimatedCounter({
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
  const [count, setCount] = useState(skipAnimation ? target : 0);
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(skipAnimation);

  useEffect(() => {
    if (skipAnimation || hasAnimated) {
      setCount(target);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 2000;
          const steps = 60;
          const increment = target / steps;
          let current = 0;

          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current * 10) / 10);
            }
          }, duration / steps);
        }
      },
      { threshold: typeof window !== 'undefined' && window.innerWidth < 768 ? 0.2 : 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, skipAnimation, hasAnimated]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

function HeroSection() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const { data: stats } = useLandingStats();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
  }, []);

  return (
    <section
      className="relative min-h-[calc(100vh-64px)] sm:min-h-screen flex items-center overflow-hidden bg-black"
      aria-label="Hero - Turn your GPA into earnings"
      role="region"
    >
      {/* Background Effects */}
      <div className="absolute inset-0">
        {/* Gradient orbs */}
        <div className="hero-orb hero-orb-cyan absolute -top-40 -left-40 w-[500px] h-[500px]" />
        <div className="hero-orb hero-orb-magenta absolute -bottom-40 -right-40 w-[600px] h-[600px]" />

        {/* Grid pattern */}
        <div className="absolute inset-0 hero-grid opacity-50" />

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
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--marketing-lime)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--marketing-lime)]"></span>
              </span>
              <span className="text-sm font-medium text-white/90">NCAA Compliant Platform</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-white mb-6">
              <span className="block">Your GPA</span>
              <span className="block gradient-text-cyan">Is Worth</span>
              <span className="block bg-gradient-to-r from-[var(--marketing-gold)] to-[var(--marketing-lime)] bg-clip-text text-transparent">
                Money.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-[var(--marketing-gray-400)] max-w-xl mx-auto lg:mx-0 mb-8">
              The only NIL platform where grades unlock better deals. Higher GPA = higher value.
              Get paid for your excellence.
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
                <Shield className="h-4 w-4 text-[var(--marketing-cyan)]" aria-hidden="true" />
                <span>NCAA Compliant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[var(--marketing-cyan)]" aria-hidden="true" />
                <span>No credit card</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-[var(--marketing-lime)]" aria-hidden="true" />
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
                <div className="text-3xl sm:text-4xl font-bold text-[var(--marketing-lime)]" aria-live="polite">
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
                <div className="text-3xl sm:text-4xl font-bold text-[var(--marketing-gold)]" aria-live="polite">
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
              <div className="absolute -inset-4 bg-gradient-to-r from-[var(--marketing-cyan)]/20 to-[var(--marketing-magenta)]/20 rounded-3xl blur-2xl animate-marketing-glow" />

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
                    />
                    {/* Verified Badge */}
                    <div className="absolute top-3 right-3 verified-badge-marketing p-1.5 shadow-lg">
                      <BadgeCheck className="h-5 w-5" />
                    </div>
                    {/* Earnings Badge */}
                    <div className="absolute top-3 left-3 bg-[var(--marketing-lime)]/90 text-black px-2 py-1 rounded-full text-xs font-bold">
                      $12,400 earned
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-5 bg-gradient-to-t from-[var(--marketing-gray-900)] to-transparent -mt-16 relative">
                    <div className="text-xs font-semibold text-[var(--marketing-cyan)] tracking-wider mb-1">
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

function AthleteCard({ athlete }: { athlete: FeaturedAthlete }) {
  return (
    <div className="group relative card-marketing overflow-hidden hover-lift animate-reveal-up">
      {/* Image */}
      <div className="relative h-56 overflow-hidden">
        <Image
          src={athlete.image}
          alt={athlete.name}
          fill
          className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
        />
        {athlete.verified && (
          <div className="absolute top-3 right-3 verified-badge-marketing p-1.5 shadow-md">
            <BadgeCheck className="h-4 w-4" />
          </div>
        )}
        {/* Earnings Badge - Top left */}
        {(athlete as FeaturedAthlete & { earnings?: string }).earnings && (
          <div className="absolute top-3 left-3 bg-[var(--marketing-lime)]/90 text-black px-2 py-1 rounded-full text-xs font-bold shadow-md">
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
        <div className="text-xs font-semibold text-[var(--marketing-cyan)] tracking-wider mb-1">
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
}

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
          <span className="inline-block px-3 py-1 rounded-full bg-[var(--marketing-cyan)]/10 text-[var(--marketing-cyan)] text-sm font-medium mb-4 border border-[var(--marketing-cyan)]/20">
            Real Athletes, Real Earnings
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Scholar-Athletes <span className="text-[var(--marketing-gold)]">Getting Paid</span>
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
              <BadgeCheck className="h-4 w-4 text-[var(--marketing-cyan)]" aria-hidden="true" />
              <span>All athletes verified</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-[var(--marketing-cyan)]" aria-hidden="true" />
              <span>NCAA compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[var(--marketing-lime)]" aria-hidden="true" />
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

  const toggleVideo = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

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
          <span className="inline-block px-3 py-1 rounded-full bg-[var(--marketing-magenta)]/10 text-[var(--marketing-magenta)] text-sm font-medium mb-4 border border-[var(--marketing-magenta)]/20">
            See It In Action
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            From <span className="text-[var(--marketing-cyan)]">Signup</span> to{' '}
            <span className="text-[var(--marketing-gold)]">Payday</span>
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
              <div className="absolute -inset-4 bg-gradient-to-r from-[var(--marketing-cyan)]/20 via-[var(--marketing-magenta)]/20 to-[var(--marketing-lime)]/20 rounded-3xl blur-2xl animate-marketing-glow" />

              <div className="relative card-marketing overflow-hidden">
                {/* Video container */}
                <div className="relative aspect-video bg-[var(--marketing-gray-900)]">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    poster="/videos/poster.jpg"
                    playsInline
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                  >
                    <source src="/videos/gradeup-demo.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>

                  {/* Play/Pause overlay */}
                  <button
                    onClick={toggleVideo}
                    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
                      isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'
                    }`}
                    aria-label={isPlaying ? 'Pause video' : 'Play video'}
                  >
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[var(--marketing-cyan)] flex items-center justify-center shadow-lg shadow-[var(--marketing-cyan)]/40 hover:scale-110 transition-transform">
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
                        <div className="w-2 h-2 rounded-full bg-[var(--marketing-lime)] animate-pulse" />
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
                  <div className="text-base sm:text-xl font-bold text-[var(--marketing-cyan)]">$127K</div>
                  <div className="text-[10px] sm:text-xs text-[var(--marketing-gray-500)]">Paid Out</div>
                </div>
                <div className="text-center p-2 sm:p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-base sm:text-xl font-bold text-[var(--marketing-lime)]">68%</div>
                  <div className="text-[10px] sm:text-xs text-[var(--marketing-gray-500)]">Match Rate</div>
                </div>
                <div className="text-center p-2 sm:p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-base sm:text-xl font-bold text-[var(--marketing-gold)]">48hrs</div>
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
                  bg: 'bg-[var(--marketing-cyan)]/10',
                  border: 'border-[var(--marketing-cyan)]/30',
                  text: 'text-[var(--marketing-cyan)]',
                  stat: 'bg-[var(--marketing-cyan)]/20 text-[var(--marketing-cyan)]',
                },
                lime: {
                  bg: 'bg-[var(--marketing-lime)]/10',
                  border: 'border-[var(--marketing-lime)]/30',
                  text: 'text-[var(--marketing-lime)]',
                  stat: 'bg-[var(--marketing-lime)]/20 text-[var(--marketing-lime)]',
                },
                gold: {
                  bg: 'bg-[var(--marketing-gold)]/10',
                  border: 'border-[var(--marketing-gold)]/30',
                  text: 'text-[var(--marketing-gold)]',
                  stat: 'bg-[var(--marketing-gold)]/20 text-[var(--marketing-gold)]',
                },
              };
              const colors = colorClasses[step.color];

              return (
                <div
                  key={step.number}
                  className={`relative card-marketing p-5 border-l-4 ${colors.border} hover:bg-white/5 transition-colors`}
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
            <span className="inline-block px-3 py-1 rounded-full bg-[var(--marketing-gold)]/10 text-[var(--marketing-gold)] text-sm font-medium mb-4 border border-[var(--marketing-gold)]/20">
              For Brands
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Partner with <span className="text-[var(--marketing-gold)]">Tomorrow&apos;s Leaders</span>
            </h2>
            <p className="text-[var(--marketing-gray-400)] text-lg mb-8">
              Access a curated network of verified student-athletes who excel academically.
              Our GradeUp Score™ helps you find athletes who align with your brand values.
            </p>

            {/* Features */}
            <ul className="space-y-4 mb-8">
              {brandFeatures.map((feature) => (
                <li key={feature.text} className="flex items-center gap-3">
                  <feature.icon className="h-5 w-5 text-[var(--marketing-lime)] flex-shrink-0" />
                  <span className="text-[var(--marketing-gray-300)]">{feature.text}</span>
                </li>
              ))}
            </ul>

            {/* Brand stats */}
            <div className="grid grid-cols-3 gap-4 mb-8 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--marketing-cyan)]">340%</div>
                <div className="text-xs text-[var(--marketing-gray-500)]">Avg ROI increase</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--marketing-lime)]">68%</div>
                <div className="text-xs text-[var(--marketing-gray-500)]">Match-to-deal rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--marketing-gold)]">63</div>
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
            <div className="absolute -inset-4 bg-gradient-to-r from-[var(--marketing-cyan)]/10 to-[var(--marketing-magenta)]/10 rounded-3xl blur-2xl" />
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
                  <div className="bg-[var(--marketing-cyan)]/10 rounded-xl p-4 text-center border border-[var(--marketing-cyan)]/20">
                    <div className="text-3xl font-bold text-[var(--marketing-cyan)]">847</div>
                    <div className="text-xs text-[var(--marketing-gray-500)] mt-1">Athletes Found</div>
                  </div>
                  <div className="bg-[var(--marketing-lime)]/10 rounded-xl p-4 text-center border border-[var(--marketing-lime)]/20">
                    <div className="text-3xl font-bold text-[var(--marketing-lime)]">23</div>
                    <div className="text-xs text-[var(--marketing-gray-500)] mt-1">Active Deals</div>
                  </div>
                  <div className="bg-[var(--marketing-gold)]/10 rounded-xl p-4 text-center border border-[var(--marketing-gold)]/20">
                    <div className="text-3xl font-bold text-[var(--marketing-gold)]">3.2M</div>
                    <div className="text-xs text-[var(--marketing-gray-500)] mt-1">Total Reach</div>
                  </div>
                </div>

                {/* Filter preview */}
                <div className="bg-[var(--marketing-gray-800)]/50 rounded-lg p-4">
                  <div className="text-xs text-[var(--marketing-gray-500)] mb-3">Active Filters</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-[var(--marketing-cyan)]/20 text-[var(--marketing-cyan)] text-xs rounded-full">GPA ≥ 3.5</span>
                    <span className="px-2 py-1 bg-[var(--marketing-lime)]/20 text-[var(--marketing-lime)] text-xs rounded-full">Division I</span>
                    <span className="px-2 py-1 bg-[var(--marketing-gold)]/20 text-[var(--marketing-gold)] text-xs rounded-full">10K+ followers</span>
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
            Don&apos;t Take Our <span className="text-[var(--marketing-cyan)]">Word For It</span>
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
                  <BadgeCheck className="h-5 w-5 text-[var(--marketing-cyan)]" />
                </div>
              )}

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-[var(--marketing-gold)] text-[var(--marketing-gold)]" />
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
                />
                <div className="flex-1">
                  <div className="font-semibold text-white">{testimonial.name}</div>
                  <div className="text-sm text-[var(--marketing-gray-500)]">{testimonial.role}</div>
                </div>
              </div>

              {/* Earnings/date badges */}
              <div className="mt-4 pt-4 border-t border-[var(--marketing-gray-800)] flex flex-wrap gap-2">
                {(testimonial as typeof testimonial & { earnings?: string }).earnings && (
                  <span className="px-2 py-1 bg-[var(--marketing-lime)]/10 text-[var(--marketing-lime)] text-xs rounded-full font-medium">
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
      className="section-spacing-lg bg-marketing-cta relative overflow-hidden"
      aria-label="Sign up call-to-action"
      role="region"
    >
      {/* Background effects */}
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2)_0%,transparent_60%)]" />

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

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <PartnerLogosSection />
      <FeaturedAthletesSection />
      <HowItWorksSection />
      <ForBrandsSection />
      <TestimonialsSection />
      <FinalCTASection />
    </>
  );
}
