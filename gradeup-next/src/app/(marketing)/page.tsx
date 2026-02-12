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
              <span className="text-sm font-medium text-white/90">NCAA Compliant</span>
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

            {/* Stats */}
            <div
              className="flex flex-wrap justify-center lg:justify-start gap-8 mt-12 pt-8 border-t border-white/10"
              role="list"
              aria-label="Platform statistics"
            >
              <div className="text-center" role="listitem">
                <div className="text-3xl sm:text-4xl font-bold text-white" aria-live="polite">
                  <AnimatedCounter target={stats.athletes} suffix="+" skipAnimation={prefersReducedMotion} />
                </div>
                <div className="text-sm text-[var(--marketing-gray-500)] mt-1">Athletes</div>
              </div>
              <div className="w-px h-12 bg-white/10 hidden sm:block" aria-hidden="true" />
              <div className="text-center" role="listitem">
                <div className="text-3xl sm:text-4xl font-bold text-white" aria-live="polite">
                  <AnimatedCounter target={stats.brands} suffix="+" skipAnimation={prefersReducedMotion} />
                </div>
                <div className="text-sm text-[var(--marketing-gray-500)] mt-1">Brand Partners</div>
              </div>
              <div className="w-px h-12 bg-white/10 hidden sm:block" aria-hidden="true" />
              <div className="text-center" role="listitem">
                <div className="text-3xl sm:text-4xl font-bold text-[var(--marketing-lime)]" aria-live="polite">
                  <AnimatedCounter target={stats.avgGpa} skipAnimation={prefersReducedMotion} />
                </div>
                <div className="text-sm text-[var(--marketing-gray-500)] mt-1">Avg Athlete GPA</div>
              </div>
            </div>
          </div>

          {/* Hero Card */}
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
                      src="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&h=500&fit=crop&crop=face"
                      alt="Marcus Johnson, verified Duke University basketball point guard with 3.87 GPA"
                      fill
                      className="object-cover"
                      priority
                    />
                    {/* Verified Badge */}
                    <div className="absolute top-3 right-3 verified-badge-marketing p-1.5 shadow-lg">
                      <BadgeCheck className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-5 bg-gradient-to-t from-[var(--marketing-gray-900)] to-transparent -mt-16 relative">
                    <div className="text-xs font-semibold text-[var(--marketing-cyan)] tracking-wider mb-1">
                      DUKE UNIVERSITY
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">Marcus Johnson</h3>
                    <p className="text-[var(--marketing-gray-400)] text-sm mb-4">Basketball • Point Guard</p>

                    {/* GPA Badge */}
                    <div className="gpa-badge-marketing inline-flex items-center gap-2">
                      <span className="text-2xl font-bold">3.87</span>
                      <span className="text-xs font-medium opacity-80">GPA</span>
                    </div>

                    {/* Tags */}
                    <div className="flex gap-2 mt-4">
                      <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium">
                        Dean&apos;s List
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
      className="py-8 bg-[var(--marketing-gray-950)] border-y border-[var(--marketing-gray-800)]"
      aria-label="Trusted by top universities"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-[var(--marketing-gray-500)] mb-6">
          Trusted by athletes from top universities
        </p>
        <div className="relative overflow-hidden">
          {/* Gradient masks */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[var(--marketing-gray-950)] to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[var(--marketing-gray-950)] to-transparent z-10" />

          {/* Scrolling track */}
          <div className="flex animate-marquee">
            {[...schools, ...schools].map((school, i) => (
              <span
                key={i}
                className="flex-shrink-0 px-8 py-2 text-xl font-bold text-[var(--marketing-gray-600)] tracking-wider"
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

function AthleteCard({ athlete }: { athlete: FeaturedAthlete }) {
  return (
    <div className="group relative card-marketing overflow-hidden">
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <Image
          src={athlete.image}
          alt={athlete.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {athlete.verified && (
          <div className="absolute top-3 right-3 verified-badge-marketing p-1.5 shadow-md">
            <BadgeCheck className="h-4 w-4" />
          </div>
        )}
        {/* GPA Badge */}
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
      className="section-spacing-md bg-black"
      aria-label="Featured scholar-athletes"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-[var(--marketing-cyan)]/10 text-[var(--marketing-cyan)] text-sm font-medium mb-4 border border-[var(--marketing-cyan)]/20">
            Featured Athletes
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Scholar-Athletes <span className="text-[var(--marketing-gold)]">Making Moves</span>
          </h2>
          <p className="text-[var(--marketing-gray-400)] max-w-2xl mx-auto">
            Meet the top performers excelling both on the field and in the classroom.
          </p>
        </div>

        {/* Athletes Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
      className="section-spacing-md bg-[var(--marketing-gray-950)]"
      aria-label="How GradeUp works"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-white/5 text-white/80 text-sm font-medium mb-4 border border-white/10">
            How It Works
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Simple. <span className="text-[var(--marketing-cyan)]">Powerful.</span> Effective.
          </h2>
          <p className="text-[var(--marketing-gray-400)] max-w-2xl mx-auto">
            Get started in minutes, not days.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-1/2 w-full h-px bg-gradient-to-r from-[var(--marketing-cyan)]/30 to-transparent" />
              )}

              <div className="relative card-marketing p-8 text-center">
                {/* Number */}
                <div className="text-6xl font-bold text-white/5 mb-4">{step.number}</div>

                {/* Icon */}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--marketing-cyan)]/10 text-[var(--marketing-cyan)] mb-6 border border-[var(--marketing-cyan)]/20">
                  <step.icon className="h-8 w-8" />
                </div>

                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-[var(--marketing-gray-400)]">{step.description}</p>
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
      className="section-spacing-md bg-black"
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
                <li key={feature} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[var(--marketing-lime)] flex-shrink-0" />
                  <span className="text-[var(--marketing-gray-300)]">{feature}</span>
                </li>
              ))}
            </ul>

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
                <div className="grid grid-cols-3 gap-4">
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

function TestimonialsSection() {
  const { data: testimonials } = useTestimonials();

  return (
    <section
      className="section-spacing-md bg-[var(--marketing-gray-950)]"
      aria-label="Customer testimonials"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-white/5 text-white/80 text-sm font-medium mb-4 border border-white/10">
            Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            What They&apos;re <span className="text-[var(--marketing-cyan)]">Saying</span>
          </h2>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="card-marketing p-6"
            >
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
                <div>
                  <div className="font-semibold text-white">{testimonial.name}</div>
                  <div className="text-sm text-[var(--marketing-gray-500)]">{testimonial.role}</div>
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
      className="section-spacing-lg bg-marketing-cta relative overflow-hidden"
      aria-label="Sign up call-to-action"
      role="region"
    >
      {/* Background effects */}
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2)_0%,transparent_60%)]" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
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
