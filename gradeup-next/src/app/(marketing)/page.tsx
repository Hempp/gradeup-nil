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
  TrendingUp,
  MessageSquare,
  BarChart3,
  Star,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ═══════════════════════════════════════════════════════════════════════════
// HERO SECTION
// ═══════════════════════════════════════════════════════════════════════════

function AnimatedCounter({
  target,
  suffix = '',
  skipAnimation = false
}: {
  target: number;
  suffix?: string;
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
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

function HeroSection() {
  // Check for reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
  }, []);

  return (
    <section
      className="relative min-h-[calc(100vh-64px)] sm:min-h-screen flex items-center overflow-hidden bg-primary-900"
      aria-label="Hero - Turn your GPA into earnings"
      role="region"
    >
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-900 to-primary-700" />
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_30%,rgba(59,108,181,0.4)_0%,transparent_50%)]" />
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_80%_70%,rgba(245,158,11,0.3)_0%,transparent_50%)]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-sm font-medium text-white/90">NCAA Compliant</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-white mb-6">
              <span className="block">Your GPA</span>
              <span className="block text-secondary-500">Is Worth</span>
              <span className="block bg-gradient-to-r from-secondary-500 to-secondary-700 bg-clip-text text-transparent">
                Money.
              </span>
            </h1>

            {/* Subtitle - WCAG AA compliant contrast */}
            <p className="text-lg sm:text-xl text-[var(--text-inverse-secondary)] max-w-xl mx-auto lg:mx-0 mb-8">
              The only NIL platform where grades unlock better deals. Higher GPA = higher value.
              Get paid for your excellence.
            </p>

            {/* CTAs - Enhanced hierarchy */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/signup/athlete">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-secondary-700 hover:bg-secondary-500 text-primary-900 font-semibold gap-2 shadow-lg hover:shadow-xl transition-all"
                  aria-label="Join GradeUp as a student athlete - free signup"
                >
                  Join as Athlete - It's Free
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/signup/brand">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-[var(--border-inverse-30)] text-white hover:bg-[var(--overlay-glass-10)]"
                  aria-label="Partner with GradeUp as a brand"
                >
                  Partner as Brand
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 mt-6 text-sm text-[var(--text-inverse-muted)]">
              <div className="flex items-center gap-1.5">
                <Shield className="h-4 w-4" aria-hidden="true" />
                <span>NCAA Compliant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>No credit card</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="h-4 w-4" aria-hidden="true" />
                <span>2-min signup</span>
              </div>
            </div>

            {/* Stats - Accessible with reduced motion support */}
            <div
              className="flex flex-wrap justify-center lg:justify-start gap-8 mt-12 pt-8 border-t border-[var(--border-inverse-10)]"
              role="list"
              aria-label="Platform statistics"
            >
              <div className="text-center" role="listitem">
                <div className="text-3xl sm:text-4xl font-bold text-white" aria-live="polite">
                  <AnimatedCounter target={500} suffix="+" skipAnimation={prefersReducedMotion} />
                </div>
                <div className="text-sm text-[var(--text-inverse-muted)] mt-1">Athletes on Waitlist</div>
              </div>
              <div className="w-px h-12 bg-[var(--border-inverse-20)] hidden sm:block" aria-hidden="true" />
              <div className="text-center" role="listitem">
                <div className="text-3xl sm:text-4xl font-bold text-white" aria-live="polite">
                  <AnimatedCounter target={50} suffix="+" skipAnimation={prefersReducedMotion} />
                </div>
                <div className="text-sm text-[var(--text-inverse-muted)] mt-1">Brand Partners</div>
              </div>
              <div className="w-px h-12 bg-[var(--border-inverse-20)] hidden sm:block" aria-hidden="true" />
              <div className="text-center" role="listitem">
                <div className="text-3xl sm:text-4xl font-bold text-secondary-500" aria-live="polite">
                  <AnimatedCounter target={3.7} skipAnimation={prefersReducedMotion} />
                </div>
                <div className="text-sm text-[var(--text-inverse-muted)] mt-1">Avg Athlete GPA</div>
              </div>
            </div>
          </div>

          {/* Hero Card */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-secondary-500/30 to-primary-500/30 rounded-3xl blur-2xl" />

              {/* Athlete Card */}
              <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-1 shadow-2xl">
                <div className="bg-gradient-to-br from-white/5 to-transparent rounded-xl overflow-hidden">
                  {/* Image */}
                  <div className="relative h-64 sm:h-80 w-64 sm:w-72">
                    <Image
                      src="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&h=500&fit=crop&crop=face"
                      alt="Marcus Johnson, verified Duke University basketball point guard with 3.87 GPA"
                      fill
                      className="object-cover"
                      priority
                    />
                    {/* Verified Badge */}
                    <div className="absolute top-3 right-3 bg-primary-500 text-white p-1.5 rounded-full shadow-lg">
                      <BadgeCheck className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-5 bg-gradient-to-t from-primary-900/90 to-transparent -mt-16 relative">
                    <div className="text-xs font-semibold text-secondary-500 tracking-wider mb-1">
                      DUKE UNIVERSITY
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">Marcus Johnson</h3>
                    <p className="text-white/60 text-sm mb-4">Basketball • Point Guard</p>

                    {/* GPA Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary-500/20 border border-secondary-500/30">
                      <span className="text-2xl font-bold text-secondary-500">3.87</span>
                      <span className="text-xs font-medium text-white/60">GPA</span>
                    </div>

                    {/* Tags */}
                    <div className="flex gap-2 mt-4">
                      <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium">
                        Dean's List
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium">
                        All-Conference
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
// TRUSTED BY SECTION
// ═══════════════════════════════════════════════════════════════════════════

function TrustedBySection() {
  const schools = [
    'DUKE',
    'STANFORD',
    'OHIO STATE',
    'USC',
    'ALABAMA',
    'MICHIGAN',
    'UCLA',
    'GEORGIA',
  ];

  return (
    <section
      className="section-spacing-sm bg-surface-50 border-y border-surface-200"
      aria-label="Trusted by top universities"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-neutral-400 mb-6">
          Trusted by athletes from top universities
        </p>
        <div className="relative overflow-hidden">
          {/* Gradient masks */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-surface-50 to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-surface-50 to-transparent z-10" />

          {/* Scrolling track */}
          <div className="flex animate-marquee">
            {[...schools, ...schools].map((school, i) => (
              <span
                key={i}
                className="flex-shrink-0 px-8 py-2 text-xl font-bold text-neutral-300 tracking-wider"
              >
                {school}
              </span>
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

const featuredAthletes = [
  {
    id: 1,
    name: 'Sarah Chen',
    school: 'Stanford',
    sport: 'Soccer',
    position: 'Midfielder',
    gpa: 3.92,
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face',
    verified: true,
    tags: ["Dean's List", 'All-American'],
  },
  {
    id: 2,
    name: 'Jordan Williams',
    school: 'Ohio State',
    sport: 'Football',
    position: 'Wide Receiver',
    gpa: 3.65,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    verified: true,
    tags: ['Honors Program', 'Team Captain'],
  },
  {
    id: 3,
    name: 'Maya Rodriguez',
    school: 'UCLA',
    sport: 'Volleyball',
    position: 'Outside Hitter',
    gpa: 3.78,
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
    verified: true,
    tags: ['Pac-12 Scholar', 'Rising Star'],
  },
  {
    id: 4,
    name: 'Tyler Brooks',
    school: 'Michigan',
    sport: 'Basketball',
    position: 'Shooting Guard',
    gpa: 3.54,
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
    verified: true,
    tags: ['Big Ten Academic', 'NIL Ready'],
  },
];

function AthleteCard({ athlete }: { athlete: (typeof featuredAthletes)[0] }) {
  return (
    <div className="group relative bg-white rounded-xl border border-surface-200 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <Image
          src={athlete.image}
          alt={athlete.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {athlete.verified && (
          <div className="absolute top-3 right-3 bg-primary-500 text-white p-1.5 rounded-full shadow-md">
            <BadgeCheck className="h-4 w-4" />
          </div>
        )}
        {/* GPA Badge */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md">
          <span className="text-xl font-bold text-secondary-700">{athlete.gpa}</span>
          <span className="text-xs text-neutral-500 ml-1">GPA</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="text-xs font-semibold text-primary-500 tracking-wider mb-1">
          {athlete.school.toUpperCase()}
        </div>
        <h3 className="text-lg font-bold text-neutral-900 mb-1">{athlete.name}</h3>
        <p className="text-sm text-neutral-500 mb-3">
          {athlete.sport} • {athlete.position}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {athlete.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full bg-surface-100 text-neutral-600 text-xs font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeaturedAthletesSection() {
  return (
    <section
      id="athletes"
      className="section-spacing-md bg-white"
      aria-label="Featured scholar-athletes"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-4">
            Featured Athletes
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-primary-900 mb-4">
            Scholar-Athletes <span className="text-secondary-700">Making Moves</span>
          </h2>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Meet the top performers excelling both on the field and in the classroom.
          </p>
        </div>

        {/* Athletes Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredAthletes.map((athlete) => (
            <AthleteCard key={athlete.id} athlete={athlete} />
          ))}
        </div>

        {/* Enhanced CTA with emotional hook */}
        <div className="mt-16 text-center">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-primary-900 mb-2">See Yourself Here?</h3>
            <p className="text-neutral-600 text-lg">
              Your academic excellence + athletic talent = opportunity
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup/athlete">
              <Button
                variant="primary"
                size="lg"
                className="gap-2 shadow-lg hover:shadow-xl w-full sm:w-auto"
              >
                Create Your Profile - Free
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            </Link>
            <Link href="/brand/discover">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Browse All Athletes
              </Button>
            </Link>
          </div>

          {/* Trust Reinforcement */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-sm text-neutral-500">
            <div className="flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4 text-primary-500" aria-hidden="true" />
              <span>All athletes verified</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-primary-500" aria-hidden="true" />
              <span>NCAA compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-secondary-700" aria-hidden="true" />
              <span>Deals in 48hrs</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOW IT WORKS SECTION
// ═══════════════════════════════════════════════════════════════════════════

const steps = [
  {
    number: '01',
    icon: User,
    title: 'Create Profile',
    description: 'Sign up, verify your student-athlete status, and connect your academic records.',
  },
  {
    number: '02',
    icon: Shield,
    title: 'Get Verified',
    description: 'Our team verifies your enrollment, sport participation, and GPA for authenticity.',
  },
  {
    number: '03',
    icon: Zap,
    title: 'Connect & Earn',
    description: 'Match with brands, accept deals, and start earning based on your unique value.',
  },
];

function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="section-spacing-md bg-primary-900"
      aria-label="How GradeUp works"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/80 text-sm font-medium mb-4">
            How It Works
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Simple. <span className="text-secondary-500">Powerful.</span> Effective.
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto">
            Get started in minutes, not days.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-1/2 w-full h-px bg-gradient-to-r from-white/20 to-transparent" />
              )}

              <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 text-center hover:bg-white/10 transition-colors">
                {/* Number */}
                <div className="text-6xl font-bold text-white/10 mb-4">{step.number}</div>

                {/* Icon */}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary-500/20 text-secondary-500 mb-6">
                  <step.icon className="h-8 w-8" />
                </div>

                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-white/60">{step.description}</p>
              </div>
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
  'Verified academic & athletic credentials',
  'NCAA-compliant deal management',
  'Real-time analytics & ROI tracking',
  'Direct messaging with athletes',
];

function ForBrandsSection() {
  return (
    <section
      id="brands"
      className="section-spacing-md bg-surface-50"
      aria-label="Brand partnership opportunities"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-4">
              For Brands
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-primary-900 mb-6">
              Partner with <span className="text-secondary-700">Tomorrow's Leaders</span>
            </h2>
            <p className="text-neutral-600 text-lg mb-8">
              Access a curated network of verified student-athletes who excel academically.
              Our GradeUp Score™ helps you find athletes who align with your brand values.
            </p>

            {/* Features */}
            <ul className="space-y-4 mb-8">
              {brandFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success-600 flex-shrink-0" />
                  <span className="text-neutral-700">{feature}</span>
                </li>
              ))}
            </ul>

            <Link href="/signup/brand">
              <Button size="lg" variant="primary" className="gap-2">
                Start Partnering
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>

          {/* Dashboard Preview */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary-500/20 to-secondary-500/20 rounded-3xl blur-2xl" />
            <div className="relative bg-white rounded-2xl border border-surface-200 shadow-xl overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-surface-50 border-b border-surface-200">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <span className="text-xs text-neutral-400 ml-2">Brand Dashboard</span>
              </div>

              {/* Dashboard content */}
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-primary-100/50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-primary-700">847</div>
                    <div className="text-xs text-neutral-500 mt-1">Athletes Found</div>
                  </div>
                  <div className="bg-success-100/50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-success-600">23</div>
                    <div className="text-xs text-neutral-500 mt-1">Active Deals</div>
                  </div>
                  <div className="bg-secondary-100/50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-secondary-700">3.2M</div>
                    <div className="text-xs text-neutral-500 mt-1">Total Reach</div>
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
// TESTIMONIALS SECTION
// ═══════════════════════════════════════════════════════════════════════════

const testimonials = [
  {
    quote:
      "GradeUp helped me secure my first brand deal while maintaining my 3.8 GPA. Finally a platform that values academics!",
    name: 'Sarah Chen',
    role: 'Stanford Soccer • 3.8 GPA',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
  },
  {
    quote:
      "As a brand, we love that GradeUp pre-verifies athletes. It saves us time and ensures we partner with authentic scholar-athletes.",
    name: 'Mike Roberts',
    role: 'Marketing Director, SportsBrand',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
  },
  {
    quote:
      "The GradeUp Score made it easy to find athletes who truly represent our brand values. Quality over quantity.",
    name: 'Lisa Thompson',
    role: 'CMO, Athletic Gear Co.',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face',
  },
];

function TestimonialsSection() {
  return (
    <section
      className="section-spacing-md bg-white"
      aria-label="Customer testimonials"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-4">
            Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-primary-900">
            What They're <span className="text-secondary-700">Saying</span>
          </h2>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-surface-50 rounded-2xl border border-surface-200 p-6 hover:shadow-lg transition-shadow"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-secondary-500 text-secondary-500" />
                ))}
              </div>

              <p className="text-neutral-700 mb-6 leading-relaxed">"{testimonial.quote}"</p>

              <div className="flex items-center gap-3">
                <Image
                  src={testimonial.image}
                  alt={testimonial.name}
                  width={48}
                  height={48}
                  className="rounded-full object-cover"
                />
                <div>
                  <div className="font-semibold text-neutral-900">{testimonial.name}</div>
                  <div className="text-sm text-neutral-500">{testimonial.role}</div>
                </div>
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
      className="section-spacing-lg bg-gradient-to-br from-primary-900 via-primary-700 to-primary-900 relative overflow-hidden"
      aria-label="Sign up call-to-action"
      role="region"
    >
      {/* Background effects */}
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.2)_0%,transparent_60%)]" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
          Ready to Turn Your
          <span className="block text-secondary-500">GPA Into Opportunity?</span>
        </h2>
        <p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto">
          Join hundreds of scholar-athletes already earning through GradeUp. Your academic
          excellence deserves to be rewarded.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup/athlete">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-secondary-700 hover:bg-secondary-500 text-primary-900 font-semibold gap-2"
            >
              Join as Athlete
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/signup/brand">
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10"
            >
              Partner as Brand
            </Button>
          </Link>
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
      <TrustedBySection />
      <FeaturedAthletesSection />
      <HowItWorksSection />
      <ForBrandsSection />
      <TestimonialsSection />
      <FinalCTASection />
    </>
  );
}
